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
