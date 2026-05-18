-- ============================================================
-- Funding Watch Morocco — Migration v15 (Sprint 2B.2 : digest prefs granulaires)
--
-- Ajoute 3 colonnes sur `organizations` pour contrôler finement le digest :
--   - digest_days_of_week  int[]   jours de la semaine où envoyer
--                                  (1=lundi … 7=dimanche, ISO 8601)
--                                  défaut {1,2,3,4,5} = jours ouvrés
--   - digest_hour          int     heure UTC d'envoi (0-23)
--                                  défaut 7  ≈ 8h Maroc (UTC+1)
--   - digest_min_score     int     seuil de match minimum pour inclure une opp
--                                  (0..100), défaut 0 = pas de filtre
--
-- Le cron Vercel passe d'1 run/jour à 1 run/heure ; le filtrage par heure
-- + jour est fait côté Next.js.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS digest_days_of_week int[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS digest_hour int NOT NULL DEFAULT 7
    CHECK (digest_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS digest_min_score int NOT NULL DEFAULT 0
    CHECK (digest_min_score BETWEEN 0 AND 100);

-- Garde-fou : interdit les ints invalides dans digest_days_of_week (1..7 only)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS digest_days_of_week_valid;
ALTER TABLE organizations
  ADD CONSTRAINT digest_days_of_week_valid
  CHECK (
    array_length(digest_days_of_week, 1) IS NULL
    OR (
      array_length(digest_days_of_week, 1) <= 7
      AND digest_days_of_week <@ ARRAY[1,2,3,4,5,6,7]::int[]
    )
  );

NOTIFY pgrst, 'reload schema';
