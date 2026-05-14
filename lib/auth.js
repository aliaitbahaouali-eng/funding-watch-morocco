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

/** Récupère l'organisation liée à l'utilisateur connecté. */
export async function getCurrentOrganization() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('*, organization_themes(theme_id, themes(*))')
    .eq('user_id', user.id)
    .single();

  return org;
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
