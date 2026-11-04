// The Wall replayed in the browser: one Supabase project shared by two phones.
// Every action does what the Flutter code does, with the same tables and the same order of requests:
// - add_friends_page: friends of mine are hidden, a request is sent only if none exists (sender → receiver)
// - follow_request_page: accept deletes the request and inserts the friendship both ways; reject deletes it
// - messages_page: friends from both columns, last message and unread count per friend, received messages marked seen on tap
// - chat_page: load, mark seen, load again; send uploads the picture to chat-pictures then inserts; edit and delete reload
// - home_page: one like per user (select first), insert, then rpc update_publication_likes
// Each request is written to a log, shown next to the phones as in Supabase's request list.

export type Lang = 'fr' | 'en';
export type Profile = { id: string; username: string; nom: string; prenom: string; email: string; online: boolean; avatar_url: string | null; created: string };
export type Publication = { id: string; profile_id: string; content: string | null; image: string | null; likes: number; created_at: string };
export type Like = { id: string; publication_id: string; profile_id: string };
export type Friend = { id: string; user_id: string; friend_id: string; created_at: string };
export type FollowRequest = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string };
export type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; image_url: string | null; seen: boolean; created_at: string };
export type StoredFile = { id: string; name: string; bucket_id: string; created_at: string };
export type Db = {
  profiles: Profile[]; publications: Publication[]; publication_likes: Like[]; friends: Friend[];
  follow_requests: FollowRequest[]; messages: Message[]; 'storage.chat-pictures': StoredFile[];
};
export type Table = keyof Db;
export type Step = 'request' | 'accept' | 'text' | 'image' | 'seen' | 'edit';

/** A log line: plain text, dimmed parts and values, so user text is never read as markup. */
export type Seg = string | { d: string } | { v: string };
export type LogEntry = { id: number; t: number; by: string; code: Seg[]; realtime?: boolean };

export type Engine = {
  db: Db;
  log: LogEntry[];
  steps: Set<Step>;
  /** row id → time it was written, to light the row up in the table editor */
  changed: Map<string, number>;
  /** rows just deleted, shown struck through for a moment */
  gone: { table: Table; row: Record<string, unknown>; t: number }[];
  /** the last table written, for "follow the requests" */
  lastTable: Table;
  /** public URL of an uploaded picture → what to display */
  pictures: Map<string, string>;
  now: () => number;
};

export const PROJECT_URL = 'https://thewall-demo.supabase.co';
export const COLORS: Record<string, string> = { nora: '#e0815e', samir: '#5e9be0', ines: '#a77ee0', karim: '#4fb38a', leo: '#d9a93c' };

let counter = 0;
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
export const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
const iso = (t: number) => new Date(t).toISOString().replace('Z', '+00:00');
export const publicUrl = (bucket: string, name: string) => `${PROJECT_URL}/storage/v1/object/public/${bucket}/${name}`;

const SEED = {
  fr: {
    posts: ['Premier jour de stage demain, je croise les doigts.', "Quelqu'un a un bon tuto sur les streams Supabase ?", 'Le mur est enfin en ligne.', 'Révisions de Flutter ce week-end.', 'Match ce soir à 20 h, qui vient ?'],
    chat: ['Tu as fini la page de connexion ?', 'Oui, je pousse ce soir', 'Ça rend bien !', 'On se voit demain à la BU ?', 'Ok pour 10 h', 'Tu as vu le nouveau post ?']
  },
  en: {
    posts: ['First day of my internship tomorrow, fingers crossed.', 'Anyone got a good tutorial on Supabase streams?', 'The wall is finally online.', 'Flutter revision this weekend.', 'Match tonight at 8, who is coming?'],
    chat: ['Did you finish the login page?', "Yes, I'm pushing it tonight", 'Looks good!', 'See you at the library tomorrow?', 'OK for 10 am', 'Did you see the new post?']
  }
};

