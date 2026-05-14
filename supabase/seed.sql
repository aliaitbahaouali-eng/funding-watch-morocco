-- =============================================================
-- Funding Watch Morocco — Seed minimal
-- À exécuter APRÈS schema.sql.
-- =============================================================

-- Thématiques
insert into themes (name_fr, name_en, slug, keywords, icon, active) values
  ('Femmes & égalité', 'Women & gender', 'femmes', array['femmes','genre','gender','women','egalite','parite'], 'venus', true),
  ('Jeunes & employabilité', 'Youth & employability', 'jeunes', array['jeunes','youth','jeunesse','employabilite','insertion','emploi'], 'graduation-cap', true),
  ('ESS & entrepreneuriat', 'Social economy', 'ess', array['ess','economie sociale','entrepreneuriat','social enterprise'], 'briefcase', true),
  ('Climat & environnement', 'Climate & environment', 'climat', array['climat','climate','environnement','adaptation','resilience'], 'leaf', true),
  ('Digitalisation', 'Digital transformation', 'digital', array['digital','digitalisation','technologie','numerique','ict'], 'cpu', true),
  ('Migration', 'Migration', 'migration', array['migration','refugies','refugees','migrants'], 'globe', true),
  ('Éducation', 'Education', 'education', array['education','formation','school','learning'], 'book', true),
  ('Santé', 'Health', 'sante', array['sante','health','medical','wellbeing'], 'heart', true),
  ('Culture & arts', 'Culture & arts', 'culture', array['culture','arts','patrimoine','heritage'], 'palette', true),
  ('Droits humains', 'Human rights', 'droits-humains', array['droits humains','human rights','justice','plaidoyer'], 'scale', true),
  ('Agriculture & rural', 'Rural development', 'rural', array['agriculture','rural','farming','food security'], 'wheat', true),
  ('Innovation sociale', 'Social innovation', 'innovation', array['innovation','social impact','impact'], 'sparkles', true)
on conflict (slug) do nothing;

-- Bailleurs principaux
insert into donors (name, type, country, website, description) values
  ('Union Européenne', 'multilateral', 'EU', 'https://international-partnerships.ec.europa.eu/', 'Coopération internationale et partenariats UE.'),
  ('UNDP', 'multilateral', 'International', 'https://www.undp.org/', 'Programme des Nations Unies pour le développement.'),
  ('GIZ', 'bilateral', 'Allemagne', 'https://www.giz.de/', 'Coopération allemande pour le développement.'),
  ('AFD', 'bilateral', 'France', 'https://www.afd.fr/', 'Agence Française de Développement.'),
  ('UN Women', 'multilateral', 'International', 'https://www.unwomen.org/', 'Agence ONU pour les femmes.'),
  ('USAID', 'bilateral', 'USA', 'https://www.usaid.gov/', 'United States Agency for International Development.'),
  ('FAO', 'multilateral', 'International', 'https://www.fao.org/', 'Organisation pour l''alimentation et l''agriculture.'),
  ('Enabel', 'bilateral', 'Belgique', 'https://www.enabel.be/', 'Coopération belge.'),
  ('Fondation Drosos', 'foundation', 'Suisse', 'https://drosos.org/', 'Fondation suisse — Suisse / MENA.')
on conflict do nothing;

-- Sources V1 (5 sources de démarrage + extras)
insert into sources (name, url, type, parser_key, frequency, active, priority) values
  ('UNDP Procurement Notices', 'https://procurement-notices.undp.org/', 'html', 'undp', 'daily', true, 1),
  ('EU Funding & Tenders', 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search', 'html', 'eu_funding', 'daily', true, 1),
  ('GIZ Calls for proposals', 'https://www.giz.de/en/aboutgiz/business_opportunities.html', 'html', 'giz', 'weekly', true, 2),
  ('AFD Appels à projets', 'https://www.afd.fr/fr/appels-a-projets', 'html', 'afd', 'weekly', true, 2),
  ('UN Women Calls', 'https://www.unwomen.org/en/about-us/procurement', 'html', 'un_women', 'weekly', true, 2),
  ('FAO Procurement', 'https://www.fao.org/unfao/procurement/en/', 'html', 'fao', 'weekly', true, 3),
  ('fundsforNGOs', 'https://www2.fundsforngos.org/feed/', 'rss', 'rss_generic', 'daily', true, 3)
on conflict do nothing;
