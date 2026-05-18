/**
 * Embeddings — wrapper unifié OpenAI text-embedding-3-small + fallback.
 * Équivalent JS de scrapers/ai/embeddings.py pour les server actions.
 *
 * Sans OPENAI_API_KEY → fallback hash déterministe (matching dégradé,
 * mais pipeline non bloqué).
 */

const DEFAULT_DIMS = 1536;

export async function getEmbedding(text, { retry = 2 } = {}) {
  const clean = String(text || '').trim().slice(0, 8000);
  if (!clean) return { vector: new Array(DEFAULT_DIMS).fill(0), model: 'empty' };

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: clean,
            dimensions: DEFAULT_DIMS,
          }),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`OpenAI ${res.status}: ${errBody.slice(0, 200)}`);
        }
        const data = await res.json();
        return { vector: data.data[0].embedding, model: 'openai/text-embedding-3-small' };
      } catch (e) {
        if (attempt === retry) {
          console.warn('[embeddings] OpenAI failed after retries, fallback to hash:', e.message);
          break;
        }
        await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
      }
    }
  }

  return { vector: hashEmbedding(clean), model: 'fallback/hash' };
}

/** Fallback déterministe basé sur sha256. Pas sémantique mais évite les null. */
function hashEmbedding(text) {
  // Deno/Edge runtime safe : utilise Web Crypto via TextEncoder + simple bit-mixing
  // Pour la prod Node on pourrait utiliser require('crypto').createHash, mais
  // on garde portable.
  const out = new Array(DEFAULT_DIMS);
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  for (let i = 0; i < DEFAULT_DIMS; i++) {
    h1 = Math.imul(h1, 1597334677) + i;
    h2 = Math.imul(h2, 2862933555) + (i << 1);
    const v = ((h1 ^ h2) | 0) / 2147483648.0;
    out[i] = v;
  }
  // Normalisation L2 pour cosine similarity
  let norm = 0;
  for (let i = 0; i < DEFAULT_DIMS; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < DEFAULT_DIMS; i++) out[i] /= norm;
  return out;
}

/**
 * Construit le texte sémantique d'une organisation pour embedding.
 * Mirrors scrapers/ai/embeddings.py::build_org_text.
 */
export function buildOrgText(org, { sdgNames = [], dacNames = [], populations = [], geographies = [] } = {}) {
  const parts = [];
  if (org?.name) parts.push(`Organisation : ${org.name}`);
  if (org?.org_type) parts.push(`Type : ${org.org_type}`);
  if (org?.description) parts.push(`Description : ${org.description}`);
  if (org?.action_summary) parts.push(`Action : ${org.action_summary}`);
  if (org?.intervention_themes_text) parts.push(`Thématiques : ${org.intervention_themes_text}`);
  if (org?.city || org?.region) parts.push(`Localisation : ${[org.city, org.region].filter(Boolean).join(' ')}`);
  if (sdgNames.length) parts.push(`Objectifs de développement durable visés : ${sdgNames.join(', ')}`);
  if (dacNames.length) parts.push(`Secteurs d'intervention : ${dacNames.join(', ')}`);
  if (populations.length) parts.push(`Populations cibles : ${populations.join(', ')}`);
  if (geographies.length) parts.push(`Zones d'action : ${geographies.join(', ')}`);
  if (org?.past_projects && Array.isArray(org.past_projects) && org.past_projects.length) {
    const ps = org.past_projects.slice(0, 3).map((p) =>
      `${p.title || '?'} (${p.donor || '?'}, ${p.year || '?'}) : ${p.summary || ''}`
    );
    parts.push(`Projets passés : ${ps.join(' | ')}`);
  }
  return parts.join('\n');
}
