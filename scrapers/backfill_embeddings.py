#!/usr/bin/env python
"""Backfill embeddings — calcule et stocke les vecteurs sémantiques pour
toutes les organisations et opportunités qui n'en ont pas (ou dont le
profil a été mis à jour après embedding_updated_at).

Usage :
  python scrapers/backfill_embeddings.py                # tout
  python scrapers/backfill_embeddings.py --orgs         # juste les orgs
  python scrapers/backfill_embeddings.py --opps         # juste les opportunités
  python scrapers/backfill_embeddings.py --force        # re-embeddifie tout
  python scrapers/backfill_embeddings.py --limit 50
"""
import argparse
import os
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parent.parent
    for name in ('.env.local', '.env'):
        p = root / name
        if p.exists():
            load_dotenv(p, override=False)
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
from scrapers.ai.embeddings import (
    get_embedding,
    build_org_text,
    build_opportunity_text,
)

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    print('✖ NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis')
    sys.exit(1)

HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}


def sb_get(path, params=None):
    r = requests.get(f'{URL}/rest/v1/{path}', headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(path, params, payload):
    r = requests.patch(f'{URL}/rest/v1/{path}', headers=HEADERS, params=params, json=payload, timeout=30)
    if r.status_code >= 400:
        print(f'  ✖ PATCH {path} failed: {r.status_code} {r.text[:200]}')
    return r.status_code < 400


def get_org_taxonomies(org_id):
    """Récupère les noms FR des tags taxonomiques d'une orga."""
    sdg_links = sb_get('org_sdg_goals', {'org_id': f'eq.{org_id}', 'select': 'sdg_id'})
    dac_links = sb_get('org_dac_sectors', {'org_id': f'eq.{org_id}', 'select': 'sector_id'})
    pop_links = sb_get('org_target_populations', {'org_id': f'eq.{org_id}', 'select': 'population_slug'})
    geo_links = sb_get('org_action_geographies', {'org_id': f'eq.{org_id}', 'select': 'geography_slug'})

    sdg_names, dac_names, pop_names, geo_names = [], [], [], []
    if sdg_links:
        ids = [s['sdg_id'] for s in sdg_links]
        ids_csv = ','.join(str(i) for i in ids)
        rows = sb_get('sdg_goals', {'id': f'in.({ids_csv})', 'select': 'name_fr'})
        sdg_names = [r['name_fr'] for r in rows]
    if dac_links:
        ids = [s['sector_id'] for s in dac_links]
        ids_csv = ','.join(f'"{i}"' for i in ids)
        rows = sb_get('dac_sectors', {'id': f'in.({ids_csv})', 'select': 'name_fr'})
        dac_names = [r['name_fr'] for r in rows]
    if pop_links:
        slugs = [s['population_slug'] for s in pop_links]
        slugs_csv = ','.join(f'"{s}"' for s in slugs)
        rows = sb_get('target_populations', {'slug': f'in.({slugs_csv})', 'select': 'name_fr'})
        pop_names = [r['name_fr'] for r in rows]
    if geo_links:
        slugs = [s['geography_slug'] for s in geo_links]
        slugs_csv = ','.join(f'"{s}"' for s in slugs)
        rows = sb_get('action_geographies', {'slug': f'in.({slugs_csv})', 'select': 'name_fr'})
        geo_names = [r['name_fr'] for r in rows]

    return sdg_names, dac_names, pop_names, geo_names


def get_opp_taxonomies(opp_id):
    sdg_links = sb_get('opp_sdg_goals', {'opportunity_id': f'eq.{opp_id}', 'select': 'sdg_id'})
    dac_links = sb_get('opp_dac_sectors', {'opportunity_id': f'eq.{opp_id}', 'select': 'sector_id'})
    pop_links = sb_get('opp_target_populations', {'opportunity_id': f'eq.{opp_id}', 'select': 'population_slug'})

    sdg_names, dac_names, pop_names = [], [], []
    if sdg_links:
        ids_csv = ','.join(str(s['sdg_id']) for s in sdg_links)
        rows = sb_get('sdg_goals', {'id': f'in.({ids_csv})', 'select': 'name_fr'})
        sdg_names = [r['name_fr'] for r in rows]
    if dac_links:
        ids_csv = ','.join(f'"{s["sector_id"]}"' for s in dac_links)
        rows = sb_get('dac_sectors', {'id': f'in.({ids_csv})', 'select': 'name_fr'})
        dac_names = [r['name_fr'] for r in rows]
    if pop_links:
        slugs_csv = ','.join(f'"{s["population_slug"]}"' for s in pop_links)
        rows = sb_get('target_populations', {'slug': f'in.({slugs_csv})', 'select': 'name_fr'})
        pop_names = [r['name_fr'] for r in rows]

    return sdg_names, dac_names, pop_names


def backfill_orgs(limit=None, force=False):
    print('═══ Backfill embeddings — Organisations ═══')
    params = {'select': 'id,name,description,action_summary,intervention_themes_text,past_projects,city,region,org_type,embedding,embedding_updated_at,updated_at'}
    if not force:
        params['embedding'] = 'is.null'
    if limit:
        params['limit'] = str(limit)
    orgs = sb_get('organizations', params)
    print(f'  {len(orgs)} organisations à traiter')

    done = 0
    for org in orgs:
        sdg, dac, pops, geos = get_org_taxonomies(org['id'])
        text = build_org_text(
            org,
            sdg_names=sdg, dac_names=dac,
            populations=pops, geographies=geos,
            past_projects=org.get('past_projects') or [],
        )
        if not text.strip():
            print(f'  → skip {org["name"]} (texte vide)')
            continue
        vec, model = get_embedding(text)
        ok = sb_patch('organizations', {'id': f'eq.{org["id"]}'}, {
            'embedding': vec,
            'embedding_model': model,
            'embedding_updated_at': 'now()',
        })
        print(f'  ✓ {org["name"][:60]} ({model})' if ok else f'  ✖ {org["name"][:60]}')
        if ok:
            done += 1
        time.sleep(0.2)
    print(f'  → {done} orgs embedded\n')


def backfill_opps(limit=None, force=False):
    print('═══ Backfill embeddings — Opportunités ═══')
    params = {
        'select': 'id,title,donor_id,donors(name),type,summary,description,eligibility,countries_eligible,embedding',
        'status': 'eq.published',
    }
    if not force:
        params['embedding'] = 'is.null'
    if limit:
        params['limit'] = str(limit)
    opps = sb_get('opportunities', params)
    print(f'  {len(opps)} opportunités à traiter')

    done = 0
    for opp in opps:
        # opportunities.donor_id -> donors.name (la table n'a pas de colonne donor_name)
        opp['donor_name'] = (opp.get('donors') or {}).get('name')
        sdg, dac, pops = get_opp_taxonomies(opp['id'])
        text = build_opportunity_text(opp, sdg_names=sdg, dac_names=dac, populations=pops)
        if len(text) < 30:
            continue
        vec, model = get_embedding(text)
        ok = sb_patch('opportunities', {'id': f'eq.{opp["id"]}'}, {
            'embedding': vec,
            'embedding_model': model,
            'embedding_updated_at': 'now()',
        })
        print(f'  ✓ {opp["title"][:60]} ({model})' if ok else f'  ✖ {opp["title"][:60]}')
        if ok:
            done += 1
        time.sleep(0.2)
    print(f'  → {done} opportunités embedded\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--orgs', action='store_true')
    ap.add_argument('--opps', action='store_true')
    ap.add_argument('--force', action='store_true', help='Re-embed même si déjà fait')
    ap.add_argument('--limit', type=int, default=None)
    args = ap.parse_args()

    if not args.orgs and not args.opps:
        args.orgs = args.opps = True

    if args.orgs:
        backfill_orgs(limit=args.limit, force=args.force)
    if args.opps:
        backfill_opps(limit=args.limit, force=args.force)


if __name__ == '__main__':
    main()
