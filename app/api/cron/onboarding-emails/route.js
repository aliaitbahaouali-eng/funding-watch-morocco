import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendEmail,
  tplOnboardingDay3,
  tplOnboardingDay5,
  tplOnboardingDay7,
  tplOnboardingDay14NPS,
} from '@/lib/email';
import { computeOrgCompleteness } from '@/lib/utils';

/**
 * Sprint 4P — GET|POST /api/cron/onboarding-emails
 *
 * Envoie 4 emails programmés selon l'ancienneté du compte :
 *   J+3  → tplOnboardingDay3   (rappel profil si <70% ou pas de saved)
 *   J+5  → tplOnboardingDay5   (découverte AI Cowriter si ≥1 saved et 0 application)
 *   J+7  → tplOnboardingDay7   (récap première semaine, tous)
 *   J+14 → tplOnboardingDay14NPS (sondage NPS, tous)
 *
 * Dédup : table email_logs, template ∈ {onboarding_d3, onboarding_d5,
 *   onboarding_d7, onboarding_d14}. Une fois envoyé, jamais renvoyé.
 *
 * Cron Vercel : tous les jours à 07:30 UTC (après le digest de 07:00).
 *
 * Auth : Authorization: Bearer <CRON_SECRET> | x-cron-secret | ?secret=
 */

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  if (new URL(request.url).searchParams.get('secret') === secret) return true;
  return false;
}

const COHORTS = [
  { days: 3, template: 'onboarding_d3' },
  { days: 5, template: 'onboarding_d5' },
  { days: 7, template: 'onboarding_d7' },
  { days: 14, template: 'onboarding_d14' },
];

// Renvoie la fenêtre [start, end) UTC pour un jour donné (créé il y a N jours)
function ageWindow(daysAgo) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Champs minimaux dans la liste "à compléter" pour J+3
function listMissingFields(org) {
  const labels = {
    description: 'Description de l\'association',
    website: 'Site web',
    org_type: 'Type d\'organisation',
    creation_year: 'Année de création',
    annual_budget_range: 'Tranche de budget annuel',
    city: 'Ville',
    region: 'Région d\'intervention',
  };
  const missing = [];
  for (const f of Object.keys(labels)) {
    const v = org[f];
    if (v == null || String(v).trim().length === 0) missing.push(labels[f]);
  }
  if (!org.organization_themes || org.organization_themes.length === 0) {
    missing.push('Thématiques principales (SDG / DAC)');
  }
  return missing.slice(0, 5); // top 5 max
}

