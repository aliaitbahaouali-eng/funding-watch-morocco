import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import ValidationBoard from '@/components/admin/ValidationBoard';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Validation drafts — Funding Watch Admin',
  robots: { index: false, follow: false },
};

/**
 * /admin/validation
 *
 * Workflow validation humaine (cahier des charges item 11) :
 *   - liste des opps `draft` + `pending_review`
 *   - filtres : source, bailleur, NGO confidence, Maroc-eligible
 *   - bulk actions : Approve all, Reject all, Approve by source
 *   - raccourcis clavier : J/K (next/prev), P (publish), X (reject), Space (select)
 *   - audit log : chaque action enregistrée dans admin_audit_log
 */

// ─── Server actions ────────────────────────────────────────
async function logAction(supabase, profile, action, targetId, targetIds, reason, metadata) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_user_id: profile?.id || null,
      admin_email: profile?.email || null,
      action,
      target_type: 'opportunity',
      target_id: targetId || null,
      target_ids: targetIds || null,
      reason: reason || null,
      metadata: metadata || {},
    });
  } catch (e) {
    // ne pas bloquer si la table n'existe pas
    console.warn('[admin/validation] audit log failed:', e?.message);
  }
}

async function approveOne(formData) {
  'use server';
  const id = formData.get('id');
  if (!id) return;
  const supabase = createClient();
  const profile = await getCurrentProfile();
  await supabase
    .from('opportunities')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAction(supabase, profile, 'approve', id, null, null, {});
  revalidatePath('/admin/validation');
  revalidatePath('/admin/pending');
  revalidatePath('/opportunities');
}

async function rejectOne(formData) {
  'use server';
  const id = formData.get('id');
  const reason = formData.get('reason') || null;
  if (!id) return;
  const supabase = createClient();
  const profile = await getCurrentProfile();
  await supabase
    .from('opportunities')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAction(supabase, profile, 'reject', id, null, reason, {});
  revalidatePath('/admin/validation');
  revalidatePath('/admin/pending');
}

async function bulkApprove(formData) {
  'use server';
  const idsRaw = formData.get('ids');
  if (!idsRaw) return;
  const ids = String(idsRaw).split(',').filter(Boolean);
  if (ids.length === 0) return;
  const supabase = createClient();
  const profile = await getCurrentProfile();
  await supabase
    .from('opportunities')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .in('id', ids);
  await logAction(supabase, profile, 'bulk_approve', null, ids, null, { count: ids.length });
  revalidatePath('/admin/validation');
  revalidatePath('/admin/pending');
  revalidatePath('/opportunities');
}

async function bulkReject(formData) {
  'use server';
  const idsRaw = formData.get('ids');
  const reason = formData.get('reason') || null;
  if (!idsRaw) return;
  const ids = String(idsRaw).split(',').filter(Boolean);
  if (ids.length === 0) return;
  const supabase = createClient();
  const profile = await getCurrentProfile();
  await supabase
    .from('opportunities')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .in('id', ids);
  await logAction(supabase, profile, 'bulk_reject', null, ids, reason, { count: ids.length });
  revalidatePath('/admin/validation');
  revalidatePath('/admin/pending');
}

// ─── Page ──────────────────────────────────────────────────
export default async function ValidationPage({ searchParams }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = createClient();

  // Filtres URL
  const sourceFilter = searchParams?.source;
  const donorFilter = searchParams?.donor;
  const ngoFilter = searchParams?.ngo; // 'yes' | 'no' | 'unknown' | undefined
  const moroccoOnly = searchParams?.morocco === '1';

  // Query principale
  let query = supabase
    .from('opportunities')
    .select('id, title, summary, deadline, morocco_eligible, ngo_relevant, ngo_relevance_score, ngo_relevance_reason, official_url, status, created_at, donor_id, source_id, donors(name), sources(name)')
    .in('status', ['draft', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (sourceFilter) query = query.eq('source_id', sourceFilter);
  if (donorFilter) query = query.eq('donor_id', donorFilter);
  if (ngoFilter === 'yes') query = query.eq('ngo_relevant', true);
  if (ngoFilter === 'no') query = query.eq('ngo_relevant', false);
  if (ngoFilter === 'unknown') query = query.is('ngo_relevant', null);
  if (moroccoOnly) query = query.eq('morocco_eligible', true);

  const { data: drafts, error } = await query;

  // Stats globales (toujours sans filtre)
  const [{ count: totalDrafts }, { count: ngoOk }, { count: moroccoOk }, { data: sourceStats }] = await Promise.all([
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).in('status', ['draft','pending_review']),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).in('status', ['draft','pending_review']).eq('ngo_relevant', true),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).in('status', ['draft','pending_review']).eq('morocco_eligible', true),
    supabase.from('opportunities').select('source_id, sources(name)').in('status', ['draft','pending_review']),
  ]);

  // Aggrégation sources côté JS (Supabase n'a pas GROUP BY natif via REST)
  const sourceCounts = {};
  (sourceStats || []).forEach((r) => {
    const name = r.sources?.name || '— Sans source —';
    const id = r.source_id || 'null';
    sourceCounts[id] = sourceCounts[id] || { id, name, count: 0 };
    sourceCounts[id].count += 1;
  });
  const topSources = Object.values(sourceCounts).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <ValidationBoard
      drafts={drafts || []}
      error={error?.message}
      stats={{
        total: totalDrafts || 0,
        ngoOk: ngoOk || 0,
        moroccoOk: moroccoOk || 0,
        topSources,
      }}
      filters={{ source: sourceFilter, donor: donorFilter, ngo: ngoFilter, moroccoOnly }}
      actions={{ approveOne, rejectOne, bulkApprove, bulkReject }}
    />
  );
}
