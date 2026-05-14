"""Dédoublonnage en mémoire au sein d'une exécution. Le dédoublonnage final
contre la base se fait côté API ingest (qui vérifie external_id + official_url)."""

def dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for it in items:
        key = it.get("external_id") or it.get("official_url") or it.get("title")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out
