import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExecutiveSummary } from '@/lib/ai';

/**
 * POST /api/ai/cowriter  { opportunity_id }
 * AI co-writer : génère un premier jet de résumé exécutif de candidature
 * en combinant le profil de l'organisation de l'utilisateur + le brief de
 * l'opportunité. Réservé aux utilisateurs connectés ayant une organisation.
 */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { opportunity_id } = body || {};
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id requis' }, { status: 400 });

  const [{ data: org }, { data: opp }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, org_type, description, action_summary, intervention_themes_text, city, region')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('opportunities')
      .select('id, title, type, summary, description, eligibility, donors(name)')
      .eq('id', opportunity_id)
      .eq('status', 'published')
      .maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'no_org' }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 });

  const result = await generateExecutiveSummary(org, opp);

  if (!result.ok) {
    const status = result.error === 'no_api_key' ? 503 : 502;
    return NextResponse.json(
      { error: result.error === 'no_api_key' ? 'ai_unavailable' : 'generation_failed' },
      { status },
    );
  }

  return NextResponse.json({ ok: true, draft: result.draft });
}
