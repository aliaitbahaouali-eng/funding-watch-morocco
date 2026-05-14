"""Collecteur RSS générique."""
import feedparser
from urllib.parse import urljoin

from .base import BaseCollector
from scrapers.utils.normalize import detect_morocco, parse_date, truncate


class RssCollector(BaseCollector):
    parser_key = "rss_generic"

    def parse(self, raw: str) -> list[dict]:
        parsed = feedparser.parse(raw)
        items = []
        for entry in parsed.entries[:50]:
            title = (entry.get("title") or "").strip()
            link = entry.get("link") or ""
            summary = (entry.get("summary") or entry.get("description") or "").strip()
            if not title or not link:
                continue
            items.append({
                "external_id": entry.get("id") or link,
                "title": title,
                "official_url": link,
                "source_url": link,
                "summary": truncate(_strip_html(summary), 280),
                "description": _strip_html(summary),
                "deadline": parse_date(entry.get("deadline")) if entry.get("deadline") else None,
                "publication_date": parse_date(entry.get("published")) if entry.get("published") else None,
                "morocco_eligible": detect_morocco(title, summary),
                "countries_eligible": [],
                "type": "Appel à projets",
            })
        return items


def _strip_html(s: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", s or "").strip()