/** The starting point: five students; Nora and Samir are not friends yet, Karim has asked Nora. */
export function createEngine(lang: Lang, wallPicture: string, now: () => number = Date.now): Engine {
  const t = now(), H = 3600e3, D = 24 * H, s = SEED[lang];
  const mk = (username: string, prenom: string, nom: string, online: boolean, age: number): Profile =>
    ({ id: uuid(), username, nom, prenom, email: `${username}@thewall.demo`, online, avatar_url: null, created: iso(t - age) });
  const profiles = [mk('nora', 'Nora', 'Benali', true, 40 * D), mk('samir', 'Samir', 'Haddad', true, 38 * D), mk('ines', 'Inès', 'Moreau', false, 35 * D),
    mk('karim', 'Karim', 'Tazi', true, 30 * D), mk('leo', 'Léo', 'Martin', false, 20 * D)];
  const id = Object.fromEntries(profiles.map(p => [p.username, p.id]));
  const likes: Like[] = [];
  const pub = (who: string, content: string, ago: number, likers: string[]): Publication => {
    const p = { id: uuid(), profile_id: id[who], content, image: null, likes: likers.length, created_at: iso(t - ago) };
    likers.forEach(u => likes.push({ id: uuid(), publication_id: p.id, profile_id: id[u] }));
    return p;
  };
  const publications = [pub('ines', s.posts[0], 2 * H, ['nora', 'leo', 'karim']), pub('karim', s.posts[1], 5 * H, ['samir']),
    pub('leo', s.posts[2], D + 3 * H, ['nora', 'samir', 'ines', 'karim']), pub('nora', s.posts[3], 2 * D, ['ines', 'leo']), pub('samir', s.posts[4], 3 * D, [])];
  const friends: Friend[] = [];
  const friend = (a: string, b: string, ago: number) => friends.push({ id: uuid(), user_id: id[a], friend_id: id[b], created_at: iso(t - ago) }, { id: uuid(), user_id: id[b], friend_id: id[a], created_at: iso(t - ago) });
  friend('nora', 'ines', 30 * D); friend('nora', 'leo', 12 * D); friend('samir', 'karim', 25 * D); friend('samir', 'leo', 9 * D);
  const msg = (from: string, to: string, content: string | null, ago: number, seen: boolean, image: string | null = null): Message =>
    ({ id: uuid(), sender_id: id[from], receiver_id: id[to], content, image_url: image, seen, created_at: iso(t - ago) });
  const wallName = `msg_${t - D - H}.jpg`, wallUrl = publicUrl('chat-pictures', wallName);
  const messages = [msg('ines', 'nora', s.chat[0], D + 2 * H, true), msg('nora', 'ines', s.chat[1], D + H, true), msg('nora', 'ines', null, D + H - 60e3, true, wallUrl),
    msg('ines', 'nora', s.chat[2], 2 * H, false), msg('leo', 'nora', s.chat[3], 6 * H, true), msg('nora', 'leo', s.chat[4], 5 * H, false), msg('karim', 'samir', s.chat[5], 4 * H, false)];
  return {
    db: {
      profiles, publications, publication_likes: likes, friends, messages,
      follow_requests: [{ id: uuid(), sender_id: id.karim, receiver_id: id.nora, status: 'pending', created_at: iso(t - 3 * H) }],
      'storage.chat-pictures': [{ id: uuid(), name: wallName, bucket_id: 'chat-pictures', created_at: iso(t - D - H) }]
    },
    log: [], steps: new Set(), changed: new Map(), gone: [], lastTable: 'messages',
    pictures: new Map([[wallUrl, wallPicture]]), now
  };
}

// ---------- helpers ----------
export const profileOf = (e: Engine, id: string) => e.db.profiles.find(p => p.id === id);
export const userId = (e: Engine, username: string) => e.db.profiles.find(p => p.username === username)!.id;
export const nameOf = (e: Engine, id: string) => profileOf(e, id)?.username ?? 'Unknown';
const q = (s: string): Seg[] => [{ d: "'" }, s, { d: "'" }];
function log(e: Engine, by: string, ...code: (Seg | Seg[])[]) {
  e.log.unshift({ id: ++counter, t: e.now(), by: nameOf(e, by), code: code.flat() });
  if (e.log.length > 60) e.log.length = 60;
}
function wrote(e: Engine, table: Table, ids: string[]) {
  const t = e.now();
  ids.forEach(i => e.changed.set(i, t));
  e.lastTable = table;
}
function removed(e: Engine, table: Table, rows: object[]) {
  rows.forEach(row => e.gone.push({ table, row: row as Record<string, unknown>, t: e.now() }));
  e.lastTable = table;
}
const between = (a: string, b: string) => (m: Message) => (m.sender_id === a && m.receiver_id === b) || (m.sender_id === b && m.receiver_id === a);
const newest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

