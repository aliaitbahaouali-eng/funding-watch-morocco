-- ============================================================
-- Funding Watch Morocco — Migration v18 (Sprint 4A.3 : api_usage_logs)
--
-- Table de tracking par-appel des coûts API. Remplace les estimations
-- dans /admin/monitoring par du calcul réel.
--
-- Convention :
--   provider : 'anthropic' | 'openai' | 'brevo' | 'meta'
--   kind     : 'cowriter' | 'taxonomy' | 'ngo_filter' | 'doc_intel'
--              'embed_org' | 'embed_opp' | 'digest_send' | 'wa_send' | ...
--   cost_usd : calculé à l'insertion côté JS depuis le pricing connu
-- ============================================================

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text,
  kind text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  input_tokens int,
  output_tokens int,
  cache_creation_tokens int,
  cache_read_tokens int,
  cost_usd numeric(10, 6),
  duration_ms int,
  status text CHECK (status IN ('ok','error','simulated')) DEFAULT 'ok',
  error_message text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_logs_provider_idx ON api_usage_logs(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_logs_org_idx      ON api_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS api_usage_logs_created_idx  ON api_usage_logs(created_at DESC);

-- RLS : table interne, service role only.
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
