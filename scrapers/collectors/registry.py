"""Registre des collecteurs par parser_key.

Pour ajouter un nouveau collector :
1. Créer la classe dans collectors/<key>.py qui hérite de BaseCollector
2. L'enregistrer dans REGISTRY ci-dessous
3. Ajouter une ligne dans la table sources avec parser_key='<key>'
"""
from .rss import RssCollector
from .html import HtmlCollector
from .generic_smart import GenericSmartCollector
from .undp import UndpCollector
from .eu_funding import EuFundingCollector
from .giz import GizCollector
from .afd import AfdCollector
from .un_women import UnWomenCollector
from .unicef import UnicefCollector
from .usaid import UsaidCollector
from .enabel import EnabelCollector
from .tanmia import TanmiaCollector
from .indh import IndhCollector
from .fundsforngos import FundsForNgosCollector

REGISTRY = {
    # Génériques
    'rss_generic':  RssCollector,
    'html_generic': HtmlCollector,
    'html_smart':   GenericSmartCollector,

    # ONU
    'undp':         UndpCollector,
    'un_women':     UnWomenCollector,
    'unicef':       UnicefCollector,

    # UE
    'eu_funding':   EuFundingCollector,

    # Coopération
    'giz':          GizCollector,
    'afd':          AfdCollector,
    'usaid':        UsaidCollector,
    'enabel':       EnabelCollector,

    # Maroc
    'tanmia':       TanmiaCollector,
    'indh':         IndhCollector,

    # Aggregators
    'fundsforngos': FundsForNgosCollector,
}

# Playwright optionnel
try:
    from .eu_funding_playwright import EuFundingPlaywrightCollector
    REGISTRY['eu_funding_playwright'] = EuFundingPlaywrightCollector
except ImportError:
    pass


def get_collector(parser_key: str):
    """Renvoie la classe Collector pour ce parser_key, ou GenericSmartCollector en fallback."""
    return REGISTRY.get(parser_key) or GenericSmartCollector
