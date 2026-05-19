-- ============================================================
-- Funding Watch Morocco — Migration v21 (Sprint 4F : recommandation collaborative)
--
-- "Des associations similaires à la tienne ont aussi sauvegardé / postulé sur :"
--
-- Mécanique :
--   1. Trouve top-N orgs sémantiquement proches de p_org_id (cosine sur
--      organizations.embedding, déjà présent depuis v4 + backfill).
--   2. Récupère leurs `saved_opportunities` actives (status ∈ saved /
--      analyzing / preparing / submitted / won).
--   3. Agrège par opportunité : compte distincts d'orgs pairs + similarité
--      moyenne + statuts représentatifs.
--   4. Exclut les opps déjà dans le vault de p_org_id.
--   5. Exclut deadlines passées, opps de test, doublons cross-source.
--   6. Filtre similarité ≥ p_min_similarity (0.55 par défaut — au-delà
--      ça remonte des opps sans signal réel).
--
-- Anonymat : on ne retourne JAMAIS les noms des orgs pairs, juste un
-- compteur. C'est le RGPD-friendly équivalent du "10 personnes regardent
-- ce produit" e-commerce.
--
-- Idempotent (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION find_collaborative_recommendations_for_org(
  p_org_id uuid,
  p_limit int DEFAULT 5,
  p_peer_pool int DEFAULT 30,
  p_min_similarity numeric DEFAULT 0.55
)
RETURNS TABLE (
  opportunity_id uuid,
  title text,
  summary text,
  deadline date,
  donor_id uuid,
  donor_name text,
  amount_min numeric,
  amount_max numeric,
  currency text,
  language text,
  peer_count bigint,
  avg_peer_similarity numeric,
  max_peer_similarity numeric,
  peer_statuses text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
#variable_conflict use_column
DECLARE
  v_org_embedding vector(1536);
BEGIN
  SELECT embedding INTO v_org_embedding
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH peers AS (
    -- Top N orgs proches (exclut self)
    SELECT
      o.id AS peer_org_id,
      (1 - (o.embedding <=> v_org_embedding))::numeric AS similarity
    FROM organizations o
    WHERE o.id <> p_org_id
      AND o.embedding IS NOT NULL
      AND COALESCE(o.onboarding_completed, false) = true
    ORDER BY o.embedding <=> v_org_embedding ASC
    LIMIT p_peer_pool
  ),
  peers_filtered AS (
    SELECT * FROM peers WHERE similarity >= p_min_similarity
  ),
  peer_saves AS (
    -- Saved opps des pairs (sauf les opps déjà dans le vault de p_org_id)
    SELECT
      so.opportunity_id,
      so.status,
      p.peer_org_id,
      p.similarity
    FROM saved_opportunities so
    JOIN peers_filtered p ON p.peer_org_id = so.organization_id
    WHERE so.status IN ('saved', 'analyzing', 'preparing', 'submitted', 'won')
      AND NOT EXISTS (
        SELECT 1 FROM saved_opportunities mine
        WHERE mine.organization_id = p_org_id
          AND mine.opportunity_id = so.opportunity_id
      )
  ),
  agg AS (
    SELECT
      ps.opportunity_id,
      COUNT(DISTINCT ps.peer_org_id)::bigint AS peer_count,
      AVG(ps.similarity)::numeric AS avg_peer_similarity,
      MAX(ps.similarity)::numeric AS max_peer_similarity,
      ARRAY_AGG(DISTINCT ps.status) AS peer_statuses
    FROM peer_saves ps
    GROUP BY ps.opportunity_id
  )
  SELECT
    op.id AS opportunity_id,
    op.title,
    op.summary,
    op.deadline,
    op.donor_id,
    d.name AS donor_name,
    op.amount_min,
    op.amount_max,
    op.currency,
    op.language,
    a.peer_count,
    a.avg_peer_similarity,
    a.max_peer_similarity,
    a.peer_statuses
  FROM agg a
  JOIN opportunities op ON op.id = a.opportunity_id
  LEFT JOIN donors d ON d.id = op.donor_id
  WHERE op.status = 'published'
    AND (op.deadline IS NULL OR op.deadline >= current_date)
    AND COALESCE(op.is_test, false) = false
    AND op.duplicate_of_id IS NULL
  ORDER BY
    a.peer_count DESC,
    a.avg_peer_similarity DESC,
    op.deadline ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION find_collaborative_recommendations_for_org(uuid, int, int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION find_collaborative_recommendations_for_org(uuid, int, int, numeric) TO service_role;

NOTIFY pgrst, 'reload schema';
