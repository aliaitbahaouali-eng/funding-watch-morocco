# AUDIT STRATÉGIQUE — Funding Watch Morocco
### Auto-critique exigeante, sans complaisance — mai 2026

> Rédigé comme si je portais successivement les casquettes de Product Manager SaaS senior, UX/UI Director international, CTO startup, investisseur tech et opérateur d'une plateforme de veille financement type Devex. L'objectif n'est pas de te rassurer mais de te dire ce que je pense vraiment, et ce qui me ferait passer à la signature d'un term sheet ou non.

---

## 1. Audit stratégique global — Verdict honnête

À l'état actuel (mai 2026), Funding Watch Morocco ressemble à **un excellent prototype de niveau hackathon élite, mais pas encore à un produit international**.

Concrètement, voici ce qui se passe quand un investisseur ou un partenaire ouvre la plateforme pour la première fois :

L'**impression visuelle** est forte. Le rouge profond, la typographie, les animations Framer Motion, le glassmorphism — tout ça crache un signal "startup tech qui a du goût". On est nettement au-dessus de fundsforngos.org, DevelopmentAid, et de tous les portails institutionnels marocains. À ce niveau-là, la plateforme est probablement la mieux finie visuellement de tout le marché Maghreb sur ce verticaux.

L'**impression de profondeur**, en revanche, est mince. Quand tu cliques au-delà de la première impression, tu trouves :
- une poignée d'opportunités (souvent moins de 50 actives) ;
- un dashboard avec des widgets élégants mais peu de signal exploitable au jour le jour ;
- une logique de matching qui, sous le capot, n'est pas encore vraiment intelligente — elle relève surtout du filtre par mots-clés et de la classification par Claude.

**Le problème central** : la promesse visuelle ("Funding Intelligence Platform", "AI-Powered Matching") crée un contrat émotionnel avec l'utilisateur que la réalité technique ne tient pas encore. Un utilisateur Devex ou un program officer d'une fondation européenne le verra immédiatement. Le gap entre le branding et la substance est aujourd'hui un **risque de crédibilité**, pas un atout.

Comparaison implicite avec les références :

- **Devex** est moche mais profond. Il a la data, les profils donneurs, les contacts, l'historique. Sa moat est dans les 25 ans de couverture qui font qu'aucun praticien ne peut s'en passer. Funding Watch a aujourd'hui une UI Devex × 5, mais 1% de la data.
- **DevelopmentAid** vit sur le SEO et le volume. Il n'a aucune intelligence, c'est une base de données générique.
- **Crunchbase** est ta vraie référence d'inspiration UX. Mais Crunchbase a 10 ans de structuration de données privées : profils entreprises × levées × investisseurs × employés. Recréer ça côté NGO/financement demande un effort équivalent.
- **Notion / Airtable / Linear** sont les benchmarks d'UX moderne — l'ergonomie de Funding Watch peut y prétendre côté interface, mais il manque encore la sensation de productivité quotidienne qui les rend addictifs.

**Verdict global** : la plateforme paraît crédible à 30 secondes, fragile à 5 minutes, et clairement immature à 30 minutes. Pour passer le seuil du "produit international", il faut désormais investir massivement dans la **substance** (data, intelligence, profondeur) plutôt que dans l'apparence (déjà solide).

---

## 2. Vrais points forts

**Positionnement** : Le repositionnement "Funding Intelligence pour ONG/associations à impact" (vs. agrégateur générique) est **stratégiquement sharp**. Le marché des plateformes de veille financement est dominé par des généralistes (Devex, DevelopmentAid) qui servent autant des consultants individuels que des organisations. Aucune n'est NGO-first, et aucune n'est pensée pour le Maghreb. Il y a une vraie poche de marché.

**Stack technique** : Next.js 14 + Supabase + Vercel est exactement le bon choix. Tu n'auras pas à le réécrire dans 3 ans, et tu peux scaler vers 50k utilisateurs sans changement architectural majeur. Supabase pour l'authentification + RLS est un excellent gain de temps. Le choix de Python + BeautifulSoup pour les scrapers est pragmatique.

