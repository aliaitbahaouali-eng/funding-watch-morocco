'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getEmbedding, buildOrgText } from '@/lib/embeddings';
import { sendEmail, tplFirstMatches } from '@/lib/email';

/**
 * Sauvegarde le profil orga complet à la fin du wizard.
 * data : { name, legal_status, city, region, creation_year, website, phone,
 *          description, org_type, annual_budget_range, team_size,
 *          volunteers_count, members_count, action_summary,
 *          intervention_themes_text, past_projects, funding_history,
 *          target_amount_min, target_amount_max, currencies, work_languages,
 *          sdg_ids: [1,5,13], dac_sector_ids: ['11220','15170'],
 *          population_slugs: ['women','youth'], geography_slugs: ['ma-casablanca-settat'] }
 */
export async function completeOnboarding(data) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  // 1. Trouve ou crée l'organization
  let { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    name: data.name,
    legal_status: data.legal_status || null,
    city: data.city || null,
    region: data.region || null,
    creation_year: data.creation_year ? Number(data.creation_year) : null,
    website: data.website || null,
    phone: data.phone || null,
    description: data.description || null,
    org_type: data.org_type || 'association',
    annual_budget_range: data.annual_budget_range || null,
    team_size: data.team_size || null,
    volunteers_count: data.volunteers_count ? Number(data.volunteers_count) : null,
    members_count: data.members_count ? Number(data.members_count) : null,
    action_summary: data.action_summary || null,
    intervention_themes_text: data.intervention_themes_text || null,
    past_projects: data.past_projects || [],
    funding_history: data.funding_history || [],
    target_amount_min: data.target_amount_min || null,
    target_amount_max: data.target_amount_max || null,
    currencies: data.currencies || ['EUR', 'MAD', 'USD'],
    work_languages: data.work_languages || ['fr', 'ar'],
    preferred_language: data.preferred_language || 'fr',
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
    profile_completeness: computeCompleteness(data),
  };

  if (org) {
    const { error } = await supabase.from('organizations').update(payload).eq('id', org.id);
    if (error) return { error: error.message };
  } else {
    const { data: newOrg, error } = await supabase
      .from('organizations').insert(payload).select('id').single();
    if (error) return { error: error.message };
    org = newOrg;
  }

  // 2. Junction tables — nettoie puis ré-insère
  await Promise.all([
    supabase.from('org_sdg_goals').delete().eq('org_id', org.id),
    supabase.from('org_dac_sectors').delete().eq('org_id', org.id),
    supabase.from('org_target_populations').delete().eq('org_id', org.id),
    supabase.from('org_action_geographies').delete().eq('org_id', org.id),
  ]);

  if (data.sdg_ids?.length) {
    await supabase.from('org_sdg_goals').insert(
      data.sdg_ids.map((sdg_id, idx) => ({
        org_id: org.id,
        sdg_id: Number(sdg_id),
        priority: idx < 3 ? 1 : 2,
      }))
    );
  }
  if (data.dac_sector_ids?.length) {
    await supabase.from('org_dac_sectors').insert(
      data.dac_sector_ids.map(sector_id => ({ org_id: org.id, sector_id }))
    );
  }
  if (data.population_slugs?.length) {
    await supabase.from('org_target_populations').insert(
      data.population_slugs.map(population_slug => ({ org_id: org.id, population_slug }))
    );
  }
  if (data.geography_slugs?.length) {
    await supabase.from('org_action_geographies').insert(
      data.geography_slugs.map(geography_slug => ({ org_id: org.id, geography_slug }))
    );
  }

  // 3. Embedding immediate — sans ça, match_opportunities_for_org tombe sur
  // le fallback taxonomy-only et le sémantique reste à 0 jusqu'au prochain
  // backfill nocturne. On le fait synchrone : ~200-500ms OpenAI, acceptable.
  // En cas d'échec on log et on continue (l'onboarding ne doit pas planter).
  try {
    const [sdgRows, dacRows, popRows, geoRows] = await Promise.all([
      data.sdg_ids?.length
        ? supabase.from('sdg_goals').select('name_fr').in('id', data.sdg_ids.map(Number))
        : { data: [] },
      data.dac_sector_ids?.length
        ? supabase.from('dac_sectors').select('name_fr').in('id', data.dac_sector_ids)
        : { data: [] },
      data.population_slugs?.length
        ? supabase.from('target_populations').select('name_fr').in('slug', data.population_slugs)
        : { data: [] },
      data.geography_slugs?.length
        ? supabase.from('action_geographies').select('name_fr').in('slug', data.geography_slugs)
        : { data: [] },
    ]);
    const text = buildOrgText(payload, {
      sdgNames: (sdgRows.data || []).map((r) => r.name_fr),
      dacNames: (dacRows.data || []).map((r) => r.name_fr),
      populations: (popRows.data || []).map((r) => r.name_fr),
      geographies: (geoRows.data || []).map((r) => r.name_fr),
    });
    if (text.trim().length >= 30) {
      const { vector, model } = await getEmbedding(text);
      await supabase.from('organizations').update({
        embedding: vector,
        embedding_model: model,
        embedding_updated_at: new Date().toISOString(),
      }).eq('id', org.id);
      // Track usage (Sprint 4A.3 — non bloquant si v18 pas appliqué)
      try {
        const { logUsage } = await import('@/lib/usage-tracking');
        // estimation tokens (text-embedding-3-small : ~1 token / 4 chars)
        const approxTokens = Math.ceil(text.length / 4);
        await logUsage(supabase, {
          provider: 'openai',
          model: model === 'openai/text-embedding-3-small' ? 'text-embedding-3-small' : model,
          kind: 'embed_org',
          organizationId: org.id,
          usage: { input_tokens: approxTokens },
          status: model.startsWith('openai/') ? 'ok' : 'simulated',
        });
      } catch {}
    }
  } catch (e) {
    console.warn('[onboarding] embedding failed (non-blocking):', e?.message || e);
  }

  // Sprint 4L — Email "voici tes premiers matches" (non bloquant)
  try {
    const { data: matches } = await supabase.rpc('match_opportunities_for_org', {
      p_org_id: org.id,
      p_limit: 3,
    });
    const tpl = tplFirstMatches({ orgName: payload.name, matches: matches || [] });
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      htmlContent: tpl.htmlContent,
    });
    // Best-effort log
    try {
      await supabase.from('email_logs').insert({
        recipient: user.email,
        template: 'first_matches',
        subject: tpl.subject,
        status: 'sent',
        organization_id: org.id,
      });
    } catch {}
  } catch (e) {
    console.warn('[onboarding] first-matches email failed (non-blocking):', e?.message || e);
  }

  revalidatePath('/dashboard');
  return { success: true, org_id: org.id };
}

