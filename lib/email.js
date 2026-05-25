/**
 * Service email — Brevo (Sendinblue) par défaut.
 * Si BREVO_API_KEY n'est pas défini, log seulement (mode dev).
 *
 * Templates HTML inline (compatibles Gmail/Outlook/Apple Mail).
 * Charte : rouge premium #cf2535 (gradient #e63e4d → #cf2535 → #751821).
 * Footer RGPD : lien unsubscribe 1-clic (token signé) + modifier préférences.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ to, subject, htmlContent, textContent, templateId, params, headers: extraHeaders }) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL || 'alerts@fundingwatch.ma',
    name: process.env.BREVO_SENDER_NAME || 'Funding Watch Morocco'
  };

  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY manquant — email simulé:', { to, subject });
    return { ok: true, simulated: true };
  }

  const body = templateId
    ? { sender, to: [{ email: to }], templateId, params }
    : { sender, to: [{ email: to }], subject, htmlContent, textContent };

  // Headers RFC 8058 — unsubscribe one-click natif (Gmail/Apple Mail)
  if (extraHeaders) {
    body.headers = extraHeaders;
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: data?.message || res.statusText };
  }
  return { ok: true, providerId: data?.messageId };
}

// ============================================================
// Helpers — branding, URL builders
// ============================================================
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';
const PREFS_URL = () => `${APP_URL()}/dashboard/profile`;
const UNSUB_URL = (token) => `${APP_URL()}/unsubscribe?token=${encodeURIComponent(token || '')}`;

// Couleurs brand cohérentes avec tailwind.config.js
const COLORS = {
  brand: '#cf2535',
  brandDark: '#751821',
  brandLight: '#e63e4d',
  ink: '#0f172a',
  inkMuted: '#475569',
  inkLight: '#94a3b8',
  border: '#e2e8f0',
  bg: '#fafaf9',
  white: '#ffffff',
};

/**
 * Wrapper Substack-premium :
 * - Header avec logo + tagline rouge
 * - Filet rouge décoratif
 * - Contenu blanc bien aéré
 * - Footer RGPD avec liens préfs + unsubscribe
 */
const wrap = ({ title, eyebrow, body, unsubscribeToken }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;background:${COLORS.bg};color:${COLORS.ink};-webkit-font-smoothing:antialiased">

<!-- preheader (texte caché preview Gmail/Apple Mail) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${COLORS.bg};opacity:0">${eyebrow || ''}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:32px 16px">
  <tr><td align="center">

    <!-- container -->
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLORS.white};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06)">

      <!-- header -->
      <tr><td style="padding:32px 40px 24px 40px;border-bottom:3px solid ${COLORS.brand}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;width:42px;height:42px;background:linear-gradient(135deg,${COLORS.brandLight} 0%,${COLORS.brand} 50%,${COLORS.brandDark} 100%);border-radius:12px;text-align:center;line-height:42px;color:${COLORS.white};font-weight:900;font-size:18px;font-family:Georgia,serif">F</div>
            </td>
            <td style="text-align:right">
              <div style="font-weight:900;color:${COLORS.ink};font-size:15px;line-height:1.2">Funding Watch</div>
              <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-top:2px">Morocco · Intelligence</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- eyebrow + title -->
      <tr><td style="padding:36px 40px 0 40px">
        ${eyebrow ? `<div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:10px">${eyebrow}</div>` : ''}
        <h1 style="margin:0;font-size:28px;font-weight:900;color:${COLORS.ink};line-height:1.2;letter-spacing:-0.02em">${title}</h1>
      </td></tr>

      <!-- body -->
      <tr><td style="padding:24px 40px 36px 40px;font-size:15px;line-height:1.6;color:${COLORS.inkMuted}">
        ${body}
      </td></tr>

      <!-- footer RGPD -->
      <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid ${COLORS.border};background:${COLORS.bg}">
        <p style="margin:0 0 12px 0;font-size:12px;line-height:1.5;color:${COLORS.inkLight}">
          Vous recevez cet email car votre organisation est inscrite à la veille Funding Watch Morocco — la plateforme d'intelligence financement pour les associations marocaines.
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.inkLight}">
          <a href="${PREFS_URL()}" style="color:${COLORS.brand};text-decoration:none;font-weight:600">Modifier mes préférences</a>
          <span style="color:${COLORS.border};margin:0 8px">·</span>
          <a href="${UNSUB_URL(unsubscribeToken)}" style="color:${COLORS.inkLight};text-decoration:underline">Me désabonner</a>
          <span style="color:${COLORS.border};margin:0 8px">·</span>
          <a href="${APP_URL()}" style="color:${COLORS.inkLight};text-decoration:underline">fundingwatch.ma</a>
        </p>
      </td></tr>

    </table>
    <!-- /container -->

    <!-- legal mention -->
    <div style="max-width:600px;margin:20px auto 0;text-align:center;font-size:11px;line-height:1.5;color:${COLORS.inkLight};padding:0 16px">
      © ${new Date().getFullYear()} Funding Watch Morocco · Casablanca, Maroc
    </div>

  </td></tr>
