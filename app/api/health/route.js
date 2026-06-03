import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Sprint 5E — Health check.
 * GET /api/health
 *
 * Endpoint de monitoring (uptime robots, Vercel, smoke tests). Public, mais
 * ne renvoie QUE des booléens present/absent pour les secrets — jamais une
 * valeur. Vérifie : variables d'env critiques + connectivité base de données.
 *
 * Codes :
 *   200 "ok"        → tout va bien
 *   200 "degraded"  → app fonctionnelle mais une intégration optionnelle
 *                     (OpenAI / Anthropic / Brevo) n'est pas configurée
 *   503 "error"     → une dépendance critique est cassée (env requis manquant
 *                     ou base de données injoignable) → l'app ne peut pas servir
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function present(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.length > 0;
}

export async function GET() {
  const startedAt = Date.now();

  // 1. Variables d'environnement
  const requiredEnv = {
    NEXT_PUBLIC_SUPABASE_URL: present('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
  };
  const optionalEnv = {
    OPENAI_API_KEY: present('OPENAI_API_KEY'),
    ANTHROPIC_API_KEY: present('ANTHROPIC_API_KEY'),
    BREVO_API_KEY: present('BREVO_API_KEY'),
  };
  const missingRequired = Object.entries(requiredEnv).filter(([, ok]) => !ok).map(([k]) => k);
  const missingOptional = Object.entries(optionalEnv).filter(([, ok]) => !ok).map(([k]) => k);

  // 2. Connectivité base de données (ping léger : count head, 0 ligne transférée)
  const db = { ok: false, latency_ms: null, error: null };
  try {
    const supabase = createAdminClient();
    const t0 = Date.now();
    const { error, count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true });
    db.latency_ms = Date.now() - t0;
    if (error) {
      db.error = error.message;
    } else {
      db.ok = true;
      db.opportunities_count = count ?? null;
    }
  } catch (e) {
    db.error = e?.message || 'admin client unavailable';
  }

  // 3. Verdict
  let status = 'ok';
  if (missingRequired.length > 0 || !db.ok) status = 'error';
  else if (missingOptional.length > 0) status = 'degraded';

  const body = {
    status,
    timestamp: new Date().toISOString(),
    uptime_check_ms: Date.now() - startedAt,
    checks: {
      env: {
        required: requiredEnv,
        optional: optionalEnv,
        missing_required: missingRequired,
        missing_optional: missingOptional,
      },
      database: db,
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  };

  return NextResponse.json(body, {
    status: status === 'error' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
