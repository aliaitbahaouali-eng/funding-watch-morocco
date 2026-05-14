#!/usr/bin/env python
"""Deep Crawler — moulinette intelligente Funding Watch.

Workflow 2 passes :
  Passe 1 : collector existant → liste d'URLs (titre + url officielle)
  Passe 2 : pour CHAQUE URL :
    a) deep_extract(url) → HTML + PDFs joints + texte concat
    b) Claude extract_fields → JSON 20 champs structuré
    c) Claude summarize + checklist
    d) classification NGO-fit
    e) POST /api/ingest en status='draft'
    f) Validation humaine via /admin/pending

Usage :
  python scrapers/crawler.py --source tanmia
  python scrapers/crawler.py --source tanmia --max 5
  python scrapers/crawler.py --source tanmia --dry-run
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

from scrapers.collectors.registry import get_collector
from scrapers.extractors.document_parser import deep_extract
from scrapers.ai.extract_fields import extract_structured_fields
from scrapers.ai.summarize import summarize_fr, generate_checklist
from scrapers.utils.ngo_filter import classify_ngo_fit
from scrapers.utils.deduplication import normalize_url
from scrapers.utils.ingest_client import IngestClient
from scrapers.utils.supabase_client import get_active_sources
from scrapers.utils.logger import get_logger

log = get_logger('crawler')


def deep_process_url(url: str, fallback_title: str = '', source_meta: dict | None = None, with_pdf: bool = False) -> dict:
    """Pipeline complet : URL → fiche structurée prête à insérer.

    with_pdf=False par défaut : on n'ouvre que la page HTML, sans télécharger les pièces jointes.
    """
    log.info('  → deep_extract %s (pdf=%s)', url, with_pdf)
    extracted = deep_extract(url, max_pdfs=3 if with_pdf else 0)
    full_text = extracted.get('full_text', '')

    if not full_text or len(full_text) < 80:
        log.warning('    ✖ contenu trop léger, skip')
        return None

    log.info('    text=%d chars, pdfs=%d', len(full_text), len(extracted.get('pdfs', [])))

    # Extraction IA des champs structurés
    fields = extract_structured_fields(full_text, fallback_title=fallback_title or extracted['meta'].get('title', ''))

    # Si l'IA n'a pas tranché sur ngo_relevant, on utilise le filtre rules-based
    if fields.get('ngo_relevant') is None:
        ngo = classify_ngo_fit(fields.get('title', ''), fields.get('description', ''), full_text[:2000])
        fields['ngo_relevant'] = ngo['ngo_relevant']
        fields['ngo_relevance_score'] = ngo['ngo_relevance_score']
        fields['ngo_relevance_reason'] = ngo['ngo_relevance_reason']
        if not fields.get('target_org_types'):
            fields['target_org_types'] = ngo['target_org_types']
    else:
        fields['ngo_relevance_score'] = 90 if fields['ngo_relevant'] else 15
        if not fields.get('ngo_relevance_reason'):
            fields['ngo_relevance_reason'] = 'Classifié par Claude'

    # Affine summary + checklist si pas remplis
    if not fields.get('summary'):
        fields['summary'] = summarize_fr(full_text)
    if not fields.get('checklist'):
        fields['checklist'] = generate_checklist(full_text, fields.get('required_documents'))

    # Construit l'item attendu par /api/ingest
    item = {
        'title': fields.get('title') or fallback_title or 'Opportunité',
        'official_url': extracted.get('url') or url,
        'source_url': url,
        'donor_name': fields.get('donor_name') or (source_meta or {}).get('donor_name'),
        'type': fields.get('type'),
        'summary': fields.get('summary'),
        'description': fields.get('description'),
        'eligibility': fields.get('eligibility'),
        'deadline': fields.get('deadline'),
        'publication_date': fields.get('publication_date'),
        'amount_min': fields.get('amount_min'),
        'amount_max': fields.get('amount_max'),
        'currency': fields.get('currency') or 'EUR',
        'language': fields.get('language') or 'fr',
        'countries_eligible': fields.get('countries_eligible') or [],
        'morocco_eligible': bool(fields.get('morocco_eligible')) if fields.get('morocco_eligible') is not None else False,
        'difficulty_level': fields.get('difficulty_level') or 'Moyen',
        'required_documents': fields.get('required_documents') or [],
        'theme_slugs': fields.get('theme_slugs') or [],
        'external_id': normalize_url(url),
        # NGO-fit
        'ngo_relevant': fields.get('ngo_relevant'),
        'ngo_relevance_score': fields.get('ngo_relevance_score'),
        'ngo_relevance_reason': fields.get('ngo_relevance_reason'),
        'target_org_types': fields.get('target_org_types') or [],
    }

    return item


def crawl_source(source: dict, max_items: int, dry_run: bool, ingest: IngestClient | None, with_pdf: bool = False) -> dict:
    """Crawl une source : listing + deep extract pour chaque URL."""
    started = time.time()
    parser_key = source.get('parser_key') or 'html_smart'
    Cls = get_collector(parser_key)
    collector = Cls(source)

    log.info('═══ Source %s (parser=%s) ═══', source.get('name'), parser_key)

    # Passe 1 : listing
    try:
        urls = collector.collect()
    except Exception as e:
        log.exception('Listing failed')
        return {'error': str(e), 'duration_ms': int((time.time() - started) * 1000)}

    log.info('  Passe 1: %d URLs trouvées (limit %d)', len(urls), max_items)
    urls = urls[:max_items]

    # Passe 2 : deep extract
    items = []
    skipped = 0
    for i, raw in enumerate(urls, 1):
        url = raw.get('official_url') or raw.get('source_url')
        title = raw.get('title', '')
        if not url:
            continue
        log.info('  [%d/%d] %s', i, len(urls), title[:70])
        item = deep_process_url(
            url,
            fallback_title=title,
            source_meta={'donor_name': collector.donor_name} if hasattr(collector, 'donor_name') else None,
            with_pdf=with_pdf,
        )
        if not item:
            skipped += 1
            continue

        # Filtre : si NGO-fit explicitement False, on log mais on ne stoppe pas
        # (l'admin peut quand même les voir dans /admin/pending avec un badge rouge)
        if item.get('ngo_relevant') is False:
            log.info('    ⚠ Non NGO : %s', item.get('ngo_relevance_reason'))

        items.append(item)
        # Petit délai pour éviter de cogner trop fort
        time.sleep(0.5)

    duration_ms = int((time.time() - started) * 1000)
    log.info('  Passe 2: %d fiches construites, %d skip, %dms', len(items), skipped, duration_ms)

    if dry_run or not ingest:
        log.info('  → DRY RUN, pas d\'envoi')
        return {'items_found': len(urls), 'items_built': len(items), 'duration_ms': duration_ms, 'sample': items[:1]}

    # Envoi en bulk à l'API
    result = ingest.push(
        source_id=source['id'],
        items=items,
        run={
            'items_found': len(urls),
            'duration_ms': duration_ms,
            'status': 'success' if items else 'partial',
            'source_name': source.get('name'),
        },
    )
    log.info('  → ingest: %s', result)
    return {'items_found': len(urls), 'items_built': len(items), **result, 'duration_ms': duration_ms}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', help='parser_key (ex: tanmia)')
    ap.add_argument('--category', help='maroc, un, eu, cooperation...')
    ap.add_argument('--priority', type=int, help='Filtrer par priorité')
    ap.add_argument('--max', type=int, default=10, help='Max items par source (default 10)')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--with-pdf', action='store_true', help='Télécharger et lire les PDFs joints (off par défaut)')
    args = ap.parse_args()

    sources = get_active_sources(parser_key=args.source)
    if args.category:
        sources = [s for s in sources if s.get('category') == args.category]
    if args.priority:
        sources = [s for s in sources if s.get('priority') == args.priority]

    log.info('Sources sélectionnées : %d (max %d items par source)', len(sources), args.max)
    if not sources:
        log.warning('Aucune source.')
        return

    ingest = None if args.dry_run else IngestClient()
    summary = []
    for s in sources:
        res = crawl_source(s, max_items=args.max, dry_run=args.dry_run, ingest=ingest, with_pdf=args.with_pdf)
        summary.append({'source': s.get('name'), **{k: v for k, v in res.items() if k != 'sample'}})

    print(json.dumps(summary, indent=2, ensure_ascii=False, default=str))


if __name__ == '__main__':
    main()
