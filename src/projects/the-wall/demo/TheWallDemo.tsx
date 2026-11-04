import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  accept, chatDate, COLORS, createEngine, deleteMessage, editMessage, feed, feedDate, follow, like, loadAddFriends, loadChat, loadConversations,
  loadProfile, loadRequests, logFeedStream, markSeen, logPicker, logRealtime, myPublications, nameOf, openChat, profileOf, reject, relativeTime,
  sendMessage, signIn, signOut, signUp, userId,
  type Candidate, type Conversation, type Engine, type FollowRequest, type Message, type Picture, type Seg, type Step, type Table
} from './logic';
import { strings, type DemoStrings } from './strings';
import wall from '../media/wall.jpg';
import sigma from '../media/sigma.png';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
type Key = 'a' | 'b';
type Screen = 'login' | 'register' | 'feed' | 'messages' | 'chat' | 'profile' | 'addFriends' | 'requests';
type Overlay = { type: 'alert'; text: string } | { type: 'options'; msg: string } | { type: 'edit'; msg: string; text: string } | { type: 'gallery' } | null;
type Chat = { friend: string; list: Message[]; loading: boolean; draft: string; picked: Picture | null; flash?: string; scroll: number };
type Phone = {
  user: string | null; last: string; screen: Screen; ov: Overlay; token: number; chat: Chat | null;
  data: Conversation[] | Candidate[] | FollowRequest[] | { friends: number } | null;
};

// ---- Material icons, as in the Flutter app ----
const P = {
  post: 'M17 19.22H5V7h7V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h-2v7.22zM19 2h-2v3h-3c.01.01 0 2 0 2h3v2.99c.01.01 2 0 2 0V7h3V5h-3V2zM7 9h8v2H7zm0 3v2h8v-2h-3zm0 3h8v2H7z',
  message: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  personAdd: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  login: 'M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  camera: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
  doneAll: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
  thumb: 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z',
  heart: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'
};
const Mi = ({ d, className }: { d: keyof typeof P; className?: string }) => <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d={P[d]} /></svg>;
const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;

