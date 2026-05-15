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
            # override=True : le .env.local doit gagner sur les env vars du shell,
            # qui peuvent contenir des valeurs vides shadowant les vraies clés.
            load_dotenv(p, override=True)
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests

URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY')
MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')

# Global token usage stats — printed at the end of main()
TOKEN_STATS = {
    'claude_calls': 0,
    'heuristic_only': 0,
    'input_tokens': 0,
    'output_tokens': 0,
    'cache_creation_tokens': 0,
    'cache_read_tokens': 0,
}

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


def _build_referentials_block(sdg_list, dac_list, pop_list):
    """Bloc référentiel statique — réutilisé entre appels. Format compact
    (sans keywords) pour ne pas alourdir le prompt. Le `cache_control`
    placé en cache reste actif : si le bloc dépasse le seuil minimum du
    modèle (1024 tokens Sonnet / 2048 tokens Haiku), Anthropic met en
    cache automatiquement ; sinon, no-op (pas de pénalité)."""
    sdg = '\n'.join([f"- {s['id']}: {s['name_fr']}" for s in sdg_list])
    dac = '\n'.join([f"- {s['id']}: {s['name_fr']}" for s in dac_list])
    pop = '\n'.join([f"- {p['slug']}: {p['name_fr']}" for p in pop_list])
    return (
        f"OBJECTIFS DE DÉVELOPPEMENT DURABLE (SDG) — choisir 1 à 4 :\n{sdg}\n\n"
        f"SECTEURS OCDE-DAC — choisir 1 à 3 :\n{dac}\n\n"
        f"POPULATIONS CIBLES (slugs) — choisir 1 à 3 (ou aucune si pas de ciblage précis) :\n{pop}"
    )


def classify_with_claude(title: str, summary: str, description: str,
                          sdg_list: list, dac_list: list, pop_list: list) -> dict:
    if not ANTHROPIC_KEY:
        return _classify_heuristic(title, summary, description, sdg_list, dac_list, pop_list)

    referentials = _build_referentials_block(sdg_list, dac_list, pop_list)

    # System en 2 blocs : instructions courtes (non cachées) + référentiels
    # statiques (cachés via cache_control ephemeral = 5 min). Le contenu
    # variable (opportunité) reste dans le user message.
    system_blocks = [
        {
            "type": "text",
            "text": (
                "Tu es un classificateur d'appels à projets pour ONG/associations marocaines. "
                "Tu choisis EXCLUSIVEMENT parmi les référentiels fournis. "
                "Réponds en JSON strict, UNIQUEMENT en JSON, démarre par { et termine par }."
            ),
        },
        {
            "type": "text",
            "text": referentials,
            "cache_control": {"type": "ephemeral"},
        },
    ]

    user_content = (
        f"Opportunité à classifier :\n\n"
        f"TITRE : {title}\n\n"
        f"RÉSUMÉ : {(summary or '')[:500]}\n\n"
        f"DESCRIPTION : {(description or '')[:1500]}\n\n"
        f"Format de réponse attendu :\n"
        f'{{"sdg_ids": [5, 8], "dac_sector_ids": ["15170", "16020"], "population_slugs": ["women", "rural"]}}'
    )

    try:
        r = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'prompt-caching-2024-07-31',
                'content-type': 'application/json',
            },
            json={
                'model': MODEL,
                'max_tokens': 200,
                'system': system_blocks,
                'messages': [{'role': 'user', 'content': user_content}],
            },
            timeout=30,
        )
        r.raise_for_status()
        resp = r.json()
        usage = resp.get('usage', {})
        TOKEN_STATS['claude_calls'] += 1
        TOKEN_STATS['input_tokens'] += usage.get('input_tokens', 0)
        TOKEN_STATS['output_tokens'] += usage.get('output_tokens', 0)
        TOKEN_STATS['cache_creation_tokens'] += usage.get('cache_creation_input_tokens', 0)
        TOKEN_STATS['cache_read_tokens'] += usage.get('cache_read_input_tokens', 0)
        print(f'    usage: in={usage.get("input_tokens",0)} out={usage.get("output_tokens",0)} cache_create={usage.get("cache_creation_input_tokens",0)} cache_read={usage.get("cache_read_input_tokens",0)}')
        text = resp['content'][0]['text']
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


def _heuristic_confidence(cls: dict) -> float:
    """Score 0..1 de la qualité du résultat heuristique.
    - has SDG    : +0.5
    - has DAC    : +0.3
    - has 2+ SDG : +0.1 (richesse)
    - has pop    : +0.1
    Threshold typique 0.8 = SDG+DAC trouvés → Claude inutile."""
    if not cls:
        return 0.0
    score = 0.0
    n_sdg = len(cls.get('sdg_ids') or [])
    n_dac = len(cls.get('dac_sector_ids') or [])
    n_pop = len(cls.get('population_slugs') or [])
    if n_sdg >= 1: score += 0.5
    if n_dac >= 1: score += 0.3
    if n_sdg >= 2: score += 0.1
    if n_pop >= 1: score += 0.1
    return min(1.0, score)


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

        # Heuristique d'abord (économise tokens si elle est confiante).
        h_cls = _classify_heuristic(
            opp['title'], opp.get('summary') or '', opp.get('description') or '',
            sdg_list, dac_list, pop_list,
        )
        h_conf = _heuristic_confidence(h_cls)
        if h_conf >= 0.8:
            cls = h_cls
            TOKEN_STATS['heuristic_only'] += 1
            print(f'    heuristic OK ({h_conf:.2f}) — Claude skipped')
        else:
            # Heuristique trop faible → Claude
            print(f'    heuristic weak ({h_conf:.2f}) — calling Claude')
            cls = classify_with_claude(
                opp['title'], opp.get('summary') or '', opp.get('description') or '',
                sdg_list, dac_list, pop_list,
            )
            # Si Claude renvoie tout vide, fallback sur l'heuristique partielle (au moins ne rien perdre).
            if cls and not any([cls.get('sdg_ids'), cls.get('dac_sector_ids'), cls.get('population_slugs')]):
                cls = h_cls if any([h_cls.get('sdg_ids'), h_cls.get('dac_sector_ids')]) else cls
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
    print(f'\n  === Tokens & calls ===')
    print(f'    Claude calls    : {TOKEN_STATS["claude_calls"]}')
    print(f'    Heuristic only  : {TOKEN_STATS["heuristic_only"]}')
    print(f'    Input tokens    : {TOKEN_STATS["input_tokens"]}')
    print(f'    Output tokens   : {TOKEN_STATS["output_tokens"]}')
    print(f'    Cache create    : {TOKEN_STATS["cache_creation_tokens"]}')
    print(f'    Cache read      : {TOKEN_STATS["cache_read_tokens"]}')
    billable = TOKEN_STATS['input_tokens'] + TOKEN_STATS['cache_creation_tokens'] + TOKEN_STATS['cache_read_tokens'] * 0.1
    print(f'    Billable input  : {billable:.0f} (cache_read counted at 10%)')


if __name__ == '__main__':
    main()
