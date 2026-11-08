# Spec : Portfolio de Zakaria El Aoufir — pages et fonctionnalités

> Statut : **validée le 2026-10-28**, mise à jour le même jour avec la direction artistique (les maquettes HTML, supprimées le 2026-11-04, ont servi de référence au site Astro).
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
5. **Compétences** : **arbre de compétences** (refait le 2026-11-04, remplace l'ancien tableau). Au centre, Zakaria (photo, nom, rôle, langues parlées : français, arabe, anglais). Autour, 8 branches reliées par des fils pixel à angles droits : Langages, Backend, Frontend (haut), Données, IA (milieu), DevOps et Cloud, Mobile, Outils (bas). Chaque technologie est une feuille avec son **logo** (fichiers SVG locaux dans `public/logos/`, issus de devicon (MIT) et Simple Icons (CC0), affichés en monochrome lavande via `mask` ; icônes pixel maison pour Microservices, Java Swing, PL/SQL, RAG, FAISS). **PC** : au survol, la feuille grossit (×1,22) et passe au premier plan, les autres s'estompent, le fil de la branche s'allume et défile. **Mobile** : arbre vertical (tronc à gauche, branches empilées), sans effet de survol.
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

Astro 5, React 19 (îlots de démo, `@astrojs/react` 4), TypeScript strict, Tailwind CSS v4, Mermaid → SVG (pré-rendu depuis les `.mmd` par `scripts/render-diagrams.mjs`, SVG commités et insérés dans la page au build, aucun JS Mermaid côté visiteur),
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

## Direction artistique : « Nuit pixel » (choisie le 2026-11-04)

**Historique** : le 2026-10-28, direction « Metropolis noir » (Neo-Noir Art Déco des années 30, rouge puis mauve). **Abandonnée le 2026-11-04** au profit d'un style pixel, à partir d'une illustration de ville la nuit fournie par Zakaria. Les pages et leur principe (sections, cartes, cadran, lignes de projets) restent les mêmes ; seules les formes, couleurs, polices et animations changent.

**Brief de Zakaria** : design pro, pas surchargé, sans emoji (icônes OK), animations légères, contenu qui apparaît au fur et à mesure du scroll ; style **pixel** ; police pixel mais lisible ; couleurs tirées de l'image de fond ; pluie en fond, en biais (vent), **sur PC uniquement**.

**Référence** : le site Astro lui-même. Les maquettes HTML de `maquettes/` ont servi à valider le style puis ont été supprimées le 2026-11-04 (elles restent dans l'historique Git). Image de fond : `public/images/` (illustration fournie par Zakaria, 1920 × 1080 ; droits d'usage à vérifier avant mise en ligne).

**Palette** (tokens CSS, prise dans l'image) : `--night #12122f` (fond), `--deep #1a1a4d`, `--raise #262673` (surfaces), `--line #34349a` (cadres pixel), `--ivory #e8e8fa` (texte, blanc des nuages), `--ash #a9abe0` (texte secondaire), `--accent #3b3ac4` (bleu-violet des tours, boutons), `--accent-dark #1f1e7a` (bord bas des boutons, ombres de titres), `--accent-text #9fa3f5` (accent lisible sur fond sombre).

**Typographie** : **Pixelify Sans** (titres de section, navigation, boutons, étiquettes ; 400 à 700) + **Archivo** (400 à 800) pour le texte courant et pour le nom, pour rester lisible. Google Fonts (à auto-héberger dans Astro). Titres plus petits qu'avant car la police pixel est plus large.

**Formes pixel**
- **Cadre pixel** (cartes formation/projets/certifs, expériences, compétences, contact, portrait, lignes de projets) : bordure de 4 px dessinée en `box-shadow` à l'extérieur, coins manquants (effet arrondi pixel). Au survol, le cadre passe en `--accent-text`.
- **Boutons, puces, badges** : coins en escalier (`clip-path: var(--pix)`, deux crans de 4 px), bord bas plus sombre ; le bouton s'enfonce au clic.
- Titres de section avec ombre pixel décalée et filet de carrés ; nom (hero et en-tête) en **Archivo 800**, police normale et lisible ; 2e ligne en `--accent-text`, ombre pixel.
- Transitions **fluides** (courbe `--ease`), uniquement sur `transform`, `opacity` et `background` : pas de `steps()` ni d'animation de `box-shadow`, jugés saccadés par Zakaria le 2026-11-04.

**Fond et animation**
- Image fixe en `object-fit: cover`, voile dégradé sombre pour la lisibilité ; pas de flou.
- **Pluie** (`noir.js`) : un `<canvas>`, environ 1 goutte pour 16 px de large, traits inclinés d'environ 18° (vent), 30 images/s. Active **seulement** si écran ≥ 1024 px, souris (`hover: hover` + `pointer: fine`) et pas de `prefers-reduced-motion`. Rien sur mobile ni tablette.
- Scroll reveal par IntersectionObserver ; classe `.js` sur `<html>` pour que tout reste visible sans JS.
- Responsive vérifié : aucun défilement horizontal à 360 px.

## État d'avancement (2026-11-04)

**Fait**
- Spec fonctionnelle validée (ce fichier) ; direction artistique « Nuit pixel » validée sur les maquettes ; types de projets confirmés par Zakaria.
- **Site Astro en place** (toutes les pages sauf les démos), fidèle aux maquettes, en FR et EN :
  - `/` et `/en/` : accueil complet (hero, formation, expériences + cadran, 3 projets mis en avant, arbre de compétences, contact) ;
  - `/projets/` et `/en/projets/` : 9 projets, une ligne chacun ;
  - `/certifications/` et `/en/certifications/` : 17 certificats réels (Coursera et Anthropic Academy) avec leur lien de vérification, date facultative (absente sur les certificats Anthropic) ; l'état « Bientôt » ne s'affiche que si la liste est vide ;
  - `404`.
- Structure : `src/content/` (profil, formation, expériences, compétences, certifications : JSON validés par schéma, champs `fr`/`en` obligatoires), `src/projects/<slug>/` (`project.json` + `fr.md` / `en.md`), `src/i18n/` (textes d'interface + `useTranslations`, `localePath`, `alternatePath`), `src/components/` (Header, Footer, Icon, `home/*`), `src/layouts/BaseLayout.astro`, `src/scripts/site.ts` (menu, scroll reveal, pluie), `src/styles/global.css` (tokens + Tailwind v4).
- Images optimisées au build (`src/assets/profile.png`, `src/assets/ville-nuit.jpg` → WebP). Polices auto-hébergées via `@fontsource`. Logos dans `public/logos/`, sprite d'icônes `public/icons.svg`, CV dans `public/cv/`.
- Boutons **Démo** et **Architecture** masqués tant que `hasDemo` vaut `false` (tous les projets pour l'instant) ; l'image d'un projet sans démo n'est pas un lien.
- Tests Vitest (parité des clés FR/EN, sélecteur de langue), `astro check` sans erreur, build OK (7 pages). Workflow `.github/workflows/deploy.yml` prêt : déploie sur Pages à chaque push sur `main` (activer « GitHub Actions » comme source dans Settings → Pages).
- Dépendances : astro 5, @astrojs/check, typescript, tailwindcss 4 + @tailwindcss/vite, @fontsource/pixelify-sans, @fontsource/archivo ; vitest en dev. `overrides.vite` fixé en 6.x pour n'avoir qu'une version de Vite (sinon `astro check` échoue). React installé avec la démo AgriGPT ; police `@fontsource/source-sans-3` pour reproduire Streamlit. Mermaid n'est pas une dépendance (rendu hors build).
- Aperçu : config « site » de `.claude/launch.json` (`npm run dev`, port 4321).

- **Démo n° 1 : AgriGPT** (2026-11-04), voir `SPEC-project-agrigpt.md` : pages `/projets/agrigpt/` (démo React manipulable, plein écran, « sous le capot ») et `/projets/agrigpt/architecture/` (menu latéral, grand diagramme avec logos et flèches nommées, diagrammes Mermaid, stack, choix, limites), en FR et EN. Vignette (capture de la démo) sur la carte de l'accueil et la ligne de `/projets/` ; boutons Démo et Architecture actifs.
- **Démo n° 2 : Home Energy Tracker** (2026-11-04), voir `SPEC-project-home-energy-tracker.md` : pas d'interface dans le projet réel, la démo reproduit ses outils (API via la gateway façon Swagger, Kafka UI, Mailpit, Grafana) sur un pipeline rejoué aux vraies cadences. La page architecture gagne une section **Origine** (champ `credits` d'`architecture.json`), affichée seulement si elle existe.
- **Démo n° 3 : The Wall** (2026-11-04), voir `SPEC-project-the-wall.md` : application Flutter + Supabase en binôme ; la démo montre deux téléphones (Nora et Samir) et le panneau Supabase (tables, requêtes). Seule ma partie est mise en avant (amis, messagerie). Le grand diagramme gagne un cadre de groupe et une légende « Ma partie » (champs `group`, `mine`, `mineLabel`, `caption`, `nodeHeight` d'`architecture.json`).
- **Démo n° 4 : plateforme e-commerce microservices** (2026-11-04), voir `SPEC-project-e-commerce-microservices.md` : la boutique Angular « Guitara » dans un navigateur, à côté le trajet de chaque requête (Nginx, gateway, Eureka, services, OpenFeign, SQL) et les 4 bases PostgreSQL. Dépôt public MCommerce (le portfolio le donnait comme privé). Nouveau champ `overview.nodeWidth`.
- **Démo n° 5 : application de rendez-vous hospitaliers** (2026-11-04), voir `SPEC-project-rendez-vous-hospitaliers.md` : l'app Android MEDIGOO (Java, Room) sur un émulateur unique, avec le Database Inspector d'Android Studio à côté (tables et requêtes DAO).
- **Démo n° 6 : Koursero, plateforme de vente de formations** (2026-11-05), voir `SPEC-project-vente-formations.md` : le site Django dans un navigateur (pages, admin, pages de debug), à côté runserver avec le SQL de l'ORM, la session et les tables SQLite. Catalogue repris de la base du dépôt, comptes inventés.
- **Démo n° 7 : plateforme de suivi des stagiaires** (2026-11-08), voir `SPEC-project-plateforme-stagiaires.md` : l'application « e-Stage » dans un navigateur, à côté le trajet de chaque requête et les tables PostgreSQL. Trois comptes : Sara rejoint une équipe, Yassine suit ses missions, ses livrables et l'assistant IA, Karim relit en encadrant avec la vérification IA. Projet à trois : les modules de Redouane et d'Aya affichent un message avec un bouton vers leur GitHub. Dépôt privé, logo et données inventés.
- **Démo n° 8 : gestion centralisée des incidents et SLA** (2026-11-08), voir `SPEC-project-incidents-sla.md` : l'espace technicien « Predict SLA » dans un navigateur, à côté le trajet de chaque requête et les tables MySQL. Prise en charge, résolution, escalade, refus, et une horloge pour faire expirer les SLA. Projet à trois : les comptes Admin et Client affichent un message avec un bouton vers le GitHub de Younes9976 et de hslimi212. Dépôt privé, logo et données inventés.
- Pages génériques pour tout projet avec démo : `src/pages/[...lang]/projets/[slug]/index.astro` et `architecture.astro`, composants `src/components/project/` (ProjectHeader, ArchOverview). Un projet active sa démo avec `hasDemo: true` + `detail` dans `project.json`, un `architecture.json`, `demo/Demo.astro`, `diagrams/*.{fr,en}.svg`.

**Déroulé par projet** (changé par Zakaria le 2026-11-04) : lire le dépôt (frontend puis architecture) → implémentation directe dans Astro (démo et page architecture, plus de maquette HTML) → Zakaria relit et les corrections se font directement dans Astro → projet suivant. Jamais deux projets à la fois. Les dépôts privés sont clonés par Zakaria dans le dossier du projet pour que le frontend puisse être lu.

**Étapes suivantes** (dans l'ordre)
1. Zakaria relit les démos AgriGPT, Home Energy Tracker et The Wall.
2. Démos des autres projets, un par un : les dépôts privés que Zakaria clonera ici.
3. Fusion dans `main` (= mise en ligne) quand Zakaria le décide.

**Outils** : les skills `frontend-design` et `taste-skill` sont installés au niveau utilisateur (`~/.claude/skills/`), **pas dans ce dépôt**. Le dossier `.taste-skill/` (ignoré par Git) ne contient que des fichiers de travail du skill.

## Questions ouvertes

Aucune bloquante. Remarque : dans le CV anglais, la section Education est restée en français (intitulés des diplômes). Le site affichera une traduction anglaise (« State Engineering Degree in Computer Science and Networks, MIAGE option », « Baccalaureate in Experimental Sciences, Physics option ») ; à corriger aussi dans le PDF si souhaité.
