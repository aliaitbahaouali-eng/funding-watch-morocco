-- ============================================================
-- Funding Watch Morocco — Seed Taxonomies v1
-- Référentiels fermés pour le matching intelligent
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 17 Objectifs de Développement Durable (SDG)
-- ─────────────────────────────────────────────
insert into sdg_goals (id, code, name_fr, name_en, color_hex, keywords) values
  (1,  'SDG-1',  'Pas de pauvreté', 'No Poverty', '#E5243B',
   array['pauvreté','extrême pauvreté','poverty','revenu','indh','protection sociale']),
  (2,  'SDG-2',  'Faim « zéro »', 'Zero Hunger', '#DDA63A',
   array['faim','nutrition','agriculture','sécurité alimentaire','food security','agroécologie']),
  (3,  'SDG-3',  'Bonne santé et bien-être', 'Good Health and Well-being', '#4C9F38',
   array['santé','health','maternelle','vaccination','VIH','tuberculose','santé mentale','bien-être']),
  (4,  'SDG-4',  'Éducation de qualité', 'Quality Education', '#C5192D',
   array['éducation','education','scolarisation','alphabétisation','formation','university','écoles']),
  (5,  'SDG-5',  'Égalité entre les sexes', 'Gender Equality', '#FF3A21',
   array['genre','femmes','égalité','women','gender','féminin','autonomisation','VBG','MGF']),
  (6,  'SDG-6',  'Eau propre et assainissement', 'Clean Water and Sanitation', '#26BDE2',
   array['eau','assainissement','hygiène','WASH','water','sanitation']),
  (7,  'SDG-7',  'Énergie propre et d''un coût abordable', 'Affordable and Clean Energy', '#FCC30B',
   array['énergie','renouvelable','solaire','éolien','energy','électrification']),
  (8,  'SDG-8',  'Travail décent et croissance économique', 'Decent Work and Economic Growth', '#A21942',
   array['emploi','décent','travail','employment','croissance','ESS','économie sociale','coopératives','entrepreneuriat']),
  (9,  'SDG-9',  'Industrie, innovation et infrastructure', 'Industry, Innovation and Infrastructure', '#FD6925',
   array['industrie','innovation','infrastructure','technologie','digitalisation','startups','MSME']),
  (10, 'SDG-10', 'Inégalités réduites', 'Reduced Inequalities', '#DD1367',
   array['inégalités','inequality','inclusion','MRE','migrants','handicap','minorités']),
  (11, 'SDG-11', 'Villes et communautés durables', 'Sustainable Cities and Communities', '#FD9D24',
   array['villes','urbain','urbain durable','habitat','transport','smart city','aménagement']),
  (12, 'SDG-12', 'Consommation et production responsables', 'Responsible Consumption', '#BF8B2E',
   array['consommation responsable','production durable','déchets','recyclage','circular economy']),
  (13, 'SDG-13', 'Mesures relatives à la lutte contre les changements climatiques', 'Climate Action', '#3F7E44',
   array['climat','climate','réchauffement','adaptation','mitigation','résilience','carbone']),
  (14, 'SDG-14', 'Vie aquatique', 'Life Below Water', '#0A97D9',
   array['océan','marin','pêche','biodiversité marine','marine','littoral']),
  (15, 'SDG-15', 'Vie terrestre', 'Life on Land', '#56C02B',
   array['biodiversité','forêt','désertification','agroforesterie','land','ecosystem','reforestation']),
  (16, 'SDG-16', 'Paix, justice et institutions efficaces', 'Peace, Justice and Strong Institutions', '#00689D',
   array['paix','justice','gouvernance','transparence','anti-corruption','droits humains','accès à la justice']),
  (17, 'SDG-17', 'Partenariats pour la réalisation des objectifs', 'Partnerships', '#19486A',
   array['partenariats','coopération','financement développement','south-south','partnership'])
on conflict (id) do update
  set name_fr = excluded.name_fr,
      name_en = excluded.name_en,
      color_hex = excluded.color_hex,
      keywords = excluded.keywords;

