#!/usr/bin/env python3
"""Backfill Morocco strict — Sprint 5D (2026-05-26).

Reclassifie TOUTES les opportunites en base avec la nouvelle logique a 5 niveaux
(explicit / regional / global / excluded / unknown).

Usage :
  python scrapers/backfill_morocco_strict.py             # dry-run par defaut
  python scrapers/backfill_morocco_strict.py --apply     # applique en DB
  python scrapers/backfill_morocco_strict.py --apply --archive  # + archive global/excluded
  python scrapers/backfill_morocco_strict.py --apply --use-llm  # + appel Claude pour ambigus

Securite :
  - Pas de delete, juste UPDATE morocco_eligibility et eventuellement status='archived'
  - Pas d'exposition de service_role key (lue depuis .env.local)
  - Reversible : on garde toujours morocco_eligible bool comme fallback
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

import requests

# Importer la nouvelle logique de classification
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scrapers.utils.ai_detect import classify_morocco_eligibility, classify_morocco_strict

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE')

if not URL or not KEY:
    print('ERROR: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    sys.exit(1)

HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}


def fetch_all_opportunities():
    """Pagine toutes les opportunites (par 500)."""
    out, offset = [], 0
    while True:
        r = requests.get(
            f'{URL}/rest/v1/opportunities',
            headers=HEADERS,
            params={
                'select': 'id,title,summary,description,status,morocco_eligibility,morocco_eligible',
                'limit': 500,
                'offset': offset,
            },
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
    return out


def update_opportunity(opp_id, new_level, new_status=None):
    """UPDATE morocco_eligibility + eventuellement status."""
    payload = {'morocco_eligibility': new_level}
    if new_status:
        payload['status'] = new_status
        payload['updated_at'] = 'now()'
    r = requests.patch(
        f'{URL}/rest/v1/opportunities',
        headers=HEADERS,
        params={'id': f'eq.{opp_id}'},
        json=payload,
        timeout=30,
    )
    r.raise_for_status()
    return True


def main():
    ap = argparse.ArgumentParser(description='Backfill Morocco strict')
    ap.add_argument('--apply', action='store_true', help='Applique en DB (sinon dry-run)')
    ap.add_argument('--archive', action='store_true', help='Archive global+excluded en status=archived')
    ap.add_argument('--use-llm', action='store_true', help='Appelle Claude pour les cas ambigus (consomme du credit)')
    ap.add_argument('--limit', type=int, default=0, help='Limite le nombre de rows traites (debug)')
    args = ap.parse_args()

    print('=' * 60)
    print(' BACKFILL MOROCCO STRICT — Sprint 5D')
    print(f' Mode : {"APPLY" if args.apply else "DRY-RUN"}')
    print(f' Archive global/excluded : {args.archive}')
    print(f' Use LLM : {args.use_llm}')
    print('=' * 60)
    print()

    opps = fetch_all_opportunities()
    if args.limit:
        opps = opps[:args.limit]
    print(f'Opportunites a reclassifier : {len(opps)}\n')

    stats = {
        'explicit': 0, 'regional': 0, 'global': 0,
        'excluded': 0, 'unknown': 0,
        'changed': 0, 'archived': 0, 'errors': 0,
        'llm_calls': 0,
    }
    transitions = {}

    for i, opp in enumerate(opps, 1):
        text = ' '.join(filter(None, [
            opp.get('title') or '',
            opp.get('summary') or '',
            (opp.get('description') or '')[:2000],
        ]))

        old_level = opp.get('morocco_eligibility') or ('regional' if opp.get('morocco_eligible') else 'unknown')

        if args.use_llm:
            clf = classify_morocco_strict(opp.get('title') or '', opp.get('description') or '', opp.get('summary') or '')
            new_level = clf['level']
            if clf.get('source') == 'llm':
                stats['llm_calls'] += 1
        else:
            new_level, _ = classify_morocco_eligibility(text)

        stats[new_level] += 1
        key = f'{old_level} -> {new_level}'
        transitions[key] = transitions.get(key, 0) + 1

        # Decider si on archive
        should_archive = (
            args.archive
            and opp.get('status') == 'published'
            and new_level in ('excluded',)  # 'global' n'est plus archive par defaut, juste masque
        )
        new_status = 'archived' if should_archive else None

        if new_level != old_level or new_status:
            stats['changed'] += 1
            if should_archive:
                stats['archived'] += 1
            if args.apply:
                try:
                    update_opportunity(opp['id'], new_level, new_status)
                    if i % 50 == 0:
                        print(f'  [{i}/{len(opps)}] processed ({stats["changed"]} changed)')
                except Exception as e:
                    stats['errors'] += 1
                    print(f'  ERROR on {opp["id"]}: {e}')
                # rate-limit doux pour LLM
                if args.use_llm:
                    time.sleep(0.5)

    print('\n' + '=' * 60)
    print(' RESULTATS')
    print('=' * 60)
    print(f'\nDistribution finale (nouvelle classification) :')
    for k in ('explicit', 'regional', 'global', 'excluded', 'unknown'):
        pct = 100.0 * stats[k] / max(1, len(opps))
        print(f'  {k:12s} : {stats[k]:5d}  ({pct:5.1f}%)')

    print(f'\nTransitions :')
    for k, v in sorted(transitions.items(), key=lambda x: -x[1]):
        print(f'  {k:30s} : {v}')

    print(f'\nChanges : {stats["changed"]}  Archives : {stats["archived"]}  Errors : {stats["errors"]}')
    if stats['llm_calls']:
        print(f'LLM calls : {stats["llm_calls"]}')

    if not args.apply:
        print('\n[DRY-RUN] Aucune modification appliquee. Relance avec --apply pour appliquer.')
    else:
        print('\nBackfill termine.')


if __name__ == '__main__':
    main()
