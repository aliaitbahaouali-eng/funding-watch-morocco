"""Tanmia.ma — Plateforme marocaine de référence pour la société civile.

La vraie liste des appels d'offres est sur /appels-doffres/ — pas la home.
On force l'URL pour éviter de scraper des articles d'actualité.
"""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import truncate, parse_date


LISTING_URL = 'https://tanmia.ma/appels-doffres/'

# Mots qui indiquent un VRAI appel à projets / appel d'offres
FUNDING_KW = re.compile(
    r"\b(appel|projet|financement|subvention|bourse|concours|aap|aoo|"
    r"marché|consultation|tender|proposal|grant|call|cofinancement|"
    r"recrutement\s+d['']une\s+(?:association|ong)|"
    r"call\s+for\s+(?:proposals?|applications?))\b",
    re.IGNORECASE,
)

# Mots qui indiquent un ARTICLE d'actualité (à exclure)
NEWS_KW = re.compile(
    r"\b(actualit[ée]s?|news|article|brève|enqu[êe]te|interview|"
    r"reportage|tribune|opinion|analyse)\b",
    re.IGNORECASE,
)

_FR_DATE_RE = re.compile(
    r'\b(\d{1,2}(?:er)?\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+\d{4})\b',
    re.IGNORECASE,
)


class TanmiaCollector(BaseCollector):
    parser_key = 'tanmia'
    donor_name = None  # Plateforme aggregator, le bailleur varie

    def __init__(self, source: dict):
        super().__init__(source)
        # On force l'URL — peu importe ce qu'il y a en base, on cible la page appels d'offres.
        self.url = LISTING_URL

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        seen_urls = set()

        # Stratégie 1 : structure WP "cards" (article.post, .item, .card)
        # Tanmia utilise typiquement des div.post ou article.type-post avec un thumbnail
        candidates = soup.select(
            'article, '
            'div.post, div.item, div.card, div.entry, '
            'li.opportunity, li.item, '
            '.elementor-post, .elementor-grid-item, '
            '.jet-listing-grid__item, .jet-listing-dynamic-link, '
            '.wp-block-post, .wp-block-latest-posts__item, '
            '.appel-doffre, .funding-call'
        )

        for el in candidates:
            link = el.find('a', href=True)
            if not link:
                continue
            href = link.get('href', '').strip()
            if not href or href.startswith('#') or href.startswith('javascript:'):
                continue
            url = urljoin(self.url, href)
            # Filtre : doit pointer vers tanmia.ma et pas vers la home ou /appels-doffres lui-même
            if 'tanmia.ma' not in url:
                continue
            if url.rstrip('/').endswith('/appels-doffres') or url == LISTING_URL:
                continue
            if url in seen_urls:
                continue

            heading = el.find(['h1', 'h2', 'h3', 'h4'])
            title = (heading.get_text(' ', strip=True) if heading else link.get_text(' ', strip=True))
            if not title or len(title) < 8:
                title = (link.get('title') or link.get_text(' ', strip=True) or '').strip()
                if len(title) < 8:
                    continue

            text = el.get_text(' ', strip=True)
            # Exclure les articles d'actualité évidents
            if NEWS_KW.search(title) and not FUNDING_KW.search(title):
                continue
            # Doit contenir au moins un mot-clé funding dans le titre OU l'URL
            # (sinon c'est probablement un article d'actualité qui mentionne "appel" dans le texte)
            if not (FUNDING_KW.search(title) or FUNDING_KW.search(url.lower())):
                continue

            seen_urls.add(url)
            items.append({
                'external_id': url,
                'title': truncate(title, 250),
                'official_url': url,
                'source_url': url,
                'summary': truncate(text, 280),
                'description': text,
                'deadline': _parse_fr_deadline(text),
                'morocco_eligible': True,
                'countries_eligible': ['MA'],
                'type': 'Appel à projets',
                'language': 'fr',
            })
            if len(items) >= 50:
                break

        # Stratégie 2 : fallback — tous les liens internes qui ressemblent à des appels
        if not items:
            for a in soup.find_all('a', href=True):
                href = a['href'].strip()
                if not href or href.startswith('#'):
                    continue
                url = urljoin(self.url, href)
                if 'tanmia.ma' not in url or url in seen_urls:
                    continue
                if url.rstrip('/').endswith('/appels-doffres') or url == LISTING_URL:
                    continue
                title = a.get_text(' ', strip=True)
                if not title or len(title) < 10:
                    continue
                if not (FUNDING_KW.search(title) or FUNDING_KW.search(href.lower())):
                    continue
                if NEWS_KW.search(title):
                    continue
                seen_urls.add(url)
                items.append({
                    'external_id': url,
                    'title': truncate(title, 250),
                    'official_url': url,
                    'source_url': url,
                    'summary': None,
                    'description': None,
                    'morocco_eligible': True,
                    'countries_eligible': ['MA'],
                    'type': 'Appel à projets',
                    'language': 'fr',
                })
                if len(items) >= 30:
                    break

        return items


def _soup(raw):
    try:
        return BeautifulSoup(raw, 'lxml')
    except Exception:
        return BeautifulSoup(raw, 'html.parser')


def _parse_fr_deadline(text: str):
    m = re.search(r'(?:date\s+limite|cl[ôo]ture|jusqu)[^.]{0,40}', text, re.IGNORECASE)
    if not m:
        return None
    m2 = _FR_DATE_RE.search(m.group(0))
    return parse_date(m2.group(1)) if m2 else None
