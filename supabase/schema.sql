-- =============================================================
-- Funding Watch Morocco — Schéma Supabase complet
-- Exécuter dans l'éditeur SQL Supabase (idempotent).
-- =============================================================

create extension if not exists "pgcrypto";

-- ===== 1. PROFILES =====
-- Lié à auth.users via id (foreign key sur auth.users.id).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'association' check (role in ('association','admin','veille')),
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== 2. ORGANIZATIONS =====
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  legal_status text,
  city text,
  region text,
  creation_year int,
  website text,
  phone text,
  description text,
  org_type text check (org_type in ('association','ong','cooperative','fondation','autre')),
  annual_budget_range text,
  donor_experience text,
  preferred_language text not null default 'fr' check (preferred_language in ('fr','ar','en')),
  email_frequency text not null default 'weekly' check (email_frequency in ('daily','weekly','monthly','none')),
  profile_completeness int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_user_id_idx on organizations(user_id);

-- ===== 3. THEMES =====
create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_en text,
  slug text unique not null,
  description text,
  keywords text[] not null default '{}',
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== 4. DONORS =====
create table if not exists donors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('bilateral','multilateral','foundation','ngo','government','private','other')),
  country text,
  website text,
  logo_url text,
  description text,
  contact_email text,
  created_at timestamptz not null default now()
);

-- ===== 5. SOURCES =====
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  type text not null default 'html' check (type in ('html','rss','api')),
  parser_key text,
  priority int not null default 1,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','monthly')),
  active boolean not null default true,
  last_checked timestamptz,
  last_status text,
  notes text,
  created_at timestamptz not null default now()
);

-- ===== 6. OPPORTUNITIES =====
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  donor_id uuid references donors(id) on delete set null,
  source_id uuid references sources(id) on delete set null,
  type text,
  summary text,
  description text,
  eligibility text,
  amount_min numeric,
  amount_max numeric,
  currency text default 'EUR',
  deadline date,
  publication_date date,
  official_url text not null,
  source_url text,
  language text default 'fr' check (language in ('fr','ar','en','es')),
  countries_eligible text[] not null default '{}',
  morocco_eligible boolean not null default false,
  difficulty_level text check (difficulty_level in ('Accessible','Moyen','Élevé')),
  required_documents text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','pending_review','published','archived','expired')),
  verified boolean not null default false,
  ai_processed boolean not null default false,
  external_id text,
  collected_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists opportunities_external_id_idx
  on opportunities(source_id, external_id) where external_id is not null;
create index if not exists opportunities_status_idx on opportunities(status);
create index if not exists opportunities_deadline_idx on opportunities(deadline);
create index if not exists opportunities_morocco_idx on opportunities(morocco_eligible);

-- ===== 7. PIVOTS =====
create table if not exists opportunity_themes (
  opportunity_id uuid references opportunities(id) on delete cascade,
  theme_id uuid references themes(id) on delete cascade,
  primary key (opportunity_id, theme_id)
);
create table if not exists organization_themes (
  organization_id uuid references organizations(id) on delete cascade,
  theme_id uuid references themes(id) on delete cascade,
  primary key (organization_id, theme_id)
);

-- ===== 8. SAVED OPPORTUNITIES (suivi candidatures) =====
create table if not exists saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  status text not null default 'saved' check (status in ('saved','analyzing','preparing','submitted','abandoned','won','lost')),
  notes text,
  reminder_at date,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, opportunity_id)
);

-- ===== 9. SCRAPING LOGS =====
create table if not exists scraping_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  source_name text,
  status text not null check (status in ('success','partial','error')),
  items_found int not null default 0,
  items_created int not null default 0,
  duplicates int not null default 0,
  duration_ms int,
  error_message text,
  metadata jsonb,
  checked_at timestamptz not null default now()
);

-- ===== 10. EMAIL ALERTS =====
create table if not exists email_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('new_opportunity','weekly_digest','deadline_reminder')),
  frequency text not null default 'weekly' check (frequency in ('immediate','daily','weekly','monthly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== 11. EMAIL LOGS =====
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  recipient_email text not null,
  subject text,
  template text,
  opportunities uuid[],
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================
-- TRIGGERS — updated_at + création auto profile à l'inscription
-- =============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists organizations_updated_at on organizations;
create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

drop trigger if exists opportunities_updated_at on opportunities;
create trigger opportunities_updated_at before update on opportunities
  for each row execute function set_updated_at();

drop trigger if exists saved_opportunities_updated_at on saved_opportunities;
create trigger saved_opportunities_updated_at before update on saved_opportunities
  for each row execute function set_updated_at();

-- Création automatique du profil + organisation à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'association')
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_user_meta_data->>'role','association') = 'association' then
    insert into organizations (user_id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'org_name', 'Mon association'))
    on conflict do nothing;
  end if;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================