**Pipeline IA déjà branché** : Tu as Claude dans la boucle pour l'extraction de champs structurés et la classification NGO-fit. La plupart de tes concurrents ne sont que des bases de données statiques avec une newsletter par-dessus. Tu as la fondation pour de l'intelligence réelle.

**Identité visuelle** : Le red premium + la typographie + les animations sont au niveau d'un Linear ou d'un Mercury. C'est un avantage durable parce qu'il signale **goût et exigence**, deux choses que les NGO marocaines ne croisent jamais dans leurs outils habituels.

**Filtre NGO-fit** : Le système de classification ONG-vs-non-ONG (le travail S1 récent) est une vraie différenciation technique. La majorité des concurrents balancent tout : bourses individuelles, recrutements, marchés, prix académiques. Toi tu épures.

**Vision long terme** : "Plateforme intelligente de veille, matching, orientation" est une vision qui peut tenir 10 ans. Ce n'est pas un gadget.

**Potentiel Afrique** : Si tu réussis sur le Maroc, le playbook est portable au Maghreb (Tunisie, Algérie) puis à l'Afrique francophone (Sénégal, Côte d'Ivoire, Cameroun, RDC). Les écosystèmes NGO y sont énormes et sous-outillés.

---

## 3. Vrais points faibles — Sans complaisance

### 3.1. Faiblesse #1 — La data est trop maigre pour tenir la promesse

Cinq sources actives, parfois moins de 50 opportunités en base, c'est **un prototype, pas un produit**. Pour qu'un utilisateur revienne tous les jours, il doit voir du nouveau et de la richesse à chaque visite. Aujourd'hui un utilisateur engagé peut faire le tour de la plateforme en 15 minutes et ne plus avoir aucune raison d'y revenir avant le mois suivant.

**Seuil de crédibilité minimum** : 50 sources × 20 opportunités actives = 1000 opportunités vivantes. En dessous, tu fais semblant.

### 3.2. Faiblesse #2 — Le "matching intelligent" est aujourd'hui théâtral

Soyons honnête : aujourd'hui le scoring de compatibilité est principalement un proxy de **classification thématique par Claude + filtres pays**. Ce n'est pas du matching. Un vrai matching nécessite :

- un profil structuré de l'association (secteurs précis, populations cibles, capacité financière, géographie d'action, track record) ;
- une représentation vectorielle (embeddings) des opportunités et des profils ;
- une mesure de similarité sémantique, pas par mots-clés ;
- un signal d'apprentissage (clics, sauvegardes, candidatures déposées) qui fait que la pertinence s'améliore au cours du temps.

Aujourd'hui aucun de ces 4 éléments n'est en place. Le score affiché est cosmétique. Un utilisateur sophistiqué — un program officer d'AFD ou un chargé de financement d'une grande ONG — s'en apercevra en 10 minutes.

### 3.3. Faiblesse #3 — L'onboarding ne capture rien

Pour matcher, il faut connaître l'organisation. Aujourd'hui l'inscription ressemble à une création de compte SaaS standard : email, mot de passe, peut-être un nom d'organisation. **Sans wizard d'onboarding qui structure le profil**, le matching est aveugle. La task #35 "Onboarding wizard post-register" est encore en in_progress — c'est probablement la chose la plus critique à finir.

### 3.4. Faiblesse #4 — Aucun signal de confiance / preuve sociale

Pour qu'une association te confie son profil stratégique (thématiques, populations, capacité), elle doit te faire confiance. Aujourd'hui la plateforme n'affiche :
- aucun logo d'organisation utilisatrice ;
- aucun témoignage ;
- aucune mention partenaire institutionnel ;
- aucun chiffre d'usage réel ("X associations actives, Y candidatures déposées via la plateforme") ;
- aucun media coverage ;
- aucune mention d'incubateur, fondation, ou accélérateur.

Pour un acteur du secteur social marocain — par nature prudent — cette absence est un blocage majeur d'inscription.

### 3.5. Faiblesse #5 — La taxonomie n'existe pas

