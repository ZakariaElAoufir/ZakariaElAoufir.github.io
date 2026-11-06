// Portfolio-side texts around the demo, and the notices that speak to the visitor. The platform's own screens stay in French, as in the app.
export const strings = {
  fr: {
    title: 'e-Stage, la plateforme de suivi des stagiaires',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    scenario: 'Scénario',
    hint: ['Connectez-vous en ', 'Sara', ' pour choisir un sujet puis rejoindre une équipe, ou en ', 'Yassine', ' pour ouvrir directement une équipe active et son dépôt GitHub. Le mot de passe est rempli pour vous.'],
    accounts: 'Comptes',
    reset: 'Recommencer',
    back: 'Précédent',
    reload: 'Recharger',
    trace: 'Trajet des requêtes',
    tables: 'PostgreSQL',
    follow: 'Suivre les écritures',
    noTrace: 'Aucune requête pour l’instant : connectez-vous.',
    nodes: { browser: 'Navigateur', nginx: 'Nginx', gateway: 'API Gateway', auth: 'auth-service', face: 'Visage', internship: 'intership-service', github: 'GitHub', postgres: 'PostgreSQL' },
    tryTitle: 'À essayer',
    tryLead: 'Chaque case se coche quand vous l’avez faite. Le panneau de droite montre le trajet de chaque requête et les lignes écrites en base.',
    steps: {
      login: ['Se connecter', 'auth-service vérifie le mot de passe et signe un JWT que la gateway contrôle ensuite à chaque appel.'],
      face: ['Essayer le visage', 'Connexion faciale simulée : aucune caméra n’est activée. Ce module est le travail de Redouane.'],
      join: ['Rejoindre une équipe', 'En Sara : sujet, équipe, poste, confirmation. Le service vérifie qu’une place est libre sur ce poste.'],
      role: ['Changer de poste', 'Dans « Postes » : une place se libère, une autre se prend, et l’historique de l’équipe s’écrit.'],
      github: ['Parcourir le dépôt', 'Branches, commits, fichiers et identités Git d’un dépôt entièrement inventé.'],
      skills: ['Lire les compétences', 'L’arbre relie chaque membre à ses missions validées et aux compétences qu’elles ont apportées.']
    },
    note: ['Toutes les données de cette démo sont inventées : ', 'personnes, sujets, missions et dépôt', '. Le logo aussi : il remplace celui de l’entreprise.'],
    credit: {
      owner: 'Cette partie appartient à',
      demo: 'Le projet a été réalisé à trois et cette démo montre ma partie. Ce module n’y est pas reconstitué : il s’agit seulement d’une démo.',
      github: 'Voir son GitHub',
      backTo: 'Retour'
    },
    contact: {
      title: 'Cette partie est la mienne',
      text: 'Je l’ai réalisée sur la plateforme, mais elle n’est pas reconstituée dans cette démo. Pour la voir, contactez-moi.',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      mail: 'E-mail',
      backTo: 'Retour'
    },
    later: {
      title: 'Bientôt dans la démo',
      text: 'Cet écran arrive à la prochaine étape de la reconstitution.'
    },
    faceCredit: 'La reconnaissance faciale est le travail de Redouane Boulhimez.',
    faceNote: 'Démo : aucune caméra n’est activée, l’analyse est une animation.',
    mockAction: 'Dans la plateforme, ce bouton passe par la GitHub App. Ici, le dépôt est simulé.'
  },
  en: {
    title: 'e-Stage, the intern tracking platform',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    scenario: 'Scenario',
    hint: ['Sign in as ', 'Sara', ' to choose a subject and join a team, or as ', 'Yassine', ' to open an active team and its GitHub repository straight away. The password is filled in for you.'],
    accounts: 'Accounts',
    reset: 'Start over',
    back: 'Back',
    reload: 'Reload',
    trace: 'Request journey',
    tables: 'PostgreSQL',
    follow: 'Follow the writes',
    noTrace: 'No request yet: sign in.',
    nodes: { browser: 'Browser', nginx: 'Nginx', gateway: 'API Gateway', auth: 'auth-service', face: 'Face', internship: 'intership-service', github: 'GitHub', postgres: 'PostgreSQL' },
    tryTitle: 'Things to try',
    tryLead: 'Each box ticks itself once you have done it. The right-hand panel shows the journey of every request and the rows written to the database.',
    steps: {
      login: ['Sign in', 'auth-service checks the password and signs a JWT that the gateway then verifies on every call.'],
      face: ['Try the face login', 'Simulated face login: no camera is turned on. This module is Redouane’s work.'],
      join: ['Join a team', 'As Sara: subject, team, position, confirmation. The service checks that a seat is free on that position.'],
      role: ['Change position', 'Under "Postes": one seat is freed, another is taken, and the team history is written.'],
      github: ['Browse the repository', 'Branches, commits, files and Git identities of an entirely invented repository.'],
      skills: ['Read the skills', 'The tree links each member to their validated missions and the skills those missions brought.']
    },
    note: ['All the data in this demo is invented: ', 'people, subjects, missions and repository', '. So is the logo: it replaces the company’s.'],
    credit: {
      owner: 'This part belongs to',
      demo: 'The project was built by three people and this demo shows my part. This module is not rebuilt here: this is only a demo.',
      github: 'See their GitHub',
      backTo: 'Back'
    },
    contact: {
      title: 'This part is mine',
      text: 'I built it on the platform, but it is not rebuilt in this demo. To see it, get in touch.',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      mail: 'Email',
      backTo: 'Back'
    },
    later: {
      title: 'Coming to the demo',
      text: 'This screen arrives at the next stage of the rebuild.'
    },
    faceCredit: 'Face recognition is the work of Redouane Boulhimez.',
    faceNote: 'Demo: no camera is turned on, the analysis is an animation.',
    mockAction: 'On the platform, this button goes through the GitHub App. Here, the repository is simulated.'
  }
};
export type DemoStrings = typeof strings.fr;
