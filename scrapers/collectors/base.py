"""BaseCollector — interface commune à tous les collecteurs."""
from abc import ABC, abstractmethod
import logging
import requests

log = logging.getLogger(__name__)

USER_AGENT = "FundingWatchBot/0.2 (+https://fundingwatch.ma)"


class BaseCollector(ABC):
    parser_key: str = ""
    donor_name: str | None = None

    def __init__(self, source: dict):
        """source = ligne Supabase de la table `sources`."""
        self.source = source
        self.source_id = source.get("id")
        self.source_name = source.get("name")
        self.url = source.get("url")
        self.language = "en"

    def fetch(self) -> str:
        res = requests.get(self.url, headers={"User-Agent": USER_AGENT}, timeout=30)
        res.raise_for_status()
        return res.text

    @abstractmethod
    def parse(self, raw: str) -> list[dict]:
        """Retourne une liste d'items bruts."""

    def normalize(self, item: dict) -> dict:
        """Hook : ajoute donor_name + valeurs par défaut."""
        item.setdefault("donor_name", self.donor_name)
        item.setdefault("language", self.language)
        return item

    def collect(self) -> list[dict]:
        raw = self.fetch()
        items = self.parse(raw)
        return [self.normalize(i) for i in items if i]
