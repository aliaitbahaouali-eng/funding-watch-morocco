"""Enrichissement complet d'un item brut : applique tous les parsers + classification NGO."""
from .parser import (
    extract_deadline, extract_amounts, extract_documents,
    estimate_difficulty, detect_type
)
from .ai_detect import classify_themes, detect_morocco_eligibility, summarize
from .normalize import detect_language, truncate
from .ngo_filter import classify_ngo_fit


def enrich(item: dict) -> dict:
    """Prend un item brut {title, official_url, description} et complète tous les champs."""
    text = ' '.join(filter(None, [item.get('title', ''), item.get('description', '') or item.get('summary', '')]))

    if not item.get('summary'):
        item['summary'] = summarize(item.get('description', '') or item.get('title', ''))

    if not item.get('language'):
        item['language'] = detect_language(text)

    if not item.get('type'):
        detected_type = detect_type(text)
        if detected_type:
            item['type'] = detected_type

    if not item.get('deadline'):
        d = extract_deadline(item.get('description', '') or text)
        if d:
            item['deadline'] = d

    if not item.get('amount_min') and not item.get('amount_max'):
        amin, amax, cur = extract_amounts(item.get('description', '') or text)
        if amin: item['amount_min'] = amin
        if amax: item['amount_max'] = amax
        item['currency'] = item.get('currency') or cur

    if not item.get('required_documents'):
        docs = extract_documents(item.get('description', '') or text)
        if docs: item['required_documents'] = docs

    # IA / morocco
    if 'morocco_eligible' not in item or not item.get('countries_eligible'):
        eligible, countries = detect_morocco_eligibility(text)
        if 'morocco_eligible' not in item:
            item['morocco_eligible'] = eligible
        if not item.get('countries_eligible'):
            item['countries_eligible'] = countries or []

    # Thématiques
    if not item.get('theme_slugs'):
        themes = classify_themes(text)
        if themes:
            item['theme_slugs'] = themes

    # Difficulté
    if not item.get('difficulty_level'):
        item['difficulty_level'] = estimate_difficulty(text, item.get('amount_max'))

    # ⭐ NGO-fit filter
    if 'ngo_relevant' not in item:
        ngo = classify_ngo_fit(item.get('title', ''), item.get('description', ''), item.get('summary', ''))
        item['ngo_relevant'] = ngo['ngo_relevant']
        item['ngo_relevance_score'] = ngo['ngo_relevance_score']
        item['ngo_relevance_reason'] = ngo['ngo_relevance_reason']
        item['target_org_types'] = ngo['target_org_types']

    if item.get('summary'):
        item['summary'] = truncate(item['summary'], 280)

    return item
