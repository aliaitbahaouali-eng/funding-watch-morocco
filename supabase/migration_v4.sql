-- ============================================================
-- Funding Watch Morocco — Migration v4
-- "Funding Intelligence & Matching System"
--
-- Objectif : remplacer le score de compatibilité cosmétique
--            par un vrai matching vectoriel + profil orga structuré.
--
-- Ajoute :
--   - extension pgvector (Postgres)
--   - colonnes embedding sur organizations + opportunities
--   - taxonomies fermées : SDG, DAC sectors, populations, géographies
--   - junction tables org<->taxo et opp<->taxo
--   - champs structurés sur organizations (team_size, past_projects, etc.)
--   - fonction SQL match_opportunities_for_org(org_id)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1. Extension pgvector
-- ─────────────────────────────────────────────
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ─────────────────────────────────────────────
-- 2. Tables taxonomiques (référentiels fermés)
-- ─────────────────────────────────────────────

-- SDG ONU (17 objectifs)
create table if not exists sdg_goals (
  id smallint primary key,            -- 1..17
  code text unique not null,          -- 'SDG-1', 'SDG-2', ...
  name_fr text not null,
  name_en text not null,
  name_ar text,
  color_hex text,
  icon text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Secteurs OCDE-DAC (codes CRS purpose, niveau 3 simplifié)
create table if not exists dac_sectors (
  id text primary key,                -- code DAC ex: '15170', '11220'
  parent_id text,                     -- regroupement (15: gouvernance, 11: éducation)
  name_fr text not null,
  name_en text not null,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Populations cibles standard
create table if not exists target_populations (
  slug text primary key,              -- 'women', 'youth', 'mre', ...
  name_fr text not null,
  name_en text not null,
  description text,
  keywords text[] not null default '{}'
);

-- Géographies d'intervention (régions Maroc + zones Afrique/MENA)
create table if not exists action_geographies (
  slug text primary key,              -- 'ma-casa', 'maghreb', 'africa-west', 'mena', ...
  name_fr text not null,
  name_en text not null,
  level text not null check (level in ('region','country','subregion','continent','global')),
  parent_slug text,
  iso_code text,
  bbox jsonb                          -- {minlon,minlat,maxlon,maxlat} pour carte
);

-- ─────────────────────────────────────────────
-- 3. Extension de la table organizations
-- ─────────────────────────────────────────────
alter table organizations
  add column if not exists team_size text check (team_size in ('1-5','6-20','21-50','51-200','200+')),
  add column if not exists volunteers_count int,
  add column if not exists members_count int,
  add column if not exists action_summary text,        -- 2-4 phrases sur ce que fait l'orga
  add column if not exists intervention_themes_text text, -- texte libre rédigé par l'utilisateur
  add column if not exists past_projects jsonb not null default '[]'::jsonb,
  add column if not exists funding_history jsonb not null default '[]'::jsonb,
  add column if not exists target_amount_min numeric,
  add column if not exists target_amount_max numeric,
  add column if not exists currencies text[] not null default '{EUR,MAD,USD}',
  add column if not exists work_languages text[] not null default '{fr,ar}',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz,
  -- Embedding vectoriel du profil (1536 dims pour text-embedding-3-small / 1024 pour voyage-2)
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz;

-- ─────────────────────────────────────────────
-- 4. Junction tables org <-> taxonomies
-- ─────────────────────────────────────────────
create table if not exists org_sdg_goals (
  org_id uuid not null references organizations(id) on delete cascade,
  sdg_id smallint not null references sdg_goals(id) on delete cascade,
  priority smallint not null default 1 check (priority between 1 and 3), -- 1=principal
  primary key (org_id, sdg_id)
);
create index if not exists org_sdg_goals_org_idx on org_sdg_goals(org_id);

create table if not exists org_dac_sectors (
  org_id uuid not null references organizations(id) on delete cascade,
  sector_id text not null references dac_sectors(id) on delete cascade,
  primary key (org_id, sector_id)
);
create index if not exists org_dac_sectors_org_idx on org_dac_sectors(org_id);

create table if not exists org_target_populations (
  org_id uuid not null references organizations(id) on delete cascade,
  population_slug text not null references target_populations(slug) on delete cascade,
  primary key (org_id, population_slug)
);
create index if not exists org_target_populations_org_idx on org_target_populations(org_id);

create table if not exists org_action_geographies (
  org_id uuid not null references organizations(id) on delete cascade,
  geography_slug text not null references action_geographies(slug) on delete cascade,
  primary key (org_id, geography_slug)
);
create index if not exists org_action_geographies_org_idx on org_action_geographies(org_id);

-- ─────────────────────────────────────────────
-- 5. Junction tables opportunities <-> taxonomies
-- ─────────────────────────────────────────────
create table if not exists opp_sdg_goals (
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  sdg_id smallint not null references sdg_goals(id) on delete cascade,
  confidence numeric default 1.0,
  primary key (opportunity_id, sdg_id)
);
create index if not exists opp_sdg_goals_opp_idx on opp_sdg_goals(opportunity_id);

create table if not exists opp_dac_sectors (
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  sector_id text not null references dac_sectors(id) on delete cascade,
  confidence numeric default 1.0,
  primary key (opportunity_id, sector_id)
);
create index if not exists opp_dac_sectors_opp_idx on opp_dac_sectors(opportunity_id);

create table if not exists opp_target_populations (
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  population_slug text not null references target_populations(slug) on delete cascade,
  primary key (opportunity_id, population_slug)
);

-- Embedding sur opportunities
alter table opportunities
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz;

-- Index ANN (Approximate Nearest Neighbor) pour la recherche vectorielle rapide
-- IVFFlat est performant à partir de quelques milliers de lignes
create index if not exists organizations_embedding_idx
  on organizations using ivfflat (embedding vector_cosine_ops) with (lists = 50);
create index if not exists opportunities_embedding_idx
  on opportunities using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─────────────────────────────────────────────
-- 6. Table match_scores (cache des scores)
-- ─────────────────────────────────────────────
create table if not exists match_scores (
  org_id uuid not null references organizations(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  semantic_score numeric not null,         -- 0..1 cosine similarity
  taxonomy_score numeric not null,         -- 0..1 fraction de tags partagés
  geo_score numeric not null,              -- 0..1 alignement géographique
  deadline_score numeric not null,         -- 0..1 plus c'est urgent plus c'est bonus modéré
  donor_familiarity_score numeric not null default 0,
  final_score numeric not null,            -- 0..100 score affiché à l'utilisateur
  scoring_breakdown jsonb,                  -- pour expliquer le score à l'user
  computed_at timestamptz not null default now(),
  primary key (org_id, opportunity_id)
);
create index if not exists match_scores_org_score_idx
  on match_scores(org_id, final_score desc);

-- ─────────────────────────────────────────────
-- 7. RLS sur les nouvelles tables
-- ─────────────────────────────────────────────
alter table sdg_goals enable row level security;
alter table dac_sectors enable row level security;
alter table target_populations enable row level security;
alter table action_geographies enable row level security;
alter table org_sdg_goals enable row level security;
alter table org_dac_sectors enable row level security;
alter table org_target_populations enable row level security;
alter table org_action_geographies enable row level security;
alter table opp_sdg_goals enable row level security;
alter table opp_dac_sectors enable row level security;
alter table opp_target_populations enable row level security;
alter table match_scores enable row level security;

-- Référentiels lisibles par tous les authentifiés
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'taxo_read_all' and tablename = 'sdg_goals') then
    create policy taxo_read_all on sdg_goals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'taxo_read_all' and tablename = 'dac_sectors') then
    create policy taxo_read_all on dac_sectors for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'taxo_read_all' and tablename = 'target_populations') then
    create policy taxo_read_all on target_populations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'taxo_read_all' and tablename = 'action_geographies') then
    create policy taxo_read_all on action_geographies for select using (true);
  end if;
