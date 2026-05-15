import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganization, getCurrentUser, canManageTeam } from '@/lib/auth';
import { Card } from '@/components/ui';
import CopyToClipboardButton from '@/components/ui/CopyToClipboardButton';

export const dynamic = 'force-dynamic';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Peut tout faire, y compris inviter et retirer des membres' },
  { value: 'contributor', label: 'Contributeur', desc: 'Peut éditer le profil et gérer les candidatures' },
  { value: 'viewer', label: 'Viewer', desc: 'Lecture seule (matches, opps, candidatures)' },
];

export default async function TeamPage() {
  const org = await getCurrentOrganization();
  if (!org) redirect('/onboarding');

  const supabase = createClient();
  const session = await getCurrentUser();
  const canManage = canManageTeam(org);

  // Récupère membres + invitations + owner
  const [{ data: members }, { data: invites }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('user_id, role, added_at, profiles!inner(email, full_name)')
      .eq('organization_id', org.id)
      .order('added_at', { ascending: true }),
    supabase
      .from('organization_invitations')
      .select('id, email, role, status, token, created_at, expires_at')
      .eq('organization_id', org.id)
      .in('status', ['pending'])
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', org.user_id)
      .maybeSingle(),
  ]);

  async function inviteMember(formData) {
    'use server';
    const email = (formData.get('email') || '').toString().trim().toLowerCase();
    const role = (formData.get('role') || 'viewer').toString();
    if (!email || !email.includes('@')) return;
    if (!['admin', 'contributor', 'viewer'].includes(role)) return;

    const org = await getCurrentOrganization();
    if (!org || !canManageTeam(org)) return;
    const session = await getCurrentUser();

    // admin client pour lookup profile par email (RLS empêche un user de voir d'autres profils)
    const admin = createAdminClient();
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (existingProfile) {
      const { data: dup } = await admin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('user_id', existingProfile.id)
        .maybeSingle();
      if (!dup && existingProfile.id !== org.user_id) {
        await admin.from('organization_members').insert({
          organization_id: org.id,
          user_id: existingProfile.id,
          role,
          added_by: session?.user?.id || null,
        });
      }
    } else {
      // Pas de compte → invitation token (admin bypass pour upsert idempotent même si RLS du créateur passe)
      await admin.from('organization_invitations').upsert({
        organization_id: org.id,
        email,
        role,
        invited_by: session?.user?.id || null,
        status: 'pending',
      }, { onConflict: 'organization_id,email' });
    }
    revalidatePath('/dashboard/team');
  }

  async function updateMemberRole(formData) {
    'use server';
    const userId = (formData.get('user_id') || '').toString();
    const role = (formData.get('role') || '').toString();
    if (!userId || !['admin', 'contributor', 'viewer'].includes(role)) return;
    const sb = createClient();
    const org = await getCurrentOrganization();
    if (!org || !canManageTeam(org)) return;
    await sb.from('organization_members').update({ role }).eq('organization_id', org.id).eq('user_id', userId);
    revalidatePath('/dashboard/team');
  }

  async function removeMember(formData) {
    'use server';
    const userId = (formData.get('user_id') || '').toString();
    if (!userId) return;
    const sb = createClient();
    const org = await getCurrentOrganization();
    if (!org || !canManageTeam(org)) return;
    await sb.from('organization_members').delete().eq('organization_id', org.id).eq('user_id', userId);
    revalidatePath('/dashboard/team');
  }

  async function revokeInvitation(formData) {
    'use server';
    const id = (formData.get('id') || '').toString();
    if (!id) return;
    const sb = createClient();
    const org = await getCurrentOrganization();
    if (!org || !canManageTeam(org)) return;
    await sb.from('organization_invitations').update({ status: 'revoked' }).eq('id', id).eq('organization_id', org.id);
    revalidatePath('/dashboard/team');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Équipe</h1>
        <p className="mt-1 text-slate-500">
          Invite des collègues à collaborer sur le profil et les candidatures de <b>{org.name}</b>.
        </p>
      </div>

      {!canManage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu es <b>{org._currentRole}</b> sur cette organisation — tu peux voir l'équipe mais pas la modifier.
        </div>
      )}

      {/* Owner + Members */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Membres ({1 + (members?.length || 0)})</h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">Bêta</span>
        </div>

        <ul className="mt-5 divide-y divide-slate-100">
          {/* Owner toujours en premier */}
          <li className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{ownerProfile?.full_name || 'Propriétaire'}</p>
              <p className="text-xs text-slate-500">{ownerProfile?.email || '—'}</p>
            </div>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-2xs font-bold text-white">Owner</span>
          </li>

          {(members || []).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{m.profiles?.full_name || m.profiles?.email}</p>
                <p className="text-xs text-slate-500">{m.profiles?.email}</p>
              </div>

              {canManage ? (
                <div className="flex items-center gap-2">
                  <form action={updateMemberRole}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      onChange={(e) => e.target.form.requestSubmit()}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </form>
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-2xs font-bold text-rose-700 hover:bg-rose-100">
                      Retirer
                    </button>
                  </form>
                </div>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-bold text-slate-700">{m.role}</span>
              )}
            </li>
          ))}

          {(members || []).length === 0 && (
            <li className="py-4 text-center text-sm text-slate-400">
              Aucun membre supplémentaire encore. {canManage ? 'Invite quelqu\'un ci-dessous.' : ''}
            </li>
          )}
        </ul>
      </Card>

      {/* Invite form */}
      {canManage && (
        <form action={inviteMember}>
          <Card>
            <h2 className="text-xl font-black">Inviter un membre</h2>
            <p className="mt-1 text-sm text-slate-500">
              Si la personne a déjà un compte Funding Watch, elle sera ajoutée directement à ton équipe.
              Sinon, un lien d'invitation à 14 jours est généré ci-dessous (à envoyer manuellement par email/WhatsApp tant que Brevo n'est pas configuré).
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <input
                type="email"
                name="email"
                required
                placeholder="email@asso.org"
                className="input"
              />
              <select name="role" defaultValue="viewer" className="input">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn-primary text-2xs uppercase tracking-widest">Inviter</button>
            </div>
            <div className="mt-3 grid gap-1 text-2xs text-slate-500">
              {ROLES.map((r) => (
                <p key={r.value}><b>{r.label}</b> — {r.desc}</p>
              ))}
            </div>
          </Card>
        </form>
      )}

      {/* Pending invitations */}
      {canManage && (invites || []).length > 0 && (
        <Card>
          <h2 className="text-xl font-black">Invitations en attente ({invites.length})</h2>
          <ul className="mt-5 divide-y divide-slate-100">
            {invites.map((inv) => {
              const link = `${baseUrl}/invite/${inv.token}`;
              return (
                <li key={inv.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{inv.email}</p>
                      <p className="text-xs text-slate-500">
                        Rôle : <b>{inv.role}</b> · expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="rounded-xl border border-slate-200 px-2.5 py-1 text-2xs font-bold text-slate-600 hover:bg-slate-50">
                        Révoquer
                      </button>
                    </form>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-2xs text-slate-600">{link}</code>
                    <CopyToClipboardButton text={link} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
