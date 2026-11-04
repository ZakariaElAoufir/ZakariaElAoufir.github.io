import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  ACCOUNTS, addSlot, adminAdd, adminDelete, adminUpdate, allUsers, availableSlots, book, createEngine, deleteSlot, doctorAppointments, doctorSlots,
  editSlot, frDate, isoDay, login, logout, markRead, notificationsOf, patientAppointments, register, sendReminder, setStatus, STATUT_LABEL, STATUTS,
  unreadCount, updateUser,
  type AppointmentView, type Creneau, type Engine, type Notif, type Offer, type Role, type Statut, type Step, type Table, type Utilisateur
} from './logic';
import { strings, type DemoStrings } from './strings';
import corridor from '../media/corridor.jpg';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
type Screen =
  | { s: 'login' } | { s: 'register' }
  | { s: 'pDash' } | { s: 'pBook'; offers: Offer[] } | { s: 'pHistory'; list: AppointmentView[] } | { s: 'pNotifs'; list: Notif[] } | { s: 'pProfile'; form: Utilisateur; pw: string }
  | { s: 'dDash' } | { s: 'dSlots'; list: Creneau[] } | { s: 'dAddSlot'; date: string; debut: string; fin: string } | { s: 'dEditSlot'; slot: Creneau }
  | { s: 'dRdv'; list: AppointmentView[]; picked: Record<number, Statut> } | { s: 'dProfile'; form: Utilisateur }
  | { s: 'aDash' } | { s: 'aUsers'; list: Utilisateur[] } | { s: 'aAdd'; form: Utilisateur } | { s: 'aEdit'; form: Utilisateur };
type Dialog =
  | { kind: 'book'; offer: Offer; motif: string }
  | { kind: 'confirm'; title: string; text: string; ok: () => void }
  | { kind: 'permission'; then: () => void }
  | { kind: 'crash' } | null;
type Phone = {
  stack: Screen[]; home: boolean; dialog: Dialog;
  form: { email: string; password: string; prenom: string; nom: string; telephone: string };
  toast: { text: string; until: number } | null;
  heads: { title: string; text: string; until: number } | null;
  shade: Notif[];
};

const FRESH = 1700;
const STEPS: Step[] = ['book', 'status', 'remind', 'read', 'slot', 'admin'];
const TABLES: Table[] = ['Utilisateur', 'Creneau', 'RendezVous', 'Consultation', 'notifications'];
const COLS: Record<Table, string[]> = {
  Utilisateur: ['id', 'nom', 'prenom', 'telephone', 'email', 'password', 'role', 'antecedents', 'specialite'],
  Creneau: ['id', 'medecin_id', 'date', 'heure_debut', 'heure_fin', 'disponible'],
  RendezVous: ['id', 'patient_id', 'medecin_id', 'creneau_id', 'motif', 'statut', 'rappel_envoye'],
  Consultation: ['id', 'rendezvous_id', 'note_medecin', 'date_consult'],
  notifications: ['id', 'user_id', 'title', 'message', 'timestamp', 'is_read', 'type']
};
const pad = (n: number) => String(n).padStart(2, '0');
const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const blankUser = (): Utilisateur => ({ id: 0, nom: '', prenom: '', telephone: '', email: '', password: '', role: 'Admin', antecedents: '', specialite: '' });
const newPhone = (): Phone => ({ stack: [{ s: 'login' }], home: false, dialog: null, form: { email: '', password: '', prenom: '', nom: '', telephone: '' }, toast: null, heads: null, shade: [] });

