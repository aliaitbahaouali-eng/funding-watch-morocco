"""Embeddings — wrapper unifié OpenAI / Voyage / fallback heuristique.

Stratégie :
  1. Si OPENAI_API_KEY → text-embedding-3-small (1536 dims, $0.02/1M tokens)
  2. Si VOYAGE_API_KEY → voyage-2 (1024 dims, à reconfigurer migration)
  3. Sinon → fallback déterministe basé sur hash (dégradé, mais ne casse pas le pipeline)

Le modèle utilisé est stocké dans la colonne `embedding_model` pour pouvoir
détecter quand il faut re-embeddifier.
"""
import os
import hashlib
import logging
import time
import requests

log = logging.getLogger(__name__)

OPENAI_KEY = os.environ.get('OPENAI_API_KEY')
VOYAGE_KEY = os.environ.get('VOYAGE_API_KEY')

DEFAULT_DIMS = 1536


def get_embedding(text: str, retry: int = 2) -> tuple[list[float], str]:
    """Renvoie (vector, model_name)."""
    text = (text or '').strip()
    if not text:
        return [0.0] * DEFAULT_DIMS, 'empty'

    # Truncate aggressivement (8000 chars ~ 2000 tokens, large marge pour les modèles)
    text = text[:8000]

    if OPENAI_KEY:
        for attempt in range(retry + 1):
            try:
                return _openai_embedding(text), 'openai/text-embedding-3-small'
            except Exception as e:
                log.warning('OpenAI embedding failed (try %d): %s', attempt, e)
                time.sleep(1.5 ** attempt)
        log.error('OpenAI embedding failed after retries, fallback to hash')

    if VOYAGE_KEY:
        try:
            return _voyage_embedding(text), 'voyage/voyage-2'
        except Exception as e:
            log.warning('Voyage embedding failed: %s', e)

    return _hash_embedding(text), 'fallback/hash'


def _openai_embedding(text: str) -> list[float]:
    r = requests.post(
        'https://api.openai.com/v1/embeddings',
        headers={
            'Authorization': f'Bearer {OPENAI_KEY}',
            'Content-Type': 'application/json',
        },
        json={'model': 'text-embedding-3-small', 'input': text, 'dimensions': DEFAULT_DIMS},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()['data'][0]['embedding']


def _voyage_embedding(text: str) -> list[float]:
    r = requests.post(
        'https://api.voyageai.com/v1/embeddings',
        headers={
            'Authorization': f'Bearer {VOYAGE_KEY}',
            'Content-Type': 'application/json',
        },
        json={'model': 'voyage-2', 'input': [text]},
        timeout=30,
    )
    r.raise_for_status()
    vec = r.json()['data'][0]['embedding']
    # Pad/truncate à DEFAULT_DIMS si nécessaire
    if len(vec) < DEFAULT_DIMS:
        vec = vec + [0.0] * (DEFAULT_DIMS - len(vec))
    elif len(vec) > DEFAULT_DIMS:
        vec = vec[:DEFAULT_DIMS]
    return vec


def _hash_embedding(text: str) -> list[float]:
    """Embedding déterministe basé sur hash — utile en dev sans API key.
    Pas sémantique mais évite les valeurs nulles."""
    out = []
    h = hashlib.sha256(text.encode('utf-8')).digest()
    # Génère DEFAULT_DIMS valeurs en re-hashant
    chunks = []
    seed = h
    while len(chunks) * 32 < DEFAULT_DIMS * 4:
        seed = hashlib.sha256(seed).digest()
        chunks.append(seed)
    raw = b''.join(chunks)[:DEFAULT_DIMS * 4]
    for i in range(DEFAULT_DIMS):
        n = int.from_bytes(raw[i*4:(i+1)*4], 'big', signed=True)
        out.append(n / 2147483648.0)  # normalise [-1, 1]
    # Normalisation L2 pour cosine similarity
    norm = sum(x * x for x in out) ** 0.5
    if norm > 0:
        out = [x / norm for x in out]
    return out


def build_org_text(org: dict, sdg_names: list[str] = None, dac_names: list[str] = None,
                   populations: list[str] = None, geographies: list[str] = None,
                   past_projects: list[dict] = None) -> str:
    """Sérialise un profil orga en texte sémantique pour embedding."""
    parts = []
    if org.get('name'):
        parts.append(f"Organisation : {org['name']}")
    if org.get('org_type'):
        parts.append(f"Type : {org['org_type']}")
    if org.get('description'):
        parts.append(f"Description : {org['description']}")
    if org.get('action_summary'):
        parts.append(f"Action : {org['action_summary']}")
    if org.get('intervention_themes_text'):
        parts.append(f"Thématiques : {org['intervention_themes_text']}")
    if org.get('city') or org.get('region'):
        parts.append(f"Localisation : {org.get('city','')} {org.get('region','')}".strip())
    if sdg_names:
        parts.append(f"Objectifs de développement durable visés : {', '.join(sdg_names)}")
    if dac_names:
        parts.append(f"Secteurs d'intervention : {', '.join(dac_names)}")
    if populations:
        parts.append(f"Populations cibles : {', '.join(populations)}")
    if geographies:
        parts.append(f"Zones d'action : {', '.join(geographies)}")
    if past_projects:
        ps = [f"{p.get('title','?')} ({p.get('donor','?')}, {p.get('year','?')}) : {p.get('summary','')}"
              for p in past_projects[:3]]
        parts.append(f"Projets passés : {' | '.join(ps)}")
    return '\n'.join(parts)


def build_opportunity_text(opp: dict, sdg_names: list[str] = None,
                            dac_names: list[str] = None, populations: list[str] = None) -> str:
    """Sérialise une opportunité en texte sémantique pour embedding."""
    parts = []
    if opp.get('title'):
        parts.append(f"Appel : {opp['title']}")
    if opp.get('donor_name'):
        parts.append(f"Bailleur : {opp['donor_name']}")
    if opp.get('type'):
        parts.append(f"Type : {opp['type']}")
    if opp.get('summary'):
        parts.append(f"Résumé : {opp['summary']}")
    if opp.get('description'):
        # Truncate description très longue
        desc = opp['description'][:3000]
        parts.append(f"Description : {desc}")
    if opp.get('eligibility'):
        parts.append(f"Éligibilité : {opp['eligibility']}")
    if sdg_names:
        parts.append(f"SDG concernés : {', '.join(sdg_names)}")
    if dac_names:
        parts.append(f"Secteurs : {', '.join(dac_names)}")
    if populations:
        parts.append(f"Populations cibles : {', '.join(populations)}")
    if opp.get('countries_eligible'):
        parts.append(f"Pays éligibles : {', '.join(opp['countries_eligible'][:10])}")
    return '\n'.join(parts)
