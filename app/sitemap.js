import { createClient } from '@/lib/supabase/server';

/**
 * Sprint 4K — Sitemap dynamique.
 * Inclut les pages statiques publiques + une URL par opportunité publiée
 * (non-expirée, non-test, non-dup). Permet à Google d'indexer le long-tail
 * SEO ("appel à projet UE jeunes Maroc 2026", etc.).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';

export default async function sitemap() {
  const supabase = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { url: '/', changeFrequency: 'daily', priority: 1.0 },
    { url: '/opportunities', changeFrequency: 'hourly', priority: 0.9 },
    { url: '/themes', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/calendar', changeFrequency: 'daily', priority: 0.7 },
    { url: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { url: '/pricing', changeFrequency: 'monthly', priority: 0.6 },
    { url: '/contact', changeFrequency: 'monthly', priority: 0.4 },
    { url: '/register', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/login', changeFrequency: 'monthly', priority: 0.4 },
    // Sprint 5A.5 — /news /resources /insights /training retirés du sitemap
    // (pages placeholder peu actionables). Routes encore accessibles directement
    // mais plus indexées ni linkées depuis la nav.
    { url: '/community', changeFrequency: 'weekly', priority: 0.4 },
  ].map((p) => ({
    url: `${APP_URL}${p.url}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Opps publiées non-expirées non-tests non-dups
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, updated_at, deadline')
    .eq('status', 'published')
    .or('is_test.is.null,is_test.eq.false')
    .is('duplicate_of_id', null)
    .or(`deadline.is.null,deadline.gte.${todayIso}`)
    .limit(5000);

  const oppPages = (opps || []).map((o) => {
    // Urgence = priorité plus haute (proxy : si deadline < 30j, priorité 0.8, sinon 0.6)
    let priority = 0.6;
    if (o.deadline) {
      const days = Math.ceil((new Date(o.deadline) - new Date()) / 86400000);
      if (days <= 30) priority = 0.85;
      else if (days <= 90) priority = 0.7;
    }
    return {
      url: `${APP_URL}/opportunities/${o.id}`,
      lastModified: o.updated_at ? new Date(o.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority,
    };
  });

  return [...staticPages, ...oppPages];
}
