# Spec projet : Home Energy Tracker

> Statut : **implémenté le 2026-11-04** (maquette validée par Zakaria le même jour).
> Dépôt source : https://github.com/ZakariaElAoufir/Microservice-Home-Energy-Tracker (public).

## Le projet réel

Backend de **7 microservices Spring Boot** (Java 21), sans interface web : api-gateway :9000 (Spring Cloud Gateway MVC,
JWT Keycloak, circuit breaker Resilience4j), user-service :8080 (seuils, Flyway), device-service :8081, ingestion-service :8082
(+ simulateur : 1 000 relevés / 5 s, 10 threads, deviceId aléatoire dans [1, 200), énergie dans [0, 2]), usage-service :8083
(Kafka `energy-usage` → InfluxDB ; toutes les 10 s, somme de la dernière heure par appareil, propriétaire via device-service,
seuil via user-service, événement `energy-alerts` si dépassement), alert-service :8084 (e-mail via Mailpit),
insight-service :8085 (Spring AI + Ollama `deepseek-coder`). Infra Docker Compose : MySQL, Kafka (KRaft) + Kafka UI, InfluxDB,
Mailpit, Keycloak, Prometheus, Grafana (tableau de bord « Home Energy Tracker - Overview » provisionné).
Le README indique : « Projet inspiré de la problématique présentée par LeetJourney » → section **Origine** sur la page architecture.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/home-energy-tracker/` | En-tête, 3 encadrés, bandeau « Simulation », démo |
| `/projets/home-energy-tracker/architecture/` | Menu latéral : vue d'ensemble (16 blocs, 19 flèches), stack, parcours d'un relevé, requête sécurisée, modèle de données, choix, limites et suites, origine |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
Fenêtre de navigateur avec 4 onglets, les outils réels du projet, branchés sur un pipeline rejoué dans le navigateur
(`demo/logic.ts`, règles copiées du code, testées dans `tests/het-demo.test.ts`) :
1. **API · gateway :9000** (look Swagger UI) : 8 routes, « Try it out » / « Execute », curl, réponse. **401 sans jeton** ; « Authorize » + « Obtenir un jeton Keycloak ». `PUT /api/v1/user/1` modifie le seuil du scénario ; `POST /api/v1/ingestion` ajoute un relevé ; les conseils de l'IA sont **préenregistrés** (anglais, comme le prompt du projet).
2. **Kafka UI** : topics `energy-usage` / `energy-alerts` (compteurs, messages en direct), groupes de consommateurs.
3. **Mailpit** : e-mails d'alerte au texte exact d'`AlertService` (« Energy Usage Alert for User 1 », Alert / Threshold / Energy Consumed).
4. **Grafana** : les 8 panneaux du vrai tableau de bord, alimentés par le trafic simulé (y compris les 401 de l'onglet API).

Scénario au-dessus de la fenêtre : lancer/arrêter le simulateur, seuil de l'utilisateur 1, alertes activées.
« Sous le capot » : 7 étapes avec compteurs et résultat du dernier passage d'agrégation.
Comme dans le code réel, une alerte repart **toutes les 10 s** tant que le seuil est dépassé (listé dans les limites).

### Mobile (< 1024 px)
Pas de code de démo téléchargé : 3 captures annotées (réponse de l'API, Grafana, e-mail d'alerte) + « Copier le lien ».

## Fichiers

```
src/projects/home-energy-tracker/
  project.json, architecture.json (avec "credits"), fr.md / en.md
  demo/Demo.astro, HetDemo.tsx, demo.css, strings.ts, logic.ts
  diagrams/{releve,securite,donnees}.{fr,en}.mmd + .svg
  media/thumbnail.png (Grafana), shot-api.png, shot-grafana.png, shot-mail.png
```
Captures : dev server lancé, `npm i --no-save puppeteer-core@23 && node scripts/capture-het.mjs`, puis copier `.captures/het/*.png` dans `media/`.

## Rôle
Confirmé par Zakaria : toute l'application réalisée seul, à partir d'une problématique inspirée de LeetJourney.

## Remarque
- L'onglet API présente toutes les routes ; dans le vrai projet, le Swagger de la gateway ne documente que user-service (indiqué dans les limites).
