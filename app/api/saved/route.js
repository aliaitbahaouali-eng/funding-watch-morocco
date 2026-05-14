import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getOrgId(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized', status: 401 };
  const { data: org } = await supabase.from('organizations').select('id').eq('user_id', user.id).single();
  if (!org) return { error: 'no_org', status: 400 };
  return { orgId: org.id };
}

export async function POST(request) {
  const supabase = createClient();
  const { orgId, error, status } = await getOrgId(supabase);
  if (error) return NextResponse.json({ error }, { status });
  const { opportunity_id, notes } = await request.json();
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id requis' }, { status: 400 });

  const { data, error: err } = await supabase
    .from('saved_opportunities')
    .upsert({ organization_id: orgId, opportunity_id, notes: notes || null, status: 'saved' }, { onConflict: 'organization_id,opportunity_id' })
    .select()
    .single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: data });
}

export async function DELETE(request) {
  const supabase = createClient();
  const { orgId, error, status } = await getOrgId(supabase);
  if (error) return NextResponse.json({ error }, { status });
  const { opportunity_id } = await request.json();
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id requis' }, { status: 400 });

  const { error: err } = await supabase
    .from('saved_opportunities')
    .delete()
    .eq('organization_id', orgId)
    .eq('opportunity_id', opportunity_id);
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
