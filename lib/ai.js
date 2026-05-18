/**
 * Architecture IA — Claude API (Anthropic) avec fallback heuristique.
 *
 * Si `ANTHROPIC_API_KEY` est définie : on appelle Claude.
 * Sinon : on utilise les heuristiques locales (fonctionne sans clé).
 *
 * ⚠️ Ces fonctions ne doivent JAMAIS être appelées depuis un composant client.
 * Elles utilisent une clé API serveur. Appel uniquement depuis :
 *   - Server Components / Server Actions
 *   - Route Handlers (app/api/*)
 *   - Scripts serveur (scrapers — via subprocess Node ou ré-implémenter en Python)
 */

import { THEME_KEYWORDS } from './theme-keywords';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';

function hasApiKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Call Claude. `system` peut être :
 *   - une string (rétrocompat)
 *   - un array de blocks {type:'text', text, cache_control?} — utile pour
 *     marquer une partie statique comme cachée via prompt caching.
 *
 * Retourne la string par défaut. Passe `returnUsage:true` pour récupérer
 * {text, usage} où usage = {input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens}.
 */
async function callClaude({ system, user, maxTokens = 512, returnUsage = false }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data?.content?.[0]?.text || '').trim();
  if (returnUsage) {
    return { text, usage: data?.usage || {} };
  }
  return text;
}

// =================================================================
// 1) summarizeOpportunity — résumé en français, 2 phrases max
// =================================================================
export async function summarizeOpportunity(text, { maxLength = 280 } = {}) {
  if (!text) return '';
  if (!hasApiKey()) return heuristicSummary(text, maxLength);
  try {
    const summary = await callClaude({
      system: 'Tu résumes les appels à projets de financement pour des associations marocaines, en français, en 2 phrases courtes. Pas de mise en forme, pas de listes.',
      user: `Texte de l'appel à projets :\n\n${text.slice(0, 4000)}\n\nRésume en français en 2 phrases (max ${maxLength} caractères).`,
      maxTokens: 250
    });
    return summary.slice(0, maxLength);
  } catch (e) {
    console.warn('[ai.summarize] fallback heuristique :', e.message);
    return heuristicSummary(text, maxLength);
  }
}

function heuristicSummary(text, maxLength) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return sentences.length > maxLength ? sentences.slice(0, maxLength - 1) + '…' : sentences;
}

// =================================================================
// 2) classifyThemes — retourne les slugs des thématiques détectées
// =================================================================
export async function classifyThemes(text, availableThemes = []) {
  if (!text) return [];
  const themesList = availableThemes.length
    ? availableThemes
    : Object.keys(THEME_KEYWORDS).map(slug => ({ slug, name_fr: slug }));

  if (!hasApiKey()) return heuristicClassify(text, themesList);

  try {
    const slugs = themesList.map(t => t.slug).join(', ');
    const raw = await callClaude({
      system: 'Tu classes un appel à projets dans les thématiques fournies. Réponds uniquement avec une liste JSON de slugs, sans explication. Exemple : ["femmes","jeunes"]. Si rien ne correspond clairement, renvoie [].',
      user: `Thématiques disponibles (slugs) : ${slugs}\n\nAppel à projets :\n${text.slice(0, 3000)}\n\nRéponds avec un JSON array de slugs (1 à 4 max).`,
      maxTokens: 100
    });
    const match = raw.match(/\[.*\]/s);
    if (!match) return heuristicClassify(text, themesList);
    const arr = JSON.parse(match[0]);
    const valid = new Set(themesList.map(t => t.slug));
    return arr.filter(s => valid.has(s)).slice(0, 4);
  } catch (e) {
    console.warn('[ai.classifyThemes] fallback :', e.message);
    return heuristicClassify(text, themesList);
  }
}

function heuristicClassify(text, themesList) {
  const lower = text.toLowerCase();
  const map = Object.fromEntries(
    themesList.map(t => [t.slug, t.keywords || THEME_KEYWORDS[t.slug] || [t.slug]])
  );
  const found = [];
  for (const [slug, keywords] of Object.entries(map)) {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) found.push(slug);
  }
  return found.slice(0, 4);
}

// =================================================================
// 3) detectCountries — pays éligibles + Maroc oui/non
// =================================================================
export async function detectCountries(text) {
  if (!text) return { countries: [], morocco_eligible: false };
  if (!hasApiKey()) return heuristicCountries(text);

  try {
    const raw = await callClaude({
      system: 'Tu identifies les pays/régions éligibles pour un appel à projets. Réponds en JSON : {"countries":["ISO2 ou région"], "morocco_eligible": boolean}. Régions acceptées : MENA, MAGHREB, AFRICA, MED, WORLDWIDE, EU-NEIGHBOURHOOD.',
      user: `Texte :\n${text.slice(0, 3000)}\n\nRetourne uniquement le JSON.`,
      maxTokens: 150
    });
    const match = raw.match(/\{.*\}/s);
    if (!match) return heuristicCountries(text);
    const parsed = JSON.parse(match[0]);
    return {
      countries: Array.isArray(parsed.countries) ? parsed.countries.slice(0, 30) : [],
      morocco_eligible: !!parsed.morocco_eligible
    };
  } catch (e) {
    console.warn('[ai.detectCountries] fallback :', e.message);
    return heuristicCountries(text);
  }
}

