-- ============================================================
-- Funding Watch Morocco — Migration v24 (Sprint 4O)
--
-- Étend la taxonomie de thématiques d'après le feedback bêta :
-- "la liste n'est pas exhaustive — droits de l'homme, droits des
--  minorités, mères célibataires, etc."
--
-- Ajoute 9 nouveaux slugs :
--   droits-minorites              — LGBTQ+, ethnies, religieuses
--   monoparentalite               — familles monoparentales / mères célibataires
--   sante-mentale                 — santé mentale (séparé de "sante")
--   plaidoyer                     — advocacy / réforme
--   justice-acces-droit           — accès à la justice
--   medias-liberte-expression     — médias indépendants / liberté presse
--   personnes-agees               — personnes âgées
--   enfance-protection            — enfance en danger / protection enfants
--   handicap                      — personnes en situation de handicap
--
-- Idempotent (ON CONFLICT (slug) DO NOTHING).
-- NE recouvre PAS la thématique "droits-humains" existante qui reste
-- l'ombrelle générique. Les nouveaux slugs sont plus fins.
-- ============================================================

INSERT INTO themes (name_fr, name_en, slug, keywords, icon, active, description) VALUES
  (
    'Droits des minorités',
    'Minority rights',
    'droits-minorites',
    ARRAY['minorites','minorities','lgbtq','lgbt','queer','ethnique','religieuse','discrimination'],
    'users',
    true,
    'LGBTQ+, minorités ethniques / religieuses, lutte contre les discriminations.'
  ),
  (
    'Familles monoparentales',
    'Single-parent families',
    'monoparentalite',
    ARRAY['monoparentale','single mother','mere celibataire','single parent','single-mother','meres celibataires','famille monoparentale'],
    'baby',
    true,
    'Mères / pères célibataires, familles monoparentales, autonomie économique.'
  ),
  (
    'Santé mentale',
    'Mental health',
    'sante-mentale',
    ARRAY['sante mentale','mental health','psychologique','suicide','depression','bien-etre','wellbeing','therapie'],
    'brain',
    true,
    'Santé mentale, accompagnement psychologique, prévention suicide, bien-être.'
  ),
  (
    'Plaidoyer & advocacy',
    'Advocacy',
    'plaidoyer',
    ARRAY['plaidoyer','advocacy','reforme','lobbying','policy','politiques publiques','campagne'],
    'megaphone',
    true,
    'Plaidoyer politique, campagnes de mobilisation, influence des politiques publiques.'
  ),
  (
    'Justice & accès au droit',
    'Justice & legal aid',
    'justice-acces-droit',
    ARRAY['justice','acces au droit','aide juridique','legal aid','court','tribunal','reforme penale','prison'],
    'gavel',
    true,
    'Aide juridique, accès à la justice, réforme pénale, droits des détenus.'
  ),
  (
    'Médias & liberté d''expression',
    'Media & free speech',
    'medias-liberte-expression',
    ARRAY['medias','media','journalisme','journalism','press freedom','liberte de presse','liberte expression','free speech','independent media'],
    'newspaper',
    true,
    'Médias indépendants, liberté de la presse, journalisme d''investigation.'
  ),
  (
    'Personnes âgées',
    'Elderly',
    'personnes-agees',
    ARRAY['personnes agees','elderly','seniors','vieillissement','ageing','retraite','dependance'],
    'user-circle',
    true,
    'Soutien aux personnes âgées, vieillissement actif, dépendance.'
  ),
  (
    'Protection de l''enfance',
    'Child protection',
    'enfance-protection',
    ARRAY['enfance','enfants','child protection','protection enfants','violence enfants','enfants rue','street children','orphelins'],
    'shield',
    true,
    'Protection des enfants en danger, lutte contre les violences faites aux enfants, prise en charge des orphelins.'
  ),
  (
    'Handicap & inclusion',
    'Disability inclusion',
    'handicap',
    ARRAY['handicap','disability','inclusion','accessibilite','accessibility','personnes handicapees','PSH'],
    'wheelchair',
    true,
    'Inclusion des personnes en situation de handicap, accessibilité, autonomie.'
  )
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
