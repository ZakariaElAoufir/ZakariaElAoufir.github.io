// MEDIGOO replayed in the browser: the Room database (hospital_database2) and the rules of the activities and adapters, copied from the Java code.
// Room is local: admin, doctor and patient share one device and one database, so the demo is one phone that switches accounts.

export type Role = 'Admin' | 'Medecin' | 'Patient';
export type Statut = 'en_attente' | 'confirmé' | 'annulé' | 'terminé';
export type Utilisateur = { id: number; nom: string; prenom: string; telephone: string; email: string; password: string; role: Role; antecedents: string | null; specialite: string | null };
export type Creneau = { id: number; medecin_id: number; date: string; heure_debut: string; heure_fin: string; disponible: boolean };
export type RendezVous = { id: number; patient_id: number; medecin_id: number; creneau_id: number; motif: string | null; statut: Statut; rappel_envoye: boolean };
export type Consultation = { id: number; rendezvous_id: number; note_medecin: string | null; date_consult: string };
export type Notif = { id: number; user_id: number; title: string; message: string; timestamp: number; is_read: boolean; type: string };
export type Db = { Utilisateur: Utilisateur[]; Creneau: Creneau[]; RendezVous: RendezVous[]; Consultation: Consultation[]; notifications: Notif[] };
export type Table = keyof Db;
export type Step = 'book' | 'status' | 'remind' | 'read' | 'slot' | 'admin';
/** One DAO call as Room runs it: the method, its SQL and the bound values. */
export type Query = { id: number; t: number; dao: string; sql: string; args: string[]; write: boolean };

export type Engine = {
  db: Db; log: Query[]; steps: Set<Step>; now: () => number;
  changed: Map<string, number>; gone: { table: Table; row: Record<string, unknown>; t: number }[]; lastTable: Table | null;
  seq: Record<Table, number>;
  /** UserSession.getInstance(): the signed-in user, in memory only */
  session: Utilisateur | null;
  /** POST_NOTIFICATIONS on Android 13+: asked the first time a reminder is sent */
  permission: 'unknown' | 'granted' | 'denied';
};

const DAY = 86_400_000;
const ymd = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const ACCOUNTS = {
  admin: { email: 'admin@hospital.com', password: 'admin123' },
  doctor: { email: 'k.benali@medigoo.ma', password: 'benali2026' },
  patient: { email: 'sara.alaoui@medigoo.ma', password: 'sara2026' }
};

export function createEngine(now: () => number = Date.now): Engine {
  const t = now();
  const d = (n: number) => ymd(t + n * DAY);
  const u = (id: number, prenom: string, nom: string, telephone: string, email: string, password: string, role: Role, antecedents: string | null = null, specialite: string | null = null): Utilisateur =>
    ({ id, nom, prenom, telephone, email, password, role, antecedents, specialite });
  return {
    now, log: [], steps: new Set(), changed: new Map(), gone: [], lastTable: null, session: null, permission: 'unknown',
    db: {
      Utilisateur: [
        // AppDatabase.onCreate seeds this account
        u(1, 'Principal', 'Admin', '0000000000', ACCOUNTS.admin.email, ACCOUNTS.admin.password, 'Admin'),
        u(2, 'Karim', 'Benali', '0612345678', ACCOUNTS.doctor.email, ACCOUNTS.doctor.password, 'Medecin', null, 'Cardiologie'),
        u(3, 'Nadia', 'El Fassi', '0623456789', 'n.elfassi@medigoo.ma', 'nadia2026', 'Medecin', null, 'Pédiatrie'),
        u(4, 'Sara', 'Alaoui', '0634567890', ACCOUNTS.patient.email, ACCOUNTS.patient.password, 'Patient', 'Asthme léger'),
        u(5, 'Omar', 'Tazi', '0645678901', 'omar.tazi@medigoo.ma', 'omar2026', 'Patient')
      ],
      Creneau: [
        { id: 1, medecin_id: 3, date: d(-6), heure_debut: '16:00', heure_fin: '16:30', disponible: false },
        { id: 2, medecin_id: 2, date: d(1), heure_debut: '09:00', heure_fin: '09:30', disponible: true },
        { id: 3, medecin_id: 2, date: d(1), heure_debut: '10:00', heure_fin: '10:30', disponible: false },
        { id: 4, medecin_id: 3, date: d(1), heure_debut: '15:00', heure_fin: '15:30', disponible: true },
        { id: 5, medecin_id: 2, date: d(2), heure_debut: '14:00', heure_fin: '14:30', disponible: true },
        { id: 6, medecin_id: 3, date: d(3), heure_debut: '09:30', heure_fin: '10:00', disponible: true }
      ],
      RendezVous: [
        { id: 1, patient_id: 4, medecin_id: 3, creneau_id: 1, motif: 'Contrôle annuel', statut: 'terminé', rappel_envoye: false },
        { id: 2, patient_id: 5, medecin_id: 2, creneau_id: 3, motif: 'Douleurs thoraciques', statut: 'confirmé', rappel_envoye: false }
      ],
      Consultation: [],
      notifications: []
    },
    seq: { Utilisateur: 5, Creneau: 6, RendezVous: 2, Consultation: 0, notifications: 0 }
  };
}

