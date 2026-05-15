import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

/**
 * /invite/[token] — accepter une invitation à rejoindre une organisation.
 *
 * Flow :
 *   1. Token non trouvé / expiré / déjà accepté → message d'erreur clair
 *   2. Utilisateur non connecté → redirection vers /login?invite=token
 *   3. Utilisateur connecté avec un email différent → demander confirmation
 *      (avertir qu'il rejoint avec son email actuel, l'email d'invitation
 *      ne sera pas remplacé)
 *   4. Tout est OK → afficher CTA "Rejoindre <orga>" via Server Action
 */
export default async function InviteAcceptPage({ params }) {
  const token = params.token;
  const supabase = createClient();
  const admin = createAdminClient();

  // L'utilisateur connecté (peut être null)
  const session = await getCurrentUser();

  // Lookup via service role pour bypass RLS (l'invitation est destinée à
  // un email externe, pas forcément à l'utilisateur courant).
  const { data: invite } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role, status, expires_at, organizations(name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return (
      <InvitePageShell title="Invitation introuvable">
        <p className="mt-2 text-slate-600">Ce lien n'est pas valide. Demande à la personne qui t'a invité de regénérer une invitation.</p>
        <Link href="/" className="btn-secondary mt-5 inline-flex text-2xs uppercase tracking-widest">Retour à l'accueil</Link>
      </InvitePageShell>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <InvitePageShell title="Invitation déjà acceptée">
        <p className="mt-2 text-slate-600">Cette invitation a déjà été utilisée. Connecte-toi pour accéder à <b>{invite.organizations?.name}</b>.</p>
        <Link href="/login" className="btn-primary mt-5 inline-flex text-2xs uppercase tracking-widest">Se connecter →</Link>
      </InvitePageShell>
    );
  }

  if (invite.status === 'revoked') {
    return (
      <InvitePageShell title="Invitation révoquée">
        <p className="mt-2 text-slate-600">Cette invitation a été annulée par l'organisation. Demande-leur de t'envoyer un nouveau lien.</p>
      </InvitePageShell>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark as expired silently
    await admin.from('organization_invitations').update({ status: 'expired' }).eq('id', invite.id);
    return (
      <InvitePageShell title="Invitation expirée">
        <p className="mt-2 text-slate-600">Ce lien a expiré. Demande à l'organisation de t'envoyer un nouveau lien d'invitation.</p>
      </InvitePageShell>
    );
  }

  // Utilisateur pas connecté → redirige sur /login avec le token en query
  if (!session) {
    redirect(`/login?invite=${token}`);
  }

  // Server Action acceptante — placée ici pour avoir accès aux closures.
  async function acceptInvitation() {
    'use server';
    const admin = createAdminClient();

    const { data: invite } = await admin
      .from('organization_invitations')
      .select('id, organization_id, email, role, status, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (!invite || invite.status !== 'pending') return;
    if (new Date(invite.expires_at) < new Date()) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Skip si déjà owner ou membre
    const { data: owner } = await admin
      .from('organizations')
      .select('user_id')
      .eq('id', invite.organization_id)
      .maybeSingle();
    if (owner?.user_id === user.id) {
      await admin.from('organization_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id }).eq('id', invite.id);
      redirect('/dashboard');
    }

    await admin
      .from('organization_members')
      .upsert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
        added_by: invite.invited_by || null,
      }, { onConflict: 'organization_id,user_id' });

    await admin
      .from('organization_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id);

    redirect('/dashboard');
  }

  const userEmail = session.user?.email || session.profile?.email || '';
  const emailMismatch = userEmail && invite.email && userEmail.toLowerCase() !== invite.email.toLowerCase();

  return (
    <InvitePageShell title={`Rejoindre ${invite.organizations?.name || 'l\'organisation'}`}>
      <p className="mt-2 text-slate-600">
        Tu as été invité comme <b>{invite.role}</b> sur <b>{invite.organizations?.name}</b>.
      </p>
      {emailMismatch && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          L'invitation a été envoyée à <b>{invite.email}</b> mais tu es connecté avec <b>{userEmail}</b>.
          Tu peux quand même accepter avec ton compte actuel.
        </p>
      )}
      <form action={acceptInvitation} className="mt-5">
        <button className="btn-primary text-2xs uppercase tracking-widest">
          Rejoindre l'organisation →
        </button>
      </form>
    </InvitePageShell>
  );
}

function InvitePageShell({ title, children }) {
  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-xl px-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <p className="text-2xs font-bold uppercase tracking-widest text-slate-500">Invitation équipe</p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            {children}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
