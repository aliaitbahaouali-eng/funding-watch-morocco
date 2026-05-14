-- =============================================================
-- Funding Watch Morocco — Seed sources v2 (étendu, ~40 sources)
-- À exécuter APRÈS migration_v2.sql.
-- Idempotent : utilise on conflict (name) do nothing.
-- =============================================================

-- Ajoute la contrainte d'unicité sur name pour permettre on conflict
alter table sources add constraint if not exists sources_name_key unique (name);

insert into sources (name, url, type, parser_key, category, country, language, frequency, priority, active, reliability_score, tags) values
  -- ============ MAROC ============
  ('Tanmia.ma',                                   'https://www.tanmia.ma',                                                          'html', 'tanmia',     'maroc',         'MA',           'fr', 'daily',   1, true, 95, array['maroc','ong','société civile']),
  ('Emploi Public Maroc',                         'https://www.emploi-public.ma',                                                  'html', 'html_smart', 'maroc',         'MA',           'fr', 'weekly',  2, true, 80, array['maroc']),
  ('INDH',                                        'https://www.indh.ma',                                                            'html', 'indh',       'maroc',         'MA',           'fr', 'weekly',  1, true, 90, array['maroc','développement']),
  ('Portail national Maroc',                      'https://www.maroc.ma',                                                           'html', 'html_smart', 'maroc',         'MA',           'fr', 'weekly',  3, true, 70, array['maroc']),
  ('Ministère Industrie & Commerce',              'https://www.mcinet.gov.ma',                                                      'html', 'html_smart', 'maroc',         'MA',           'fr', 'monthly', 3, true, 75, array['ess','entrepreneuriat']),
  ('Ministère Agriculture',                       'https://www.agriculture.gov.ma',                                                 'html', 'html_smart', 'maroc',         'MA',           'fr', 'weekly',  3, true, 75, array['rural']),

  -- ============ ONU ============
  ('UNICEF',                                      'https://www.unicef.org/about/employ/',                                           'html', 'unicef',     'un',            'International','en', 'weekly',  2, true, 95, array['jeunes','education']),
  ('UNESCO',                                      'https://www.unesco.org/en/calls-applications',                                   'html', 'html_smart', 'un',            'International','en', 'weekly',  2, true, 90, array['culture','education']),
  ('IOM',                                         'https://www.iom.int/calls-proposals',                                            'html', 'html_smart', 'un',            'International','en', 'weekly',  2, true, 90, array['migration']),
  ('WFP',                                         'https://www.wfp.org/procurement',                                                'html', 'html_smart', 'un',            'International','en', 'weekly',  3, true, 90, array['rural']),
  ('UNHCR',                                       'https://www.unhcr.org/procurement',                                              'html', 'html_smart', 'un',            'International','en', 'weekly',  3, true, 90, array['migration']),
  ('UNFPA',                                       'https://www.unfpa.org/procurement-opportunities',                                'html', 'html_smart', 'un',            'International','en', 'weekly',  3, true, 90, array['sante','femmes']),

  -- ============ UE ============
  ('International Partnerships (EU)',             'https://international-partnerships.ec.europa.eu/funding-and-technical-assistance_en', 'html', 'html_smart', 'eu',     'EU',           'en', 'weekly',  1, true, 95, array['eu','ndici']),
  ('Erasmus+',                                    'https://erasmus-plus.ec.europa.eu/opportunities',                                'html', 'html_smart', 'eu',            'EU',           'en', 'monthly', 2, true, 95, array['education','jeunes']),

  -- ============ COOPÉRATION BILATÉRALE ============
  ('Enabel',                                      'https://www.enabel.be/fr/appels-a-projets/',                                     'html', 'enabel',     'cooperation',   'BE',           'fr', 'weekly',  2, true, 90, array['cooperation']),
  ('USAID Morocco',                               'https://www.usaid.gov/morocco/work-with-usaid/funding-opportunities',            'html', 'usaid',      'cooperation',   'US',           'en', 'weekly',  1, true, 95, array['cooperation','maroc']),
  ('SIDA — Coopération Suède',                    'https://www.sida.se/en/for-partners/calls-for-proposals',                        'html', 'html_smart', 'cooperation',   'SE',           'en', 'monthly', 3, true, 85, array['cooperation']),
  ('JICA — Coopération Japon',                    'https://www.jica.go.jp/english/our_work/types_of_assistance/grant/index.html',  'html', 'html_smart', 'cooperation',   'JP',           'en', 'monthly', 3, true, 85, array['cooperation']),
  ('DDC — Coopération Suisse',                    'https://www.eda.admin.ch/deza/en/home/themes-sdc.html',                          'html', 'html_smart', 'cooperation',   'CH',           'en', 'monthly', 3, true, 85, array['cooperation']),

  -- ============ PLATEFORMES ONG ============
  ('DevelopmentAid',                              'https://www.developmentaid.org/news-stream/grants',                              'html', 'html_smart', 'ngo_platform',  'International','en', 'weekly',  3, true, 80, array['aggregator']),
  ('Devex Funding',                               'https://www.devex.com/news',                                                     'html', 'html_smart', 'ngo_platform',  'International','en', 'weekly',  3, true, 75, array['aggregator']),
  ('Candid',                                      'https://candid.org/find-funding',                                                'html', 'html_smart', 'ngo_platform',  'International','en', 'monthly', 4, true, 70, array['aggregator']),

  -- ============ FONDATIONS ============
  ('Bill & Melinda Gates Foundation',             'https://www.gatesfoundation.org/about/committed-grants',                         'html', 'html_smart', 'foundation',    'International','en', 'monthly', 3, true, 90, array['fondation']),
  ('Rockefeller Foundation',                      'https://www.rockefellerfoundation.org/grants/',                                  'html', 'html_smart', 'foundation',    'International','en', 'monthly', 3, true, 85, array['fondation']),
  ('Open Society Foundations',                    'https://www.opensocietyfoundations.org/grants',                                  'html', 'html_smart', 'foundation',    'International','en', 'monthly', 2, true, 90, array['droits-humains']),
  ('Ford Foundation',                             'https://www.fordfoundation.org/work/our-grants/grants-database/',                'html', 'html_smart', 'foundation',    'International','en', 'monthly', 3, true, 85, array['fondation']),
  ('Mastercard Foundation',                       'https://mastercardfdn.org/programs/',                                            'html', 'html_smart', 'foundation',    'International','en', 'monthly', 3, true, 85, array['jeunes']),
  ('Charles Stewart Mott Foundation',             'https://www.mott.org/grantees/',                                                 'html', 'html_smart', 'foundation',    'International','en', 'monthly', 4, true, 80, array['fondation']),
  ('Fondation Drosos',                            'https://drosos.org/en/our-projects/',                                            'html', 'html_smart', 'foundation',    'CH',           'en', 'monthly', 2, true, 90, array['mena','maroc']),

  -- ============ AMBASSADES ============
  ('British Council Morocco',                     'https://www.britishcouncil.ma/en/programmes',                                    'html', 'html_smart', 'embassy',       'UK',           'en', 'monthly', 3, true, 80, array['culture','education']),
  ('Goethe-Institut Maroc',                       'https://www.goethe.de/ins/ma/fr/kul.html',                                       'html', 'html_smart', 'embassy',       'DE',           'fr', 'monthly', 3, true, 80, array['culture']),
  ('Institut Français du Maroc',                  'https://if-maroc.org/',                                                          'html', 'html_smart', 'embassy',       'FR',           'fr', 'monthly', 3, true, 80, array['culture','education'])
on conflict (name) do nothing;
