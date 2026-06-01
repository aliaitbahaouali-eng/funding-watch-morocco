-- ============================================================
-- Funding Watch Morocco — Migration v26 (Sprint 4Q)
--
-- Experts marketplace : recommander des consultants / formateurs /
-- anciens program officers qui peuvent aider les assos sur la
-- rédaction de proposition, le montage budgétaire, la due diligence
-- juridique, le suivi-évaluation.
--
-- Phase bêta : la table est seedée avec 6 PROFILS EXEMPLE
-- (status='placeholder') le temps de recruter les vrais experts. Ils
-- affichent un badge visible "EXEMPLE — bêta" côté UI et le bouton
-- "Demander de l'aide" est désactivé sur ces profils.
--
-- Workflow expert :
--   placeholder → pending → active → retired
--
-- Workflow demande :
--   sent → viewed (expert ouvre l'email) → accepted/declined → (expired)
--
-- Idempotent (CREATE IF NOT EXISTS + ON CONFLICT pour seed).
-- ============================================================

-- ============================================================
-- 1. Table experts
-- ============================================================
CREATE TABLE IF NOT EXISTS experts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  photo_url text,
  bio_short text,
  bio_long text,
  languages text[] NOT NULL DEFAULT '{fr}',
  specialty_slugs text[] NOT NULL DEFAULT '{}',
  help_kinds text[] NOT NULL DEFAULT '{}',
  country text,
  city text,
  years_experience int,
  contact_email text,
  contact_url text,
  contact_phone text,
  hourly_rate_min numeric,
  hourly_rate_max numeric,
  currency text DEFAULT 'EUR',
  pro_bono boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('placeholder', 'pending', 'active', 'retired')) DEFAULT 'pending',
  notes text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS experts_status_idx ON experts(status) WHERE status IN ('active', 'placeholder');
CREATE INDEX IF NOT EXISTS experts_specialty_idx ON experts USING gin(specialty_slugs);
CREATE INDEX IF NOT EXISTS experts_languages_idx ON experts USING gin(languages);

DROP TRIGGER IF EXISTS experts_updated_at ON experts;
CREATE TRIGGER experts_updated_at BEFORE UPDATE ON experts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE experts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experts public read" ON experts;
CREATE POLICY "experts public read" ON experts FOR SELECT
  USING (status IN ('active', 'placeholder'));

DROP POLICY IF EXISTS "experts admin all" ON experts;
CREATE POLICY "experts admin all" ON experts FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- 2. Table expert_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS expert_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expert_id uuid REFERENCES experts(id) ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (length(message) >= 20 AND length(message) <= 2000),
  contact_email text,
  contact_phone text,
  status text NOT NULL CHECK (status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')) DEFAULT 'sent',
  expert_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expert_requests_org_idx ON expert_requests(organization_id);
CREATE INDEX IF NOT EXISTS expert_requests_expert_idx ON expert_requests(expert_id);
CREATE INDEX IF NOT EXISTS expert_requests_status_idx ON expert_requests(status) WHERE status IN ('sent', 'viewed');

ALTER TABLE expert_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expert_requests owner select" ON expert_requests;
CREATE POLICY "expert_requests owner select" ON expert_requests FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "expert_requests authenticated insert" ON expert_requests;
CREATE POLICY "expert_requests authenticated insert" ON expert_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "expert_requests admin update" ON expert_requests;
CREATE POLICY "expert_requests admin update" ON expert_requests FOR UPDATE
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- 3. Seed — 6 profils placeholder (badge "EXEMPLE" côté UI)
-- ============================================================

INSERT INTO experts (
  name, title, bio_short, languages, specialty_slugs, help_kinds,
  country, city, years_experience, hourly_rate_min, hourly_rate_max,
  currency, pro_bono, status, display_order
) VALUES
  (
    'Sara El Amrani',
    'Consultante en montage de projets UE / NDICI',
    'Ancienne chargée de programme à la Délégation UE Rabat. 8 ans d''accompagnement d''ONG marocaines sur les calls Horizon, NDICI MENA, Erasmus+. Spécialisée logframes, budgets, indicators.',
    ARRAY['fr','en','ar'],
    ARRAY['femmes','jeunes','ess','education','droits-humains'],
    ARRAY['redaction','budget','strategy','evaluation'],
    'MA', 'Rabat', 8,
    400, 600, 'EUR', false,
    'placeholder', 1
  ),
  (
    'Karim Bennani',
    'Expert en suivi-évaluation et logframes',
    'Évaluateur indépendant pour AFD, UNDP, GIZ. Approche participative, théorie du changement, indicateurs SMART. Disponible pour des missions courtes ou des relectures de propositions.',
    ARRAY['fr','en'],
    ARRAY['rural','ess','climat','sante'],
    ARRAY['evaluation','formation','consultance'],
    'MA', 'Casablanca', 12,
    350, 500, 'EUR', false,
    'placeholder', 2
  ),
  (
    'Aïcha Tazi',
    'Juriste OSBL — droit associatif et conformité',
    'Avocate au barreau de Casablanca, spécialisée OSBL marocain et international (statuts, conventions, conformité bailleurs). Conseil sur due diligence, RGPD, montage de consortium juridique.',
    ARRAY['fr','ar'],
    ARRAY['droits-humains','justice-acces-droit','plaidoyer'],
    ARRAY['legal','consultance'],
    'MA', 'Casablanca', 10,
    NULL, NULL, 'MAD', true,
    'placeholder', 3
  ),
  (
    'Yassine Doukkali',
    'Formateur en rédaction de propositions de financement',
    'Anime depuis 5 ans des ateliers "Comment décrocher un AAP" pour le réseau ANSI. Méthode : atelier de groupe + accompagnement individuel sur la première soumission. Bilingue arabe-français.',
    ARRAY['fr','ar'],
    ARRAY['femmes','jeunes','rural','ess','education'],
    ARRAY['formation','redaction'],
    'MA', 'Tanger', 5,
    150, 250, 'EUR', false,
    'placeholder', 4
  ),
  (
    'Leila Mouline',
    'Spécialiste fundraising fondations internationales',
    'Ex-chargée de partenariats Fondation Drosos et Open Society. Connaît les codes des fondations privées (Drosos, OSF, Rockefeller, Mott). Aide à rédiger des concept notes courts et percutants.',
    ARRAY['fr','en'],
    ARRAY['droits-humains','droits-minorites','sante-mentale','medias-liberte-expression','plaidoyer'],
    ARRAY['redaction','strategy','consultance'],
    'CH', 'Genève', 9,
    500, 800, 'EUR', false,
    'placeholder', 5
  ),
  (
    'Mohammed Saidi',
    'Conseiller en montage de consortium et co-soumission',
    'Spécialiste des consortiums UE (lead vs co-applicant), répartition budget, accords inter-partenaires. Facilite les mises en relation entre assos marocaines et partenaires européens.',
    ARRAY['fr','en','ar'],
    ARRAY['ess','climat','digital','innovation','jeunes'],
    ARRAY['strategy','legal','consultance'],
    'MA', 'Rabat', 7,
    300, 450, 'EUR', false,
    'placeholder', 6
  )
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
