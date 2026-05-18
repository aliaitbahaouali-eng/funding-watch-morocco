/**
 * Helpers pour la recherche sémantique multilingue (Sprint 4B).
 */

/**
 * Détecte la langue dominante d'une chaîne (FR / AR / EN).
 * Heuristique simple : caractères arabes en premier, puis mots-clés
 * fréquents EN/FR, défaut FR (90% de notre audience).
 */
export function detectQueryLang(text) {
  if (!text) return 'fr';
  const s = String(text);
  // Plage Unicode arabe (incluant supplément + suppléments arabes)
  if (/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(s)) return 'ar';
  const lower = s.toLowerCase();
  // Si présence forte de stopwords FR distinctifs → FR
  if (/\b(le|la|les|de|du|des|et|pour|aux?|une?|cette?|notre|votre|sur|avec|sans|dans|chez)\b/.test(lower)) return 'fr';
  // Sinon EN si présence de stopwords EN distinctifs
  if (/\b(the|and|for|with|from|grant|funding|application|nonprofit|charity|youth)\b/.test(lower)) return 'en';
  return 'fr';
}

/**
 * Re-rank les résultats sémantiques avec des boosts métier :
 *   - +0.06 si même langue que la query
 *   - +0.05 si morocco_eligible et user marocain (default true ici)
 *   - +0.04 si deadline dans la fenêtre 14-60 jours (urgence saine)
 *   - -0.03 si deadline < 7 jours (trop tard pour candidater sereinement)
 *
 * Renvoie un nouveau tableau trié, score `final_score` ajouté.
 */
export function rerankResults(rawResults = [], { queryLang = 'fr', preferMorocco = true } = {}) {
  const today = new Date();
  return rawResults
    .map((r) => {
      const sim = Number(r.similarity) || 0;
      let boost = 0;
      if (r.language && r.language === queryLang) boost += 0.06;
      if (preferMorocco && r.morocco_eligible) boost += 0.05;
      if (r.deadline) {
        const days = Math.round((new Date(r.deadline) - today) / 86400000);
        if (days >= 14 && days <= 60) boost += 0.04;
        else if (days >= 0 && days < 7) boost -= 0.03;
      }
      const final_score = Math.max(0, Math.min(1, sim + boost));
      return { ...r, base_similarity: sim, boost, final_score };
    })
    .sort((a, b) => b.final_score - a.final_score);
}