end $$;

-- Org junction tables : l'utilisateur ne voit/modifie que ses orgs
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'org_taxo_owner' and tablename = 'org_sdg_goals') then
    create policy org_taxo_owner on org_sdg_goals
      for all using (
        org_id in (select id from organizations where user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'org_taxo_owner' and tablename = 'org_dac_sectors') then
    create policy org_taxo_owner on org_dac_sectors
      for all using (
        org_id in (select id from organizations where user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'org_taxo_owner' and tablename = 'org_target_populations') then
    create policy org_taxo_owner on org_target_populations
      for all using (
        org_id in (select id from organizations where user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'org_taxo_owner' and tablename = 'org_action_geographies') then
    create policy org_taxo_owner on org_action_geographies
      for all using (
        org_id in (select id from organizations where user_id = auth.uid())
      );
  end if;
end $$;

-- Opp junction tables : lecture publique (les opportunités sont publiques)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'opp_taxo_read' and tablename = 'opp_sdg_goals') then
    create policy opp_taxo_read on opp_sdg_goals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'opp_taxo_read' and tablename = 'opp_dac_sectors') then
    create policy opp_taxo_read on opp_dac_sectors for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'opp_taxo_read' and tablename = 'opp_target_populations') then
    create policy opp_taxo_read on opp_target_populations for select using (true);
  end if;