// ---------------------------------------------------------------- the log of DAO calls
const q = (e: Engine, dao: string, sql: string, args: (string | number | boolean | null)[] = [], write = false) => {
  e.log.unshift({ id: (e.log[0]?.id ?? 0) + 1, t: e.now(), dao, sql, args: args.map(a => a === null ? 'NULL' : typeof a === 'string' ? `'${a}'` : String(a)), write });
  if (e.log.length > 80) e.log.pop();
};
const mark = (e: Engine, table: Table, id: number) => { e.changed.set(`${table}#${id}`, e.now()); e.lastTable = table; };
const drop = (e: Engine, table: Table, row: object) => { e.gone.push({ table, row: { ...row }, t: e.now() }); e.lastTable = table; };
const byId = (e: Engine, id: number) => {
  q(e, 'UtilisateurDao.getById', 'SELECT * FROM Utilisateur WHERE id = ? LIMIT 1', [id]);
  return e.db.Utilisateur.find(x => x.id === id) ?? null;
};
const slotById = (e: Engine, id: number) => {
  q(e, 'CreneauDao.getById', 'SELECT * FROM Creneau WHERE id = ? LIMIT 1', [id]);
  return e.db.Creneau.find(x => x.id === id) ?? null;
};

// ---------------------------------------------------------------- Login, Register (shared)
export function login(e: Engine, email: string, password: string): Utilisateur | 'empty' | null {
  if (!email.trim() || !password.trim()) return 'empty';
  q(e, 'UtilisateurDao.getUserByEmailAndPassword', 'SELECT * FROM utilisateur WHERE email = ? AND password = ? LIMIT 1', [email.trim(), password.trim()]);
  const user = e.db.Utilisateur.find(x => x.email === email.trim() && x.password === password.trim()) ?? null;
  if (user) e.session = user;
  return user;
}
export function logout(e: Engine) { e.session = null; }

/** Register.register(): a new Patient. A second account with the same e-mail breaks the unique index and the app stops. */
export function register(e: Engine, f: { prenom: string; nom: string; telephone: string; email: string; password: string }): 'ok' | 'empty' | 'crash' {
  const v = { prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: f.telephone.trim(), email: f.email.trim(), password: f.password.trim() };
  if (Object.values(v).some(x => !x)) return 'empty';
  q(e, 'UtilisateurDao.insert', 'INSERT INTO `Utilisateur` (`nom`,`prenom`,`telephone`,`email`,`password`,`role`,`antecedents`,`specialite`) VALUES (?,?,?,?,?,?,?,?)', [v.nom, v.prenom, v.telephone, v.email, v.password, 'Patient', null, null], true);
  if (e.db.Utilisateur.some(x => x.email === v.email)) return 'crash';
  const user: Utilisateur = { id: ++e.seq.Utilisateur, ...v, role: 'Patient', antecedents: null, specialite: null };
  e.db.Utilisateur.push(user); mark(e, 'Utilisateur', user.id);
  return 'ok';
}

