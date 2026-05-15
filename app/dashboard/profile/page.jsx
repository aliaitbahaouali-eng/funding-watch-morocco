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
