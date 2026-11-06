// The intern platform replayed in the browser. The rules of intership-service and auth-service are rewritten here from how they behave;
// all the data is invented and nothing leaves the page: every "HTTP call" is a function call that records the journey it would take.
import { REPO_FILES, type RepoFile } from './repo';

export type Lang = 'fr' | 'en';
export type Role = 'STAGIAIRE' | 'ENCADRANT';
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type TeamStatus = 'OPEN' | 'FULL';
export type MissionStatus = 'A_FAIRE' | 'EN_COURS' | 'COMPLETEE' | 'VALIDEE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type Account = { id: number; email: string; password: string; first_name: string; last_name: string; role: Role; face_enrolled: boolean; enabled: boolean };
export type Subject = { id: number; code: string; title: string; description: string; supervisor_id: number; max_teams: number; created_at: string };
export type Position = { id: number; subject_id: number; title: string; description: string; capacity_per_team: number };
export type Team = { id: number; name: string; subject_id: number; number: number; points: number; status: TeamStatus; engagement: number; progress: number; created_at: string };
export type Slot = { id: number; team_id: number; position_id: number; capacity: number; occupied_count: number };
export type Membership = { id: number; team_id: number; stagiaire_id: number; slot_id: number; joined_at: string };
export type Selection = { id: number; subject_id: number; position_id: number; stagiaire_id: number };
export type History = { id: number; team_id: number; action: string; detail: string; created_at: string };
export type Mission = { id: number; team_id: number; title: string; description: string; difficulty: Difficulty; status: MissionStatus; points: number; coins: number; assignee_id: number; due_date: string; competences: string[]; validated_at: string | null };
export type Repository = { id: number; team_id: number; full_name: string; visibility: string; active: boolean; default_branch: string; last_sync_at: string };
export type Branch = { id: number; repository_id: number; name: string; head_sha: string; is_default: boolean };
export type CommitRow = { id: number; repository_id: number; sha: string; message: string; author_login: string; author_name: string; committed_at: string; additions: number; deletions: number; branches: string };
export type GitIdentity = { id: number; team_id: number; login: string; email: string; commits: number; linked_user_id: number | null };

/** One database per service, as in docker-compose. */
export type Db = {
  authdb: { accounts: Account[] };
  internship_db: {
    subjects: Subject[]; subject_positions: Position[]; teams: Team[]; team_position_slots: Slot[]; team_memberships: Membership[];
    subject_selections: Selection[]; team_histories: History[]; missions: Mission[];
    project_repositories: Repository[]; repository_branches: Branch[]; commit_traces: CommitRow[]; detected_git_identities: GitIdentity[];
  };
};
export type DbName = keyof Db;
export type TableRef = { db: DbName; table: string };
export type ColType = 'int' | 'text' | 'bool' | 'timestamp';
export const TABLES: { db: DbName; table: string; cols: [string, ColType][] }[] = [
  { db: 'authdb', table: 'accounts', cols: [['id', 'int'], ['email', 'text'], ['password', 'text'], ['role', 'text'], ['face_enrolled', 'bool'], ['enabled', 'bool']] },
  { db: 'internship_db', table: 'subjects', cols: [['id', 'int'], ['code', 'text'], ['title', 'text'], ['supervisor_id', 'int'], ['max_teams', 'int'], ['created_at', 'timestamp']] },
  { db: 'internship_db', table: 'subject_positions', cols: [['id', 'int'], ['subject_id', 'int'], ['title', 'text'], ['capacity_per_team', 'int']] },
  { db: 'internship_db', table: 'teams', cols: [['id', 'int'], ['name', 'text'], ['subject_id', 'int'], ['points', 'int'], ['status', 'text']] },
  { db: 'internship_db', table: 'team_position_slots', cols: [['id', 'int'], ['team_id', 'int'], ['position_id', 'int'], ['capacity', 'int'], ['occupied_count', 'int']] },
  { db: 'internship_db', table: 'team_memberships', cols: [['id', 'int'], ['team_id', 'int'], ['stagiaire_id', 'int'], ['slot_id', 'int'], ['joined_at', 'timestamp']] },
  { db: 'internship_db', table: 'subject_selections', cols: [['id', 'int'], ['subject_id', 'int'], ['position_id', 'int'], ['stagiaire_id', 'int']] },
  { db: 'internship_db', table: 'team_histories', cols: [['id', 'int'], ['team_id', 'int'], ['action', 'text'], ['detail', 'text'], ['created_at', 'timestamp']] },
  { db: 'internship_db', table: 'missions', cols: [['id', 'int'], ['team_id', 'int'], ['title', 'text'], ['difficulty', 'text'], ['status', 'text'], ['points', 'int'], ['coins', 'int'], ['assignee_id', 'int']] },
  { db: 'internship_db', table: 'project_repositories', cols: [['id', 'int'], ['team_id', 'int'], ['full_name', 'text'], ['visibility', 'text'], ['active', 'bool'], ['last_sync_at', 'timestamp']] },
  { db: 'internship_db', table: 'repository_branches', cols: [['id', 'int'], ['repository_id', 'int'], ['name', 'text'], ['head_sha', 'text'], ['is_default', 'bool']] },
  { db: 'internship_db', table: 'commit_traces', cols: [['id', 'int'], ['repository_id', 'int'], ['sha', 'text'], ['message', 'text'], ['author_login', 'text'], ['additions', 'int'], ['deletions', 'int']] },
  { db: 'internship_db', table: 'detected_git_identities', cols: [['id', 'int'], ['team_id', 'int'], ['login', 'text'], ['email', 'text'], ['commits', 'int'], ['linked_user_id', 'int']] }
];