-- ─────────────────────────────────────────────
-- Secteurs OCDE-DAC (CRS purpose codes, niveau 3)
-- Sélection des codes les plus pertinents pour le secteur associatif
-- ─────────────────────────────────────────────
insert into dac_sectors (id, parent_id, name_fr, name_en, keywords) values
  -- 110 — Éducation
  ('11220', '110', 'Éducation primaire', 'Primary Education', array['école','primaire','primary school']),
  ('11230', '110', 'Compétences de base des jeunes et adultes', 'Basic Life Skills', array['alphabétisation','compétences','life skills']),
  ('11240', '110', 'Éducation de la petite enfance', 'Early Childhood Education', array['petite enfance','crèche','early childhood']),
  ('11320', '110', 'Enseignement secondaire', 'Secondary Education', array['collège','lycée','secondary']),
  ('11420', '110', 'Enseignement supérieur', 'Higher Education', array['université','supérieur','higher education']),
  ('11430', '110', 'Formation professionnelle supérieure', 'Vocational Training', array['formation professionnelle','TVET','apprentissage','vocational']),
  -- 120 — Santé
  ('12181', '120', 'Éducation et formation médicale', 'Medical Education', array['formation médicale']),
  ('12191', '120', 'Services médicaux', 'Medical Services', array['hôpital','santé services']),
  ('12220', '120', 'Soins de santé de base', 'Basic Health Care', array['santé de base','centres de santé']),
  ('12240', '120', 'Nutrition de base', 'Basic Nutrition', array['nutrition','malnutrition']),
  ('12250', '120', 'Lutte contre les maladies infectieuses', 'Infectious Disease Control', array['VIH','SIDA','tuberculose','paludisme']),
  ('12281', '120', 'Formation personnel de santé', 'Health Personnel Development', array['personnel santé']),
  ('13010', '130', 'Politique en matière de population', 'Population Policy', array['population','planning familial']),
  ('13020', '130', 'Soins en matière de reproduction', 'Reproductive Health Care', array['santé reproductive','maternité']),
  -- 140 — Eau et assainissement
  ('14010', '140', 'Politique de l''eau', 'Water Policy', array['politique eau']),
  ('14020', '140', 'Approvisionnement en eau et assainissement', 'Water Supply & Sanitation', array['eau potable','assainissement','WASH']),
  ('14030', '140', 'Approvisionnement en eau de base', 'Basic Drinking Water', array['eau potable']),
  -- 150 — Gouvernement et société civile
  ('15110', '150', 'Politique publique et administration', 'Public Sector Policy', array['administration publique']),
  ('15150', '150', 'Démocratie et société civile', 'Democracy & Civil Society', array['démocratie','société civile','participation citoyenne']),
  ('15160', '150', 'Droits humains', 'Human Rights', array['droits humains','human rights']),
  ('15170', '150', 'Organisations et institutions féminines', 'Women''s Equality Organisations', array['femmes','genre','VBG']),
  ('15180', '150', 'Lutte contre les violences faites aux femmes', 'Ending VAW', array['violence femmes','VBG','SGBV']),
  ('15190', '150', 'Médias et liberté d''information', 'Media & Free Flow of Info', array['médias','liberté presse']),
  -- 160 — Infrastructures sociales
  ('16010', '160', 'Services sociaux', 'Social Services', array['protection sociale','services sociaux']),
  ('16020', '160', 'Politique de l''emploi', 'Employment Policy', array['emploi','politique emploi','insertion']),
  ('16030', '160', 'Logement à coût modéré', 'Housing Policy', array['logement','habitat social']),
  -- 230 — Énergie
  ('23210', '230', 'Énergies renouvelables', 'Renewable Energy', array['énergie renouvelable','solaire','éolien']),
  ('23220', '230', 'Énergie hydroélectrique', 'Hydropower', array['hydro']),
  -- 240 — Banque et services financiers
  ('24030', '240', 'Microfinance et services financiers', 'Microfinance', array['microfinance','microcrédit','inclusion financière']),
  -- 250 — Commerce et services
  ('25010', '250', 'Services aux entreprises', 'Business Support Services', array['MSME','startups','incubation']),
  -- 311-313 — Agriculture, sylviculture, pêche
  ('31110', '311', 'Politique agricole', 'Agricultural Policy', array['politique agricole','plan maroc vert']),
  ('31120', '311', 'Développement agricole', 'Agricultural Development', array['agriculture','agriculteurs']),
  ('31161', '311', 'Production agricole', 'Food Crop Production', array['cultures vivrières']),
  ('31163', '311', 'Élevage', 'Livestock', array['élevage']),
  ('31182', '311', 'Recherche agricole', 'Agricultural Research', array['recherche agricole']),
  ('31220', '312', 'Sylviculture', 'Forestry', array['forêt','reforestation','agroforesterie']),
  ('31320', '313', 'Pêche', 'Fishing', array['pêche','pêcheurs']),
  -- 410 — Protection de l'environnement
  ('41010', '410', 'Politique de l''environnement', 'Environmental Policy', array['environnement','politique environnement']),
  ('41020', '410', 'Protection de la biosphère', 'Biosphere Protection', array['biodiversité','écosystèmes']),
  ('41030', '410', 'Biodiversité', 'Biodiversity', array['biodiversité']),
  ('41040', '410', 'Sites uniques (terre)', 'Site Preservation', array['patrimoine naturel']),
  ('41081', '410', 'Éducation et formation environnementale', 'Environmental Education', array['éducation environnement']),
  -- 720-740 — Aide humanitaire
  ('72010', '720', 'Aide matérielle d''urgence', 'Emergency Material Relief', array['aide urgence','humanitaire']),
  ('72040', '720', 'Aide alimentaire d''urgence', 'Emergency Food Aid', array['aide alimentaire']),
  ('73010', '730', 'Reconstruction et réhabilitation', 'Reconstruction Relief', array['reconstruction','post-crise']),
  -- 998 — Aide non spécifiée
  ('99820', '998', 'Sensibilisation aux questions de développement', 'Development Awareness', array['plaidoyer','advocacy','sensibilisation'])
