"""Document parser : agrège le texte d'une page + ses PDFs joints."""
import logging
from .html_extractor import fetch_page, extract_main_content, find_pdf_links, get_meta_tags
from .pdf_extractor import extract_pdf_text

log = logging.getLogger(__name__)


def deep_extract(url: str, max_pdfs: int = 3, max_total_chars: int = 30000) -> dict:
    """Récupère TOUT le contenu utile d'une URL d'opportunité.

    Renvoie :
    {
        'url': str (URL finale après redirections),
        'meta': dict (title, description, og:*),
        'html_text': str,
        'pdfs': [{'url': str, 'text': str}],
        'full_text': str (html + pdfs concaténés, max_total_chars),
        'pdf_urls': list[str]
    }
    """
    out = {'url': url, 'meta': {}, 'html_text': '', 'pdfs': [], 'full_text': '', 'pdf_urls': []}

    try:
        html, final_url = fetch_page(url)
        out['url'] = final_url
        out['meta'] = get_meta_tags(html)
        out['html_text'] = extract_main_content(html, max_chars=15000)

        pdf_urls = find_pdf_links(html, final_url)[:max_pdfs]
        out['pdf_urls'] = pdf_urls

        for pdf_url in pdf_urls:
            text = extract_pdf_text(pdf_url, max_chars=8000)
            if text:
                out['pdfs'].append({'url': pdf_url, 'text': text})

        # Compose full_text
        parts = []
        if out['meta'].get('title'):
            parts.append(f"TITRE: {out['meta']['title']}")
        if out['meta'].get('description'):
            parts.append(f"DESCRIPTION: {out['meta']['description']}")
        parts.append("=== CONTENU DE LA PAGE ===")
        parts.append(out['html_text'])
        for p in out['pdfs']:
            parts.append(f"\n=== PDF: {p['url']} ===")
            parts.append(p['text'])

        out['full_text'] = '\n\n'.join(parts)[:max_total_chars]

    except Exception as e:
        log.exception('deep_extract failed for %s', url)
        out['error'] = str(e)

    return out
