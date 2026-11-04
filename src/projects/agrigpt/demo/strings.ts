// Portfolio-side texts around the demo. The application itself stays in French, as it really is.
export const strings = {
  fr: {
    suggestions: 'Questions préenregistrées',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    unknown: 'Démo statique : cette question passe bien le filtre agricole, mais seules les questions préenregistrées ont une réponse. Choisissez-en une au-dessus.',
    closePreview: "Fermer l'aperçu",
    hoodTitle: 'Sous le capot',
    hoodIdle: "Envoyez une question : chaque étape que le vrai backend exécute s'affiche ici, avec les extraits retrouvés dans les PDF.",
    hoodAnswer: 'Extraits retrouvés par FAISS pour cette question (distance L2 : plus elle est petite, plus l’extrait est proche). Distances illustratives.',
    hoodRefusal: 'Question hors domaine : le filtre du backend répond seul.',
    steps: [
      ['Filtre agricole', 'Un mot-clé du domaine dans la question ?'],
      ['Embedding', 'La question devient un vecteur avec mxbai-embed-large.'],
      ['Recherche FAISS', 'Les 5 extraits les plus proches parmi 275 ; seuil de distance 190.'],
      ['Génération', 'llama3.2:3b répond à partir des seuls extraits.'],
      ['SQLite', 'Question, réponse et sources enregistrées.']
    ],
    keywordFound: 'Mot-clé trouvé :',
    refused: 'Aucun mot-clé agricole : la question est refusée, sans appel au modèle.',
    skipped: 'Étape sautée.',
    embedded: 'Question vectorisée par mxbai-embed-large (Ollama).',
    bestDistance: (d: number) => `Meilleure distance ${d}, sous le seuil 190 : on continue.`,
    prompt: (n: number) => `Prompt « Réponds uniquement à partir des informations ci-dessous » + ${n} extraits.`,
    saved: 'Sources retenues :',
    savedRefusal: 'Question et refus enregistrés, sans source.'
  },
  en: {
    suggestions: 'Pre-recorded questions',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    unknown: 'Static demo: this question passes the farming filter, but only the pre-recorded questions have an answer. Pick one above.',
    closePreview: 'Close the preview',
    hoodTitle: 'Under the hood',
    hoodIdle: 'Send a question: every step the real backend runs shows up here, with the excerpts found in the PDFs.',
    hoodAnswer: 'Excerpts FAISS found for this question (L2 distance: the smaller, the closer). Illustrative distances.',
    hoodRefusal: 'Off-topic question: the backend filter answers on its own.',
    steps: [
      ['Farming filter', 'Does the question contain a domain keyword?'],
      ['Embedding', 'The question becomes a vector with mxbai-embed-large.'],
      ['FAISS search', 'The 5 closest excerpts out of 275; distance threshold 190.'],
      ['Generation', 'llama3.2:3b answers from the excerpts only.'],
      ['SQLite', 'Question, answer and sources saved.']
    ],
    keywordFound: 'Keyword found:',
    refused: 'No farming keyword: the question is refused, without calling the model.',
    skipped: 'Step skipped.',
    embedded: 'Question turned into a vector by mxbai-embed-large (Ollama).',
    bestDistance: (d: number) => `Best distance ${d}, under the 190 threshold: carry on.`,
    prompt: (n: number) => `Prompt “Answer only from the information below” + ${n} excerpts.`,
    saved: 'Sources kept:',
    savedRefusal: 'Question and refusal saved, without source.'
  }
} as const;

export type DemoStrings = (typeof strings)['fr'] | (typeof strings)['en'];
