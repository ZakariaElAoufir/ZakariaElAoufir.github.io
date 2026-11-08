// The technician side of the incident platform, rebuilt in the browser: the rules of TechnicienController and TechnicienServiceImpl.
// All the data is invented and nothing leaves the page: every "HTTP call" is a function call that records the journey it would take.

export type Lang = 'fr' | 'en';
export type Role = 'ADMIN' | 'TECHNICIEN' | 'CLIENT';
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'JOB';
export type Status = 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'ANNULE' | 'ESCALADE';
export type Priorite = 'FAIBLE' | 'MOYEN' | 'HAUTE' | 'CRITIQUE';
export type Impact = 'ORGANISATION' | 'MULTI_USER' | 'SINGLE_USER';
export type Urgence = 'CRITIQUE' | 'ELEVEE' | 'NORMAL' | 'FAIBLE';
export type StatutSla = 'EN_COURS' | 'EXPIRE' | 'RESPECTE';
export type TypeAlerte = 'WARNING' | 'CRITIQUE' | 'PREDICTIVE';

export type Utilisateur = { id: number; role: Role; username: string; email: string; password: string; actif: boolean };
export type TechnicienRow = { id: number; specialite: string; equipe_id: number };
export type EquipeRow = { id: number; nom: string; specialite: string; administrateur_id: number; services_id: number };
export type ServiceRow = { id: number; nom: string; description: string };
export type SousServiceRow = { id: number; nom: string; description: string; services_id: number };
export type SlaRow = { id: number; details_resolution: string; statut_sla: StatutSla };
export type TicketRow = {
  id: number; titre: string; description: string; status: Status; priorite: Priorite; impact: Impact; urgence: Urgence;
  date_creation: string; date_resolution: string | null; piece_jointe: string | null; commentaire: string | null; feed_back: string | null; demande_extend: boolean;
  client_id: number; equipe_id: number; sous_service_id: number; sla_id: number; technicien_id: number | null;
};
export type HistoriqueRow = { id: number; action: string; date_action: string; ticket_id: number };
export type AlerteRow = { id: number; type_alerte: TypeAlerte; message: string; date_emission: string; ticket_id: number; utilisateur_id: number };

export type Db = {
  utilisateur: Utilisateur[]; technicien: TechnicienRow[]; equipe: EquipeRow[]; services: ServiceRow[]; sous_service: SousServiceRow[];
  ticket: TicketRow[]; sla: SlaRow[]; historique: HistoriqueRow[]; alerte: AlerteRow[];
};
export type TableName = keyof Db;
export type ColType = 'int' | 'text' | 'bool' | 'timestamp';
export const TABLES: { table: TableName; cols: [string, ColType][] }[] = [
  { table: 'ticket', cols: [['id', 'int'], ['titre', 'text'], ['status', 'text'], ['priorite', 'text'], ['impact', 'text'], ['urgence', 'text'], ['date_creation', 'timestamp'], ['date_resolution', 'timestamp'], ['commentaire', 'text'], ['equipe_id', 'int'], ['sla_id', 'int'], ['technicien_id', 'int']] },
  { table: 'sla', cols: [['id', 'int'], ['details_resolution', 'timestamp'], ['statut_sla', 'text']] },
  { table: 'historique', cols: [['id', 'int'], ['action', 'text'], ['date_action', 'timestamp'], ['ticket_id', 'int']] },
  { table: 'alerte', cols: [['id', 'int'], ['type_alerte', 'text'], ['message', 'text'], ['date_emission', 'timestamp'], ['ticket_id', 'int'], ['utilisateur_id', 'int']] },
  { table: 'technicien', cols: [['id', 'int'], ['specialite', 'text'], ['equipe_id', 'int']] },
  { table: 'equipe', cols: [['id', 'int'], ['nom', 'text'], ['specialite', 'text'], ['administrateur_id', 'int'], ['services_id', 'int']] },
  { table: 'utilisateur', cols: [['id', 'int'], ['role', 'text'], ['username', 'text'], ['email', 'text'], ['password', 'text'], ['actif', 'bool']] }
];

export type Seg = string | { v: string } | { d: string };
export type Node = 'proxy' | 'security' | 'controller' | 'service' | 'mysql';
export type Hop = { node: Node; at: string; text: Seg[]; bad?: boolean };
export type Trace = { id: number; t: number; by: string; method: Method; path: string; status: number; hops: Hop[] };
export type Step = 'login' | 'filter' | 'group' | 'assign' | 'status' | 'resolve' | 'escalate' | 'sla';
export type Engine = {
  lang: Lang; db: Db; traces: Trace[]; steps: Set<Step>;
  /** rows written by the last calls, by "table#id", with the time they were written */
  changed: Map<string, number>;
  lastTable: TableName | null;
  now: () => number;
  /** how far the visitor has moved the demo's clock forward, in ms */
  skew: number;
};
export type Res<T = unknown> = { status: number; body: T };

