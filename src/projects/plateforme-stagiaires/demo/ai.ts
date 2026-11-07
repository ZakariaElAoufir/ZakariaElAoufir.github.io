// The AI part of the demo: the mission's instruction document, cut and searched the way chabot-assistant-service does it,
// and answers written for the demo in the format the real model returns. No model runs here.

export type Scope = 'MISSION_CONTEXT_ONLY' | 'OUT_OF_SCOPE' | 'INSUFFICIENT_CONTEXT';
export type DocPage = { page: number; text: string };
export type Chunk = { index: number; page: number; content: string };
export type Match = Chunk & { score: number };

/** cahier-des-charges-api.pdf: the instruction document attached to the booking API mission (invented). */
export const SPEC_PDF: { name: string; pages: DocPage[] } = {
  name: 'cahier-des-charges-api.pdf',
  pages: [
    {
      page: 1, text: `Cahier des charges : API de réservation des salles.
Contexte. Les salles de réunion du siège sont réservées par courriel et les doubles réservations sont fréquentes. L'équipe construit une API REST en Spring Boot qui devient la seule source de vérité des réservations ; l'écran Angular et les autres outils passent tous par elle.
Périmètre. L'API gère les salles (nom, capacité, équipements) et leurs réservations. Les utilisateurs sont identifiés par le JWT de la plateforme : l'API ne gère ni les comptes ni les mots de passe.`
    },
    {
      page: 2, text: `Règles métier.
R1. Une salle ne peut pas avoir deux réservations qui se chevauchent. Deux créneaux se chevauchent si le début de l'un est avant la fin de l'autre et inversement. Des créneaux bout à bout (10:00-11:00 puis 11:00-12:00) sont autorisés.
R2. La fin d'une réservation doit être strictement après son début.
R3. Une réservation dure au plus 4 heures.
R4. Les réservations se font du lundi au vendredi, entre 08:00 et 20:00.
R5. Le nombre de participants ne peut pas dépasser la capacité de la salle.
R6. Seul l'auteur d'une réservation peut l'annuler, et seulement avant son début.`
    },
    {
      page: 3, text: `Points d'entrée.
GET /api/rooms : liste des salles, filtrable par capacité minimale.
GET /api/rooms/{id}/reservations?date=AAAA-MM-JJ : réservations d'une salle pour une journée.
POST /api/reservations : crée une réservation (roomId, startsAt, endsAt, participants, title).
DELETE /api/reservations/{id} : annule une réservation (règle R6).
Format des dates. Les dates sont échangées en ISO 8601 avec fuseau, par exemple 2026-11-12T10:00:00+01:00. Le serveur les stocke en UTC et les renvoie dans le fuseau Africa/Casablanca.`
    },
    {
      page: 4, text: `Erreurs. Les réponses d'erreur suivent un format unique : code, message et champ concerné.
400 : données invalides (fin avant début, durée supérieure à 4 heures, hors des horaires, participants au-delà de la capacité).
403 : annulation par une autre personne que l'auteur.
404 : salle ou réservation introuvable.
409 : chevauchement avec une réservation existante (règle R1).
Tests attendus. Des tests unitaires du service couvrent chaque règle, dont les cas limites : créneaux bout à bout acceptés, chevauchement d'une minute refusé, durée d'exactement 4 heures acceptée. Un test d'intégration vérifie le 409 de bout en bout avec une base PostgreSQL de test.`
    },
    {
      page: 5, text: `Livrables. Un rapport PDF de deux pages au plus : choix de conception, schéma des tables, limites connues. Le code est livré sur la branche de l'équipe et soumis sous forme de commit depuis la section Livrables.
Critères de validation. Les règles R1 à R6 sont respectées et testées, les erreurs suivent le format commun, et la documentation des points d'entrée est à jour.`
    }
  ]
};

/** rag_chunk_size and rag_chunk_overlap of the real service: windows of 900 characters that overlap by 150, page by page. */
export const CHUNK_SIZE = 900, CHUNK_OVERLAP = 150, TOP_K = 6;
export function chunkPages(pages: DocPage[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const p of pages) {
    const text = p.text.replace(/\s+/g, ' ').trim();
    for (let start = 0; start < text.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
      chunks.push({ index: chunks.length, page: p.page, content: text.slice(start, start + CHUNK_SIZE) });
      if (start + CHUNK_SIZE >= text.length) break;
    }
  }
  return chunks;
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set('les des une un le la de du et en a au aux pour par sur dans que qui quoi quel quelle quels quelles est sont dois doit je tu il on ce cette ces mon ma mes ton ta tes nous vous ou comment faut faire avec ne pas plus'.split(' '));
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
/** Stands in for the cosine similarity of the embeddings: the share of the question's words found in the chunk. */
export function retrieve(chunks: Chunk[], question: string, k = TOP_K): Match[] {
  const q = [...new Set(words(question))];
  if (!q.length) return [];
  return chunks
    .map(c => { const w = new Set(words(c.content)); const hits = q.filter(x => [...w].some(y => y.startsWith(x.slice(0, 5)))).length; return { ...c, score: Math.round(hits / q.length * 100) / 100 }; })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k);
}

