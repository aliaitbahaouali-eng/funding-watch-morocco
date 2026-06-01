"""NGO-fit filter — le cœur du repositionnement.

Détermine si une opportunité est pertinente pour une organisation
à impact social (association, ONG, coopérative, fondation).

Stratégie hybride :
  1. Règles d'exclusion fortes (rejette les évidences : individuel, commercial)
  2. Règles d'inclusion fortes (accepte les évidences : grant for NGOs)
  3. Si ambigu : appel à Claude pour trancher

Renvoie : { ngo_relevant: bool, score: 0-100, reason: str, target_org_types: [str] }
"""
import os
import re
import json
import logging
import requests

log = logging.getLogger(__name__)


# ============================================================
# Règles d'exclusion (forte confiance)
# ============================================================
EXCLUDE_PATTERNS = [
    # Recrutement / RH (individuel)
    (r"\b(vacancy|vacancies|job\s+(posting|opening|offer|opportunity)|offres?\s+d['']?emplois?|recrutement|career\s+opportunity|consultant\s+individuel|individual\s+consultant|hire\s+an?\s+individual|nous\s+recrutons|on\s+recherche|poste\s+(à|a)\s+pourvoir)\b", 'Offre de recrutement individuel'),
    # Bourses pour individus uniquement
    (r"\b(scholarship|fellowship|phd grant|master grant|bourse\s+étudiant|bourse\s+individuelle)\b", 'Bourse individuelle, pas pour ONG'),
    # Tender commercial (achat de matériel/services)
    (r"\b(supply of|fourniture de|prestation de service|maintenance contract|software license|équipement informatique)\b", 'Marché commercial / fourniture'),
    # Prix individuel / récompense personnelle
    (r"\b(personal award|individual prize|early career award|young researcher)\b", 'Prix individuel'),
    # Stages
    (r"\b(internship|stage rémunéré|trainee position)\b", 'Stage individuel'),
]

# ============================================================
# Règles d'inclusion (forte confiance)
# ============================================================
INCLUDE_PATTERNS = [
    (r"\b(NGOs?|civil society organi[sz]ations?|CSOs?|associations?|ONGs?|société civile|non[\- ]?profit|not[\- ]?for[\- ]?profit)\b", 'Mention explicite ONG/société civile'),
    (r"\b(grant for organizations?|subvention\s+pour\s+(association|ong)|appel\s+à\s+projets?\s+(association|ong))\b", 'Subvention organisationnelle explicite'),
    (r"\b(community-based organi[sz]ation|grassroots|local NGO|organisation de base)\b", 'Organisation communautaire'),
    (r"\b(coopératives?|cooperatives?|social enterprise|entreprises?\s+sociales?|ESS|économie\s+sociale)\b", 'ESS / coopératives'),
    (r"\b(humanitarian|development cooperation|coopération\s+(?:au\s+)?développement|aide\s+humanitaire)\b", 'Aide / coopération'),
    # Sprint 5B — patterns spécifiques Maroc
    (r"\b(coopérative\s+(?:agricole|féminine|artisanale|de\s+production)|GIE\s+(?:agricole|féminin)|union\s+de\s+coopératives?)\b", 'Coopérative marocaine spécifique'),
    (r"\b(INDH|Initiative\s+Nationale|tissu\s+associatif|société\s+civile\s+marocaine)\b", 'Programme société civile Maroc'),
]