on conflict (id) do update
  set name_fr = excluded.name_fr,
      name_en = excluded.name_en,
      keywords = excluded.keywords;

-- ─────────────────────────────────────────────
-- Populations cibles standard
-- ─────────────────────────────────────────────
insert into target_populations (slug, name_fr, name_en, description, keywords) values
  ('women',          'Femmes', 'Women', 'Femmes et jeunes filles, autonomisation, VBG',
   array['femmes','women','genre','autonomisation','VBG','SGBV']),
  ('youth',          'Jeunes (15-30)', 'Youth (15-30)', 'Adolescents et jeunes adultes',
   array['jeunes','youth','jeunesse','adolescents']),
  ('children',       'Enfants (0-14)', 'Children (0-14)', 'Petite enfance, scolarisation, protection',
   array['enfants','children','child','petite enfance']),
  ('elderly',        'Personnes âgées', 'Elderly', 'Seniors, autonomie, santé',
   array['âgées','elderly','seniors','3e âge']),
  ('disabled',       'Personnes en situation de handicap', 'Persons with Disabilities', 'Handicap moteur, sensoriel, cognitif',
   array['handicap','disability','PMR','personnes en situation de handicap']),
  ('rural',          'Populations rurales', 'Rural Populations', 'Agriculteurs, monde rural, montagne',
   array['rural','rurales','agriculteurs','montagne','oasis']),
  ('urban_marginal', 'Populations urbaines marginalisées', 'Urban Marginalised', 'Bidonvilles, banlieues précaires',
   array['urbain','bidonvilles','précaires','périurbain']),
  ('migrants',       'Migrants & MRE', 'Migrants & Diaspora', 'Migrants subsahariens, MRE, réfugiés',
   array['migrants','MRE','réfugiés','subsahariens','diaspora']),
  ('refugees',       'Réfugiés & demandeurs d''asile', 'Refugees & Asylum Seekers', '',
   array['réfugiés','asile','HCR','UNHCR']),
  ('lgbt',           'Personnes LGBT+', 'LGBT+ People', '',
   array['LGBT','LGBTI']),
  ('survivors_violence', 'Survivantes de violences', 'Survivors of Violence', 'VBG, traite, exploitation',
   array['VBG','survivantes','violence','traite']),
  ('students',       'Élèves & étudiants', 'Students', '',
   array['élèves','étudiants','students','universitaires']),
  ('msme',           'MSME / Entrepreneurs', 'MSMEs / Entrepreneurs', 'Très petites entreprises, autoentrepreneurs',
   array['MSME','TPE','entrepreneurs','autoentrepreneurs']),
  ('cooperatives',   'Coopératives ESS', 'Cooperatives (Social Economy)', '',
   array['coopératives','ESS','économie sociale']),
  ('artisans',       'Artisans', 'Artisans', '',
   array['artisans','artisanat']),
  ('farmers',        'Agriculteurs & éleveurs', 'Farmers & Pastoralists', '',
   array['agriculteurs','éleveurs','farmers']),
  ('general_public', 'Grand public', 'General Public', 'Pas de ciblage spécifique',
   array['grand public','tout public'])
