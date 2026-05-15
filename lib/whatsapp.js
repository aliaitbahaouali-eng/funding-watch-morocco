/**
 * WhatsApp Business — Meta Cloud API wrapper.
 *
 * Env required to send real messages:
 *   META_WHATSAPP_TOKEN     — Meta Cloud API permanent token
 *   META_WHATSAPP_PHONE_ID  — sender phone number ID (numeric)
 *
 * Without these, sendWhatsapp() returns {ok:true, simulated:true} and
 * logs the would-be message. App code reacts identically; only the
 * actual delivery is skipped.
 */

const API_BASE = 'https://graph.facebook.com/v20.0';

function isConfigured() {
  return !!(process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID);
}

/**
 * Send a WhatsApp Business message.
 *
 * Meta requires "template" messages for unsolicited outreach (outside a
 * 24h session). Free-form text only works if the recipient messaged us
 * in the last 24h. For Funding Watch alerts (proactive push), templates
 * are the right primitive.
 *
 * @param {string} to             - recipient phone in E.164 (e.g. "212600000000")
 * @param {string} templateName   - approved template name in Meta Business Manager
 * @param {string} languageCode   - e.g. "fr"
 * @param {Array<string>} params  - body parameters (positional)
 * @returns {Promise<{ok:boolean, simulated?:boolean, providerMessageId?:string, error?:string}>}
 */
export async function sendWhatsappTemplate({ to, templateName, languageCode = 'fr', params = [] }) {
  if (!to) return { ok: false, error: 'no_recipient' };

  if (!isConfigured()) {
    console.warn('[whatsapp] not configured — message simulated:', { to, templateName, params });
    return { ok: true, simulated: true };
  }

  // Strip leading '+' and spaces — Meta expects digits only.
  const cleanedTo = String(to).replace(/[^0-9]/g, '');

  const body = {
    messaging_product: 'whatsapp',
    to: cleanedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: params.length
        ? [{
            type: 'body',
            parameters: params.map((p) => ({ type: 'text', text: String(p) })),
          }]
        : [],
    },
  };

  try {
    const res = await fetch(`${API_BASE}/${process.env.META_WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, providerMessageId: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * Validate that a phone number looks like a Moroccan or international
 * E.164-ish number. Used by the preferences form. Accepts spaces and a
 * leading '+'.
 */
export function isValidPhone(input) {
  if (!input) return false;
  const digits = String(input).replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export function normalizePhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/[^0-9]/g, '');
  // Common Moroccan correction: 06xxxxxxxx -> 2126xxxxxxxx
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = '212' + digits.slice(1);
  }
  return digits;
}
