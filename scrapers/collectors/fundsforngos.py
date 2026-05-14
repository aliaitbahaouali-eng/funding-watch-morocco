"""fundsforNGOs — Plateforme aggregator d'opportunités pour ONG."""
from .rss import RssCollector


class FundsForNgosCollector(RssCollector):
    parser_key = 'fundsforngos'
    donor_name = None  # Aggregator

    def normalize(self, item):
        item = super().normalize(item)
        item['type'] = 'Funding opportunity'
        # Si le titre contient une mention de pays restrictive, ne pas marquer Maroc
        return item
