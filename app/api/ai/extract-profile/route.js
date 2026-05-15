import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractOrgProfileFromText } from '@/lib/ai';

/**
 * POST /api/ai/extract-profile  { text }
 * Document intelligence : envoie un texte (rapport, statut, présentation)
 * à Claude pour extraire un profil structuré que l'utilisateur peut
 * appliquer à son organisation après revue. N'écrit RIEN — c'est juste
 * l'extraction. L'application se fait via le formulaire serveur.
 */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }); }
  const text = (body?.text || '').toString();

  const result = await extractOrgProfileFromText(text);
  if (!result.ok) {
    let errCode = result.error;
    // Detect Anthropic insufficient credits / quota — surface as a clear code.
    if (typeof errCode === 'string' && /credit balance.*too low|invalid_request_error.*credit|insufficient.*credit/i.test(errCode)) {
      errCode = 'no_credit';
    }
    const status = errCode === 'no_api_key' || errCode === 'no_credit' ? 503
      : errCode === 'empty_input' || errCode === 'too_short' ? 400
      : 502;
    return NextResponse.json({ error: errCode, data: {} }, { status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
