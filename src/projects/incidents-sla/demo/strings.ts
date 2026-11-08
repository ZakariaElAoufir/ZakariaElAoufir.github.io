// Portfolio-side texts around the demo. The application's own screens stay as they are in the app, in English and French.
export const strings = {
  fr: {
    title: 'Predict SLA, l’espace technicien',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    scenario: 'Scénario',
    hint: ['Connectez-vous en ', 'Amine', ' pour traiter vos tickets, ou en ', 'Admin', ' et ', 'Client', ' pour voir qui a réalisé ces espaces. Le mot de passe est rempli pour vous.'],
    accounts: 'Comptes',
    reset: 'Recommencer',
    back: 'Précédent',
    reload: 'Recharger',
    trace: 'Trajet des requêtes',
    tables: 'MySQL',
    follow: 'Suivre les écritures',
    noTrace: 'Aucune requête pour l’instant : connectez-vous.',
    nodes: { browser: 'Navigateur', proxy: 'Proxy Angular', security: 'Spring Security', controller: 'Contrôleur', service: 'Service', mysql: 'MySQL' },
    tryTitle: 'À essayer',
    tryLead: 'Chaque case se coche quand vous l’avez faite. Le panneau de droite montre le trajet de chaque requête et les tables MySQL.',
    steps: {
      login: ['Se connecter', 'Le backend vérifie le mot de passe, signe un JWT et Angular redirige selon le rôle.'],
      filter: ['Filtrer ou chercher', 'Dans My Tickets ou My Group : statut, priorité, tri par date ou par échéance, recherche par titre avec la touche Entrée.'],
      group: ['Voir les tickets du groupe', 'My Group liste les tickets de l’équipe du technicien connecté, assignés ou non.']
    },
    note: ['Toutes les données de cette démo sont inventées : ', 'personnes, équipes et tickets', '. Le logo aussi : il remplace celui de l’entreprise.'],
    credit: {
      owner: 'Cette partie a été réalisée par',
      demo: 'Le projet a été réalisé à trois et cette démo montre ma partie, l’espace technicien. Ce module n’y est pas reconstitué.',
      github: 'Voir son GitHub',
      logout: 'Se déconnecter',
      modules: { admin: 'Espace administrateur', client: 'Espace client' }
    },
    later: { title: 'Écran de la phase suivante', text: 'Le détail d’un ticket arrive à la prochaine étape de la reconstruction.', back: 'Retour' }
  },
  en: {
    title: 'Predict SLA, the technician area',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    scenario: 'Scenario',
    hint: ['Sign in as ', 'Amine', ' to work on your tickets, or as ', 'Admin', ' and ', 'Client', ' to see who built those areas. The password is filled in for you.'],
    accounts: 'Accounts',
    reset: 'Start over',
    back: 'Back',
    reload: 'Reload',
    trace: 'Request journey',
    tables: 'MySQL',
    follow: 'Follow writes',
    noTrace: 'No request yet: sign in.',
    nodes: { browser: 'Browser', proxy: 'Angular proxy', security: 'Spring Security', controller: 'Controller', service: 'Service', mysql: 'MySQL' },
    tryTitle: 'Things to try',
    tryLead: 'Each box ticks itself once you have done it. The right-hand panel shows the journey of each request and the MySQL tables.',
    steps: {
      login: ['Sign in', 'The backend checks the password and signs a JWT, then Angular redirects according to the role.'],
      filter: ['Filter or search', 'In My Tickets or My Group: status, priority, sort by date or deadline, search by title with the Enter key.'],
      group: ['See the group’s tickets', 'My Group lists the tickets of the signed-in technician’s team, assigned or not.']
    },
    note: ['All the data in this demo is invented: ', 'people, teams and tickets', '. So is the logo, which replaces the company’s.'],
    credit: {
      owner: 'This part was built by',
      demo: 'The project was built by three people and this demo shows my part, the technician area. This module is not rebuilt here.',
      github: 'See their GitHub',
      logout: 'Sign out',
      modules: { admin: 'Administrator area', client: 'Client area' }
    },
    later: { title: 'Screen of the next phase', text: 'The ticket detail comes with the next step of the rebuild.', back: 'Back' }
  }
};
export type DemoStrings = typeof strings.fr;
