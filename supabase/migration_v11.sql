-- ============================================================
-- Funding Watch Morocco — Migration v11 (token optimization)
--
-- Table de cache des réponses IA pour éviter de re-générer des résultats
-- identiques (AI co-writer, document intelligence, …). Clé composite :
-- (kind, organization_id, opportunity_id, prompt_version).
--
-- TTL via expires_at (par défaut 30 jours). Un bouton "Régénérer" dans
-- l'UI bypass le cache et force un nouvel appel + remplace la ligne.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  prompt_version text NOT NULL,
  response jsonb NOT NULL,
  tokens_used int,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS ai_response_cache_lookup_idx
  ON ai_response_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS ai_response_cache_org_idx
  ON ai_response_cache(organization_id);

-- RLS : on n'expose pas la table aux utilisateurs (lectures via service role
-- depuis les routes /api/ai/*). Donc deny par défaut + pas de policy.
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
