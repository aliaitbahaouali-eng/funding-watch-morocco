-- ============================================================
-- Funding Watch Morocco — Migration v12 (test data flag)
--
-- Ajoute un flag `is_test` sur opportunities pour masquer les fixtures
-- du listing public sans avoir à les passer en status='draft' (ce qui
-- les rendrait invisibles à la RPC de matching aussi).
--
-- L'opp [TEST E2E] créée par scripts/setup_e2e_fixtures.py est marquée
-- is_test=true ici pour qu'elle reste matchable par les comptes de test
-- mais n'apparaisse pas sur /opportunities ni sur la landing.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- ============================================================

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Marque l'opportunité de test e2e existante (si présente)
UPDATE opportunities
SET is_test = true
WHERE external_id = 'test-e2e-fwm-fixture';

NOTIFY pgrst, 'reload schema';
