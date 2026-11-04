// The mocked AgriGPT backend: pre-recorded answers written from the project's real PDF excerpts,
// and the same domain filter as backend/rag.py. Nothing here calls a model or a server.

export type Chunk = { source: string; text: string; distance: number };
export type Answer = { question: string; paragraphs: string[]; sources: string[]; chunks: Chunk[]; offTopic: false };
export type Refusal = { question: string; offTopic: true };
export type Exchange = Answer | Refusal;
export type Conversation = { id: string; messages: Exchange[] };

/** The keyword filter of backend/rag.py, unchanged. */
export const KEYWORDS = ['agriculture', 'agricole', 'blé', 'orge', 'maïs', 'culture', 'cultures', 'irrigation', 'eau', 'sol',
  'fertilisation', 'engrais', 'semis', 'récolte', 'rendement', 'maladie', 'ravageur', 'pesticide', 'herbicide', 'désherbage',
  'phytosanitaire', 'rotation', 'semence', 'variété', 'élevage', 'bétail', 'fourrage', 'serre'];

/** The refusal text of backend/rag.py, unchanged. */
export const OFF_TOPIC = 'Je ne peux répondre qu’aux questions agricoles basées sur les documents fournis. Votre question semble hors du domaine agricole.';

/** FAISS threshold used by the backend (squared L2 distance). */
export const DISTANCE_THRESHOLD = 190;

const INRA = 'INRA_fiche_technique_ble.pdf';
const FAO = 'FAO_bonnes_pratiques_agricoles.pdf';
const ONSSA = 'ONSSA_catalogue_usages_agricoles.pdf';

export const ANSWERS: Answer[] = [
  {
    question: 'Quelles sont les périodes les plus sensibles au stress hydrique du blé ?',
    paragraphs: [
      "Selon la fiche technique INRA, quatre périodes sont les plus sensibles au manque d'eau : la germination (pour assurer une bonne levée), le tallage (pour augmenter le nombre de talles), la montaison (pour une biomasse élevée) et l'épiaison-floraison (pour augmenter le poids de mille grains).",
      "Des apports de 60 à 120 mm d'eau pendant ces stades permettent d'augmenter significativement les rendements les années sèches."
    ],
    sources: [INRA],
    chunks: [
      { source: INRA, text: 'GESTION DE L’IRRIGATION D’APPOINT - Quatre périodes sont les plus sensibles au manque d’eau : la germination…, le stade tallage…', distance: 142.6 },
      { source: INRA, text: '…la montaison (assurer un entre-nœud pour une biomasse élevée) et stades épiaison-floraison… Des apports de 60 à 120 mm d’eau…', distance: 151.3 },
      { source: INRA, text: '…une irrigation d’appoint est nécessaire lorsque le niveau d’épuisement du sol est supérieur à 70 %…', distance: 168.9 }
    ],
    offTopic: false
  },
  {
    question: 'À quel stade faut-il arrêter l’irrigation du blé ?',
    paragraphs: [
      "D'après la fiche INRA, l'irrigation doit être arrêtée absolument dès le stade grain pâteux.",
      "Le document précise aussi que la réserve en eau du sol a plus d'incidence sur le rendement que l'irrigation saisonnière, et qu'une irrigation d'appoint devient nécessaire lorsque l'épuisement du sol dépasse 70 %."
    ],
    sources: [INRA],
    chunks: [
      { source: INRA, text: '…L’irrigation doit être arrêtée absolument dès le stade grain pâteux. Indépendamment du stade de culture, la réserve en eau du sol…', distance: 128.4 },
      { source: INRA, text: '…une irrigation d’appoint est nécessaire lorsque le niveau d’épuisement du sol est supérieur à 70 %…', distance: 157.0 },
      { source: FAO, text: '…les pratiques agronomiques les plus adéquates en matière de gestion des sols, des cultures, des ravageurs, des nutriments et de l’eau…', distance: 183.7 }
    ],
    offTopic: false
  },
  {
    question: 'Qu’est-ce que les bonnes pratiques agricoles selon la FAO ?',
    paragraphs: [
      "Pour la FAO, les bonnes pratiques agricoles (BPA) définissent les pratiques agronomiques les plus adéquates pour la gestion des sols, des cultures, des ravageurs, des nutriments et de l'eau, les coûts de production associés, et la façon dont les services fournis par les écosystèmes sont protégés.",
      'Appliquées à la ferme, elles augmentent la productivité et la compétitivité tout en conservant, voire en améliorant, les ressources naturelles.'
    ],
    sources: [FAO],
    chunks: [
      { source: FAO, text: '…bonnes pratiques agricoles (BPA)… elles définissent : (a) les pratiques agronomiques les plus adéquates en matière de gestion des sols, des cultures…', distance: 131.8 },
      { source: FAO, text: '…(b) les coûts de production… (c) dans quelle mesure les services fournis par les écosystèmes sont protégés et améliorés…', distance: 139.2 },
      { source: FAO, text: 'Bonnes pratiques agricoles : Opportunités pour les pays d’Afrique australe… Division de production et protection végétale…', distance: 176.5 }
    ],
    offTopic: false
  },
  {
    question: 'Qu’est-ce que le catalogue des usages agricoles au Maroc ?',
    paragraphs: [
      "Le référentiel de l'ONSSA est la liste des organismes nuisibles agricoles présents au Maroc ; il constitue le catalogue des usages agricoles du pays.",
      "Il est réparti en huit chapitres par groupes de cultures, fixe une nomenclature harmonisée pour chaque usage, et reste évolutif : il est mis à jour à l'apparition de nouveaux organismes nuisibles ou de nouvelles cultures."
    ],
    sources: [ONSSA],
    chunks: [
      { source: ONSSA, text: 'I- INTRODUCTION : Le présent référentiel est une liste des organismes nuisibles agricoles existants au Maroc et constitue le catalogue des usages agricoles…', distance: 119.5 },
      { source: ONSSA, text: 'II- OBJECTIF DU REFERENTIEL : Le présent référentiel dresse la liste des cultures et des organismes nuisibles… nomenclature harmonisée…', distance: 134.1 },
      { source: ONSSA, text: 'Sommaire : I- Introduction… IV- Catalogue des usages agricoles… Cultures fruitières, Agrumes…', distance: 171.8 }
    ],
    offTopic: false
  }
];

