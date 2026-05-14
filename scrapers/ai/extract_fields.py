"""Extraction structurée des 20 champs d'une fiche opportunité via Claude.

Fallback : si pas de clé API, utilise les heuristiques existantes (deadline,
amount, type, etc.) pour remplir au mieux à partir du texte brut.
"""
import logging
from .claude_client import call_claude, extract_json, has_api_key
from scrapers.utils.parser import (
    extract_deadline, extract_amounts, extract_documents,
    estimate_difficulty, detect_type,
)
from scrapers.utils.normalize import detect_language

log = logging.getLogger(__name__)


SYSTEM_PROMPT = """Tu es un expert en analyse d'appels à projets pour ONG marocaines.
Tu reçois le texte complet d'une opportunité de financement (page web + PDFs joints).
Tu extrais les informations structurées en JSON, sans inventer.
Si une info n'est pas présente, mets null. Sois conservateur et précis.
Réponds UNIQUEMENT avec un objet JSON valide."""


PROMPT_TEMPLATE = """Voici le contenu d'une opportunité de financement collectée sur le web :

```
{text}
```

Extrais les informations structurées au format JSON exact suivant (ne renvoie QUE ce JSON, rien d'autre) :

{{
  "title": "titre clair en français, max 200 caractères",
  "donor_name": "nom du bailleur (UE, UNDP, AFD, UNICEF, etc.) ou null",
  "type": "Appel à projets|Subvention|Bourse|Procurement|Tender|null",
  "summary": "résumé en français en 2 phrases courtes (max 280 caractères)",
  "description": "description longue 2-4 paragraphes en français",
  "eligibility": "critères d'éligibilité en français ou null",
  "deadline": "YYYY-MM-DD ou null",
  "publication_date": "YYYY-MM-DD ou null",
  "amount_min": null|nombre,
  "amount_max": null|nombre,
  "currency": "EUR|USD|MAD|CHF|GBP|null",
  "language": "fr|en|ar",
  "countries_eligible": ["MA","TN",...] ou ["WORLDWIDE"],
  "morocco_eligible": true|false,
  "difficulty_level": "Accessible|Moyen|Élevé",
  "required_documents": ["statuts","budget","logframe"],
  "theme_slugs": ["femmes","jeunes","ess","climat","digital","migration","education","sante","culture","droits-humains","rural","innovation"],
  "ngo_relevant": true|false,
  "ngo_relevance_reason": "1 phrase expliquant si c'est pour des ONG ou non",
  "target_org_types": ["association","ong","cooperative","fondation"],
  "checklist": ["étape 1","étape 2",..."étape 8"]
}}

Règles importantes :
- "ngo_relevant" est TRÈS important : false pour offres d'emploi, bourses individuelles, marchés commerciaux, prix individuels, stages
- "theme_slugs" : choisis uniquement parmi la liste fournie, jusqu'à 4 max
- "morocco_eligible" : true si Maroc, MENA, Afrique, mondial, ou non spécifié explicitement excluant le Maroc
- "checklist" : 6-8 étapes concrètes pour postuler"""


def extract_structured_fields(full_text: str, fallback_title: str = '') -> dict:
    """Extrait les 20+ champs d'une fiche opportunité depuis du texte brut.

    Si Claude API dispo : LLM extraction (haute qualité).
    Sinon : heuristiques.
    """
    if not full_text or len(full_text) < 50:
        return _empty_result(fallback_title)

    if has_api_key():
        return _llm_extract(full_text, fallback_title)
    return _heuristic_extract(full_text, fallback_title)


def _llm_extract(text: str, fallback_title: str) -> dict:
    """Appel Claude pour extraire les champs."""
    prompt = PROMPT_TEMPLATE.format(text=text[:18000])
    response = call_claude(prompt, system=SYSTEM_PROMPT, max_tokens=2500)
    if not response:
        return _heuristic_extract(text, fallback_title)
    data = extract_json(response)
    if not data:
        log.warning('Claude returned non-JSON response, fallback heuristic')
        return _heuristic_extract(text, fallback_title)
    # Normalisation
    if not data.get('title'):
        data['title'] = fallback_title or 'Opportunité sans titre'
    return data


def _heuristic_extract(text: str, fallback_title: str) -> dict:
    """Extraction heuristique si pas de LLM."""
    return {
        'title': fallback_title or _guess_title(text),
        'donor_name': None,
        'type': detect_type(text),
        'summary': _short_summary(text),
        'description': text[:2000],
        'eligibility': None,
        'deadline': extract_deadline(text),
        'publication_date': None,
        'amount_min': extract_amounts(text)[0],
        'amount_max': extract_amounts(text)[1],
        'currency': extract_amounts(text)[2] or 'EUR',
        'language': detect_language(text),
        'countries_eligible': [],
        'morocco_eligible': None,    # laisser le ngo_filter compléter
        'difficulty_level': estimate_difficulty(text, extract_amounts(text)[1]),
        'required_documents': extract_documents(text),
        'theme_slugs': [],
        'ngo_relevant': None,
        'ngo_relevance_reason': 'Extraction heuristique (sans Claude)',
        'target_org_types': [],
        'checklist': [
            'Lire l\'appel à projets en entier',
            'Vérifier l\'éligibilité',
            'Préparer le statut juridique',
            'Rédiger la note conceptuelle',
            'Préparer le budget prévisionnel',
            'Identifier les partenaires',
            'Compléter les annexes',
            'Soumettre 48h avant la deadline',
        ],
    }


def _empty_result(fallback_title: str) -> dict:
    return {
        'title': fallback_title or 'Opportunité',
        'donor_name': None,
        'type': None,
        'summary': None,
        'description': None,
        'morocco_eligible': None,
        'ngo_relevant': None,
        'theme_slugs': [],
        'target_org_types': [],
        'checklist': [],
        'language': 'fr',
        'currency': 'EUR',
    }


def _guess_title(text: str) -> str:
    """Tente d'extraire un titre de la première ligne non vide."""
    for line in text.split('\n'):
        line = line.strip()
        if line and len(line) > 8:
            return line[:200]
    return 'Opportunité sans titre'


def _short_summary(text: str) -> str:
    """Heuristique : 2 premières phrases."""
    import re
    clean = re.sub(r'\s+', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    return ' '.join(sentences[:2])[:280]
