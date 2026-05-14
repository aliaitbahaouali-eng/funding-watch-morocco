import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['saved','analyzing','preparing','submitted','abandoned','won','lost'];

export async function PATCH(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id, status, notes, reminder_at } = await request.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'status invalide' }, { status: 400 });

  // RLS s'assurera que l'user ne peut update que ses propres saved
  const update = {};
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;
  if (reminder_at !== undefined) update.reminder_at = reminder_at;

  const { data, error } = await supabase
    .from('saved_opportunities')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, application: data });
}
