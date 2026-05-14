import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec la service_role key.
 * ⚠️ JAMAIS exposer côté browser. Uniquement dans des Route Handlers,
 * Server Actions ou scripts serveur (scrapers).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant. Configurez .env.local côté serveur.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
