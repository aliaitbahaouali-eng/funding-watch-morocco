#!/usr/bin/env python
"""Orchestrateur Funding Watch — Architecture professionnelle de veille.

Workflow par source :
  1. Fetch (requests ou Playwright)
  2. Parse via collector spécialisé
  3. Enrichissement (date, montant, thèmes, Maroc, type, difficulté…)
  4. Dédoublonnage en mémoire (URL + similarité titre)
  5. POST vers /api/ingest qui :
     - dédoublonne contre la base
     - insère en status='draft'
     - log dans scraping_logs

Usage :
  python scrapers/scraper.py
  python scrapers/scraper.py --source undp
  python scrapers/scraper.py --category maroc
  python scrapers/scraper.py --dry-run
  python scrapers/scraper.py --priority 1
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

# Charge .env.local
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

from scrapers.collectors.registry import get_collector  # noqa: E402
from scrapers.utils.deduplication import dedupe         # noqa: E402
from scrapers.utils.enrich import enrich                # noqa: E402
from scrapers.utils.ingest_client import IngestClient   # noqa: E402
from scrapers.utils.supabase_client import get_active_sources  # noqa: E402
from scrapers.utils.logger import get_logger            # noqa: E402

log = get_logger('scraper')


def run_source(source: dict, dry_run: bool, ingest: IngestClient | None, enrich_items: bool = True) -> dict:
    started = time.time()
    parser_key = source.get('parser_key') or source.get('type') or 'html_smart'
    Cls = get_collector(parser_key)
    collector = Cls(source)

    log.info('=== %s (parser=%s, country=%s, category=%s)',
             source.get('name'), Cls.__name__,
             source.get('country', '?'), source.get('category', '?'))

    try:
        items = collector.collect()
        items = dedupe(items, threshold=0.85)
        # Enrichissement (deadline, montant, thèmes, Maroc, etc.)
        if enrich_items:
            items = [enrich(it) for it in items]

        # Sprint 5E — Filtre strict Maroc à la source pour les sources internationales
        # Si requires_morocco_keyword=true (sources non-Maroc), on ne garde que
        # les items dont la classification est explicit OU regional.
        # → coupe a la source 60-80% du bruit sur UNDP/UNICEF/EU/AFD/etc.
        if source.get('requires_morocco_keyword'):
            before = len(items)
            items = [
                it for it in items
                if it.get('morocco_eligibility') in ('explicit', 'regional')
                or it.get('morocco_eligible') is True  # fallback collectors legacy
            ]
            rejected = before - len(items)
            if rejected > 0:
                log.info('  → filtre Maroc strict : %d/%d items rejetes (non explicit/regional)',
                         rejected, before)

        duration_ms = int((time.time() - started) * 1000)
        log.info('  → %d item(s) en %dms (après dedup + enrich + filtre Maroc)', len(items), duration_ms)

        if dry_run or not ingest:
            log.info('  → DRY RUN')
            return {'items_found': len(items), 'items': items, 'duration_ms': duration_ms}

        result = ingest.push(
            source_id=source['id'],
            items=items,
            run={
                'items_found': len(items),
                'duration_ms': duration_ms,
                'status': 'success',
                'source_name': source.get('name'),
            },
        )
        log.info('  → ingest: %s', result)
        return {'items_found': len(items), **result, 'duration_ms': duration_ms}

    except Exception as exc:
        duration_ms = int((time.time() - started) * 1000)
        log.exception('  ✖ erreur %s', source.get('name'))
        if ingest and not dry_run:
            try:
                ingest.push(
                    source_id=source['id'],
                    items=[],
                    run={
                        'items_found': 0,
                        'duration_ms': duration_ms,
                        'status': 'error',
                        'error_message': str(exc)[:500],
                        'source_name': source.get('name'),
                    },
                )
            except Exception:
                log.exception('    ✖ log error failed')
        return {'error': str(exc), 'duration_ms': duration_ms}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', help='parser_key (ex: undp)')
    ap.add_argument('--category', help='maroc, un, eu, cooperation, ngo_platform, foundation, embassy')
    ap.add_argument('--priority', type=int, help='Filtrer par priorité (1=max)')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-enrich', action='store_true', help='Sauter l\'enrichissement IA')
    args = ap.parse_args()

    sources = get_active_sources(parser_key=args.source)
    if args.category:
        sources = [s for s in sources if s.get('category') == args.category]
    if args.priority:
        sources = [s for s in sources if s.get('priority') == args.priority]

    log.info('Sources sélectionnées : %d', len(sources))
    if not sources:
        log.warning('Aucune source. Exécutez supabase/seed.sql + supabase/seed_sources_v2.sql.')
        return

    ingest = None if args.dry_run else IngestClient()
    summary = []
    for s in sources:
        res = run_source(s, args.dry_run, ingest, enrich_items=not args.no_enrich)
        summary.append({'source': s.get('name'), **{k: v for k, v in res.items() if k != 'items'}})

    print(json.dumps(summary, indent=2, ensure_ascii=False, default=str))


if __name__ == '__main__':
    main()