# Spec projet : AgriGPT

> Statut : **implémenté le 2026-11-04** (maquette validée par Zakaria le même jour).
> Dépôt source : https://github.com/ZakariaElAoufir/AgriGPT (public).

## Le projet réel

Assistant conversationnel agricole local, en français. Interface **Streamlit** (`frontend/app.py`) → API **FastAPI**
(`backend/main.py` : `POST /ask`, `GET /conversations`, `GET /conversations/{id}`) → moteur **RAG** (`backend/rag.py`) :
filtre de 28 mots-clés agricoles, embedding de la question (Ollama `mxbai-embed-large`), recherche **FAISS** IndexFlatL2
(5 plus proches parmi 275 extraits de 500 caractères, seuil de distance 190), génération Ollama `llama3.2:3b`,
sauvegarde **SQLite** (`conversations`, `messages`). Export PDF de la conversation avec ReportLab.
Corpus : 3 PDF (FAO bonnes pratiques, INRA fiche blé, ONSSA catalogue des usages).

Remarque : le README décrit aussi une interface HTML servie par FastAPI et une route PDF qui **ne sont pas dans le dépôt** ;
la démo reproduit donc l'interface Streamlit.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/agrigpt/` | En-tête (fil d'Ariane, onglets Démo / Architecture, Code), 3 encadrés (problème, ce que fait l'app, rôle), bandeau « Simulation », démo |
| `/projets/agrigpt/architecture/` | Menu à gauche, une section à la fois : vue d'ensemble, stack, parcours d'une question, indexation, modèle de données, choix techniques, limites et suites |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
- Interface Streamlit reproduite (thème clair, Source Sans 3, barre latérale avec logo et historique) dans un cadre de navigateur pixel, sur presque toute la largeur de l'écran, avec un mode **plein écran** (Échap pour sortir).
- Questions préenregistrées dans la fenêtre : 4 réponses écrites à partir des **vrais extraits** de `rag_chunks.json`, plus une question hors sujet.
- Le **vrai filtre** de `rag.py` (28 mots-clés) et le vrai message de refus sont repris tels quels. Une question agricole non préenregistrée affiche une note « démo statique » au lieu d'inventer une réponse.
- Historique : 2 conversations déjà présentes, libellé coupé à 35 caractères comme `app.py` ; « Nouvelle conversation ».
- « Exporter en PDF » : avertissement si vide, sinon « Télécharger le PDF » ouvre un aperçu de la page PDF.
- « Sous le capot » : les 5 étapes du backend s'allument, avec les extraits retrouvés et leur distance (**valeurs illustratives**, indiqué sur la page).
- Les emoji de l'app (🌱, 📄, ➕, 📂) sont remplacés par des icônes.

### Mobile (< 1024 px)
Pas de code de démo téléchargé. Galerie de 3 captures annotées (réponse sourcée, hors sujet filtré, export PDF) + « Copier le lien ».

## Fichiers

```
src/projects/agrigpt/
  project.json        # hasDemo: true, thumbnail, detail (problème, rôle, galerie)
  architecture.json   # vue d'ensemble (blocs, logos, flèches nommées), stack, diagrammes, choix, limites (FR/EN)
  fr.md / en.md       # description de la ligne sur /projets
  demo/Demo.astro     # charge l'îlot uniquement sur écran large
  demo/AgriGptDemo.tsx, demo.css, strings.ts
  demo/logic.ts       # faux backend : réponses, filtre, libellés (testé dans tests/agrigpt-demo.test.ts)
  diagrams/*.mmd      # sources Mermaid FR/EN ; *.svg = rendu, inséré dans la page au build
  media/              # logo, thumbnail.png (vignette des cartes), shot-*.png (galerie mobile)
```

Régénérer les diagrammes : `npm i --no-save puppeteer-core@23 && node scripts/render-diagrams.mjs src/projects/agrigpt`.
Régénérer les captures : dev server lancé, puis `node scripts/capture-agrigpt.mjs` et copier `.captures/*.png` dans `media/`.

## Type et rôle
Projet **académique** : PFA (projet de fin d'année), réalisé **seul** (confirmé par Zakaria le 2026-11-04).
