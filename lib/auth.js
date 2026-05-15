import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

/** Retourne l'utilisateur connecté + son profil enrichi. Null si déconnecté. */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

/** Récupère l'organisation liée à l'utilisateur connecté.
 *
 *  Résolution :
 *    1. owner direct (organizations.user_id = auth.uid())
 *    2. fallback membership (organization_members.user_id = auth.uid())
 *
 *  L'objet retourné inclut `_currentRole` ('owner' | 'admin' | 'contributor'
 *  | 'viewer') pour que les vues UI puissent adapter les permissions.
 */
export async function getCurrentOrganization() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Owner direct
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*, organization_themes(theme_id, themes(*))')
    .eq('user_id', user.id)
    .maybeSingle();

  if (ownedOrg) return { ...ownedOrg, _currentRole: 'owner' };

  // 2. Member (Sprint 3f — comptes équipe)
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .order('added_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: memberOrg } = await supabase
    .from('organizations')
    .select('*, organization_themes(theme_id, themes(*))')
    .eq('id', membership.organization_id)
    .maybeSingle();

  if (!memberOrg) return null;
  return { ...memberOrg, _currentRole: membership.role };
}

/** Vérifie si l'utilisateur courant a un rôle d'écriture sur l'org. */
export function canEditOrg(org) {
  return org && (org._currentRole === 'owner' || org._currentRole === 'admin' || org._currentRole === 'contributor');
}

/** Vérifie si l'utilisateur courant peut gérer l'équipe (inviter/retirer). */
export function canManageTeam(org) {
  return org && (org._currentRole === 'owner' || org._currentRole === 'admin');
}

/** Garde : redirige vers /login si déconnecté. */
export async function requireUser() {
  const session = await getCurrentUser();
  if (!session) redirect('/login');
  return session;
}

/** Garde : redirige si non admin/veille. */
export async function requireAdmin() {
  const session = await requireUser();
  if (!['admin', 'veille'].includes(session.profile?.role)) {
    redirect('/dashboard?error=forbidden');
  }
  return session;
}