/** A piece of a trace line: plain text, a value (highlighted) or a dimmed note. */
export type Seg = string | { v: string } | { d: string };
export type Node = 'nginx' | 'gateway' | 'auth' | 'face' | 'internship' | 'github' | 'postgres';
export type Hop = { node: Node; at: string; text: Seg[]; bad?: boolean };
export type Trace = { id: number; t: number; by: string; method: Method; path: string; status: number; hops: Hop[] };
export type Step = 'login' | 'face' | 'join' | 'role' | 'github' | 'skills';

export type Engine = {
  lang: Lang; db: Db; traces: Trace[]; steps: Set<Step>;
  /** rows written by the last calls, by "db.table#id", with the time they were written */
  changed: Map<string, number>;
  gone: { ref: TableRef; row: Record<string, unknown>; t: number }[];
  lastTable: TableRef | null;
  seq: Record<string, number>;
  now: () => number;
};
export type Res<T = unknown> = { status: number; body: T };

// ---------------------------------------------------------------- seed (invented people, subjects and missions)
const H = 3600_000, D = 24 * H;
const iso = (t: number) => new Date(t).toISOString().slice(0, 23);
export const DEMO_PASSWORD = 'Demo2026!';
const person = (id: number, first_name: string, last_name: string, role: Role = 'STAGIAIRE'): Account => ({
  id, first_name, last_name, role, password: DEMO_PASSWORD, face_enrolled: true, enabled: true,
  email: `${first_name}.${last_name}@estage.demo`.toLowerCase()
});