# ============================================================
# Heuristique (sans appel LLM)
# ============================================================
def classify_heuristic(text: str) -> dict:
    """Classification sur règles seulement. Renvoie partial result."""
    if not text:
        return {'ngo_relevant': None, 'score': 50, 'reason': 'Texte vide', 'target_org_types': []}

    lower = text.lower()

    # Exclusion forte
    for pat, why in EXCLUDE_PATTERNS:
        if re.search(pat, lower, re.IGNORECASE):
            return {
                'ngo_relevant': False,
                'score': 10,
                'reason': why,
                'target_org_types': []
            }

    # Inclusion forte
    targets = set()
    matched_reasons = []
    for pat, why in INCLUDE_PATTERNS:
        if re.search(pat, lower, re.IGNORECASE):
            matched_reasons.append(why)
            if 'coop' in pat or 'ESS' in pat or 'social enterprise' in pat:
                targets.add('cooperative')
            if 'association' in pat.lower() or 'NGO' in pat or 'ONG' in pat or 'civil society' in pat.lower():
                targets.add('association')
                targets.add('ong')
            if 'fondation' in lower:
                targets.add('fondation')

    if matched_reasons:
        return {
            'ngo_relevant': True,
            'score': 85,
            'reason': matched_reasons[0],
            'target_org_types': list(targets) or ['association', 'ong']
        }

    return {'ngo_relevant': None, 'score': 50, 'reason': 'Ambigu (heuristique non concluante)', 'target_org_types': []}


# ============================================================
# Appel Claude pour les cas ambigus
# ============================================================
def classify_llm(title: str, description: str) -> dict | None:
    """Appel Claude API si ANTHROPIC_API_KEY est défini. Renvoie None sinon."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None

    model = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')

    prompt = f"""Tu analyses une opportunité de financement pour décider si elle est pertinente pour une ASSOCIATION, ONG, COOPÉRATIVE ou FONDATION à impact social.

PERTINENT pour ONG si :
- Subvention ou financement destiné à une organisation
- Appel à projets pour la société civile
- Programme de coopération internationale ouvert aux organisations
- Soutien à des coopératives ou entreprises sociales

NON PERTINENT si :
- Recrutement individuel (vacancy, consultant individuel)
- Bourse pour étudiant/chercheur individuel
- Marché commercial / fourniture de biens
- Prix ou récompense individuelle
- Stage / formation individuelle

Titre : {title or ''}

Description : {(description or '')[:2000]}

Réponds UNIQUEMENT avec un JSON valide de cette forme :
{{"ngo_relevant": true|false, "score": 0-100, "reason": "1 phrase courte", "target_org_types": ["association","ong","cooperative","fondation"]}}"""

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
                'messages': [{'role': 'user', 'content': prompt}],
            },
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        text = data['content'][0]['text']
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return None
        return json.loads(match.group(0))
    except Exception as e:
        log.warning('NGO classify LLM failed: %s', e)
        return None


# ============================================================
# Fonction principale
# ============================================================
def classify_ngo_fit(title: str, description: str = '', summary: str = '') -> dict:
    """Détermine si une opportunité est pour les ONG.

    Renvoie : {
        ngo_relevant: bool | None,
        ngo_relevance_score: int (0-100),
        ngo_relevance_reason: str,
        target_org_types: list[str]
    }
    """
    text = ' '.join(filter(None, [title or '', summary or '', description or '']))

    # 1. Heuristique
    heur = classify_heuristic(text)

    # 2. Si tranchée par heuristique, on garde
    if heur['ngo_relevant'] is not None and heur['score'] >= 80:
        return {
            'ngo_relevant': heur['ngo_relevant'],
            'ngo_relevance_score': heur['score'],
            'ngo_relevance_reason': heur['reason'],
            'target_org_types': heur['target_org_types'],
        }

    # 3. Cas ambigu : on tente LLM
    llm = classify_llm(title or '', description or summary or '')
    if llm:
        return {
            'ngo_relevant': llm.get('ngo_relevant'),
            'ngo_relevance_score': llm.get('score', 50),
            'ngo_relevance_reason': llm.get('reason', 'Classifie par Claude'),
            'target_org_types': llm.get('target_org_types', []),
        }

    # 4. Fallback heuristique
    return {
        'ngo_relevant': heur['ngo_relevant'],
        'ngo_relevance_score': heur['score'],
        'ngo_relevance_reason': heur['reason'],
        'target_org_types': heur['target_org_types'],
    }
