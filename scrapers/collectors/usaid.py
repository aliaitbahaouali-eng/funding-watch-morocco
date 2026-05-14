"""USAID — Funding & Acquisition Opportunities."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import truncate


class UsaidCollector(BaseCollector):
    parser_key = 'usaid'
    donor_name = 'USAID'

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        for el in soup.select('article, .views-row, .opportunity, .funding-item'):
            link = el.find('a', href=True)
            if not link: continue
            title = link.get_text(' ', strip=True)
            if not title or len(title) < 8: continue
            text = el.get_text(' ', strip=True)
            url = urljoin(self.url, link['href'])
            items.append({
                'external_id': url,
                'title': truncate(title, 250),
                'official_url': url,
                'source_url': url,
                'summary': truncate(text, 280),
                'description': text,
                'morocco_eligible': True,  # USAID Morocco mission active
                'countries_eligible': ['MA', 'WORLDWIDE'],
                'type': 'Grant / Cooperative Agreement',
                'language': 'en',
            })
        if not items:
            from .generic_smart import GenericSmartCollector
            return GenericSmartCollector(self.source).parse(raw)
        return items[:50]


def _soup(raw):
    try: return BeautifulSoup(raw, 'lxml')
    except Exception: return BeautifulSoup(raw, 'html.parser')
