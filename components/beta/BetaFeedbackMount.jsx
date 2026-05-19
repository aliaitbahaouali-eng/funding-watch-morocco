import { createClient } from '@/lib/supabase/server';
import BetaFeedbackWidget from './BetaFeedbackWidget';

/**
 * Sprint 4M — Wrapper server component qui ne monte le widget feedback
 * que si l'utilisateur est authentifié (évite de polluer landing / login /
 * register).
 */
export default async function BetaFeedbackMount() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return <BetaFeedbackWidget />;
}