on conflict (slug) do update
  set name_fr = excluded.name_fr,
      name_en = excluded.name_en,
      description = excluded.description,
      keywords = excluded.keywords;

-- ─────────────────────────────────────────────
-- Géographies d'intervention
-- 12 régions Maroc + Maghreb + Afrique + MENA + Global
-- ─────────────────────────────────────────────
insert into action_geographies (slug, name_fr, name_en, level, parent_slug, iso_code) values
  -- Pays
  ('morocco', 'Maroc', 'Morocco', 'country', 'maghreb', 'MAR'),
  -- 12 régions du Maroc
  ('ma-tanger-tetouan-alhoceima', 'Tanger-Tétouan-Al Hoceïma', 'Tanger-Tétouan-Al Hoceima', 'region', 'morocco', 'MA-01'),
  ('ma-oriental', 'L''Oriental', 'Oriental', 'region', 'morocco', 'MA-02'),
  ('ma-fes-meknes', 'Fès-Meknès', 'Fès-Meknès', 'region', 'morocco', 'MA-03'),
  ('ma-rabat-sale-kenitra', 'Rabat-Salé-Kénitra', 'Rabat-Salé-Kénitra', 'region', 'morocco', 'MA-04'),
  ('ma-beni-mellal-khenifra', 'Béni Mellal-Khénifra', 'Béni Mellal-Khénifra', 'region', 'morocco', 'MA-05'),
  ('ma-casablanca-settat', 'Casablanca-Settat', 'Casablanca-Settat', 'region', 'morocco', 'MA-06'),
  ('ma-marrakech-safi', 'Marrakech-Safi', 'Marrakech-Safi', 'region', 'morocco', 'MA-07'),
  ('ma-draa-tafilalet', 'Drâa-Tafilalet', 'Drâa-Tafilalet', 'region', 'morocco', 'MA-08'),
  ('ma-souss-massa', 'Souss-Massa', 'Souss-Massa', 'region', 'morocco', 'MA-09'),
  ('ma-guelmim-oued-noun', 'Guelmim-Oued Noun', 'Guelmim-Oued Noun', 'region', 'morocco', 'MA-10'),
  ('ma-laayoune-sakia-elhamra', 'Laâyoune-Sakia El Hamra', 'Laâyoune-Sakia El Hamra', 'region', 'morocco', 'MA-11'),
  ('ma-dakhla-oued-eddahab', 'Dakhla-Oued Ed-Dahab', 'Dakhla-Oued Ed-Dahab', 'region', 'morocco', 'MA-12'),
  -- Sous-régions africaines
  ('maghreb', 'Maghreb', 'Maghreb', 'subregion', 'mena', null),
  ('mena', 'Moyen-Orient & Afrique du Nord', 'MENA', 'subregion', 'africa', null),
  ('africa-west', 'Afrique de l''Ouest', 'West Africa', 'subregion', 'africa', null),
  ('africa-east', 'Afrique de l''Est', 'East Africa', 'subregion', 'africa', null),
  ('africa-central', 'Afrique centrale', 'Central Africa', 'subregion', 'africa', null),
  ('africa-southern', 'Afrique australe', 'Southern Africa', 'subregion', 'africa', null),
  ('sahel', 'Sahel', 'Sahel', 'subregion', 'africa', null),
  ('africa', 'Afrique', 'Africa', 'continent', 'global', null),
  ('europe', 'Europe', 'Europe', 'continent', 'global', null),
  ('global', 'Monde / Global', 'Global', 'global', null, null)
on conflict (slug) do update
  set name_fr = excluded.name_fr,
      name_en = excluded.name_en,
      level = excluded.level,
      parent_slug = excluded.parent_slug,
      iso_code = excluded.iso_code;

COMMIT;

-- Sanity check
do $$
declare
  sdg_n int; dac_n int; pop_n int; geo_n int;
begin
  select count(*) into sdg_n from sdg_goals;
  select count(*) into dac_n from dac_sectors;
  select count(*) into pop_n from target_populations;
  select count(*) into geo_n from action_geographies;
  raise notice '✓ Taxonomies seedées : % SDG, % secteurs DAC, % populations, % géographies',
    sdg_n, dac_n, pop_n, geo_n;
end $$;