export function createEngine(lang: Lang, now: () => number = Date.now): Engine {
  const t0 = now();
  const accounts = [
    person(1, 'Karim', 'Benali', 'ENCADRANT'), person(2, 'Nadia', 'Chraibi', 'ENCADRANT'),
    person(3, 'Sara', 'Alaoui'), person(4, 'Yassine', 'Idrissi'), person(5, 'Omar', 'Tazi'), person(6, 'Lina', 'Berrada'),
    person(7, 'Hind', 'Filali'), person(8, 'Anas', 'Naciri'), person(9, 'Mehdi', 'Ouali')
  ];
  const subjects: Subject[] = [
    { id: 1, code: 'ROOMS', title: 'Plateforme de réservation de salles', description: 'Application web pour réserver les salles de réunion : API Spring Boot, écran Angular, déploiement Docker.', supervisor_id: 1, max_teams: 2, created_at: iso(t0 - 21 * D) },
    { id: 2, code: 'ENERGY', title: 'Tableau de bord de suivi énergétique', description: 'Collecte des relevés de consommation et tableau de bord des bâtiments.', supervisor_id: 1, max_teams: 1, created_at: iso(t0 - 18 * D) },
    { id: 3, code: 'TICKETS', title: 'Tri des tickets de support', description: 'Classer les tickets entrants par priorité et les répartir entre les équipes de support.', supervisor_id: 2, max_teams: 1, created_at: iso(t0 - 14 * D) }
  ];
  const pos = (id: number, subject_id: number, title: string, description: string, capacity_per_team: number): Position => ({ id, subject_id, title, description, capacity_per_team });
  const positions = [
    pos(1, 1, 'Développeur backend', 'Concevoir l’API de réservation et ses règles métier avec Spring Boot.', 2),
    pos(2, 1, 'Développeur frontend', 'Construire les écrans de réservation et le planning en Angular.', 2),
    pos(3, 1, 'Ingénieur DevOps', 'Conteneuriser l’application et automatiser son intégration continue.', 1),
    pos(4, 2, 'Data analyst', 'Nettoyer les relevés et calculer les indicateurs de consommation.', 2),
    pos(5, 2, 'Développeur frontend', 'Afficher les indicateurs dans un tableau de bord lisible.', 1),
    pos(6, 3, 'Développeur backend', 'Exposer les tickets et les règles de répartition par API.', 1),
    pos(7, 3, 'Développeur frontend', 'Construire la file de tickets pour les équipes de support.', 1)
  ];
  const team = (id: number, name: string, subject_id: number, number: number, points: number, engagement: number, progress: number, age: number): Team =>
    ({ id, name, subject_id, number, points, engagement, progress, status: 'OPEN', created_at: iso(t0 - age * D) });
  const teams = [team(1, 'Team-ROOMS-1', 1, 1, 50, 62, 50, 12), team(2, 'Team-ROOMS-2', 1, 2, 0, 18, 0, 9), team(3, 'Team-ENERGY-1', 2, 1, 0, 9, 0, 6), team(4, 'Team-TICKETS-1', 3, 1, 0, 0, 0, 4)];
  const slots: Slot[] = [];
  for (const t of teams) for (const p of positions.filter(x => x.subject_id === t.subject_id)) slots.push({ id: slots.length + 1, team_id: t.id, position_id: p.id, capacity: p.capacity_per_team, occupied_count: 0 });
  const memberships: Membership[] = [];
  const selections: Selection[] = [];
  const seat = (stagiaire_id: number, team_id: number, position_id: number, age: number) => {
    const s = slots.find(x => x.team_id === team_id && x.position_id === position_id)!;
    s.occupied_count++;
    memberships.push({ id: memberships.length + 1, team_id, stagiaire_id, slot_id: s.id, joined_at: iso(t0 - age * D) });
    selections.push({ id: selections.length + 1, subject_id: teams.find(x => x.id === team_id)!.subject_id, position_id, stagiaire_id });
  };
  seat(4, 1, 1, 11); seat(5, 1, 2, 11); seat(6, 1, 3, 10); seat(7, 2, 1, 8); seat(8, 2, 2, 8); seat(9, 3, 4, 5);
  const mission = (id: number, title: string, description: string, difficulty: Difficulty, status: MissionStatus, points: number, coins: number, assignee_id: number, due: number, competences: string[] = [], validated = 0): Mission =>
    ({ id, team_id: 1, title, description, difficulty, status, points, coins, assignee_id, due_date: iso(t0 + due * D), competences, validated_at: validated ? iso(t0 - validated * D) : null });
  const missions = [
    mission(1, 'API de réservation des salles', 'Exposer la création, la consultation et l’annulation des réservations, sans chevauchement sur une même salle.', 'HARD', 'EN_COURS', 40, 20, 4, 6),
    mission(2, 'Écran de réservation Angular', 'Formulaire de réservation et planning de la semaine, branchés sur l’API.', 'MEDIUM', 'COMPLETEE', 25, 12, 5, 3),
    mission(3, 'Pipeline d’intégration continue', 'Lancer les tests et construire les images à chaque push.', 'MEDIUM', 'A_FAIRE', 25, 8, 6, 12),
    mission(4, 'Conteneuriser l’application', 'Dockerfile pour chaque partie et lancement complet avec Docker Compose.', 'EASY', 'VALIDEE', 15, 5, 6, -2, ['Dockerfile multi-étapes', 'Docker Compose'], 2),
    mission(5, 'Modèle de données des réservations', 'Tables des salles et des réservations, avec leurs contraintes.', 'MEDIUM', 'VALIDEE', 20, 8, 4, -5, ['Modélisation relationnelle', 'JPA et PostgreSQL'], 5),
    mission(6, 'Maquette des écrans', 'Parcours de réservation et états vides, validés avec l’encadrant.', 'EASY', 'VALIDEE', 15, 5, 5, -7, ['Parcours utilisateur', 'Composants Angular'], 7)
  ];
  const seedRepo = (id: number, team_id: number, full_name: string, age: number): Repository => ({ id, team_id, full_name, visibility: 'private', active: true, default_branch: 'main', last_sync_at: iso(t0 - age * H) });
  const branches: Branch[] = [];
  const commits: CommitRow[] = [];
  const log: [string, string, string, number, number, string, number][] = [
    ['fix(reservation): refuse une fin avant le début', 'yassine-idrissi', 'Yassine Idrissi', 34, 6, 'feature/reservations-api', 3],
    ['feat(reservation): détecte les chevauchements', 'yassine-idrissi', 'Yassine Idrissi', 88, 12, 'feature/reservations-api', 21],
    ['feat(reservation): ajoute le contrôleur REST', 'yassine-idrissi', 'Yassine Idrissi', 96, 0, 'feature/reservations-api', 44],
    ['feat(front): formulaire de réservation', 'omar-tazi', 'Omar Tazi', 212, 18, 'develop', 70],
    ['ci: lance les tests à chaque push', 'lina-berrada', 'Lina Berrada', 41, 0, 'develop', 92],
    ['docs: précise le lancement local', 'sara-alaoui-dev', 'Sara Alaoui', 12, 3, 'develop', 110],
    ['build: Dockerfile backend et frontend', 'lina-berrada', 'Lina Berrada', 74, 2, 'main', 130],
    ['feat(db): tables des salles et des réservations', 'yassine-idrissi', 'Yassine Idrissi', 58, 0, 'main', 170],
    ['chore: structure initiale du projet', 'lina-berrada', 'Lina Berrada', 320, 0, 'main', 220]
  ];
  const ORDER = ['main', 'develop', 'feature/reservations-api'];
  const sha = (r: number, i: number) => ((0x4f1c9a7 + r * 0x31d3 + i * 0x7be5f1) >>> 0).toString(16).padStart(8, '0').slice(0, 7);
  const repositories = [seedRepo(1, 1, 'estage-demo/team-rooms-1', 3), seedRepo(2, 2, 'estage-demo/team-rooms-2', 9)];
  for (const r of repositories) {
    const start = commits.length;
    log.forEach(([message, author_login, author_name, additions, deletions, from, age], i) => {
      // a commit reaches its own branch and every branch built on top of it
      const reach = ORDER.slice(ORDER.indexOf(from)).join(',');
      commits.push({ id: commits.length + 1, repository_id: r.id, sha: sha(r.id, i), message, author_login, author_name, additions, deletions, committed_at: iso(t0 - age * H), branches: reach });
    });
    ORDER.forEach((name, i) => {
      const head = commits.slice(start).find(c => c.branches.split(',').includes(name))!;
      branches.push({ id: branches.length + 1, repository_id: r.id, name, head_sha: head.sha, is_default: i === 0 });
    });
  }
  const identities: GitIdentity[] = [
    { id: 1, team_id: 1, login: 'yassine-idrissi', email: 'yassine.idrissi@estage.demo', commits: 4, linked_user_id: 4 },
    { id: 2, team_id: 1, login: 'omar-tazi', email: 'omar.tazi@estage.demo', commits: 1, linked_user_id: 5 },
    { id: 3, team_id: 1, login: 'lina-berrada', email: 'lina.berrada@estage.demo', commits: 3, linked_user_id: 6 },
    { id: 4, team_id: 1, login: 'sara-alaoui-dev', email: 'sara.alaoui@estage.demo', commits: 1, linked_user_id: null },
    { id: 5, team_id: 2, login: 'sara-alaoui-dev', email: 'sara.alaoui@estage.demo', commits: 1, linked_user_id: null }
  ];
  const histories: History[] = [{ id: 1, team_id: 1, action: 'MEMBER_ADDED', detail: 'Stagiaire ajouté au poste Ingénieur DevOps', created_at: iso(t0 - 10 * D) }];
  return {
    lang, now, traces: [], steps: new Set(), changed: new Map(), gone: [], lastTable: null,
    db: {
      authdb: { accounts },
      internship_db: {
        subjects, subject_positions: positions, teams, team_position_slots: slots, team_memberships: memberships, subject_selections: selections, team_histories: histories,
        missions, project_repositories: repositories, repository_branches: branches, commit_traces: commits, detected_git_identities: identities
      }
    },
    seq: { team_memberships: memberships.length, subject_selections: selections.length, team_histories: histories.length }
  };
}

