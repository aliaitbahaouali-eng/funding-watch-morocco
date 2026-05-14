"""Client HTTP pour pousser les items vers l'endpoint Next.js /api/ingest."""
import os
import json
import logging
import requests

log = logging.getLogger(__name__)


class IngestClient:
    def __init__(self, base_url: str | None = None, secret: str | None = None):
        self.base_url = base_url or os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
        self.secret = secret or os.environ.get("CRON_SECRET")
        if not self.secret:
            raise RuntimeError("CRON_SECRET requis (env ou argument).")

    def push(self, source_id: str, items: list[dict], run: dict | None = None) -> dict:
        url = f"{self.base_url.rstrip('/')}/api/ingest"
        payload = {"source_id": source_id, "items": items, "run": run or {}}
        res = requests.post(
            url,
            headers={"x-cron-secret": self.secret, "content-type": "application/json"},
            data=json.dumps(payload),
            timeout=60,
        )
        try:
            res.raise_for_status()
        except Exception:
            log.error("ingest failed: %s %s", res.status_code, res.text[:300])
            raise
        return res.json()
