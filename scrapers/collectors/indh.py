"""INDH — Initiative Nationale pour le Développement Humain (Maroc)."""
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import truncate


class IndhCollector(BaseCollector):
    parser_key = 'indh'
    donor_name = 'INDH'

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        for el in soup.select('article, .post, .news-item, li.aap, .actualite'):
            link = el.find('a', href=True)
            if not link: continue
            title = (el.find(['h2','h3','h4']) or link).get_text(' ', strip=True)
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
                'morocco_eligible': True,
                'countries_eligible': ['MA'],
                'type': 'Appel à projets INDH',
                'language': 'fr',
            })
        if not items:
            from .generic_smart import GenericSmartCollector
            return GenericSmartCollector(self.source).parse(raw)
        return items[:50]


def _soup(raw):
    try: return BeautifulSoup(raw, 'lxml')
    except Exception: return BeautifulSoup(raw, 'html.parser')
