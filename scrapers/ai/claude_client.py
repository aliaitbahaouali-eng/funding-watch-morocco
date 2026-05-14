"""Client Claude API minimaliste."""
import os
import re
import json
import logging
import requests

log = logging.getLogger(__name__)
API_URL = 'https://api.anthropic.com/v1/messages'


def has_api_key() -> bool:
    return bool(os.environ.get('ANTHROPIC_API_KEY'))


def call_claude(prompt: str, system: str = '', max_tokens: int = 1500) -> str | None:
    """Appel simple à Claude. Renvoie le texte ou None si pas de clé/erreur."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    model = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')
    body = {
        'model': model,
        'max_tokens': max_tokens,
        'messages': [{'role': 'user', 'content': prompt}],
    }
    if system:
        body['system'] = system
    try:
        res = requests.post(
            API_URL,
            headers={
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json=body,
            timeout=60,
        )
        res.raise_for_status()
        data = res.json()
        return data['content'][0]['text']
    except Exception as e:
        log.warning('Claude call failed: %s', e)
        return None


def extract_json(text: str) -> dict | None:
    """Extrait le premier objet JSON valide d'une réponse Claude."""
    if not text:
        return None
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
