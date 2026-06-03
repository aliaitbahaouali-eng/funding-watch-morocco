#!/usr/bin/env node
/**
 * Sprint 5E — Smoke tests.
 *
 * Vérifie qu'un déploiement répond correctement sur les routes critiques,
 * sans dépendance externe (Node 18+ : fetch global). À lancer après chaque
 * déploiement prod, en local, ou en CI.
 *
 *   node scripts/smoke.mjs                       # cible la prod par défaut
 *   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 *   node scripts/smoke.mjs https://un-preview.vercel.app
 *
 * Sortie : liste PASS/FAIL + exit code 1 si au moins un test échoue
 * (utilisable tel quel comme gate CI).
 */

const BASE = (process.argv[2] || process.env.BASE_URL || 'https://funding-watch-morocco.vercel.app').replace(/\/$/, '');
const TIMEOUT_MS = 15000;

/** Une route attendue : path + statut(s) acceptés + check optionnel sur le body. */
const CHECKS = [
  { path: '/',                  expect: [200],      label: 'Landing page' },
  { path: '/opportunities',     expect: [200],      label: 'Liste opportunités' },
  { path: '/themes',            expect: [200],      label: 'Thématiques' },
  { path: '/pricing',           expect: [200],      label: 'Tarifs' },
  { path: '/login',             expect: [200],      label: 'Login' },
  { path: '/register',          expect: [200],      label: 'Register' },
  { path: '/privacy',           expect: [200],      label: 'Confidentialité' },
  { path: '/terms',             expect: [200],      label: 'CGU' },
  { path: '/dashboard',         expect: [200, 307, 302], label: 'Dashboard (redirige si non connecté)' },
  { path: '/sitemap.xml',       expect: [200],      label: 'Sitemap' },
  { path: '/robots.txt',        expect: [200],      label: 'robots.txt' },
  {
    path: '/api/health',
    expect: [200],
    label: 'Health check',
    json: (body) => {
      if (body.status === 'error') return `status=error (${JSON.stringify(body.checks?.env?.missing_required)})`;
      if (!body.checks?.database?.ok) return `database injoignable (${body.checks?.database?.error})`;
      return null; // ok
    },
  },
];

async function hit(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, { redirect: 'manual', signal: ctrl.signal });
    let body = null;
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      body = await res.json().catch(() => null);
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`\n🔥 Smoke tests → ${BASE}\n`);
  let failed = 0;

  for (const c of CHECKS) {
    const t0 = Date.now();
    try {
      const { status, body } = await hit(c.path);
      const ms = Date.now() - t0;
      let problem = null;
      if (!c.expect.includes(status)) problem = `statut ${status}, attendu ${c.expect.join('/')}`;
      else if (c.json && body) problem = c.json(body);

      if (problem) {
        failed++;
        console.log(`  ❌ FAIL  ${c.label.padEnd(40)} ${problem} (${ms}ms)`);
      } else {
        console.log(`  ✅ PASS  ${c.label.padEnd(40)} ${status} (${ms}ms)`);
      }
    } catch (e) {
      failed++;
      console.log(`  ❌ FAIL  ${c.label.padEnd(40)} ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
  }

  console.log(`\n${failed === 0 ? '✅ Tous les smoke tests passent.' : `❌ ${failed} test(s) en échec.`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
