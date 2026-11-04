# Spec projet : The Wall

> Statut : **implémenté le 2026-11-04** (maquette validée par Zakaria le même jour).
> Dépôt source : https://github.com/ZakariaElAoufir/TheWall_Flutter (public).

## Le projet réel

Réseau social mobile **Flutter + Supabase**, projet académique en binôme. 8 écrans : connexion, inscription, fil,
profil, messages, conversation, ajout d'amis, demandes d'amis.
- **Ma partie** : messagerie (conversations, texte et images via `image_picker` vers le bucket `chat-pictures`,
  accusés de lecture `seen`, modifier / supprimer un message) et amis (recherche, `follow_requests`, accepter / refuser).
- **Partie du binôme** : authentification et fil (publications, likes). Le site ne le nomme pas (à confirmer).

Comportements reproduits tels quels :
- le fil et le profil sont des flux Supabase (temps réel) ; messages, conversation, ajout d'amis et demandes sont des
  `FutureBuilder` (chargés à l'ouverture) ;
- ouvrir une conversation : chargement, `update seen`, rechargement ;
- accepter une demande la supprime puis insère l'amitié dans les deux sens dans `friends` ;
- un like par utilisateur, puis `rpc update_publication_likes` ;
- supprimer un message laisse son image dans le bucket.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/the-wall/` | En-tête, 3 encadrés, démo |
| `/projets/the-wall/architecture/` | Menu latéral : vue d'ensemble (cadre PostgreSQL, blocs « Ma partie » en légende), stack, envoi d'un message, demande d'ami, modèle de données, choix, limites |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
Deux émulateurs Android (Nora et Samir) et un panneau Supabase (Table Editor : chips par table, lignes nouvelles ou
supprimées en surbrillance ; journal des requêtes envoyées par l'application). Le monde est construit après le montage
(uuids, horloge) pour éviter un écart d'hydratation ; le serveur rend un emplacement de 856 px.
Étapes à cocher : demande d'ami, accepter, écrire, envoyer une image, lu, modifier / supprimer (appui long ou clic droit).
Règles dans `demo/logic.ts`, testées dans `tests/thewall-demo.test.ts`.

### Mobile (< 1024 px)
Pas de code de démo téléchargé : 3 captures (demandes d'amis, conversation, panneau Supabase).

## Fichiers

```
src/projects/the-wall/
  project.json, architecture.json, fr.md / en.md
  demo/Demo.astro, TheWallDemo.tsx, demo.css, strings.ts, logic.ts
  diagrams/{message,amis,donnees}.{fr,en}.mmd + .svg
  media/wall.jpg, sigma.png (images de l'app), thumbnail.png, shot-requests.png, shot-chat.png, shot-supabase.png
```
Captures : dev server lancé, `npm i --no-save puppeteer-core@23 && node scripts/capture-thewall.mjs`, puis copier
`.captures/thewall/*.png` dans `media/`.

## Binôme
Othmane Al Amrani, nommé dans « Mon rôle » avec un bouton vers son GitHub (https://github.com/othmanealpro-crypto),
champ `detail.teammate` de `project.json`.
