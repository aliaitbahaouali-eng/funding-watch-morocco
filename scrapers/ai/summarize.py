"""Génération de résumés et checklists via Claude (avec fallback heuristique)."""
import logging
from .claude_client import call_claude, has_api_key

log = logging.getLogger(__name__)


def summarize_fr(text: str, max_len: int = 280) -> str:
    """Résumé court en français, 2 phrases."""
    if not text:
        return ''
    if has_api_key():
        r = call_claude(
            f"Résume ce texte en 2 phrases courtes (max {max_len} caractères) en français, sans mise en forme.\n\nTexte:\n{text[:3500]}",
            system="Tu rédiges des résumés concis pour associations marocaines cherchant des financements.",
            max_tokens=200,
        )
        if r:
            return r.strip()[:max_len]
    # Fallback heuristique
    import re
    clean = re.sub(r'\s+', ' ', text).strip()
    s = re.split(r'(?<=[.!?])\s+', clean)
    return ' '.join(s[:2])[:max_len]


def generate_checklist(opportunity_text: str, required_docs: list = None) -> list[str]:
    """Génère une checklist de candidature personnalisée."""
    default = [
        'Lire l\'appel à projets en entier',
        'Vérifier l\'éligibilité de votre organisation',
        'Préparer le statut juridique et récépissé',
        'Rédiger la note conceptuelle',
        'Préparer le budget prévisionnel',
        'Identifier les partenaires éventuels',
        'Compléter les annexes (rapports, états financiers)',
        'Soumettre 48h avant la deadline',
    ]
    if required_docs:
        default = default[:3] + [f'Préparer : {d}' for d in required_docs] + default[3:]
    if not has_api_key() or not opportunity_text:
        return default

    r = call_claude(
        f"Génère une checklist de 6-8 étapes concrètes pour qu'une association marocaine puisse candidater à cette opportunité. Sois pratique et précis.\n\nOpportunité:\n{opportunity_text[:2500]}\n\nRéponds UNIQUEMENT avec une liste JSON de strings, ex: [\"Étape 1\", \"Étape 2\"]",
        system="Tu aides les associations marocaines à candidater.",
        max_tokens=600,
    )
    if not r:
        return default
    import re, json
    m = re.search(r'\[.*\]', r, re.DOTALL)
    if not m:
        return default
    try:
        items = json.loads(m.group(0))
        return [str(x) for x in items if x and len(str(x)) > 5][:10] or default
    except Exception:
        return default