export const rowsOf = (e: Engine, r: TableRef) => (e.db[r.db] as unknown as Record<string, Record<string, unknown>[]>)[r.table];
const touch = (e: Engine, db: DbName, table: string, id: number) => { e.changed.set(`${db}.${table}#${id}`, e.now()); e.lastTable = { db, table }; };
const nextId = (e: Engine, table: string) => (e.seq[table] = (e.seq[table] ?? 0) + 1);

// ---------------------------------------------------------------- JWT (signed HS256 by auth-service, valid 15 minutes; here only its payload matters)
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export type Claims = { sub: string; userId: number; roles: Role[]; iat: number; exp: number };
export function makeToken(e: Engine, a: Account) {
  const iat = Math.floor(e.now() / 1000);
  return `${b64({ alg: 'HS256' })}.${b64({ sub: a.email, userId: a.id, roles: [a.role], iat, exp: iat + 900 })}.demo-signature`;
}
export function readToken(token: string | null): Claims | null {
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null; }
}

// ---------------------------------------------------------------- what the screens receive
export const fullName = (a: Account) => `${a.first_name} ${a.last_name}`;
export const initials = (a: Account) => `${a.first_name[0]}${a.last_name[0]}`;
export type PersonDto = { id: number; name: string; email: string; initials: string };
const personDto = (a: Account): PersonDto => ({ id: a.id, name: fullName(a), email: a.email, initials: initials(a) });
export type PositionDto = { id: number; title: string; description: string; capacity: number; occupied: number; free: number };
export type SubjectDto = {
  id: number; code: string; title: string; description: string; maxTeams: number; createdAt: string; supervisor: PersonDto;
  positions: PositionDto[]; free: number; occupation: number;
};
export type MemberDto = PersonDto & { position: string };
export type TeamDto = { id: number; name: string; number: number; status: TeamStatus; points: number; progress: number; engagement: number; createdAt: string; members: MemberDto[]; free: number; positions: PositionDto[] };
export type MissionDto = { id: number; title: string; description: string; difficulty: Difficulty; status: MissionStatus; points: number; coins: number; dueDate: string; assignee: PersonDto };
export type AssignmentDto = { team: TeamDto; subject: SubjectDto; position: PositionDto; joinedAt: string; missions: MissionDto[]; coins: number };
export type CompetenceTree = { members: { id: number; name: string; initials: string; position: string; missions: { id: number; title: string; validatedAt: string; competences: string[] }[] }[] };
export type RepositoryDto = { id: number; fullName: string; visibility: string; active: boolean; defaultBranch: string; lastSyncAt: string; branches: Branch[]; commits: number };
export type ContentItem = { name: string; path: string; type: 'dir' | 'file'; message: string };
export type FileDto = { path: string; content: string; lines: number; sha: string };

const account = (e: Engine, id: number) => e.db.authdb.accounts.find(a => a.id === id)!;
const I = (e: Engine) => e.db.internship_db;
const positionDtos = (e: Engine, team_id: number): PositionDto[] => I(e).team_position_slots.filter(s => s.team_id === team_id).map(s => {
  const p = I(e).subject_positions.find(x => x.id === s.position_id)!;
  return { id: p.id, title: p.title, description: p.description, capacity: s.capacity, occupied: s.occupied_count, free: s.capacity - s.occupied_count };
});
const teamDto = (e: Engine, t: Team): TeamDto => {
  const positions = positionDtos(e, t.id);
  const members = I(e).team_memberships.filter(m => m.team_id === t.id).map(m => {
    const slot = I(e).team_position_slots.find(s => s.id === m.slot_id)!;
    return { ...personDto(account(e, m.stagiaire_id)), position: I(e).subject_positions.find(p => p.id === slot.position_id)!.title };
  });
  return { id: t.id, name: t.name, number: t.number, status: t.status, points: t.points, progress: t.progress, engagement: t.engagement, createdAt: t.created_at, members, free: positions.reduce((n, p) => n + p.free, 0), positions };
};
const subjectDto = (e: Engine, s: Subject): SubjectDto => {
  const positions = I(e).subject_positions.filter(p => p.subject_id === s.id);
  const total = positions.reduce((n, p) => n + p.capacity_per_team, 0) * s.max_teams;
  const occupied = I(e).team_position_slots.filter(x => positions.some(p => p.id === x.position_id)).reduce((n, x) => n + x.occupied_count, 0);
  return {
    id: s.id, code: s.code, title: s.title, description: s.description, maxTeams: s.max_teams, createdAt: s.created_at, supervisor: personDto(account(e, s.supervisor_id)),
    positions: positions.map(p => {
      const slots = I(e).team_position_slots.filter(x => x.position_id === p.id);
      const occ = slots.reduce((n, x) => n + x.occupied_count, 0);
      return { id: p.id, title: p.title, description: p.description, capacity: p.capacity_per_team, occupied: occ, free: p.capacity_per_team * s.max_teams - occ };
    }),
    free: total - occupied, occupation: total ? Math.round(occupied / total * 100) : 0
  };
};
const missionDto = (e: Engine, m: Mission): MissionDto => ({ id: m.id, title: m.title, description: m.description, difficulty: m.difficulty, status: m.status, points: m.points, coins: m.coins, dueDate: m.due_date, assignee: personDto(account(e, m.assignee_id)) });
/** updateTeamStatus: a team is FULL once every one of its slots is taken. */
const updateTeamStatus = (e: Engine, team: Team) => {
  const full = I(e).team_position_slots.filter(s => s.team_id === team.id).every(s => s.occupied_count >= s.capacity);
  team.status = full ? 'FULL' : 'OPEN';
  touch(e, 'internship_db', 'teams', team.id);
};
const addHistory = (e: Engine, team_id: number, action: string, detail: string) => {
  const id = nextId(e, 'team_histories');
  I(e).team_histories.unshift({ id, team_id, action, detail, created_at: iso(e.now()) });
  touch(e, 'internship_db', 'team_histories', id);
};

