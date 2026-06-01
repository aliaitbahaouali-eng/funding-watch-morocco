"""Detection IA cote Python : thematiques, eligibilite Maroc, resume.

Sprint 5B (2026-05-26) — REFONTE STRICTE :
  - morocco_eligibility en 5 niveaux au lieu d'un boolean trop laxiste
  - Regex Morocco EXPLICITE durcie (retire 'africa', 'global', 'worldwide')
  - Detection d'exclusion explicite ("only for X citizens")
  - Forcer LLM pour les cas ambigus si ANTHROPIC_API_KEY defini
"""
import os
import re
import json
import logging
import requests

log = logging.getLogger(__name__)

THEME_KEYWORDS = {
    'femmes': ['femmes', 'women', 'genre', 'gender', 'parite', 'egalite', 'girls', 'filles'],
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

# Niveau 1 — EXPLICITE : mention claire Maroc/MENA/Maghreb
MOROCCO_EXPLICIT = re.compile(
    r'\b(morocco|maroc|marocain|moroccan|royaume\s+du\s+maroc|'
    r'mena\b|maghreb|north\s+africa|afrique\s+du\s+nord|'
    r'casablanca|rabat|marrakech|tanger|agadir|oujda|fes\b|fez\b)\b',
    re.IGNORECASE,
)

# Niveau 2 — REGIONAL : Afrique / monde arabe / Mediterranee (sans Maroc direct)
MOROCCO_REGIONAL = re.compile(
    r'\b(arab\s+world|monde\s+arabe|arab\s+states|'
    r'africa\b|afrique\b|african\s+countries|pays\s+africains|'
    r'sub.?saharan|sub-saharienne|francophone\s+africa|'
    r'm[e\xe9]diterran[e\xe9]e?|mediterranean|'
    r'middle\s+east|moyen[\s\-]orient)\b',
    re.IGNORECASE,
)

# Niveau 3 — GLOBAL : mondial sans specificite
MOROCCO_GLOBAL = re.compile(
    r'\b(worldwide|global|international|all\s+countries|'
    r'tous\s+les?\s+pays|ouvert[s]?\s+a\s+tous|'
    r'developing\s+countries|pays\s+en\s+d[e\xe9]veloppement|'
    r'low[\s\-]income\s+countries|least\s+developed)\b',
    re.IGNORECASE,
)

# Niveau 4 — EXCLUSION : reserve a d'autres pays
MOROCCO_EXCLUDED = re.compile(
    r'\b(only|exclusively|reserved|r[e\xe9]serv[e\xe9](?:e?s?)?|uniquement|solely)\s+'
    r'(?:for\s+|aux?\s+|pour\s+les?\s+)?'
    r'(?:'
    r'eu\s+citizens?|european\s+(?:citizens?|nationals?)|us\s+citizens?|'
    r'american\s+(?:citizens?|residents?)|french\s+(?:citizens?|nationals?)|'
    r'german\s+(?:citizens?|nationals?)|spanish\s+(?:citizens?|nationals?)|'
    r'uk\s+(?:citizens?|nationals?)|british\s+(?:citizens?|nationals?)|'
    r'residents?\s+of\s+(?!morocco|maroc|mena|maghreb)|'
    r'nationals?\s+of\s+(?!morocco|maroc|mena|maghreb)|'
    r'citizens?\s+of\s+(?!morocco|maroc|mena|maghreb)'
    r')',
    re.IGNORECASE,
)

COUNTRY_BLOCKLIST_HINTS = re.compile(
    r'\b(bangladesh|india|pakistan|philippines|vietnam|cambodia|nepal|'
    r'haiti|guatemala|honduras|nicaragua|peru|bolivia|colombia|'
    r'south\s+sudan|sudan|ethiopia|kenya|uganda|tanzania|rwanda|'
    r'mozambique|madagascar|zimbabwe|zambia|malawi)\s+only\b',
    re.IGNORECASE,
)

CODE_MAP = {
    'maroc': 'MA', 'morocco': 'MA', 'moroccan': 'MA', 'marocain': 'MA',
    'tunisie': 'TN', 'tunisia': 'TN',
    'algerie': 'DZ', 'algeria': 'DZ',
    'mauritanie': 'MR', 'egypte': 'EG', 'egypt': 'EG',
    'senegal': 'SN', 'mali': 'ML',
    'mena': 'MENA', 'maghreb': 'MAGHREB',
    'afrique': 'AFRICA', 'africa': 'AFRICA',
    'mediterranee': 'MED', 'mediterranean': 'MED',
    'arab world': 'ARAB', 'monde arabe': 'ARAB',
    'worldwide': 'WORLDWIDE', 'global': 'WORLDWIDE',
}


def classify_themes(text):
    if not text:
        return []
    lower = text.lower()
    found = []
    for slug, keywords in THEME_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            found.append(slug)
    return found[:4]


def classify_morocco_eligibility(text):
    """Renvoie (level, countries) ou level in {explicit, regional, global, excluded, unknown}."""
    if not text:
        return ('unknown', [])
    lower = text.lower()

    countries = []
    for needle, code in CODE_MAP.items():
        if needle in lower:
            countries.append(code)
    countries = list(dict.fromkeys(countries))

    has_explicit_morocco = bool(MOROCCO_EXPLICIT.search(lower))

    if MOROCCO_EXCLUDED.search(lower) and not has_explicit_morocco:
        return ('excluded', countries)
    if COUNTRY_BLOCKLIST_HINTS.search(lower) and not has_explicit_morocco:
        return ('excluded', countries)
    if has_explicit_morocco:
        return ('explicit', countries)
    if MOROCCO_REGIONAL.search(lower):
        return ('regional', countries)
    if MOROCCO_GLOBAL.search(lower):
        return ('global', countries)
    return ('unknown', countries)


def detect_morocco_eligibility(text):
    """LEGACY — renvoie (bool, countries). True uniquement si explicit ou regional."""
    level, countries = classify_morocco_eligibility(text)
    return (level in ('explicit', 'regional'), countries)


def classify_morocco_llm(title, description):
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    model = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')
    prompt = (
        "Tu analyses une opportunite de financement et tu dois determiner si elle est "
        "reellement accessible a une ONG/cooperative MAROCAINE.\n\n"
        "Niveaux :\n"
        "- explicit : le Maroc est mentionne explicitement\n"
        "- regional : Afrique du Nord / monde arabe / Mediterranee / MENA\n"
        "- global   : appel mondial sans restriction\n"
        "- excluded : reserve a d'autres pays\n"
        "- unknown  : impossible de trancher\n\n"
        f"Titre : {(title or '')[:200]}\n"
        f"Description : {(description or '')[:1500]}\n\n"
        'Reponds UNIQUEMENT avec un JSON : {"level": "...", "reason": "1 phrase"}'
    )
    try:
        res = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
            json={'model': model, 'max_tokens': 150, 'messages': [{'role': 'user', 'content': prompt}]},
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        text = data['content'][0]['text']
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return None
        parsed = json.loads(match.group(0))
        if parsed.get('level') not in ('explicit', 'regional', 'global', 'excluded', 'unknown'):
            return None
        return parsed
    except Exception as e:
        log.warning('Morocco classify LLM failed: %s', e)
        return None


def classify_morocco_strict(title, description='', summary=''):
    """Pipeline complet : heuristique puis LLM si ambigu."""
    full_text = ' '.join(filter(None, [title or '', summary or '', description or '']))
    level, countries = classify_morocco_eligibility(full_text)
    if level in ('explicit', 'excluded'):
        return {'level': level, 'countries': countries, 'source': 'heuristic'}
    llm = classify_morocco_llm(title or '', description or summary or '')
    if llm:
        return {'level': llm['level'], 'countries': countries, 'source': 'llm', 'reason': llm.get('reason')}
    return {'level': level, 'countries': countries, 'source': 'heuristic'}


def heuristic_summary(text, max_len=280):
    if not text:
        return ''
    clean = re.sub(r'\s+', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    summary = ' '.join(sentences[:2])
    suffix = '...' if len(summary) > max_len else ''
    return summary[:max_len].rstrip() + suffix


def call_claude_summary(text, max_len=280):
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    model = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')
    try:
        res = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
            json={
                'model': model,
                'max_tokens': 250,
                'system': 'Resume en 2 phrases courtes (francais) un appel a projets de financement. Pas de listes.',
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


def summarize(text, max_len=280):
    via_llm = call_claude_summary(text, max_len)
    return via_llm or heuristic_summary(text, max_len)
