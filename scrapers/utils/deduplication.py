"""Dédoublonnage avancé : hash URL, normalisation titre, similarité Jaccard."""
import hashlib
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


def normalize_url(url: str) -> str:
    """Normalise une URL : trie les query params, retire le fragment, ignore les params de tracking."""
    if not url:
        return ''
    p = urlparse(url.strip())
    tracking = {'utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','ref','source'}
    qs = {k: v for k, v in parse_qs(p.query).items() if k.lower() not in tracking}
    new_query = urlencode(sorted(qs.items()), doseq=True)
    return urlunparse((p.scheme.lower(), p.netloc.lower(), p.path.rstrip('/'), '', new_query, ''))


def url_hash(url: str) -> str:
    return hashlib.sha256(normalize_url(url).encode()).hexdigest()[:32]


def normalize_title(title: str) -> str:
    """Normalise un titre pour comparaison : minuscules, sans accents, sans ponctuation."""
    if not title:
        return ''
    import unicodedata
    t = unicodedata.normalize('NFKD', title.lower())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def title_similarity(a: str, b: str) -> float:
    """Similarité Jaccard entre deux titres normalisés (0.0 à 1.0)."""
    if not a or not b:
        return 0.0
    A = set(normalize_title(a).split())
    B = set(normalize_title(b).split())
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def dedupe(items: list[dict], threshold: float = 0.85) -> list[dict]:
    """Dédoublonne une liste d'items (dans la même run).

    Stratégie :
      1. URL normalisée identique → doublon
      2. external_id identique → doublon
      3. Titre similaire à > threshold → doublon
    """
    out = []
    seen_urls = set()
    seen_ids = set()
    for it in items:
        url = it.get('official_url') or it.get('source_url')
        ext = it.get('external_id')
        title = it.get('title', '')
        url_key = normalize_url(url) if url else None

        if url_key and url_key in seen_urls:
            continue
        if ext and ext in seen_ids:
            continue
        is_dup = False
        for prev in out:
            sim = title_similarity(title, prev.get('title', ''))
            if sim >= threshold:
                is_dup = True
                break
        if is_dup:
            continue

        if url_key: seen_urls.add(url_key)
        if ext: seen_ids.add(ext)
        out.append(it)
    return out