// ---------------------------------------------------------------- the journey of a request
type Ctx = { e: Engine; hops: Hop[]; claims: Claims | null };
const L = (e: Engine, fr: string, en: string) => e.lang === 'fr' ? fr : en;
const hop = (c: Ctx, node: Node, at: string, ...text: Seg[]) => { c.hops.push({ node, at, text }); };
const bad = (c: Ctx, node: Node, at: string, ...text: Seg[]) => { c.hops.push({ node, at, text, bad: true }); };
const sql = (c: Ctx, db: DbName, query: string) => hop(c, 'postgres', db, { v: query });
const fail = (status: number, message: string): Res => ({ status, body: { message } });
const AUTH_AT = 'auth-service', INT_AT = 'intership-service';

/** One call from the Angular app. `token` is what the auth interceptor adds as a Bearer header. */
export function call<T = unknown>(e: Engine, by: string, method: Method, url: string, token: string | null, body?: unknown): Res<T> {
  const c: Ctx = { e, hops: [], claims: null };
  const route = url.split('?')[0];
  hop(c, 'nginx', ':4200', 'location /api/ → ', { v: `proxy_pass http://api-gateway:8080${route}` });
  const res = gateway(c, method, route, new URLSearchParams(url.split('?')[1] ?? ''), token, body);
  e.traces.unshift({ id: (e.traces[0]?.id ?? 0) + 1, t: e.now(), by, method, path: url, status: res.status, hops: c.hops });
  if (e.traces.length > 60) e.traces.pop();
  return res as Res<T>;
}

function gateway(c: Ctx, method: Method, route: string, query: URLSearchParams, token: string | null, body: unknown): Res {
  const { e } = c;
  if (route === '/api/auth/login' || route === '/api/auth/login/face') {
    hop(c, 'gateway', ':8080', { d: L(e, 'route publique, sans jeton', 'public route, no token') }, ' → ', { v: 'lb://AUTH-SERVICE' });
    return route.endsWith('face') ? loginFace(c, body as { email: string }) : login(c, body as { email: string; password: string });
  }
  const claims = readToken(token);
  if (!claims) { bad(c, 'gateway', ':8080', L(e, 'pas de jeton valide → ', 'no valid token → '), { v: '401 Unauthorized' }); return fail(401, 'Session expirée.'); }
  c.claims = claims;
  const internship = !route.startsWith('/api/auth');
  hop(c, 'gateway', ':8080', L(e, 'jeton vérifié, ', 'token checked, '), { v: `X-User-Id: ${claims.userId}` }, ' → ', { v: internship ? 'lb://INTERSHIP-SERVICE' : 'lb://AUTH-SERVICE' });
  if (route === '/api/auth/logout') { hop(c, 'auth', AUTH_AT, L(e, 'jeton de rafraîchissement révoqué', 'refresh token revoked')); return { status: 204, body: null }; }
  if (route.startsWith('/api/stagiaire') && !claims.roles.includes('STAGIAIRE')) {
    bad(c, 'internship', INT_AT, L(e, 'réservé au rôle STAGIAIRE → ', 'STAGIAIRE role only → '), { v: '403 Forbidden' });
    return fail(403, 'Accès réservé aux stagiaires.');
  }

  let m: RegExpMatchArray | null;
  if (method === 'GET' && route === '/api/stagiaire/subjects') return listSubjects(c);
  if (method === 'GET' && (m = route.match(/^\/api\/stagiaire\/subjects\/(\d+)\/teams$/))) return listTeams(c, +m[1]);
  if (method === 'POST' && (m = route.match(/^\/api\/stagiaire\/subjects\/(\d+)\/select$/))) return selectSubject(c, +m[1], body as { teamId: number; subjectPositionId: number });
  if (method === 'GET' && route === '/api/stagiaire/team-membership') return currentAssignment(c);
  if (method === 'PUT' && route === '/api/stagiaire/team-membership/position') return changePosition(c, body as { subjectPositionId: number });
  if (method === 'DELETE' && route === '/api/stagiaire/team-membership') return leaveTeam(c);
  if (method === 'GET' && (m = route.match(/^\/api\/stagiaire\/teams\/(\d+)\/acquired-competences$/))) return competences(c, +m[1]);
  if (method === 'GET' && (m = route.match(/^\/api\/github\/teams\/(\d+)\/repositories$/))) return teamRepositories(c, +m[1]);
  if (method === 'POST' && (m = route.match(/^\/api\/github\/teams\/(\d+)\/repositories\/refresh-selection$/))) return refreshRepositories(c, +m[1]);
  if (method === 'GET' && (m = route.match(/^\/api\/github\/repositories\/(\d+)\/commits$/))) return listCommits(c, +m[1], query.get('branch'));
  if (method === 'GET' && (m = route.match(/^\/api\/github\/repositories\/(\d+)\/contents$/))) return listContents(c, +m[1], query.get('branch'), query.get('path') ?? '');
  if (method === 'GET' && (m = route.match(/^\/api\/github\/repositories\/(\d+)\/files$/))) return readFile(c, +m[1], query.get('branch'), query.get('path') ?? '');
  if (method === 'GET' && (m = route.match(/^\/api\/github\/teams\/(\d+)\/git-identities$/))) return identities(c, +m[1]);
  if (method === 'POST' && (m = route.match(/^\/api\/github\/teams\/(\d+)\/git-identities\/(\d+)\/link$/))) return linkIdentity(c, +m[1], +m[2]);
  bad(c, 'internship', INT_AT, L(e, 'aucune route', 'no route'));
  return fail(404, 'Introuvable.');
}

