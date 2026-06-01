"""Client Supabase REST minimaliste pour lire les sources actives.
On évite la dépendance `supabase-py` pour rester léger."""
import os
import requests


def supabase_request(path: str, method: str = "GET", params=None, json_body=None):
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1" + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    res = requests.request(method, url, headers=headers, params=params, json=json_body, timeout=30)
    res.raise_for_status()
    return res.json() if res.content else None


def get_active_sources(parser_key: str | None = None, select: str = '*'):
    # Sprint 5E — select='*' rapatrie aussi requires_morocco_keyword (v23).
    # Le scraper s'en sert pour rejeter à la source les opps non Maroc/MENA.
    params = {"active": "eq.true", "order": "priority.asc", "select": select}
    if parser_key:
        params["parser_key"] = f"eq.{parser_key}"
    return supabase_request("/sources", params=params)


def get_source_by_id(source_id: str):
    params = {"id": f"eq.{source_id}", "select": "*"}
    rows = supabase_request("/sources", params=params)
    return rows[0] if rows else None
