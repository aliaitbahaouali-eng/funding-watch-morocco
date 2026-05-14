import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * POST /api/admin/test-source { source_id }
 * Lance le scraper Python en --dry-run pour cette source et renvoie le résultat.
 * Auth : utilisateur admin.
 */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['admin', 'veille'].includes(profile?.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { source_id } = await request.json();
  if (!source_id) return NextResponse.json({ error: 'source_id requis' }, { status: 400 });

  const { data: src } = await supabase.from('sources').select('parser_key, name').eq('id', source_id).single();
  if (!src?.parser_key) return NextResponse.json({ error: 'source introuvable' }, { status: 404 });

  // Lance le scraper en dry-run pour cette source uniquement
  const projectRoot = process.cwd();
  return new Promise((resolve) => {
    const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pyCmd, [
      path.join('scrapers', 'scraper.py'),
      '--source', src.parser_key,
      '--dry-run'
    ], { cwd: projectRoot, env: process.env });

    let stdout = '', stderr = '';
    const timeout = setTimeout(() => { child.kill(); resolve(NextResponse.json({ error: 'timeout (60s)', stdout, stderr }, { status: 504 })); }, 60000);

    child.stdout.on('data', (b) => { stdout += b.toString(); });
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      let parsed = null;
      try {
        const lastBrace = stdout.lastIndexOf('[');
        if (lastBrace >= 0) parsed = JSON.parse(stdout.slice(lastBrace));
      } catch {}
      resolve(NextResponse.json({
        ok: code === 0,
        code,
        source: src.name,
        parser_key: src.parser_key,
        result: parsed,
        stderr_tail: stderr.split('\n').slice(-15).join('\n')
      }));
    });
    child.on('error', (e) => {
      clearTimeout(timeout);
      resolve(NextResponse.json({ error: e.message, stdout, stderr }, { status: 500 }));
    });
  });
}
