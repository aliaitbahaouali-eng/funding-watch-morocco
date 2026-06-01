-- ============================================================================
-- Migration v25 — Curation manuelle assistee IA (Sprint 6 / Option A)
-- ============================================================================
-- Date : 2026-06-01
--
-- Ajoute le support de curation manuelle : un admin colle une URL d'opp
-- trouvee dans LinkedIn / Devex / newsletter, Claude extrait les champs,
-- l'opp arrive en draft. Validation 1-clic via /admin/validation existant.
-- ============================================================================

BEGIN;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS curated_manually boolean NOT NULL DEFAULT false;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS curator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS curation_notes text;

CREATE INDEX IF NOT EXISTS opportunities_curated_idx
  ON opportunities(curated_manually, status)
  WHERE curated_manually = true;

-- Logs de curation (1 ligne par tentative, succes ou echec)
CREATE TABLE IF NOT EXISTS curation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'duplicate', 'fetch_error', 'extract_error', 'rejected')),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  error_message text,
  llm_tokens_in int,
  llm_tokens_out int,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS curation_logs_user_idx ON curation_logs(curator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS curation_logs_url_idx ON curation_logs(source_url);

ALTER TABLE curation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS curation_logs_admin_select ON curation_logs;
CREATE POLICY curation_logs_admin_select ON curation_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS curation_logs_admin_insert ON curation_logs;
CREATE POLICY curation_logs_admin_insert ON curation_logs
  FOR INSERT WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON curation_logs TO authenticated;

COMMENT ON COLUMN opportunities.curated_manually IS
'true = opp ajoutee via /admin/curation. false = scrappee automatiquement.';

COMMENT ON TABLE curation_logs IS
'Audit log curation manuelle. Stats : taux succes, opps/jour, doublons.';

COMMIT;
