import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/ingest
 * Endpoint utilisé par les scrapers Python pour insérer des opportunités collectées.
 * Auth : header x-cron-secret = process.env.CRON_SECRET.
 *
 * Body :
 * {
 *   source_id: uuid,
 *   items: [{
 *     external_id, title, summary, description, official_url, deadline,
 *     amount_min, amount_max, currency, language, countries_eligible,
 *     morocco_eligible, type, donor_name, theme_slugs?
 *   }],
 *   run: { items_found, duration_ms, status, error_message }
 * }
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const { source_id, items = [], run = {} } = body;
  if (!source_id) return NextResponse.json({ error: 'source_id requis' }, { status: 400 });

  let created = 0, duplicates = 0;
  const themeCache = new Map();   // slug -> id
  const donorCache = new Map();   // name -> id

  for (const item of items) {
    if (!item.official_url || !item.title) continue;

    // Dédoublonnage : external_id ou official_url
    let dupQuery = supabase.from('opportunities').select('id').limit(1);
    if (item.external_id) dupQuery = dupQuery.eq('source_id', source_id).eq('external_id', item.external_id);
    else dupQuery = dupQuery.eq('official_url', item.official_url);
    const { data: existing } = await dupQuery;
    if (existing && existing.length > 0) { duplicates++; continue; }

    // Bailleur : upsert si fourni
    let donor_id = null;
    if (item.donor_name) {
      if (donorCache.has(item.donor_name)) donor_id = donorCache.get(item.donor_name);
      else {
        const { data: d } = await supabase.from('donors').select('id').eq('name', item.donor_name).maybeSingle();
        if (d) donor_id = d.id;
        else {
          const { data: created } = await supabase.from('donors').insert({ name: item.donor_name }).select('id').single();
          donor_id = created?.id;
        }
        donorCache.set(item.donor_name, donor_id);
      }
    }

    // Insertion en status='draft'
    const { data: opp, error } = await supabase.from('opportunities').insert({
      title: item.title,
      donor_id,
      source_id,
      type: item.type || null,
      summary: item.summary || null,
      description: item.description || null,
      eligibility: item.eligibility || null,
      amount_min: item.amount_min ?? null,
      amount_max: item.amount_max ?? null,
      currency: item.currency || 'EUR',
      deadline: item.deadline || null,
      publication_date: item.publication_date || null,
      official_url: item.official_url,
      source_url: item.source_url || item.official_url,
      language: item.language || 'fr',
      countries_eligible: item.countries_eligible || [],
      morocco_eligible: !!item.morocco_eligible,
      difficulty_level: item.difficulty_level || null,
      required_documents: item.required_documents || [],
      status: 'draft',
      verified: false,
      external_id: item.external_id || null,
      // NGO-fit (S1)
      ngo_relevant: item.ngo_relevant ?? null,
      ngo_relevance_score: item.ngo_relevance_score ?? null,
      ngo_relevance_reason: item.ngo_relevance_reason ?? null,
      target_org_types: item.target_org_types || [],
      collected_at: new Date().toISOString()
    }).select('id').single();

    if (error) continue;
    created++;

    // Thématiques (si fournies)
    if (Array.isArray(item.theme_slugs) && item.theme_slugs.length) {
      const links = [];
      for (const slug of item.theme_slugs) {
        let theme_id = themeCache.get(slug);
        if (!theme_id) {
          const { data: t } = await supabase.from('themes').select('id').eq('slug', slug).maybeSingle();
          if (t) { theme_id = t.id; themeCache.set(slug, theme_id); }
        }
        if (theme_id) links.push({ opportunity_id: opp.id, theme_id });
      }
      if (links.length) await supabase.from('opportunity_themes').insert(links);
    }
  }

  // Log
  await supabase.from('scraping_logs').insert({
    source_id,
    source_name: run.source_name || null,
    status: run.status || (created > 0 ? 'success' : (duplicates > 0 ? 'partial' : 'success')),
    items_found: run.items_found ?? items.length,
    items_created: created,
    duplicates,
    duration_ms: run.duration_ms || null,
    error_message: run.error_message || null,
    metadata: run.metadata || null
  });

  // Update source.last_checked
  await supabase.from('sources').update({
    last_checked: new Date().toISOString(),
    last_status: run.status || 'success'
  }).eq('id', source_id);

  return NextResponse.json({ ok: true, created, duplicates });
}