// ---- the app's vector drawables (res/drawable)
const P = {
  account: 'M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,5c1.66,0 3,1.34 3,3s-1.34,3 -3,3 -3,-1.34 -3,-3 1.34,-3 3,-3zM12,19.2c-2.5,0 -4.71,-1.28 -6,-3.22 0.03,-1.99 4,-3.08 6,-3.08 1.99,0 5.97,1.09 6,3.08 -1.29,1.94 -3.5,3.22 -6,3.22z',
  calendar: 'M19,3h-1V1h-2v2H8V1H6v2H5c-1.11,0,-2,0.9,-2,2v14c0,1.1 0.89,2 2,2h14c1.1,0 2,-0.9 2,-2V5c0,-1.1,-0.9,-2,-2,-2zM19,19H5V8h14v11zM9,10H7v2h2v-2zM13,10h-2v2h2v-2zM17,10h-2v2h2v-2zM9,14H7v2h2v-2zM13,14h-2v2h2v-2z',
  history: 'M13,3c-4.97,0,-9,4.03,-9,9H1l3.89,3.89 0.07,0.14L9,12H6c0,-3.87 3.13,-7 7,-7s7,3.13 7,7,-3.13,7,-7,7c-1.93,0,-3.68,-0.79,-4.94,-2.06l-1.42,1.42C8.27,19.99 10.51,21 13,21c4.97,0 9,-4.03 9,-9s-4.03,-9,-9,-9zM12,8v5l4.28,2.54 0.72,-1.21,-3.5,-2.08V8H12z',
  bell: 'M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zm6,-6v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z',
  schedule: 'M11.99,2C6.47,2 2,6.48 2,12s4.47,10 10,10 10,-4.48 10,-10S17.52,2 11.99,2zM12,20c-4.42,0 -8,-3.58 -8,-8s3.58,-8 8,-8 8,3.58 8,8 -3.58,8 -8,8zM12.5,7H11v6l5.25,3.15 0.75,-1.23 -4.5,-2.67z',
  calendarCheck: 'M19,3h-1V1h-2v2H8V1H6v2H5c-1.11,0 -2,0.9 -2,2v14c0,1.1 0.89,2 2,2h14c1.1,0 2,-0.9 2,-2V5c0,-1.1 -0.9,-2 -2,-2zM19,19H5V8h14v11zM17.53,7.03l-1.06,-1.06 -6.13,6.13 -2.47,-2.47 -1.06,1.06 3.53,3.53z',
  medical: 'M19,8h-1V3H6v5H5c-1.66,0 -3,1.34 -3,3v6h4v4h12v-4h4v-6c0,-1.66 -1.34,-3 -3,-3zM8,5h8v3H8V5z',
  clock: 'M12,2C6.5,2 2,6.5 2,12s4.5,10 10,10 10,-4.5 10,-10S17.5,2 12,2zM12,20c-4.4,0 -8,-3.6 -8,-8s3.6,-8 8,-8 8,3.6 8,8 -3.6,8 -8,8zM12.5,7H11v6l5.2,3.2 0.8,-1.3 -4.5,-2.7V7z',
  edit: 'M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z',
  del: 'M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6v12zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z',
  add: 'M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  back: 'M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z',
  email: 'M20,4L4,4c-1.1,0 -1.99,0.9 -1.99,2L2,18c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2L22,6c0,-1.1 -0.9,-2 -2,-2zM20,8l-8,5 -8,-5L4,6l8,5 8,-5v2z',
  key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  person: 'M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10s10,-4.48 10,-10S17.52,2 12,2zM12,6c1.93,0 3.5,1.57 3.5,3.5S13.93,13 12,13s-3.5,-1.57 -3.5,-3.5S10.07,6 12,6zM12,20c-2.03,0 -4.43,-0.82 -6.14,-2.88C7.55,15.8 9.68,15 12,15s4.45,0.8 6.14,2.12C16.43,19.18 14.03,20 12,20z',
  phone: 'M6.62,10.79c1.44,2.83 3.76,5.14 6.59,6.59l2.2,-2.2c0.27,-0.27 0.67,-0.36 1.02,-0.24 1.12,0.37 2.33,0.57 3.57,0.57 0.55,0 1,0.45 1,1V20c0,0.55 -0.45,1 -1,1 -9.39,0 -17,-7.61 -17,-17 0,-0.55 0.45,-1 1,-1h3.5c0.55,0 1,0.45 1,1 0,1.25 0.2,2.45 0.57,3.57 0.11,0.35 0.03,0.74 -0.25,1.02l-2.2,2.2z',
  check: 'M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z',
  close: 'M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z',
  admin: 'M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55-.69-.98-1.1-2.17-1.1-3.45 0-3.31 2.69-6 6-6zm0 2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 1.38c.62 0 1.12.51 1.12 1.12s-.51 1.12-1.12 1.12-1.12-.51-1.12-1.12.5-1.12 1.12-1.12zm0 5.37c-.93 0-1.74-.46-2.24-1.17.05-.72 1.51-1.08 2.24-1.08s2.19.36 2.24 1.08c-.5.71-1.31 1.17-2.24 1.17z'
};
const Ic = ({ d, className }: { d: keyof typeof P; className?: string }) => <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d={P[d]} /></svg>;
const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;

