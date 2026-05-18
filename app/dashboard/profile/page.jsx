import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { Card, Alert } from '@/components/ui';
import { computeOrgCompleteness } from '@/lib/utils';
import DocumentIntelligence from '@/components/profile/DocumentIntelligence';

const ALLOWED_AI_FIELDS = new Set([
  'action_summary',
  'intervention_themes_text',
  'mission_long',
  'geographic_scope',
  'city',
  'region',
  'creation_year',
  'past_projects',
]);

export default async function ProfilePage() {
  const org = await getCurrentOrganization();
  const completeness = computeOrgCompleteness(org);

  async function updateProfile(formData) {
    'use server';
    const supabase = createClient();
    const payload = {
      name: formData.get('name'),
      org_type: formData.get('org_type'),
      city: formData.get('city'),
      region: formData.get('region'),
      creation_year: parseInt(formData.get('creation_year')) || null,
      website: formData.get('website') || null,
      phone: formData.get('phone') || null,
      description: formData.get('description'),
      annual_budget_range: formData.get('annual_budget_range'),
      preferred_language: formData.get('preferred_language'),
      email_frequency: formData.get('email_frequency')
    };
    await supabase.from('organizations').update(payload).eq('id', org.id);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
  }

  async function updateDigestPrefs(formData) {
    'use server';
    const supabase = createClient();
    const org = await getCurrentOrganization();
    if (!org) return;

    const days = formData.getAll('digest_day')
      .map((d) => parseInt(d, 10))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 7);
    const hourRaw = parseInt(formData.get('digest_hour') || '7', 10);
    const hour = Math.max(0, Math.min(23, Number.isFinite(hourRaw) ? hourRaw : 7));
    const scoreRaw = parseInt(formData.get('digest_min_score') || '0', 10);
    const minScore = Math.max(0, Math.min(100, Number.isFinite(scoreRaw) ? scoreRaw : 0));

    await supabase.from('organizations').update({
      digest_days_of_week: days.length ? days : [1, 2, 3, 4, 5],
      digest_hour: hour,
      digest_min_score: minScore,
    }).eq('id', org.id);

    revalidatePath('/dashboard/profile');
  }

  async function applyExtractedProfile(formData) {
    'use server';
    const supabase = createClient();
    const org = await getCurrentOrganization();
    let raw;
    try {
      raw = JSON.parse(formData.get('payload') || '{}');
    } catch {
      return;
    }
    // Whitelist + sanitize
    const update = {};
    for (const k of Object.keys(raw)) {
      if (!ALLOWED_AI_FIELDS.has(k)) continue;
      const v = raw[k];
      if (k === 'past_projects' && Array.isArray(v)) {
        update.past_projects = v.slice(0, 10);
      } else if (k === 'creation_year' && typeof v === 'number') {
        update.creation_year = v;
      } else if (typeof v === 'string' && v.trim()) {
        update[k] = v.trim().slice(0, 1500);
      }
    }
    if (Object.keys(update).length === 0) return;
    await supabase.from('organizations').update(update).eq('id', org.id);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Profil association</h1>
          <p className="mt-1 text-slate-500">Complétez votre profil pour améliorer les recommandations.</p>
        </div>
        <div className="rounded-full bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-500">Complétude</p>
          <p className="text-2xl font-black text-primary">{completeness}%</p>
        </div>
      </div>

      <form action={updateProfile}>
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label">Nom de l'association</label>
              <input name="name" defaultValue={org?.name || ''} className="input" required /></div>
            <div><label className="label">Type</label>
              <select name="org_type" defaultValue={org?.org_type || 'association'} className="input">
                <option value="association">Association</option>
                <option value="ong">ONG</option>
                <option value="cooperative">Coopérative</option>
                <option value="fondation">Fondation</option>
                <option value="autre">Autre</option>
              </select></div>
            <div><label className="label">Ville</label>
              <input name="city" defaultValue={org?.city || ''} className="input" /></div>
            <div><label className="label">Région</label>
              <input name="region" defaultValue={org?.region || ''} className="input" /></div>
            <div><label className="label">Année de création</label>
              <input name="creation_year" type="number" min="1900" max="2030" defaultValue={org?.creation_year || ''} className="input" /></div>
            <div><label className="label">Site web</label>
              <input name="website" defaultValue={org?.website || ''} className="input" placeholder="https://" /></div>
            <div><label className="label">Téléphone</label>
              <input name="phone" defaultValue={org?.phone || ''} className="input" /></div>
            <div><label className="label">Budget annuel</label>
              <select name="annual_budget_range" defaultValue={org?.annual_budget_range || ''} className="input">
                <option value="">Non précisé</option>
                <option value="<50k">Moins de 50 000 DH</option>
                <option value="50k-200k">50 000 – 200 000 DH</option>
                <option value="200k-1M">200 000 – 1 000 000 DH</option>
                <option value=">1M">Plus de 1 000 000 DH</option>
              </select></div>
            <div className="md:col-span-2"><label className="label">Description</label>
              <textarea name="description" rows="4" defaultValue={org?.description || ''} className="input" placeholder="Mission, domaines d'intervention, public cible…" /></div>
            <div><label className="label">Langue préférée</label>
              <select name="preferred_language" defaultValue={org?.preferred_language || 'fr'} className="input">
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
                <option value="ar">Arabe</option>
              </select></div>
            <div><label className="label">Fréquence des emails</label>
              <select name="email_frequency" defaultValue={org?.email_frequency || 'weekly'} className="input">
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
                <option value="none">Aucune</option>
              </select></div>
          </div>
          <button className="btn-primary mt-6">Enregistrer</button>
        </Card>
      </form>

      {/* === Préférences digest (Sprint 2B.2) === */}
      <form action={updateDigestPrefs}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">Préférences du digest matinal</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700">Nouveau</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Choisis quand et comment recevoir ton digest. S'applique uniquement si la fréquence ci-dessus est <b>Quotidienne</b>.
          </p>

          {/* Jours de la semaine */}
          <div className="mt-5">
            <label className="label">Jours d'envoi</label>
            <div className="flex flex-wrap gap-2">
              {[
                { d: 1, l: 'L', name: 'Lundi' },
                { d: 2, l: 'M', name: 'Mardi' },
                { d: 3, l: 'M', name: 'Mercredi' },
                { d: 4, l: 'J', name: 'Jeudi' },
                { d: 5, l: 'V', name: 'Vendredi' },
                { d: 6, l: 'S', name: 'Samedi' },
                { d: 7, l: 'D', name: 'Dimanche' },
              ].map(({ d, l, name }) => {
                const selected = (org?.digest_days_of_week || [1, 2, 3, 4, 5]).includes(d);
                return (
                  <label key={d} className="cursor-pointer" title={name}>
                    <input type="checkbox" name="digest_day" value={d} defaultChecked={selected} className="peer sr-only" />
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 font-black text-slate-600 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white transition">
                      {l}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-2xs text-slate-400">Par défaut : jours ouvrés (L-V).</p>
          </div>

          {/* Heure + score min */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Heure d'envoi (UTC)</label>
              <select name="digest_hour" defaultValue={org?.digest_hour ?? 7} className="input">
                {Array.from({ length: 24 }).map((_, h) => {
                  const localH = (h + 1) % 24; // Maroc UTC+1
                  return (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00 UTC ({String(localH).padStart(2, '0')}h Maroc)
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-2xs text-slate-400">Le cron tourne chaque heure et s'envoie à ton créneau choisi.</p>
            </div>

            <div>
              <label className="label">Score minimum (0-100)</label>
              <input
                type="number"
                name="digest_min_score"
                min="0"
                max="100"
                step="5"
                defaultValue={org?.digest_min_score ?? 0}
                className="input"
              />
              <p className="mt-1 text-2xs text-slate-400">
                Si aucune opp ne dépasse ce score, on ne t'envoie rien (silencieux plutôt que digest vide).
              </p>
            </div>
          </div>

          <button className="btn-primary mt-6">Enregistrer mes préférences</button>
        </Card>
      </form>

      <Card>
        <DocumentIntelligence
          current={{
            action_summary: org?.action_summary,
            intervention_themes_text: org?.intervention_themes_text,
            mission_long: org?.mission_long,
            geographic_scope: org?.geographic_scope,
            city: org?.city,
            region: org?.region,
            creation_year: org?.creation_year,
            past_projects: org?.past_projects,
          }}
          applyAction={applyExtractedProfile}
        />
      </Card>
    </div>
  );
}
