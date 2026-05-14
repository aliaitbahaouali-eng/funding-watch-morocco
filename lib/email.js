/**
 * Service email — Brevo (Sendinblue) par défaut.
 * Si BREVO_API_KEY n'est pas défini, log seulement (mode dev).
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ to, subject, htmlContent, textContent, templateId, params }) {
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
// Templates HTML — simples, prêts à customiser.
// ============================================================
const wrap = (title, body) => `<!doctype html><html><body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#f8fafc">
<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px 32px">
  <div style="font-weight:900;color:#123F91;font-size:22px;margin-bottom:24px">Funding Watch Morocco</div>
  <h1 style="font-size:24px;margin:0 0 16px 0;color:#0f172a">${title}</h1>
  ${body}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
  <p style="font-size:12px;color:#94a3b8;line-height:1.6">Vous recevez cet email car votre organisation est inscrite à la veille Funding Watch. <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/preferences" style="color:#123F91">Modifier vos préférences</a>.</p>
</div></body></html>`;

export function tplNewOpportunity({ orgName, opp }) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/opportunities/${opp.id}`;
  return {
    subject: `Nouvelle opportunité : ${opp.title}`,
    htmlContent: wrap('Nouvelle opportunité détectée', `
      <p>Bonjour ${orgName || ''},</p>
      <p>Nous avons détecté une opportunité qui correspond à votre profil :</p>
      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:20px 0">
        <p style="font-weight:bold;font-size:18px;margin:0">${opp.title}</p>
        <p style="color:#64748b;margin:8px 0">${opp.donor_name || ''} — Deadline : ${opp.deadline || 'à confirmer'}</p>
        <p>${opp.summary || ''}</p>
        <a href="${url}" style="display:inline-block;background:#123F91;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Voir l'opportunité</a>
      </div>
    `)
  };
}

export function tplWeeklyDigest({ orgName, opportunities = [] }) {
  const items = opportunities.map(o => `
    <div style="border-bottom:1px solid #e2e8f0;padding:12px 0">
      <p style="font-weight:bold;margin:0">${o.title}</p>
      <p style="color:#64748b;margin:4px 0">Deadline : ${o.deadline || '—'} · Score : ${o.score || '—'}%</p>
    </div>
  `).join('');
  return {
    subject: `Votre veille hebdomadaire — ${opportunities.length} opportunités`,
    htmlContent: wrap('Votre veille hebdomadaire', `
      <p>Bonjour ${orgName || ''},</p>
      <p>Voici les ${opportunities.length} opportunités qui correspondent à votre profil cette semaine :</p>
      ${items}
    `)
  };
}

export function tplDailyDigest({ orgName, matches = [] }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const items = matches.map((m, i) => {
    const url = `${appUrl}/opportunities/${m.opportunity_id}`;
    const score = Math.round(Number(m.final_score) || 0);
    const deadline = m.deadline
      ? new Date(m.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'à confirmer';
    return `
      <a href="${url}" style="display:block;text-decoration:none;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:16px 0;color:inherit">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:top">
            <p style="font-size:12px;font-weight:700;color:#123F91;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:.04em">Match #${i + 1} · ${m.donor_name || 'Bailleur'}</p>
            <p style="font-weight:800;font-size:17px;margin:0 0 6px 0;color:#0f172a;line-height:1.35">${m.title}</p>
            <p style="color:#64748b;margin:0;font-size:13px">Deadline : ${deadline}</p>
            <p style="color:#94a3b8;margin:6px 0 0 0;font-size:13px">${m.reason || ''}</p>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px">
            <span style="display:inline-block;background:#123F91;color:#fff;font-weight:800;font-size:15px;padding:8px 14px;border-radius:999px">${score}%</span>
          </td>
        </tr></table>
      </a>`;
  }).join('');
  return {
    subject: `Vos ${matches.length} meilleurs financements du jour`,
    htmlContent: wrap('Votre veille du matin', `
      <p>Bonjour ${orgName || ''},</p>
      <p>Voici les <b>${matches.length} opportunités</b> les mieux alignées avec le profil de votre organisation aujourd'hui, classées par compatibilité IA :</p>
      ${items}
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#123F91;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;margin-top:8px">Voir tous mes matches</a>
    `)
  };
}

export function tplDeadlineReminder({ orgName, opp, days }) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/opportunities/${opp.id}`;
  return {
    subject: `Rappel : ${opp.title} — deadline dans ${days} jours`,
    htmlContent: wrap('Rappel de deadline', `
      <p>Bonjour ${orgName || ''},</p>
      <p>L'opportunité <b>${opp.title}</b> arrive à échéance dans <b>${days} jours</b>.</p>
      <a href="${url}" style="display:inline-block;background:#123F91;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Voir l'opportunité</a>
    `)
  };
}
