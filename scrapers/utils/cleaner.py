"""Nettoyage HTML / texte : extraction de contenu propre depuis le HTML brut."""
import re
import html
from bs4 import BeautifulSoup, Comment


# Tags à éliminer complètement (avec contenu)
NUISANCE_TAGS = ('script', 'style', 'noscript', 'nav', 'footer', 'aside',
                 'iframe', 'svg', 'video', 'audio', 'form')


def clean_html(raw: str) -> str:
    """Renvoie un texte propre lisible à partir d'un HTML."""
    if not raw:
        return ''
    soup = _soup(raw)
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for tag in soup.find_all(NUISANCE_TAGS):
        tag.decompose()
    text = soup.get_text(separator=' ', strip=True)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_main_content(raw: str, max_chars: int = 8000) -> str:
    """Extrait le bloc principal d'une page : <main>, <article>, ou body."""
    soup = _soup(raw)
    for tag in soup.find_all(NUISANCE_TAGS):
        tag.decompose()
    container = soup.find('main') or soup.find('article') or soup.find(id=lambda x: x and 'content' in x.lower()) or soup.body
    if not container:
        container = soup
    text = container.get_text(separator='\n', strip=True)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text[:max_chars]


def html_to_links(raw: str, base_url: str = None) -> list[dict]:
    """Extrait tous les liens (<a>) avec leur texte et leur href absolu."""
    from urllib.parse import urljoin
    soup = _soup(raw)
    links = []
    seen = set()
    for a in soup.select('a[href]'):
        href = a.get('href', '').strip()
        if not href or href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
            continue
        text = a.get_text(' ', strip=True)
        if not text or len(text) < 4:
            continue
        full = urljoin(base_url, href) if base_url else href
        key = full.split('#')[0]
        if key in seen:
            continue
        seen.add(key)
        links.append({'text': text, 'href': full})
    return links


def _soup(raw: str):
    try:
        return BeautifulSoup(raw, 'lxml')
    except Exception:
        return BeautifulSoup(raw, 'html.parser')
