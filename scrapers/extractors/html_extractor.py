"""HTML extractor : récupère et nettoie le contenu complet d'une page d'opportunité."""
import re
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

USER_AGENT = "FundingWatchBot/1.0 (+https://fundingwatch.ma)"
HEADERS = {"User-Agent": USER_AGENT, "Accept-Language": "fr,en;q=0.8"}
NUISANCE_TAGS = ('script', 'style', 'noscript', 'nav', 'footer', 'aside', 'iframe', 'svg', 'video', 'audio')
NUISANCE_CLASSES = ('header', 'footer', 'menu', 'navigation', 'cookie', 'banner', 'sidebar', 'social')


def fetch_page(url: str, timeout: int = 30) -> tuple[str, str]:
    """Fetch une page. Renvoie (html, final_url) après redirections."""
    res = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    res.raise_for_status()
    return res.text, res.url


def extract_main_content(html: str, max_chars: int = 12000) -> str:
    """Extrait le bloc de contenu principal en supprimant nav/footer/scripts.

    Stratégie multi-niveaux : essaie des sélecteurs spécifiques, puis tombe sur
    le body. Si le résultat est trop court (<500), bascule sur le body brut.
    """
    soup = _soup(html)
    # Vire nuisances
    for tag in soup.find_all(NUISANCE_TAGS):
        tag.decompose()
    for cls in NUISANCE_CLASSES:
        for tag in soup.find_all(class_=re.compile(cls, re.IGNORECASE)):
            tag.decompose()

    # Tentatives en cascade
    candidates = []
    for finder in [
        lambda: soup.find('article'),
        lambda: soup.find('main'),
        lambda: soup.find(id=re.compile('content|main|article|post|entry', re.IGNORECASE)),
        lambda: soup.find(class_=re.compile('entry-content|post-content|article-content|main-content|single-content|article-body|story|page-content|details', re.IGNORECASE)),
        lambda: soup.find(class_=re.compile('content|article|post', re.IGNORECASE)),
        lambda: soup.body,
    ]:
        try:
            el = finder()
            if el:
                candidates.append(el)
        except Exception:
            pass

    # Prendre le meilleur candidat (texte le plus long)
    best_text = ''
    for c in candidates:
        text = c.get_text('\n', strip=True)
        text = re.sub(r'\n{3,}', '\n\n', text)
        if len(text) > len(best_text):
            best_text = text
        if len(best_text) > 1500:  # assez bon, on s'arrête
            break

    # Si rien de bon, prendre tout le HTML brut nettoyé
    if len(best_text) < 200:
        best_text = soup.get_text('\n', strip=True)
        best_text = re.sub(r'\n{3,}', '\n\n', best_text)

    return best_text[:max_chars]


def find_pdf_links(html: str, base_url: str) -> list[str]:
    """Trouve tous les liens vers des PDF dans la page."""
    soup = _soup(html)
    pdfs = []
    seen = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        full = urljoin(base_url, href)
        if full.lower().split('?')[0].endswith('.pdf'):
            if full not in seen:
                seen.add(full)
                pdfs.append(full)
    return pdfs[:5]  # Limit 5 PDFs par page


def find_document_links(html: str, base_url: str) -> list[dict]:
    """Trouve tous les liens vers des documents téléchargeables (PDF, DOCX, XLSX)."""
    soup = _soup(html)
    out = []
    seen = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        full = urljoin(base_url, href)
        ext = full.lower().split('?')[0].rsplit('.', 1)[-1]
        if ext in ('pdf', 'docx', 'doc', 'xlsx', 'xls'):
            if full not in seen:
                seen.add(full)
                out.append({
                    'url': full,
                    'type': ext,
                    'label': (a.get_text(strip=True) or full.split('/')[-1])[:200]
                })
    return out[:10]


def get_meta_tags(html: str) -> dict:
    """Récupère les meta tags utiles (description, og:*, title)."""
    soup = _soup(html)
    out = {'title': soup.title.get_text(strip=True) if soup.title else None}
    for name in ['description', 'keywords', 'author']:
        m = soup.find('meta', attrs={'name': name})
        if m and m.get('content'):
            out[name] = m['content']
    for prop in ['og:title', 'og:description', 'og:type']:
        m = soup.find('meta', attrs={'property': prop})
        if m and m.get('content'):
            out[prop] = m['content']
    return out


def _soup(html: str):
    try:
        return BeautifulSoup(html, 'lxml')
    except Exception:
        return BeautifulSoup(html, 'html.parser')
