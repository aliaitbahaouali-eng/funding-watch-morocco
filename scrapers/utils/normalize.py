"""Helpers de normalisation : dates, montants, détection Maroc, langue."""
import re
from datetime import datetime
from dateutil import parser as dateparser

MOROCCO_HINTS = re.compile(
    r"\b(morocco|maroc|mena|maghreb|north africa|afrique du nord|africa|afrique|"
    r"global|worldwide|international|all countries|ouvert à tous)\b",
    re.IGNORECASE,
)

CURRENCY_RE = re.compile(r"(EUR|USD|GBP|CHF|MAD|€|\$|£)", re.IGNORECASE)

# Fourchette "X – Y" / "X to Y" / "X and Y" ; entre les deux nombres on tolère
# une devise et de la ponctuation (jusqu'à 20 caractères).
AMOUNT_RANGE_RE = re.compile(
    r"(\d[\d.,\s]*\d|\d)\s*(?:[-–à]|to|and|et)[\s\w€\$£.,]{0,20}?(\d[\d.,\s]*\d|\d)",
    re.IGNORECASE,
)
AMOUNT_SINGLE_RE = re.compile(r"(\d[\d.,\s]*\d|\d)")

# Mois français → anglais pour dateutil
FR_MONTHS = {
    "janvier": "January", "février": "February", "fevrier": "February",
    "mars": "March", "avril": "April", "mai": "May", "juin": "June",
    "juillet": "July", "août": "August", "aout": "August",
    "septembre": "September", "octobre": "October",
    "novembre": "November", "décembre": "December", "decembre": "December",
}


def detect_morocco(*texts) -> bool:
    """Vrai si l'un des textes mentionne le Maroc, MENA, Afrique, ou monde."""
    for t in texts:
        if t and MOROCCO_HINTS.search(t):
            return True
    return False


def parse_date(value: str | None) -> str | None:
    """Renvoie une date YYYY-MM-DD à partir d'une string libre (FR ou EN), ou None."""
    if not value:
        return None
    s = value.strip()
    # Remplace tous les mois FR (insensible à la casse) par leur équivalent EN
    def _repl(m):
        return FR_MONTHS.get(m.group(0).lower(), m.group(0))
    s = re.sub(r"\b(" + "|".join(FR_MONTHS.keys()) + r")\b", _repl, s, flags=re.IGNORECASE)
    try:
        dt = dateparser.parse(s, dayfirst=True, fuzzy=True)
        return dt.date().isoformat()
    except Exception:
        return None


def parse_amounts(text: str | None) -> tuple[float | None, float | None, str | None]:
    """Extrait (min, max, currency) d'un texte type '€10,000 – €50,000'."""
    if not text:
        return None, None, None
    currency = None
    m_cur = CURRENCY_RE.search(text)
    if m_cur:
        sym = m_cur.group(1).upper()
        currency = {"€": "EUR", "$": "USD", "£": "GBP"}.get(sym, sym)

    m = AMOUNT_RANGE_RE.search(text)
    if m:
        a = _to_num(m.group(1))
        b = _to_num(m.group(2))
        if a and b:
            return min(a, b), max(a, b), currency
        return a or b, None, currency

    m = AMOUNT_SINGLE_RE.search(text)
    if m:
        return _to_num(m.group(1)), None, currency
    return None, None, currency


def _to_num(s):
    if not s:
        return None
    cleaned = re.sub(r"[\s.,](?=\d{3}\b)", "", s)
    try:
        return float(cleaned)
    except ValueError:
        return None


def detect_language(text, fallback="fr"):
    if not text:
        return fallback
    t = " " + text.lower() + " "
    fr = sum(t.count(w) for w in [" et ", " le ", " la ", " des ", " pour ", " avec ", " les ", " une ", " du "])
    en = sum(t.count(w) for w in [" the ", " and ", " of ", " for ", " with ", " a "])
    return "fr" if fr >= en else "en"


def truncate(s, n=280):
    if not s:
        return None
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"