-- HELPERS pour RLS — éviter récursion
-- =============================================================
create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','veille'));
$$;

create or replace function is_super_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function current_org_id() returns uuid
language sql security definer set search_path = public stable as $$
  select id from organizations where user_id = auth.uid() limit 1;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table themes enable row level security;
alter table donors enable row level security;
alter table sources enable row level security;
alter table opportunities enable row level security;
alter table opportunity_themes enable row level security;
alter table organization_themes enable row level security;
alter table saved_opportunities enable row level security;
alter table scraping_logs enable row level security;
alter table email_alerts enable row level security;
alter table email_logs enable row level security;

-- PROFILES — chacun lit/édite le sien, admins voient tout
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles for select using (auth.uid() = id or is_admin());
drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update using (auth.uid() = id);
drop policy if exists "profiles admin all" on profiles;
create policy "profiles admin all" on profiles for all using (is_super_admin()) with check (is_super_admin());

-- ORGANIZATIONS — owner lit/édite, admins voient tout
drop policy if exists "org owner read" on organizations;
create policy "org owner read" on organizations for select using (user_id = auth.uid() or is_admin());
drop policy if exists "org owner write" on organizations;
create policy "org owner write" on organizations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "org admin all" on organizations;
create policy "org admin all" on organizations for all using (is_super_admin()) with check (is_super_admin());

-- THEMES / DONORS — lecture publique, écriture admin
drop policy if exists "themes public read" on themes;
create policy "themes public read" on themes for select using (true);
drop policy if exists "themes admin write" on themes;
create policy "themes admin write" on themes for all using (is_admin()) with check (is_admin());

drop policy if exists "donors public read" on donors;
create policy "donors public read" on donors for select using (true);
drop policy if exists "donors admin write" on donors;
create policy "donors admin write" on donors for all using (is_admin()) with check (is_admin());

-- SOURCES — lecture admin uniquement
drop policy if exists "sources admin read" on sources;
create policy "sources admin read" on sources for select using (is_admin());
drop policy if exists "sources admin write" on sources;
create policy "sources admin write" on sources for all using (is_admin()) with check (is_admin());

-- OPPORTUNITIES — public ne voit que published, admin voit tout
drop policy if exists "opps public read" on opportunities;
create policy "opps public read" on opportunities for select using (status = 'published' or is_admin());
drop policy if exists "opps admin write" on opportunities;
create policy "opps admin write" on opportunities for all using (is_admin()) with check (is_admin());

drop policy if exists "opp_themes public read" on opportunity_themes;
create policy "opp_themes public read" on opportunity_themes for select using (true);
drop policy if exists "opp_themes admin write" on opportunity_themes;
create policy "opp_themes admin write" on opportunity_themes for all using (is_admin()) with check (is_admin());

drop policy if exists "org_themes owner all" on organization_themes;
create policy "org_themes owner all" on organization_themes for all
  using (organization_id in (select id from organizations where user_id = auth.uid()) or is_admin())
  with check (organization_id in (select id from organizations where user_id = auth.uid()));

-- SAVED — owner uniquement
drop policy if exists "saved owner all" on saved_opportunities;
create policy "saved owner all" on saved_opportunities for all
  using (organization_id in (select id from organizations where user_id = auth.uid()) or is_admin())
  with check (organization_id in (select id from organizations where user_id = auth.uid()));

-- SCRAPING / EMAIL LOGS — admin
drop policy if exists "scraping admin all" on scraping_logs;
create policy "scraping admin all" on scraping_logs for all using (is_admin()) with check (is_admin());

drop policy if exists "email_alerts owner all" on email_alerts;
create policy "email_alerts owner all" on email_alerts for all
  using (organization_id in (select id from organizations where user_id = auth.uid()) or is_admin())
  with check (organization_id in (select id from organizations where user_id = auth.uid()));

drop policy if exists "email_logs admin read" on email_logs;
create policy "email_logs admin read" on email_logs for select using (is_admin());
drop policy if exists "email_logs admin write" on email_logs;
create policy "email_logs admin write" on email_logs for all using (is_admin()) with check (is_admin());
