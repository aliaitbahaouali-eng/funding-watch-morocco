/**
 * Utilitaires partagés côté client et serveur.
 */

/** Concatène les classes CSS de façon conditionnelle (remplace clsx). */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Formate une date ISO ou objet Date en français. */
export function formatDate(date, opts = {}) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', ...opts });
}

/** Nombre de jours restants avant une deadline. */
export function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Détermine le statut d'une opportunité selon la deadline. */
export function opportunityStatus(deadline, status) {
  if (status === 'expired' || status === 'archived') return 'expired';
  if (!deadline) return 'open';
  const days = daysUntil(deadline);
  if (days < 0) return 'expired';
  if (days <= 14) return 'urgent';
  return 'open';
}

/** Retourne la couleur badge selon le statut. */
export function statusTone(status) {
  return { open: 'green', urgent: 'orange', expired: 'slate', draft: 'slate', published: 'green' }[status] ?? 'slate';
}

/** Libellé lisible pour un statut. */
export function statusLabel(status) {
  return {
    open: 'Ouvert',
    urgent: 'Urgent',
    expired: 'Expiré',
    draft: 'Brouillon',
    published: 'Publié',
    archived: 'Archivé',
    saved: 'Sauvegardé',
    analyzing: 'En analyse',
    preparing: 'En préparation',
    submitted: 'Soumis',
    abandoned: 'Abandonné',
  }[status] ?? status;
}

/** Score tier label. */
export function scoreTier(score) {
  if (score >= 90) return { label: 'Très compatible', tone: 'green' };
  if (score >= 70) return { label: 'Compatible', tone: 'blue' };
  if (score >= 50) return { label: 'À analyser', tone: 'gold' };
  return { label: 'Faible', tone: 'slate' };
}

/** Tronque un texte à n caractères. */
export function truncate(str, n = 120) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/** Slugifie un texte. */
export function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Formate un montant min/max avec devise. */
export function formatAmount({ amount_min, amount_max, currency = 'EUR' }) {
  if (!amount_min && !amount_max) return '—';
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
  if (amount_min && amount_max) return `${fmt(amount_min)} – ${fmt(amount_max)} ${currency}`;
  if (amount_max) return `Jusqu'à ${fmt(amount_max)} ${currency}`;
  return `À partir de ${fmt(amount_min)} ${currency}`;
}

/** Complétude (en %) du profil d'une organisation. */
export function computeOrgCompleteness(org) {
  if (!org) return 0;
  const fields = ['name','city','region','description','website','org_type','creation_year','annual_budget_range'];
  const filled = fields.filter(f => org[f] && String(org[f]).trim().length > 0).length;
  const themesBonus = org.organization_themes?.length ? 10 : 0;
  return Math.min(100, Math.round((filled / fields.length) * 90) + themesBonus);
}
