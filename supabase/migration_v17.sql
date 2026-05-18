-- ============================================================
-- Funding Watch Morocco — Migration v17 (Sprint 2B.3 : tracking emails)
--
-- Table `email_events` qui reçoit les webhooks Brevo (sent / opened /
-- click / hard_bounce / spam / unsubscribe / blocked / deferred / etc.).
-- Liée à `email_logs.provider_id` via `message_id` pour calculer les
-- taux d'ouverture et de clic par template / par jour.
--
-- L'unicité sur `brevo_event_id` rend l'insert idempotent : Brevo peut
-- retransmettre un événement, on l'ignore silencieusement.
--
-- À exécuter dans Supabase SQL Editor. Idempotent (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brevo_event_id text UNIQUE,                -- "id" envoyé par Brevo (unique par event)
  message_id text NOT NULL,                  -- "messageId" Brevo → match email_logs.provider_id
  recipient_email text NOT NULL,
  event text NOT NULL CHECK (event IN (
    'sent', 'delivered', 'opened', 'click',
    'hard_bounce', 'soft_bounce', 'deferred', 'blocked',
    'spam', 'unsubscribed', 'invalid_email', 'error',
    'opened_proxy'
  )),
  link text,                                  -- pour les click events
  user_agent text,
  ip text,
  brevo_raw jsonb,                            -- payload complet pour debug
  occurred_at timestamptz NOT NULL,           -- ts venant de Brevo
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_message_idx ON email_events(message_id);
CREATE INDEX IF NOT EXISTS email_events_event_idx   ON email_events(event);
CREATE INDEX IF NOT EXISTS email_events_recv_idx    ON email_events(received_at DESC);
CREATE INDEX IF NOT EXISTS email_events_email_idx   ON email_events(recipient_email);

-- RLS : table interne, accès via service role uniquement (webhook +
-- /admin/emails côté serveur). Pas de policy publique → deny par défaut.
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
