"""Logger : sorties fichier + console + JSON structuré."""
import logging
import json
import os
from datetime import datetime, timezone
from pathlib import Path


LOG_DIR = Path(__file__).resolve().parent.parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'name': record.name,
            'msg': record.getMessage(),
        }
        if record.exc_info:
            data['exc'] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=False)


def get_logger(name: str, also_file: bool = True) -> logging.Logger:
    log = logging.getLogger(name)
    if log.handlers:
        return log
    log.setLevel(logging.INFO)

    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s — %(message)s'))
    log.addHandler(console)

    if also_file:
        fh = logging.FileHandler(LOG_DIR / f"scraper_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8')
        fh.setFormatter(JsonFormatter())
        log.addHandler(fh)
    return log