// ---------------------------------------------------------------- seed (invented people and tickets)
const H = 3600_000;
const MIN = 60_000;
/** A LocalDateTime: the local wall clock, as Spring serializes it. */
export const stamp = (t: number) => new Date(t - new Date(t).getTimezoneOffset() * MIN).toISOString().slice(0, 19);
export const DEMO_PASSWORD = 'Demo2026!';
export const SLA_HOURS: Record<Priorite, number> = { CRITIQUE: 2, HAUTE: 8, MOYEN: 24, FAIBLE: 48 };

type Seed = [titre: string, description: string, status: Status, priorite: Priorite, impact: Impact, urgence: Urgence, sous: number, tech: number | null, age: number, statutSla: StatutSla];
const SEED: Seed[] = [
  ['VPN inaccessible pour l’agence de Casablanca', 'Depuis ce matin, les postes de l’agence n’arrivent plus à établir le tunnel VPN. Les applications internes sont inaccessibles.', 'EN_COURS', 'HAUTE', 'MULTI_USER', 'ELEVEE', 1, 2, 3 * H, 'EN_COURS'],
  ['Serveur de fichiers saturé', 'Le volume principal du serveur de fichiers est plein à 99 %. Plus aucun service ne peut enregistrer de document.', 'EN_COURS', 'CRITIQUE', 'ORGANISATION', 'CRITIQUE', 2, 2, 1 * H, 'EN_COURS'],
  ['Sauvegarde nocturne en échec', 'La tâche de sauvegarde de 2 h s’arrête en erreur depuis deux nuits sur le stockage secondaire.', 'ESCALADE', 'HAUTE', 'MULTI_USER', 'CRITIQUE', 3, 2, 7.25 * H, 'EN_COURS'],
  ['Wi-Fi instable au deuxième étage', 'Les connexions tombent plusieurs fois par heure dans les bureaux du deuxième étage.', 'RESOLU', 'MOYEN', 'MULTI_USER', 'NORMAL', 1, 2, 6 * H, 'RESPECTE'],
  ['Certificat expiré sur l’intranet', 'Le navigateur signale un certificat expiré à l’ouverture de l’intranet RH.', 'EN_COURS', 'MOYEN', 'SINGLE_USER', 'CRITIQUE', 2, 2, 5 * H, 'EN_COURS'],
  ['Coupure réseau en salle serveurs', 'Un commutateur de la salle serveurs ne répond plus, plusieurs baies sont isolées du réseau.', 'OUVERT', 'CRITIQUE', 'ORGANISATION', 'CRITIQUE', 1, null, 10 * MIN, 'EN_COURS'],
  ['Accès refusé au dossier partagé', 'Un utilisateur du service achats n’a plus accès au dossier partagé de son équipe.', 'OUVERT', 'FAIBLE', 'SINGLE_USER', 'NORMAL', 2, null, 2 * H, 'EN_COURS'],
  ['Imprimante réseau hors ligne', 'L’imprimante de l’accueil apparaît hors ligne sur tous les postes.', 'EN_COURS', 'FAIBLE', 'SINGLE_USER', 'FAIBLE', 1, 3, 4 * H, 'EN_COURS']
];

function seed(t0: number): Db {
  const user = (id: number, role: Role, username: string): Utilisateur => ({ id, role, username, email: `${username}@predictsla.demo`, password: DEMO_PASSWORD, actif: true });
  const db: Db = {
    utilisateur: [user(1, 'ADMIN', 'admin.demo'), user(2, 'TECHNICIEN', 'amine.tazi'), user(3, 'TECHNICIEN', 'salma.idrissi'), user(4, 'CLIENT', 'atlas.client')],
    technicien: [{ id: 2, specialite: 'Réseau', equipe_id: 1 }, { id: 3, specialite: 'Serveurs', equipe_id: 1 }],
    equipe: [{ id: 1, nom: 'Support Infrastructure', specialite: 'Réseaux et serveurs', administrateur_id: 1, services_id: 1 }],
    services: [{ id: 1, nom: 'Infrastructure', description: 'Réseau, serveurs et sauvegardes' }],
    sous_service: [{ id: 1, nom: 'Réseau', description: 'VPN, Wi-Fi, commutateurs', services_id: 1 }, { id: 2, nom: 'Serveurs', description: 'Fichiers, certificats, accès', services_id: 1 }, { id: 3, nom: 'Sauvegardes', description: 'Tâches et stockage', services_id: 1 }],
    ticket: [], sla: [], historique: [], alerte: []
  };
  SEED.forEach(([titre, description, status, priorite, impact, urgence, sous, tech, age, statut_sla], i) => {
    const id = i + 1, created = t0 - age;
    db.sla.push({ id, details_resolution: stamp(created + SLA_HOURS[priorite] * H), statut_sla });
    db.ticket.push({
      id, titre, description, status, priorite, impact, urgence, date_creation: stamp(created), date_resolution: status === 'RESOLU' ? stamp(t0 - H) : null,
      piece_jointe: id === 1 ? 'journal-vpn.txt' : null, commentaire: status === 'RESOLU' ? 'Point d’accès remplacé, connexion stable.' : null, feed_back: null, demande_extend: false,
      client_id: 4, equipe_id: 1, sous_service_id: sous, sla_id: id, technicien_id: tech
    });
    db.historique.push({ id: id, action: 'Ticket created by client', date_action: stamp(created), ticket_id: id });
  });
  return db;
}

