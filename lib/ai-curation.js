/**
 * AI Curation (Sprint 6 / Option A)
 * --------------------------------------------------------------------------
 * Pipeline : URL collée par l'admin → fetch HTML → Claude extract → draft
 * pré-rempli en DB. Validation 1-clic ensuite via /admin/validation.
 *
 * ⚠️ Serveur uniquement. Utilise process.env.ANTHROPIC_API_KEY.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

/**
 * Récupère le HTML d'une URL et le nettoie pour passage à Claude.
 * Limite : 25 KB de texte propre max (largement suffisant pour une page d'opp).
 */
export async function fetchPageContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FundingWatchMA/1.0 (+https://funding-watch-morocco.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr,en;q=0.8,ar;q=0.6',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) {
      return { ok: false, error: `Type non supporté: ${ct}` };
    }
    let html = await res.text();
    if (html.length > 500000) html = html.slice(0, 500000);

    // Nettoyage minimal : retire scripts, styles, nav, footer
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')          // strip tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Garde max 25 KB de texte
    const truncated = cleaned.slice(0, 25000);
    return { ok: true, text: truncated, originalLength: cleaned.length };
  } catch (e) {
    clearTimeout(timeout);
    return { ok: false, error: e.name === 'AbortError' ? 'Timeout 20s' : e.message };
  }
}

/**
 * Demande à Claude d'extraire toutes les infos d'une opportunité depuis
 * le texte d'une page web. Retourne un objet structuré + usage tokens.
 */
export async function extractOpportunityWithClaude(pageText, sourceUrl) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY manquante — curation impossible sans Claude');
  }

  const systemPrompt = `Tu es un assistant de curation pour Funding Watch Morocco, une plateforme qui recense
les opportunités de financement destinées aux associations, ONG et coopératives MAROCAINES.

À partir du texte d'une page web, extrais TOUTES les informations utiles d'une opportunité
de financement et retourne un JSON STRICTEMENT au format ci-dessous. Si une info est absente,
mets null (n'invente JAMAIS de données).

Format de sortie obligatoire :
{
  "title": "titre de l'opportunité (max 150 chars, sans préfixe site)",
  "donor_name": "nom du bailleur / institution (ex: AFD, EU, UNDP Morocco)",
  "summary": "résumé en français de 2-3 phrases, max 280 chars",
  "description": "description complète restructurée en français, max 2000 chars",
  "type": "subvention|appel à projets|bourse|prix|prestation|autre",
  "amount_min": nombre ou null,
  "amount_max": nombre ou null,
  "currency": "EUR|USD|MAD|GBP",
  "deadline": "YYYY-MM-DD ou null",
  "publication_date": "YYYY-MM-DD ou null",
  "language": "fr|ar|en|es",
  "countries_eligible": ["MA","TN",...] ou ["MENA"] ou ["AFRICA"] ou ["WORLDWIDE"],
  "morocco_eligibility": "explicit|regional|global|excluded|unknown",
  "target_org_types": ["association","ong","cooperative","fondation"] (un ou plusieurs),
  "theme_slugs": ["femmes","jeunes","climat","ess","education","sante","culture","droits-humains","rural","innovation","digital","migration"] (max 4),
  "difficulty_level": "Accessible|Moyen|Élevé",
  "required_documents": ["statuts","budget prévisionnel",...] (liste courte),
  "eligibility": "texte des critères d'éligibilité tels que dans la page, max 1000 chars",
  "ngo_relevant": true ou false,
  "ngo_relevance_score": entier 0-100,
  "ngo_relevance_reason": "phrase courte expliquant pourquoi",
  "verified": true (toujours true car curation manuelle),
  "curation_notes": "notes optionnelles pour l'admin (max 200 chars), ex: 'deadline pas trouvée, à vérifier'"
}

Règles importantes :
- morocco_eligibility="explicit" UNIQUEMENT si Morocco/Maroc/MENA/Maghreb explicitement mentionné
- morocco_eligibility="regional" si Afrique/monde arabe/Méditerranée sans Maroc direct
- morocco_eligibility="excluded" si l'opp est restreinte à des pays excluant le Maroc
- ngo_relevant=false si c'est une offre d'emploi individuelle, bourse étudiante, marché commercial
- target_org_types : choisir le ou les types d'org éligibles (asso, ONG, coopérative, fondation)
- Si tu hésites entre 2 niveaux morocco_eligibility, prends le plus prudent
- summary doit DONNER ENVIE de candidater, pas être un résumé technique

Réponds UNIQUEMENT avec le JSON, sans backticks, sans commentaires.`;

  const userMessage = `URL source : ${sourceUrl}

Contenu de la page :
---
${pageText}
---

Extrais l'opportunité au format JSON demandé.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.content?.[0]?.text?.trim() || '';

  // Extract JSON (parfois Claude ajoute du texte autour)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude n\'a pas retourné de JSON valide');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('JSON Claude malformé: ' + e.message);
  }

  // Validation minimale
  if (!parsed.title || !parsed.morocco_eligibility) {
    throw new Error('JSON Claude incomplet (title ou morocco_eligibility manquant)');
  }

  // Force verified=true pour curation manuelle
  parsed.verified = true;

  return {
    data: parsed,
    usage: data?.usage || {},
  };
}

/**
 * Pipeline complet : URL → fetch → Claude extract → objet ready-to-insert.
 * Retourne { ok, data, error, usage, durationMs }.
 */
export async function curateFromUrl(url) {
  const started = Date.now();

  // 1. Validation URL
  let urlObj;
  try {
    urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Protocole non supporté');
    }
  } catch (e) {
    return { ok: false, error: 'URL invalide: ' + e.message, durationMs: Date.now() - started };
  }

  // 2. Fetch
  const fetched = await fetchPageContent(url);
  if (!fetched.ok) {
    return { ok: false, error: 'Fetch failed: ' + fetched.error, durationMs: Date.now() - started, stage: 'fetch_error' };
  }
  if (fetched.text.length < 300) {
    return { ok: false, error: 'Page trop courte (' + fetched.text.length + ' chars) — probablement JS/SPA', durationMs: Date.now() - started, stage: 'fetch_error' };
  }

  // 3. Claude extract
  let result;
  try {
    result = await extractOpportunityWithClaude(fetched.text, url);
  } catch (e) {
    return { ok: false, error: 'Extract failed: ' + e.message, durationMs: Date.now() - started, stage: 'extract_error' };
  }

  return {
    ok: true,
    data: result.data,
    usage: result.usage,
    durationMs: Date.now() - started,
    pageSize: fetched.originalLength,
  };
}
