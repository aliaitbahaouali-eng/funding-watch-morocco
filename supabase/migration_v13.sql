-- ============================================================
-- Funding Watch Morocco — Migration v13 (cross-source dedup via embeddings)
--
-- Audit §7.3 : la même opp peut être publiée par Tanmia ET sur le site
-- officiel du bailleur → 2 rows avec source_id différents, external_id
-- différents, official_url différents → la dédup actuelle (URL+title)
-- ne les attrape pas. On utilise les embeddings (cosine >= 0.92) pour
-- détecter les doublons sémantiques cross-source.
--
-- Cette migration :
--   1. Ajoute `duplicate_of_id` (FK self vers la canonicale) + index
--   2. Ajoute `seen_on_source_ids` (array des sources où l'opp apparaît)
--   3. Crée find_similar_opportunities() utilisée par le backfill
--   4. Update match_opportunities_for_org() pour filtrer les dups
-- ============================================================

-- 1. Colonnes dedup
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seen_on_source_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS opportunities_duplicate_of_idx
  ON opportunities(duplicate_of_id) WHERE duplicate_of_id IS NOT NULL;

-- 2. SQL function : pour une opp donnée, retourne les candidats les plus
--    proches sémantiquement (autres opps publiées, non-dup, embedding
--    distance cosine <= 1 - threshold). Utilisé par le script de backfill.
CREATE OR REPLACE FUNCTION find_similar_opportunities(
  p_opp_id uuid,
  p_threshold float DEFAULT 0.92,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  source_id uuid,
  similarity numeric,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH src AS (
    SELECT embedding, source_id, published_at
    FROM opportunities WHERE id = p_opp_id
  )
  SELECT
    o.id,
    o.title,
    o.source_id,
    (1 - (o.embedding <=> (SELECT embedding FROM src)))::numeric AS similarity,
    o.published_at
  FROM opportunities o, src
  WHERE o.id <> p_opp_id
    AND o.embedding IS NOT NULL
    AND src.embedding IS NOT NULL
    AND o.duplicate_of_id IS NULL
    AND o.status = 'published'
    AND (1 - (o.embedding <=> src.embedding)) >= p_threshold
  ORDER BY o.embedding <=> src.embedding ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION find_similar_opportunities(uuid, float, int) TO service_role;
GRANT EXECUTE ON FUNCTION find_similar_opportunities(uuid, float, int) TO authenticated;

-- 3. Recréer match_opportunities_for_org pour exclure les duplicates.
--    Copie de v8 + ajout `AND o.duplicate_of_id IS NULL` dans les deux WHERE.
DROP FUNCTION IF EXISTS public.match_opportunities_for_org(uuid, int);

CREATE FUNCTION public.match_opportunities_for_org(
  p_org_id uuid,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  opportunity_id uuid,
  title text,
  donor_name text,
  deadline date,
  morocco_eligible boolean,
  semantic_score numeric,
  taxonomy_score numeric,
  final_score numeric,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
#variable_conflict use_column
DECLARE
  v_embedding vector(1536);
BEGIN
  SELECT embedding INTO v_embedding FROM organizations WHERE id = p_org_id;

  IF v_embedding IS NULL THEN
    RETURN QUERY
    WITH org_sdg AS (SELECT sdg_id FROM org_sdg_goals WHERE org_id = p_org_id),
         org_dac AS (SELECT sector_id FROM org_dac_sectors WHERE org_id = p_org_id),
         opp_match AS (
           SELECT o.id, o.title AS o_title, d.name AS o_donor_name,
                  o.deadline AS o_deadline, o.morocco_eligible AS o_morocco_eligible,
                  (
                    COALESCE((SELECT count(*) FROM opp_sdg_goals s
                              WHERE s.opportunity_id = o.id
                              AND s.sdg_id IN (SELECT sdg_id FROM org_sdg)), 0) * 1.0
                    + COALESCE((SELECT count(*) FROM opp_dac_sectors s
                                WHERE s.opportunity_id = o.id
                                AND s.sector_id IN (SELECT sector_id FROM org_dac)), 0) * 1.0
                  ) AS taxo_count
           FROM opportunities o
           LEFT JOIN donors d ON d.id = o.donor_id
           WHERE o.status = 'published'
             AND (o.deadline IS NULL OR o.deadline >= current_date)
             AND o.ngo_relevant IS TRUE
             AND o.duplicate_of_id IS NULL                       -- v13: exclude dups
             AND COALESCE(o.is_test, false) = false               -- v12: exclude test fixtures
         )
    SELECT opp_match.id, opp_match.o_title, opp_match.o_donor_name,
           opp_match.o_deadline, opp_match.o_morocco_eligible,
           0::numeric, (opp_match.taxo_count / 6.0)::numeric,
           least(100, opp_match.taxo_count * 15)::numeric,
           'Matching basé sur les thématiques (profil sans embedding)'::text
    FROM opp_match
    ORDER BY opp_match.taxo_count DESC, opp_match.o_deadline ASC NULLS LAST
    LIMIT p_limit;
    RETURN;
  END IF;

  RETURN QUERY
  WITH org_sdg AS (SELECT sdg_id FROM org_sdg_goals WHERE org_id = p_org_id),
       org_dac AS (SELECT sector_id FROM org_dac_sectors WHERE org_id = p_org_id),
       org_geo AS (SELECT geography_slug FROM org_action_geographies WHERE org_id = p_org_id),
       cand AS (
         SELECT o.id, o.title AS o_title, d.name AS o_donor_name,
                o.deadline AS o_deadline, o.morocco_eligible AS o_morocco_eligible,
                o.embedding,
                CASE WHEN o.embedding IS NULL THEN 0
                     ELSE 1 - (o.embedding <=> v_embedding) END AS sem,
                COALESCE((
                  SELECT count(*)::numeric / NULLIF((SELECT count(*) FROM org_sdg)::numeric, 0)
                  FROM opp_sdg_goals s
                  WHERE s.opportunity_id = o.id AND s.sdg_id IN (SELECT sdg_id FROM org_sdg)
                ), 0) AS sdg_overlap,
                COALESCE((
                  SELECT count(*)::numeric / NULLIF((SELECT count(*) FROM org_dac)::numeric, 0)
                  FROM opp_dac_sectors s
                  WHERE s.opportunity_id = o.id AND s.sector_id IN (SELECT sector_id FROM org_dac)
                ), 0) AS dac_overlap,
                CASE
                  WHEN o.morocco_eligible AND EXISTS (
                    SELECT 1 FROM org_geo og
                    WHERE og.geography_slug LIKE 'ma-%' OR og.geography_slug = 'morocco'
                  ) THEN 1.0
                  WHEN o.morocco_eligible THEN 0.6
                  ELSE 0.2
                END AS geo,
                CASE
                  WHEN o.deadline IS NULL THEN 0.5
                  WHEN o.deadline - current_date BETWEEN 14 AND 60 THEN 1.0
                  WHEN o.deadline - current_date BETWEEN 7 AND 13 THEN 0.8
                  WHEN o.deadline - current_date BETWEEN 61 AND 120 THEN 0.7
                  WHEN o.deadline - current_date < 7 THEN 0.4
                  ELSE 0.5
                END AS dl
         FROM opportunities o
         LEFT JOIN donors d ON d.id = o.donor_id
         WHERE o.status = 'published'
           AND (o.deadline IS NULL OR o.deadline >= current_date)
           AND o.ngo_relevant IS TRUE
           AND o.duplicate_of_id IS NULL                         -- v13: exclude dups
           AND COALESCE(o.is_test, false) = false                 -- v12: exclude test fixtures
       )
  SELECT
    cand.id, cand.o_title, cand.o_donor_name, cand.o_deadline, cand.o_morocco_eligible,
    round(cand.sem::numeric, 4),
    round(((cand.sdg_overlap + cand.dac_overlap) / 2)::numeric, 4),
    round((cand.sem * 40 + ((cand.sdg_overlap + cand.dac_overlap) / 2) * 30 + cand.geo * 15 + cand.dl * 10)::numeric, 1),
    CASE
      WHEN cand.sem > 0.85 THEN 'Excellente correspondance sémantique avec ton profil'
      WHEN cand.sdg_overlap + cand.dac_overlap > 0.6 THEN 'Forte correspondance thématique'
      WHEN cand.geo >= 0.6 AND cand.dl >= 0.8 THEN 'Bien aligné géographiquement, deadline favorable'
      ELSE 'Correspondance partielle — à étudier'
    END
  FROM cand
  ORDER BY cand.sem * 40 + ((cand.sdg_overlap + cand.dac_overlap) / 2) * 30 + cand.geo * 15 + cand.dl * 10 DESC,
           cand.o_deadline ASC NULLS LAST
  LIMIT p_limit;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO service_role;

NOTIFY pgrst, 'reload schema';