export type MissionFacts = {
  title: string; description: string; dueDate: string; difficulty: string; points: number; coins: number;
  competences: string[]; hasSpec: boolean; status: string;
};
export type Answer = { answer: string; scope: Scope; sources: Match[] };

type Intent = { id: string; keys: string[]; spec?: boolean };
const INTENTS: Intent[] = [
  { id: 'rules', keys: ['regle', 'metier', 'chevauch', 'double', 'respecter', 'contrainte'], spec: true },
  { id: 'dates', keys: ['date', 'heure', 'iso', 'fuseau', 'format', 'horaire'], spec: true },
  { id: 'endpoints', keys: ['endpoint', 'route', 'entree', 'url', 'requete'], spec: true },
  { id: 'errors', keys: ['erreur', '409', '400', '403', '404', 'code', 'http'], spec: true },
  { id: 'tests', keys: ['test', 'unitaire', 'integration', 'tester'] },
  { id: 'deliver', keys: ['livrable', 'rendre', 'rapport', 'soumettre', 'livrer', 'valid', 'critere'] },
  { id: 'facts', keys: ['deadline', 'echeance', 'quand', 'point', 'coin', 'recompense', 'difficult', 'competence'] },
  { id: 'start', keys: ['commencer', 'debut', 'demarrer', 'etape', 'organiser', 'plan', 'aide'] }
];
const MISSION_WORDS = ['mission', 'salle', 'reserv', 'api', 'spring', 'angular', 'docker', 'pipeline', 'ecran', 'jpa', 'postgres', 'code', 'projet', 'equipe', 'encadrant', 'tache'];

/** The answer to a question about one mission, in the JSON shape the prompt asks for: { answer, scope }. */
export function answerQuestion(question: string, m: MissionFacts, matches: Match[], dateFr: (s: string) => string): Answer {
  const q = fold(question);
  const intent = INTENTS.find(i => i.keys.some(k => q.includes(k)));
  const onTopic = intent || MISSION_WORDS.some(w => q.includes(w)) || matches.some(x => x.score >= .5);
  if (!onTopic) {
    return { scope: 'OUT_OF_SCOPE', sources: [], answer: `Je ne peux répondre qu'aux questions sur la mission « ${m.title} ». Pose-moi une question sur ses consignes, ses règles, ses livrables ou son organisation.` };
  }
  const sources = m.hasSpec ? matches.slice(0, 3) : [];
  const id = intent?.id;
  if (id === 'facts') {
    return { scope: 'MISSION_CONTEXT_ONLY', sources: [], answer: `Échéance : ${dateFr(m.dueDate)}.\nDifficulté : ${m.difficulty}.\nRécompense : ${m.points} points pour toi et ${m.coins} coins.\nCompétences attendues : ${m.competences.join(', ') || 'non précisées'}.` };
  }
  if (id === 'start') {
    return {
      scope: 'MISSION_CONTEXT_ONLY', sources, answer: m.hasSpec
        ? `Je te propose cet ordre :\n- Lis les règles R1 à R6 du cahier des charges et écris un test pour chacune avant de coder.\n- Implémente la création de réservation avec la détection de chevauchement : c'est la règle qui justifie la mission.\n- Ajoute ensuite l'annulation et les erreurs au format commun.\n- Termine par le rapport et la soumission du commit dans Livrables.`
        : `La mission n'a pas de document de consigne, je m'appuie donc sur sa description : « ${m.description} »\n- Découpe-la en deux ou trois étapes que tu peux livrer séparément.\n- Commence par celle dont dépend le reste de l'équipe.\n- Si un point reste flou, utilise la section Aide pour interroger ton encadrant.`
    };
  }
  if (!m.hasSpec && id === 'deliver') {
    return { scope: 'INSUFFICIENT_CONTEXT', sources: [], answer: `La mission ne précise pas le format du livrable. Dépose ton travail dans la section Livrables, en fichier ou en commit GitHub, et demande à ton encadrant ses critères via la section Aide.` };
  }
  if (!m.hasSpec && id !== 'tests') {
    return { scope: 'INSUFFICIENT_CONTEXT', sources: [], answer: `Les informations de la mission ne répondent pas à cette question : elle n'a pas de document de consigne. Pose-la à ton encadrant dans la section Aide.` };
  }
  const TEXT: Record<string, string> = {
    rules: `Le cahier des charges fixe six règles :\n- R1 : pas deux réservations qui se chevauchent dans une même salle. Les créneaux bout à bout, comme 10:00-11:00 puis 11:00-12:00, restent autorisés.\n- R2 : la fin doit être strictement après le début.\n- R3 : 4 heures au plus.\n- R4 : du lundi au vendredi, entre 08:00 et 20:00.\n- R5 : pas plus de participants que la capacité de la salle.\n- R6 : seul l'auteur annule, et avant le début.\nLa règle R1 est la plus importante : un chevauchement doit renvoyer une erreur 409.`,
    dates: `Les dates sont échangées en ISO 8601 avec le fuseau, par exemple 2026-11-12T10:00:00+01:00. Le serveur les stocke en UTC et les renvoie dans le fuseau Africa/Casablanca. Pense à comparer les créneaux en UTC pour la règle de chevauchement.`,
    endpoints: `L'API expose quatre points d'entrée :\n- GET /api/rooms : les salles, filtrables par capacité minimale.\n- GET /api/rooms/{id}/reservations?date=AAAA-MM-JJ : les réservations d'une salle sur une journée.\n- POST /api/reservations : création, avec roomId, startsAt, endsAt, participants et title.\n- DELETE /api/reservations/{id} : annulation, soumise à la règle R6.`,
    errors: `Les erreurs suivent un format commun : code, message et champ concerné.\n- 400 : données invalides, comme une fin avant le début, plus de 4 heures, hors horaires ou trop de participants.\n- 403 : annulation par quelqu'un d'autre que l'auteur.\n- 404 : salle ou réservation introuvable.\n- 409 : chevauchement avec une réservation existante.`,
    tests: m.hasSpec
      ? `Le cahier des charges demande un test unitaire par règle, avec ces cas limites :\n- deux créneaux bout à bout sont acceptés ;\n- un chevauchement d'une minute est refusé ;\n- une durée d'exactement 4 heures est acceptée.\nAjoute un test d'intégration qui vérifie le 409 de bout en bout avec une base PostgreSQL de test.`
      : `La mission ne fixe pas de tests précis. Pour « ${m.title} », vise au moins un test par comportement décrit dans la mission, et demande à ton encadrant s'il attend une couverture particulière.`,
    deliver: `Deux livrables sont attendus :\n- un rapport PDF de deux pages au plus, avec tes choix de conception, le schéma des tables et les limites connues ;\n- le code sur la branche de l'équipe, soumis en commit depuis la section Livrables.\nLa mission est validée si les règles R1 à R6 sont respectées et testées, si les erreurs suivent le format commun et si la documentation des points d'entrée est à jour.`
  };
  if (id && TEXT[id]) return { scope: 'MISSION_CONTEXT_ONLY', sources, answer: TEXT[id] };
  if (sources.length && sources[0].score >= .5) {
    return { scope: 'MISSION_CONTEXT_ONLY', sources, answer: `Voici le passage du cahier des charges le plus proche de ta question (page ${sources[0].page}) :\n« ${sources[0].content.slice(0, 260).trim()}… »` };
  }
  return { scope: 'INSUFFICIENT_CONTEXT', sources, answer: `Le cahier des charges ne traite pas ce point. Pose la question à ton encadrant dans la section Aide : sa réponse sera visible par toute l'équipe.` };
}

