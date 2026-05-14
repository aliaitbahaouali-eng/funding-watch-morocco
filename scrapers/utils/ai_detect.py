"""Détection IA côté Python : thématiques, éligibilité Maroc, résumé.

Sans clé Claude : heuristiques locales. Avec clé : appel à Claude pour précision.
"""
import os
import re
import json
import logging
import requests

log = logging.getLogger(__name__)

THEME_KEYWORDS = {
    'femmes': ['femmes', 'women', 'genre', 'gender', 'parite', 'égalité', 'egalite', 'girls', 'filles'],
    'jeunes': ['jeunes', 'youth', 'jeunesse', 'employabilite', 'insertion', 'emploi', 'student'],
    'ess': ['ess', 'economie sociale', 'social enterprise', 'entrepreneuriat', 'cooperative'],
    'climat': ['climat', 'climate', 'environnement', 'adaptation', 'resilience', 'green', 'biodiversite'],
    'digital': ['digital', 'digitalisation', 'technologie', 'numerique', 'ict', 'tech'],
    'migration': ['migration', 'refugies', 'refugees', 'migrants'],
    'education': ['education', 'formation', 'school', 'learning'],
    'sante': ['sante', 'health', 'medical', 'wellbeing'],
    'culture': ['culture', 'arts', 'patrimoine', 'heritage'],
    'droits-humains': ['droits humains', 'human rights', 'justice', 'plaidoyer', 'advocacy'],
    'rural': ['agriculture', 'rural', 'farming', 'food security'],
    'innovation': ['innovation', 'social impact', 'impact investing'],
}

MOROCCO_HINTS = re.compile(
    r'\b(morocco|maroc|mena|maghreb|north africa|afrique du nord|africa|afrique|'
    r'global|worldwide|international|all countries|ouvert à tous|tous pays|'
    r'low.{1,5}income|developing countries|pays en développement)\b',
    re.IGNORECASE,
)
EXCLUSIVE_HINTS = re.compile(
    r'\b(only|uniquement|exclusively|reserved for|exclusively for|réservé aux?)\s+(?!(arab|african|moroccan|maghreb|mena))',
    re.IGNORECASE,
)


def classify_themes(text: str) -> list[str]:
    if not text:
        return []
    lower = text.lower()
    found = []
    for slug, keywords in THEME_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            found.append(slug)
    return found[:4]


def detect_morocco_eligibility(text: str) -> tuple[bool, list[str]]:
    """Renvoie (morocco_eligible, countries_detected)."""
    if not text:
        return (False, [])
    lower = text.lower()
    mentions_morocco = bool(MOROCCO_HINTS.search(lower))
    has_exclusive = bool(EXCLUSIVE_HINTS.search(lower))

    countries = []
    code_map = {
        'maroc': 'MA', 'morocco': 'MA',
        'tunisie': 'TN', 'tunisia': 'TN',
        'algerie': 'DZ', 'algeria': 'DZ',
        'mauritanie': 'MR', 'egypte': 'EG', 'egypt': 'EG',
        'senegal': 'SN', 'mali': 'ML', 'mena': 'MENA',
        'maghreb': 'MAGHREB', 'afrique': 'AFRICA', 'africa': 'AFRICA',
        'mediterranee': 'MED', 'worldwide': 'WORLDWIDE',
    }
    for needle, code in code_map.items():
        if needle in lower:
            countries.append(code)

    eligible = mentions_morocco and not has_exclusive
    return (eligible, list(dict.fromkeys(countries)))


def heuristic_summary(text: str, max_len: int = 280) -> str:
    if not text:
        return ''
    clean = re.sub(r'\s+', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    summary = ' '.join(sentences[:2])
    return summary[:max_len].rstrip() + ('…' if len(summary) > max_len else '')


def call_claude_summary(text: str, max_len: int = 280) -> str | None:
    """Appel optionnel à Claude si ANTHROPIC_API_KEY est défini."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    model = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')
    try:
        res = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': model,
                'max_tokens': 250,
                'system': 'Résume en 2 phrases courtes (français) un appel à projets de financement. Pas de listes.',
                'messages': [{'role': 'user', 'content': text[:3000]}],
            },
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        return data['content'][0]['text'][:max_len]
    except Exception as e:
        log.warning('Claude summary failed: %s', e)
        return None


def summarize(text: str, max_len: int = 280) -> str:
    """Résumé : LLM si possible, sinon heuristique."""
    via_llm = call_claude_summary(text, max_len)
    return via_llm or heuristic_summary(text, max_len)