export function createEngine(lang: Lang, now: () => number = Date.now): Engine {
  return { lang, db: seed(now()), traces: [], steps: new Set(), changed: new Map(), lastTable: null, now, skew: 0 };
}
export const rowsOf = (e: Engine, table: TableName) => e.db[table] as unknown as Record<string, unknown>[];

// ---------------------------------------------------------------- the JWT (readable by the demo, signed by nobody)
export type Claims = { sub: string; role: `ROLE_${Role}`; iat: number; exp: number };
const LIFETIME = 7_200_000; // app.jwt.expiration-ms
export function readToken(token: string | null): Claims | null {
  if (!token?.startsWith('demo.')) return null;
  try { return JSON.parse(atob(token.slice(5))) as Claims; } catch { return null; }
}

// ---------------------------------------------------------------- what the API returns
export type TicketDto = {
  id: number; titre: string; description: string; status: Status; priorite: Priorite; impact: Impact; urgence: Urgence;
  dateCreation: string; dateResolution: string | null; pieceJointe: string | null; commentaire: string | null; feedBack: string | null;
  equipe: { id: number; nom: string; specialite: string; nomService: string; sousServices: string[] };
  technicien: { id: number; username: string; specialite: string } | null;
  sla: { id: number; detailsResolution: string; statutSla: StatutSla };
  sousService: { id: number; nom: string; description: string };
  historiques: { id: number; action: string; dateAction: string }[];
};
export type DashboardDto = { stats: { total: number; inProgress: number; escalated: number; resolved: number }; urgentTicket: TicketDto[] };
export type MeDto = { id: number; username: string; specialite: string };
export type LoginDto = { token: string; username: string; role: Claims['role'] };

type Ctx = { e: Engine; hops: Hop[] };
const hop = (c: Ctx, node: Node, at: string, ...text: Seg[]) => c.hops.push({ node, at, text });
const bad = (c: Ctx, node: Node, at: string, ...text: Seg[]) => c.hops.push({ node, at, text, bad: true });
const L = (e: Engine, fr: string, en: string) => e.lang === 'fr' ? fr : en;
const CTRL = 'TechnicienController', SERV = 'TechnicienServiceImpl', REPO = 'MySQL :3306';
const fail = (status: number, message: string): Res => ({ status, body: { message } });

function toDto(db: Db, t: TicketRow): TicketDto {
  const equipe = db.equipe.find(x => x.id === t.equipe_id)!;
  const service = db.services.find(x => x.id === equipe.services_id)!;
  const sla = db.sla.find(x => x.id === t.sla_id)!;
  const sous = db.sous_service.find(x => x.id === t.sous_service_id)!;
  const tech = t.technicien_id === null ? null : db.technicien.find(x => x.id === t.technicien_id)!;
  return {
    id: t.id, titre: t.titre, description: t.description, status: t.status, priorite: t.priorite, impact: t.impact, urgence: t.urgence,
    dateCreation: t.date_creation, dateResolution: t.date_resolution, pieceJointe: t.piece_jointe, commentaire: t.commentaire, feedBack: t.feed_back,
    equipe: { id: equipe.id, nom: equipe.nom, specialite: equipe.specialite, nomService: service.nom, sousServices: db.sous_service.filter(x => x.services_id === service.id).map(x => x.nom) },
    technicien: tech && { id: tech.id, username: db.utilisateur.find(x => x.id === tech.id)!.username, specialite: tech.specialite },
    sla: { id: sla.id, detailsResolution: sla.details_resolution, statutSla: sla.statut_sla },
    sousService: { id: sous.id, nom: sous.nom, description: sous.description },
    historiques: db.historique.filter(h => h.ticket_id === t.id).sort((a, b) => b.date_action.localeCompare(a.date_action) || b.id - a.id).map(h => ({ id: h.id, action: h.action, dateAction: h.date_action }))
  };
}

