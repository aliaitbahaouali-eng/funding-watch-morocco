"""Collecteur HTML générique — utile en fallback et pour les sources simples."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate

KEYWORDS = ("grant", "call", "fund", "proposal", "tender", "rfp", "rfq",
            "appel", "subvention", "financement", "concours")


class HtmlCollector(BaseCollector):
    """Filtre les liens dont l'intitulé contient un mot-clé d'appel à projets."""
    parser_key = "html_generic"

    def parse(self, raw: str) -> list[dict]:
        soup = BeautifulSoup(raw, "lxml") if _has_lxml() else BeautifulSoup(raw, "html.parser")
        items = []
        seen = set()
        for a in soup.select("a"):
            text = a.get_text(" ", strip=True)
            href = a.get("href") or ""
            if not text or not href:
                continue
            low = text.lower()
            if not any(k in low for k in KEYWORDS):
                continue
            url = urljoin(self.url, href)
            if url in seen:
                continue
            seen.add(url)
            items.append({
                "external_id": url,
                "title": truncate(text, 200),
                "official_url": url,
                "source_url": url,
                "summary": None,
                "morocco_eligible": detect_morocco(text),
                "countries_eligible": [],
                "deadline": None,
                "type": "Appel à projets",
            })
        return items[:30]


def _has_lxml() -> bool:
    try:
        import lxml  # noqa
        return True
    except ImportError:
        return False
