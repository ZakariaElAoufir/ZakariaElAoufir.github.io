# Spec projet : Koursero, plateforme de vente de formations

> Statut : **implémenté le 2026-11-05**, directement dans Astro.
> Dépôt source : https://github.com/ZakariaElAoufir/Koursero (public ; le portfolio n'avait pas encore de lien).

## Le projet réel

Site **Django 5.0** de vente de formations, réalisé pour le PFA. Le pied de page du site indique « Zakaria El Aoufir - Walid El Hatimi 2024 ».
Il utilise SQLite, des templates Bootstrap 5 (thème Start Bootstrap « Shop Homepage ») et jQuery pour l'AJAX du panier. Il comporte deux applications :
- `store` :
  - accueil (catalogue), fiche d'une formation, recherche par titre (POST), page « À propos » (texte de remplissage) ;
  - inscription avec les validateurs de mot de passe de Django, puis redirection vers `update_info` ;
  - connexion et déconnexion ; modification du compte, du profil (téléphone, ville, pays) et du mot de passe.
    Après un changement de mot de passe, l'utilisateur est déconnecté (pas de `update_session_auth_hash`).
  - Le profil est créé par un signal `post_save`.
- `cart` :
  - la classe `Cart` garde un dict `{id: prix}` dans `request.session['session_key']`, une formation une seule fois ;
  - un context processor affiche le compteur dans la barre de navigation ;
  - ajout et suppression en AJAX, puis `location.reload()` ;
  - pour un utilisateur connecté, chaque modification recopie le panier dans `Profile.old_cart` (`str(dict)` avec des guillemets doubles) ;
  - à la connexion, `db_add` fusionne ce panier enregistré dans la session.
- **Admin Django** : Client, Formateur, Formation, Reservation, Profile, User avec un Profile en ligne.
- Il n'y a pas de paiement, et les réservations n'existent que dans le modèle.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/vente-formations/` | En-tête (badge binôme), 3 encadrés, démo |
| `/projets/vente-formations/architecture/` | Vue d'ensemble (cadre « Serveur Django »), stack, ajout au panier, retour du panier à la connexion, modèle de données, choix, limites |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
- **À gauche**, un navigateur sur `127.0.0.1:8000`. Chaque clic devient une requête à un petit serveur Django rejoué (`demo/logic.ts`), qui exécute la vue et suit les redirections.
  - Toutes les pages du site sont reproduites, avec les messages Django (alertes).
  - Les pages de debug de Django apparaissent aussi : 404 pour une URL inconnue, `DoesNotExist` pour `/formation/99`.
  - L'admin Django est reproduit : connexion réservée au staff, index, liste des formations, ajout, modification, suppression.
- **À droite**, trois onglets :
  - `runserver` : les lignes du serveur ; un clic montre le SQL de l'ORM pour la requête choisie ;
  - « Session » : cookie, `session_data` décodée, panier en session et `old_cart` ;
  - « SQLite » : les tables, avec les lignes écrites ou supprimées en surbrillance.
- Le panier garde l'ordre d'insertion des dict Python, ce qui se voit dans l'affichage et dans le total en flottant (`1589.6599999999999`).
- Tests : `tests/koursero-demo.test.ts`.
- **Données** :
  - Le catalogue, ses 8 images et le formateur « Hamza » viennent de la base `db.sqlite3` du dépôt.
  - Les comptes de cette base sont de vraies personnes : ils ne sont **pas** repris. Les comptes de démo sont yassine, salma et admin, inventés.

### Mobile (< 1024 px)
3 captures (catalogue, panier avec la session, admin).

## Fichiers

```
src/projects/vente-formations/
  project.json (pair: true), architecture.json, fr.md / en.md
  demo/Demo.astro, KourseroDemo.tsx, demo.css, strings.ts, logic.ts
  diagrams/{panier,connexion,donnees}.{fr,en}.mmd + .svg
  media/logo.png, formations/1-8.jpg (du dépôt, redimensionnées), thumbnail.png, shot-shop.png, shot-cart.png, shot-admin.png
```
Captures : lancer le serveur de dev, puis `npm i --no-save puppeteer-core@23 && node scripts/capture-koursero.mjs [port]`. Copier ensuite `.captures/koursero/*.png` dans `media/`.

## Limites affichées (volontairement simples)
Pas de paiement, réservations non créées depuis le site, prix barré et badge « Sale » du gabarit, page « À propos » avec un texte de remplissage.

## À confirmer par Zakaria
- **Le binôme :** Walid El Hatimi (cité dans le pied de page du site). Faut-il un bouton vers son GitHub, comme pour The Wall, et quelle a été la répartition du travail ?
- **Le titre :** « Koursero, plateforme de vente de formations ». La période reste 2023 – 2024.
