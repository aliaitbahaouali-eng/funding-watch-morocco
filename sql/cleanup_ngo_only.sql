-- ============================================================
-- Funding Watch — Cleanup : ne garder QUE les appels d'offres pour ONG
-- ============================================================
-- Supprime tout ce qui n'est pas un appel à projets pour une association :
--   - vacancies, jobs, scholarships, internships, fellowships
--   - tenders commerciaux (fourniture, marché)
--   - opportunités dont ngo_relevant = false
--   - opportunités sans NGO-fit positif et avec mots-clés exclusifs
-- ============================================================

BEGIN;

-- 1. Snapshot avant suppression (pour info)
DO $$
DECLARE
  total_before INT;
BEGIN
  SELECT COUNT(*) INTO total_before FROM opportunities;
  RAISE NOTICE 'Opportunités avant cleanup : %', total_before;
END $$;

-- 2. Supprimer les NON-ONG explicites (ngo_relevant = false)
DELETE FROM opportunities
WHERE ngo_relevant = false;

-- 3. Supprimer les opportunités dont le titre/desc indique clairement non-ONG
DELETE FROM opportunities
WHERE
  -- Bourses individuelles
  title ~* '\m(scholarship|fellowship|phd grant|master grant|bourse étudiant|bourse individuelle)\M'
  OR
  -- Vacancies / jobs
  title ~* '\m(vacancy|vacancies|job posting|job opening|offre d''emploi|offres d''emplois|recrutement individuel|consultant individuel|individual consultant)\M'
  OR
  -- Stages
  title ~* '\m(internship|stage rémunéré|trainee position)\M'
  OR
  -- Marchés commerciaux purs (fourniture matériel)
  title ~* '\m(supply of|fourniture de matériel|software license|équipement informatique)\M'
  OR
  -- Prix individuels
  title ~* '\m(early career award|young researcher|personal award|individual prize)\M';

-- 4. Pour les opportunités encore en draft sans NGO-fit clair, on garde
--    (l'admin tranchera dans /admin/pending), mais on n'efface QUE les
--    published qui n'ont jamais été classifiées ONG.
DELETE FROM opportunities
WHERE status = 'published'
  AND (ngo_relevant IS NULL OR ngo_relevance_score < 40);

-- 5. Nettoyer aussi les saved_opportunities orphelines (cascade FK devrait le faire,
--    mais on s'assure que tout est cohérent)
-- (rien à faire si la FK est ON DELETE CASCADE — vérifie le schema)

-- 6. Snapshot après
DO $$
DECLARE
  total_after INT;
  total_ngo INT;
  total_pending INT;
BEGIN
  SELECT COUNT(*) INTO total_after FROM opportunities;
  SELECT COUNT(*) INTO total_ngo FROM opportunities WHERE ngo_relevant = true;
  SELECT COUNT(*) INTO total_pending FROM opportunities WHERE status = 'draft';
  RAISE NOTICE 'Opportunités après cleanup : %', total_after;
  RAISE NOTICE '  - dont ONG-validées (ngo_relevant=true) : %', total_ngo;
  RAISE NOTICE '  - dont en attente de validation (draft) : %', total_pending;
END $$;

COMMIT;
