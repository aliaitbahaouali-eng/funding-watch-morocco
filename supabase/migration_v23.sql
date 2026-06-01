-- ============================================================================
-- Migration v23 — Strict Morocco NGO targeting (BREAKING CHANGE)
-- ============================================================================
-- Date : 2026-05-26
-- Auteur : Sprint 5A
--
-- Objectif : Résoudre une fois pour toutes le problème d'opportunités non
-- spécifiques aux ONG marocaines qui polluent les listings.
--
-- Avant : morocco_eligible boolean — trop laxiste, marquait true dès qu'on
-- voyait "africa" ou "global" ou "developing countries".
--
-- Après : morocco_eligibility text à 5 niveaux :
--   - 'explicit'    : mention Morocco/Maroc/MENA/Maghreb explicite     ⭐ AFFICHÉ
--   - 'regional'    : Afrique du Nord, monde arabe (sans Maroc direct) ⭐ AFFICHÉ
--   - 'global'      : appel mondial/africain non spécifique            ⚠️ MASQUÉ
--   - 'excluded'    : explicitement réservé à d'autres pays            ❌ ARCHIVÉ
--   - 'unknown'     : non encore classé                                ⚠️ MASQUÉ
--
-- Le frontend ne montrera plus que 'explicit' + 'regional' par défaut.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Nouvelle colonne morocco_eligibility (5 niveaux)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS morocco_eligibility text
    CHECK (morocco_eligibility IN ('explicit', 'regional', 'global', 'excluded', 'unknown'))
    DEFAULT 'unknown';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill depuis morocco_eligible bool + countries_eligible array
-- ─────────────────────────────────────────────────────────────────────────────
-- Si la liste countries_eligible contient MA, MENA, MAGHREB → 'explicit'
UPDATE opportunities
SET morocco_eligibility = 'explicit'
WHERE morocco_eligibility = 'unknown'
  AND (
    countries_eligible && ARRAY['MA', 'MENA', 'MAGHREB']::text[]
    OR LOWER(COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(description, ''))
       ~* '\m(morocco|maroc|marocain|moroccan|royaume.{0,5}maroc|mena\M|maghreb|north africa|afrique du nord)\M'
  );

-- Si countries contient MED, AFRICA, ou texte = Afrique sans Maroc → 'regional'
UPDATE opportunities
SET morocco_eligibility = 'regional'
WHERE morocco_eligibility = 'unknown'
  AND (
    countries_eligible && ARRAY['MED', 'AFRICA', 'MEDITERRANEAN']::text[]
    OR LOWER(COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(description, ''))
       ~* '\m(arab world|monde arabe|africa\M|afrique\M|sub.?saharan|francophone|méditerranée|mediterranean)\M'
  );

-- Si countries_eligible contient WORLDWIDE ou texte = global sans Maroc → 'global'
UPDATE opportunities
SET morocco_eligibility = 'global'
WHERE morocco_eligibility = 'unknown'
  AND (
    countries_eligible && ARRAY['WORLDWIDE', 'GLOBAL']::text[]
    OR LOWER(COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(description, ''))
       ~* '\m(worldwide|global|international|all countries|tous pays|ouvert à tous|developing countries|pays en développement|low.{0,5}income)\M'
  );

-- Si texte mentionne explicitement "only for [non-MA country]" → 'excluded'
UPDATE opportunities
SET morocco_eligibility = 'excluded'
WHERE morocco_eligibility IN ('unknown', 'global')
  AND LOWER(COALESCE(title, '') || ' ' || COALESCE(eligibility, '') || ' ' || COALESCE(description, ''))
      ~* '\m(only|exclusively|reserved|réservé|uniquement).{1,40}(eu citizens|us citizens|french citizens|german|spanish|residents of|nationals of)\M'
  AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''))
      !~* '\m(morocco|maroc|mena|maghreb)\M';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2bis. Flag sur les sources : requires_morocco_keyword
