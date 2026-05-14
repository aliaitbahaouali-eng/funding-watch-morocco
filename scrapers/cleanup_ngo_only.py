#!/usr/bin/env python
"""Cleanup base : ne garder QUE les appels d'offres pour ONG/associations.

Supprime via l'API REST Supabase (service_role) :
  - opportunités ngo_relevant = false
  - opportunités dont le titre matche les patterns d'exclusion stricts
  - opportunités published avec un score NGO-fit < 40

Usage : python scrapers/cleanup_ngo_only.py [--dry-run]
"""
import argparse
import os
import re
import sys
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

import requests

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE')

if not URL or not KEY:
    print('ERROR: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    sys.exit(1)

HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

EXCLUDE_REGEX = re.compile(
    r'\b(scholarship|fellowship|phd\s*grant|master\s*grant|'
    r'bourse\s+étudiant|bourse\s+individuelle|'
    r'vacancy|vacancies|job\s+(posting|opening|offer)|'
    r"offres?\s+d['']?emplois?|recrutement\s+individuel|consultant\s+individuel|"
    r'individual\s+consultant|internship|stage\s+rémunéré|trainee\s+position|'
    r'supply\s+of|fourniture\s+de\s+matériel|software\s+license|'
    r'équipement\s+informatique|early\s+career\s+award|young\s+researcher|'
    r'personal\s+award|individual\s+prize)\b',
    re.IGNORECASE,
)


def fetch_all_opportunities():
    """Récupère toutes les opportunités (paginé par 1000)."""
    out, offset = [], 0
    while True:
        r = requests.get(
            f'{URL}/rest/v1/opportunities',
            headers=HEADERS,
            params={
                'select': 'id,title,status,ngo_relevant,ngo_relevance_score',
                'limit': 1000,
                'offset': offset,
            },
            timeout=30,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return out


def delete_ids(ids: list, dry_run: bool = False):
    if not ids:
        return 0
    if dry_run:
        print(f'  [dry-run] DELETE {len(ids)} rows')
        return len(ids)
    # Supabase DELETE accepte un filtre `in.(uuid1,uuid2)`
    deleted = 0
    for chunk_start in range(0, len(ids), 100):
        chunk = ids[chunk_start:chunk_start + 100]
        ids_csv = ','.join(chunk)
        r = requests.delete(
            f'{URL}/rest/v1/opportunities',
            headers=HEADERS,
            params={'id': f'in.({ids_csv})'},
            timeout=30,
        )
        r.raise_for_status()
        deleted += len(chunk)
    return deleted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='Ne supprime rien, affiche juste')
    args = ap.parse_args()

    print('═══════════════════════════════════════════════')
    print(' CLEANUP : ne garder QUE les appels pour ONG')
    print(f' Mode : {"DRY-RUN" if args.dry_run else "DELETE"}')
    print('═══════════════════════════════════════════════\n')

    opps = fetch_all_opportunities()
    print(f'Total opportunités : {len(opps)}\n')

    to_delete = {
        'non_ngo': [],
        'excluded_title': [],
        'published_low_score': [],
    }

    for o in opps:
        # 1. Non-ONG explicites
        if o.get('ngo_relevant') is False:
            to_delete['non_ngo'].append(o)
            continue
        # 2. Titre matche un pattern d'exclusion
        title = o.get('title') or ''
        if EXCLUDE_REGEX.search(title):
            to_delete['excluded_title'].append(o)
            continue
        # 3. Published avec score < 40
        if o.get('status') == 'published' and (
            o.get('ngo_relevant') is None
            or (o.get('ngo_relevance_score') or 0) < 40
        ):
            to_delete['published_low_score'].append(o)

    print('Catégories à supprimer :')
    print(f'  - ngo_relevant=false      : {len(to_delete["non_ngo"])}')
    print(f'  - titre exclu             : {len(to_delete["excluded_title"])}')
    print(f'  - published score < 40    : {len(to_delete["published_low_score"])}')
    print()

    # Affiche les 10 premiers de chaque cat
    for cat, items in to_delete.items():
        if not items:
            continue
        print(f'  [{cat}] {len(items)} items — exemples :')
        for it in items[:10]:
            print(f'    - {(it.get("title") or "")[:80]} (score={it.get("ngo_relevance_score")})')
        if len(items) > 10:
            print(f'    ... et {len(items) - 10} autres')
        print()

    all_ids = list({i['id'] for items in to_delete.values() for i in items})
    print(f'Total unique à supprimer : {len(all_ids)}\n')

    if not all_ids:
        print('Rien à supprimer.')
        return

    deleted = delete_ids(all_ids, dry_run=args.dry_run)
    if args.dry_run:
        print(f'\n[dry-run] {deleted} suppressions simulées. Relance sans --dry-run pour appliquer.')
    else:
        print(f'\n✓ {deleted} opportunités supprimées.')

    # Final count
    final = fetch_all_opportunities()
    ngo = sum(1 for o in final if o.get('ngo_relevant') is True)
    print(f'\nÉtat final :')
    print(f'  Total opportunités : {len(final)}')
    print(f'  Dont ngo_relevant=true : {ngo}')


if __name__ == '__main__':
    main()
