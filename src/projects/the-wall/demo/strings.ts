// Portfolio-side texts around the demo. The app's own screens keep the words written in the Flutter code.
export const strings = {
  fr: {
    title: 'Deux émulateurs Android, un projet Supabase',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    scenario: 'Scénario',
    hint: ['Nora', ' et ', 'Samir', ' ne sont pas encore amis. Faites-les s’ajouter, puis s’écrire. Appui long (ou clic droit) sur un de vos messages pour le modifier ou le supprimer.'],
    reset: 'Recommencer',
    phoneOf: 'Téléphone de',
    follow: 'Suivre les requêtes',
    logTitle: "Requêtes envoyées par l'application",
    tryTitle: 'À essayer',
    tryLead: "Ma partie de l'application, étape par étape. Chaque case se coche quand vous l'avez faite, sur l'un ou l'autre téléphone.",
    steps: {
      request: ["Demande d'ami", 'Add Friends, puis Follow. Un doublon est impossible : le bouton passe à « En attente ».'],
      accept: ['Accepter', "Cloche, puis la coche verte. L'amitié est écrite dans les deux sens dans friends."],
      text: ['Écrire', "Message, choisir l'ami, envoyer un texte. Il est inséré dans messages."],
      image: ['Envoyer une image', "L'icône image ouvre la galerie ; le fichier part dans le bucket chat-pictures."],
      seen: ['Lu', "Ouvrir la conversation de l'autre côté : ses messages passent à seen, les coches deviennent bleues."],
      edit: ['Modifier, supprimer', 'Appui long sur un de ses messages : modifier le texte ou le supprimer.']
    },
    note: ['Comme dans l’application, ', 'le fil et le profil sont en temps réel', ' (flux Supabase), alors que ', 'la liste des conversations et la conversation se rechargent', ' à l’ouverture, après un envoi et au retour d’une conversation.'],
    signOut: 'Se déconnecter',
    back: 'Retour',
    like: "J'aime",
    requests: "Demandes d'amis",
    accept: 'Accepter',
    reject: 'Refuser',
    pickImage: 'Choisir une image',
    removeImage: "Retirer l'image",
    send: 'Envoyer',
    photos: 'Photos'
  },
  en: {
    title: 'Two Android emulators, one Supabase project',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    scenario: 'Scenario',
    hint: ['Nora', ' and ', 'Samir', ' are not friends yet. Have them add each other, then write. Long press (or right click) one of your messages to edit or delete it.'],
    reset: 'Start over',
    phoneOf: 'Phone of',
    follow: 'Follow the requests',
    logTitle: 'Requests sent by the app',
    tryTitle: 'Things to try',
    tryLead: 'My part of the app, step by step. Each box ticks itself once you have done it, on either phone.',
    steps: {
      request: ['Friend request', 'Add Friends, then Follow. No duplicate is possible: the button turns to "En attente" (pending).'],
      accept: ['Accept', 'Bell, then the green tick. The friendship is written both ways in friends.'],
      text: ['Write', 'Message, pick the friend, send a text. It is inserted into messages.'],
      image: ['Send a picture', 'The picture icon opens the gallery; the file goes to the chat-pictures bucket.'],
      seen: ['Read', 'Open the conversation on the other side: its messages turn seen, the ticks go blue.'],
      edit: ['Edit, delete', 'Long press one of your messages: edit its text or delete it.']
    },
    note: ['As in the app, ', 'the feed and the profile are live', ' (Supabase streams), while ', 'the conversation list and the conversation reload', ' when opened, after sending and when coming back from a conversation.'],
    signOut: 'Sign out',
    back: 'Back',
    like: 'Like',
    requests: 'Friend requests',
    accept: 'Accept',
    reject: 'Reject',
    pickImage: 'Pick a picture',
    removeImage: 'Remove the picture',
    send: 'Send',
    photos: 'Photos'
  }
};
export type DemoStrings = typeof strings.fr;
