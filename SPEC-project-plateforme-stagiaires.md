# Spec projet : plateforme intelligente de suivi des stagiaires

> Statut : **implémenté du 2026-11-06 au 2026-11-08**, directement dans Astro, en quatre phases relues une à une.
> Dépôts sources : privés (DXC Technology, stage 2026). Le portfolio affiche « Dépôt privé, démo reconstituée » et ne copie aucun code source.

## Le projet réel

Plateforme de suivi des stagiaires réalisée à trois pendant le stage DXC de février à juillet 2026.
Le code à jour se trouve sur les branches `Zakaria` des dépôts `E-Plateform-Stage-DXC`, `E-Plateform-Stage-DXC-frontend` et `configuration-microservice-DXC`.

- **Frontend** : Angular 21, espaces RH, encadrant et stagiaire.
- **Backend** : Java 21, Spring Boot 3.5, Spring Cloud Gateway, Eureka, Config Server, Kafka, PostgreSQL (une base par service), Flyway, Docker et manifestes Kubernetes.
- **IA** : `chabot-assistant-service` en FastAPI, avec Ollama (`qwen3:0.6b` et `nomic-embed-text`). Le RAG découpe les documents en morceaux de 900 caractères avec un chevauchement de 150, et retient les 6 passages les plus proches.
- **GitHub** : GitHub App, webhooks, branches, commits, fichiers et identités Git.

### Répartition du travail

| Personne | Partie |
|---|---|
| Zakaria El Aoufir | Authentification et profils (`auth-service`, `user-service`), service des stages (`intership-service`, faute de frappe d'origine), IA : assistant de mission, vérification des livrables, plan de travail |
| [Redouane Boulhimez](https://github.com/redouaneboulhimez) | Messagerie privée, réseau social, boutique, DevOps, authentification faciale |
| [Aya Amayou](https://github.com/ayaamayou) | Dossiers des stagiaires, IA de vérification des documents, gamification |

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/plateforme-stagiaires/` | En-tête, 3 encadrés avec boutons vers Redouane et Aya, démo sur ordinateur, galerie sur téléphone |
| `/projets/plateforme-stagiaires/architecture/` | Vue d'ensemble avec « Ma partie » surlignée, stack, 3 diagrammes, 7 choix techniques, limites et pistes |

### La démo

L'application « e-Stage » (logo inventé, à la place de celui de DXC) dans un navigateur, à côté le trajet de chaque requête et les tables PostgreSQL. Toutes les données sont inventées. Les écrans reprennent le design du frontend réel avec du code réécrit.

| Compte | Parcours |
|---|---|
| Sara (`sara.alaoui@estage.demo`) | Connexion ou visage simulé, choix d'un sujet, assistant en 4 étapes, équipe |
| Yassine (`yassine.idrissi@estage.demo`) | Équipe active, compétences, dépôt GitHub simulé, missions, plan de travail IA, détail de mission, livrables, commits, assistant IA |
| Karim (`karim.benali@estage.demo`) | Équipes par sujet, détail d'une équipe, tableau de bord des missions, revue des livrables et des commits, vérification IA, validation |

Le mot de passe est rempli par les boutons de comptes. Tout est simulé dans la page : aucun appel réseau, aucune caméra.

**Écrans remplacés par un message :**

- module d'un coéquipier (Gamification, Dossier, Fil d'actualités, Boutique, Messagerie) : message centré « Cette partie appartient à X », bouton GitHub, rappel qu'il s'agit d'une démo ;
- partie de Zakaria non reconstituée (Accueil, Profil, Calendrier, Stockage, Historique d'équipe, Aide visible, Mot de passe oublié, Sujets, formulaires de création et de modification) : écran de contact avec boutons GitHub, LinkedIn et e-mail.

**Règles reprises du code réel** (`demo/logic.ts`, tests dans `tests/stage-*.test.ts`) :

- places par poste et par équipe, statut OPEN ou FULL, changement de poste, départ ;
- livrables : version suivante, mission à faire ou rejetée qui passe en cours, refus sur une mission terminée, remplacement et suppression avant toute revue, contributeurs de l'équipe ;
- commits : identité Git liée, un commit par dépôt, commit jamais soumis deux fois sur une mission ;
- revue : commentaire obligatoire pour demander des corrections, livrable rejeté qui rejette la mission, mission complétée quand la dernière preuve de chaque membre est acceptée, points versés une seule fois ;
- statut d'une équipe calculé depuis ses preuves et son engagement.

**IA** (`demo/ai.ts`) : le document de consigne est inventé. Le découpage 900/150 et la recherche des passages tournent réellement dans la page ; la similarité est remplacée par la part de mots communs. Les réponses sont rédigées à l'avance dans le format du vrai modèle, et la démo l'indique.

## Fichiers

- `src/projects/plateforme-stagiaires/` : `project.json`, `architecture.json`, `fr.md` et `en.md` (texte du CV, inchangé), `diagrams/`, `media/`.
- `demo/` : `StageDemo.tsx` (fenêtre, routeur, panneau technique), `logic.ts` (moteur), `ai.ts`, `repo.ts` et `commits.ts` (dépôt inventé), un fichier par écran, `demo.css`.
- `scripts/capture-stage.mjs` : captures de la galerie et vignette.
- Champ `detail.teammates` du schéma : liste de coéquipiers, un bouton chacun.

## Limites affichées (volontairement simples)

- Le modèle local est volontairement léger : ses réponses restent simples.
- L'assistant ne s'appuie que sur les documents de la mission.
- Sous Docker Compose, chaque service tourne en une seule instance.

## À confirmer par Zakaria

- Les textes des encadrés « Problème », « Ce que ça fait » et « Mon rôle ».
- Les choix techniques et les pistes affichés sur la page Architecture.