const slaOf = (db: Db, t: TicketRow) => db.sla.find(x => x.id === t.sla_id)!.details_resolution;
/** ORDER BY of findFilteredTicketsBy…: the creation date first, then the SLA deadline, each only when asked for. */
function ordered(db: Db, list: TicketRow[], dateOrder: string | null, slaOrder: string | null) {
  const way = (o: string | null) => o === 'ASC' ? 1 : o === 'DESC' ? -1 : 0;
  return [...list].sort((a, b) => way(dateOrder) * a.date_creation.localeCompare(b.date_creation) || way(slaOrder) * slaOf(db, a).localeCompare(slaOf(db, b)) || a.id - b.id);
}

// ---------------------------------------------------------------- the route table
export function call<T = unknown>(e: Engine, by: string, method: Method, url: string, token: string | null, body?: unknown): Res<T> {
  const c: Ctx = { e, hops: [] };
  const route = url.split('?')[0];
  hop(c, 'proxy', ':4200', L(e, 'proxy.conf.json → ', 'proxy.conf.json → '), { v: `http://127.0.0.1:9090${route}` });
  const res = dispatch(c, method, route, new URLSearchParams(url.split('?')[1] ?? ''), token, body);
  e.traces.unshift({ id: (e.traces[0]?.id ?? 0) + 1, t: e.now(), by, method, path: url, status: res.status, hops: c.hops });
  if (e.traces.length > 60) e.traces.pop();
  return res as Res<T>;
}

/** The time the application believes it is, once the visitor has moved the clock. */
export const clock = (e: Engine) => e.now() + e.skew;
const mark = (e: Engine, table: TableName, id: number) => { e.changed.set(`${table}#${id}`, e.now()); e.lastTable = table; };
const nextId = (rows: { id: number }[]) => rows.reduce((n, r) => Math.max(n, r.id), 0) + 1;

