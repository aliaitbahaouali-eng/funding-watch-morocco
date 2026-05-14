"""Collector qui utilise Playwright pour rendre les pages SPA / JS-only.

⚠ Optionnel : nécessite `pip install playwright && playwright install chromium`.
Si Playwright n'est pas installé, le fallback HTML est utilisé.
"""
import logging
from .base import BaseCollector

log = logging.getLogger(__name__)


class PlaywrightCollector(BaseCollector):
    """Override `fetch()` pour rendre la page avec un navigateur headless."""

    timeout_ms = 30000
    wait_selector: str | None = None
    user_agent = "FundingWatchBot/0.2 (+https://fundingwatch.ma)"

    def fetch(self) -> str:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            log.warning("Playwright non installé — fallback requests.")
            return super().fetch()

        log.info("  • Playwright: chargement %s", self.url)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page(user_agent=self.user_agent)
                page.goto(self.url, timeout=self.timeout_ms, wait_until="networkidle")
                if self.wait_selector:
                    page.wait_for_selector(self.wait_selector, timeout=self.timeout_ms)
                content = page.content()
            finally:
                browser.close()
        return content
