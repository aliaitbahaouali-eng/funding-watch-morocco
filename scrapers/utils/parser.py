"""Parsers avancés : dates, montants, documents requis, type, difficulté.

Conçus pour extraire les méta-données d'un texte d'appel à projets,
en français comme en anglais.
"""
import re
from dateutil import parser as dateparser
from .normalize import FR_MONTHS, parse_date


# ============================================================
# Deadlines
# ============================================================
DEADLINE_HINTS = re.compile(
    r"(?:date\s+limite|cl[oô]ture|clos|closing|deadline|submission|jusqu['au]+|au\s+plus\s+tard|à\s+rendre)"
    r"[^.]{0,80}",
    re.IGNORECASE,
)

DATE_PATTERNS = [
    r"\b(\d{1,2}[-/\s][A-Za-z]{3,9}[-/\s]\d{2,4})\b",
    r"\b(\d{4}-\d{2}-\d{2})\b",
    r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b",
    r"\b(\d{1,2}\s+\w+\s+\d{4})\b",
]


def extract_deadline(text: str) -> str | None:
    """Cherche une deadline dans le texte. Renvoie YYYY-MM-DD ou None."""
    if not text:
        return None
    m = DEADLINE_HINTS.search(text)
    snippet = m.group(0) if m else text
    for pat in DATE_PATTERNS:
        m2 = re.search(pat, snippet, re.IGNORECASE)
        if m2:
            d = parse_date(m2.group(1))
            if d:
                return d
    return None


# ============================================================
# Amounts
# ============================================================
AMOUNT_LINE = re.compile(
    r"(?:budget|montant|amount|funding|grant|subvention|enveloppe)[^.]{0,80}",
    re.IGNORECASE,
)

CURRENCY_MAP = {'€': 'EUR', '$': 'USD', '£': 'GBP', 'MAD': 'MAD', 'EUR': 'EUR', 'USD': 'USD', 'CHF': 'CHF', 'GBP': 'GBP'}


def extract_amounts(text: str) -> tuple[float | None, float | None, str]:
    """Renvoie (min, max, currency)."""
    if not text:
        return None, None, 'EUR'
    m = AMOUNT_LINE.search(text)
    snippet = m.group(0) if m else text

    cur_m = re.search(r"(EUR|USD|GBP|CHF|MAD|€|\$|£)", snippet, re.IGNORECASE)
    currency = CURRENCY_MAP.get(cur_m.group(1).upper(), 'EUR') if cur_m else 'EUR'

    rng = re.search(r"(\d[\d\s.,]+\d|\d)\s*(?:[-–à]|to|and|et)[\s\w€\$£.,]{0,15}?(\d[\d\s.,]+\d|\d)", snippet, re.IGNORECASE)
    if rng:
        a = _to_num(rng.group(1)); b = _to_num(rng.group(2))
        if a and b:
            return min(a, b), max(a, b), currency
        return a or b, None, currency

    single = re.search(r"(\d[\d\s.,]{2,}\d|\d{4,})", snippet)
    if single:
        return _to_num(single.group(1)), None, currency

    return None, None, currency


def _to_num(s: str | None) -> float | None:
    if not s:
        return None
    cleaned = re.sub(r"[\s.,](?=\d{3}\b)", "", s.strip())
    try:
        return float(cleaned)
    except ValueError:
        return None


# ============================================================
# Documents requis
# ============================================================
DOC_HINTS = re.compile(
    r"(?:documents?\s+requis|pi[èe]ces\s+(?:demand[ée]es|justificatives)|required\s+documents|dossier\s+complet)"
    r"[^.]{0,400}",
    re.IGNORECASE,
)

COMMON_DOCS = [
    'CV', 'statuts', 'récépissé', 'budget', 'note conceptuelle', 'concept note',
    'logframe', 'theory of change', 'rapport financier', 'attestation fiscale',
    'organigramme', 'références', 'rapport annuel', 'lettre de motivation',
    'engagement', 'autorisation', 'plan de travail',
]


def extract_documents(text: str) -> list[str]:
    """Liste les documents requis détectés dans le texte."""
    if not text:
        return []
    found = []
    lower = text.lower()
    for doc in COMMON_DOCS:
        if doc.lower() in lower:
            found.append(doc.capitalize() if doc[0].isalpha() else doc)
    return list(dict.fromkeys(found))[:10]  # dedupe + cap


# ============================================================
# Difficulté
# ============================================================
def estimate_difficulty(text: str, amount_max: float | None = None) -> str:
    """Renvoie 'Accessible' / 'Moyen' / 'Élevé'."""
    if not text and not amount_max:
        return 'Moyen'
    score = 0
    if amount_max:
        if amount_max > 500000: score += 3
        elif amount_max > 100000: score += 2
        elif amount_max > 30000: score += 1
    lower = (text or '').lower()
    if re.search(r'\b(partnership|consortium|partenariat|consortium-led)\b', lower): score += 2
    if re.search(r'\b(audit|evaluation|monitoring|m&e|external audit)\b', lower): score += 1
    if re.search(r'\b(co-funding|cost-share|cofinancement|matching)\b', lower): score += 2
    if re.search(r'\b(3\s+years|36\s+months|multi-?year|pluriannuel)\b', lower): score += 1
    if score >= 5: return 'Élevé'
    if score >= 2: return 'Moyen'
    return 'Accessible'


# ============================================================
# Type d'opportunité
# ============================================================
TYPE_PATTERNS = [
    ('Call for proposals',   r'\b(call for proposals?|appel\s+à\s+projets?)\b'),
    ('Tender',               r'\b(tender|appel\s+d\'?offres?)\b'),
    ('Grant',                r'\b(grant|subvention)\b'),
    ('Bourse',               r'\b(bourse|scholarship|fellowship)\b'),
    ('Prix',                 r'\b(prix|award|prize)\b'),
    ('Procurement',          r'\b(procurement|RFP|RFQ)\b'),
]


def detect_type(text: str) -> str | None:
    if not text:
        return None
    lower = text.lower()
    for label, pat in TYPE_PATTERNS:
        if re.search(pat, lower):
            return label
    return None