// ---------- session ----------
export function signOut(e: Engine, me: string) {
  const p = profileOf(e, me)!;
  p.online = false;
  log(e, me, 'from(', q('profiles'), ').update({', q('online'), ': ', { v: 'false' }, '}) ', { d: '+' }, ' auth.signOut()');
  wrote(e, 'profiles', [p.id]);
}
export function signIn(e: Engine, me: string) {
  const p = profileOf(e, me)!;
  p.online = true;
  log(e, me, 'auth.signInWithPassword(email: ', q(p.email), ') ', { d: '+' }, ' from(', q('profiles'), ').update({', q('online'), ': ', { v: 'true' }, '})');
  wrote(e, 'profiles', [p.id]);
}
export type SignUpFields = { email: string; password: string; confirm: string; nom: string; prenom: string; username: string };
/** register_page.signUp: checks, then auth.signUp and the profile row. Returns the new id, or the app's error text. */
export function signUp(e: Engine, f: SignUpFields): { id: string } | { error: string } {
  if (f.password !== f.confirm) return { error: 'Passwords do not match!' };
  if (!f.email || !f.password || !f.nom || !f.prenom || !f.username) return { error: 'Please fill all fields!' };
  const p: Profile = { id: uuid(), username: f.username, nom: f.nom, prenom: f.prenom, email: f.email, online: true, avatar_url: null, created: iso(e.now()) };
  e.db.profiles.push(p);
  log(e, p.id, 'auth.signUp(email: ', q(p.email), ') ', { d: '+' }, ' from(', q('profiles'), ').insert({', q('username'), ': ', q(p.username), ', ', { d: '…' }, '})');
  wrote(e, 'profiles', [p.id]);
  return { id: p.id };
}

// ---------- feed ----------
export const feed = (e: Engine) => [...e.db.publications].sort(newest);
export function logFeedStream(e: Engine, me: string) {
  log(e, me, 'from(', q('publications'), ').stream(primaryKey: [', q('id'), ']).order(', q('created_at'), ')');
}
export function logRealtime(e: Engine, me: string, table: Table) {
  e.log.unshift({ id: ++counter, t: e.now(), by: nameOf(e, me), code: [{ d: 'realtime' }, ` ${table} `, { d: '→ stream' }], realtime: true });
}
/** home_page.likePublication: once per user, then the SQL function recounts. */
export function like(e: Engine, me: string, pubId: string): boolean {
  const pub = e.db.publications.find(p => p.id === pubId)!;
  log(e, me, 'from(', q('publication_likes'), ').select().eq(', { d: 'publication, profile' }, ').maybeSingle()');
  if (e.db.publication_likes.some(l => l.publication_id === pubId && l.profile_id === me)) return false;
  const row = { id: uuid(), publication_id: pubId, profile_id: me };
  e.db.publication_likes.push(row);
  log(e, me, 'from(', q('publication_likes'), ').insert({', { d: '…' }, '}) ', { d: '+' }, ' rpc(', q('update_publication_likes'), ')');
  pub.likes = e.db.publication_likes.filter(l => l.publication_id === pubId).length;
  wrote(e, 'publication_likes', [row.id]);
  e.changed.set(pub.id, e.now());
  return true;
}

// ---------- profile ----------
export function loadProfile(e: Engine, me: string) {
  log(e, me, 'from(', q('profiles'), ').stream().eq(', q('id'), ', me) ', { d: '+' }, ' from(', q('friends'), ').select().eq(', q('user_id'), ', me)');
  return { friends: e.db.friends.filter(r => r.user_id === me).length };
}
export const myPublications = (e: Engine, me: string) => e.db.publications.filter(p => p.profile_id === me).sort(newest);

