-- =============================================================
-- Funding Watch Morocco — Migration v3 : NGO-fit filter & matching
-- À exécuter dans l'éditeur SQL Supabase (idempotent).
-- =============================================================

-- ===== 1. NGO-fit sur opportunities =====
alter table opportunities
  add column if not exists ngo_relevant boolean,                           -- null = non classé
  add column if not exists ngo_relevance_score int check (ngo_relevance_score between 0 and 100),
  add column if not exists ngo_relevance_reason text,                       -- explication courte
  add column if not exists target_org_types text[] default '{}';            -- ['association','ong','cooperative','fondation']

create index if not exists opportunities_ngo_relevant_idx on opportunities(ngo_relevant) where ngo_relevant = true;

-- ===== 2. Profil ONG enrichi =====
alter table organizations
  add column if not exists mission_long text,
  add column if not exists auto_inferred_themes text[] default '{}',
  add column if not exists historical_funders text[] default '{}',
  add column if not exists staff_size_range text check (staff_size_range in ('1-5','5-15','15-50','50-200','200+')),
  add column if not exists geographic_scope text[] default '{}',           -- ['MA-national','MA-Casa','MAGHREB']
  add column if not exists tags text[] default '{}';

-- ===== 3. Feedback loop (apprentissage) =====
create table if not exists recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  relevant boolean not null,                  -- thumb up/down
  reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, opportunity_id)
);

alter table recommendation_feedback enable row level security;
drop policy if exists "feedback owner all" on recommendation_feedback;
create policy "feedback owner all" on recommendation_feedback for all
  using (organization_id in (select id from organizations where user_id = auth.uid()) or is_admin())
  with check (organization_id in (select id from organizations where user_id = auth.uid()));

-- ===== 4. Application log (tracking succès) =====
create table if not exists application_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  status text not null check (status in ('preparing','submitted','shortlisted','won','lost','withdrawn')),
  submitted_at timestamptz,
  outcome_at timestamptz,
  amount_requested numeric,
  amount_awarded numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, opportunity_id)
);

alter table application_log enable row level security;
drop policy if exists "applog owner all" on application_log;
create policy "applog owner all" on application_log for all
  using (organization_id in (select id from organizations where user_id = auth.uid()) or is_admin())
  with check (organization_id in (select id from organizations where user_id = auth.uid()));

drop trigger if exists application_log_updated_at on application_log;
create trigger application_log_updated_at before update on application_log
  for each row execute function set_updated_at();

-- ===== 5. Vue NGO-only pour le front =====
create or replace view opportunities_ngo as
select * from opportunities
where status = 'published' and (ngo_relevant is null or ngo_relevant = true);
-- (ngo_relevant IS NULL = pas encore classé → on les laisse pour ne rien cacher pendant le backfill)

-- ===== 6. Statistiques admin =====
create or replace view ngo_filter_stats as
select
  count(*) filter (where ngo_relevant = true)  as ngo_yes,
  count(*) filter (where ngo_relevant = false) as ngo_no,
  count(*) filter (where ngo_relevant is null) as ngo_unclassified,
  count(*) as total
from opportunities;
