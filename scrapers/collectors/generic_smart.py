"""Generic Smart Collector — fallback intelligent qui détecte automatiquement
les structures de listing courantes (cartes, articles, listes, tableaux).

Utilisé quand un site n'a pas de collector spécialisé, ou en fallback.
"""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import truncate
from scrapers.utils.cleaner import html_to_links


FUNDING_KEYWORDS = re.compile(
    r'\b(grant|call|fund|funding|proposal|tender|RFP|RFQ|procurement|'
    r'appel|subvention|financement|concours|bourse|aap|aoo|marché|consultation)\b',
    re.IGNORECASE,
)


class GenericSmartCollector(BaseCollector):
    parser_key = 'html_smart'

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []

        # Stratégie 1 : containers structurés (article/li/.card)
        containers = soup.select('article, .card, .news-item, li.opportunity, .opportunity, .views-row, .funding-item, .post')
        for el in containers:
            link = el.find('a', href=True)
            if not link: continue
            heading = el.find(['h1','h2','h3','h4'])
            title = (heading.get_text(' ', strip=True) if heading else link.get_text(' ', strip=True))
            if not title or len(title) < 8: continue
            text = el.get_text(' ', strip=True)
            if not FUNDING_KEYWORDS.search(text): continue
            url = urljoin(self.url, link['href'])
            items.append({
                'external_id': url,
                'title': truncate(title, 250),
                'official_url': url,
                'source_url': url,
                'summary': truncate(text, 280),
                'description': text,
                'type': 'Appel à projets',
            })
            if len(items) >= 50: break

        # Stratégie 2 : si rien trouvé, scan des liens textuels
        if not items:
            for link in html_to_links(raw, base_url=self.url):
                if not FUNDING_KEYWORDS.search(link['text']):
                    continue
                items.append({
                    'external_id': link['href'],
                    'title': truncate(link['text'], 200),
                    'official_url': link['href'],
                    'source_url': link['href'],
                    'summary': None,
                    'type': 'Appel à projets',
                })
                if len(items) >= 30: break

        return items


def _soup(raw):
    try: return BeautifulSoup(raw, 'lxml')
    except Exception: return BeautifulSoup(raw, 'html.parser')