// ---------------------------------------------------------------- auth-service
function login(c: Ctx, b: { email: string; password: string }): Res {
  const { e } = c;
  sql(c, 'authdb', `SELECT * FROM accounts WHERE email = '${b.email}'`);
  const a = e.db.authdb.accounts.find(x => x.email === b.email.trim().toLowerCase());
  if (!a || a.password !== b.password) {
    bad(c, 'auth', AUTH_AT, 'BCrypt.matches → ', { v: 'false' }, ' → 401');
    return fail(401, 'Email ou mot de passe incorrect.');
  }
  hop(c, 'auth', AUTH_AT, 'BCrypt.matches → ', { v: 'true' }, L(e, ', JWT signé pour 15 minutes', ', JWT signed for 15 minutes'));
  return { status: 200, body: { accessToken: makeToken(e, a), role: a.role } };
}
/** The face comparison itself is Redouane Boulhimez's part: the demo only keeps the place it takes in the login. */
function loginFace(c: Ctx, b: { email: string }): Res {
  const { e } = c;
  sql(c, 'authdb', `SELECT * FROM accounts WHERE email = '${b.email}'`);
  const a = e.db.authdb.accounts.find(x => x.email === b.email.trim().toLowerCase());
  if (!a || !a.face_enrolled) {
    bad(c, 'auth', AUTH_AT, L(e, 'aucun visage enregistré pour ce compte → 401', 'no face enrolled for this account → 401'));
    return fail(401, 'Aucun visage enregistré pour ce compte.');
  }
  hop(c, 'face', 'face-auth', { d: L(e, 'comparaison simulée, aucune caméra n’est utilisée', 'simulated comparison, no camera is used') }, ' → ', { v: 'match' });
  hop(c, 'auth', AUTH_AT, L(e, 'visage reconnu, JWT signé pour 15 minutes', 'face matched, JWT signed for 15 minutes'));
  return { status: 200, body: { accessToken: makeToken(e, a), role: a.role } };
}