</table>
</body>
</html>`;

// CTA button helper
const cta = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
  <tr><td style="background:linear-gradient(135deg,${COLORS.brandLight} 0%,${COLORS.brand} 50%,${COLORS.brandDark} 100%);border-radius:999px;box-shadow:0 8px 20px rgba(207,37,53,0.25)">
    <a href="${href}" style="display:inline-block;padding:14px 28px;color:${COLORS.white};text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.04em">${label} →</a>
  </td></tr>
</table>`;

// Urgency badge for deadline
const urgencyBadge = (days) => {
  if (days == null) return '';
  if (days <= 0) return `<span style="display:inline-block;background:#fee2e2;color:${COLORS.brandDark};padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em">⚠ EXPIRÉE</span>`;
  if (days <= 7) return `<span style="display:inline-block;background:#fee2e2;color:${COLORS.brand};padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em">🔥 ${days}J RESTANTS</span>`;
  if (days <= 30) return `<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em">⏰ ${days}J RESTANTS</span>`;
  return `<span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em">${days}J RESTANTS</span>`;
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

// ============================================================
// Templates
// ============================================================

export function tplNewOpportunity({ orgName, opp, unsubscribeToken }) {
  const url = `${APP_URL()}/opportunities/${opp.id}`;
  const days = daysUntil(opp.deadline);
  return {
    subject: `Nouvelle opportunité : ${opp.title}`,
    htmlContent: wrap({
      title: 'Une opportunité matche votre profil',
      eyebrow: 'Alerte IA · Nouvelle détection',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">Bonjour <b style="color:${COLORS.ink}">${orgName || ''}</b>,</p>
        <p style="margin:0 0 20px 0">Notre moteur de matching a détecté une opportunité qui correspond à votre profil.</p>
        <div style="border:1px solid ${COLORS.border};border-radius:16px;padding:24px;margin:24px 0;background:${COLORS.white}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:8px">${opp.donor_name || 'Bailleur'} · ${urgencyBadge(days)}</div>
          <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:800;color:${COLORS.ink};line-height:1.35">${opp.title}</h2>
          <p style="margin:0;color:${COLORS.inkMuted};font-size:14px;line-height:1.55">${opp.summary || ''}</p>
        </div>
        ${cta(url, 'Voir l\'opportunité')}
      `,
    })
  };
}

export function tplWeeklyDigest({ orgName, opportunities = [], unsubscribeToken }) {
  const items = opportunities.map((o, i) => {
    const url = `${APP_URL()}/opportunities/${o.id}`;
    const days = daysUntil(o.deadline);
    return `
    <a href="${url}" style="display:block;text-decoration:none;color:inherit;padding:18px 0;border-bottom:1px solid ${COLORS.border}">
      <div style="font-size:11px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:6px">#${i + 1} · ${o.donor_name || 'Bailleur'}</div>
      <div style="font-size:15px;font-weight:800;color:${COLORS.ink};line-height:1.4;margin-bottom:6px">${o.title}</div>
      <div style="font-size:12px;color:${COLORS.inkLight}">${urgencyBadge(days)} ${o.score ? ` · Score ${o.score}%` : ''}</div>
    </a>`;
  }).join('');
  return {
    subject: `${opportunities.length} opportunités cette semaine pour ${orgName || 'votre association'}`,
    htmlContent: wrap({
      title: 'Votre veille hebdomadaire',
      eyebrow: `${opportunities.length} matches détectés`,
      unsubscribeToken,
      body: `
        <p style="margin:0 0 12px 0">Bonjour <b style="color:${COLORS.ink}">${orgName || ''}</b>,</p>
        <p style="margin:0 0 8px 0">Voici les <b>${opportunities.length} opportunités</b> qui correspondent à votre profil cette semaine, par ordre de pertinence :</p>
        <div>${items}</div>
        ${cta(`${APP_URL()}/dashboard`, 'Voir toutes mes opportunités')}
      `,
    })
  };
}

export function tplDailyDigest({ orgName, matches = [], unsubscribeToken }) {
  const items = matches.map((m, i) => {
    const url = `${APP_URL()}/opportunities/${m.opportunity_id}`;
    const score = Math.round(Number(m.final_score) || 0);
    const days = daysUntil(m.deadline);
    const deadlineFr = m.deadline
      ? new Date(m.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'à confirmer';
    const moroccoBadge = m.morocco_eligible
      ? `<span style="display:inline-block;background:#fee2e2;color:${COLORS.brand};padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;margin-right:6px">🇲🇦 MAROC</span>`
      : '';
    return `
    <a href="${url}" style="display:block;text-decoration:none;color:inherit;margin:16px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden">
        <tr><td style="padding:20px 22px">
          <div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:8px">
            Match #${i + 1} · ${m.donor_name || 'Bailleur'}
          </div>
          <div style="font-size:17px;font-weight:800;color:${COLORS.ink};line-height:1.35;margin-bottom:10px">${m.title}</div>
          <div style="margin-bottom:10px">${moroccoBadge}${urgencyBadge(days)}</div>
          <div style="font-size:13px;color:${COLORS.inkLight};line-height:1.5;margin-bottom:4px">Deadline : <b style="color:${COLORS.inkMuted}">${deadlineFr}</b></div>
          ${m.reason ? `<div style="font-size:13px;color:${COLORS.inkLight};line-height:1.5;font-style:italic">${m.reason}</div>` : ''}
        </td><td style="padding:20px 22px 20px 0;vertical-align:top;text-align:right;white-space:nowrap">
          <div style="display:inline-block;background:linear-gradient(135deg,${COLORS.brandLight} 0%,${COLORS.brand} 50%,${COLORS.brandDark} 100%);color:${COLORS.white};font-weight:900;font-size:18px;padding:10px 16px;border-radius:14px;line-height:1">${score}<span style="font-size:11px;font-weight:700">%</span></div>
        </td></tr>
      </table>
    </a>`;
  }).join('');
  const greeting = orgName ? `Bonjour <b style="color:${COLORS.ink}">${orgName}</b>,` : 'Bonjour,';
  return {
    subject: `☀ Vos ${matches.length} financements du jour ${matches[0] ? `· top ${Math.round(matches[0].final_score)}%` : ''}`,
    htmlContent: wrap({
      title: `${matches.length} opportunités pour vous aujourd'hui`,
      eyebrow: '☀ Votre veille du matin',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 12px 0">${greeting}</p>
        <p style="margin:0 0 8px 0">Notre matching IA a sélectionné les <b>${matches.length} opportunités</b> les mieux alignées avec votre profil, par compatibilité décroissante.</p>
        <div>${items}</div>
        ${cta(`${APP_URL()}/dashboard`, 'Tous mes matches')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.5">
          💡 <i>Les scores sont calculés en temps réel à partir de votre profil organisation, des thématiques SDG/OCDE-DAC, de votre géographie d'action et de l'urgence des deadlines.</i>
        </p>
      `,
    })
  };
}

export function tplDeadlineReminder({ orgName, opp, days, unsubscribeToken }) {
  const url = `${APP_URL()}/opportunities/${opp.id}`;
  return {
    subject: `⏰ Deadline dans ${days}j : ${opp.title}`,
    htmlContent: wrap({
      title: `Plus que ${days} jours pour postuler`,
      eyebrow: '⏰ Rappel deadline',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">Bonjour <b style="color:${COLORS.ink}">${orgName || ''}</b>,</p>
        <p style="margin:0 0 20px 0">L'opportunité <b style="color:${COLORS.ink}">${opp.title}</b> ferme dans <b style="color:${COLORS.brand}">${days} jours</b>.</p>
        <p style="margin:0 0 20px 0;color:${COLORS.inkMuted}">Si vous comptiez postuler, c'est le moment de finaliser votre dossier.</p>
        ${cta(url, 'Voir l\'opportunité')}
      `,
    })
  };
}

// =================================================================
// Sprint 4L — Welcome & Onboarding-complete emails
// =================================================================

/**
 * Email envoyé juste après le register. Oriente l'utilisateur vers
 * l'onboarding, présente les 3 prochaines étapes en 30 secondes.
 */
export function tplWelcome({ fullName, orgName, unsubscribeToken }) {
  const onbUrl = `${APP_URL()}/onboarding`;
  const greeting = fullName ? `Bonjour <b style="color:${COLORS.ink}">${fullName}</b>` : 'Bonjour';
  return {
    subject: `Bienvenue sur Funding Watch — votre veille démarre dans 2 min`,
    htmlContent: wrap({
      title: 'Bienvenue sur Funding Watch Morocco',
      eyebrow: '🎉 Compte créé',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Votre compte est créé. Bienvenue parmi les associations marocaines qui ne ratent plus aucun financement international.</p>
        ${orgName ? `<p style="margin:0 0 20px 0;color:${COLORS.inkMuted}">Organisation : <b style="color:${COLORS.ink}">${orgName}</b></p>` : ''}

        <div style="margin:28px 0 8px;padding:24px;border-radius:16px;background:${COLORS.bg};border:1px solid ${COLORS.border}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:14px">Vos 3 prochaines étapes (2 min)</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:top;padding:0 0 16px 0">
                <div style="display:inline-block;width:24px;height:24px;background:${COLORS.brand};color:${COLORS.white};border-radius:50%;text-align:center;line-height:24px;font-weight:900;font-size:12px;vertical-align:middle">1</div>
                <span style="margin-left:12px;font-weight:700;color:${COLORS.ink}">Complétez votre profil organisation</span>
                <div style="margin-left:36px;color:${COLORS.inkMuted};font-size:13px;margin-top:4px">Thématiques, géographies, budget — c'est ce qui alimente le scoring IA.</div>
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top;padding:0 0 16px 0">
                <div style="display:inline-block;width:24px;height:24px;background:${COLORS.brand};color:${COLORS.white};border-radius:50%;text-align:center;line-height:24px;font-weight:900;font-size:12px;vertical-align:middle">2</div>
                <span style="margin-left:12px;font-weight:700;color:${COLORS.ink}">Recevez vos premiers matches</span>
                <div style="margin-left:36px;color:${COLORS.inkMuted};font-size:13px;margin-top:4px">Top 5 opportunités classées par compatibilité dans votre dashboard, dès la fin du wizard.</div>
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top">
                <div style="display:inline-block;width:24px;height:24px;background:${COLORS.brand};color:${COLORS.white};border-radius:50%;text-align:center;line-height:24px;font-weight:900;font-size:12px;vertical-align:middle">3</div>
                <span style="margin-left:12px;font-weight:700;color:${COLORS.ink}">Activez vos alertes</span>
                <div style="margin-left:36px;color:${COLORS.inkMuted};font-size:13px;margin-top:4px">Digest quotidien ou hebdo, ajustable depuis votre profil.</div>
              </td>
            </tr>
          </table>
        </div>

        ${cta(onbUrl, 'Lancer mon onboarding')}

        <p style="margin:32px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          Une question ? Réponds directement à cet email — l'équipe lit chaque message.
        </p>
      `,
    })
  };
}

/**
 * Email envoyé juste après la fin du wizard d'onboarding, avec les 3
 * premiers matches calculés. Vrai moment "wow" pour fixer la valeur.
 */
export function tplFirstMatches({ orgName, matches = [], unsubscribeToken }) {
  const items = matches.slice(0, 3).map((m) => {
    const url = `${APP_URL()}/opportunities/${m.opportunity_id || m.id}`;
    const score = Math.round(Number(m.final_score) || Number(m.score) || 0);
    const days = daysUntil(m.deadline);
    return `
      <div style="border:1px solid ${COLORS.border};border-radius:14px;padding:18px;margin:0 0 12px 0;background:${COLORS.white}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand}">
            ${m.donor_name || 'Bailleur'} ${days !== null ? '· ' + urgencyBadge(days) : ''}
          </div>
          <div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:999px;padding:4px 10px;font-size:12px;font-weight:900;color:${COLORS.brand}">
            🎯 ${score}/100
          </div>
        </div>
        <h3 style="margin:8px 0 6px 0;font-size:16px;font-weight:800;color:${COLORS.ink};line-height:1.35">
          <a href="${url}" style="color:${COLORS.ink};text-decoration:none">${m.title}</a>
        </h3>
        ${m.reason ? `<p style="margin:0;color:${COLORS.inkLight};font-size:12px">${m.reason}</p>` : ''}
      </div>
    `;
  }).join('');

  const greeting = orgName ? `Bonjour <b style="color:${COLORS.ink}">${orgName}</b>` : 'Bonjour';
  return {
    subject: `Vos ${matches.length} premiers matches sont prêts`,
    htmlContent: wrap({
      title: matches.length > 0 ? `${matches.length} opportunités matchent votre profil` : 'Profil enregistré',
      eyebrow: '🎯 Onboarding complété',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Votre profil est enregistré et notre matching IA a déjà tourné. Voici vos opportunités les mieux alignées :</p>
        ${items || `<p style="color:${COLORS.inkMuted};font-style:italic">Aucun match au-dessus du seuil pour l'instant — la base s'enrichit chaque jour. Tu recevras une alerte dès qu'une opportunité forte arrivera.</p>`}
        ${cta(`${APP_URL()}/dashboard`, 'Ouvrir mon dashboard')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          💡 Ces scores combinent similarité sémantique (matching vectoriel), alignement thématique SDG/DAC, géographie et urgence deadline. Ils se précisent au fur et à mesure que tu sauvegardes / candidates / partages des outcomes.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+3 : rappel complétion profil.
 *
 * Déclencheur : 3 jours après inscription, SI profil < 70% OU 0 saved.
 * Objectif : pousser à finir le profil pour fiabiliser le matching.
 */
export function tplOnboardingDay3({ fullName, orgName, missingFields = [], unsubscribeToken }) {
  const profileUrl = `${APP_URL()}/dashboard/profile`;
  const greeting = fullName ? `Bonjour <b style="color:${COLORS.ink}">${fullName.split(' ')[0]}</b>` : 'Bonjour';
  const missingList = missingFields.length > 0
    ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:${COLORS.inkMuted}">${missingFields.map(f => `<li style="margin:4px 0">${f}</li>`).join('')}</ul>`
    : '';
  return {
    subject: `${(fullName || '').split(' ')[0] || 'Bonjour'}, votre profil est presque prêt`,
    htmlContent: wrap({
      title: 'Votre profil mérite 3 minutes de plus',
      eyebrow: '📋 J+3 · Activation',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Vous avez créé votre compte sur Funding Watch il y a 3 jours — bravo pour cette première étape.</p>
        <p style="margin:0 0 12px 0">Pour que le matching soit vraiment pertinent, il manque encore quelques infos clés sur <b style="color:${COLORS.ink}">${orgName || 'votre organisation'}</b> :</p>
        ${missingList}
        <p style="margin:20px 0;color:${COLORS.inkMuted}">Ça prend 3 minutes max et ça transforme la qualité des opportunités proposées (jusqu'à <b>3x plus de précision</b>).</p>
        ${cta(profileUrl, 'Compléter mon profil →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          💡 Astuce : uploadez le PDF de présentation de votre association dans la section "Profil > Documents". Claude (IA) l'analyse automatiquement et pré-remplit votre profil en 30 secondes.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+5 : découverte AI Cowriter.
 *
 * Déclencheur : 5 jours après inscription, SI profil ≥ 70% ET ≥1 saved
 * ET 0 candidature démarrée (pas de status 'analyzing'+).
 * Objectif : faire essayer le AI Cowriter pour fixer la perception de valeur premium.
 */
export function tplOnboardingDay5({ fullName, orgName, savedCount = 0, unsubscribeToken }) {
  const savedUrl = `${APP_URL()}/dashboard/saved`;
  const greeting = fullName ? `Bonjour <b style="color:${COLORS.ink}">${fullName.split(' ')[0]}</b>` : 'Bonjour';
  const s = savedCount > 1 ? 's' : '';
  return {
    subject: `Brouillon de candidature en 30 secondes (avec Claude)`,
    htmlContent: wrap({
      title: 'Le AI Cowriter — votre raccourci candidature',
      eyebrow: '🤖 J+5 · IA',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Vous avez sauvegardé <b style="color:${COLORS.ink}">${savedCount} opportunité${s}</b> cette semaine — top.</p>
        <p style="margin:0 0 20px 0">Pour chacune, vous pouvez générer en <b>30 secondes</b> un brouillon de résumé exécutif (executive summary) adapté à <b style="color:${COLORS.ink}">${orgName || 'votre asso'}</b>. L'IA combine votre profil + le contenu de l'appel à projets pour vous proposer un point de départ rédactionnel.</p>

        <div style="margin:24px 0;padding:20px;border-radius:14px;background:${COLORS.bg};border:1px solid ${COLORS.border}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:12px">Comment ça marche</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">1.</b> &nbsp;Sur n'importe quelle opp sauvegardée, cliquez <b>"AI Cowriter"</b></td></tr>
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">2.</b> &nbsp;Lisez le brouillon (30 sec)</td></tr>
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">3.</b> &nbsp;Adaptez-le à votre voix</td></tr>
          </table>
        </div>

        <p style="margin:0 0 20px 0">Beaucoup d'orgas l'utilisent comme premier draft, puis affinent. <b>Gain de temps : 1 à 2 heures par candidature.</b></p>
        ${cta(savedUrl, 'Voir mes opportunités sauvegardées →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          PS : Si vous travaillez déjà sur une candidature, pensez à changer son statut sur la fiche (saved → analyzing → preparing → submitted) pour suivre votre pipeline.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+7 : récap première semaine.
 *
 * Déclencheur : 7 jours après inscription, pour tous (sauf désinscrits).
 * Objectif : montrer la valeur générée + relancer vers les opps urgentes.
 */
export function tplOnboardingDay7({ fullName, orgName, stats = {}, urgentOpps = [], topThemes = [], unsubscribeToken }) {
  const dashUrl = `${APP_URL()}/dashboard`;
  const greeting = fullName ? `Bonjour <b style="color:${COLORS.ink}">${fullName.split(' ')[0]}</b>` : 'Bonjour';
  const urgentList = urgentOpps.slice(0, 3).map((o) => {
    const url = `${APP_URL()}/opportunities/${o.id}`;
    const days = daysUntil(o.deadline);
    return `
      <div style="border:1px solid ${COLORS.border};border-radius:12px;padding:14px;margin:0 0 10px 0;background:${COLORS.white}">
        <div style="font-size:11px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:6px">
          ${o.donor_name || 'Bailleur'} ${days !== null ? '· ' + urgencyBadge(days) : ''}
        </div>
        <a href="${url}" style="color:${COLORS.ink};text-decoration:none;font-weight:700;font-size:14px;line-height:1.4">${o.title}</a>
      </div>`;
  }).join('') || `<p style="color:${COLORS.inkMuted};font-style:italic;margin:0">Aucune deadline urgente cette semaine — profitez-en pour soigner vos candidatures en cours.</p>`;

  const themesPills = topThemes.slice(0, 5).map(t =>
    `<span style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;border-radius:999px;background:${COLORS.bg};border:1px solid ${COLORS.border};font-size:12px;font-weight:600;color:${COLORS.ink}">${t}</span>`
  ).join('') || `<span style="color:${COLORS.inkMuted};font-style:italic;font-size:13px">Complétez votre profil pour activer la détection des thématiques.</span>`;

  return {
    subject: `Votre première semaine sur Funding Watch — récap`,
    htmlContent: wrap({
      title: 'Votre semaine, en chiffres',
      eyebrow: '📊 J+7 · Récap',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Petit récap de votre première semaine sur Funding Watch :</p>

        <div style="margin:24px 0;padding:20px;border-radius:14px;background:${COLORS.bg};border:1px solid ${COLORS.border}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:14px">📊 Votre activité</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="50%" style="padding:8px 0;font-size:14px;color:${COLORS.ink}">📂 Sauvegardées</td>
              <td width="50%" style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.saved || 0}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:${COLORS.ink}">🎯 Candidatures démarrées</td>
              <td style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.applications || 0}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:${COLORS.ink}">📧 Alertes email reçues</td>
              <td style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.alerts || 0}</td>
            </tr>
          </table>
        </div>

        <div style="margin:24px 0">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:10px">🎯 Vos top thématiques</div>
          ${themesPills}
        </div>

        <div style="margin:24px 0">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:10px">🔥 Deadlines urgentes</div>
          ${urgentList}
        </div>

        ${cta(dashUrl, 'Retour au dashboard →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          Une remarque, une suggestion, un bug ? Cliquez sur le bouton 💬 en bas à droite de n'importe quelle page. Ali (le fondateur) lit personnellement chaque retour.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+14 : NPS.
 *
 * Déclencheur : 14 jours après inscription, pour tous (sauf désinscrits).
 * Objectif : mesurer la satisfaction Net Promoter Score (0-10).
 *
 * Chaque score est un lien GET vers /nps?score=X qui enregistre dans la
 * table beta_feedback (kind='other', message='NPS: X').
 */
export function tplOnboardingDay14NPS({ fullName, unsubscribeToken }) {
  const npsUrl = (score) => `${APP_URL()}/nps?score=${score}`;
  const greeting = fullName ? `Bonjour <b style="color:${COLORS.ink}">${fullName.split(' ')[0]}</b>` : 'Bonjour';

  // Couleurs NPS : promoters (9-10) vert, passifs (7-8) orange, détracteurs (0-6) rouge
  const npsColor = (n) => n >= 9 ? '#10b981' : n >= 7 ? '#f59e0b' : '#ef4444';
  const scoreLinks = Array.from({ length: 11 }, (_, n) =>
    `<td style="padding:2px"><a href="${npsUrl(n)}" style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:8px;background:${npsColor(n)};color:#fff;text-decoration:none;font-weight:900;font-size:14px;text-align:center">${n}</a></td>`
  ).join('');

  return {
    subject: `2 questions rapides — votre avis compte vraiment`,
    htmlContent: wrap({
      title: 'Comment ça se passe pour vous ?',
      eyebrow: '🎯 J+14 · Votre avis',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Cela fait 2 semaines que vous utilisez Funding Watch Morocco. J'aimerais savoir ce que vous en pensez — vraiment honnêtement.</p>

        <p style="margin:24px 0 8px 0;font-weight:800;color:${COLORS.ink};font-size:15px">Sur une échelle de 0 à 10, à quel point recommanderiez-vous Funding Watch à un(e) collègue qui dirige une association marocaine ?</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto;border-collapse:separate;border-spacing:0">
          <tr>${scoreLinks}</tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:440px">
          <tr>
            <td style="font-size:11px;color:${COLORS.inkLight};text-align:left">0 · Pas du tout</td>
            <td style="font-size:11px;color:${COLORS.inkLight};text-align:right">10 · Absolument</td>
          </tr>
        </table>

        <p style="margin:32px 0 0 0;color:${COLORS.inkMuted}">Vos retours guident directement les 2 prochaines features que je vais coder. C'est du sérieux.</p>
        <p style="margin:20px 0 0 0">Merci d'avance,<br/><b style="color:${COLORS.ink}">Ali</b><br/><span style="font-size:12px;color:${COLORS.inkLight}">Fondateur, Funding Watch Morocco</span></p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+3 : rappel complétion profil.
 *
 * Déclencheur : 3 jours après inscription, SI profil < 70% OU 0 saved.
 */
export function tplOnboardingDay3({ fullName, orgName, missingFields = [], unsubscribeToken }) {
  const profileUrl = `${APP_URL()}/dashboard/profile`;
  const firstName = (fullName || '').split(' ')[0];
  const greeting = firstName ? `Bonjour <b style="color:${COLORS.ink}">${firstName}</b>` : 'Bonjour';
  const missingList = missingFields.length > 0
    ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:${COLORS.inkMuted}">${missingFields.map(f => `<li style="margin:4px 0">${f}</li>`).join('')}</ul>`
    : '';
  return {
    subject: `${firstName || 'Bonjour'}, votre profil est presque prêt`,
    htmlContent: wrap({
      title: 'Votre profil mérite 3 minutes de plus',
      eyebrow: '📋 J+3 · Activation',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Vous avez créé votre compte sur Funding Watch il y a 3 jours — bravo pour cette première étape.</p>
        <p style="margin:0 0 12px 0">Pour que le matching soit vraiment pertinent, il manque encore quelques infos clés sur <b style="color:${COLORS.ink}">${orgName || 'votre organisation'}</b> :</p>
        ${missingList}
        <p style="margin:20px 0;color:${COLORS.inkMuted}">Ça prend 3 minutes max et ça transforme la qualité des opportunités proposées (jusqu'à <b>3x plus de précision</b>).</p>
        ${cta(profileUrl, 'Compléter mon profil →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          💡 Astuce : uploadez le PDF de présentation de votre association dans la section "Profil > Documents". Claude (IA) l'analyse automatiquement et pré-remplit votre profil en 30 secondes.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+5 : découverte AI Cowriter.
 *
 * Déclencheur : 5 jours après inscription, SI ≥1 saved ET 0 candidature démarrée.
 */
export function tplOnboardingDay5({ fullName, orgName, savedCount = 0, unsubscribeToken }) {
  const savedUrl = `${APP_URL()}/dashboard/saved`;
  const firstName = (fullName || '').split(' ')[0];
  const greeting = firstName ? `Bonjour <b style="color:${COLORS.ink}">${firstName}</b>` : 'Bonjour';
  const s = savedCount > 1 ? 's' : '';
  return {
    subject: `Brouillon de candidature en 30 secondes (avec Claude)`,
    htmlContent: wrap({
      title: 'Le AI Cowriter — votre raccourci candidature',
      eyebrow: '🤖 J+5 · IA',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Vous avez sauvegardé <b style="color:${COLORS.ink}">${savedCount} opportunité${s}</b> cette semaine — top.</p>
        <p style="margin:0 0 20px 0">Pour chacune, vous pouvez générer en <b>30 secondes</b> un brouillon de résumé exécutif (executive summary) adapté à <b style="color:${COLORS.ink}">${orgName || 'votre asso'}</b>. L'IA combine votre profil + le contenu de l'appel à projets pour vous proposer un point de départ rédactionnel.</p>
        <div style="margin:24px 0;padding:20px;border-radius:14px;background:${COLORS.bg};border:1px solid ${COLORS.border}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:12px">Comment ça marche</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">1.</b> &nbsp;Sur n'importe quelle opp sauvegardée, cliquez <b>"AI Cowriter"</b></td></tr>
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">2.</b> &nbsp;Lisez le brouillon (30 sec)</td></tr>
            <tr><td style="padding:6px 0"><b style="color:${COLORS.ink}">3.</b> &nbsp;Adaptez-le à votre voix</td></tr>
          </table>
        </div>
        <p style="margin:0 0 20px 0">Beaucoup d'orgas l'utilisent comme premier draft, puis affinent. <b>Gain de temps : 1 à 2 heures par candidature.</b></p>
        ${cta(savedUrl, 'Voir mes opportunités sauvegardées →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          PS : Si vous travaillez déjà sur une candidature, pensez à changer son statut sur la fiche (saved → analyzing → preparing → submitted) pour suivre votre pipeline.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+7 : récap première semaine + opps urgentes.
 *
 * Déclencheur : 7 jours après inscription, pour tous (sauf désinscrits).
 */
export function tplOnboardingDay7({ fullName, orgName, stats = {}, urgentOpps = [], topThemes = [], unsubscribeToken }) {
  const dashUrl = `${APP_URL()}/dashboard`;
  const firstName = (fullName || '').split(' ')[0];
  const greeting = firstName ? `Bonjour <b style="color:${COLORS.ink}">${firstName}</b>` : 'Bonjour';

  const urgentList = urgentOpps.slice(0, 3).map((o) => {
    const url = `${APP_URL()}/opportunities/${o.opportunity_id || o.id}`;
    const days = daysUntil(o.deadline);
    return `
      <div style="border:1px solid ${COLORS.border};border-radius:12px;padding:14px;margin:0 0 10px 0;background:${COLORS.white}">
        <div style="font-size:11px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:6px">
          ${o.donor_name || 'Bailleur'} ${days !== null ? '· ' + urgencyBadge(days) : ''}
        </div>
        <a href="${url}" style="color:${COLORS.ink};text-decoration:none;font-weight:700;font-size:14px;line-height:1.4">${o.title}</a>
      </div>`;
  }).join('') || `<p style="color:${COLORS.inkMuted};font-style:italic;margin:0">Aucune deadline urgente cette semaine — profitez-en pour soigner vos candidatures en cours.</p>`;

  const themesPills = topThemes.slice(0, 5).map(t =>
    `<span style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;border-radius:999px;background:${COLORS.bg};border:1px solid ${COLORS.border};font-size:12px;font-weight:600;color:${COLORS.ink}">${t}</span>`
  ).join('') || `<span style="color:${COLORS.inkMuted};font-style:italic;font-size:13px">Complétez votre profil pour activer la détection des thématiques.</span>`;

  return {
    subject: `Votre première semaine sur Funding Watch — récap`,
    htmlContent: wrap({
      title: 'Votre semaine, en chiffres',
      eyebrow: '📊 J+7 · Récap',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Petit récap de votre première semaine sur Funding Watch :</p>
        <div style="margin:24px 0;padding:20px;border-radius:14px;background:${COLORS.bg};border:1px solid ${COLORS.border}">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:14px">📊 Votre activité</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="50%" style="padding:8px 0;font-size:14px;color:${COLORS.ink}">📂 Sauvegardées</td>
              <td width="50%" style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.saved || 0}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:${COLORS.ink}">🎯 Candidatures démarrées</td>
              <td style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.applications || 0}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:${COLORS.ink}">📧 Alertes email reçues</td>
              <td style="padding:8px 0;font-size:14px;font-weight:800;color:${COLORS.brand};text-align:right">${stats.alerts || 0}</td>
            </tr>
          </table>
        </div>
        <div style="margin:24px 0">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:10px">🎯 Vos top thématiques</div>
          ${themesPills}
        </div>
        <div style="margin:24px 0">
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${COLORS.brand};margin-bottom:10px">🔥 Deadlines urgentes pour vous</div>
          ${urgentList}
        </div>
        ${cta(dashUrl, 'Retour au dashboard →')}
        <p style="margin:24px 0 0 0;font-size:13px;color:${COLORS.inkLight};line-height:1.6">
          Une remarque, une suggestion, un bug ? Cliquez sur le bouton 💬 en bas à droite de n'importe quelle page. Ali (le fondateur) lit personnellement chaque retour.
        </p>
      `,
    })
  };
}

/**
 * Sprint 4P — Onboarding J+14 : NPS.
 *
 * Déclencheur : 14 jours après inscription, pour tous.
 * Chaque score est un lien GET vers /nps?score=X qui stocke dans beta_feedback.
 */
export function tplOnboardingDay14NPS({ fullName, unsubscribeToken }) {
  const npsUrl = (score) => `${APP_URL()}/nps?score=${score}`;
  const firstName = (fullName || '').split(' ')[0];
  const greeting = firstName ? `Bonjour <b style="color:${COLORS.ink}">${firstName}</b>` : 'Bonjour';
  const npsColor = (n) => n >= 9 ? '#10b981' : n >= 7 ? '#f59e0b' : '#ef4444';
  const scoreLinks = Array.from({ length: 11 }, (_, n) =>
    `<td style="padding:2px"><a href="${npsUrl(n)}" style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:8px;background:${npsColor(n)};color:#fff;text-decoration:none;font-weight:900;font-size:14px;text-align:center">${n}</a></td>`
  ).join('');

  return {
    subject: `2 questions rapides — votre avis compte vraiment`,
    htmlContent: wrap({
      title: 'Comment ça se passe pour vous ?',
      eyebrow: '🎯 J+14 · Votre avis',
      unsubscribeToken,
      body: `
        <p style="margin:0 0 16px 0">${greeting},</p>
        <p style="margin:0 0 20px 0">Cela fait 2 semaines que vous utilisez Funding Watch Morocco. J'aimerais savoir ce que vous en pensez — vraiment honnêtement.</p>
        <p style="margin:24px 0 8px 0;font-weight:800;color:${COLORS.ink};font-size:15px">Sur une échelle de 0 à 10, à quel point recommanderiez-vous Funding Watch à un(e) collègue qui dirige une association marocaine ?</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto;border-collapse:separate;border-spacing:0">
          <tr>${scoreLinks}</tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:440px">
          <tr>
            <td style="font-size:11px;color:${COLORS.inkLight};text-align:left">0 · Pas du tout</td>
            <td style="font-size:11px;color:${COLORS.inkLight};text-align:right">10 · Absolument</td>
          </tr>
        </table>
        <p style="margin:32px 0 0 0;color:${COLORS.inkMuted}">Vos retours guident directement les 2 prochaines features que je vais coder. C'est du sérieux.</p>
        <p style="margin:20px 0 0 0">Merci d'avance,<br/><b style="color:${COLORS.ink}">Ali</b><br/><span style="font-size:12px;color:${COLORS.inkLight}">Fondateur, Funding Watch Morocco</span></p>
      `,
    })
  };
}