function heuristicCountries(text) {
  const lower = text.toLowerCase();
  const countries = [];
  const map = {
    'maroc': 'MA', 'morocco': 'MA',
    'tunisie': 'TN', 'tunisia': 'TN',
    'algerie': 'DZ', 'algeria': 'DZ',
    'egypte': 'EG', 'egypt': 'EG',
    'senegal': 'SN', 'mali': 'ML',
    'mena': 'MENA', 'maghreb': 'MAGHREB',
    'afrique': 'AFRICA', 'africa': 'AFRICA',
    'mediterranee': 'MED', 'worldwide': 'WORLDWIDE'
  };
  for (const [needle, code] of Object.entries(map)) {
    if (lower.includes(needle)) countries.push(code);
  }
  const morocco_eligible =
    countries.includes('MA') || countries.includes('MENA') || countries.includes('MAGHREB') ||
    countries.includes('AFRICA') || countries.includes('MED') || countries.includes('WORLDWIDE') ||
    /\bglobal\b|\binternational\b/i.test(lower);
  return { countries: [...new Set(countries)], morocco_eligible };
}

// =================================================================
// 4) generateChecklist
// =================================================================
export async function generateChecklist(opportunity = {}) {
  const base = [
    'Lire l\'appel à projets en entier',
    'Vérifier l\'éligibilité de votre organisation',
    'Préparer le statut juridique et récépissé',
    'Mettre à jour le CV de l\'association',
    'Rédiger la note conceptuelle',
    'Préparer le budget prévisionnel',
    'Identifier les partenaires éventuels',
    'Préparer les annexes (rapports, états financiers)',
    'Relire et soumettre 48h avant la deadline'
  ];
  if (opportunity?.required_documents?.length) {
    return [
      ...base.slice(0, 2),
      ...opportunity.required_documents.map(d => `Préparer : ${d}`),
      ...base.slice(2)
    ];
  }
  // Pas d'appel LLM ici : la checklist générique est suffisante en MVP.
  return base;
}

