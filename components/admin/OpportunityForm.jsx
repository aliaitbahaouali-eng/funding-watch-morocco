import { Card } from '@/components/ui';

export default function OpportunityForm({ donors = [], themes = [], action, defaults = {}, selectedThemeIds = [] }) {
  const v = defaults;
  return (
    <form action={action}>
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label">Titre</label>
            <input name="title" required defaultValue={v.title || ''} className="input" /></div>

          <div><label className="label">Bailleur</label>
            <select name="donor_id" defaultValue={v.donor_id || ''} className="input">
              <option value="">— Choisir —</option>
              {donors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>

          <div><label className="label">Type</label>
            <input name="type" defaultValue={v.type || ''} className="input" placeholder="Grant / Subvention / Appel à projets…" /></div>

          <div className="md:col-span-2"><label className="label">Résumé (1-3 phrases)</label>
            <textarea name="summary" rows="2" defaultValue={v.summary || ''} className="input" /></div>

          <div className="md:col-span-2"><label className="label">Description complète</label>
            <textarea name="description" rows="6" defaultValue={v.description || ''} className="input" /></div>

          <div className="md:col-span-2"><label className="label">Critères d'éligibilité</label>
            <textarea name="eligibility" rows="3" defaultValue={v.eligibility || ''} className="input" /></div>

          <div><label className="label">Deadline</label>
            <input type="date" name="deadline" defaultValue={v.deadline || ''} className="input" /></div>

          <div><label className="label">Lien officiel</label>
            <input type="url" required name="official_url" defaultValue={v.official_url || ''} className="input" placeholder="https://…" /></div>

          <div><label className="label">Montant min</label>
            <input type="number" step="0.01" name="amount_min" defaultValue={v.amount_min || ''} className="input" /></div>
          <div><label className="label">Montant max</label>
            <input type="number" step="0.01" name="amount_max" defaultValue={v.amount_max || ''} className="input" /></div>
          <div><label className="label">Devise</label>
            <select name="currency" defaultValue={v.currency || 'EUR'} className="input"><option>EUR</option><option>USD</option><option>MAD</option><option>GBP</option><option>CHF</option></select></div>

          <div><label className="label">Langue</label>
            <select name="language" defaultValue={v.language || 'fr'} className="input"><option value="fr">Français</option><option value="en">Anglais</option><option value="ar">Arabe</option></select></div>

          <div><label className="label">Difficulté</label>
            <select name="difficulty_level" defaultValue={v.difficulty_level || ''} className="input">
              <option value="">—</option><option>Accessible</option><option>Moyen</option><option>Élevé</option>
            </select></div>

          <div><label className="label">Pays éligibles (séparés par virgule)</label>
            <input name="countries_eligible" defaultValue={(v.countries_eligible || []).join(', ')} className="input" placeholder="MA, TN, DZ, MENA…" /></div>

          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="morocco_eligible" defaultChecked={!!v.morocco_eligible} /> 🇲🇦 Maroc éligible</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="verified" defaultChecked={!!v.verified} /> ✓ Vérifié</label>
          </div>

          <div className="md:col-span-2"><label className="label">Documents requis (un par ligne)</label>
            <textarea name="required_documents" rows="4" defaultValue={(v.required_documents || []).join('\n')} className="input" /></div>

          <div className="md:col-span-2"><label className="label">Thématiques</label>
            <div className="mt-1 grid gap-2 md:grid-cols-3">
              {themes.map(t => (
                <label key={t.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" name="theme_id" value={t.id} defaultChecked={selectedThemeIds.includes(t.id)} />
                  {t.name_fr}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button className="btn-primary mt-6">Enregistrer</button>
      </Card>
    </form>
  );
}