/** An unhandled RuntimeException: Spring answers 500 and hides its message, which only the trace shows here. */
function boom(c: Ctx, message: string): Res {
  bad(c, 'service', SERV, 'RuntimeException: ', { v: message });
  return { status: 500, body: { error: 'Internal Server Error' } };
}
function history(c: Ctx, t: TicketRow, action: string) {
  const { e } = c, row: HistoriqueRow = { id: nextId(e.db.historique), action, date_action: stamp(clock(e)), ticket_id: t.id };
  e.db.historique.push(row);
  mark(e, 'historique', row.id);
  hop(c, 'mysql', REPO, { v: 'INSERT INTO historique' }, ` (ticket ${t.id})`);
}
function alert(c: Ctx, t: TicketRow, type_alerte: TypeAlerte, message: string, utilisateur_id: number) {
  const { e } = c, row: AlerteRow = { id: nextId(e.db.alerte), type_alerte, message, date_emission: stamp(clock(e)), ticket_id: t.id, utilisateur_id };
  e.db.alerte.push(row);
  mark(e, 'alerte', row.id);
  hop(c, 'mysql', REPO, { v: `INSERT INTO alerte (${type_alerte})` }, L(e, ` pour l’utilisateur ${utilisateur_id}`, ` for user ${utilisateur_id}`));
}
function saved(c: Ctx, t: TicketRow, set: string) {
  mark(c.e, 'ticket', t.id);
  hop(c, 'mysql', REPO, { v: `UPDATE ticket SET ${set}` }, ` WHERE id = ${t.id}`);
}
const adminOf = (db: Db, me: TechnicienRow) => db.equipe.find(x => x.id === me.equipe_id)!.administrateur_id;
const findTicket = (e: Engine, id: number) => e.db.ticket.find(t => t.id === id);
/** The check shared by every action on "my" tickets. */
function ownTicket(c: Ctx, me: TechnicienRow, id: number): TicketRow | Res {
  const t = findTicket(c.e, id);
  if (!t) return boom(c, 'Ticket non trouvé');
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE id = ${id}` });
  if (t.technicien_id !== me.id) return boom(c, 'Ce technicien n’est pas assigné à ce ticket');
  hop(c, 'service', SERV, L(c.e, 'le ticket est bien assigné à ce technicien', 'the ticket is assigned to this technician'));
  return t;
}
const isRes = (x: TicketRow | Res): x is Res => 'status' in x && 'body' in x;
/** In the demo, resolving a ticket closes its SLA; reopening it runs the deadline again. */
function settleSla(c: Ctx, t: TicketRow) {
  const { e } = c, sla = e.db.sla.find(x => x.id === t.sla_id)!;
  const next: StatutSla | null = t.status === 'RESOLU' && sla.statut_sla === 'EN_COURS' ? 'RESPECTE' : t.status !== 'RESOLU' && sla.statut_sla === 'RESPECTE' ? 'EN_COURS' : null;
  if (!next) return;
  sla.statut_sla = next;
  mark(e, 'sla', sla.id);
  hop(c, 'mysql', REPO, { v: `UPDATE sla SET statut_sla = '${next}'` }, ` WHERE id = ${sla.id}`);
}

const FILTER_AT = 'JwtAuthFilter';
function dispatch(c: Ctx, method: Method, route: string, query: URLSearchParams, token: string | null, body: unknown): Res {
  const { e } = c;
  if (method === 'POST' && route === '/api/auth/login') return login(c, body as { username: string; password: string });
  const claims = readToken(token);
  if (!claims || claims.exp < e.now()) { bad(c, 'security', FILTER_AT, L(e, 'pas de jeton valide → ', 'no valid token → '), { v: '401 Unauthorized' }); return fail(401, 'Unauthorized'); }
  hop(c, 'security', FILTER_AT, L(e, 'jeton valide, ', 'valid token, '), { v: `sub=${claims.sub}` }, ', ', { v: claims.role });
  if (route.startsWith('/api/techniciens') && claims.role !== 'ROLE_TECHNICIEN') {
    bad(c, 'security', 'SecurityConfig', { v: 'hasRole("TECHNICIEN")' }, L(e, ' refusé → ', ' refused → '), { v: '403 Forbidden' });
    return fail(403, 'Forbidden');
  }
  if (!route.startsWith('/api/techniciens')) return fail(404, 'Not found');
  hop(c, 'security', 'SecurityConfig', { v: '/api/techniciens/**' }, L(e, ' : rôle accepté', ': role accepted'));
  const me = e.db.technicien.find(x => x.id === e.db.utilisateur.find(u => u.username === claims.sub)!.id)!;
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM utilisateur JOIN technicien ' }, { v: `WHERE username = '${claims.sub}'` });

  if (method === 'GET' && route === '/api/techniciens/me') return getMe(c, me, claims.sub);
  if (method === 'GET' && route === '/api/techniciens/dashboard') return dashboard(c, me, Number(query.get('recentTicketLimit') ?? 5));
  if (method === 'GET' && route === '/api/techniciens/my-tickets') return myTickets(c, me);
  if (method === 'GET' && route === '/api/techniciens/my-tickets/filtered') return filtered(c, 'mine', me, query);
  if (method === 'GET' && route === '/api/techniciens/my-tickets/search') return search(c, 'mine', me, query.get('titre') ?? '');
  if (method === 'GET' && route === '/api/techniciens/team/tickets') return teamTickets(c, me);
  if (method === 'GET' && route === '/api/techniciens/team/tickets/filter') return filtered(c, 'team', me, query);
  if (method === 'GET' && route === '/api/techniciens/team/tickets/search') return search(c, 'team', me, query.get('titre') ?? '');
  let m: RegExpMatchArray | null;
  const who = claims.sub;
  if (method === 'GET' && (m = route.match(/\/team\/tickets\/(\d+)$/))) return ticketDetail(c, me, +m[1]);
  if (method === 'GET' && (m = route.match(/\/team\/tickets\/(\d+)\/attachment$/))) return attachment(c, me, +m[1]);
  if (method === 'PUT' && (m = route.match(/\/my-tickets\/(\d+)$/))) return assign(c, me, who, +m[1]);
  if (method === 'POST' && (m = route.match(/\/my-tickets\/(\d+)\/comment$/))) return resolve(c, me, who, +m[1], body as string);
  if (method === 'POST' && (m = route.match(/\/my-tickets\/(\d+)\/escalate$/))) return escalate(c, me, who, +m[1], body as string);
  if (method === 'PATCH' && (m = route.match(/\/my-tickets\/(\d+)\/status$/))) return changeStatus(c, me, +m[1], query.get('status') as Status);
  if (method === 'PATCH' && (m = route.match(/\/my-tickets\/(\d+)\/priority$/))) return changePriority(c, me, +m[1], query.get('priority') as Priorite);
  bad(c, 'controller', CTRL, L(e, 'route inconnue → ', 'unknown route → '), { v: '404' });
  return fail(404, 'Not found');
}

function login(c: Ctx, body: { username: string; password: string }): Res {
  const { e } = c;
  hop(c, 'security', 'SecurityConfig', { v: '/api/auth/**' }, L(e, ' : route publique', ': public route'));
  hop(c, 'controller', 'AuthController', { v: 'authManager.authenticate(…)' });
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM utilisateur ' }, { v: `WHERE username = '${body.username}'` });
  const user = e.db.utilisateur.find(u => u.username === body.username);
  if (!user || user.password !== body.password) { bad(c, 'service', 'BCrypt', L(e, 'mot de passe incorrect → ', 'wrong password → '), { v: '401' }); return { status: 401, body: 'Invalid credentials' }; }
  hop(c, 'service', 'BCrypt', L(e, 'empreinte vérifiée', 'hash verified'));
  const iat = e.now();
  const claims: Claims = { sub: user.username, role: `ROLE_${user.role}`, iat, exp: iat + LIFETIME };
  hop(c, 'controller', 'JwtService', L(e, 'jeton signé, valable 2 h : ', 'token signed, valid for 2 h: '), { v: claims.role });
  return { status: 200, body: { token: `demo.${btoa(JSON.stringify(claims))}`, username: user.username, role: claims.role } satisfies LoginDto };
}

function getMe(c: Ctx, me: TechnicienRow, username: string): Res<MeDto> {
  hop(c, 'controller', CTRL, { v: 'getMe(@AuthenticationPrincipal me)' });
  return { status: 200, body: { id: me.id, username, specialite: me.specialite } };
}

const mine = (db: Db, me: TechnicienRow) => db.ticket.filter(t => t.technicien_id === me.id);
const team = (db: Db, me: TechnicienRow) => db.ticket.filter(t => t.equipe_id === me.equipe_id);

function dashboard(c: Ctx, me: TechnicienRow, limit: number): Res<DashboardDto> {
  const { e } = c, list = mine(e.db, me);
  const count = (s: Status) => list.filter(t => t.status === s).length;
  hop(c, 'controller', CTRL, { v: `getFullTechnicianDashboard(limit=${limit})` });
  hop(c, 'service', SERV, { v: 'countTicketsByTechnicienIdAndStatus' }, L(e, ' pour chaque statut', ' for each status'));
  hop(c, 'mysql', REPO, { d: 'SELECT COUNT(*) FROM ticket ' }, { v: `WHERE technicien_id = ${me.id}` });
  hop(c, 'service', SERV, { v: 'getTicketsByTechnicienSortedBySlaResolution' }, L(e, ' : échéance la plus proche d’abord', ': nearest deadline first'));
  const sorted = ordered(e.db, list, null, 'ASC').slice(0, limit);
  return { status: 200, body: { stats: { total: list.length, inProgress: count('EN_COURS'), escalated: count('ESCALADE'), resolved: count('RESOLU') }, urgentTicket: sorted.map(t => toDto(e.db, t)) } };
}

function myTickets(c: Ctx, me: TechnicienRow): Res<TicketDto[]> {
  const { e } = c, list = mine(e.db, me);
  hop(c, 'controller', CTRL, { v: 'getTicketsAssigned(me)' });
  hop(c, 'service', SERV, { v: 'getTicketsAssignedToTechnicien' });
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE technicien_id = ${me.id}` }, L(e, ` → ${list.length} lignes`, ` → ${list.length} rows`));
  return { status: 200, body: list.map(t => toDto(e.db, t)) };
}

