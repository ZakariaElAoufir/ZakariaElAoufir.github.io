# Spec projet : application de rendez-vous hospitaliers (MEDIGOO)

> Statut : **implémenté le 2026-11-04**, directement dans Astro.
> Dépôt source : https://github.com/ZakariaElAoufir/AndroidStudioProject (public).

## Le projet réel

Application Android native en **Java** (minSdk 21, targetSdk 35), nommée « MEDIGOO » à l'écran, avec **Room** (SQLite) : tout est
stocké sur l'appareil (`hospital_database2`). Elle compte 17 activités pour trois rôles, dans une seule table `Utilisateur` :
- **Patient** : réserve un créneau libre avec un motif facultatif. `CreneauDisponibleAdapter` relit le créneau, puis écrit dans une
  transaction le rendez-vous (statut `confirmé`) et le passage du créneau à `disponible = 0`. Il consulte aussi l'historique,
  les notifications (badge LiveData des non lues, toucher une notification la marque lue) et son profil.
- **Médecin** : gère ses créneaux (un créneau réservé ne peut pas être supprimé), change le statut de ses rendez-vous et envoie un
  **rappel** au patient (une ligne dans `notifications` et une notification Android ; la permission POST_NOTIFICATIONS est
  demandée la première fois, sans envoyer de notification ce coup-là).
- **Admin** : liste, ajoute, modifie et supprime les utilisateurs. Le compte admin@hospital.com / admin123 est créé au premier lancement.
  Les clés étrangères suppriment en cascade.
- La session (`UserSession`) est un singleton en mémoire.
- Une inscription avec un e-mail déjà pris viole l'index unique dans un thread de fond : l'application s'arrête.

## Ce que montre le portfolio

| Page | Contenu |
|---|---|
| `/projets/rendez-vous-hospitaliers/` | En-tête, 3 encadrés, démo |
| `/projets/rendez-vous-hospitaliers/architecture/` | Vue d'ensemble (cadre « Téléphone Android »), stack, réservation, rappel, modèle de données, choix, limites |

### Démo (PC ≥ 1024 px, îlot React `client:media`)
- **Un seul émulateur**, Room étant local : patient, médecin et admin se connectent à tour de rôle.
  - Des boutons au-dessus du téléphone déconnectent l'utilisateur et remplissent le formulaire de connexion du compte choisi.
  - Tous les écrans des trois rôles sont reproduits avec leurs textes. Une pile d'activités gère Retour, Accueil et l'écran d'accueil d'Android.
  - Sont imités aussi : les toasts, les AlertDialog, la demande de permission, la notification en haut de l'écran (heads-up) et la fenêtre « s'est arrêté ».
- **À côté, le Database Inspector d'Android Studio** : les 5 tables, avec les lignes écrites ou supprimées en surbrillance.
  En dessous, le journal des appels DAO avec leur SQL et les valeurs liées.
- Règles copiées du code dans `demo/logic.ts`, testées dans `tests/hospital-demo.test.ts`.
- **Données d'exemple** : le dépôt n'en contient pas, sauf le compte admin.
  - Médecins : Karim Benali (cardiologie), Nadia El Fassi (pédiatrie).
  - Patients : Sara Alaoui, Omar Tazi.
  - 6 créneaux et 2 rendez-vous.
  - Image de fond : `backgroung.jpg` du dépôt, redimensionnée en `media/corridor.jpg`.

### Mobile (< 1024 px)
3 captures (réservation, rappel côté médecin, Database Inspector).

## Fichiers

```
src/projects/rendez-vous-hospitaliers/
  project.json, architecture.json (nodeWidth 220), fr.md / en.md
  demo/Demo.astro, MedigooDemo.tsx, demo.css, strings.ts, logic.ts
  diagrams/{reservation,rappel,donnees}.{fr,en}.mmd + .svg
  media/corridor.jpg, thumbnail.png, shot-patient.png, shot-doctor.png, shot-inspector.png
```
Captures : lancer le serveur de dev, puis `npm i --no-save puppeteer-core@23 && node scripts/capture-hospital.mjs`. Copier ensuite `.captures/hospital/*.png` dans `media/`.

## Limites affichées (choisies volontairement simples, à la demande de Zakaria)
Données seulement sur l'appareil, rappels manuels, dates saisies au clavier, notes de consultation sans écran.

## À confirmer par Zakaria
- « Mon rôle » est rédigé comme un travail seul. Le premier commit du dépôt vient du compte `ZedKaS` (le même apparaît dans MCommerce) : est-ce ton second compte ?
- Les noms des médecins et des patients sont inventés pour la démo.
