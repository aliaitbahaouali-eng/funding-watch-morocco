import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>
 *
 * Endpoint qui reçoit les événements Brevo (sent / opened / click / etc.)
 * et les enregistre dans la table `email_events`. Auth via secret en
 * query param (le seul mécanisme que Brevo expose via leur UI sans setup
 * additionnel) — le secret doit être long et opaque.
 *
 * Brevo peut envoyer 1 event en JSON ou un BATCH d'events en tableau JSON.
 * On gère les deux. L'insert est idempotent grâce à brevo_event_id UNIQUE.
 *
 * Setup côté Brevo :
 *   1. Dashboard Brevo → Settings → Transactional → Webhooks
 *   2. URL = https://funding-watch-morocco.vercel.app/api/webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>
 *   3. Cocher tous les events : sent, delivered, opened, click, hard_bounce,
 *      soft_bounce, spam, unsubscribed, deferred, blocked, invalid_email
 *
 * Test manuel rapide :
 *   curl -X POST "https://.../api/webhooks/brevo?secret=XXX" \
 *     -H 'Content-Type: application/json' \
 *     -d '{"event":"opened","email":"test@x.com","messageId":"<abc@x.com>","id":1,"ts":1716000000,"date":"2026-05-18 10:00:00"}'
 */

const VALID_EVENTS = new Set([
  'sent', 'delivered', 'opened', 'click',
  'hard_bounce', 'soft_bounce', 'deferred', 'blocked',
  'spam', 'unsubscribed', 'invalid_email', 'error',
  'opened_proxy',
]);

// Brevo envoie parfois "request" comme alias de "sent" — on normalise.
const EVENT_ALIASES = {
  'request': 'sent',
  'unsubscribe': 'unsubscribed',
  'complaint': 'spam',
};

function isAuthorized(request) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) return false;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === expected;
}

function normalizeOne(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rawEvent = String(raw.event || '').toLowerCase();
  const event = EVENT_ALIASES[rawEvent] || rawEvent;
  if (!VALID_EVENTS.has(event)) return null;

  const messageId = raw['message-id'] || raw.messageId || raw['Message-ID'] || '';
  const email = raw.email || '';
  if (!messageId || !email) return null;

  const ts = raw.ts || raw.ts_event;
  let occurredAt = null;
  if (ts) occurredAt = new Date(Number(ts) * 1000).toISOString();
  else if (raw.date) occurredAt = new Date(raw.date).toISOString();
  else occurredAt = new Date().toISOString();

  return {
    brevo_event_id: raw.id ? String(raw.id) : null,
    message_id: String(messageId),
    recipient_email: String(email).toLowerCase().slice(0, 320),
    event,
    link: raw.link || raw.url || null,
    user_agent: raw['user-agent'] || raw.userAgent || null,
    ip: raw.ip || null,
    brevo_raw: raw,
    occurred_at: occurredAt,
  };
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];
  const normalized = items.map(normalizeOne).filter(Boolean);

  if (normalized.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, skipped: items.length, note: 'no valid events' });
  }

  const supabase = createAdminClient();

  // Upsert sur brevo_event_id pour idempotence (Brevo peut retransmettre)
  const { data, error } = await supabase
    .from('email_events')
    .upsert(normalized, { onConflict: 'brevo_event_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[brevo-webhook] insert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    received: items.length,
    inserted: (data || []).length,
    skipped: items.length - normalized.length,
  });
}

// GET pour test rapide d'accessibilité (Brevo n'utilise pas GET)
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    endpoint: 'brevo-webhook',
    note: 'POST events here. GET is only for health-check.',
    configured: !!process.env.BREVO_WEBHOOK_SECRET,
  });
}