function teamTickets(c: Ctx, me: TechnicienRow): Res<TicketDto[]> {
  const { e } = c, list = team(e.db, me);
  hop(c, 'controller', CTRL, { v: 'getTicketsEquipe(me)' });
  hop(c, 'service', SERV, { v: 'getTicketsByTechnicienEquipe' }, L(e, ' : l’équipe du technicien connecté', ': the signed-in technician’s team'));
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE equipe_id = ${me.equipe_id}` }, L(e, ` → ${list.length} lignes`, ` → ${list.length} rows`));
  return { status: 200, body: list.map(t => toDto(e.db, t)) };
}

function filtered(c: Ctx, scope: 'mine' | 'team', me: TechnicienRow, q: URLSearchParams): Res<TicketDto[]> {
  const { e } = c;
  const status = q.get('status') as Status | null, priority = q.get('priority') as Priorite | null, dateOrder = q.get('dateOrder'), slaOrder = q.get('slaOrder');
  hop(c, 'controller', CTRL, { v: scope === 'mine' ? 'getFilteredTicketsByTechnicien' : 'getFilteredMyTicketsByEquipe' }, L(e, ' : statut et priorité convertis en enum', ': status and priority parsed to enums'));
  const where = [scope === 'mine' ? `technicien_id = ${me.id}` : `equipe_id = ${me.equipe_id}`, status && `status = '${status}'`, priority && `priorite = '${priority}'`].filter(Boolean).join(' AND ');
  const sort = [dateOrder && `date_creation ${dateOrder}`, slaOrder && `details_resolution ${slaOrder}`].filter(Boolean).join(', ');
  const base = scope === 'mine' ? mine(e.db, me) : team(e.db, me);
  const list = ordered(e.db, base.filter(t => (!status || t.status === status) && (!priority || t.priorite === priority)), dateOrder, slaOrder);
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket JOIN sla ' }, { v: `WHERE ${where}${sort ? ` ORDER BY ${sort}` : ''}` }, L(e, ` → ${list.length} lignes`, ` → ${list.length} rows`));
  e.steps.add('filter');
  return { status: 200, body: list.map(t => toDto(e.db, t)) };
}

function search(c: Ctx, scope: 'mine' | 'team', me: TechnicienRow, titre: string): Res<TicketDto[]> {
  const { e } = c, needle = titre.toLowerCase();
  const list = (scope === 'mine' ? mine(e.db, me) : team(e.db, me)).filter(t => t.titre.toLowerCase().includes(needle));
  hop(c, 'controller', CTRL, { v: scope === 'mine' ? 'searchMyTicketsByTitle' : 'searchMyTicketsWithTitleByEquipe' });
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE ${scope === 'mine' ? `technicien_id = ${me.id}` : `equipe_id = ${me.equipe_id}`} AND LOWER(titre) LIKE '%${needle}%'` }, L(e, ` → ${list.length} lignes`, ` → ${list.length} rows`));
  e.steps.add('filter');
  return { status: 200, body: list.map(t => toDto(e.db, t)) };
}