/** MEDIGOO on one Android emulator, with Android Studio's Database Inspector beside it. */
export default function MedigooDemo({ lang }: Props) {
  const t = strings[lang];
  // the world holds clocks: it is built in the browser only, so the server's HTML never disagrees with it
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; ph: Phone } | null>(null);
  if (ready && !world.current) world.current = { e: createEngine(), ph: newPhone() };
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [table, setTable] = useState<Table>('RendezVous');
  const [followW, setFollowW] = useState(true);
  const [full, setFull] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => { const id = setInterval(refresh, 15000); return () => clearInterval(id); }, []);
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      const ph = world.current?.ph;
      if (ph?.dialog && ph.dialog.kind !== 'crash') { ph.dialog = null; refresh(); } else setFull(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  if (!world.current) return <div className="md"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, ph } = world.current;

  /** Runs an action, repaints, and lets the Database Inspector follow the table that was written. */
  const act = (fn: () => void) => {
    const before = e.log[0]?.id;
    fn();
    if (e.log[0]?.id !== before && e.lastTable && followW) setTable(e.lastTable);
    refresh();
    setTimeout(refresh, FRESH + 50);
  };
  const toast = (text: string, long = false) => {
    ph.toast = { text, until: Date.now() + (long ? 3500 : 2000) };
    refresh();
    setTimeout(refresh, long ? 3550 : 2050);
  };
  const me = () => e.session!;

  /** What each activity does in onCreate / onResume: read the database again. */
  const load = (sc: Screen): Screen => {
    const u = e.session;
    switch (sc.s) {
      case 'pDash': if (u) unreadCount(e, u.id); return sc;
      case 'pBook': return { s: 'pBook', offers: availableSlots(e) };
      case 'pHistory': return { s: 'pHistory', list: patientAppointments(e, u!.id) };
      case 'pNotifs': {
        const list = u ? notificationsOf(e, u.id) : [];
        if (!list.length) toast('Aucune notification disponible', true);
        return { s: 'pNotifs', list };
      }
      case 'dSlots': return { s: 'dSlots', list: doctorSlots(e, u!.id) };
      case 'dRdv': {
        const list = doctorAppointments(e, u!.id);
        if (!list.length) toast('Aucun rendez-vous trouvé');
        return { s: 'dRdv', list, picked: {} };
      }
      case 'aUsers': return { s: 'aUsers', list: allUsers(e) };
      default: return sc;
    }
  };
  const top = () => ph.stack[ph.stack.length - 1];
  const go = (sc: Screen) => act(() => { ph.stack.push(load(sc)); ph.home = false; });
  const replace = (sc: Screen) => act(() => { ph.stack[ph.stack.length - 1] = load(sc); });
  const only = (sc: Screen) => act(() => { ph.stack = [load(sc)]; ph.home = false; });
  /** finish(): the previous activity comes back and runs onResume */
  const finish = () => act(() => {
    ph.stack.pop();
    if (!ph.stack.length) { ph.home = true; return; }
    const prev = top();
    if (['pDash', 'pNotifs', 'dRdv', 'dSlots', 'aUsers'].includes(prev.s)) ph.stack[ph.stack.length - 1] = load(prev);
  });
  const back = () => { if (ph.dialog) { if (ph.dialog.kind !== 'crash') { ph.dialog = null; refresh(); } return; } if (!ph.home) finish(); };

  const dashOf = (role: Role): Screen => role === 'Patient' ? { s: 'pDash' } : role === 'Admin' ? { s: 'aDash' } : { s: 'dDash' };
  const signIn = () => act(() => {
    const r = login(e, ph.form.email, ph.form.password);
    if (r === 'empty') return toast('Veuillez remplir tous les champs');
    if (!r) return toast('Identifiants incorrects');
    toast(`Connexion réussie ! Bienvenue ${r.nom}`);
    ph.form.email = ph.form.password = '';
    ph.stack = [load(dashOf(r.role))];
  });
  const signUp = () => act(() => {
    const r = register(e, ph.form);
    if (r === 'empty') return toast('Veuillez remplir tous les champs');
    if (r === 'crash') { ph.dialog = { kind: 'crash' }; return; }
    toast('Inscription réussie !');
    ph.form = { email: '', password: '', prenom: '', nom: '', telephone: '' };
    ph.stack.push({ s: 'login' });
  });
  /** the buttons above the phone: sign out, then fill in the login form of that account */
  const as = (who: keyof typeof ACCOUNTS) => act(() => {
    logout(e);
    ph.dialog = null; ph.home = false;
    ph.stack = [{ s: 'login' }];
    ph.form = { ...ph.form, ...ACCOUNTS[who] };
  });
  const reset = () => { world.current = { e: createEngine(), ph: newPhone() }; setTable('RendezVous'); refresh(); };

  // ---- the doctor's reminder: Room row, then the Android notification (asks for the permission the first time)
  const remind = (v: AppointmentView) => act(() => {
    const doctor = me();
    if (!v.other || !v.creneau) return toast("Impossible d'envoyer la notification");
    const n = sendReminder(e, v.other, doctor, v.creneau);
    toast(`Notification envoyée à ${v.other.prenom}`);
    if (e.permission === 'granted') post(n);
    else if (e.permission === 'unknown') ph.dialog = { kind: 'permission', then: () => {} };
  });
  const post = (n: Notif) => {
    ph.heads = { title: n.title, text: n.message, until: Date.now() + 5000 };
    ph.shade.unshift(n);
    setTimeout(refresh, 5050);
  };

  const ctx: Ctx = { e, ph, t, act, go, replace, only, finish, toast, me, signIn, signUp, remind, top, refresh };
  const now = Date.now();
  const sc = top();
  const rows = [...(e.db[table] as unknown as Record<string, unknown>[])].sort((a, b) => Number(a.id) - Number(b.id));
  const gone = e.gone.filter(g => g.table === table && now - g.t < FRESH);

  return (
    <div className="md">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="title"><i style={{ ['--logo' as string]: 'url(/logos/android.svg)' }} />{t.title}</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>
          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <span className="hint">{t.hint}</span>
            <span className="accts">{t.accounts}
              <button className="btn small ghost" onClick={() => as('patient')}>{t.patient}</button>
              <button className="btn small ghost" onClick={() => as('doctor')}>{t.doctor}</button>
              <button className="btn small ghost" onClick={() => as('admin')}>{t.admin}</button>
            </span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="stage">
            <div className="device">
              <p>{t.device}</p>
              <div className="phone">
                <div className="scr">
                  <div className={`sbar${sc.s === 'login' || sc.s === 'register' || ph.home ? ' over' : ''}`}><span>{clock()}</span>{ph.shade.length > 0 && <Ic d="medical" className="nicon" />}<span className="sp" /><i className="wifi" /><i className="bat" /></div>
                  <div className="app">
                    {ph.home ? <Home ctx={ctx} /> : <ScreenView ctx={ctx} sc={sc} />}
                  </div>
                  {ph.heads && ph.heads.until > now && (
                    <button className="heads" onClick={() => { ph.heads = null; only({ s: 'pNotifs', list: [] }); }}>
                      <span className="app-l"><Ic d="medical" /> Project__controle_Hopital · {lang === 'fr' ? 'maintenant' : 'now'}</span>
                      <b>{ph.heads.title}</b><span className="msg">{ph.heads.text}</span>
                    </button>
                  )}
                  {ph.dialog && <DialogView ctx={ctx} d={ph.dialog} />}
                  {ph.toast && ph.toast.until > now && <div className="toast">{ph.toast.text}</div>}
                  <nav className="nbar">
                    <button aria-label={t.back} onClick={back}><svg viewBox="0 0 24 24"><path d="M16 4 7 12l9 8" /></svg></button>
                    <button aria-label={t.home} onClick={() => { if (!ph.dialog) { ph.home = true; refresh(); } }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /></svg></button>
                    <button aria-label={t.recents} onClick={() => {}}><svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg></button>
                  </nav>
                </div>
              </div>
            </div>

            {/* ---------- Android Studio: App Inspection > Database Inspector ---------- */}
            <section className="as" aria-label={t.inspector}>
              <div className="as-top"><i style={{ ['--logo' as string]: 'url(/logos/android.svg)' }} /><b>App Inspection</b><span>{t.inspector}</span><span className="proc">com.example.project__controle_hopital</span></div>
              <div className="as-main">
                <aside className="as-tree">
                  <p className="dbname"><i style={{ ['--logo' as string]: 'url(/logos/database.svg)' }} />hospital_database2</p>
                  {TABLES.map(name => (
                    <button key={name} className={`${name === table ? 'on' : ''}${e.lastTable === name && e.log[0] && now - e.log[0].t < 1000 ? ' hit' : ''}`}
                      onClick={() => { setTable(name); setFollowW(false); }}>
                      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v10H2zM2 6.5h12M2 10h12M6 3v10" /></svg>{name}<small>{e.db[name].length}</small>
                    </button>
                  ))}
                </aside>
                <div className="as-grid">
                  <div className="as-bar">
                    <b>{table}</b><span>{rows.length} {t.rows}</span>
                    <label><input type="checkbox" checked readOnly /> {t.live}</label>
                    <label><input type="checkbox" checked={followW} onChange={ev => setFollowW(ev.target.checked)} /> {t.follow}</label>
                  </div>
                  <div className="dbgrid">
                    <table>
                      <thead><tr>{COLS[table].map(c => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {rows.map(r => <tr key={String(r.id)} className={now - (e.changed.get(`${table}#${r.id}`) ?? 0) < FRESH ? 'new' : ''}>{COLS[table].map(c => <Cell key={c} v={r[c]} />)}</tr>)}
                        {gone.map((g, i) => <tr key={`g${i}`} className="gone">{COLS[table].map(c => <Cell key={c} v={g.row[c]} />)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="as-log">
                <h4>{t.queries}<span>androidx.room</span></h4>
                <ol>
                  {!e.log.length && <li className="none">{t.noQuery}</li>}
                  {e.log.map(l => (
                    <li key={l.id} className={`${l.write ? 'w ' : ''}${now - l.t < 1400 ? 'new' : ''}`}>
                      <time>{new Date(l.t).toTimeString().slice(0, 8)}</time>
                      <span className="dao">{l.dao}</span>
                      <code>{l.sql}{l.args.length > 0 && <s> [{l.args.join(', ')}]</s>}</code>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>
        </div>
      </div>

      <section className="try">
        <h2>{t.tryTitle}</h2>
        <p>{t.tryLead}</p>
        <ol className="steps">
          {STEPS.map(s => <li key={s} className={e.steps.has(s) ? 'done' : ''}><h3><i />{t.steps[s][0]}</h3><p>{t.steps[s][1]}</p></li>)}
        </ol>
        <p className="note">{t.note[0]}<b>{t.note[1]}</b>{t.note[2]}<b>{t.note[3]}</b>{t.note[4]}</p>
      </section>
    </div>
  );
}

function Cell({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '') return <td className="null">{v === '' ? '' : 'NULL'}</td>;
  if (typeof v === 'boolean') return <td className="n">{v ? 1 : 0}</td>;
  if (typeof v === 'number') return <td className="n">{v}</td>;
  return <td title={String(v)}>{String(v).replace(/\n/g, ' ')}</td>;
}

// ======================================================================
// the phone: one component per activity, same layouts and words
// ======================================================================
type Ctx = {
  e: Engine; ph: Phone; t: DemoStrings; act: (fn: () => void) => void; go: (s: Screen) => void; replace: (s: Screen) => void; only: (s: Screen) => void;
  finish: () => void; toast: (text: string, long?: boolean) => void; me: () => Utilisateur; signIn: () => void; signUp: () => void;
  remind: (v: AppointmentView) => void; top: () => Screen; refresh: () => void;
};

function Home({ ctx }: { ctx: Ctx }) {
  const { ph } = ctx;
  return (
    <div className="home">
      <div className="clockbig">{clock()}</div>
      <button className="launcher" onClick={() => { ph.home = false; if (!ph.stack.length) ph.stack = [{ s: 'login' }]; ctx.refresh(); }}>
        <span className="ico"><Ic d="medical" /></span>Project__c…
      </button>
    </div>
  );
}

function ScreenView({ ctx, sc }: { ctx: Ctx; sc: Screen }) {
  switch (sc.s) {
    case 'login': case 'register': return <Auth ctx={ctx} register={sc.s === 'register'} />;
    case 'pDash': return <Dash ctx={ctx} who="p" />;
    case 'dDash': return <Dash ctx={ctx} who="d" />;
    case 'aDash': return <AdminDash ctx={ctx} />;
    case 'pBook': return <Book ctx={ctx} offers={sc.offers} />;
    case 'pHistory': return <History ctx={ctx} list={sc.list} />;
    case 'pNotifs': return <Notifs ctx={ctx} list={sc.list} />;
    case 'pProfile': return <PatientProfile ctx={ctx} sc={sc} />;
    case 'dSlots': return <Slots ctx={ctx} list={sc.list} />;
    case 'dAddSlot': return <AddSlot ctx={ctx} sc={sc} />;
    case 'dEditSlot': return <EditSlot ctx={ctx} slot={sc.slot} />;
    case 'dRdv': return <DoctorRdv ctx={ctx} sc={sc} />;
    case 'dProfile': return <DoctorProfile ctx={ctx} form={sc.form} />;
    case 'aUsers': return <Users ctx={ctx} list={sc.list} />;
    case 'aAdd': case 'aEdit': return <UserForm ctx={ctx} form={sc.form} edit={sc.s === 'aEdit'} />;
  }
}

function Auth({ ctx, register }: { ctx: Ctx; register: boolean }) {
  const f = ctx.ph.form;
  const field = (label: string, key: keyof typeof f, icon: keyof typeof P, type = 'text') => (
    <>
      <label className="lbl">{label}</label>
      <div className="et"><input type={type} value={f[key]} onChange={ev => { f[key] = ev.target.value; ctx.refresh(); }} autoComplete="off" spellCheck={false} /><Ic d={icon} /></div>
    </>
  );
  return (
    <div className="auth" style={{ backgroundImage: `url(${corridor.src})` }}>
      <div className="veil" />
      <div className="brand"><Ic d="account" className="big" /><h1>MEDIGOO</h1></div>
      <form className={`sheet${register ? ' reg' : ''}`} onSubmit={ev => { ev.preventDefault(); register ? ctx.signUp() : ctx.signIn(); }}>
        <h2>Welcome</h2>
        <p className="sub">{register ? 'Please enter your information' : 'Please login with your information'}</p>
        {register && <>{field('Prenom', 'prenom', 'person')}{field('Nom', 'nom', 'person')}{field('Telephone', 'telephone', 'phone')}</>}
        {field('Email address', 'email', 'email', 'email')}
        {field('Password', 'password', 'key', 'password')}
        <button type="submit" className="m3btn">{register ? 'Register' : 'Login'}</button>
        <p className="or">{register ? 'Or Login now!' : 'Or Register now!'}</p>
        <button type="button" className="m3btn" onClick={() => ctx.go(register ? { s: 'login' } : { s: 'register' })}>{register ? 'Login' : 'Register'}</button>
      </form>
    </div>
  );
}

function Dash({ ctx, who }: { ctx: Ctx; who: 'p' | 'd' }) {
  const { e } = ctx;
  const u = e.session;
  const unread = who === 'p' && u ? unreadCount(e, u.id, false) : 0;
  const cards: [keyof typeof P, string, () => void][] = who === 'p'
    ? [['account', 'Profil', () => ctx.go({ s: 'pProfile', form: { ...ctx.me() }, pw: '' })], ['calendar', 'Rendez-vous', () => ctx.go({ s: 'pBook', offers: [] })],
      ['history', 'Historique', () => ctx.go({ s: 'pHistory', list: [] })], ['bell', 'Notifications', () => ctx.go({ s: 'pNotifs', list: [] })]]
    : [['account', 'Mon Profil', () => ctx.go({ s: 'dProfile', form: { ...ctx.me() } })], ['schedule', 'Mes Créneaux', () => ctx.go({ s: 'dSlots', list: [] })],
      ['calendarCheck', 'Rendez-vous', () => ctx.go({ s: 'dRdv', list: [], picked: {} })], ['bell', 'Option', () => {}]];
  return (
    <div className={`dash ${who}`}>
      <header>
        <h2>{who === 'p' ? 'Tableau de bord' : 'Tableau de bord Médecin'}</h2>
        <p>{who === 'p' ? (u ? `Bienvenue, ${u.prenom} ${u.nom}` : 'Bienvenue, Patient') : 'Bienvenue, Docteur'}</p>
      </header>
      <div className="cards">
        {cards.map(([icon, label, fn], i) => (
          <div className="dcard" key={label}>
            <Ic d={icon} className="ci" />
            <button className="tbtn" onClick={fn}>{label}</button>
            {who === 'p' && i === 3 && unread > 0 && <span className="badge">{unread}</span>}
          </div>
        ))}
      </div>
      <button className="obtn" onClick={() => { if (who === 'p') logout(ctx.e); ctx.only({ s: 'login' }); }}>{who === 'p' ? 'Se déconnecter' : 'Déconnexion'}</button>
    </div>
  );
}

function AdminDash({ ctx }: { ctx: Ctx }) {
  const u = ctx.e.session;
  return (
    <div className="dash a">
      <header><h2 className="xl">Tableau de bord Admin</h2><p className="l">{u ? `Bienvenue, ${u.nom}` : 'Bienvenue, Admin'}</p></header>
      <div className="acard"><button onClick={() => ctx.go({ s: 'aUsers', list: [] })}>Gérer les Utilisateurs</button></div>
      <button className="obtn sq" onClick={() => { logout(ctx.e); ctx.only({ s: 'login' }); }}>Se déconnecter</button>
    </div>
  );
}

const Bar = ({ title, onBack, dark, children }: { title: string; onBack: () => void; dark?: boolean; children?: ReactNode }) => (
  <div className={`tbar${dark ? ' dark' : ''}`}><button className="ib" aria-label="Retour" onClick={onBack}><Ic d="back" /></button><h3>{title}</h3>{children}</div>
);

function Book({ ctx, offers }: { ctx: Ctx; offers: Offer[] }) {
  return (
    <div className="page pad8">
      <button className="retour" onClick={ctx.finish}>Retour</button>
      <div className="list">
        {offers.map(o => (
          <div className="mcard row" key={o.creneau.id}>
            <div className="grow">
              <b className="t16">{o.medecin ? `Dr. ${o.medecin.prenom} ${o.medecin.nom}` : 'Médecin inconnu'}</b>
              <span className="meta"><Ic d="calendar" className="pi" />Date: {o.creneau.date}</span>
              <span className="meta"><Ic d="clock" className="pi" />Heure: {o.creneau.heure_debut} - {o.creneau.heure_fin}</span>
            </div>
            <button className="outl" onClick={() => {
              const u = ctx.me();
              if (u.role !== 'Patient') return ctx.toast('Action réservée aux patients');
              ctx.ph.dialog = { kind: 'book', offer: o, motif: '' }; ctx.refresh();
            }}>Réserver</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function History({ ctx, list }: { ctx: Ctx; list: AppointmentView[] }) {
  return (
    <div className="page">
      <div className="hbar"><button className="ib purple" aria-label="Retour" onClick={ctx.finish}><Ic d="back" /></button><h3>Historique des Rendez-vous</h3></div>
      <div className="list p16">
        {list.map(v => (
          <div className="mcard col" key={v.rdv.id}>
            <div className="row">
              <Ic d="medical" className="pi24" />
              <b className="t16 grow">{v.other ? `Dr. ${v.other.prenom} ${v.other.nom}` : ''}</b>
              <span className="chip">Statut: {STATUT_LABEL[v.rdv.statut] ?? v.rdv.statut}</span>
            </div>
            <div className="row gap">
              <span className="meta dark"><Ic d="calendar" className="gi" />{v.creneau ? `Date: ${frDate(v.creneau.date, 'long')}` : ''}</span>
            </div>
            <span className="meta dark"><Ic d="clock" className="gi" />{v.creneau ? `Heure: ${v.creneau.heure_debut}` : ''}</span>
            <div className="motif"><small>Motif</small><span>Motif: {v.rdv.motif ?? 'Non précisé'}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notifs({ ctx, list }: { ctx: Ctx; list: Notif[] }) {
  return (
    <div className="page">
      <button className="ib floatback" aria-label="Retour" onClick={ctx.finish}><Ic d="back" /></button>
      <div className="list p8 top56">
        {list.map(n => (
          <button key={n.id} className={`ncard${n.is_read ? '' : ' unread'}`} onClick={() => ctx.act(() => { if (!n.is_read) { markRead(ctx.e, n.id); n.is_read = true; } })}>
            <b>{n.title}</b><span className="msg">{n.message}</span>
            <small>{new Date(n.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Outlined({ label, value, onChange, type = 'text', multi }: { label: string; value: string; onChange: (v: string) => void; type?: string; multi?: boolean }) {
  return (
    <label className={`obox${value ? ' filled' : ''}`}>
      <span>{label}</span>
      {multi ? <textarea value={value} onChange={ev => onChange(ev.target.value)} rows={2} /> : <input type={type} value={value} onChange={ev => onChange(ev.target.value)} autoComplete="off" spellCheck={false} />}
    </label>
  );
}

function PatientProfile({ ctx, sc }: { ctx: Ctx; sc: Extract<Screen, { s: 'pProfile' }> }) {
  const f = sc.form;
  const set = (k: keyof Utilisateur) => (v: string) => { (f as Record<string, unknown>)[k] = v; ctx.refresh(); };
  return (
    <div className="page scroll p16">
      <h2 className="ptitle purple">Mon Profil</h2>
      <Outlined label="Prénom" value={f.prenom} onChange={set('prenom')} />
      <Outlined label="Nom" value={f.nom} onChange={set('nom')} />
      <Outlined label="Téléphone" value={f.telephone} onChange={set('telephone')} type="tel" />
      <Outlined label="Email" value={f.email} onChange={set('email')} type="email" />
      <Outlined label="Antécédents médicaux" value={f.antecedents ?? ''} onChange={set('antecedents')} multi />
      <button className="m2btn" onClick={() => ctx.act(() => { updateUser(ctx.e, { ...ctx.me(), prenom: f.prenom, nom: f.nom, telephone: f.telephone, email: f.email, antecedents: f.antecedents }); ctx.toast('Profil mis à jour'); })}>Enregistrer les modifications</button>
      <h3 className="sub16">Changer le mot de passe</h3>
      <Outlined label="Nouveau mot de passe" value={sc.pw} onChange={v => { sc.pw = v; ctx.refresh(); }} type="password" />
      <button className="m2out" onClick={() => ctx.act(() => {
        if (!sc.pw) return ctx.toast('Veuillez entrer un nouveau mot de passe');
        updateUser(ctx.e, { ...ctx.me(), password: sc.pw }); sc.pw = ''; ctx.toast('Mot de passe mis à jour');
      })}>Changer le mot de passe</button>
      <button className="m2text" onClick={() => ctx.go({ s: 'pDash' })}>Retour au tableau de bord</button>
    </div>
  );
}

function Slots({ ctx, list }: { ctx: Ctx; list: Creneau[] }) {
  return (
    <div className="page">
      <Bar title="Mes Créneaux" onBack={ctx.finish} />
      <div className="list p8">
        {list.map(c => (
          <div className="mcard row" key={c.id}>
            <div className="grow">
              <b className="t16">{frDate(c.date, 'week')}</b>
              <span className="meta black"><Ic d="clock" className="gi" />{c.heure_debut} - {c.heure_fin}</span>
              <span className={`dispo ${c.disponible ? 'ok' : 'no'}`}><Ic d={c.disponible ? 'check' : 'close'} /> {c.disponible ? 'Disponible' : 'Réservé'}</span>
            </div>
            <button className="ib purple" aria-label="Modifier" onClick={() => ctx.go({ s: 'dEditSlot', slot: { ...c } })}><Ic d="edit" /></button>
            <button className="ib red" aria-label="Supprimer" onClick={() => {
              if (!c.disponible) return ctx.toast('Impossible de supprimer un créneau réservé');
              ctx.ph.dialog = { kind: 'confirm', title: 'Confirmation', text: 'Supprimer ce créneau ?', ok: () => ctx.act(() => { deleteSlot(ctx.e, c.id); ctx.toast('Créneau supprimé'); ctx.replace({ s: 'dSlots', list: [] }); }) };
              ctx.refresh();
            }}><Ic d="del" /></button>
          </div>
        ))}
      </div>
      <button className="fab" aria-label="Ajouter" onClick={() => ctx.go({ s: 'dAddSlot', date: '', debut: '', fin: '' })}><Ic d="add" /></button>
    </div>
  );
}

function AddSlot({ ctx, sc }: { ctx: Ctx; sc: Extract<Screen, { s: 'dAddSlot' }> }) {
  const set = (k: 'date' | 'debut' | 'fin') => (v: string) => { sc[k] = v; ctx.refresh(); };
  return (
    <div className="page p16">
      <h2 className="ptitle">Ajouter un créneau</h2>
      <Outlined label="Date : YYYY - MM - DD" value={sc.date} onChange={set('date')} />
      <Outlined label="Heure de début" value={sc.debut} onChange={set('debut')} />
      <Outlined label="Heure de fin" value={sc.fin} onChange={set('fin')} />
      <p className="hintline">{isoDay(Date.now() + 4 * 86_400_000)}, 11:00, 11:30</p>
      <button className="m2btn" onClick={() => ctx.act(() => {
        if (!addSlot(ctx.e, ctx.me().id, sc.date, sc.debut, sc.fin)) return ctx.toast('Veuillez remplir tous les champs');
        ctx.toast('Créneau ajouté avec succès'); ctx.finish();
      })}>Ajouter le créneau</button>
    </div>
  );
}

function EditSlot({ ctx, slot }: { ctx: Ctx; slot: Creneau }) {
  const set = (k: 'date' | 'heure_debut' | 'heure_fin') => (v: string) => { slot[k] = v; ctx.refresh(); };
  return (
    <div className="page scroll p16">
      <Outlined label="Date: YYYY-MM-DD" value={slot.date} onChange={set('date')} />
      <Outlined label="Heure de début: HH:MM" value={slot.heure_debut} onChange={set('heure_debut')} />
      <Outlined label="Heure de fin : HH:MM" value={slot.heure_fin} onChange={set('heure_fin')} />
      <label className="cbox"><input type="checkbox" checked={slot.disponible} onChange={ev => { slot.disponible = ev.target.checked; ctx.refresh(); }} /> Disponible</label>
      <button className="m2btn" onClick={() => ctx.act(() => { editSlot(ctx.e, slot); ctx.toast('Créneau modifié'); ctx.finish(); })}>Enregistrer</button>
      <button className="m2out" onClick={ctx.finish}>Annuler</button>
    </div>
  );
}

function DoctorRdv({ ctx, sc }: { ctx: Ctx; sc: Extract<Screen, { s: 'dRdv' }> }) {
  return (
    <div className="page grey">
      <Bar title="Mes Rendez-vous" onBack={ctx.finish} dark />
      <div className="list p8">
        {sc.list.map((v, i) => (
          <div className="rcard" key={v.rdv.id}>
            <b className="t16">{v.other ? `Patient: ${v.other.prenom} ${v.other.nom}` : ''}</b>
            <div className="row gap"><span className="meta">{v.creneau ? `Date: ${frDate(v.creneau.date, 'short')}` : ''}</span><span className="meta">{v.creneau ? `Heure: ${v.creneau.heure_debut} - ${v.creneau.heure_fin}` : ''}</span></div>
            <div className="row gap"><span>Statut:</span>
              <select className="spin" value={sc.picked[v.rdv.id] ?? v.rdv.statut} onChange={ev => { sc.picked[v.rdv.id] = ev.target.value as Statut; ctx.refresh(); }}>
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="row end">
              <button className="flat" onClick={() => ctx.remind(v)}>Envoyer rappel</button>
              <button className="colored" onClick={() => ctx.act(() => {
                const s = sc.picked[v.rdv.id] ?? v.rdv.statut;
                setStatus(ctx.e, v.rdv.id, s); sc.list[i] = { ...v, rdv: { ...v.rdv, statut: s } }; ctx.toast('Statut mis à jour');
              })}>Mettre à jour</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorProfile({ ctx, form }: { ctx: Ctx; form: Utilisateur }) {
  const set = (k: keyof Utilisateur) => (v: string) => { (form as Record<string, unknown>)[k] = v; ctx.refresh(); };
  return (
    <div className="page scroll p16">
      <h2 className="ptitle l">Mon Profil Médecin</h2>
      <Outlined label="Prénom" value={form.prenom} onChange={set('prenom')} />
      <Outlined label="Nom" value={form.nom} onChange={set('nom')} />
      <Outlined label="Téléphone" value={form.telephone} onChange={set('telephone')} type="tel" />
      <Outlined label="Email" value={form.email} onChange={set('email')} type="email" />
      <Outlined label="Spécialité médicale" value={form.specialite ?? ''} onChange={set('specialite')} />
      <button className="m2btn" onClick={() => ctx.act(() => { updateUser(ctx.e, { ...ctx.me(), prenom: form.prenom, nom: form.nom, telephone: form.telephone, email: form.email, specialite: form.specialite }); ctx.toast('Profil mis à jour'); })}>Enregistrer les modifications</button>
      <button className="m2out" onClick={() => ctx.go({ s: 'dDash' })}>Retour au Dashboard</button>
    </div>
  );
}

function Users({ ctx, list }: { ctx: Ctx; list: Utilisateur[] }) {
  return (
    <div className="page grey">
      <button className="retour flat" onClick={() => ctx.replace({ s: 'aDash' })}>Retour</button>
      <div className="list p8 users">
        {list.map(u => (
          <div className="mcard row" key={u.id}>
            <div className="grow"><b className="t16">{u.nom}</b><span className="meta">{u.prenom}</span><span className="meta">{u.email}</span></div>
            <button className="ib purple" aria-label="Modifier" onClick={() => ctx.go({ s: 'aEdit', form: { ...u } })}><Ic d="edit" /></button>
            <button className="ib red" aria-label="Supprimer" onClick={() => ctx.act(() => { adminDelete(ctx.e, u.id); ctx.replace({ s: 'aUsers', list: [] }); })}><Ic d="del" /></button>
          </div>
        ))}
      </div>
      <button className="pill" onClick={() => ctx.replace({ s: 'aAdd', form: blankUser() })}>Ajouter</button>
    </div>
  );
}

function UserForm({ ctx, form, edit }: { ctx: Ctx; form: Utilisateur; edit: boolean }) {
  const set = (k: keyof Utilisateur) => (ev: { target: { value: string } }) => { (form as Record<string, unknown>)[k] = ev.target.value; ctx.refresh(); };
  const fields: [keyof Utilisateur, string, string][] = edit
    ? [['nom', 'Nom', 'text'], ['prenom', 'Prénom', 'text'], ['email', 'Email', 'email'], ['password', 'Mot de passe', 'password'], ['telephone', 'Téléphone', 'tel'], ['specialite', 'Spécialité', 'text']]
    : [['prenom', 'Prénom', 'text'], ['nom', 'Nom', 'text'], ['telephone', 'Téléphone', 'tel'], ['email', 'Email', 'email'], ['password', 'Mot de passe', 'password'], ['specialite', 'Spécialité (optionnel)', 'text'], ['antecedents', 'Antécédents médicaux (optionnel)', 'text']];
  return (
    <div className={`page scroll p16${edit ? ' soft' : ''}`}>
      {fields.map(([k, label, type]) => <input key={k} className={edit ? 'boxed' : 'line'} placeholder={label} type={type} value={String(form[k] ?? '')} onChange={set(k)} autoComplete="off" spellCheck={false} />)}
      <select className={edit ? 'boxed' : 'line'} value={form.role} onChange={set('role')}>
        <option>Admin</option><option>Medecin</option><option>Patient</option>
      </select>
      <button className={edit ? 'm2btn r8' : 'm3btn'} onClick={() => ctx.act(() => {
        if (edit) {
          adminUpdate(ctx.e, form); ctx.toast('Utilisateur mis à jour'); ctx.finish();
        } else {
          const r = adminAdd(ctx.e, form);
          if (r === 'empty') return ctx.toast('Veuillez remplir tous les champs obligatoires');
          if (r === 'crash') { ctx.ph.dialog = { kind: 'crash' }; return; }
          ctx.toast('Utilisateur ajouté avec succès'); ctx.finish();
        }
      })}>{edit ? 'Modifier' : 'Enregistrer'}</button>
    </div>
  );
}

function DialogView({ ctx, d }: { ctx: Ctx; d: NonNullable<Dialog> }) {
  const close = () => { ctx.ph.dialog = null; ctx.refresh(); };
  if (d.kind === 'crash') return (
    <div className="scrim"><div className="adlg crash">
      <h4>Project__controle_Hopital s’est arrêté</h4>
      <button className="dline" onClick={() => ctx.act(() => { ctx.ph.dialog = null; logout(ctx.e); ctx.ph.stack = [{ s: 'login' }]; })}>Rouvrir l’application</button>
      <button className="dline" onClick={() => ctx.act(() => { ctx.ph.dialog = null; logout(ctx.e); ctx.ph.stack = []; ctx.ph.home = true; })}>Fermer l’application</button>
    </div></div>
  );
  if (d.kind === 'permission') return (
    <div className="scrim"><div className="adlg perm">
      <Ic d="bell" className="pbell" />
      <h4>Autoriser <b>Project__controle_Hopital</b> à vous envoyer des notifications ?</h4>
      <button className="pbtn" onClick={() => ctx.act(() => { ctx.e.permission = 'granted'; ctx.ph.dialog = null; })}>Autoriser</button>
      <button className="pbtn" onClick={() => ctx.act(() => { ctx.e.permission = 'denied'; ctx.ph.dialog = null; })}>Ne pas autoriser</button>
    </div></div>
  );
  if (d.kind === 'confirm') return (
    <div className="scrim" onClick={close}><div className="adlg" onClick={ev => ev.stopPropagation()}>
      <h4>{d.title}</h4><p>{d.text}</p>
      <div className="acts"><button onClick={close}>Non</button><button onClick={() => { ctx.ph.dialog = null; d.ok(); }}>Oui</button></div>
    </div></div>
  );
  const { offer } = d;
  return (
    <div className="scrim" onClick={close}><div className="adlg" onClick={ev => ev.stopPropagation()}>
      <h4>Confirmer le rendez-vous</h4>
      <p className="t16">Confirmer avec Dr. {offer.medecin?.nom} le {offer.creneau.date} à {offer.creneau.heure_debut}?</p>
      <p className="small">Motif de consultation (optionnel):</p>
      <input className="line" placeholder="Décrivez brièvement votre problème" value={d.motif} onChange={ev => { d.motif = ev.target.value; ctx.refresh(); }} autoComplete="off" />
      <div className="acts">
        <button onClick={close}>Annuler</button>
        <button onClick={() => ctx.act(() => {
          ctx.ph.dialog = null;
          const r = book(ctx.e, ctx.me(), offer.creneau.id, d.motif);
          if (r === 'taken') return ctx.toast('Créneau déjà pris');
          const sc = ctx.top();
          if (sc.s === 'pBook') sc.offers = sc.offers.filter(o => o.creneau.id !== offer.creneau.id);
          ctx.toast('Rendez-vous confirmé!' + (d.motif.trim() ? `\nMotif: ${d.motif.trim()}` : ''), true);
        })}>Confirmer</button>
      </div>
    </div></div>
  );
}