// ---------- friends (my part) ----------
export type Candidate = { id: string; username: string; status: 'Follow' | 'En attente' };
/** add_friends_page._fetchUsers + _getFollowRequestStatus */
export function loadAddFriends(e: Engine, me: string): Candidate[] {
  log(e, me, 'from(', q('friends'), ').select(', q('friend_id'), ') ', { d: '+' }, ' from(', q('profiles'), ').select().neq(', q('id'), ', me)');
  const mine = e.db.friends.filter(r => r.user_id === me).map(r => r.friend_id);
  return e.db.profiles.filter(p => p.id !== me && !mine.includes(p.id)).map(p => ({
    id: p.id, username: p.username,
    status: e.db.follow_requests.some(r => r.sender_id === me && r.receiver_id === p.id && r.status === 'pending') ? 'En attente' : 'Follow'
  }));
}
/** add_friends_page._sendFollowRequest: nothing if a request from me to them already exists. */
export function follow(e: Engine, me: string, to: string): boolean {
  log(e, me, 'from(', q('follow_requests'), ').select().eq(', { d: 'sender, receiver' }, ').maybeSingle()');
  if (e.db.follow_requests.some(r => r.sender_id === me && r.receiver_id === to)) return false;
  const row = { id: uuid(), sender_id: me, receiver_id: to, status: 'pending', created_at: iso(e.now()) };
  e.db.follow_requests.push(row);
  log(e, me, 'from(', q('follow_requests'), ').insert({', q('receiver_id'), ': ', nameOf(e, to), ', ', q('status'), ': ', q('pending'), '})');
  wrote(e, 'follow_requests', [row.id]);
  e.steps.add('request');
  return true;
}
export function loadRequests(e: Engine, me: string): FollowRequest[] {
  log(e, me, 'from(', q('follow_requests'), ').select(', { d: 'sender, receiver' }, ').or(', q('sender_id.eq.me, receiver_id.eq.me'), ')');
  return e.db.follow_requests.filter(r => r.sender_id === me || r.receiver_id === me).map(r => ({ ...r }));
}
export function accept(e: Engine, me: string, requestId: string) {
  const r = e.db.follow_requests.find(x => x.id === requestId);
  if (!r) return;
  e.db.follow_requests = e.db.follow_requests.filter(x => x !== r);
  removed(e, 'follow_requests', [r]);
  log(e, me, 'from(', q('follow_requests'), ').delete().eq(', q('id'), ', ', { d: '…' }, ')');
  const t = iso(e.now());
  const rows = [{ id: uuid(), user_id: me, friend_id: r.sender_id, created_at: t }, { id: uuid(), user_id: r.sender_id, friend_id: me, created_at: t }];
  e.db.friends.push(...rows);
  log(e, me, 'from(', q('friends'), ').insert([', { d: `{me → ${nameOf(e, r.sender_id)}}, {${nameOf(e, r.sender_id)} → me}` }, '])');
  wrote(e, 'friends', rows.map(x => x.id));
  e.steps.add('accept');
}
export function reject(e: Engine, me: string, requestId: string) {
  const r = e.db.follow_requests.find(x => x.id === requestId);
  if (!r) return;
  e.db.follow_requests = e.db.follow_requests.filter(x => x !== r);
  removed(e, 'follow_requests', [r]);
  log(e, me, 'from(', q('follow_requests'), ').delete().eq(', q('id'), ', ', { d: '…' }, ')');
}