Les opportunités sont classées par "type" ("Appel à projets") et c'est à peu près tout. Il n'y a pas de **vraie taxonomie** thématique standardisée. Comment matcher une association d'agriculture rurale + genre + climat sur des opportunités qui ne sont pas non plus tagguées de façon cohérente ? Il faut un référentiel thématique pensé (SDG ONU, secteurs OCDE-DAC, axes Plan Maroc Vert, etc.), appliqué à chaque opportunité ET à chaque organisation.

### 3.6. Faiblesse #6 — Effet "produit vivant" absent

Quand tu ouvres Linear ou Stripe Dashboard, tu sens un produit qui bouge en temps réel. Quand tu ouvres Funding Watch, il y a des animations mais pas de **flux vivant** : pas de notifications réelles, pas d'activité d'autres utilisateurs, pas d'updates "5 nouvelles opportunités cette semaine sur ton secteur". L'Activity Ticker existe (task #34) mais ne porte pas encore de signal authentique parce qu'il n'y a pas d'utilisateurs.

### 3.7. Faiblesse #7 — Mobile faible

Au Maroc, les utilisateurs cibles (chargés de programmes en ONG, présidents d'associations) sont largement mobile-first et utilisent WhatsApp comme canal principal. L'expérience actuelle est desktop-centrique. Il n'y a pas d'app mobile, pas de PWA, et pas d'intégration WhatsApp pour les alertes.

### 3.8. Faiblesse #8 — Densité d'information du dashboard

Le dashboard est joli mais pauvre en signal exploitable. Les widgets affichent des nombres ronds ("opportunités totales : 1247", "score IA moyen : 84") qui ne disent rien d'actionnable. Compare à Linear (où chaque chiffre du dashboard mène à une action) ou Stripe Dashboard (où chaque metric a un contexte). Aujourd'hui le dashboard Funding Watch est décoratif plus qu'utile.

### 3.9. Faiblesse #9 — La page "Opportunité détail" n'est pas assez riche

Pour qu'une association décide d'investir 40 heures dans une candidature, elle veut savoir :
- qui a déjà gagné ce financement les années précédentes (intelligence donneur) ;
- quel est le taux moyen d'acceptation ;
- quel est le budget moyen par projet financé ;
- combien de candidatures sont attendues ;
- quels sont les pièces et les délais administratifs ;
- y a-t-il un appel similaire qui revient chaque année (anticipation).

Aujourd'hui la page détail est essentiellement un résumé + un lien officiel. Il manque la couche **intelligence donneur** qui ferait la différence.

### 3.10. Faiblesse #10 — Le branding "rouge premium" est risqué

Le rouge profond est élégant, mais c'est aussi une couleur **chargée émotionnellement** (alerte, urgence, agression, marketing agressif). Pour un produit sérieux destiné à des organisations à impact social, il y a un risque de dissonance. Sans renier complètement le code couleur, je suggérerais une exploration d'identités alternatives plus institutionnelles (bordeaux + or, vert profond + cuivre, navy + terra cotta), au minimum en A/B test.

---

## 4. Audit UX/UI détaillé

### Hiérarchie visuelle
La hiérarchie marche au niveau atomique (un bouton, une card sont bien typographiés) mais devient confuse au niveau du dashboard et de la liste d'opportunités. Tout est traité comme important, donc plus rien ne ressort. **Solution** : structurer chaque écran autour d'**un et un seul** objectif principal (ex. dashboard = "voici tes 3 prochaines actions cette semaine") avec tout le reste relégué à l'accessoire.

### Lisibilité
Le contraste est bon. Les tailles de police sont correctes. Le risque vient des fonds sombres + glassmorphism qui peuvent fatiguer en lecture longue. Pour un produit où l'utilisateur passera 30 minutes par session à lire des descriptions d'appels à projets, il faut **un mode lecture clair** par défaut sur les détails d'opportunités.

### Navigation
La navigation est fonctionnelle mais oublie l'utilisateur qui revient. Il manque :
- un état "lecture/non lu" sur les opportunités ;
- une zone "reprendre où tu en étais" ;
- un retour visible vers les recherches sauvegardées ;
- un breadcrumb ;
- une barre de commande ⌘K (task #30 marquée complete — à vérifier qu'elle est vraiment intégrée et findable).

### Micro-interactions
Les animations Framer Motion sont jolies en transition de page, mais les **micro-interactions productives** manquent : hover qui révèle un aperçu, drag-and-drop pour sauvegarder en collection, click long pour ouvrir un menu, indicateurs de saisie temps réel. Linear et Notion gagnent leur addictivité dans ces détails.

### Mobile
Critique : pas testé. La grille de cartes du dashboard va casser en dessous de 768px. Il faut un **mobile-first redesign** des écrans critiques (liste opportunités, détail, dashboard) avant tout lancement public.

### Densité d'information
Trop d'espace blanc, pas assez de signal. Devex est moche mais dense. Funding Watch est beau mais aéré au point d'être pauvre. Il faut **augmenter la densité utile** : plus d'informations par card opportunité, plus de metrics par widget dashboard, plus de filtres visibles immédiatement.

### Émotion utilisateur
Manque de moments de joie. Quand un utilisateur sauve une opportunité, rien ne se passe émotionnellement. Quand une nouvelle opportunité matche son profil à 95%, l'animation actuelle est plate. Il faut **investir dans 5-6 moments d'émotion forte** : sauvegarde, première candidature, première deadline approchant, première opportunité 95%+, etc.

---

## 5. Audit produit

### Profondeur
Faible. Le parcours utilisateur s'arrête à "découvrir une opportunité → cliquer sur lien officiel". Il manque tout le **cycle de vie de la candidature** : intention de candidater, brouillon, soumission, suivi, résultat. C'est là que se trouve la rétention long terme.

### Engagement quotidien
Aujourd'hui il n'y a aucune raison de revenir tous les jours. Pour créer un usage quotidien il faut :
- digest matinal "voici tes 3 nouvelles opportunités du jour" ;
- countdown des deadlines en notification proactive ;
- ranking dynamique "ton matching #1 cette semaine a changé" ;
- "X autres associations comme toi ont sauvegardé cet appel" (signal social).

### Valeur perçue
Le différentiel entre "outil gratuit que je consulte quand j'y pense" et "outil payant indispensable" est dans **la garantie de ne rien manquer**. Funding Watch doit promettre, prouver, et tenir cette garantie. Aujourd'hui c'est encore promis mais pas prouvé.

### Effet intelligence
L'IA est mentionnée partout mais montrée nulle part. Il faut des **moments démonstratifs** : "Claude a lu 24 PDFs pour toi cette semaine", "voici ce que notre IA a extrait de cet appel de 87 pages", "voici la probabilité de réussite calculée à partir de 1240 candidatures passées". Sans ces moments, l'utilisateur ne croit pas à l'IA.

### Priorisation produit
**Critique** : onboarding wizard structuré, matching vectoriel réel, taxonomie thématique, mobile responsive, digest email.
**Important** : kanban candidatures, intelligence donneur, alerts WhatsApp.
**Secondaire** : community features, marketplace consultants, version anglaise complète.
**À éviter** : gadgets type chatbot conversationnel, gamification superficielle, modules trop génériques (CRM, comptabilité) qui sortent du focus.

---

## 6. Audit technique

### Architecture
Solide pour un MVP, à renforcer pour scaler. Next.js 14 App Router est moderne. Supabase RLS bien utilisée protège la majorité des cas. Le découpage `/app`, `/components`, `/lib`, `/scrapers` est propre.

### Dette technique identifiée
- Les scrapers sont en Python alors que l'app est en JS/TS — séparation correcte mais coûteuse à maintenir longtemps. À terme, soit migrer les scrapers en TS (avec Playwright), soit assumer pleinement la séparation en mettant les scrapers dans un service indépendant (Railway, Render, ou un cron Vercel séparé).
- Le crawler synchrone à 0.5s entre URLs ne tient pas la charge pour 50+ sources × 50+ items. Il faut **un système de jobs** (BullMQ, Inngest, Trigger.dev, ou un simple Postgres queue).
- Le `external_id` basé sur l'URL normalisée fait fuite si les sites changent leurs URLs (très fréquent sur WordPress). Il faut un fingerprint plus robuste basé sur (donor + title hash + date).
- Pas de tests automatisés visibles côté scrapers. Pour un produit qui dépend de la qualité de la collecte, c'est un risque opérationnel grave.

### Sécurité
RLS Supabase OK. Service role key bien isolée. Manque : audit logs (qui a fait quoi sur les opportunités), rate limiting (les routes admin sont protégées par role mais pas par fréquence), CSP headers.

### Performance
Le dashboard va devenir lent à partir de 10k opportunités si on ne pagine pas / vire pas les calculs en client. Manque un cache (Redis ou Upstash) pour les requêtes lourdes (top opportunités, stats globales).

### Extensibilité
Bonne. Le pattern collector + registry permet d'ajouter une source en 30 minutes. Le filtre NGO-fit est extensible. Le pipeline d'ingestion est propre.

---

## 7. Audit moteur de collecte

### Pertinence des sources
5 sources est notoirement insuffisant. Pour ce marché, la liste minimale à constituer comprend, par catégorie :
- **Maroc institutionnel** : Tanmia, INDH, ONDH, Fondation Mohammed V, Fondation Mohammed VI, ANAPEC programmes ESS, Plan Maroc Vert, Ministère de la Solidarité, Bulletin officiel.
- **Bailleurs internationaux** : UNDP, UN Women, UNICEF, UNESCO, FAO, OIT, UNHCR, USAID, AFD, GIZ, Enabel, AECID, KOICA, SIDA, Norad, JICA, BAD.
- **UE** : EU NDICI, ERASMUS+, Horizon Europe, EUTF Africa, EU Civil Society Facility South.
- **Fondations** : Open Society, Ford, Hewlett, Mott, Rockefeller, Robert Bosch, Mercator, Drosos, Aga Khan.
- **Aggregators à scraper sélectivement** : fundsforNGOs, Devex (RSS publiques uniquement), DevelopmentAid (idem), Philea.

Cible 8-10 semaines : **50 sources actives avec collecte quotidienne stable**.

### Qualité d'extraction
Le deep crawler est bien pensé (HTML + PDF + Claude pour 20 champs). En pratique :
- la qualité varie selon la qualité du HTML source (à mesurer en taux d'extraction par source) ;
- les PDFs sont actuellement opt-in — pour les opportunités EU/AFD qui mettent tout en PDF, il faut le passer en `with-pdf` par défaut sur ces sources spécifiques ;
- il n'y a pas de retry sur échec partiel ;
- il n'y a pas de re-crawl régulier pour mettre à jour les statuts (deadline approchant → reclassifier).

### Dédoublonnage
La dédup par URL normalisée + hash du titre fonctionne pour 80% des cas. Il manque une **dédup cross-source** : la même opportunité peut être publiée par Tanmia ET sur le site officiel du bailleur. Idéalement, un système qui détecte les doublons sémantiques (embeddings sur le titre + résumé) et fusionne les sources avec un compteur "vu sur N plateformes" comme signal de crédibilité.

### Classification
Le NGO-fit est solide (règles + Claude). Mais il manque la classification thématique standardisée. Aujourd'hui Claude renvoie des `theme_slugs` libres, pas un vocabulaire contrôlé. Il faut une **taxonomie fermée** avec mapping vers SDG + secteurs OCDE-DAC + axes Maroc.

### Validation humaine
Le workflow `/admin/pending` est correct mais probablement lent pour scaler. À 50 sources × 30 items/semaine = 1500 fiches à valider par semaine. Il faut :
- pré-tri par confiance Claude (>90% → auto-publish, 60-90% → revue rapide, <60% → revue détaillée) ;
- batch actions (publish 20 en un clic après skim) ;
- raccourcis clavier (J/K pour next/prev, P pour publish, X pour reject).

### Monitoring
Pas de monitoring visible aujourd'hui : combien de sources ont failed la dernière run, taux d'extraction par source, latence moyenne, coûts Claude API. **À ajouter** : un dashboard ops dédié, alertes Sentry sur échecs répétés, et budget tracking Anthropic.

---

## 8. Expérience utilisateur remarquable — Propositions

Voici 12 idées concrètes pour passer du "joli SaaS" au "produit mémorable" :

**1. Le digest matinal cinématique.** Email + push 7h chaque matin : "Bonjour [prénom], voici tes 3 opportunités du jour, ordonnées par compatibilité. La meilleure : 94%, deadline dans 23 jours." Avec un design qui ressemble plus à un Substack premium qu'à un mail système.

**2. La timeline deadline visuelle.** Sur le dashboard, une frise temporelle horizontale qui montre tes deadlines à venir sur les 90 prochains jours, avec des "tickets" cliquables. C'est à la fois beau et actionnable.

**3. Le moment "Match parfait".** Quand une nouvelle opportunité matche à 90%+ ton profil, animation pleine page (1.5s, désactivable), son optionnel, et CTA immédiat "lire maintenant". Un moment d'émotion qui marque.

**4. L'intelligence donneur.** Sur chaque page opportunité, une section "À propos de ce bailleur" : projets financés les 3 dernières années, montants moyens, organisations marocaines déjà soutenues, contacts publics. Crawl + IA = livrable défensible.

**5. La probabilité de réussite.** "D'après les 47 candidatures similaires que nous avons trackées, ta probabilité de présélection est de 38%." Honnête, calibré, mis à jour. C'est addictif et différenciant.

**6. Le kanban candidatures.** Notion-like board : Idée → Brouillon → Déposé → Présélectionné → Financé / Refusé. Chaque colonne avec ses opportunités-cards. Un seul écran qui devient le hub de travail quotidien.

**7. L'AI co-writer.** Bouton "Aide-moi à rédiger le résumé exécutif" qui combine ton profil organisation + le brief de l'appel + Claude pour générer un premier jet. C'est l'usage IA qui sera vraiment ressenti.

**8. La carte mondiale interactive.** Pas juste décorative — cliquable, filtre les opportunités par région, affiche les flux de financement Nord-Sud sur le Maroc. C'est un asset marketing autant que produit.

**9. Le replay annuel.** Comme Spotify Wrapped : chaque décembre, "Voici ton année Funding Watch : 12 opportunités matchées, 3 candidatures déposées, 1 financement remporté de 50k€." Storytelling personnel = partage social organique.

**10. Les sons subtils.** UI sounds courts (Mercury, Linear, Arc utilisent ça) sur les actions importantes : nouvelle opportunité, candidature déposée, deadline approchant. À doser, désactivable, mais ça change la perception "premium".

**11. La barre de commande ⌘K riche.** Pas juste pour la navigation — pour les actions : "matche moi sur l'agriculture rurale", "rappelle-moi cette deadline", "exporte mes candidatures en cours en PDF". Un canal d'interaction express.

**12. Le mode "focus deadline".** Quand tu cliques sur une opportunité urgente (deadline < 7j), un mode plein écran qui te guide étape par étape : pièces requises ✓, résumé exécutif ✓, budget prévisionnel ✓, soumis ✓. Anti-stress, anti-procrastination.

---

## 9. Plan d'amélioration priorisé

### PHASE 1 — Critique (4-6 semaines)
Le but est de fermer le gap branding/substance et d'avoir un produit qui tient ses promesses minimales.

- Finir l'**onboarding wizard structuré** : 6-8 écrans qui capturent le profil de l'association (secteurs, thématiques SDG, populations cibles, géographie, budget annuel, équipe, projets passés). Sans ça, rien d'intelligent n'est possible.
- Construire la **taxonomie thématique fermée** (40-60 tags hiérarchisés, mapping SDG + secteurs DAC). Appliquer à toutes les opportunités existantes via Claude en batch.
- Implémenter le **matching vectoriel réel** : embeddings (text-embedding-3-small ou voyage-2) sur le profil organisation et sur chaque opportunité, score = cosine similarity + pondération métier. Stocker dans Supabase pgvector.
- Monter à **50 sources actives**. Priorité absolue. Cibler 1000+ opportunités vivantes en base.
- **Digest email quotidien** automatique avec les 3 meilleurs matches du jour. Une seule routine cron, mais c'est ça qui crée le retour quotidien.
- **Mobile responsive** complet sur les 5 écrans critiques (login, dashboard, liste, détail, mes candidatures).
- **Section "preuves de confiance"** sur la landing : 5 logos d'associations partenaires (à recruter en bêta privée), 3 témoignages, mention partenaire institutionnel.

### PHASE 2 — Premium (6-10 semaines)
Le but est de créer la rétention quotidienne et la valeur perçue qui justifie un abonnement payant.

- **Kanban candidatures** (idée → brouillon → soumis → résultat) avec calendrier visuel des deadlines.
- **Page intelligence donneur** : projets financés, organisations bénéficiaires, montants moyens — crawl + IA.
- **AI co-writer** d'executive summary depuis le profil orga + brief opportunité.
- **WhatsApp Business** alerts pour les nouvelles opportunités à 90%+ match.
- **Comptes équipe** avec rôles (admin, contributeur, viewer) — important pour les ONG qui travaillent en équipe.
- **Dashboard ops admin** avec monitoring de la collecte (sources OK/KO, taux d'extraction, coût Claude).

### PHASE 3 — Innovation IA (10-16 semaines)
Le but est d'établir la différenciation technique défendable.

- **Modèle de probabilité de réussite** entraîné progressivement sur les outcomes utilisateurs (déposé / présélectionné / financé / refusé). Démarre par un modèle naïf (régression sur features simples), s'enrichit avec les données.
- **Document intelligence** : analyse des rapports d'activité de l'asso (uploads optionnels) → enrichissement automatique du profil et amélioration du matching.
- **Recherche sémantique multilingue** FR/AR/EN avec re-ranking.
- **Donor intelligence prédictive** : "voici 5 bailleurs qui ne t'ont jamais financé mais qui ressemblent à ceux qui te financent déjà".
- **Système de recommandation collaboratif** : "des associations similaires à la tienne ont aussi déposé sur..."

### PHASE 4 — Différenciation internationale (12+ mois)
Le but est le moat durable et l'expansion régionale.

- **Open dataset** anonymisé des flux de financement Nord-Sud sur le Maghreb. Publié, citable, défensible.
- **B2B donneurs** : licence "donor edition" qui permet aux fondations de trouver des partenaires marocains alignés sur leur stratégie. Vrai vecteur de revenus.
- **Marketplace consultants** : connexion ONG ↔ rédacteurs de proposition / experts thématiques. Take rate sur transactions.
- **Expansion** : Tunisie, Sénégal, Côte d'Ivoire — playbook réutilisable sur chaque pays.
- **API B2B** : autres SaaS (CRM ONG, plateformes ESS) peuvent intégrer les données Funding Watch.

---

## 10. Vision long terme — Honnêteté complète

### Funding Watch peut-il devenir un acteur régional/international ?
**Oui, mais sous conditions strictes.** Le marché existe (la veille financement est un pain réel et non résolu pour 80% des ONG en Afrique francophone). La fenêtre temporelle est ouverte (aucun concurrent Maghreb-focused crédible aujourd'hui). Le stack technique est bon.

Ce qu'il manque pour y arriver :
1. **Volume de data exclusif** (50+ sources, 5000+ opportunités vivantes).
2. **Intelligence vraie** (matching vectoriel, scoring de probabilité, intelligence donneur).
3. **Onboarding qui structure profondément le profil orga** — sans ça, tout est superficiel.
4. **Mobile-first** et intégration WhatsApp.
5. **Preuves sociales** (50+ associations actives en bêta dans les 6 prochains mois).
6. **Modèle économique clair** — aujourd'hui aucun pricing visible. Freemium avec limite (3 alertes / mois gratuit, illimité à 19€/mois ; team à 49€/mois) est probablement le bon départ.

### Quel serait le vrai moat ?
Trois moats potentiels, par ordre de défensibilité décroissante :

1. **Data localisée propriétaire**. Tu scrapes ce que personne ne scrape : Bulletin Officiel, conseils régionaux, ambassades, fondations marocaines, programmes INDH. Ce travail est long, fastidieux, mais une fois fait, **personne ne le refera**. C'est le moat de Devex.
2. **Outcomes data**. Une fois que 500 associations ont saisi leurs candidatures et leurs résultats, tu as une base de données unique au monde sur "qu'est-ce qui marche au Maroc pour quel type d'organisation sur quelle thématique". C'est inattaquable.
3. **Effets de réseau B2B**. Quand les bailleurs eux-mêmes utilisent ta plateforme pour découvrir des partenaires, tu deviens un standard de fait. Devex a réussi ça partiellement, personne au Maghreb.

### Meilleure stratégie produit
Concentration brutale sur **le cycle de vie complet de la candidature** : découvrir → décider → préparer → déposer → suivre → apprendre. Tout ce qui sort de ce cycle est une distraction. Refuser les tentations CRM, comptabilité, gestion de projet — ces marchés sont déjà saturés.

### Meilleure stratégie data
**Privilégier la profondeur sur la largeur** : 30 sources extrêmement bien couvertes (avec PDFs lus, intelligence donneur, historique des appels passés) battent 300 sources superficielles. La métrique nord-étoile devrait être "% d'opportunités du marché Maroc capturées dans les 24h de leur publication" — viser 90%.

### Meilleure stratégie IA
Trois niveaux à empiler :
- **Niveau 1 (déjà là) — Extraction structurée**. Continuer à raffiner.
- **Niveau 2 (à construire) — Matching et scoring**. Embeddings + modèle de pertinence appris.
- **Niveau 3 (long terme) — Assistance générative**. Co-writer, brainstorming projet, vérification d'éligibilité.

Éviter à tout prix le chatbot conversationnel gadget. L'IA doit être **invisible et utile**, pas démonstrative.

### Meilleure stratégie croissance
1. **Bêta privée invitation-only** sur 3 mois (50 associations marocaines triées sur le volet). Crée la rareté + recueille les vrais besoins.
2. **Lancement public avec partenaire institutionnel** (Fondation Drosos, Open Society Maroc, ou même la GIZ qui finance déjà beaucoup d'ONG marocaines). Le tampon de crédibilité divise par 10 le coût d'acquisition.
3. **Content marketing exigeant** : un rapport annuel sur le financement de la société civile au Maroc (que personne ne fait), publié en FR/EN. Devient ta carte de visite.
4. **Évangélisation événementielle** : Sommet de la Société Civile, fora régionaux, formations universitaires en gestion de projets sociaux. C'est lent, mais c'est le canal acquisition durable.
5. **Pricing freemium + B2B donneurs** : la croissance se finance par les donneurs (qui payent cher) et les ONG bénéficient d'un freemium généreux. Modèle Notion/GitHub pour le secteur social.

---

## Synthèse exécutive

Funding Watch Morocco a une **bonne idée**, un **bon stack**, un **bon goût visuel** et une **vision viable**. Ce qui lui manque pour devenir un produit international est concentré sur trois axes : **profondeur de la data**, **intelligence réelle du matching**, et **capture structurée du profil organisation**. Tant que ces trois axes ne sont pas atteints, le produit reste un prototype premium plutôt qu'une plateforme.

La fenêtre est ouverte mais étroite. Il y a un avantage du premier entrant sur le Maghreb francophone, à condition d'aller vite (12 mois pour s'imposer comme la référence régionale) et d'avoir la discipline de **refuser tout ce qui n'est pas dans le cycle de vie de la candidature**.

Si tu fais ces 3 choses en Phase 1 et que tu trouves un partenaire institutionnel pour Phase 2, ce produit peut lever un seed de 500k-1M€ d'ici 18 mois.

S'il continue à s'embellir sans gagner en substance, il restera ce qu'il est aujourd'hui : un beau projet qui mérite mieux.

---

*Document de travail — à mettre à jour à chaque cycle de release majeur.*