// ---- the phone's gallery: one picture from the project's assets, three drawn ----
const drawn = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${body}</svg>`);
const GALLERY: Picture[] = [
  { name: 'wall.jpg', src: wall.src },
  { name: 'sunset.jpg', src: drawn('<rect width="300" height="300" fill="#f6b26b"/><rect width="300" height="150" fill="#e8743b"/><circle cx="150" cy="170" r="54" fill="#ffe08a"/><rect y="180" width="300" height="120" fill="#2f5f8a"/><rect y="196" x="70" width="160" height="6" fill="#ffe08a" opacity=".6"/><rect y="216" x="100" width="100" height="5" fill="#ffe08a" opacity=".4"/>') },
  { name: 'mountain.jpg', src: drawn('<rect width="300" height="300" fill="#bfe0f2"/><path d="M0 230 90 90 150 170 200 110 300 240V300H0z" fill="#5d7a8c"/><path d="M90 90 112 124 98 120 84 132 72 118z" fill="#fff"/><path d="M200 110 220 136 206 132 192 142 184 128z" fill="#fff"/><rect y="240" width="300" height="60" fill="#6f9e5c"/>') },
  { name: 'city.jpg', src: drawn('<rect width="300" height="300" fill="#1f2347"/><circle cx="230" cy="70" r="26" fill="#f4e7b5"/><path d="M0 300V190h40v-50h36v70h30v-90h44v60h28v-40h40v80h34v-30h48v110z" fill="#0e1129"/><g fill="#f2c45a"><rect x="50" y="160" width="6" height="8"/><rect x="62" y="176" width="6" height="8"/><rect x="118" y="140" width="6" height="8"/><rect x="132" y="162" width="6" height="8"/><rect x="190" y="200" width="6" height="8"/><rect x="270" y="210" width="6" height="8"/></g>') }
];

// ---- Supabase table editor columns ----
const COLS: Record<Table, [string, string][]> = {
  profiles: [['id', 'uuid'], ['username', 'text'], ['prenom', 'text'], ['nom', 'text'], ['email', 'text'], ['online', 'bool'], ['avatar_url', 'text'], ['created', 'timestamptz']],
  publications: [['id', 'uuid'], ['profile_id', 'uuid'], ['content', 'text'], ['image', 'text'], ['likes', 'int4'], ['created_at', 'timestamptz']],
  publication_likes: [['id', 'uuid'], ['publication_id', 'uuid'], ['profile_id', 'uuid']],
  friends: [['id', 'uuid'], ['user_id', 'uuid'], ['friend_id', 'uuid'], ['created_at', 'timestamptz']],
  follow_requests: [['id', 'uuid'], ['sender_id', 'uuid'], ['receiver_id', 'uuid'], ['status', 'text'], ['created_at', 'timestamptz']],
  messages: [['id', 'uuid'], ['sender_id', 'uuid'], ['receiver_id', 'uuid'], ['content', 'text'], ['image_url', 'text'], ['seen', 'bool'], ['created_at', 'timestamptz']],
  'storage.chat-pictures': [['id', 'uuid'], ['name', 'text'], ['bucket_id', 'text'], ['created_at', 'timestamptz']]
};
const FRESH = 1700;
const STEPS: Step[] = ['request', 'accept', 'text', 'image', 'seen', 'edit'];
const pad = (n: number) => String(n).padStart(2, '0');
const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const newPhone = (id: string): Phone => ({ user: id, last: id, screen: 'feed', ov: null, data: null, chat: null, token: 0 });

/** The Wall on two phones sharing one simulated Supabase project, with the table editor and the requests beside them. */
export default function TheWallDemo({ lang }: Props) {
  const t = strings[lang];
  // the world is random (ids, clocks): it is built in the browser only, so the server's HTML never disagrees with it
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; phones: Record<Key, Phone> } | null>(null);
  if (ready && !world.current) world.current = fresh(lang);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [table, setTable] = useState<Table>('messages');
  const [followReq, setFollowReq] = useState(true);
  const [full, setFull] = useState(false);
  const hit = useRef<{ table: Table; t: number } | null>(null);
  useEffect(() => setReady(true), []);

  // highlights fade and the phones' clocks move on
  useEffect(() => { const id = setInterval(refresh, 15000); return () => clearInterval(id); }, []);
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !world.current) return;
      const phones = world.current.phones;
      const open = (Object.keys(phones) as Key[]).find(k => phones[k].ov);
      if (open) { phones[open].ov = null; refresh(); } else setFull(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  if (!world.current) return <div className="tw"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, phones } = world.current;

  /** Runs an action, then repaints; written rows and the table they belong to light up for a moment. */
  const act = (fn: () => void) => {
    const before = e.log[0]?.id;
    fn();
    if (e.log[0]?.id !== before && e.changed.size + e.gone.length) {
      hit.current = { table: e.lastTable, t: Date.now() };
      if (followReq) setTable(e.lastTable);
    }
    refresh();
    setTimeout(refresh, FRESH + 50);
  };
  /** The live screens (feed, profile) follow their stream: each phone showing one gets the change. */
  const stream = (tableName: Table) => (Object.keys(phones) as Key[]).forEach(k => {
    const ph = phones[k];
    if (ph.user && ph.screen === 'feed' && (tableName === 'publications' || tableName === 'profiles')) logRealtime(e, ph.user, tableName);
  });
  /** Future-based pages: a short spinner, then the data as it was when the page opened. */
  const later = (ph: Phone, fn: () => void, ms = 380) => {
    const token = ++ph.token;
    setTimeout(() => { if (ph.token === token) act(fn); }, ms);
  };

  const open = (k: Key, screen: Screen) => {
    const ph = phones[k], me = ph.user!;
    ph.screen = screen; ph.ov = null; ph.data = null; ph.token++;
    if (screen === 'feed') logFeedStream(e, me);
    if (screen === 'messages') later(ph, () => { ph.data = loadConversations(e, me); });
    if (screen === 'profile') later(ph, () => { ph.data = loadProfile(e, me); });
    if (screen === 'addFriends') later(ph, () => { ph.data = loadAddFriends(e, me); });
    if (screen === 'requests') later(ph, () => { ph.data = loadRequests(e, me); });
    refresh();
  };

  const actions = (k: Key): Actions => {
    const ph = phones[k];
    const me = () => ph.user!;
    return {
      go: (s: Screen) => { if (s !== ph.screen) open(k, s); },
      back: () => open(k, ph.screen === 'chat' ? 'messages' : 'addFriends'),
      dismiss: () => { ph.ov = null; refresh(); },
      signOut: () => act(() => { signOut(e, me()); ph.last = me(); ph.user = null; ph.screen = 'login'; ph.ov = null; stream('profiles'); }),
      signIn: () => act(() => { ph.user = ph.last; signIn(e, ph.user); open(k, 'feed'); ph.ov = { type: 'alert', text: 'Login successful!' }; stream('profiles'); }),
      toRegister: () => { ph.screen = 'register'; refresh(); },
      toLogin: () => { ph.screen = 'login'; refresh(); },
      signUp: (f: FormData) => act(() => {
        const v = (n: string) => String(f.get(n) ?? '').trim();
        const r = signUp(e, { email: v('email'), password: v('password'), confirm: v('confirm'), nom: v('nom'), prenom: v('prenom'), username: v('username') });
        if ('error' in r) { ph.ov = { type: 'alert', text: r.error }; return; }
        ph.user = r.id; ph.last = r.id; open(k, 'feed'); ph.ov = { type: 'alert', text: 'Account created successfully!' }; stream('profiles');
      }),
      like: (id: string) => act(() => { if (like(e, me(), id)) stream('publications'); }),
      follow: (id: string) => act(() => { follow(e, me(), id); open(k, 'addFriends'); }),
      accept: (id: string) => act(() => { accept(e, me(), id); open(k, 'requests'); }),
      reject: (id: string) => act(() => { reject(e, me(), id); open(k, 'requests'); }),
      openChat: (friend: string) => act(() => {
        // messages_page marks the friend's messages seen on tap, then chat_page loads, marks seen and loads again
        markSeen(e, me(), friend);
        ph.screen = 'chat'; ph.ov = null; ph.chat = { friend, list: [], loading: true, draft: '', picked: null, scroll: 0 };
        const c = ph.chat;
        later(ph, () => { c.list = openChat(e, me(), friend); c.loading = false; c.scroll++; });
      }),
      gallery: () => { ph.ov = { type: 'gallery' }; refresh(); },
      pick: (p: Picture) => act(() => { ph.chat!.picked = p; ph.ov = null; logPicker(e, me()); }),
      unpick: () => { ph.chat!.picked = null; refresh(); },
      draft: (v: string) => { ph.chat!.draft = v; refresh(); },
      send: () => act(() => {
        const c = ph.chat!;
        const row = sendMessage(e, me(), c.friend, c.draft, c.picked);
        if (!row) return;
        c.list.push(row); c.draft = ''; c.picked = null; c.flash = row.id; c.scroll++;
      }),
      options: (msg: string) => { ph.ov = { type: 'options', msg }; refresh(); },
      editOpen: () => { if (ph.ov?.type !== 'options') return; const id = ph.ov.msg; ph.ov = { type: 'edit', msg: id, text: ph.chat!.list.find(m => m.id === id)?.content ?? '' }; refresh(); },
      editText: (v: string) => { if (ph.ov?.type === 'edit') { ph.ov.text = v; refresh(); } },
      editSave: () => act(() => {
        if (ph.ov?.type !== 'edit' || !editMessage(e, me(), ph.ov.msg, ph.ov.text)) return;
        ph.ov = null; ph.chat!.list = loadChat(e, me(), ph.chat!.friend);
      }),
      delete: () => act(() => {
        if (ph.ov?.type !== 'options') return;
        deleteMessage(e, me(), ph.ov.msg); ph.ov = null; ph.chat!.list = loadChat(e, me(), ph.chat!.friend);
      })
    };
  };

  const reset = () => { world.current = fresh(lang); setTable('messages'); refresh(); };
  const now = Date.now();
  const tableRows = [...(e.db[table] as unknown as Record<string, unknown>[])]
    .sort((a, b) => String(b.created_at ?? b.created ?? '').localeCompare(String(a.created_at ?? a.created ?? '')));
  const gone = e.gone.filter(g => g.table === table && now - g.t < FRESH);

  return (
    <div className="tw">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="title"><i style={{ ['--logo' as string]: 'url(/logos/flutter.svg)' }} />{t.title}</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>
          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <span className="hint"><b>{t.hint[0]}</b>{t.hint[1]}<b>{t.hint[2]}</b>{t.hint[3]}</span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="stage">
            {(['a', 'b'] as Key[]).map(k => (
              <div className="device" key={k}>
                <p>{t.phoneOf} <b>@{nameOf(e, phones[k].last)}</b></p>
                <PhoneView e={e} ph={phones[k]} a={actions(k)} t={t} />
              </div>
            ))}
            <section className="sb" aria-label="Supabase Studio">
              <div className="sb-top"><i style={{ ['--logo' as string]: 'url(/logos/supabase.svg)' }} /><b>thewall</b><span>/ Table Editor</span>
                <label><input type="checkbox" checked={followReq} onChange={ev => setFollowReq(ev.target.checked)} /> {t.follow}</label></div>
              <div className="sb-tables">
                {(Object.keys(COLS) as Table[]).map(name => (
                  <button key={name} className={`${name === table ? 'on' : ''}${hit.current?.table === name && now - hit.current.t < 1000 ? ' hit' : ''}`}
                    onClick={() => { setTable(name); setFollowReq(false); }}>{name}<small>{e.db[name].length}</small></button>
                ))}
              </div>
              <div className="sb-grid">
                <table>
                  <thead><tr>{COLS[table].map(([c, type]) => <th key={c}>{c}<small>{type}</small></th>)}</tr></thead>
                  <tbody>
                    {gone.map((g, i) => <tr key={`g${i}`} className="gone">{COLS[table].map(col => <Cell key={col[0]} e={e} row={g.row} col={col} />)}</tr>)}
                    {tableRows.map(r => <tr key={String(r.id)} className={now - (e.changed.get(String(r.id)) ?? 0) < FRESH ? 'new' : ''}>{COLS[table].map(col => <Cell key={col[0]} e={e} row={r} col={col} />)}</tr>)}
                  </tbody>
                </table>
              </div>
              <div className="sb-log">
                <h4>{t.logTitle} <span>supabase_flutter</span></h4>
                <ol>{e.log.map(l => (
                  <li key={l.id} className={`${l.realtime ? 'rt ' : ''}${now - l.t < 1400 ? 'new' : ''}`}>
                    <time>{new Date(l.t).toTimeString().slice(0, 8)}</time>
                    <span className="by" style={{ color: COLORS[l.by] ?? '#b4b4b4' }}>@{l.by}</span>
                    <code>{l.code.map((s, i) => <Part key={i} s={s} />)}</code>
                  </li>
                ))}</ol>
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

function fresh(lang: 'fr' | 'en') {
  const e = createEngine(lang, wall.src);
  const phones = { a: newPhone(userId(e, 'nora')), b: newPhone(userId(e, 'samir')) };
  logFeedStream(e, phones.a.user!); logFeedStream(e, phones.b.user!);
  return { e, phones };
}

const Part = ({ s }: { s: Seg }) => typeof s === 'string' ? <>{s}</> : 'd' in s ? <s>{s.d}</s> : <em>{s.v}</em>;

function Cell({ e, row, col: [k, type] }: { e: Engine; row: Record<string, unknown>; col: [string, string] }) {
  const v = row[k];
  if (v === null || v === undefined) return <td className="null">NULL</td>;
  if (type === 'bool') return <td className={v ? 't' : 'f'}>{String(v)}</td>;
  if (type === 'uuid') {
    const p = profileOf(e, String(v));
    return <td title={String(v)}><span className="u">{p && <i style={{ background: COLORS[p.username] ?? '#888' }} />}{String(v).slice(0, 8)}…</span></td>;
  }
  if (type === 'timestamptz') return <td>{String(v).slice(0, 19).replace('T', ' ')}</td>;
  return <td title={String(v)}>{String(v)}</td>;
}

// ======================================================================
// one phone: the real Flutter screens
// ======================================================================
type Actions = {
  go: (s: Screen) => void; back: () => void; dismiss: () => void; signOut: () => void; signIn: () => void; toRegister: () => void; toLogin: () => void;
  signUp: (f: FormData) => void; like: (id: string) => void; follow: (id: string) => void; accept: (id: string) => void; reject: (id: string) => void;
  openChat: (friend: string) => void; gallery: () => void; pick: (p: Picture) => void; unpick: () => void; draft: (v: string) => void; send: () => void;
  options: (msg: string) => void; editOpen: () => void; editText: (v: string) => void; editSave: () => void; delete: () => void;
};

function Avatar({ e, id, size }: { e: Engine; id: string; size: number }) {
  const p = profileOf(e, id);
  return <span className="av" style={{ width: size, height: size, fontSize: size * 0.42, background: p ? COLORS[p.username] ?? '#8d6e63' : '#bdbdbd' }}>{p ? p.prenom[0] : <Mi d="person" />}</span>;
}
const Spin = () => <div className="spin"><i /></div>;

function PhoneView({ e, ph, a, t }: { e: Engine; ph: Phone; a: Actions; t: DemoStrings }) {
  const body = useRef<HTMLDivElement>(null);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { if (ph.screen === 'chat' && body.current) body.current.scrollTop = body.current.scrollHeight; }, [ph.chat?.scroll, ph.screen]);

  const Nav = ({ i }: { i: number }) => (
    <nav className="bnav">
      {([['post', 'Post', 'feed'], ['message', 'Message', 'messages'], ['person', 'Profile', 'profile'], ['personAdd', 'Add Friends', 'addFriends']] as const).map(([icon, label, s], n) => (
        <button key={s} className={n === i ? 'on' : ''} onClick={() => a.go(s)}><Mi d={icon} />{label}</button>
      ))}
    </nav>
  );
  const Bar = ({ title, right, left }: { title: ReactNode; right?: ReactNode; left?: ReactNode }) => (
    <div className="abar">{left ?? <span className="sp" />}<h3>{title}</h3>{right ?? <span className="sp" />}</div>
  );
  const SignOut = () => <button className="ib" onClick={a.signOut} aria-label={t.signOut}><Mi d="logout" /></button>;
  const Back = () => <button className="ib" onClick={a.back} aria-label={t.back}><Mi d="back" /></button>;
  const me = ph.user, now = Date.now();
  let screen: ReactNode;

  if (ph.screen === 'login') {
    screen = (
      <div className="body"><div className="login">
        <img src={sigma.src} alt="" />
        <input defaultValue={profileOf(e, ph.last)?.email} aria-label="Email" />
        <input type="password" defaultValue="motdepasse" aria-label="Password" />
        <button className="go" onClick={a.signIn}><Mi d="login" />Sign In</button>
        <button className="tb">Forgot Password?</button>
        <p className="reg">Not a member?<button onClick={a.toRegister}>Register now</button></p>
      </div></div>
    );
  } else if (ph.screen === 'register') {
    screen = (
      <div className="body register"><form className="login" onSubmit={ev => { ev.preventDefault(); a.signUp(new FormData(ev.currentTarget)); }}>
        <Mi d="lock" className="lock" />
        {([['email', 'Email'], ['password', 'Password'], ['confirm', 'Confirm Password'], ['nom', 'Nom'], ['prenom', 'Prenom'], ['username', 'Username']] as const).map(([n, h]) =>
          <input key={n} name={n} placeholder={h} aria-label={h} type={h.includes('Password') ? 'password' : 'text'} />)}
        <button className="go" type="submit">Sign Up</button>
        <p className="reg dark">Already have an account?<button type="button" onClick={a.toLogin}>Login now</button></p>
      </form></div>
    );
  } else if (ph.screen === 'feed') {
    screen = <>
      <Bar title="ΣSigma" right={<SignOut />} />
      <div className="body"><div className="feed">
        {feed(e).map(p => {
          const author = profileOf(e, p.profile_id), green = p.profile_id === me || author?.online;
          return (
            <article key={p.id} className="card post">
              <div className="hd"><Avatar e={e} id={p.profile_id} size={36} /><b>{author?.username ?? 'Unknown'}</b><span className={`dot${green ? ' on' : ''}`} /><time>{feedDate(p.created_at)}</time></div>
              {p.content && <p>{p.content}</p>}
              <div className="ft">Likes: {p.likes ?? 0}<button className="ib" onClick={() => a.like(p.id)} aria-label={t.like}><Mi d="thumb" /></button></div>
            </article>
          );
        })}
      </div></div>
      <Nav i={0} />
    </>;
  } else if (ph.screen === 'messages') {
    const d = ph.data as Conversation[] | null;
    screen = <>
      <Bar title={<span className="light">Messages</span>} />
      <div className="body">{!d ? <Spin /> : !d.length ? <div className="empty">You have no friends yet.</div> : (
        <div className="tiles">{d.map(f => (
          <button key={f.id} className="card r12 tile" onClick={() => a.openChat(f.id)}>
            <Avatar e={e} id={f.id} size={50} />
            <span className="tx"><b>{f.username}</b><span>{!f.last ? 'No messages yet' : <>@{f.last.by} {f.last.image && <><Mi d="camera" />{f.last.text ? ' + ' : ' Photo'}</>}{f.last.text}</>}</span></span>
            {f.unread > 0 && <span className="badge">{f.unread}</span>}
          </button>
        ))}</div>
      )}</div>
      <Nav i={1} />
    </>;
  } else if (ph.screen === 'chat' && ph.chat) {
    const c = ph.chat;
    screen = <>
      <div className="abar"><Back /><h3 className="left"><Avatar e={e} id={c.friend} size={40} />{nameOf(e, c.friend)}</h3></div>
      <div className="body" ref={body}>{c.loading ? <Spin /> : (
        <div className="msgs">{c.list.map(m => {
          const mine = m.sender_id === me;
          const hold = mine ? {
            onPointerDown: () => { press.current = setTimeout(() => a.options(m.id), 500); },
            onPointerUp: () => clearTimeout(press.current), onPointerLeave: () => clearTimeout(press.current),
            onContextMenu: (ev: React.MouseEvent) => { ev.preventDefault(); a.options(m.id); }
          } : {};
          return (
            <div key={m.id} className={`msg${mine ? ' me' : ''}${c.flash === m.id ? ' flash' : ''}`} {...hold}>
              {!mine && <Avatar e={e} id={m.sender_id} size={36} />}
              <div className="col">
                <span className="who">{nameOf(e, m.sender_id)}</span>
                {m.content && <div className="bub">{m.content}</div>}
                {m.image_url && <img src={e.pictures.get(m.image_url)} alt="" draggable={false} />}
                <span className="meta">{chatDate(m.created_at)}<Mi d="doneAll" className={m.seen ? 'seen' : ''} /></span>
              </div>
              {mine && <Avatar e={e} id={m.sender_id} size={36} />}
            </div>
          );
        })}</div>
      )}</div>
      {c.picked && <div className="pick"><img src={c.picked.src} alt="" /><button className="ib" onClick={a.unpick} aria-label={t.removeImage}><Mi d="close" /></button></div>}
      <div className="compose">
        <button className="ib img" onClick={a.gallery} aria-label={t.pickImage}><Mi d="image" /></button>
        <input placeholder="Message…" value={c.draft} onChange={ev => a.draft(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') a.send(); }} aria-label="Message" />
        <button className="ib snd" onClick={a.send} aria-label={t.send}><Mi d="send" /></button>
      </div>
    </>;
  } else if (ph.screen === 'profile') {
    const d = ph.data as { friends: number } | null, p = profileOf(e, me!)!;
    screen = !d ? <div className="body"><Spin /></div> : <>
      <Bar title="Profile" right={<SignOut />} />
      <div className="body"><div className="prof">
        <div className="top"><Avatar e={e} id={p.id} size={100} /><div className="cnt">Amis<b>{d.friends}</b></div></div>
        <p className="name">@{p.username}<span className={`dot big${p.online ? ' on' : ''}`} /></p>
        <div className="info">Prénom : {p.prenom}<br />Nom : {p.nom}<br />Email : {p.email}<br />Date de création : {p.created.slice(0, 19).replace('T', ' ')}</div>
        <h4>Mes publications</h4>
        {myPublications(e, p.id).length === 0 && <p className="center">Aucune publication pour le moment.</p>}
        {myPublications(e, p.id).map(x => (
          <div key={x.id} className="card mine"><div className="hd"><span className="dot big on" /><b>@{p.username}</b><time>{relativeTime(x.created_at, now)}</time></div>
            <p>{x.content}</p><div className="ft"><Mi d="heart" />{x.likes ?? 0}</div></div>
        ))}
      </div></div>
      <Nav i={2} />
    </>;
  } else if (ph.screen === 'addFriends') {
    const d = ph.data as Candidate[] | null;
    screen = <>
      <Bar title="Add Friends" right={<button className="ib" onClick={() => a.go('requests')} aria-label={t.requests}><Mi d="bell" /></button>} />
      <div className="body">{!d ? <Spin /> : !d.length ? <div className="empty">No users found.</div> : (
        <div className="users">{d.map(u => (
          <div key={u.id} className="card r12 tile">
            <span className="sq" style={{ background: COLORS[u.username] ?? '#8d6e63' }}>{profileOf(e, u.id)?.prenom[0]}</span><b>{u.username}</b>
            <button className="ebtn" disabled={u.status !== 'Follow'} onClick={() => a.follow(u.id)}>{u.status}</button>
          </div>
        ))}</div>
      )}</div>
      <Nav i={3} />
    </>;
  } else if (ph.screen === 'requests') {
    const d = ph.data as FollowRequest[] | null;
    screen = <>
      <Bar title="Follow Requests" left={<Back />} />
      <div className="body">{!d ? <Spin /> : !d.length ? <div className="empty">No follow requests.</div> : (
        <div className="reqs">{d.map(r => {
          const sent = r.sender_id === me, other = sent ? r.receiver_id : r.sender_id;
          return (
            <div key={r.id} className="card tile">
              <Avatar e={e} id={other} size={50} />
              <div className="tx"><b>{sent ? 'Request to' : 'Request from'} {nameOf(e, other)}</b><span>{`Status: ${r.status}\nCreated at: ${r.created_at}`}</span></div>
              {!sent && <>
                <button className="ib ok" onClick={() => a.accept(r.id)} aria-label={t.accept}><Mi d="check" /></button>
                <button className="ib no" onClick={() => a.reject(r.id)} aria-label={t.reject}><Mi d="close" /></button>
              </>}
            </div>
          );
        })}</div>
      )}</div>
      <Nav i={3} />
    </>;
  }

  const ov = ph.ov;
  return (
    <div className="phone">
      <div className="scr">
        <div className="sbar"><span>{clock()}</span><i /></div>
        {screen}
        {ov && (
          <div className="ov" onClick={ev => { if (ev.target === ev.currentTarget && ov.type !== 'edit') a.dismiss(); }}>
            {ov.type === 'alert' && <div className="dlg" role="alertdialog"><h5>{ov.text}</h5></div>}
            {ov.type === 'options' && (
              <div className="sheet">
                <button onClick={a.editOpen}><Mi d="edit" />Modifier</button>
                <button className="del" onClick={a.delete}><Mi d="del" />Supprimer</button>
                <button onClick={a.dismiss}><Mi d="close" />Annuler</button>
              </div>
            )}
            {ov.type === 'edit' && (
              <div className="dlg" role="dialog">
                <h5>Modifier le message</h5>
                <label>Nouveau message<input autoFocus value={ov.text} onChange={ev => a.editText(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') a.editSave(); }} /></label>
                <div className="acts"><button onClick={a.dismiss}>Annuler</button><button className="fill" onClick={a.editSave}>Modifier</button></div>
              </div>
            )}
            {ov.type === 'gallery' && (
              <div className="sheet"><h5>{t.photos}</h5>
                <div className="gal">{GALLERY.map(g => <button key={g.name} onClick={() => a.pick(g)}><img src={g.src} alt={g.name} /></button>)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
