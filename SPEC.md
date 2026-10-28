# Spec : Portfolio de Zakaria El Aoufir — pages et fonctionnalités

> Statut : **validée le 2026-10-28**, mise à jour le même jour avec la direction artistique (maquettes HTML dans `maquettes/`).
> Chaque projet présenté aura plus tard sa propre spec : `SPEC-project-<slug>.md`.
> **Reprise du travail : lire d'abord la section « État d'avancement » en bas de ce fichier.**

## Objectif

Site personnel servant à **décrocher un CDI de développeur full stack Java / Angular**.
Il présente le parcours (comme le CV), puis des projets mis en valeur « comme des produits »,
chacun avec une démo interactive mockée et une explication technique avec diagrammes.

**Visiteurs cibles**
- Recruteur RH : lit en 1 à 2 minutes, souvent sur mobile. Doit comprendre le profil, le parcours et voir que les projets « tournent ».
- Recruteur / lead technique : sur PC, ouvre les démos, les diagrammes et le code GitHub.

**Le succès** : un visiteur qui arrive par le lien du CV trouve en moins de 3 clics une démo, son architecture et le dépôt GitHub d'un projet.

## Décisions de contenu

1. **Sources** : le texte FR vient du CV français et du README GitHub, le texte EN du CV anglais (`public/cv/`). Tout texte EN absent des sources est proposé par Claude et relu par Zakaria.
2. **Contact** : liens directs uniquement, e-mail `zakaria.elaoufir@gmail.com`, LinkedIn `https://www.linkedin.com/in/zakaria-el-aoufir-329627282`, GitHub `https://github.com/ZakariaElAoufir`. Le **téléphone n'est pas affiché**. Pas de formulaire.
3. **CV** : le bouton « CV » pointe vers `cv/Zakaria_El_Aoufir_CV_FR.pdf` en FR et `cv/Zakaria_El_Aoufir_CV_EN.pdf` en EN.
4. **Photo** : `public/images/profile.png` (543 × 644, fond blanc), optimisée au build. Affichée **telle quelle, sans aucun filtre** (ni noir et blanc, ni contraste, ni voile), dans un **cadre carré simple**.
5. **Compétences** = celles du CV **plus** celles du GitHub (React, FastAPI, Spring Cloud, Keycloak, InfluxDB, Prometheus, Grafana, Flutter, Dart, Supabase, et une catégorie IA : RAG, Ollama, FAISS, Spring AI). Objectif : mettre le profil le plus en valeur.
6. Les **4 stages** du CV sont affichés, y compris Al Omrane et le stage réseaux.
7. **Projets de stage** (décision du 2026-10-28, remplace l'ancienne règle « DXC 2026 uniquement dans Expériences ») : les deux stages de développement DXC (plateforme des stagiaires 2026, incidents et SLA 2025) ont **leur projet et leur démo dans Projets**. Dans Expériences, chacun a un bouton « Voir le projet » vers ce projet, avec la mention « Dépôt privé ». Leur description est **identique au texte du CV**, mot pour mot.
8. **Pas d'emoji** nulle part sur le site ; des icônes (style Lucide) si besoin.
9. Les **animations au scroll** sont un bonus : sans JavaScript ou avec « réduire les animations » activé, tout le contenu est visible immédiatement.

## Projets à dépôt privé

- Zakaria clone le dépôt privé **en local, hors du dépôt du portfolio** (ou dans un dossier ignoré par Git).
- Claude étudie l'interface et l'architecture, puis les **reproduit de manière statique** (démo mockée, captures, diagrammes).
- **Aucun code source privé n'est copié** dans le dépôt public du portfolio.
- Sur le site, le bouton « Code » est remplacé par la mention « Dépôt privé ».
- Les deux projets de stage DXC (plateforme des stagiaires 2026, incidents et SLA 2025) suivent ce processus : démo reconstituée, mention « Dépôt privé, démo reconstituée ».

## Plan du site

| Route FR | Route EN | Page |
|---|---|---|
| `/` | `/en/` | Accueil (le CV mis en scène) |
| `/projets` | `/en/projets` | Catalogue des projets |
| `/projets/<slug>` | `/en/projets/<slug>` | Démo + présentation d'un projet |
| `/projets/<slug>/architecture` | `/en/projets/<slug>/architecture` | Explication technique + diagrammes |
| `/certifications` | `/en/certifications` | Certifications (Coursera…) |
| `404` | — | Page introuvable, liens vers Accueil et Projets |

**Éléments communs à toutes les pages**
- **En-tête** : nom, navigation (Accueil, Projets, Certifications), sélecteur FR / EN, bouton « CV ». Menu repliable sur mobile.
- Le sélecteur de langue garde la **même page** (`/projets/x` ↔ `/en/projets/x`).
- **Pied de page** : e-mail, LinkedIn, GitHub, lien vers le code source du portfolio.

## Page 1 — Accueil

Sections dans cet ordre, chacune apparaissant progressivement au scroll :

1. **Présentation (hero)** : photo, nom, titre (« Ingénieur logiciel — Full Stack Java / Angular »), badge « Ouvert à un CDI », résumé professionnel, boutons « Voir mes projets » et « Télécharger le CV », liens GitHub / LinkedIn / e-mail.
2. **Formation** : EMSI (2022–2026, ingénieur d'État IIR option MIAGE, Rabat), Lycée Louis Le Grand (2019–2021, Bac Sciences Expérimentales option Physique, Rabat). Affichée en frise chronologique.
3. **Expériences** : pour chaque stage → entreprise, poste, dates, lieu, description (puces du CV), technologies (badges). Ordre : du plus récent au plus ancien. Les deux stages de dev DXC ont un bouton « Voir le projet » (ancre vers leur ligne sur `/projets`) et la mention « Dépôt privé ».
4. **Projets** : seulement **3 projets mis en avant, hors stage** : Home Energy Tracker, AgriGPT, The Wall (champ `featured: true`).
   - Chaque bloc : titre, période, technologies, description courte, image cliquable qui mène à **la page de ce projet** (`/projets/<slug>`), liens Démo / Code.
   - Un bouton « Voir tous les projets » vers `/projets` termine la section.
5. **Compétences** : regroupées par catégorie (Langages, Backend, Frontend, Mobile, Données, DevOps & Cloud, Outils), plus les langues parlées (français, arabe, anglais).
6. **Contact** : court appel à l'action + e-mail, LinkedIn, GitHub, CV.

## Page 2 — Projets (catalogue « produits »)

- **Une ligne horizontale par projet publié**, triée par le champ `order`, qui apparaît au fur et à mesure du scroll (image depuis la gauche, texte depuis la droite ; simple montée sur mobile, où la ligne s'empile).
- À gauche : **l'image** du projet, avec effet au survol (zoom, reflet lumineux, étiquette « Voir la démo »).
- À droite : **type** (badge `stage` / `personnel` / `académique`), **date**, **titre**, **description** (2 à 4 lignes ; texte du CV pour les stages), **badges de technologies**, puis les boutons.
- **Trois boutons** :
  - **Code** → dépôt GitHub (nouvel onglet), ou mention « Dépôt privé » si `repo` vaut `null`.
  - **Démo** → `/projets/<slug>`. Sur mobile, le bouton reste présent ; la page affiche la galerie de captures à la place de la démo.
  - **Architecture** → `/projets/<slug>/architecture`.
- Un bouton dont la cible n'existe pas encore (projet sans démo terminée) est **masqué**, pas cassé.
- Aucun projet publié → message neutre « Projets en cours d'intégration ».

## Page 3 — Détail d'un projet (démo)

- Onglets **Démo** | **Architecture** en haut de la page, plus le lien vers le code.
- Description globale du projet (le problème, ce que fait l'application, ton rôle, binôme ou solo).
- **PC (≥ 1024 px)** : démo interactive mockée, avec bandeau « Simulation : données fictives ».
- **Mobile (< 1024 px)** : galerie de captures annotées + « Démo interactive disponible sur ordinateur » + bouton « Copier le lien ». Le code de la démo **n'est pas téléchargé**.

## Page 4 — Architecture d'un projet

- **Stack** par catégorie (frontend, backend, données, infra, outils).
- **Diagrammes** : au minimum l'architecture globale ; selon le projet, flux de données et relations entre composants. Chaque diagramme a un titre et une légende ; sur mobile, un appui l'ouvre en plein écran.
- **Justification des choix techniques** : pourquoi telle techno, quelles alternatives, quels compromis.
- Section « Origine / crédits » si le projet s'inspire d'un tutoriel ou est fait en binôme.

## Page 5 — Certifications

- Une **carte par certification** : nom, organisme (Coursera, université partenaire), date, compétences, lien de vérification, image du certificat si disponible.
- Contenu fourni plus tard ; la page fonctionne avec une liste vide (« Bientôt d'autres »). La maquette utilise 4 certificats **fictifs**, à remplacer par les vrais.

## Données

| Donnée | Emplacement | Format |
|---|---|---|
| Profil, résumé, contacts | `src/content/profile/` | JSON avec champs `fr` / `en` |
| Formation | `src/content/education/` | 1 JSON par diplôme |
| Expériences | `src/content/experiences/` | 1 JSON par stage |
| Compétences | `src/content/skills/` | 1 JSON par catégorie |
| Certifications | `src/content/certifications/` | 1 JSON par certificat |
| Projets | `src/projects/<slug>/` | `project.json` + `fr.md` / `en.md` + `diagrams/` + `demo/` + `media/` |
| Textes de l'interface | `src/i18n/fr.json`, `en.json` | clés plates |

Toutes les données sont validées par schéma : un champ manquant ou une traduction oubliée **fait échouer le build**.

## Tech Stack (validé)

Astro 5, React 19 (îlots de démo), TypeScript strict, Tailwind CSS v4, Mermaid → SVG au build,
routage i18n natif d'Astro (FR par défaut à la racine, EN sous `/en/`), GitHub Pages via GitHub Actions
(dépôt `ZakariaElAoufir.github.io`, servi à la racine).

## Commandes

```
Installation : npm install
Dev :          npm run dev        # http://localhost:4321
Vérification : npm run check      # astro check (types + schémas)
Tests :        npm test           # vitest run
Build :        npm run build      # génère dist/
Aperçu prod :  npm run preview
```

## Structure du projet

Voir l'arborescence validée : `src/projects/<slug>/` (un dossier autonome par projet, découvert automatiquement),
`src/content/` (parcours, certifications), `src/i18n/`, `src/components/`, `src/layouts/`, `src/pages/[...lang]/`.

## Style de code

- TypeScript strict, composants en `PascalCase`, fichiers de données et slugs en `kebab-case`.
- Aucun texte affiché en dur dans les composants : tout passe par `t('cle')` ou par les données.
- Exemple de `project.json` :

```json
{
  "order": 1,
  "published": true,
  "featured": true,
  "type": "personnel",
  "period": "2026",
  "repo": "https://github.com/ZakariaElAoufir/Microservice-Home-Energy-Tracker",
  "stack": ["Java 21", "Spring Boot", "Kafka", "InfluxDB", "Keycloak"],
  "hasDemo": true,
  "thumbnail": "media/thumbnail.png"
}
```

## Stratégie de test

- `astro check` : types et schémas de toutes les données.
- Vitest : logique des fausses API des démos, et parité des clés de traduction FR / EN.
- Le build lui-même sert de test d'intégration (pages générées pour chaque langue et chaque projet publié).
- Vérification manuelle à chaque projet : PC 1440 px, mobile 375 px, FR et EN.

## Limites

- **Toujours** : passer `npm run check` et `npm run build` avant chaque commit ; ajouter FR et EN ensemble ; rester 100 % statique.
- **Demander d'abord** : ajouter une dépendance, publier un projet (`published: true`), modifier le workflow de déploiement, afficher une donnée personnelle (téléphone, adresse).
- **Jamais** : backend, base de données ou appel à une API externe ; secrets dans le dépôt ; contenu inventé sur ton parcours ; code source d'un dépôt privé copié dans ce dépôt.

## Critères de succès

- [ ] Toutes les pages existent en FR et en EN, et le sélecteur garde la page courante.
- [ ] L'accueil affiche, dans l'ordre : présentation, formation, expériences, projets, compétences, contact.
- [ ] Sur l'accueil, cliquer sur l'image d'un projet ouvre la page de ce projet précis.
- [ ] Le bouton CV télécharge le PDF de la langue affichée.
- [ ] Sans JavaScript, tout le contenu de l'accueil est lisible.
- [ ] Ajouter un dossier projet avec `published: true` le fait apparaître sur l'accueil, le catalogue et ses deux pages, sans toucher à aucun autre fichier.
- [ ] Passer `published: false` le retire partout, sans lien cassé.
- [ ] Sous 1024 px, aucune requête vers le code d'une démo ; la galerie de captures s'affiche.
- [ ] Les diagrammes sont lisibles à 375 px (plein écran avec zoom).
- [ ] Aucun défilement horizontal à 360 px.
- [ ] Lighthouse mobile sur l'accueil : Performance ≥ 90, Accessibilité ≥ 95.
- [ ] Un push sur `main` déploie automatiquement sur `https://zakariaelaoufir.github.io`.

## Direction artistique : « Metropolis noir » (choisie le 2026-10-28)

**Brief de Zakaria** : design pro, pas surchargé, sans emoji (icônes OK), animations (survol, arrière-plan), contenu qui apparaît au fur et à mesure du scroll, ambiance **Neo-Noir Art Déco des années 1930** : sombre, mystérieuse, contrastée, identité « film noir ».

**Référence = les maquettes HTML** dans `maquettes/` (c'est elles qu'il faut reproduire dans Astro) :

| Fichier | Contenu |
|---|---|
| `maquettes/accueil.html` | Accueil complet (hero, formation, expériences, 3 projets, compétences, contact) |
| `maquettes/projets.html` | Catalogue : une ligne horizontale par projet, 9 projets |
| `maquettes/certifications.html` | Certifications (données fictives) |
| `maquettes/noir.css`, `noir.js`, `icons.svg` | Styles, scroll reveal / menu mobile, sprite d'icônes partagés |
| `maquettes/media/ville-1933.jpg` + `credits.json` | Photo de fond et sa licence |

Aperçu : `python -m http.server 4400` à la racine du dépôt (config « maquettes » dans `.claude/launch.json`), puis `http://localhost:4400/maquettes/`.

**Palette** (tokens CSS) : `--night #0d0e10` (fond), `--deep #17191d`, `--raise #24272d` (surfaces), `--ivory #efe9dc` (texte), `--ash #a9adb5` (texte secondaire), `--red #b3262f` (accent), `--red-dark #6e161c`, `--red-text #e0565e` (rouge lisible sur fond sombre).

**Typographie** : Big Shoulders Display (titres, 500/700/800, capitales condensées) + Archivo (texte, 400/500/600), Google Fonts (à auto-héberger dans Astro).

**Éléments de signature**
- **Fond** : photo réelle « Rockefeller Center, December 1933 » de Samuel H. Gottscho (domaine public, Wikimedia Commons) : ville des années 30 de nuit, vue d'en haut, avec ses lumières (pas de néon). Fixe, floutée (`blur(3px) brightness(.62) sepia(.18)`), lente dérive de 60 s, voile radial sombre. Crédit en petit dans le pied de page.
- **Hero** : nom sur deux lignes (« El Aoufir » en lettres détourées), statut « Ouvert à un CDI », portrait carré simple avec liseré qui s'écarte au survol.
- **Formation** en « étages » ; **Expériences** avec un **cadran d'ascenseur** sticky dont l'aiguille suit le stage lu.
- **Cartes** à coins en gradins (`clip-path` Art Déco) ; boutons octogonaux ; titres de section avec filet pointillé rouge ; bandeau défilant rouge avant le contact.
- **Scroll reveal** par IntersectionObserver ; classe `.js` sur `<html>` pour que tout reste visible sans JS ; `prefers-reduced-motion` respecté.
- Responsive vérifié : aucun défilement horizontal à 360 px.

## État d'avancement (2026-10-28)

**Fait**
- Spec fonctionnelle validée (ce fichier).
- Direction artistique choisie et déclinée en 3 maquettes HTML (voir ci-dessus). Les anciennes maquettes A/B/C/D ont été supprimées.
- Infos des projets GitHub récupérées depuis leurs README (AgriGPT, TheWall_Flutter, Microservice-Home-Energy-Tracker).

**En attente de confirmation de Zakaria** (dernière question posée)
- **Types de projets devinés** : Home Energy Tracker et AgriGPT = « personnel » ; e-commerce microservices, rendez-vous hospitaliers, simulateur bancaire, vente de formations Django = « académique ». The Wall = « académique, binôme » (d'après son README ; sa part : messagerie privée et gestion des amis).
- **Bouton Code** mis seulement quand un dépôt GitHub correspond clairement (absent pour e-commerce, simulateur bancaire, formations Django).
- **Compétences ajoutées** depuis GitHub : Dart, Supabase, ligne IA (RAG, Ollama, FAISS, Spring AI).
- Validation finale des 3 maquettes (l'effet de survol des images projets n'a été vérifié qu'en CSS, pas à l'œil).

**Étapes suivantes** (dans l'ordre)
1. Obtenir les confirmations ci-dessus et corriger les maquettes si besoin.
2. Initialiser le projet Astro 5 + React + Tailwind v4 (demander avant d'ajouter les dépendances), avec le workflow GitHub Actions → Pages.
3. Porter la direction artistique : tokens Tailwind depuis la palette, layout commun (en-tête, fond ville, pied de page), puis Accueil, Projets, Certifications, en FR puis EN.
4. Retirer `maquettes/` du dépôt (ou la passer dans `.gitignore`) une fois le site Astro fidèle aux maquettes.
5. Ensuite, projet par projet : `SPEC-project-<slug>.md`, démo mockée, page architecture.

**Outils** : les skills `frontend-design` et `taste-skill` sont installés au niveau utilisateur (`~/.claude/skills/`), **pas dans ce dépôt**. Le dossier `.taste-skill/` (ignoré par Git) ne contient que des fichiers de travail du skill.

## Questions ouvertes

Aucune bloquante. Remarque : dans le CV anglais, la section Education est restée en français (intitulés des diplômes). Le site affichera une traduction anglaise (« State Engineering Degree in Computer Science and Networks, MIAGE option », « Baccalaureate in Experimental Sciences, Physics option ») ; à corriger aussi dans le PDF si souhaité.
