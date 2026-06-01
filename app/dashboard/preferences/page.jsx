import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { Card } from '@/components/ui';
import { isValidPhone, normalizePhone } from '@/lib/whatsapp';
import MissingThemeButton from '@/components/preferences/MissingThemeButton';

export default async function PreferencesPage() {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  const { data: themes } = await supabase.from('themes').select('*').eq('active', true).order('name_fr');
  const selected = new Set((org?.organization_themes || []).map(t => t.theme_id));

  async function updateThemes(formData) {
    'use server';
    const supabase = createClient();
    const org = await getCurrentOrganization();
    const ids = formData.getAll('theme_id');
    // Reset + upsert
    await supabase.from('organization_themes').delete().eq('organization_id', org.id);
    if (ids.length) {
      const rows = ids.map(theme_id => ({ organization_id: org.id, theme_id }));
      await supabase.from('organization_themes').insert(rows);
    }
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/preferences');
  }

  async function updateWhatsapp(formData) {
    'use server';
    const supabase = createClient();
    const org = await getCurrentOrganization();
    const enabled = formData.get('whatsapp_alerts_enabled') === 'on';
    const phoneInput = formData.get('whatsapp_phone')?.toString().trim() || '';
    const thresholdRaw = parseInt(formData.get('whatsapp_threshold')?.toString() || '90', 10);
    const threshold = Math.max(50, Math.min(100, Number.isFinite(thresholdRaw) ? thresholdRaw : 90));

    // If user enables alerts, phone must be valid
    const phone = phoneInput ? normalizePhone(phoneInput) : null;
    const phoneOk = !enabled || (phone && isValidPhone(phone));

    await supabase.from('organizations').update({
      whatsapp_alerts_enabled: phoneOk && enabled,
      whatsapp_phone: phone,
      whatsapp_threshold: threshold,
    }).eq('id', org.id);

    revalidatePath('/dashboard/preferences');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Préférences</h1>
        <p className="mt-1 text-slate-500">Choisissez les thématiques qui vous intéressent. Elles servent au scoring et aux alertes.</p>
      </div>

      <form action={updateThemes}>
        <Card>
          <h2 className="text-xl font-black">Thématiques suivies</h2>
          <p className="mt-1 text-sm text-slate-500">Cochez toutes celles qui correspondent à votre activité.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(themes || []).map(t => (
              <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-primary/30">
                <input type="checkbox" name="theme_id" value={t.id} defaultChecked={selected.has(t.id)} className="mt-1" />
                <div>
                  <p className="font-bold">{t.name_fr}</p>
                  {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                </div>
              </label>
            ))}
          </div>
          <button className="btn-primary mt-6">Enregistrer mes préférences</button>
          <MissingThemeButton />
        </Card>
      </form>

      <form action={updateWhatsapp}>
        <Card>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Alertes WhatsApp</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">Bêta</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Recevez un message WhatsApp dès qu'une opportunité dépasse votre seuil de compatibilité.
            Idéal pour ne rien manquer sur les meilleurs matches sans avoir à ouvrir la plateforme.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Numéro WhatsApp</span>
              <input
                type="tel"
                name="whatsapp_phone"
                defaultValue={org?.whatsapp_phone || ''}
                placeholder="+212 6 00 00 00 00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-red-100"
              />
              <span className="mt-1 block text-2xs text-slate-400">Indicatif international requis (ex. +212 pour le Maroc).</span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Seuil de match (%)
              </span>
              <input
                type="number"
                name="whatsapp_threshold"
                min="50"
                max="100"
                step="5"
                defaultValue={org?.whatsapp_threshold ?? 90}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-red-100"
              />
              <span className="mt-1 block text-2xs text-slate-400">Vous ne serez prévenu que pour les matches ≥ ce seuil (défaut : 90).</span>
            </label>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="whatsapp_alerts_enabled"
              defaultChecked={!!org?.whatsapp_alerts_enabled}
              className="h-4 w-4"
            />
            <div>
              <p className="font-bold">Activer les alertes WhatsApp</p>
              <p className="text-xs text-slate-500">
                Désactivable à tout moment. Aucun message ne sera envoyé tant que la case n'est pas cochée.
              </p>
            </div>
          </label>

          <button className="btn-primary mt-6">Enregistrer</button>

          {!process.env.META_WHATSAPP_TOKEN && (
            <p className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-2xs leading-4 text-amber-800">
              ⚠ L'intégration WhatsApp Business n'est pas encore configurée côté serveur
              (<code>META_WHATSAPP_TOKEN</code> manquant). Tes préférences sont enregistrées mais aucun
              message ne partira tant que les credentials Meta ne sont pas en place.
            </p>
          )}
        </Card>
      </form>
    </div>
  );
}
