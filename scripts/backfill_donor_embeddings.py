"""Backfill donor profile embeddings — Sprint 4E.

Pour chaque donneur, construit un texte sémantique riche :
  - nom + type + pays + description du donneur
  - titres + résumés (truncated) de ses opps publiées (max 8)
  - thématiques SDG/DAC dominantes (top 3)

Embed via OpenAI text-embedding-3-small, met à jour donors.profile_embedding.

Idempotent : skip les donneurs déjà embeddés sauf --force.

Usage :
  python scripts/backfill_donor_embeddings.py
  python scripts/backfill_donor_embeddings.py --limit 20
  python scripts/backfill_donor_embeddings.py --force
  python scripts/backfill_donor_embeddings.py --donor-id <uuid>
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
            load_dotenv(p, override=True)
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
from scrapers.ai.embeddings import get_embedding

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    print('X NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis')
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
    return r.status_code < 400


def build_donor_text(donor, opps, top_sdgs=None, top_dacs=None):
    """Sérialise un donneur en texte sémantique pour embedding."""
    parts = []
    if donor.get('name'):
        parts.append(f"Bailleur : {donor['name']}")
    if donor.get('type'):
        parts.append(f"Type : {donor['type']}")
    if donor.get('country'):
        parts.append(f"Pays : {donor['country']}")
    if donor.get('description'):
        parts.append(f"Description : {donor['description'][:500]}")
    if top_sdgs:
        parts.append(f"Thématiques SDG dominantes : {', '.join(top_sdgs[:5])}")
    if top_dacs:
        parts.append(f"Secteurs OCDE-DAC dominants : {', '.join(top_dacs[:5])}")
    if opps:
        titles = [(o.get('title') or '').strip()[:140] for o in opps[:8] if o.get('title')]
        if titles:
            parts.append('Appels à projets récents :')
            parts.append('\n'.join(f'- {t}' for t in titles))
    return '\n'.join(parts)


def get_donor_top_taxonomies(donor_id):
    """Récupère les top SDG + DAC noms qui apparaissent dans les opps de ce donneur."""
    opps = sb_get('opportunities', {
        'select': 'id', 'donor_id': f'eq.{donor_id}', 'status': 'eq.published', 'limit': '50'
    })
    opp_ids = [o['id'] for o in opps]
    if not opp_ids:
        return [], []
    ids_csv = ','.join(opp_ids)

    sdg_links = sb_get('opp_sdg_goals', {
        'select': 'sdg_id', 'opportunity_id': f'in.({ids_csv})'
    })
    dac_links = sb_get('opp_dac_sectors', {
        'select': 'sector_id', 'opportunity_id': f'in.({ids_csv})'
    })

    sdg_counts = {}
    for r in sdg_links:
        sid = r['sdg_id']; sdg_counts[sid] = sdg_counts.get(sid, 0) + 1
    dac_counts = {}
    for r in dac_links:
        sid = r['sector_id']; dac_counts[sid] = dac_counts.get(sid, 0) + 1

    top_sdg_ids = sorted(sdg_counts.keys(), key=lambda k: -sdg_counts[k])[:5]
    top_dac_ids = sorted(dac_counts.keys(), key=lambda k: -dac_counts[k])[:5]

    sdg_names = []
    if top_sdg_ids:
        ids_csv2 = ','.join(str(i) for i in top_sdg_ids)
        rows = sb_get('sdg_goals', {'id': f'in.({ids_csv2})', 'select': 'name_fr'})
        sdg_names = [r['name_fr'] for r in rows]
    dac_names = []
    if top_dac_ids:
        ids_csv2 = ','.join(f'"{i}"' for i in top_dac_ids)
        rows = sb_get('dac_sectors', {'id': f'in.({ids_csv2})', 'select': 'name_fr'})
        dac_names = [r['name_fr'] for r in rows]
    return sdg_names, dac_names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true', help='Re-embed même si déjà fait')
    ap.add_argument('--limit', type=int, default=None)
    ap.add_argument('--donor-id', help='UUID d\'un seul donneur à traiter')
    args = ap.parse_args()

    params = {'select': 'id,name,type,country,description,profile_embedding'}
    if not args.force:
        params['profile_embedding'] = 'is.null'
    if args.donor_id:
        params['id'] = f'eq.{args.donor_id}'
    if args.limit:
        params['limit'] = str(args.limit)

    donors = sb_get('donors', params)
    print(f'=== Backfill donor embeddings — {len(donors)} donneurs ===\n')

    done = 0
    for donor in donors:
        opps = sb_get('opportunities', {
            'select': 'title,summary', 'donor_id': f'eq.{donor["id"]}',
            'status': 'eq.published', 'order': 'published_at.desc', 'limit': '10'
        })
        sdg_names, dac_names = get_donor_top_taxonomies(donor['id'])
        text = build_donor_text(donor, opps, sdg_names, dac_names)
        if len(text.strip()) < 30:
            print(f'  -> skip {donor["name"]} (texte trop court)')
            continue
        vec, model = get_embedding(text)
        ok = sb_patch('donors', {'id': f'eq.{donor["id"]}'}, {
            'profile_embedding': vec,
            'profile_embedding_model': model,
            'profile_embedding_updated_at': 'now()',
        })
        status = 'OK' if ok else 'FAIL'
        print(f'  [{status}] {donor["name"][:50]:<50s} ({model}, {len(opps)} opps)')
        if ok:
            done += 1
        time.sleep(0.2)

    print(f'\n-> {done} donneurs embeddés')


if __name__ == '__main__':
    main()