--       (rejette à l'ingestion les opps sans mention explicite Morocco/MENA)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS requires_morocco_keyword boolean NOT NULL DEFAULT false;

-- Marque automatiquement toutes les sources non-Maroc comme strictes
UPDATE sources
SET requires_morocco_keyword = true
WHERE country <> 'MA'
  AND country <> 'MAGHREB'
  AND country IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Index pour perf des filtres front
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS opportunities_morocco_elig_idx
  ON opportunities(morocco_eligibility)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS opportunities_strict_listing_idx
  ON opportunities(status, morocco_eligibility, ngo_relevant, deadline)
  WHERE status = 'published';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto-archivage des opps clairement hors-cible
--    (excluded + global ET ngo_relevant=false)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE opportunities
SET status = 'archived',
    updated_at = NOW()
WHERE status = 'published'
  AND (
    morocco_eligibility = 'excluded'
    OR (morocco_eligibility = 'global' AND ngo_relevant = false)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Mise à jour de match_opportunities_for_org
--    pour ne matcher QUE explicit + regional, et coopératives spécifiques
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.match_opportunities_for_org(uuid, int);

CREATE FUNCTION public.match_opportunities_for_org(
  p_org_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  opportunity_id uuid,
  title text,
  donor_name text,
  deadline date,
  morocco_eligibility text,
  total_score numeric,
  theme_score numeric,
  geo_score numeric,
  population_score numeric,
  budget_score numeric,
  embedding_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_themes uuid[];
  v_org_type text;
BEGIN
  -- Récupérer le type d'orga et ses thématiques
  SELECT org_type INTO v_org_type FROM organizations WHERE id = p_org_id;

  SELECT ARRAY_AGG(theme_id) INTO v_org_themes
  FROM organization_themes WHERE organization_id = p_org_id;

  RETURN QUERY
  WITH base AS (
    SELECT
      o.id,
      o.title,
      COALESCE(d.name, 'Donateur') AS donor_name,
      o.deadline,
      o.morocco_eligibility,
      -- Score thématique (jaccard simple)
      CASE
        WHEN v_org_themes IS NULL OR cardinality(v_org_themes) = 0 THEN 0.5
        ELSE COALESCE((
          SELECT COUNT(*)::numeric / cardinality(v_org_themes)
          FROM opportunity_themes ot
          WHERE ot.opportunity_id = o.id AND ot.theme_id = ANY(v_org_themes)
        ), 0)
      END AS theme_score,
      -- Score géo (priorité explicite > régional)
      CASE
        WHEN o.morocco_eligibility = 'explicit' THEN 1.0
        WHEN o.morocco_eligibility = 'regional' THEN 0.7
        WHEN o.morocco_eligibility = 'global' THEN 0.3
        ELSE 0.0
      END AS geo_score,
      -- Score population (placeholder)
      0.5::numeric AS pop_score,
      -- Score budget (placeholder)
      0.5::numeric AS budget_score,
      -- Score embedding (placeholder, calcul réel via semantic_search)
      0.5::numeric AS emb_score
    FROM opportunities o
    LEFT JOIN donors d ON d.id = o.donor_id
    WHERE o.status = 'published'
      AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
      AND COALESCE(o.is_test, false) = false
      AND o.duplicate_of_id IS NULL
      -- ⭐ FILTRE STRICT : que les opps Maroc explicite ou régional
      AND o.morocco_eligibility IN ('explicit', 'regional')
      -- ⭐ FILTRE STRICT : que les opps réellement pour ONG
      AND COALESCE(o.ngo_relevant, false) = true
      -- ⭐ FILTRE TYPE D'ORG : si target_org_types défini, doit inclure le type de l'orga
      AND (
        o.target_org_types IS NULL
        OR cardinality(o.target_org_types) = 0
        OR v_org_type IS NULL
        OR v_org_type = ANY(o.target_org_types)
      )
  )
  SELECT
    b.id,
    b.title,
    b.donor_name,
    b.deadline,
    b.morocco_eligibility,
    (b.theme_score * 0.30 + b.geo_score * 0.30 + b.pop_score * 0.15
     + b.budget_score * 0.10 + b.emb_score * 0.15)::numeric AS total_score,
    b.theme_score,
    b.geo_score,
    b.pop_score,
    b.budget_score,
    b.emb_score
  FROM base b
  ORDER BY total_score DESC, b.deadline ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION public.match_opportunities_for_org(uuid, int) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Vue de monitoring : ratio Maroc/global par source
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_morocco_targeting_stats AS
SELECT
  s.name AS source_name,
  s.category,
  COUNT(o.id) AS total_opps,
  COUNT(*) FILTER (WHERE o.morocco_eligibility = 'explicit') AS explicit_count,
  COUNT(*) FILTER (WHERE o.morocco_eligibility = 'regional') AS regional_count,
  COUNT(*) FILTER (WHERE o.morocco_eligibility = 'global') AS global_count,
  COUNT(*) FILTER (WHERE o.morocco_eligibility = 'excluded') AS excluded_count,
  COUNT(*) FILTER (WHERE o.morocco_eligibility = 'unknown') AS unknown_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE o.morocco_eligibility IN ('explicit', 'regional'))
    / NULLIF(COUNT(o.id), 0),
    1
  ) AS morocco_targeting_pct
FROM sources s
LEFT JOIN opportunities o ON o.source_id = s.id
GROUP BY s.id, s.name, s.category
ORDER BY total_opps DESC NULLS LAST;

GRANT SELECT ON public.v_morocco_targeting_stats TO authenticated;
GRANT SELECT ON public.v_morocco_targeting_stats TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Commentaires pour la doc auto
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN opportunities.morocco_eligibility IS
'5 niveaux d''éligibilité Maroc : explicit (Maroc/MENA mentionné), regional (Afrique/monde arabe), global (mondial), excluded (réservé autre pays), unknown (non classé). Seuls explicit+regional sont affichés par défaut.';

COMMENT ON VIEW public.v_morocco_targeting_stats IS
'Stats de ciblage Maroc par source. Utiliser pour identifier les sources qui produisent trop de bruit (morocco_targeting_pct < 20%).';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION post-migration (à exécuter manuellement)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT morocco_eligibility, COUNT(*) FROM opportunities
--   WHERE status='published' GROUP BY morocco_eligibility ORDER BY COUNT(*) DESC;
--
-- SELECT * FROM v_morocco_targeting_stats;
