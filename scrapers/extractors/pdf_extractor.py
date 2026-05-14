"""PDF extractor : télécharge un PDF et extrait son texte."""
import io
import logging
import requests

log = logging.getLogger(__name__)

USER_AGENT = "FundingWatchBot/1.0 (+https://fundingwatch.ma)"


def extract_pdf_text(url: str, timeout: int = 60, max_chars: int = 20000) -> str:
    """Télécharge un PDF et renvoie son contenu textuel."""
    try:
        res = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=timeout, stream=True)
        res.raise_for_status()
        # Limite taille (10 Mo max)
        content = res.raw.read(10 * 1024 * 1024)
        return _pdf_to_text(content, max_chars=max_chars)
    except Exception as e:
        log.warning('PDF fetch failed for %s: %s', url, e)
        return ''


def _pdf_to_text(pdf_bytes: bytes, max_chars: int = 20000) -> str:
    """Essaie pypdf, puis pdfminer.six en fallback."""
    # Tente pypdf (plus rapide)
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        out = []
        for page in reader.pages[:50]:
            t = page.extract_text() or ''
            out.append(t)
            if sum(len(x) for x in out) > max_chars:
                break
        text = '\n'.join(out)
        if text.strip():
            return _clean(text)[:max_chars]
    except ImportError:
        pass
    except Exception as e:
        log.warning('pypdf failed: %s', e)

    # Fallback pdfminer
    try:
        from pdfminer.high_level import extract_text
        text = extract_text(io.BytesIO(pdf_bytes))
        return _clean(text)[:max_chars]
    except ImportError:
        log.warning('pypdf ni pdfminer disponibles — installe avec : pip install pypdf pdfminer.six')
    except Exception as e:
        log.warning('pdfminer failed: %s', e)

    return ''


def _clean(text: str) -> str:
    """Nettoie les artefacts PDF courants."""
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'-\n([a-zéèàùçâêîôû])', r'\1', text)  # tirets coupés
    return text.strip()