/** Suggested questions: the four answered ones, plus one the filter refuses. */
export const SUGGESTIONS = [...ANSWERS.map(a => a.question), 'Quelle est la capitale du Maroc ?'];

/** Two conversations already in the database, newest first, like the real sidebar. */
export const initialConversations = (): Conversation[] => [
  { id: 'c2', messages: [ANSWERS[3]] },
  { id: 'c1', messages: [ANSWERS[0], ANSWERS[1]] }
];

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** First domain keyword found in the question, as the backend tests it (plain substring, lower case). */
export const findKeyword = (question: string) => KEYWORDS.find(k => question.toLowerCase().includes(k));

/** A recorded answer for this question: same text, or most of its meaningful words. */
export function findAnswer(question: string): Answer | undefined {
  const q = normalize(question);
  return ANSWERS.find(a => normalize(a.question) === q) ?? ANSWERS.find(a => {
    const words = normalize(a.question).split(' ').filter(w => w.length > 3);
    return words.filter(w => q.includes(w)).length / words.length >= .6;
  });
}

export type Reply = { kind: 'answer'; exchange: Answer; keyword: string } | { kind: 'refusal'; exchange: Refusal } | { kind: 'unknown' };

/** What the mocked backend does with a question. */
export function ask(question: string): Reply {
  const keyword = findKeyword(question);
  if (!keyword) return { kind: 'refusal', exchange: { question, offTopic: true } };
  const answer = findAnswer(question);
  return answer ? { kind: 'answer', exchange: { ...answer, question }, keyword } : { kind: 'unknown' };
}

/** Sidebar label: the first question, cut at 35 characters like frontend/app.py. */
export function conversationLabel(c: Conversation) {
  const q = c.messages[0]?.question ?? 'Conversation vide';
  return q.length > 35 ? q.slice(0, 35) + '...' : q;
}
