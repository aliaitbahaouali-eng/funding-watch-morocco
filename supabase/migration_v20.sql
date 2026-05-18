-- ============================================================
-- Funding Watch Morocco — Migration v20 (Sprint 4E : donor intelligence prédictive)
--
-- Embed chaque bailleur (profil + ses opps publiées) pour permettre de
-- recommander à une orga les "5 bailleurs qui ressemblent à ceux qui te
-- financent déjà". Cosine pgvector sur l'embedding orga vs profils
-- donneurs.
--
-- Idempotent.
-- ============================================================

-- 1. Colonnes embedding sur donors
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS profile_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS profile_embedding_model text,
  ADD COLUMN IF NOT EXISTS profile_embedding_updated_at timestamptz;

-- Index ANN pour les recherches cosine rapides à terme (>50 donneurs)
CREATE INDEX IF NOT EXISTS donors_profile_embedding_idx
  ON donors USING ivfflat (profile_embedding vector_cosine_ops) WITH (lists = 20);

-- 2. SQL function : pour une orga, top N bailleurs similaires sémantiquement.
--    NB : ne filtre PAS les bailleurs déjà financiers (fait côté JS via
--    organizations.funding_history) — trop fuzzy pour SQL.
CREATE OR REPLACE FUNCTION find_similar_donors_for_org(
  p_org_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  donor_id uuid,
  name text,
  type text,
  country text,
  description text,
  website text,
  similarity numeric,
  opp_count bigint,
  active_opp_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_org_embedding vector(1536);
BEGIN
  SELECT embedding INTO v_org_embedding FROM organizations WHERE id = p_org_id;
  IF v_org_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.type,
    d.country,
    d.description,
    d.website,
    (1 - (d.profile_embedding <=> v_org_embedding))::numeric AS similarity,
    (SELECT count(*) FROM opportunities o WHERE o.donor_id = d.id) AS opp_count,
    (SELECT count(*) FROM opportunities o
       WHERE o.donor_id = d.id
         AND o.status = 'published'
         AND (o.deadline IS NULL OR o.deadline >= current_date)
         AND COALESCE(o.is_test, false) = false
         AND o.duplicate_of_id IS NULL
    ) AS active_opp_count
  FROM donors d
  WHERE d.profile_embedding IS NOT NULL
  ORDER BY d.profile_embedding <=> v_org_embedding ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION find_similar_donors_for_org(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_donors_for_org(uuid, int) TO service_role;

NOTIFY pgrst, 'reload schema';
