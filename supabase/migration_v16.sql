-- ============================================================
-- Funding Watch Morocco — Migration v16 (Phase 1 Finish)
--
-- Bundle 2 features Cowork :
--   1. email_events            : tracking opens/clicks/bounces Brevo (Sprint 2B.3)
--   2. admin_audit_log         : journal des actions /admin/validation (approve/reject/bulk)
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1) email_events — tracking webhooks Brevo
-- ════════════════════════════════════════════════════════════
-- Brevo envoie un webhook par event (delivered, opened, clicked, bounced,
-- complained, deferred). On stocke chaque event pour :
--   - calculer open_rate / click_rate par template sur /admin/monitoring
--   - identifier les bounces hard pour purger les emails morts
--   - corréler email_logs <-> events (provider_id == messageId Brevo)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid REFERENCES email_logs(id) ON DELETE CASCADE,
  provider_message_id text,
  event_type text NOT NULL CHECK (event_type IN (
    'delivered','opened','clicked','bounced','complained','deferred','unsubscribed','blocked'
  )),
  recipient_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  event_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_log_idx ON email_events(email_log_id);
CREATE INDEX IF NOT EXISTS email_events_provider_idx ON email_events(provider_message_id);
CREATE INDEX IF NOT EXISTS email_events_type_at_idx ON email_events(event_type, event_at DESC);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
-- Webhooks insèrent via service_role (bypass RLS). Pas de policy SELECT.

-- ════════════════════════════════════════════════════════════
-- 2) admin_audit_log — journal /admin/validation
-- ════════════════════════════════════════════════════════════
-- Trace qui a fait quoi sur quelle opportunité (approve / reject /
-- bulk_approve / bulk_reject). Pour audit RGPD + retour arrière.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL CHECK (action IN (
    'approve','reject','bulk_approve','bulk_reject','edit','delete','restore'
  )),
  target_type text NOT NULL DEFAULT 'opportunity',
  target_id uuid,
  target_ids uuid[],
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON admin_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON admin_audit_log(target_id) WHERE target_id IS NOT NULL;

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy : seuls les admins peuvent lire le log.
-- (profiles.role = 'admin' est le pattern existant — adapter si différent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_audit_select' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY admin_audit_select ON admin_audit_log
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 3) View KPI tracking — pour /admin/monitoring (rates calculés)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_email_kpi_daily AS
SELECT
  date_trunc('day', l.sent_at)::date AS day,
  l.template,
  count(DISTINCT l.id) AS sent,
  count(DISTINCT e.id) FILTER (WHERE e.event_type = 'delivered') AS delivered,
  count(DISTINCT e.id) FILTER (WHERE e.event_type = 'opened') AS opened,
  count(DISTINCT e.id) FILTER (WHERE e.event_type = 'clicked') AS clicked,
  count(DISTINCT e.id) FILTER (WHERE e.event_type = 'bounced') AS bounced,
  ROUND(
    100.0 * count(DISTINCT e.id) FILTER (WHERE e.event_type = 'opened')
      / NULLIF(count(DISTINCT l.id), 0), 1
  ) AS open_rate_pct,
  ROUND(
    100.0 * count(DISTINCT e.id) FILTER (WHERE e.event_type = 'clicked')
      / NULLIF(count(DISTINCT e.id) FILTER (WHERE e.event_type = 'opened'), 0), 1
  ) AS click_through_rate_pct
FROM email_logs l
LEFT JOIN email_events e ON e.email_log_id = l.id
WHERE l.status = 'sent'
  AND l.sent_at IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC;

GRANT SELECT ON v_email_kpi_daily TO authenticated;
GRANT SELECT ON v_email_kpi_daily TO service_role;

NOTIFY pgrst, 'reload schema';