function computeCompleteness(d) {
  let score = 0;
  const fields = [
    'name', 'description', 'city', 'region', 'org_type', 'legal_status',
    'creation_year', 'annual_budget_range', 'team_size', 'action_summary',
    'intervention_themes_text',
  ];
  fields.forEach(f => { if (d[f]) score += 5; });
  if (d.sdg_ids?.length >= 3) score += 15;
  if (d.dac_sector_ids?.length >= 2) score += 10;
  if (d.population_slugs?.length >= 1) score += 8;
  if (d.geography_slugs?.length >= 1) score += 7;
  if (d.past_projects?.length >= 1) score += 5;
  return Math.min(100, score);
}

/** Récupère les taxonomies pour les selects */
export async function getTaxonomies() {
  const supabase = createClient();
  const [sdg, dac, pops, geos] = await Promise.all([
    supabase.from('sdg_goals').select('id,code,name_fr,color_hex').order('id'),
    supabase.from('dac_sectors').select('id,parent_id,name_fr').order('id'),
    supabase.from('target_populations').select('slug,name_fr,description'),
    supabase.from('action_geographies').select('slug,name_fr,level,parent_slug').order('level'),
  ]);
  return {
    sdg: sdg.data || [],
    dac: dac.data || [],
    populations: pops.data || [],
    geographies: geos.data || [],
  };
}
