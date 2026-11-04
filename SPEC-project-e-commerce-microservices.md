# Spec projet : plateforme e-commerce microservices (MCommerce)

> Statut : **implémenté le 2026-11-04**, directement dans Astro (plus de maquette HTML depuis ce projet).
> Dépôt source : https://github.com/ZakariaElAoufir/MCommerce (public ; le portfolio le donnait à tort comme privé).

## Le projet réel

Boutique de guitares **« Guitara »** : frontend **Angular** servi par **Nginx** (`/api` et `/uploads` proxifiés vers la gateway),
**6 applications Spring** (Java 21) lancées par **Docker Compose** :
- `config.server` :8888 (profil native, dossier `config-repo/` monté), `eureka.server` :8761 ;
- `api.gateway` :9000 (WebFlux) : `JwtAuthenticationFilter` (JWT HS256, secret partagé). Sans jeton, la requête passe telle quelle ;
  un jeton invalide donne 401 ; `/admin` sans rôle ADMIN donne 403. Sinon la gateway ajoute `X-User-Id`, `X-User-Role` et `X-Username`.
  `SecurityConfig` laisse publics `/auth`, `/products`, `/uploads` ;
- `auth-service` :8084 (`auth_db.users`, BCrypt, admin créé au démarrage : admin / admin123) ;
- `product-service` :8081 (`product_db.products`) : recherche par nom, tri par prix, pagination ;
  images dans le volume `product-uploads` ; suppression logique ; écriture si `X-User-Role` vaut ADMIN ;
- `cart-service` :8082 (`cart_db.carts`, `cart_items`), qui appelle product-service par OpenFeign ;
- `payment-service` :8083 (`payment_db.payment_transactions`), qui relit et vide le panier par OpenFeign.
  `simulatePayment` réussit si le total est supérieur à 0.

Un seul conteneur PostgreSQL, une base par service. Les 4 commits du dépôt sont de Zakaria.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/e-commerce-microservices/` | En-tête, 3 encadrés, démo |
| `/projets/e-commerce-microservices/architecture/` | Vue d'ensemble (13 blocs, cadre PostgreSQL), stack, parcours d'un paiement, contrôle d'accès, modèle de données, choix, limites |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
- **À gauche**, un navigateur sur `localhost:4200` qui reproduit toutes les pages Angular avec leurs textes et leur CSS :
  connexion, inscription, catalogue, fiche produit et suggestions, panier, paiement (carte animée), profil et historique,
  admin (produits avec modales, utilisateurs, paiements filtrés).
  - La barre d'adresse se modifie : `/admin/users` en client renvoie 403.
  - Les `alert` et `confirm` du navigateur sont imités.
- **À droite**, deux onglets :
  - « Trajet des requêtes » : chaque appel passe par Nginx, la gateway (JWT, en-têtes), Eureka, le service, OpenFeign et le SQL, puis le statut HTTP ;
  - « PostgreSQL » : les 5 tables des 4 bases, avec les lignes écrites ou supprimées mises en surbrillance.
- Règles copiées du code dans `demo/logic.ts`, testées dans `tests/ecommerce-demo.test.ts`. Le faux en-tête ADMIN envoyé sans jeton passe, comme dans le vrai projet.
- **Données d'exemple** : le dépôt n'en contient pas. Catalogue de 10 guitares (noms, prix en DH, descriptions), comptes yassine et salma, 3 paiements.
  - Seule la photo `guitare.jpg` vient du dépôt (avec `hero.jpg` et `login-bg.jpg`) ; les autres guitares sont dessinées en SVG (`demo/guitars.ts`).
- Écart volontaire : dans les cartes admin, l'image est en `contain` au lieu de `cover`, sinon une guitare dessinée debout serait réduite à son manche.

### Mobile (< 1024 px)
3 captures (catalogue, trajet du paiement, admin) et « Copier le lien ».

## Fichiers

```
src/projects/e-commerce-microservices/
  project.json, architecture.json (nodeWidth 236), fr.md / en.md
  demo/Demo.astro, ShopDemo.tsx, demo.css, strings.ts, logic.ts, guitars.ts
  diagrams/{paiement,securite,donnees}.{fr,en}.mmd + .svg
  media/hero.jpg, login-bg.jpg, guitare.jpg (du dépôt, redimensionnées), thumbnail.png, shot-shop.png, shot-trace.png, shot-admin.png
```
Captures : lancer le serveur de dev, puis `npm i --no-save puppeteer-core@23 && node scripts/capture-ecommerce.mjs`. Copier ensuite `.captures/ecommerce/*.png` dans `media/`.
Nouveau champ générique : `overview.nodeWidth` (200 par défaut) dans `architecture.json`.

## À confirmer par Zakaria
- « Mon rôle » : rédigé comme un travail seul (toute la plateforme). Le Config Server pointe hors Docker vers `github.com/ZedKaS/config-repo` : s'agit-il d'un binôme ?
- Le catalogue d'exemple (noms, prix, descriptions) est inventé pour la démo.
