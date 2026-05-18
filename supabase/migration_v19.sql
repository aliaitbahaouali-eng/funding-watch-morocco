-- ============================================================
-- Funding Watch Morocco — Migration v19 (Sprint 4B : recherche sémantique)
--
-- Fonction SQL qui prend un vecteur d'embedding (la requête utilisateur
-- embeddée côté Next.js via text-embedding-3-small) et retourne les
-- opportunités triées par similarité cosinus. Remplace le .ilike actuel
-- sur title/summary/description qui ne capte rien en arabe ni les
-- reformulations en français/anglais.
--
-- Filtres standards : published only, pas test, pas duplicate,
-- deadline future ou nulle, NGO-relevant ou non classé.
--
-- Idempotent (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION semantic_search_opportunities(
  p_query_embedding vector(1536),
  p_limit int DEFAULT 30,
  p_morocco_only boolean DEFAULT false
)
RETURNS TABLE (
  opportunity_id uuid,
  title text,
  donor_name text,
  donor_id uuid,
  summary text,
  deadline date,
  morocco_eligible boolean,
  language text,
  amount_min numeric,
  amount_max numeric,
  currency text,
  similarity numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    o.id,
    o.title,
    d.name AS donor_name,
    o.donor_id,
    o.summary,
    o.deadline,
    o.morocco_eligible,
    o.language,
    o.amount_min,
    o.amount_max,
    o.currency,
    (1 - (o.embedding <=> p_query_embedding))::numeric AS similarity
  FROM opportunities o
  LEFT JOIN donors d ON d.id = o.donor_id
  WHERE o.status = 'published'
    AND o.embedding IS NOT NULL
    AND o.duplicate_of_id IS NULL
    AND COALESCE(o.is_test, false) = false
    AND (o.deadline IS NULL OR o.deadline >= current_date)
    AND (o.ngo_relevant IS TRUE OR o.ngo_relevant IS NULL)
    AND (NOT p_morocco_only OR o.morocco_eligible = true)
  ORDER BY o.embedding <=> p_query_embedding ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION semantic_search_opportunities(vector, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION semantic_search_opportunities(vector, int, boolean) TO anon;
GRANT EXECUTE ON FUNCTION semantic_search_opportunities(vector, int, boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
