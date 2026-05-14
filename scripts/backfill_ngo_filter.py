#!/usr/bin/env python
"""Backfill : classifie toutes les opportunités existantes selon le NGO-fit filter.

Usage :
    python scripts/backfill_ngo_filter.py
    python scripts/backfill_ngo_filter.py --dry-run         # affiche sans modifier
    python scripts/backfill_ngo_filter.py --only-unclassified  # ignore celles déjà classées
    python scripts/backfill_ngo_filter.py --status published    # ne traite que les publiées

Requiert .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
"""
import argparse
import os
import sys
import json
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
from scrapers.utils.ngo_filter import classify_ngo_fit


def supabase_request(method, path, params=None, json_body=None):
    base = os.environ['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    res = requests.request(
        method, f'{base}/rest/v1{path}',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        params=params, json=json_body, timeout=30,
    )
    res.raise_for_status()
    return res.json() if res.content else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only-unclassified', action='store_true')
    ap.add_argument('--status', choices=['draft', 'published', 'archived', 'all'], default='all')
    ap.add_argument('--limit', type=int, default=100)
    args = ap.parse_args()

    params = {
        'select': 'id,title,summary,description,ngo_relevant,status',
        'order': 'created_at.desc',
        'limit': str(args.limit),
    }
    if args.only_unclassified:
        params['ngo_relevant'] = 'is.null'
    if args.status != 'all':
        params['status'] = f'eq.{args.status}'

    opps = supabase_request('GET', '/opportunities', params=params)
    print(f'→ {len(opps)} opportunités à traiter\n')

    stats = {'yes': 0, 'no': 0, 'unsure': 0, 'updated': 0}
    for o in opps:
        result = classify_ngo_fit(o.get('title', ''), o.get('description', ''), o.get('summary', ''))
        label = result['ngo_relevant']
        emoji = '✅' if label is True else '❌' if label is False else '❓'
        print(f"{emoji} [{result['ngo_relevance_score']:>3}] {(o['title'] or '')[:80]}")
        print(f"     → {result['ngo_relevance_reason']}")

        if label is True: stats['yes'] += 1
        elif label is False: stats['no'] += 1
        else: stats['unsure'] += 1

        if args.dry_run:
            continue

        # Update
        supabase_request(
            'PATCH',
            '/opportunities',
            params={'id': f'eq.{o["id"]}'},
            json_body={
                'ngo_relevant': result['ngo_relevant'],
                'ngo_relevance_score': result['ngo_relevance_score'],
                'ngo_relevance_reason': result['ngo_relevance_reason'],
                'target_org_types': result['target_org_types'],
            },
        )
        stats['updated'] += 1

    print('\n=== Bilan ===')
    print(f"  ✅ NGO pertinent   : {stats['yes']}")
    print(f"  ❌ Non pertinent   : {stats['no']}")
    print(f"  ❓ Ambigu          : {stats['unsure']}")
    print(f"  📝 Updated en base : {stats['updated']}{' (DRY RUN)' if args.dry_run else ''}")


if __name__ == '__main__':
    main()
