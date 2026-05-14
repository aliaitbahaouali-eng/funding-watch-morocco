"""UNDP Procurement Notices — listing public, structure tableau."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate


class UndpCollector(BaseCollector):
    parser_key = "undp"
    donor_name = "UNDP"

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        # UNDP utilise un <table> avec des liens "View Notice".
        for row in soup.select("table tr"):
            tds = row.find_all("td")
            if len(tds) < 3:
                continue
            link = row.find("a", href=True)
            if not link:
                continue
            text = " ".join(td.get_text(" ", strip=True) for td in tds)
            title = link.get_text(strip=True) or tds[0].get_text(strip=True)
            url = urljoin(self.url, link["href"])
            # Détection deadline dans la ligne
            deadline = _extract_first_date(text)
            country = _between(text, "Country", "Procurement") or _between(text, "Office", "Deadline")
            items.append({
                "external_id": _extract_query_id(url) or url,
                "title": truncate(title, 250),
                "official_url": url,
                "source_url": url,
                "summary": truncate(text, 280),
                "description": text,
                "deadline": deadline,
                "morocco_eligible": detect_morocco(text, title),
                "countries_eligible": [country] if country else ["WORLDWIDE"],
                "type": "Procurement / Call",
                "language": "en",
            })
        # Fallback : si la structure tableau ne matche pas, on retombe sur le filtre par mots-clés
        if not items:
            from .html import HtmlCollector
            return HtmlCollector(self.source).parse(raw)
        return items[:50]

    def normalize(self, item):
        item = super().normalize(item)
        # UNDP global → on considère Maroc éligible par défaut sauf indication contraire claire
        if not item.get("morocco_eligible"):
            item["morocco_eligible"] = True
        return item


# ---------- helpers ----------
def _soup(raw):
    try:
        return BeautifulSoup(raw, "lxml")
    except Exception:
        return BeautifulSoup(raw, "html.parser")

_DATE_RE = re.compile(r"\b(\d{1,2}[-/\s][A-Za-z]{3,9}[-/\s]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})\b")

def _extract_first_date(text: str) -> str | None:
    for m in _DATE_RE.finditer(text or ""):
        d = parse_date(m.group(1))
        if d:
            return d
    return None

def _between(text: str, a: str, b: str) -> str | None:
    s = text.find(a)
    if s < 0: return None
    s += len(a)
    e = text.find(b, s)
    return text[s:e].strip(" :|·-") if e > s else None

def _extract_query_id(url: str) -> str | None:
    m = re.search(r"[?&](?:notice_id|id)=([\w-]+)", url)
    return m.group(1) if m else None