// ---------------------------------------------------------------- intership-service: subjects and teams
function listSubjects(c: Ctx): Res {
  sql(c, 'internship_db', 'SELECT * FROM subjects ORDER BY created_at DESC');
  hop(c, 'internship', INT_AT, { d: L(c.e, 'calcule les places libres depuis team_position_slots', 'computes free seats from team_position_slots') });
  return { status: 200, body: I(c.e).subjects.map(s => subjectDto(c.e, s)) };
}
function listTeams(c: Ctx, subjectId: number): Res {
  sql(c, 'internship_db', `SELECT * FROM teams WHERE subject_id = ${subjectId}`);
  return { status: 200, body: I(c.e).teams.filter(t => t.subject_id === subjectId).map(t => teamDto(c.e, t)) };
}
function selectSubject(c: Ctx, subjectId: number, b: { teamId: number; subjectPositionId: number }): Res {
  const { e } = c, db = I(e), me = c.claims!.userId;
  sql(c, 'internship_db', `SELECT * FROM team_memberships WHERE stagiaire_id = ${me}`);
  if (db.team_memberships.some(m => m.stagiaire_id === me)) {
    bad(c, 'internship', INT_AT, 'StagiaireAlreadyAssignedException → ', { v: '409' });
    return fail(409, 'Vous êtes déjà affecté à une équipe.');
  }
  const subject = db.subjects.find(s => s.id === subjectId);
  const position = db.subject_positions.find(p => p.id === b.subjectPositionId);
  const team = db.teams.find(t => t.id === b.teamId);
  if (!subject || !position || position.subject_id !== subjectId || !team || team.subject_id !== subjectId) {
    bad(c, 'internship', INT_AT, L(e, 'le poste ou l’équipe n’appartient pas à ce sujet → ', 'position or team outside this subject → '), { v: '400' });
    return fail(400, 'Ce poste ou cette équipe n’appartient pas à ce sujet.');
  }
  const slot = db.team_position_slots.find(s => s.team_id === team.id && s.position_id === position.id);
  if (!slot || slot.occupied_count >= slot.capacity) {
    bad(c, 'internship', INT_AT, 'NoAvailablePositionSlotException → ', { v: '409' });
    return fail(409, 'Plus aucune place sur ce poste dans cette équipe.');
  }
  slot.occupied_count++;
  sql(c, 'internship_db', `UPDATE team_position_slots SET occupied_count = ${slot.occupied_count} WHERE id = ${slot.id}`);
  touch(e, 'internship_db', 'team_position_slots', slot.id);
  const sel = nextId(e, 'subject_selections');
  db.subject_selections.push({ id: sel, subject_id: subjectId, position_id: position.id, stagiaire_id: me });
  touch(e, 'internship_db', 'subject_selections', sel);
  const id = nextId(e, 'team_memberships');
  db.team_memberships.push({ id, team_id: team.id, stagiaire_id: me, slot_id: slot.id, joined_at: iso(e.now()) });
  sql(c, 'internship_db', `INSERT INTO team_memberships (team_id, stagiaire_id, slot_id) VALUES (${team.id}, ${me}, ${slot.id})`);
  updateTeamStatus(e, team);
  addHistory(e, team.id, 'MEMBER_ADDED', `Stagiaire ajouté au poste ${position.title}`);
  touch(e, 'internship_db', 'team_memberships', id);
  hop(c, 'internship', INT_AT, 'team.status = ', { v: team.status }, L(e, ', historique écrit', ', history written'));
  return { status: 201, body: { teamId: team.id } };
}
const myMembership = (e: Engine, me: number) => I(e).team_memberships.find(m => m.stagiaire_id === me);
function currentAssignment(c: Ctx): Res {
  const { e } = c, db = I(e), me = c.claims!.userId;
  sql(c, 'internship_db', `SELECT * FROM team_memberships WHERE stagiaire_id = ${me}`);
  const m = myMembership(e, me);
  if (!m) { hop(c, 'internship', INT_AT, 'TeamMembershipNotFoundException → ', { v: '404' }); return fail(404, 'Aucune équipe active.'); }
  const team = db.teams.find(t => t.id === m.team_id)!;
  const slot = db.team_position_slots.find(s => s.id === m.slot_id)!;
  const dto = teamDto(e, team);
  const missions = db.missions.filter(x => x.team_id === team.id).map(x => missionDto(e, x));
  const body: AssignmentDto = {
    team: dto, subject: subjectDto(e, db.subjects.find(s => s.id === team.subject_id)!), position: dto.positions.find(p => p.id === slot.position_id)!,
    joinedAt: m.joined_at, missions, coins: missions.filter(x => x.status !== 'VALIDEE').reduce((n, x) => n + x.coins, 0)
  };
  return { status: 200, body };
}
function changePosition(c: Ctx, b: { subjectPositionId: number }): Res {
  const { e } = c, db = I(e), me = c.claims!.userId;
  const m = myMembership(e, me);
  if (!m) { bad(c, 'internship', INT_AT, { v: '404' }); return fail(404, 'Aucune équipe active.'); }
  const team = db.teams.find(t => t.id === m.team_id)!;
  const target = db.subject_positions.find(p => p.id === b.subjectPositionId);
  if (!target || target.subject_id !== team.subject_id) {
    bad(c, 'internship', INT_AT, L(e, 'ce poste n’appartient pas au sujet → ', 'position outside the subject → '), { v: '400' });
    return fail(400, 'Ce poste n’appartient pas à ce sujet.');
  }
  const current = db.team_position_slots.find(s => s.id === m.slot_id)!;
  if (current.position_id === target.id) { hop(c, 'internship', INT_AT, { d: L(e, 'même poste, rien à écrire', 'same position, nothing to write') }); return { status: 200, body: null }; }
  const slot = db.team_position_slots.find(s => s.team_id === team.id && s.position_id === target.id);
  if (!slot || slot.occupied_count >= slot.capacity) {
    bad(c, 'internship', INT_AT, 'NoAvailablePositionSlotException → ', { v: '409' });
    return fail(409, 'Plus aucune place sur ce poste.');
  }
  current.occupied_count--; slot.occupied_count++;
  touch(e, 'internship_db', 'team_position_slots', current.id); touch(e, 'internship_db', 'team_position_slots', slot.id);
  sql(c, 'internship_db', `UPDATE team_position_slots: slot ${current.id} −1, slot ${slot.id} +1`);
  m.slot_id = slot.id;
  const sel = db.subject_selections.find(s => s.stagiaire_id === me);
  if (sel) sel.position_id = target.id;
  updateTeamStatus(e, team);
  addHistory(e, team.id, 'STRUCTURE_UPDATED', `Stagiaire ${me} change de poste vers ${target.title}`);
  touch(e, 'internship_db', 'team_memberships', m.id);
  return { status: 200, body: null };
}
function leaveTeam(c: Ctx): Res {
  const { e } = c, db = I(e), me = c.claims!.userId;
  const m = myMembership(e, me);
  if (!m) { bad(c, 'internship', INT_AT, { v: '404' }); return fail(404, 'Aucune équipe active.'); }
  const team = db.teams.find(t => t.id === m.team_id)!;
  const slot = db.team_position_slots.find(s => s.id === m.slot_id)!;
  slot.occupied_count--;
  touch(e, 'internship_db', 'team_position_slots', slot.id);
  db.team_memberships.splice(db.team_memberships.indexOf(m), 1);
  e.gone.push({ ref: { db: 'internship_db', table: 'team_memberships' }, row: { ...m }, t: e.now() });
  const sel = db.subject_selections.findIndex(s => s.stagiaire_id === me);
  if (sel >= 0) db.subject_selections.splice(sel, 1);
  sql(c, 'internship_db', `DELETE FROM team_memberships WHERE id = ${m.id}`);
  updateTeamStatus(e, team);
  addHistory(e, team.id, 'MEMBER_REMOVED', 'Stagiaire retiré de l’équipe');
  e.lastTable = { db: 'internship_db', table: 'team_memberships' };
  return { status: 204, body: null };
}
const inTeam = (c: Ctx, teamId: number) => myMembership(c.e, c.claims!.userId)?.team_id === teamId;
const refuseOutsider = (c: Ctx): Res => {
  bad(c, 'internship', INT_AT, L(c.e, 'cet utilisateur n’est pas membre de l’équipe → ', 'this user is not a member of the team → '), { v: '403' });
  return fail(403, 'Vous n’êtes pas membre de cette équipe.');
};
function competences(c: Ctx, teamId: number): Res {
  const { e } = c, db = I(e);
  if (!inTeam(c, teamId)) return refuseOutsider(c);
  sql(c, 'internship_db', `SELECT * FROM missions WHERE team_id = ${teamId} AND status = 'VALIDEE'`);
  const dto = teamDto(e, db.teams.find(t => t.id === teamId)!);
  const body: CompetenceTree = {
    members: dto.members.map(m => ({
      id: m.id, name: m.name, initials: m.initials, position: m.position,
      missions: db.missions.filter(x => x.team_id === teamId && x.assignee_id === m.id && x.status === 'VALIDEE').map(x => ({ id: x.id, title: x.title, validatedAt: x.validated_at!, competences: x.competences }))
    }))
  };
  return { status: 200, body };
}

