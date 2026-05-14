-- =============================================================
-- Funding Watch Morocco — Seed sources v3 (Sprint 2 : +15 sources prioritaires)
-- À exécuter APRÈS seed_sources_v2.sql.
-- Idempotent : on conflict (name) do nothing — les sources déjà
-- présentes (Drosos, Ford, Mott, Open Society) sont simplement ignorées.
-- =============================================================

insert into sources (name, url, type, parser_key, category, country, language, frequency, priority, active, reliability_score, tags) values
  -- ============ ONU ============
  ('UNDP Procurement Notices',                    'https://procurement-notices.undp.org/',                                          'html', 'undp',       'un',          'International', 'en', 'daily',   1, true, 100, array['onu','procurement']),
  ('OIT — Organisation Internationale du Travail','https://www.ilo.org/about-ilo/procurement',                                      'html', 'html_smart', 'un',          'International', 'en', 'weekly',  2, true, 95,  array['travail','emploi','ess']),
  ('FAO — Food and Agriculture Organization',     'https://www.fao.org/unfao/procurement/en/',                                      'html', 'html_smart', 'un',          'International', 'en', 'weekly',  2, true, 95,  array['rural','agriculture','securite-alimentaire']),

  -- ============ UE ============
  ('EU NDICI — Global Europe',                    'https://international-partnerships.ec.europa.eu/funding-and-technical-assistance_en', 'html', 'html_smart', 'eu',     'EU',            'en', 'daily',   1, true, 100, array['eu','ndici','global-europe']),

  -- ============ COOPÉRATION BILATÉRALE ============
  ('AFD — Appels à projets',                      'https://www.afd.fr/fr/appels-a-projets',                                         'html', 'afd',        'cooperation', 'FR',            'fr', 'weekly',  1, true, 95,  array['cooperation','maroc']),
  ('AECID — Coopération Espagne',                 'https://www.aecid.es/es/convocatorias',                                          'html', 'html_smart', 'cooperation', 'ES',            'es', 'weekly',  2, true, 90,  array['cooperation','maroc','mediterranee']),
  ('KOICA — Coopération Corée',                   'https://www.koica.go.kr/koica_en/index.do',                                      'html', 'html_smart', 'cooperation', 'KR',            'en', 'monthly', 3, true, 85,  array['cooperation']),

  -- ============ FONDATIONS ============
  ('Fondation Drosos',                            'https://drosos.org/en/our-projects/',                                            'html', 'html_smart', 'foundation',  'CH',            'en', 'monthly', 2, true, 90,  array['mena','maroc']),
  ('Robert Bosch Stiftung',                       'https://www.bosch-stiftung.de/en/funding',                                       'html', 'html_smart', 'foundation',  'DE',            'en', 'monthly', 3, true, 85,  array['fondation','societe-civile']),
  ('Charles Stewart Mott Foundation',             'https://www.mott.org/grants/',                                                   'html', 'html_smart', 'foundation',  'International', 'en', 'monthly', 4, true, 80,  array['fondation','societe-civile']),
  ('Ford Foundation',                             'https://www.fordfoundation.org/work/our-grants/',                                'html', 'html_smart', 'foundation',  'International', 'en', 'monthly', 3, true, 85,  array['fondation','justice-sociale']),
  ('Aga Khan Foundation',                         'https://the.akdn/en/how-we-work/our-agencies/aga-khan-foundation',               'html', 'html_smart', 'foundation',  'International', 'en', 'monthly', 2, true, 90,  array['fondation','developpement-rural']),
  ('Open Society Foundations',                    'https://www.opensocietyfoundations.org/grants',                                  'html', 'html_smart', 'foundation',  'International', 'en', 'monthly', 2, true, 90,  array['droits-humains']),

  -- ============ MAROC ============
  ('Fondation Mohammed V pour la Solidarité',     'http://www.fm5.ma/',                                                             'html', 'html_smart', 'maroc',       'MA',            'fr', 'monthly', 2, true, 85,  array['maroc','solidarite']),
  ('INDH',                                        'https://www.indh.ma',                                                            'html', 'indh',       'maroc',       'MA',            'fr', 'weekly',  1, true, 90,  array['maroc','developpement'])
on conflict (name) do nothing;
