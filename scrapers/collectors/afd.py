"""AFD — Appels à projets. Listing FR, structure en cartes <article>."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, parse_amounts, truncate


class AfdCollector(BaseCollector):
    parser_key = "afd"
    donor_name = "AFD"

    def parse(self, raw: str) -> list[dict]:
        soup = _soup(raw)
        items = []
        cards = soup.select("article, .card, .teaser, li.views-row, .item-list li")
        for card in cards:
            link = card.find("a", href=True)
            if not link:
                continue
            title = link.get_text(" ", strip=True) or card.find(["h2","h3","h4"]).get_text(strip=True) if card.find(["h2","h3","h4"]) else ""
            if not title or len(title) < 6:
                continue
            url = urljoin(self.url, link["href"])
            text = card.get_text(" ", strip=True)
            deadline = _extract_deadline_fr(text)
            amount_min, amount_max, currency = parse_amounts(text)
            items.append({
                "external_id": url,
                "title": truncate(title, 250),
                "official_url": url,
                "source_url": url,
                "summary": truncate(text, 280),
                "description": text,
                "deadline": deadline,
                "amount_min": amount_min,
                "amount_max": amount_max,
                "currency": currency or "EUR",
                "morocco_eligible": True if detect_morocco(text, title) else True,  # AFD est très présente au Maroc
                "countries_eligible": ["MA", "AFRICA"],
                "type": "Appel à projets",
                "language": "fr",
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

_FR_DATE_RE = re.compile(
    r"\b(\d{1,2}(?:er)?\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+\d{4})\b",
    re.IGNORECASE,
)

def _extract_deadline_fr(text: str) -> str | None:
    """Cherche « clôture le 15 avril 2026 » ou « date limite 30 juin 2026 »."""
    m = re.search(r"(?:cl[ôo]ture|date\s+limite|deadline|jusqu['au]+)[^.]{0,40}", text or "", re.IGNORECASE)
    if not m:
        return None
    m2 = _FR_DATE_RE.search(m.group(0))
    return parse_date(m2.group(1)) if m2 else None
