"""Enabel — Agence belge de développement."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import truncate


class EnabelCollector(BaseCollector):
    parser_key = 'enabel'
    donor_name = 'Enabel'

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        for el in soup.select('article, .news-card, .opportunity, li'):
            link = el.find('a', href=True)
            if not link: continue
            title = link.get_text(' ', strip=True)
            if not title or len(title) < 8: continue
            text = el.get_text(' ', strip=True)
            if not re.search(r'\b(call|tender|appel|partnership|consultation|marché)\b', text, re.IGNORECASE):
                continue
            url = urljoin(self.url, link['href'])
            items.append({
                'external_id': url,
                'title': truncate(title, 250),
                'official_url': url,
                'source_url': url,
                'summary': truncate(text, 280),
                'description': text,
                'morocco_eligible': True,  # Enabel actif au Maroc
                'countries_eligible': ['MA', 'AFRICA'],
                'type': 'Appel à projets',
                'language': 'fr',
            })
        if not items:
            from .generic_smart import GenericSmartCollector
            return GenericSmartCollector(self.source).parse(raw)
        return items[:50]


def _soup(raw):
    try: return BeautifulSoup(raw, 'lxml')
    except Exception: return BeautifulSoup(raw, 'html.parser')