// ---------- messaging (my part) ----------
export type LastMessage = { by: string; text: string | null; image: boolean } | null;
export type Conversation = { id: string; username: string; last: LastMessage; unread: number };
/** messages_page: friends found in either column, then last message and unread count for each. */
export function loadConversations(e: Engine, me: string): Conversation[] {
  log(e, me, 'from(', q('friends'), ').select(', { d: '…' }, ').or(', q('user_id.eq.me, friend_id.eq.me'), ')');
  const others = new Map<string, string>();
  e.db.friends.filter(r => r.user_id === me || r.friend_id === me).forEach(r => { const o = r.user_id === me ? r.friend_id : r.user_id; others.set(o, nameOf(e, o)); });
  const list = [...others].map(([id, username]) => {
    const m = e.db.messages.filter(between(me, id)).sort(newest)[0];
    return { id, username, last: m ? { by: nameOf(e, m.sender_id), text: m.content, image: !!m.image_url } : null,
      unread: e.db.messages.filter(x => x.sender_id === id && x.receiver_id === me && !x.seen).length };
  });
  log(e, me, 'from(', q('messages'), ').select() ', { d: `× ${list.length * 2}` });
  return list;
}
/** Received messages from this friend become seen. Returns how many rows changed. */
export function markSeen(e: Engine, me: string, friend: string): number {
  const rows = e.db.messages.filter(m => m.receiver_id === me && m.sender_id === friend && !m.seen);
  rows.forEach(m => { m.seen = true; });
  log(e, me, 'from(', q('messages'), ').update({', q('seen'), ': ', { v: 'true' }, '}).eq(', q('receiver_id'), ', me).eq(', q('sender_id'), `, ${nameOf(e, friend)}) `, { d: `→ ${rows.length}` });
  if (rows.length) { wrote(e, 'messages', rows.map(r => r.id)); e.steps.add('seen'); }
  return rows.length;
}
export function loadChat(e: Engine, me: string, friend: string): Message[] {
  log(e, me, 'from(', q('messages'), ').select().or(', { d: `me ↔ ${nameOf(e, friend)}` }, ').order(', q('created_at'), ')');
  return e.db.messages.filter(between(me, friend)).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => ({ ...m }));
}
/** chat_page._initPage: my profile, the messages, mark seen, the messages again. */
export function openChat(e: Engine, me: string, friend: string): Message[] {
  log(e, me, 'from(', q('profiles'), ').select(', q('username, avatar_url'), ').eq(', q('id'), ', me).single()');
  loadChat(e, me, friend);
  markSeen(e, me, friend);
  return loadChat(e, me, friend);
}
export type Picture = { name: string; src: string };
/** chat_page._sendMessage: the picture goes to the chat-pictures bucket first, the row keeps its public URL. */
export function sendMessage(e: Engine, me: string, friend: string, text: string, picture: Picture | null): Message | null {
  text = text.trim();
  if (!picture && !text) return null;
  let image_url: string | null = null;
  if (picture) {
    const name = `msg_${e.now()}.jpg`;
    image_url = publicUrl('chat-pictures', name);
    e.pictures.set(image_url, picture.src);
    const f = { id: uuid(), name, bucket_id: 'chat-pictures', created_at: iso(e.now()) };
    e.db['storage.chat-pictures'].push(f);
    log(e, me, 'storage.from(', q('chat-pictures'), ').upload(', q(name), ', ', { d: 'File' }, ') ', { d: '+' }, ' getPublicUrl()');
    wrote(e, 'storage.chat-pictures', [f.id]);
    e.steps.add('image');
  }
  const row: Message = { id: uuid(), sender_id: me, receiver_id: friend, content: text || null, image_url, seen: false, created_at: iso(e.now()) };
  e.db.messages.push(row);
  const shown = text.length > 40 ? text.slice(0, 40) + '…' : text;
  log(e, me, 'from(', q('messages'), ').insert({', q('receiver_id'), `: ${nameOf(e, friend)}, `, q('content'), ': ', text ? q(shown) : { v: 'null' }, ', ', q('image_url'), ': ', image_url ? { d: 'url' } : { v: 'null' }, '}).select().single()');
  wrote(e, 'messages', [row.id]);
  if (text) e.steps.add('text');
  return { ...row };
}
export function editMessage(e: Engine, me: string, id: string, text: string): boolean {
  text = text.trim();
  if (!text) return false;
  const m = e.db.messages.find(x => x.id === id);
  if (m) m.content = text;
  log(e, me, 'from(', q('messages'), ').update({', q('content'), ': ', q(text), '}).eq(', q('id'), ', ', { d: '…' }, ')');
  wrote(e, 'messages', [id]);
  e.steps.add('edit');
  return true;
}
/** Deletes the row only: the picture stays in the bucket, as in the app. */
export function deleteMessage(e: Engine, me: string, id: string) {
  const m = e.db.messages.find(x => x.id === id);
  e.db.messages = e.db.messages.filter(x => x !== m);
  if (m) removed(e, 'messages', [m]);
  log(e, me, 'from(', q('messages'), ').delete().eq(', q('id'), ', ', { d: '…' }, ')');
  e.steps.add('edit');
}
export function logPicker(e: Engine, me: string) {
  log(e, me, { d: 'image_picker' }, ' pickImage(source: ImageSource.gallery)');
}

// ---------- display helpers shared with the screens ----------
const pad = (n: number) => String(n).padStart(2, '0');
/** home_page: d/m/yyyy HH:mm */
export const feedDate = (s: string) => { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** chat_page: dd/MM HH:mm */
export const chatDate = (s: string) => { const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** profile_page.relativeTime, in the app's own words */
export function relativeTime(s: string, now: number) {
  const m = (now - new Date(s).getTime()) / 60e3;
  if (m < 1) return "À l'instant";
  if (m < 60) return `${Math.floor(m)} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h`;
  return `${Math.floor(m / 1440)} j`;
}
