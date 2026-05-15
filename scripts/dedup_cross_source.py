"""Cross-source semantic dedup — audit §7.3.

Pour chaque opp publiée (avec embedding), appelle la RPC
`find_similar_opportunities` (cosine >= 0.92 par défaut). Si un match
existe vers une opp d'une AUTRE source ET déjà canonique :
  - marque l'opp courante comme `duplicate_of_id = canonique.id`
  - ajoute son source_id au tableau `seen_on_source_ids` de la canonique

Stratégie : traite les opps newest-first. Les plus anciennes restent
canoniques. Idempotent : ne retraite pas les opps déjà marquées comme
duplicates (sauf si --force).

Usage :
  python scripts/dedup_cross_source.py
  python scripts/dedup_cross_source.py --threshold 0.94
  python scripts/dedup_cross_source.py --dry-run
  python scripts/dedup_cross_source.py --force         # re-évalue tout
"""
import argparse
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parent.parent
    for name in ('.env.local', '.env'):
        p = root / name
        if p.exists():
            load_dotenv(p, override=True)
except ImportError:
    pass

import requests

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    print('✖ NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis')
    sys.exit(1)

H = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
}


def sb_get(path, params=None):
    r = requests.get(f'{URL}/rest/v1/{path}', headers=H, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(path, params, payload):
    r = requests.patch(f'{URL}/rest/v1/{path}', headers=H, params=params, json=payload, timeout=30)
    r.raise_for_status()
    return r


def sb_rpc(fn, payload):
    r = requests.post(f'{URL}/rest/v1/rpc/{fn}', headers=H, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--threshold', type=float, default=0.92,
                    help='Seuil de similarité cosine (0..1). 0.92 = très proche.')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--force', action='store_true',
                    help='Re-évalue même les opps déjà marquées comme duplicates.')
    args = ap.parse_args()

    # Charger les opps publiées avec embedding.
    # Newest-first : les anciennes restent canoniques par défaut.
    params = {
        'select': 'id,title,source_id,published_at,duplicate_of_id,embedding_model,seen_on_source_ids',
        'status': 'eq.published',
        'order': 'published_at.desc',
        'embedding_model': 'not.is.null',
    }
    opps = sb_get('opportunities', params)
    print(f'═══ Cross-source dedup — {len(opps)} opps avec embedding ═══')
    print(f'   threshold cosine={args.threshold}, force={args.force}, dry_run={args.dry_run}\n')

    stats = {'evaluated': 0, 'marked_dup': 0, 'already_dup_kept': 0, 'no_match': 0, 'same_source_skip': 0}

    for opp in opps:
        if opp.get('duplicate_of_id') and not args.force:
            stats['already_dup_kept'] += 1
            continue
        stats['evaluated'] += 1

        # find_similar retourne les canoniques proches (duplicate_of_id IS NULL côté SQL)
        try:
            matches = sb_rpc('find_similar_opportunities', {
                'p_opp_id': opp['id'],
                'p_threshold': args.threshold,
                'p_limit': 5,
            })
        except requests.HTTPError as e:
            print(f'  ✖ RPC fail on {opp["id"][:8]}: {e.response.status_code} {e.response.text[:150]}')
            continue

        # Filtre : on cherche un match d'UNE AUTRE source (cross-source).
        # Si la match est sur la même source, c'est probablement déjà géré par
        # la dédup URL/external_id à l'ingest — on passe.
        cross_source_matches = [m for m in (matches or []) if m['source_id'] != opp['source_id']]
        if not cross_source_matches:
            if matches:
                stats['same_source_skip'] += 1
            else:
                stats['no_match'] += 1
            continue

        # Prend le plus ancien (par published_at ascending parmi les matches)
        canonical = min(cross_source_matches, key=lambda m: m.get('published_at') or '9999')
        sim = float(canonical['similarity'])
        title_a = (opp['title'] or '')[:55]
        title_b = (canonical['title'] or '')[:55]
        print(f'  ⚐ {sim:.4f} | dup: {title_a}')
        print(f'           ↳ canon: {title_b}')

        if args.dry_run:
            stats['marked_dup'] += 1
            continue

        # Marque comme duplicate
        sb_patch('opportunities', {'id': f'eq.{opp["id"]}'}, {
            'duplicate_of_id': canonical['id'],
        })
        # Ajoute le source_id de la dup au canonique (si pas déjà)
        existing_sources = set()
        try:
            canon_row = sb_get('opportunities', {'id': f'eq.{canonical["id"]}', 'select': 'seen_on_source_ids'})
            if canon_row:
                existing_sources = set(canon_row[0].get('seen_on_source_ids') or [])
        except Exception:
            pass
        existing_sources.add(canonical['source_id'])
        existing_sources.add(opp['source_id'])
        sb_patch('opportunities', {'id': f'eq.{canonical["id"]}'}, {
            'seen_on_source_ids': list(existing_sources),
        })
        stats['marked_dup'] += 1

    print()
    print('=== Résumé ===')
    for k, v in stats.items():
        print(f'  {k:24s} : {v}')


if __name__ == '__main__':
    main()