function ticketDetail(c: Ctx, me: TechnicienRow, id: number): Res {
  const { e } = c, t = findTicket(e, id);
  hop(c, 'controller', CTRL, { v: `getTeamTicketDetailById(me, ${id})` });
  if (!t) return boom(c, `Ticket non trouvé avec l’ID: ${id}`);
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE id = ${id}` });
  if (t.equipe_id !== me.equipe_id) return boom(c, 'Accès refusé : le ticket n’est pas assigné à ce technicien ni à son équipe.');
  hop(c, 'service', SERV, L(e, 'le ticket appartient à l’équipe du technicien', 'the ticket belongs to the technician’s team'));
  return { status: 200, body: toDto(e.db, t) };
}

function attachment(c: Ctx, me: TechnicienRow, id: number): Res {
  const { e } = c, t = findTicket(e, id);
  hop(c, 'controller', CTRL, { v: 'downloadAttachmentForTechnician' });
  if (!t || t.equipe_id !== me.equipe_id) return boom(c, 'Accès refusé');
  if (!t.piece_jointe) { bad(c, 'controller', CTRL, { v: '404 No attachment' }); return fail(404, 'No attachment'); }
  hop(c, 'service', 'uploads/', L(e, 'fichier lu sur le disque : ', 'file read from disk: '), { v: t.piece_jointe });
  return { status: 200, body: 'Journal inventé pour la démo.\n08:12 tunnel VPN : échec de la négociation\n08:13 nouvelle tentative\n08:14 échec de la négociation\n' };
}

function assign(c: Ctx, me: TechnicienRow, who: string, id: number): Res {
  const { e } = c, t = findTicket(e, id);
  hop(c, 'controller', CTRL, { v: `assignTicket(me, ${id})` });
  if (!t) return boom(c, `Ticket non trouvé avec l’ID: ${id}`);
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM ticket ' }, { v: `WHERE id = ${id}` });
  if (t.equipe_id !== me.equipe_id) return boom(c, 'Le ticket n’appartient pas à l’équipe du technicien.');
  hop(c, 'service', SERV, L(e, 'même équipe que le technicien', 'same team as the technician'));
  if (t.technicien_id !== null) {
    const owner = e.db.utilisateur.find(u => u.id === t.technicien_id)!;
    return boom(c, `Ce ticket est déjà assigné au technicien ID: ${owner.id} Nom: ${owner.username}`);
  }
  hop(c, 'service', SERV, L(e, 'pas encore assigné', 'not assigned yet'));
  const action = `Ticket assigned to technicien (ID: ${me.id}, NOM: ${who})`;
  t.technicien_id = me.id; t.status = 'EN_COURS';
  history(c, t, action);
  alert(c, t, 'CRITIQUE', action, adminOf(e.db, me));
  saved(c, t, `technicien_id = ${me.id}, status = 'EN_COURS'`);
  e.steps.add('assign');
  return { status: 200, body: null };
}

function resolve(c: Ctx, me: TechnicienRow, who: string, id: number, comment: string): Res {
  const { e } = c;
  hop(c, 'controller', CTRL, { v: `addCommentToTicket(me, ${id}, comment)` });
  const t = ownTicket(c, me, id);
  if (isRes(t)) return t;
  t.commentaire = comment; t.status = 'RESOLU'; t.date_resolution = stamp(clock(e));
  history(c, t, `Ticket est maintenant: RESOLU, avec le commentaire ajouté par le technicien (ID: ${me.id}, NOM: ${who})`);
  settleSla(c, t);
  saved(c, t, `commentaire = '…', status = 'RESOLU', date_resolution = NOW()`);
  e.steps.add('resolve');
  return { status: 200, body: null };
}

function escalate(c: Ctx, me: TechnicienRow, who: string, id: number, comment: string): Res {
  const { e } = c;
  hop(c, 'controller', CTRL, { v: `escalateTicket(me, ${id}, comment)` });
  const t = ownTicket(c, me, id);
  if (isRes(t)) return t;
  t.status = 'ESCALADE'; t.commentaire = comment;
  history(c, t, `Ticket has been escalated by ${who} comment: ${comment}`);
  alert(c, t, 'CRITIQUE', `The ticket ID ${t.id} has been escalated by ${who}`, adminOf(e.db, me));
  settleSla(c, t);
  saved(c, t, `status = 'ESCALADE', commentaire = '…'`);
  e.steps.add('escalate');
  return { status: 200, body: null };
}

function changeStatus(c: Ctx, me: TechnicienRow, id: number, status: Status): Res {
  const { e } = c;
  hop(c, 'controller', CTRL, { v: `changeTicketStatus(me, ${id}, ${status})` });
  const t = ownTicket(c, me, id);
  if (isRes(t)) return t;
  t.status = status;
  history(c, t, `Change ticket status to ${status}`);
  settleSla(c, t);
  saved(c, t, `status = '${status}'`);
  e.steps.add('status');
  return { status: 200, body: null };
}

function changePriority(c: Ctx, me: TechnicienRow, id: number, priority: Priorite): Res {
  const { e } = c;
  hop(c, 'controller', CTRL, { v: `changeTicketPriority(me, ${id}, ${priority})` });
  const t = ownTicket(c, me, id);
  if (isRes(t)) return t;
  t.priorite = priority;
  history(c, t, `Change ticket priority to ${priority}`);
  saved(c, t, `priorite = '${priority}'`);
  e.steps.add('status');
  return { status: 200, body: null };
}

// ---------------------------------------------------------------- the SLA check (SlaAlertServiceImpl.verifierEtGenererAlertes)
/** One pass over the SLAs still running: expired under 0 minutes, critical under 30 minutes, warning under 2 hours. Durations are truncated, as java.time.Duration does. */
export function runSlaCheck(e: Engine) {
  const c: Ctx = { e, hops: [] };
  const AT = 'SlaAlertServiceImpl';
  hop(c, 'service', AT, { v: 'verifierEtGenererAlertes()' });
  hop(c, 'mysql', REPO, { d: 'SELECT … FROM sla' }, L(e, ` → ${e.db.sla.length} lignes`, ` → ${e.db.sla.length} rows`));
  let expired = 0, alerts = 0;
  for (const sla of e.db.sla) {
    if (sla.statut_sla !== 'EN_COURS') continue;
    const t = e.db.ticket.find(x => x.sla_id === sla.id)!;
    const ms = new Date(sla.details_resolution).getTime() - clock(e);
    const minutes = Math.trunc(ms / 60_000), hours = Math.trunc(ms / 3_600_000);
    const tech = t.technicien_id;
    if (minutes < 0) {
      sla.statut_sla = 'EXPIRE'; expired++;
      mark(e, 'sla', sla.id);
      hop(c, 'mysql', REPO, { v: `UPDATE sla SET statut_sla = 'EXPIRE'` }, ` WHERE id = ${sla.id}`);
      if (tech !== null) { alert(c, t, 'CRITIQUE', `Le SLA du ticket ID ${t.id} a expiré !`, tech); alerts++; }
    } else if (minutes < 30 && tech !== null) {
      alert(c, t, 'CRITIQUE', `Le SLA du ticket ID ${t.id} expire bientôt, il reste moins de 30 MINUTES.`, tech); alerts++;
    } else if (hours < 2 && tech !== null) {
      alert(c, t, 'WARNING', `Le SLA du ticket ID ${t.id} expire bientôt.`, tech); alerts++;
    }
  }
  if (!expired && !alerts) hop(c, 'service', AT, L(e, 'aucune échéance proche', 'no deadline is close'));
  e.steps.add('sla');
  e.traces.unshift({ id: (e.traces[0]?.id ?? 0) + 1, t: e.now(), by: 'scheduler', method: 'JOB', path: 'SlaAlertScheduler.run()', status: 200, hops: c.hops });
  if (e.traces.length > 60) e.traces.pop();
  return { expired, alerts };
}
