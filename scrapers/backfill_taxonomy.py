#!/usr/bin/env python
"""Backfill taxonomy — classe les opportunités existantes sur SDG + DAC + populations
via Claude. Utilise les référentiels seedés en base.

Usage :
  python scrapers/backfill_taxonomy.py --limit 50
  python scrapers/backfill_taxonomy.py --force        # reclasse même si déjà tagué
"""
import argparse
import json
import os
import re
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

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY')
MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')

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


def sb_post(path, payload):
    r = requests.post(f'{URL}/rest/v1/{path}', headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'}, json=payload, timeout=30)
    return r.status_code < 400


def sb_delete(path, params):
    r = requests.delete(f'{URL}/rest/v1/{path}', headers=HEADERS, params=params, timeout=30)
    return r.status_code < 400


def classify_with_claude(title: str, summary: str, description: str,
                          sdg_list: list, dac_list: list, pop_list: list) -> dict:
    if not ANTHROPIC_KEY:
        return _classify_heuristic(title, summary, description, sdg_list, dac_list, pop_list)

    sdg_str = '\n'.join([f"- {s['id']}: {s['name_fr']}" for s in sdg_list])
    dac_str = '\n'.join([f"- {s['id']}: {s['name_fr']}" for s in dac_list[:30]])
    pop_str = '\n'.join([f"- {p['slug']}: {p['name_fr']}" for p in pop_list])

    prompt = f"""Tu es un classificateur d'appels à projets pour ONG/associations.

Voici une opportunité de financement à classifier :

TITRE : {title}

RÉSUMÉ : {(summary or '')[:500]}

DESCRIPTION : {(description or '')[:2500]}

Choisis EXCLUSIVEMENT parmi ces référentiels :

OBJECTIFS DE DÉVELOPPEMENT DURABLE (SDG) — choisir 1 à 4 :
{sdg_str}

SECTEURS OCDE-DAC — choisir 1 à 3 :
{dac_str}

POPULATIONS CIBLES (slugs) — choisir 1 à 3 (ou aucune si pas de ciblage précis) :
{pop_str}

Réponds en JSON strict (et UNIQUEMENT en JSON) :
{{"sdg_ids": [5, 8], "dac_sector_ids": ["15170", "16020"], "population_slugs": ["women", "rural"]}}"""

    try:
        r = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': MODEL,
                'max_tokens': 400,
                'messages': [{'role': 'user', 'content': prompt}],
            },
            timeout=30,
        )
        r.raise_for_status()
        text = r.json()['content'][0]['text']
        # Retire d'éventuelles fences markdown ```json ... ```
        text = re.sub(r'^```(?:json)?|```$', '', text.strip(), flags=re.MULTILINE).strip()
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if not m:
            print(f'  ! Claude: pas de JSON dans la réponse: {text[:120]!r}')
            return {}
        return _normalize_cls(json.loads(m.group(0)))
    except Exception as e:
        print(f'  ! Claude failed: {e}, fallback heuristique')
        return _classify_heuristic(title, summary, description, sdg_list, dac_list, pop_list)


def _normalize_cls(raw: dict) -> dict:
    """Tolère les variantes de noms de clés que Haiku peut renvoyer."""
    def pick(*keys):
        for k in keys:
            v = raw.get(k)
            if v:
                return v
        return []
    return {
        'sdg_ids': pick('sdg_ids', 'sdg', 'sdgs', 'sdg_goal_ids'),
        'dac_sector_ids': pick('dac_sector_ids', 'dac_sectors', 'dac', 'dac_ids', 'sector_ids'),
        'population_slugs': pick('population_slugs', 'populations', 'population', 'pop_slugs', 'pops'),
    }


def _classify_heuristic(title, summary, description, sdg_list, dac_list, pop_list):
    """Classification basique par keywords si pas de Claude."""
    text = ' '.join(filter(None, [title or '', summary or '', description or ''])).lower()
    sdg_ids, dac_ids, pop_slugs = [], [], []
    for s in sdg_list:
        for kw in s.get('keywords') or []:
            if kw.lower() in text:
                sdg_ids.append(s['id']); break
    for d in dac_list:
        for kw in d.get('keywords') or []:
            if kw.lower() in text:
                dac_ids.append(d['id']); break
    for p in pop_list:
        for kw in p.get('keywords') or []:
            if kw.lower() in text:
                pop_slugs.append(p['slug']); break
    return {
        'sdg_ids': sdg_ids[:4],
        'dac_sector_ids': dac_ids[:3],
        'population_slugs': pop_slugs[:3],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=None)
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    print('═══ Backfill taxonomy — Opportunités ═══')

    # Charge les référentiels
    sdg_list = sb_get('sdg_goals', {'select': 'id,name_fr,keywords'})
    dac_list = sb_get('dac_sectors', {'select': 'id,name_fr,keywords'})
    pop_list = sb_get('target_populations', {'select': 'slug,name_fr,keywords'})
    print(f'  Référentiels : {len(sdg_list)} SDG, {len(dac_list)} DAC, {len(pop_list)} populations')

    # Charge les opp à classer
    params = {
        'select': 'id,title,summary,description,status',
        'status': 'eq.published',
    }
    if args.limit:
        params['limit'] = str(args.limit)
    opps = sb_get('opportunities', params)
    print(f'  {len(opps)} opportunités candidates')

    done = 0
    for opp in opps:
        # Skip si déjà tagué (sauf --force)
        if not args.force:
            tagged = sb_get('opp_sdg_goals', {'opportunity_id': f'eq.{opp["id"]}', 'select': 'sdg_id', 'limit': '1'})
            if tagged:
                continue

        cls = classify_with_claude(
            opp['title'], opp.get('summary') or '', opp.get('description') or '',
            sdg_list, dac_list, pop_list,
        )
        # Si Claude renvoie tout vide, on tente la classification heuristique
        # (mots-clés) avant d'abandonner — évite les opp sans aucun tag.
        if cls and not any([cls.get('sdg_ids'), cls.get('dac_sector_ids'), cls.get('population_slugs')]):
            cls = _classify_heuristic(
                opp['title'], opp.get('summary') or '', opp.get('description') or '',
                sdg_list, dac_list, pop_list,
            )
        if not cls:
            continue

        # Reset & insert
        if args.force:
            sb_delete('opp_sdg_goals', {'opportunity_id': f'eq.{opp["id"]}'})
            sb_delete('opp_dac_sectors', {'opportunity_id': f'eq.{opp["id"]}'})
            sb_delete('opp_target_populations', {'opportunity_id': f'eq.{opp["id"]}'})

        sdg_ids = cls.get('sdg_ids') or []
        dac_ids = cls.get('dac_sector_ids') or []
        pop_slugs = cls.get('population_slugs') or []

        if sdg_ids:
            sb_post('opp_sdg_goals', [{'opportunity_id': opp['id'], 'sdg_id': sid} for sid in sdg_ids if isinstance(sid, int)])
        if dac_ids:
            sb_post('opp_dac_sectors', [{'opportunity_id': opp['id'], 'sector_id': sid} for sid in dac_ids if isinstance(sid, str)])
        if pop_slugs:
            sb_post('opp_target_populations', [{'opportunity_id': opp['id'], 'population_slug': s} for s in pop_slugs if isinstance(s, str)])

        print(f'  ✓ {opp["title"][:60]} → SDG {sdg_ids} | DAC {dac_ids} | pop {pop_slugs}')
        done += 1
        time.sleep(0.3)

    print(f'\n  → {done} opportunités classées')


if __name__ == '__main__':
    main()
