"""Version Playwright du collector EU Funding pour les pages rendues en JS.
Utiliser ce collector en définissant `parser_key='eu_funding_playwright'` dans la table sources."""
from .playwright_base import PlaywrightCollector
from .eu_funding import EuFundingCollector


class EuFundingPlaywrightCollector(PlaywrightCollector, EuFundingCollector):
    parser_key = "eu_funding_playwright"
    wait_selector = "a[href*='topic-details']"
    timeout_ms = 45000
