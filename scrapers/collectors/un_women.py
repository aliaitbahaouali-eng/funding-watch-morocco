"""UN Women — Procurement / Calls."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate


class UnWomenCollector(BaseCollector):
    parser_key = "un_women"
    donor_name = "UN Women"

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        for el in soup.select("article, li, .views-row, .field-item"):
            link = el.find("a", href=True)
            if not link:
                continue
            title = link.get_text(" ", strip=True)
            if not title or len(title) < 8:
                continue
            text = el.get_text(" ", strip=True)
            if not re.search(r"\b(RFP|RFQ|tender|call|proposal|procurement|bid)\b", text, re.IGNORECASE):
                continue
            url = urljoin(self.url, link["href"])
            items.append({
                "external_id": url,
                "title": truncate(title, 250),
                "official_url": url,
                "source_url": url,
                "summary": truncate(text, 280),
                "description": text,
                "deadline": _extract_deadline(text),
                "morocco_eligible": True,
                "countries_eligible": ["WORLDWIDE"],
                "type": "Call for proposals",
                "language": "en",
                "theme_slugs": ["femmes"],
            })
        if not items:
            from .html import HtmlCollector
            return HtmlCollector(self.source).parse(raw)
        return items[:50]


def _soup(raw):
    try:
        return BeautifulSoup(raw, "lxml")
    except Exception:
        return BeautifulSoup(raw, "html.parser")

def _extract_deadline(text: str) -> str | None:
    m = re.search(r"(?:closing|deadline|submission)[^.]{0,50}", text or "", re.IGNORECASE)
    if not m: return None
    m2 = re.search(r"\b\d{1,2}[-/\s]?[A-Za-z]{3,9}[-/\s]?\d{4}\b|\b\d{4}-\d{2}-\d{2}\b", m.group(0))
    return parse_date(m2.group(0)) if m2 else None
