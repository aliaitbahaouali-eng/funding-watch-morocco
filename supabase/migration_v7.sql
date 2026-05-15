-- ============================================================
-- Funding Watch Morocco — Migration v7 (hotfix matching #3)
--
-- v5 a fixé donor_name. v6 a tenté de fixer la collision de noms entre
-- RETURNS TABLE et le CTE en qualifiant les colonnes. Si v6 n'a pas suffi
-- (PostgreSQL résout parfois différemment selon le plan), v7 ajoute la
-- directive plpgsql canonique `#variable_conflict use_column` qui force
-- la résolution préférentielle vers les colonnes de tables/CTE plutôt
-- que vers les paramètres OUT de la fonction.
--
-- À exécuter dans Supabase SQL Editor APRÈS v5 (et indépendamment de v6).
-- ============================================================

BEGIN;

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
#variable_conflict use_column
declare
  v_embedding vector(1536);
begin
  select embedding into v_embedding from organizations where id = p_org_id;

  if v_embedding is null then
    return query
    with org_sdg as (select sdg_id from org_sdg_goals where org_id = p_org_id),
         org_dac as (select sector_id from org_dac_sectors where org_id = p_org_id),
         opp_match as (
           select o.id,
                  o.title,
                  d.name as donor_name,
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
           left join donors d on d.id = o.donor_id
           where o.status = 'published'
             and (o.deadline is null or o.deadline >= current_date)
             and o.ngo_relevant is true
         )
    select
      opp_match.id as opportunity_id,
      opp_match.title,
      opp_match.donor_name,
      opp_match.deadline,
      opp_match.morocco_eligible,
      0::numeric as semantic_score,
      (opp_match.taxo_count / 6.0)::numeric as taxonomy_score,
      least(100, opp_match.taxo_count * 15)::numeric as final_score,
      'Matching basé sur les thématiques (profil sans embedding)'::text as reason
    from opp_match
    order by opp_match.taxo_count desc, opp_match.deadline asc nulls last
    limit p_limit;
    return;
  end if;

  return query
  with org_sdg as (select sdg_id from org_sdg_goals where org_id = p_org_id),
       org_dac as (select sector_id from org_dac_sectors where org_id = p_org_id),
       org_geo as (select geography_slug from org_action_geographies where org_id = p_org_id),
       cand as (
         select o.id, o.title, d.name as donor_name, o.deadline, o.morocco_eligible,
                o.embedding,
                case when o.embedding is null then 0
                     else 1 - (o.embedding <=> v_embedding)
                end as sem,
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
                case
                  when o.morocco_eligible and exists (select 1 from org_geo og where og.geography_slug like 'ma-%' or og.geography_slug = 'morocco')
                    then 1.0
                  when o.morocco_eligible then 0.6
                  else 0.2
                end as geo,
                case
                  when o.deadline is null then 0.5
                  when o.deadline - current_date between 14 and 60 then 1.0
                  when o.deadline - current_date between 7 and 13 then 0.8
                  when o.deadline - current_date between 61 and 120 then 0.7
                  when o.deadline - current_date < 7 then 0.4
                  else 0.5
                end as dl
         from opportunities o
         left join donors d on d.id = o.donor_id
         where o.status = 'published'
           and (o.deadline is null or o.deadline >= current_date)
           and o.ngo_relevant is true
       )
  select
    cand.id as opportunity_id,
    cand.title,
    cand.donor_name,
    cand.deadline,
    cand.morocco_eligible,
    round(cand.sem::numeric, 4) as semantic_score,
    round(((cand.sdg_overlap + cand.dac_overlap)/2)::numeric, 4) as taxonomy_score,
    round((cand.sem * 40 + ((cand.sdg_overlap + cand.dac_overlap)/2) * 30 + cand.geo * 15 + cand.dl * 10)::numeric, 1) as final_score,
    case
      when cand.sem > 0.85 then 'Excellente correspondance sémantique avec ton profil'
      when cand.sdg_overlap + cand.dac_overlap > 0.6 then 'Forte correspondance thématique'
      when cand.geo >= 0.6 and cand.dl >= 0.8 then 'Bien aligné géographiquement, deadline favorable'
      else 'Correspondance partielle — à étudier'
    end as reason
  from cand
  order by 8 desc, cand.deadline asc nulls last
  limit p_limit;
end;
$$;

grant execute on function match_opportunities_for_org(uuid, int) to authenticated;

-- Force PostgREST à recharger son cache de schéma (au cas où)
NOTIFY pgrst, 'reload schema';

COMMIT;
