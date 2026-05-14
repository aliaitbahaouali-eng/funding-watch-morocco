"""EU Funding & Tenders — portail souvent rendu en JS.

V1 : on tente l'URL « topic search » et on récupère les liens vers les topics.
Pour une couverture complète, utiliser `playwright_eu.py` (rend la page).
"""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate


class EuFundingCollector(BaseCollector):
    parser_key = "eu_funding"
    donor_name = "Union Européenne"

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        # Liens vers les topics : pattern href="/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/XXX"
        for a in soup.select("a[href*='/topic-details/']"):
            href = a.get("href") or ""
            title = a.get_text(" ", strip=True)
            if not title or len(title) < 10:
                continue
            url = urljoin(self.url, href)
            topic_id = href.rstrip("/").split("/")[-1]
            items.append({
                "external_id": topic_id,
                "title": truncate(title, 250),
                "official_url": url,
                "source_url": url,
                "summary": None,
                "morocco_eligible": True,  # NDICI / Voisinage Sud couvre généralement le Maroc
                "countries_eligible": ["EU-NEIGHBOURHOOD", "MA"],
                "type": "Call for proposals",
                "language": "en",
            })
        # Fallback générique si rien trouvé
        if not items:
            from .html import HtmlCollector
            return HtmlCollector(self.source).parse(raw)
        return items[:50]


def _soup(raw):
    try:
        return BeautifulSoup(raw, "lxml")
    except Exception:
        return BeautifulSoup(raw, "html.parser")
