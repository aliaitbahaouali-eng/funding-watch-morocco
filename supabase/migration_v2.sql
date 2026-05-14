-- =============================================================
-- Funding Watch Morocco — Migration v2 : enrichissement sources
-- À exécuter dans l'éditeur SQL Supabase (idempotent).
-- =============================================================

-- Nouveaux champs sur la table sources
alter table sources
  add column if not exists country text,
  add column if not exists category text check (category in ('maroc','un','eu','cooperation','ngo_platform','foundation','embassy','program')),
  add column if not exists language text default 'fr' check (language in ('fr','en','ar','es')),
  add column if not exists extraction_method text default 'html_smart' check (extraction_method in ('html_smart','html_table','html_cards','html_links','rss','api','playwright')),
  add column if not exists reliability_score int not null default 100 check (reliability_score between 0 and 100),
  add column if not exists opportunities_collected int not null default 0,
  add column if not exists opportunities_published int not null default 0,
  add column if not exists last_error text,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_items_count int default 0,
  add column if not exists tags text[] default '{}';

-- Index utiles
create index if not exists sources_active_priority_idx on sources(active, priority);
create index if not exists sources_category_idx on sources(category);
create index if not exists sources_country_idx on sources(country);

-- Mise à jour des sources existantes avec les nouveaux champs
update sources set category = 'un',         country = 'International' where parser_key = 'undp';
update sources set category = 'eu',         country = 'EU'            where parser_key = 'eu_funding';
update sources set category = 'cooperation',country = 'DE'            where parser_key = 'giz';
update sources set category = 'cooperation',country = 'FR'            where parser_key = 'afd';
update sources set category = 'un',         country = 'International' where parser_key = 'un_women';
update sources set category = 'un',         country = 'International' where parser_key = 'fao';
update sources set category = 'ngo_platform', country = 'International' where parser_key = 'rss_generic';

-- Vue agrégée pour le dashboard monitoring
create or replace view source_monitoring as
select
  s.id,
  s.name,
  s.url,
  s.country,
  s.category,
  s.parser_key,
  s.frequency,
  s.active,
  s.priority,
  s.reliability_score,
  s.last_checked,
  s.last_success_at,
  s.last_error,
  s.opportunities_collected,
  s.opportunities_published,
  (select count(*) from scraping_logs sl where sl.source_id = s.id and sl.status = 'error' and sl.checked_at > now() - interval '30 days') as errors_30d,
  (select count(*) from scraping_logs sl where sl.source_id = s.id and sl.status = 'success' and sl.checked_at > now() - interval '30 days') as success_30d,
  (select sum(items_created) from scraping_logs sl where sl.source_id = s.id and sl.checked_at > now() - interval '30 days') as items_created_30d
from sources s;

-- Trigger : mettre à jour opportunities_collected/published sur les sources
create or replace function refresh_source_stats()
returns trigger language plpgsql security definer as $$
declare
  src_id uuid;
begin
  src_id := coalesce(new.source_id, old.source_id);
  if src_id is null then return new; end if;

  update sources set
    opportunities_collected = (select count(*) from opportunities where source_id = src_id),
    opportunities_published = (select count(*) from opportunities where source_id = src_id and status = 'published')
  where id = src_id;
  return coalesce(new, old);
end; $$;

drop trigger if exists opp_source_stats on opportunities;
create trigger opp_source_stats
  after insert or update of status or delete on opportunities
  for each row execute function refresh_source_stats();