async function processCohort(supabase, cohort, dryRun) {
  const { start, end } = ageWindow(cohort.days);
  const stats = { candidates: 0, sent: 0, failed: 0, skipped: 0, dedup: 0 };

  // Orgs créées dans la fenêtre [start, end), non test, non désinscrites
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select(`
      id, name, user_id, email_frequency, onboarding_completed, unsubscribe_token,
      description, website, org_type, creation_year, annual_budget_range, city, region,
      created_at,
      profiles!inner(email, full_name, status),
      organization_themes(theme_id, themes(name_fr, name_en))
    `)
    .gte('created_at', start)
    .lt('created_at', end)
    .eq('profiles.status', 'active')
    .neq('email_frequency', 'none');

  if (error) {
    console.error(`onboarding-emails: select failed for cohort ${cohort.template}:`, error);
    return { ...stats, error: error.message };
  }

  stats.candidates = (orgs || []).length;
  if (!orgs?.length) return stats;

  // Skip ceux marqués is_test si la colonne existe
  const orgIds = orgs.map(o => o.id);

  // Dédup : ceux qui ont déjà reçu ce template
  const { data: already } = await supabase
    .from('email_logs')
    .select('organization_id')
    .eq('template', cohort.template)
    .in('organization_id', orgIds);
  const alreadyIds = new Set((already || []).map(r => r.organization_id));

  // Pour J+5 et J+7, on a besoin du nombre de saved + applications par orga
  let savedByOrg = new Map();
  let applicationsByOrg = new Map();
  if (cohort.days === 5 || cohort.days === 7) {
    const { data: saves } = await supabase
      .from('saved_opportunities')
      .select('organization_id, status')
      .in('organization_id', orgIds);
    for (const s of (saves || [])) {
      savedByOrg.set(s.organization_id, (savedByOrg.get(s.organization_id) || 0) + 1);
      if (s.status && s.status !== 'saved') {
        applicationsByOrg.set(s.organization_id, (applicationsByOrg.get(s.organization_id) || 0) + 1);
      }
    }
  }

  // Pour J+7 : pré-récup alertes envoyées par orga (email_logs daily_digest)
  // + top 3 opps urgentes (deadline > maintenant) par orga, via rpc match_opportunities_for_org
  let alertsByOrg = new Map();
  let urgentByOrg = new Map();
  if (cohort.days === 7) {
    const since = new Date(start);
    since.setUTCDate(since.getUTCDate() - 7);
    const { data: alerts } = await supabase
      .from('email_logs')
      .select('organization_id')
      .in('template', ['daily_digest', 'weekly_digest'])
      .eq('status', 'sent')
      .in('organization_id', orgIds)
      .gte('sent_at', since.toISOString());
    for (const a of (alerts || [])) {
      alertsByOrg.set(a.organization_id, (alertsByOrg.get(a.organization_id) || 0) + 1);
    }
    const todayIso = new Date().toISOString();
    // Per-org : top 3 opps urgentes par profil
    for (const org of orgs) {
      try {
        const { data: matches } = await supabase.rpc('match_opportunities_for_org', {
          p_org_id: org.id,
          p_limit: 10,
        });
        const filtered = (matches || [])
          .filter(o => o.deadline && o.deadline > todayIso)
          .slice(0, 3);
        urgentByOrg.set(org.id, filtered);
      } catch (e) {
        urgentByOrg.set(org.id, []);
      }
    }
  }

  for (const org of orgs) {
    if (alreadyIds.has(org.id)) { stats.dedup++; continue; }

    const email = org.profiles?.email;
    const fullName = org.profiles?.full_name;
    if (!email) { stats.skipped++; continue; }

    // Décide d'envoyer selon le critère métier du cohorte
    let templateData = null;
    let shouldSend = false;

    if (cohort.days === 3) {
      const completeness = computeOrgCompleteness(org);
      const savedCount = savedByOrg.get(org.id) || 0;
      // On envoie si profil incomplet OU 0 saved
      if (completeness < 70 || savedCount === 0) {
        shouldSend = true;
        templateData = tplOnboardingDay3({
          fullName,
          orgName: org.name,
          missingFields: listMissingFields(org),
          unsubscribeToken: org.unsubscribe_token,
        });
      }
    } else if (cohort.days === 5) {
      const savedCount = savedByOrg.get(org.id) || 0;
      const appCount = applicationsByOrg.get(org.id) || 0;
      // Envoyer si ≥1 saved ET 0 application démarrée (pour pousser vers Cowriter)
      if (savedCount >= 1 && appCount === 0) {
        shouldSend = true;
        templateData = tplOnboardingDay5({
          fullName,
          orgName: org.name,
          savedCount,
          unsubscribeToken: org.unsubscribe_token,
        });
      }
    } else if (cohort.days === 7) {
      const savedCount = savedByOrg.get(org.id) || 0;
      const appCount = applicationsByOrg.get(org.id) || 0;
      const alertCount = alertsByOrg.get(org.id) || 0;
      const topThemes = (org.organization_themes || [])
        .map(ot => ot.themes?.name_fr || ot.themes?.name_en)
        .filter(Boolean);
      shouldSend = true; // tous les inscrits reçoivent le récap
      templateData = tplOnboardingDay7({
        fullName,
        orgName: org.name,
        stats: { saved: savedCount, applications: appCount, alerts: alertCount },
        urgentOpps: urgentByOrg.get(org.id) || [],
        topThemes,
        unsubscribeToken: org.unsubscribe_token,
      });
    } else if (cohort.days === 14) {
      shouldSend = true;
      templateData = tplOnboardingDay14NPS({
        fullName,
        unsubscribeToken: org.unsubscribe_token,
      });
    }

    if (!shouldSend) { stats.skipped++; continue; }

    if (dryRun) {
      stats.sent++; // simulé
      continue;
    }

    // RFC 8058 headers unsubscribe
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';
    const unsubUrl = `${appUrl}/unsubscribe?token=${org.unsubscribe_token}`;
    const headers = org.unsubscribe_token ? {
      'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@fundingwatch.ma?subject=unsubscribe%20${org.id}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : undefined;

    const result = await sendEmail({
      to: email,
      subject: templateData.subject,
      htmlContent: templateData.htmlContent,
      headers,
    });

    await supabase.from('email_logs').insert({
      organization_id: org.id,
      recipient_email: email,
      subject: templateData.subject,
      template: cohort.template,
      opportunities: [],
      status: result.ok ? 'sent' : 'failed',
      provider_id: result.providerId || null,
      error_message: result.error || null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) stats.sent++; else stats.failed++;
  }

  return stats;
}

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';
  const onlyCohort = url.searchParams.get('cohort'); // ex: ?cohort=3 pour ne traiter qu'un cohorte

  const cohorts = onlyCohort
    ? COHORTS.filter(c => String(c.days) === onlyCohort)
    : COHORTS;

  const results = {};
  for (const cohort of cohorts) {
    results[cohort.template] = await processCohort(supabase, cohort, dryRun);
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
    cohorts: results,
  });
}

export const GET = handler;
export const POST = handler;
export const dynamic = 'force-dynamic';
