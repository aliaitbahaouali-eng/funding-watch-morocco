"""GIZ — Business opportunities. Liste de cartes avec deadline."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate


class GizCollector(BaseCollector):
    parser_key = "giz"
    donor_name = "GIZ"

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        # GIZ utilise des <article> ou <li> avec un h2/h3
        for el in soup.select("article, li, .news-item, .card"):
            link = el.find("a", href=True)
            if not link:
                continue
            heading = el.find(["h1", "h2", "h3", "h4"])
            title = (heading.get_text(strip=True) if heading else link.get_text(strip=True))
            if not title or len(title) < 8:
                continue
            url = urljoin(self.url, link["href"])
            text = el.get_text(" ", strip=True)
            if not _looks_like_call(text):
                continue
            items.append({
                "external_id": url,
                "title": truncate(title, 250),
                "official_url": url,
                "source_url": url,
                "summary": truncate(text, 280),
                "description": text,
                "deadline": _extract_deadline(text),
                "morocco_eligible": detect_morocco(text, title),
                "countries_eligible": [],
                "type": "Tender / Cooperation",
                "language": "en",
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

_CALL_RE = re.compile(r"\b(tender|call|RFP|RFQ|proposal|consultation|bid)\b", re.IGNORECASE)
def _looks_like_call(text: str) -> bool:
    return bool(_CALL_RE.search(text or ""))

_DATE_RE = re.compile(r"(?:closing date|deadline|submission)[^.]{0,40}", re.IGNORECASE)
def _extract_deadline(text: str) -> str | None:
    m = _DATE_RE.search(text or "")
    if not m: return None
    snippet = m.group(0)
    m2 = re.search(r"\b\d{1,2}[-/\s]?[A-Za-z]{3,9}[-/\s]?\d{4}\b", snippet)
    return parse_date(m2.group(0)) if m2 else None
