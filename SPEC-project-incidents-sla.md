# Spec projet : gestion centralisée des incidents et suivi des SLA

> Statut : **implémenté le 2026-11-08**, directement dans Astro, en trois phases relues une à une.
> Dépôts sources : privés (DXC Technology, stage 2025). Le portfolio affiche « Dépôt privé, démo reconstituée » et ne copie aucun code source.

## Le projet réel

Application web réalisée à trois, en Agile Scrum, pendant le stage DXC de 2025. Le code final se trouve sur `main` de `SpringBoot-Backend` et sur la branche `younes` de `Incident-App-DXC-Front` (la branche `main` du frontend n'est qu'un squelette).

- **Frontend** : Angular 20.
- **Backend** : Java 21, Spring Boot 3.5, Spring Security (JWT, BCrypt), Spring Data JPA, MySQL.

### Répartition du travail

| Personne | Partie |
|---|---|
| Zakaria El Aoufir | Espace technicien : écrans Angular, `TechnicienController`, `TechnicienServiceImpl`, requêtes de filtrage |
| [Younes9976](https://github.com/Younes9976) | Espace administrateur |
| [hslimi212](https://github.com/hslimi212) | Espace client |

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/incidents-sla/` | En-tête, 3 encadrés avec boutons vers les GitHub des coéquipiers, démo sur ordinateur, galerie sur téléphone |
| `/projets/incidents-sla/architecture/` | Vue d'ensemble avec « Ma partie » surlignée, stack, 2 diagrammes, 6 choix techniques, limites et pistes |

### La démo

L'espace technicien dans un navigateur (nom « Predict SLA » et logo inventé, à la place de celui de DXC), à côté le trajet de chaque requête et les tables MySQL. Toutes les données sont inventées. Les écrans reprennent le design du frontend réel avec du code réécrit en React.

| Compte | Parcours |
|---|---|
| Amine (`amine.tazi`) | Dashboard, My Tickets, My Group, détail d'un ticket, prise en charge, statut, priorité, résolution, escalade |
| Salma (`salma.idrissi`) | Même équipe : refus sur un ticket assigné à une autre personne |
| Admin (`admin.demo`) | Message « réalisée par Younes9976 » et bouton vers son GitHub |
| Client (`atlas.client`) | Message « réalisée par hslimi212 » et bouton vers son GitHub |

Une barre « Horloge » avance le temps (+30 min, +2 h) et lance la vérification SLA.

**Règles reprises du code réel** (`demo/logic.ts`, tests dans `tests/incidents-demo.test.ts`) :

- rôle contrôlé sur `/api/techniciens/**`, technicien déduit du JWT ;
- échéance selon la priorité : 2 h, 8 h, 24 h, 48 h ;
- assignation : même équipe et ticket pas encore assigné ; historique et alerte à l'administrateur ;
- statut, priorité, résolution et escalade réservés au technicien assigné ; un refus répond 500, comme une `RuntimeException` non gérée ;
- seuils de `SlaAlertServiceImpl` : passé, moins de 30 min, moins de 2 h.

**Écarts volontaires avec l'application réelle** (repris dans « Limites et suites ») :

- les tris par date et par SLA fonctionnent (le frontend envoyait `asc`, le backend attendait `ASC`) et les libellés de date sont remis à l'endroit ;
- le SLA passe à `RESPECTE` à la résolution (la valeur existait sans être jamais écrite) ;
- la vérification SLA est lancée à la main : `@EnableScheduling` n'est présent sur aucune branche ;
- un message s'affiche si la connexion échoue.

## Fichiers

- `src/projects/incidents-sla/` : `project.json`, `architecture.json`, `fr.md` et `en.md` (texte du CV, inchangé), `demo/`, `diagrams/`, `media/`.
- `tests/incidents-demo.test.ts` : règles du moteur.
- `scripts/capture-incidents.mjs` : galerie et vignette.
- Les diagrammes `.svg` sont générés depuis les `.mmd` et commités.