// ---------------------------------------------------------------- intership-service: the GitHub part (repository entirely invented)
const repoOf = (e: Engine, id: number) => I(e).project_repositories.find(r => r.id === id);
const repoDto = (e: Engine, r: Repository): RepositoryDto => ({
  id: r.id, fullName: r.full_name, visibility: r.visibility, active: r.active, defaultBranch: r.default_branch, lastSyncAt: r.last_sync_at,
  branches: I(e).repository_branches.filter(b => b.repository_id === r.id), commits: I(e).commit_traces.filter(x => x.repository_id === r.id).length
});
const repoGuard = (c: Ctx, id: number): Repository | Res => {
  const r = repoOf(c.e, id);
  if (!r) { bad(c, 'internship', INT_AT, { v: '404' }); return fail(404, 'Repository introuvable.'); }
  if (!inTeam(c, r.team_id)) return refuseOutsider(c);
  return r;
};
const isRes = (x: Repository | Res): x is Res => 'status' in x;
function teamRepositories(c: Ctx, teamId: number): Res {
  if (!inTeam(c, teamId)) return refuseOutsider(c);
  sql(c, 'internship_db', `SELECT * FROM project_repositories WHERE team_id = ${teamId}`);
  return { status: 200, body: I(c.e).project_repositories.filter(r => r.team_id === teamId).map(r => repoDto(c.e, r)) };
}
function refreshRepositories(c: Ctx, teamId: number): Res {
  const { e } = c;
  if (!inTeam(c, teamId)) return refuseOutsider(c);
  hop(c, 'github', 'GitHub App', { d: L(e, 'appel simulé', 'simulated call') }, ' GET ', { v: '/installation/repositories' });
  const rows = I(e).project_repositories.filter(r => r.team_id === teamId);
  for (const r of rows) { r.last_sync_at = iso(e.now()); touch(e, 'internship_db', 'project_repositories', r.id); }
  sql(c, 'internship_db', `UPDATE project_repositories SET last_sync_at = now() WHERE team_id = ${teamId}`);
  return { status: 200, body: rows.map(r => repoDto(e, r)) };
}
function listCommits(c: Ctx, id: number, branch: string | null): Res {
  const r = repoGuard(c, id);
  if (isRes(r)) return r;
  sql(c, 'internship_db', `SELECT * FROM commit_traces WHERE repository_id = ${id} AND branch = '${branch}'`);
  return { status: 200, body: I(c.e).commit_traces.filter(x => x.repository_id === id && (!branch || x.branches.split(',').includes(branch))) };
}
const filesOn = (branch: string | null): RepoFile[] => REPO_FILES.filter(f => !branch || f.branches.includes(branch));
function listContents(c: Ctx, id: number, branch: string | null, path: string): Res {
  const r = repoGuard(c, id);
  if (isRes(r)) return r;
  hop(c, 'github', 'GitHub App', { d: L(c.e, 'appel simulé', 'simulated call') }, ' GET ', { v: `/repos/${r.full_name}/contents/${path}?ref=${branch}` });
  const prefix = path ? `${path}/` : '';
  const seen = new Map<string, ContentItem>();
  for (const f of filesOn(branch)) {
    if (!f.path.startsWith(prefix)) continue;
    const rest = f.path.slice(prefix.length);
    const name = rest.split('/')[0];
    const type = rest.includes('/') ? 'dir' : 'file';
    if (!seen.has(name)) seen.set(name, { name, path: prefix + name, type, message: f.message });
  }
  const body = [...seen.values()].sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);
  return { status: 200, body };
}
function readFile(c: Ctx, id: number, branch: string | null, path: string): Res {
  const r = repoGuard(c, id);
  if (isRes(r)) return r;
  hop(c, 'github', 'GitHub App', { d: L(c.e, 'appel simulé', 'simulated call') }, ' GET ', { v: `/repos/${r.full_name}/contents/${path}?ref=${branch}` });
  const f = filesOn(branch).find(x => x.path === path);
  if (!f) { bad(c, 'github', 'GitHub App', { v: '404' }); return fail(404, 'Fichier absent de cette branche.'); }
  const body: FileDto = { path, content: f.content, lines: f.content.split('\n').length, sha: (f.path.length * 0x9e3779).toString(16).slice(0, 7) };
  return { status: 200, body };
}
function identities(c: Ctx, teamId: number): Res {
  if (!inTeam(c, teamId)) return refuseOutsider(c);
  sql(c, 'internship_db', `SELECT * FROM detected_git_identities WHERE team_id = ${teamId}`);
  return { status: 200, body: I(c.e).detected_git_identities.filter(g => g.team_id === teamId) };
}
function linkIdentity(c: Ctx, teamId: number, identityId: number): Res {
  const { e } = c, me = account(e, c.claims!.userId);
  if (!inTeam(c, teamId)) return refuseOutsider(c);
  const g = I(e).detected_git_identities.find(x => x.id === identityId && x.team_id === teamId);
  if (!g) { bad(c, 'internship', INT_AT, { v: '404' }); return fail(404, 'Identité introuvable.'); }
  if (g.email !== me.email) {
    bad(c, 'internship', INT_AT, L(e, 'l’email de cette identité n’est pas le vôtre → ', 'this identity’s email is not yours → '), { v: '409' });
    return fail(409, 'Cette identité Git n’utilise pas votre email.');
  }
  g.linked_user_id = me.id;
  touch(e, 'internship_db', 'detected_git_identities', g.id);
  sql(c, 'internship_db', `UPDATE detected_git_identities SET linked_user_id = ${me.id} WHERE id = ${g.id}`);
  return { status: 200, body: g };
}