// ---------------------------------------------------------------- patient
/** Dashboard_Patient: the LiveData count behind the badge */
export function unreadCount(e: Engine, userId: number, log = true) {
  if (log) q(e, 'NotificationDao.getUnreadCount', 'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return e.db.notifications.filter(n => n.user_id === userId && !n.is_read).length;
}

export type Offer = { creneau: Creneau; medecin: Utilisateur | null };
/** AppointmentActivity.loadCreneaux(): every free slot, with its doctor fetched once */
export function availableSlots(e: Engine): Offer[] {
  q(e, 'CreneauDao.getAll', 'SELECT * FROM Creneau');
  const seen = new Map<number, Utilisateur | null>();
  return e.db.Creneau.filter(c => c.disponible).map(c => {
    if (!seen.has(c.medecin_id)) seen.set(c.medecin_id, byId(e, c.medecin_id));
    return { creneau: { ...c }, medecin: seen.get(c.medecin_id)! };
  });
}

/** CreneauDisponibleAdapter.createAppointment(): checks the slot again, then one transaction */
export function book(e: Engine, patient: Utilisateur, creneauId: number, motif: string): 'ok' | 'taken' {
  const current = slotById(e, creneauId)!;
  if (!current.disponible) return 'taken';
  const rdv: RendezVous = { id: ++e.seq.RendezVous, patient_id: patient.id, medecin_id: current.medecin_id, creneau_id: creneauId, motif: motif.trim() || null, statut: 'confirmé', rappel_envoye: false };
  q(e, 'RoomDatabase.runInTransaction', 'BEGIN TRANSACTION', [], true);
  q(e, 'RendezVousDao.insert', 'INSERT INTO `RendezVous` (`patient_id`,`medecin_id`,`creneau_id`,`motif`,`statut`,`rappel_envoye`) VALUES (?,?,?,?,?,?)', [rdv.patient_id, rdv.medecin_id, rdv.creneau_id, rdv.motif, rdv.statut, 0], true);
  e.db.RendezVous.push(rdv); mark(e, 'RendezVous', rdv.id);
  current.disponible = false;
  q(e, 'CreneauDao.update', 'UPDATE `Creneau` SET `id` = ?,`medecin_id` = ?,`date` = ?,`heure_debut` = ?,`heure_fin` = ?,`disponible` = ? WHERE `id` = ?',
    [current.id, current.medecin_id, current.date, current.heure_debut, current.heure_fin, 0, current.id], true);
  mark(e, 'Creneau', current.id);
  q(e, 'RoomDatabase.runInTransaction', 'COMMIT', [], true);
  e.steps.add('book');
  return 'ok';
}

export type AppointmentView = { rdv: RendezVous; other: Utilisateur | null; creneau: Creneau | null };
/** AppointmentHistoryActivity / AppointmentAdapter: newest slot first, doctor and slot fetched per row */
export function patientAppointments(e: Engine, patientId: number): AppointmentView[] {
  q(e, 'RendezVousDao.getByPatientId', 'SELECT * FROM RendezVous WHERE patient_id = ? ORDER BY creneau_id DESC', [patientId]);
  return e.db.RendezVous.filter(r => r.patient_id === patientId).sort((a, b) => b.creneau_id - a.creneau_id)
    .map(r => ({ rdv: { ...r }, other: byId(e, r.medecin_id), creneau: slotById(e, r.creneau_id) }));
}

export function notificationsOf(e: Engine, userId: number): Notif[] {
  q(e, 'NotificationDao.getNotificationsByUserSync', 'SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC', [userId]);
  return e.db.notifications.filter(n => n.user_id === userId).sort((a, b) => b.timestamp - a.timestamp).map(n => ({ ...n }));
}
export function markRead(e: Engine, id: number) {
  q(e, 'NotificationDao.markAsRead', 'UPDATE notifications SET is_read = 1 WHERE id = ?', [id], true);
  const n = e.db.notifications.find(x => x.id === id);
  if (n && !n.is_read) { n.is_read = true; mark(e, 'notifications', id); e.steps.add('read'); }
}

/** Profile_Patient / Profile_Medecin / Admin_Update_Users: @Update writes the whole row */
export function updateUser(e: Engine, user: Utilisateur) {
  const row = e.db.Utilisateur.find(x => x.id === user.id);
  if (!row) return;
  Object.assign(row, user);
  q(e, 'UtilisateurDao.update', 'UPDATE `Utilisateur` SET `id` = ?,`nom` = ?,`prenom` = ?,`telephone` = ?,`email` = ?,`password` = ?,`role` = ?,`antecedents` = ?,`specialite` = ? WHERE `id` = ?',
    [row.id, row.nom, row.prenom, row.telephone, row.email, row.password, row.role, row.antecedents, row.specialite, row.id], true);
  mark(e, 'Utilisateur', row.id);
  if (e.session?.id === row.id) e.session = { ...row };
}

// ---------------------------------------------------------------- doctor
export function doctorSlots(e: Engine, medecinId: number): Creneau[] {
  q(e, 'CreneauDao.getByMedecinId', 'SELECT * FROM Creneau WHERE medecin_id = ?', [medecinId]);
  return e.db.Creneau.filter(c => c.medecin_id === medecinId).map(c => ({ ...c }));
}
export function addSlot(e: Engine, medecinId: number, date: string, debut: string, fin: string): boolean {
  if (!date.trim() || !debut.trim() || !fin.trim()) return false;
  const c: Creneau = { id: ++e.seq.Creneau, medecin_id: medecinId, date: date.trim(), heure_debut: debut.trim(), heure_fin: fin.trim(), disponible: true };
  q(e, 'CreneauDao.insert', 'INSERT INTO `Creneau` (`medecin_id`,`date`,`heure_debut`,`heure_fin`,`disponible`) VALUES (?,?,?,?,?)', [medecinId, c.date, c.heure_debut, c.heure_fin, 1], true);
  e.db.Creneau.push(c); mark(e, 'Creneau', c.id); e.steps.add('slot');
  return true;
}
export function editSlot(e: Engine, c: Creneau) {
  const row = e.db.Creneau.find(x => x.id === c.id);
  if (!row) return;
  Object.assign(row, { date: c.date.trim(), heure_debut: c.heure_debut.trim(), heure_fin: c.heure_fin.trim(), disponible: c.disponible });
  q(e, 'CreneauDao.update', 'UPDATE `Creneau` SET `id` = ?,`medecin_id` = ?,`date` = ?,`heure_debut` = ?,`heure_fin` = ?,`disponible` = ? WHERE `id` = ?',
    [row.id, row.medecin_id, row.date, row.heure_debut, row.heure_fin, row.disponible ? 1 : 0, row.id], true);
  mark(e, 'Creneau', row.id); e.steps.add('slot');
}
export function deleteSlot(e: Engine, id: number) {
  const row = e.db.Creneau.find(x => x.id === id);
  if (!row) return;
  q(e, 'CreneauDao.delete', 'DELETE FROM `Creneau` WHERE `id` = ?', [id], true);
  e.db.Creneau = e.db.Creneau.filter(x => x !== row); drop(e, 'Creneau', row);
  cascadeFromSlots(e, [id]);
  e.steps.add('slot');
}

/** Medecin_RendezVous / RendezVousAdapter: newest slot first, patient and slot fetched per row */
export function doctorAppointments(e: Engine, medecinId: number): AppointmentView[] {
  q(e, 'RendezVousDao.getByMedecinId', 'SELECT * FROM RendezVous WHERE medecin_id = ? ORDER BY creneau_id DESC', [medecinId]);
  return e.db.RendezVous.filter(r => r.medecin_id === medecinId).sort((a, b) => b.creneau_id - a.creneau_id)
    .map(r => ({ rdv: { ...r }, other: byId(e, r.patient_id), creneau: slotById(e, r.creneau_id) }));
}
export function setStatus(e: Engine, rdvId: number, statut: Statut) {
  const row = e.db.RendezVous.find(x => x.id === rdvId);
  if (!row) return;
  row.statut = statut;
  q(e, 'RendezVousDao.update', 'UPDATE `RendezVous` SET `id` = ?,`patient_id` = ?,`medecin_id` = ?,`creneau_id` = ?,`motif` = ?,`statut` = ?,`rappel_envoye` = ? WHERE `id` = ?',
    [row.id, row.patient_id, row.medecin_id, row.creneau_id, row.motif, row.statut, row.rappel_envoye ? 1 : 0, row.id], true);
  mark(e, 'RendezVous', row.id); e.steps.add('status');
}
/** RendezVousAdapter.sendNotificationToPatient(): an in-app notification row, then the Android notification */
export function sendReminder(e: Engine, patient: Utilisateur, medecin: Utilisateur, creneau: Creneau): Notif {
  const n: Notif = {
    id: ++e.seq.notifications, user_id: patient.id, title: 'Rappel de rendez-vous', type: 'rendezvous_rappel', timestamp: e.now(), is_read: false,
    message: `Bonjour ${patient.prenom},\nVotre rendez-vous avec Dr. ${medecin.nom} est prévu le ${frDate(creneau.date, 'short')} à ${creneau.heure_debut}.\nMerci de votre confiance.`
  };
  q(e, 'NotificationDao.insert', 'INSERT INTO `notifications` (`user_id`,`title`,`message`,`timestamp`,`is_read`,`type`) VALUES (?,?,?,?,?,?)', [n.user_id, n.title, n.message.replace(/\n/g, '\\n'), n.timestamp, 0, n.type], true);
  e.db.notifications.push(n); mark(e, 'notifications', n.id); e.steps.add('remind');
  return { ...n };
}

// ---------------------------------------------------------------- admin
export function allUsers(e: Engine): Utilisateur[] {
  q(e, 'UtilisateurDao.getAllUsres', 'SELECT * FROM Utilisateur');
  return e.db.Utilisateur.map(x => ({ ...x }));
}
export function adminAdd(e: Engine, f: Omit<Utilisateur, 'id'>): 'ok' | 'empty' | 'crash' {
  const req = [f.prenom, f.nom, f.telephone, f.email, f.password].map(x => x.trim());
  if (req.some(x => !x)) return 'empty';
  q(e, 'UtilisateurDao.insert', 'INSERT INTO `Utilisateur` (`nom`,`prenom`,`telephone`,`email`,`password`,`role`,`antecedents`,`specialite`) VALUES (?,?,?,?,?,?,?,?)', [f.nom, f.prenom, f.telephone, f.email, f.password, f.role, f.antecedents, f.specialite], true);
  if (e.db.Utilisateur.some(x => x.email === f.email.trim())) return 'crash';
  const user: Utilisateur = { ...f, id: ++e.seq.Utilisateur, prenom: req[0], nom: req[1], telephone: req[2], email: req[3], password: req[4] };
  e.db.Utilisateur.push(user); mark(e, 'Utilisateur', user.id); e.steps.add('admin');
  return 'ok';
}
export function adminUpdate(e: Engine, user: Utilisateur) { updateUser(e, user); e.steps.add('admin'); }
/** CRUD_Admin.OnDelete(): the foreign keys cascade to slots, appointments and notifications */
export function adminDelete(e: Engine, id: number) {
  const row = byId(e, id);
  if (!row) return;
  q(e, 'UtilisateurDao.delete', 'DELETE FROM `Utilisateur` WHERE `id` = ?', [id], true);
  e.db.Utilisateur = e.db.Utilisateur.filter(x => x !== row); drop(e, 'Utilisateur', row);
  const slots = e.db.Creneau.filter(c => c.medecin_id === id);
  slots.forEach(c => drop(e, 'Creneau', c));
  e.db.Creneau = e.db.Creneau.filter(c => c.medecin_id !== id);
  const rdvs = e.db.RendezVous.filter(r => r.patient_id === id || r.medecin_id === id);
  rdvs.forEach(r => drop(e, 'RendezVous', r));
  e.db.RendezVous = e.db.RendezVous.filter(r => !rdvs.includes(r));
  cascadeFromSlots(e, slots.map(s => s.id));
  e.db.notifications.filter(n => n.user_id === id).forEach(n => drop(e, 'notifications', n));
  e.db.notifications = e.db.notifications.filter(n => n.user_id !== id);
  if (e.lastTable !== 'Utilisateur') e.lastTable = 'Utilisateur';
  e.steps.add('admin');
}
function cascadeFromSlots(e: Engine, ids: number[]) {
  const rdvs = e.db.RendezVous.filter(r => ids.includes(r.creneau_id));
  rdvs.forEach(r => drop(e, 'RendezVous', r));
  e.db.RendezVous = e.db.RendezVous.filter(r => !rdvs.includes(r));
}

// ---------------------------------------------------------------- formats used by the adapters (Locale.FRENCH)
/** 'long': "EEEE d MMMM yyyy" (history), 'week': "EEE d MMM yyyy" (doctor's slots), 'short': "dd/MM/yyyy" */
export function frDate(s: string, style: 'long' | 'week' | 'short'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s; // ParseException: the raw text is shown
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (style === 'short') return `${m[3]}/${m[2]}/${m[1]}`;
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', o).format(d);
  return style === 'long'
    ? `${f({ weekday: 'long' })} ${d.getDate()} ${f({ month: 'long' })} ${d.getFullYear()}`
    : `${f({ weekday: 'short' })} ${d.getDate()} ${f({ month: 'short' })} ${d.getFullYear()}`;
}
export const STATUTS: Statut[] = ['en_attente', 'confirmé', 'annulé', 'terminé'];
export const STATUT_LABEL: Record<Statut, string> = { en_attente: 'En attente', confirmé: 'Confirmé', annulé: 'Annulé', terminé: 'Terminé' };
export const isoDay = ymd;
