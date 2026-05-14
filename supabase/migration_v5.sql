-- ============================================================
-- Funding Watch Morocco — Migration v5 (hotfix matching)
--
-- Bug corrigé : match_opportunities_for_org() référençait o.donor_name,
-- colonne inexistante (la table opportunities a donor_id, pas donor_name).
-- La fonction se créait sans erreur (plpgsql ne valide pas les colonnes à la
-- création) mais échouait à l'exécution → aucun match ne remontait.
--
-- Cette migration recrée la fonction en joignant la table donors.
-- À exécuter dans Supabase SQL Editor APRÈS migration_v4.sql.
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
         select o.id, o.title, d.name as donor_name, o.deadline, o.morocco_eligible,
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
         left join donors d on d.id = o.donor_id
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

COMMIT;