export type PlanMission = { title: string; status: string; dueDate: string; difficulty: string; points: number; daysLeft: number; next: string };
/** The work plan, in the four sections the work-plan prompt asks for. */
export function workPlan(missions: PlanMission[], dateFr: (s: string) => string): { order: string[]; why: string[]; plan: string[]; watch: string[] } {
  const open = missions.filter(m => m.status !== 'VALIDEE' && m.status !== 'COMPLETEE');
  const waiting = missions.filter(m => m.status === 'COMPLETEE');
  const rank = (m: PlanMission) => (m.daysLeft < 0 ? -100 : 0) + (m.status === 'EN_COURS' ? -5 : 0) + m.daysLeft;
  const sorted = [...open].sort((a, b) => rank(a) - rank(b));
  const order = sorted.map(m => `${m.title} (échéance ${dateFr(m.dueDate)})`);
  const why = sorted.map(m => {
    if (m.daysLeft < 0) return `${m.title} : l'échéance est dépassée, c'est la priorité.`;
    if (m.status === 'EN_COURS') return `${m.title} : déjà commencée et due dans ${m.daysLeft} jour${m.daysLeft > 1 ? 's' : ''}, la terminer libère la suite.`;
    return `${m.title} : due dans ${m.daysLeft} jours, difficulté ${m.difficulty.toLowerCase()}.`;
  });
  const plan = sorted.map(m => `${m.title} : ${m.next}`);
  const watch = [
    ...sorted.filter(m => m.difficulty === 'Difficile').map(m => `${m.title} est difficile : garde une marge avant l'échéance pour les corrections.`),
    ...waiting.map(m => `${m.title} est complétée et attend la revue de l'encadrant : surveille ses commentaires.`),
    ...sorted.filter(m => m.daysLeft >= 0 && m.daysLeft <= 3).map(m => `${m.title} arrive à échéance dans ${m.daysLeft} jour${m.daysLeft > 1 ? 's' : ''}.`)
  ];
  if (!watch.length) watch.push('Aucune échéance proche : profites-en pour avancer la mission la plus difficile.');
  return { order, why, plan, watch };
}
