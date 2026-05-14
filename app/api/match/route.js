import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/match?limit=10
 * Renvoie les top N opportunités matchées pour l'org de l'utilisateur connecté,
 * via la fonction SQL match_opportunities_for_org(org_id, limit).
 */
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '10', 10));

  // Trouve l'org
  const { data: org } = await supabase
    .from('organizations')
    .select('id, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!org) return NextResponse.json({ matches: [], reason: 'no_org' });
  if (!org.onboarding_completed) return NextResponse.json({ matches: [], reason: 'onboarding_incomplete' });

  // Appel à la fonction SQL
  const { data, error } = await supabase.rpc('match_opportunities_for_org', {
    p_org_id: org.id,
    p_limit: limit,
  });

  if (error) {
    console.error('match_opportunities_for_org failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ matches: data || [], count: data?.length || 0 });
}