end $$;

-- match_scores : visible uniquement à l'orga concernée
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'match_scores_owner' and tablename = 'match_scores') then
    create policy match_scores_owner on match_scores
      for select using (
        org_id in (select id from organizations where user_id = auth.uid())
      );
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 8. Fonction principale : match_opportunities_for_org
-- ─────────────────────────────────────────────
-- Retourne les top N opportunités pour une organisation,
-- calcule à la volée si pas en cache.
-- Combine : semantic (40%) + taxonomy (30%) + geo (15%) + deadline (10%) + donor fam (5%)

create or replace function match_opportunities_for_org(
  p_org_id uuid,
  p_limit int default 20
)
returns table (
  opportunity_id uuid,
  title text,
  donor_name text,
  deadline date,
  morocco_eligible boolean,
  semantic_score numeric,
  taxonomy_score numeric,
  final_score numeric,
  reason text
)
language plpgsql
security definer
as $$
declare
  v_embedding vector(1536);
begin
  -- Récupère l'embedding de l'orga
  select embedding into v_embedding from organizations where id = p_org_id;

  if v_embedding is null then
    -- Pas d'embedding → fallback sur scoring taxonomique pur
    return query
    with org_sdg as (select sdg_id from org_sdg_goals where org_id = p_org_id),
         org_dac as (select sector_id from org_dac_sectors where org_id = p_org_id),
         opp_match as (
           select o.id,
                  o.title,
                  o.donor_name,
                  o.deadline,
                  o.morocco_eligible,
                  (
                    coalesce((select count(*) from opp_sdg_goals s
                              where s.opportunity_id = o.id
                              and s.sdg_id in (select sdg_id from org_sdg)),0) * 1.0
                    + coalesce((select count(*) from opp_dac_sectors s
                                where s.opportunity_id = o.id
                                and s.sector_id in (select sector_id from org_dac)),0) * 1.0
                  ) as taxo_count
           from opportunities o
           where o.status = 'published'
             and (o.deadline is null or o.deadline >= current_date)
             and o.ngo_relevant is true
         )
    select id, title, donor_name, deadline, morocco_eligible,
           0::numeric, (taxo_count / 6.0)::numeric,
           least(100, taxo_count * 15)::numeric,
           'Matching basé sur les thématiques (profil sans embedding)'::text
    from opp_match
    order by taxo_count desc, deadline asc nulls last
    limit p_limit;
    return;
  end if;

  -- Matching complet
  return query
  with org_sdg as (select sdg_id from org_sdg_goals where org_id = p_org_id),
       org_dac as (select sector_id from org_dac_sectors where org_id = p_org_id),
       org_geo as (select geography_slug from org_action_geographies where org_id = p_org_id),
       cand as (
         select o.id, o.title, o.donor_name, o.deadline, o.morocco_eligible,
                o.embedding,
                -- semantic
                case when o.embedding is null then 0
                     else 1 - (o.embedding <=> v_embedding)
                end as sem,
                -- taxonomy : fraction des sdg/dac de l'orga présents dans l'opp
                coalesce((
                  select count(*)::numeric / nullif((select count(*) from org_sdg)::numeric, 0)
                  from opp_sdg_goals s
                  where s.opportunity_id = o.id and s.sdg_id in (select sdg_id from org_sdg)
                ), 0) as sdg_overlap,
                coalesce((
                  select count(*)::numeric / nullif((select count(*) from org_dac)::numeric, 0)
                  from opp_dac_sectors s
                  where s.opportunity_id = o.id and s.sector_id in (select sector_id from org_dac)
                ), 0) as dac_overlap,
                -- geo : opp eligible Maroc et orga active au Maroc → bonus
                case
                  when o.morocco_eligible and exists (select 1 from org_geo og where og.geography_slug like 'ma-%' or og.geography_slug = 'morocco')
                    then 1.0
                  when o.morocco_eligible then 0.6
                  else 0.2
                end as geo,
                -- deadline : score haut si entre 14 et 60 jours, baisse si trop court ou trop long
                case
                  when o.deadline is null then 0.5
                  when o.deadline - current_date between 14 and 60 then 1.0
                  when o.deadline - current_date between 7 and 13 then 0.8
                  when o.deadline - current_date between 61 and 120 then 0.7
                  when o.deadline - current_date < 7 then 0.4
                  else 0.5
                end as dl
         from opportunities o
         where o.status = 'published'
           and (o.deadline is null or o.deadline >= current_date)
           and o.ngo_relevant is true
       )
  select
    id as opportunity_id,
    title,
    donor_name,
    deadline,
    morocco_eligible,
    round(sem::numeric, 4) as semantic_score,
    round(((sdg_overlap + dac_overlap)/2)::numeric, 4) as taxonomy_score,
    -- score final 0..100 : sem 40% + taxo 30% + geo 15% + dl 10% + donor 5%(0 default)
    round((sem * 40 + ((sdg_overlap + dac_overlap)/2) * 30 + geo * 15 + dl * 10)::numeric, 1) as final_score,
    case
      when sem > 0.85 then 'Excellente correspondance sémantique avec ton profil'
      when sdg_overlap + dac_overlap > 0.6 then 'Forte correspondance thématique'
      when geo >= 0.6 and dl >= 0.8 then 'Bien aligné géographiquement, deadline favorable'
      else 'Correspondance partielle — à étudier'
    end as reason
  from cand
  order by final_score desc, deadline asc nulls last
  limit p_limit;
end;
$$;

grant execute on function match_opportunities_for_org(uuid, int) to authenticated;

-- ─────────────────────────────────────────────
-- 9. Vue pratique : opp + tous ses tags
-- ─────────────────────────────────────────────
create or replace view opportunity_enriched as
select
  o.*,
  array(select sdg_id from opp_sdg_goals where opportunity_id = o.id) as sdg_ids,
  array(select sector_id from opp_dac_sectors where opportunity_id = o.id) as dac_sector_ids,
  array(select population_slug from opp_target_populations where opportunity_id = o.id) as target_population_slugs
from opportunities o;

COMMIT;

-- Note d'opération :
-- Après cette migration, lancer dans l'ordre :
--   1. seed_taxonomies.sql       → remplit SDG, DAC, populations, géographies
--   2. python scrapers/backfill_embeddings.py → calcule les embeddings
--   3. python scrapers/backfill_taxonomy.py    → classe les opp via Claude sur les nouveaux tags