// =================================================================
// 5b) generateExecutiveSummary — AI co-writer (résumé exécutif)
// Combine le profil de l'organisation + le brief de l'opportunité
// pour produire un premier jet de résumé exécutif de candidature.
// =================================================================
export async function generateExecutiveSummary(org = {}, opportunity = {}) {
  if (!hasApiKey()) {
    return {
      ok: false,
      error: 'no_api_key',
      draft: '',
    };
  }

  const orgProfile = [
    org.name && `Nom : ${org.name}`,
    org.org_type && `Type : ${org.org_type}`,
    org.description && `Description : ${org.description}`,
    org.action_summary && `Action : ${org.action_summary}`,
    org.intervention_themes_text && `Thématiques : ${org.intervention_themes_text}`,
    (org.city || org.region) && `Localisation : ${[org.city, org.region].filter(Boolean).join(', ')}`,
  ].filter(Boolean).join('\n') || 'Profil de l\'organisation non renseigné.';

  const oppBrief = [
    opportunity.title && `Appel : ${opportunity.title}`,
    opportunity.donors?.name && `Bailleur : ${opportunity.donors.name}`,
    opportunity.type && `Type : ${opportunity.type}`,
    opportunity.summary && `Résumé : ${opportunity.summary}`,
    opportunity.description && `Description : ${String(opportunity.description).slice(0, 2500)}`,
    opportunity.eligibility && `Éligibilité : ${opportunity.eligibility}`,
  ].filter(Boolean).join('\n');

  try {
    const { text: draft, usage } = await callClaude({
      system:
        "Tu es un expert en rédaction de propositions de financement pour des associations marocaines. " +
        "Tu rédiges un PREMIER JET de résumé exécutif (executive summary) de candidature, en français, " +
        "concret et professionnel. 3 paragraphes courts : (1) qui est l'organisation et sa légitimité sur ce sujet, " +
        "(2) le projet proposé et son alignement avec l'appel, (3) l'impact attendu et la population bénéficiaire. " +
        "Pas de listes à puces, pas de titres. Reste honnête : n'invente pas de chiffres ou de réalisations précises. " +
        "Si une information manque, utilise une formulation neutre que l'utilisateur complétera (ex. « [à préciser] »).",
      user:
        `PROFIL DE L'ORGANISATION\n${orgProfile}\n\n` +
        `APPEL À PROJETS\n${oppBrief}\n\n` +
        `Rédige le premier jet du résumé exécutif (250-350 mots).`,
      maxTokens: 900,
      returnUsage: true,
    });
    const tokensUsed = (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
    return { ok: true, draft, tokensUsed, usage, model: MODEL };
  } catch (e) {
    console.warn('[ai.generateExecutiveSummary] échec :', e.message);
    return { ok: false, error: e.message, draft: '' };
  }
}

// =================================================================
// 5c) extractOrgProfileFromText — Document Intelligence
// L'utilisateur colle un rapport d'activité, un statut, ou un site web
// scrapé. Claude extrait des champs structurés que l'utilisateur peut
// confirmer/éditer avant écriture sur l'organisation.
// =================================================================
export async function extractOrgProfileFromText(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return { ok: false, error: 'empty_input', data: {} };
  if (clean.length < 60) return { ok: false, error: 'too_short', data: {} };
  if (!hasApiKey()) return { ok: false, error: 'no_api_key', data: {} };

  const truncated = clean.slice(0, 8000);

  try {
    const raw = await callClaude({
      system:
        "Tu analyses des documents d'organisations marocaines à impact social " +
        "(rapports d'activité, statuts, présentation, site web) pour extraire un " +
        "profil structuré utilisable par une plateforme de matching de financements. " +
        "N'invente JAMAIS de chiffres ou de réalisations qui ne figurent pas dans le texte. " +
        "Si une information n'est pas claire, omets le champ (ne renvoie pas \"à préciser\"). " +
        "Réponds STRICTEMENT en JSON, sans markdown ni commentaire.",
      user:
        `Document de l'organisation :\n\n${truncated}\n\n` +
        `Renvoie un JSON avec exactement ces clés (omets celles que tu ne peux pas remplir avec certitude) :\n` +
        `{\n` +
        `  "action_summary": "2-3 phrases décrivant l'action principale de l'organisation",\n` +
        `  "intervention_themes_text": "phrase libre : thématiques principales",\n` +
        `  "mission_long": "1-2 paragraphes (max 800 caractères) sur la mission",\n` +
        `  "geographic_scope": "ex: 'région de Marrakech', 'national Maroc', 'Maghreb'",\n` +
        `  "creation_year": 1999,\n` +
        `  "city": "Casablanca",\n` +
        `  "region": "ma-casablanca-settat",\n` +
        `  "past_projects": [{"title":"...", "year":2023, "donor":"...", "summary":"..."}],\n` +
        `  "suggested_themes": ["femmes","jeunes","climat","education","sante","rural","ess","culture","digital","droits-humains","migration","innovation"]\n` +
        `}\n` +
        `IMPORTANT : pas de markdown autour du JSON. Démarre directement par {.`,
      maxTokens: 1200,
    });

    // Extract JSON (Claude sometimes prefixes/suffixes — be defensive).
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: 'parse_failed', data: {}, raw };
    const parsed = JSON.parse(match[0]);

    // Sanitize: only keep known string/number/array fields.
    const data = {};
    for (const k of ['action_summary', 'intervention_themes_text', 'mission_long', 'geographic_scope', 'city', 'region']) {
      if (typeof parsed[k] === 'string' && parsed[k].trim()) data[k] = parsed[k].trim().slice(0, 1200);
    }
    if (typeof parsed.creation_year === 'number' && parsed.creation_year >= 1900 && parsed.creation_year <= new Date().getFullYear()) {
      data.creation_year = Math.floor(parsed.creation_year);
    }
    if (Array.isArray(parsed.past_projects)) {
      data.past_projects = parsed.past_projects.slice(0, 6).map((p) => ({
        title: String(p?.title || '').slice(0, 200),
        year: typeof p?.year === 'number' ? p.year : null,
        donor: String(p?.donor || '').slice(0, 120),
        summary: String(p?.summary || '').slice(0, 400),
      })).filter((p) => p.title);
    }
    if (Array.isArray(parsed.suggested_themes)) {
      const allowed = new Set(['femmes','jeunes','climat','education','sante','rural','ess','culture','digital','droits-humains','migration','innovation']);
      data.suggested_themes = parsed.suggested_themes.filter((t) => allowed.has(t)).slice(0, 6);
    }
    return { ok: true, data };
  } catch (e) {
    console.warn('[ai.extractOrgProfileFromText] failed:', e?.message || e);
    return { ok: false, error: e?.message || 'unknown', data: {} };
  }
}

// =================================================================
// 6) estimateDifficulty
// =================================================================
export async function estimateDifficulty(opportunity = {}) {
  const text = (opportunity.description || opportunity.summary || '').toLowerCase();
  let score = 0;
  if ((opportunity.amount_max || 0) > 100000) score += 2;
  if ((opportunity.amount_max || 0) > 500000) score += 2;
  if (/partenariat|consortium|partnership/i.test(text)) score += 2;
  if (/audit|evaluation|monitoring|m&e/i.test(text)) score += 1;
  if (/co-funding|cost-share|cofinancement/i.test(text)) score += 1;
  if (score >= 5) return 'Élevé';
  if (score >= 2) return 'Moyen';
  return 'Accessible';
}

export { computeCompatibility } from './scoring';
