// Koursero replayed in the browser: the Django views, the session cart and the SQLite tables, copied from the project's code.
// Every click is a "request" to this little server: it runs the view, logs a runserver line and the ORM's SQL, and returns a page or a redirect.

export type Lang = 'fr' | 'en';
export type User = { id: number; username: string; first_name: string; last_name: string; email: string; password: string; is_staff: boolean; is_superuser: boolean; is_active: boolean; last_login: string | null; date_joined: string };
export type Profile = { id: number; user_id: number; phone: string; city: string; country: string; old_cart: string | null };
export type Formateur = { id: number; username: string; email: string };
export type Formation = { id: number; titre: string; descriptif: string; prix: number; date_formation: string; formateur_id: number; image: string };
export type SessionRow = { session_key: string; data: SessionData; expire_date: string };
/** the cart is a Python dict: insertion order matters (display, float sums), so it is kept as ordered pairs */
export type Cart = [string, number][];
export type SessionData = { _auth_user_id?: string; _auth_user_backend?: string; _auth_user_hash?: string; session_key?: Cart };
export type Db = {
  auth_user: User[]; store_profile: Profile[]; store_formateur: Formateur[]; store_formation: Formation[];
  store_client: { id: number; username: string; email: string }[]; store_reservation: { id: number; client_id: number; formation_id: number; formateur_id: number; date_reservation: string }[];
  django_session: SessionRow[];
};
export type Table = keyof Db;
export type Step = 'browse' | 'cart' | 'login' | 'restore' | 'register' | 'admin';
export type Message = { level: 'success' | 'error'; text: string };
/** One request to runserver, with the SQL the ORM ran for it. */
export type LogLine = { id: number; t: number; method: 'GET' | 'POST'; path: string; status: number; bytes: number; sql: string[]; xhr?: boolean };
export type Page =
  | { v: 'home'; formations: Formation[] } | { v: 'formation'; f: Formation; trainer: string } | { v: 'search'; searched: Formation[] | null }
  | { v: 'about' } | { v: 'login' } | { v: 'register' } | { v: 'update_user'; user: User } | { v: 'update_info'; profile: Profile }
  | { v: 'update_password' } | { v: 'cart'; items: Formation[]; total: number }
  | { v: 'admin_login'; error: string } | { v: 'admin_index' } | { v: 'admin_list'; model: AdminModel }
  | { v: 'admin_change'; f: Formation | null } | { v: 'admin_delete'; f: Formation }
  | { v: 'debug404'; path: string } | { v: 'debug500'; path: string; error: string };
export type AdminModel = 'formation' | 'formateur' | 'client' | 'reservation' | 'profile' | 'user' | 'group';
export type Response = { page: Page; messages: Message[]; user: User | null; cartCount: number } | { redirect: string };

export type Engine = {
  lang: Lang; db: Db; now: () => number;
  /** the browser's sessionid cookie */
  cookie: string | null;
  /** django.contrib.messages, waiting for the next rendered page */
  pending: Message[];
  log: LogLine[]; steps: Set<Step>;
  changed: Map<string, number>; gone: { table: Table; row: Record<string, unknown>; t: number }[]; lastTable: Table | null;
  seq: Record<string, number>;
  /** passwords, kept apart: the tables only show their hash */
  secrets: Map<number, string>;
};

// ---------------------------------------------------------------- seed: the course catalogue of the repo's db.sqlite3, sample accounts
const CATALOGUE: [string, string, number, string][] = [
  ['Python and Programmations', 'This is a masterclass about python', 600.66, '2024-05-04T18:21:48'],
  ['C++ Language', 'A C++ MasterClass', 69, '2024-05-04T19:28:53'],
  ['Php Formation For Beginners', 'A MasterClass about PHP', 1200, '2024-05-04T19:30:13'],
  ['Java MasterClass', 'A class about Java', 200, '2024-05-04T19:31:16'],
  ['PL/SQL', 'A MasterClass About PL/SQL', 456, '2024-05-04T19:31:40'],
  ['JS web development', 'A JS course', 789, '2024-05-04T19:32:11'],
  ['TL/SQL', 'TL/SQL Formation', 417, '2024-05-04T19:32:46'],
  ['Visual Basic.NET', 'A Visual Basic.NET course', 6352, '2024-05-04T19:33:17']
];
export const ACCOUNTS = { customer: { username: 'yassine', password: 'Koursero2024!' }, admin: { username: 'admin', password: 'admin-koursero' } };
const HASH = (id: number) => `pbkdf2_sha256$720000$${'k0ur5er0'.slice(0, 4)}${id}x…`;

export function createEngine(lang: Lang, now: () => number = Date.now): Engine {
  const joined = '2024-05-04 16:12:20';
  const e: Engine = {
    lang, now, cookie: null, pending: [], log: [], steps: new Set(), changed: new Map(), gone: [], lastTable: null, secrets: new Map(),
    seq: { auth_user: 3, store_profile: 3, store_formation: 8 },
    db: {
      auth_user: [
        { id: 1, username: 'admin', first_name: '', last_name: '', email: 'admin@koursero.ma', password: HASH(1), is_staff: true, is_superuser: true, is_active: true, last_login: '2024-05-27 17:27:52', date_joined: joined },
        { id: 2, username: 'yassine', first_name: 'Yassine', last_name: 'Bennani', email: 'yassine@koursero.ma', password: HASH(2), is_staff: false, is_superuser: false, is_active: true, last_login: '2024-05-26 20:43:45', date_joined: '2024-05-26 20:11:39' },
        { id: 3, username: 'salma', first_name: 'Salma', last_name: 'Idrissi', email: 'salma@koursero.ma', password: HASH(3), is_staff: false, is_superuser: false, is_active: true, last_login: null, date_joined: '2024-05-26 21:02:10' }
      ],
      // the saved cart of the demo customer, as the repo's database keeps one per profile
      store_profile: [
        { id: 1, user_id: 1, phone: '', city: '', country: '', old_cart: null },
        { id: 2, user_id: 2, phone: '0612345678', city: 'Rabat', country: 'Morocco', old_cart: '{"1": 600.66, "4": 200.0}' },
        { id: 3, user_id: 3, phone: '', city: '', country: '', old_cart: null }
      ],
      store_formateur: [{ id: 2, username: 'Hamza', email: 'hamza@koursero.ma' }],
      store_formation: CATALOGUE.map(([titre, descriptif, prix, date], i) => ({ id: i + 1, titre, descriptif, prix, date_formation: date, formateur_id: 2, image: `uploads/formation/${i + 1}.jpg` })),
      store_client: [], store_reservation: [], django_session: []
    }
  };
  e.secrets.set(1, ACCOUNTS.admin.password); e.secrets.set(2, ACCOUNTS.customer.password); e.secrets.set(3, 'Salma2024!');
  return e;
}

// ---------------------------------------------------------------- helpers
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const stamp = (e: Engine) => new Date(e.now()).toISOString().replace('T', ' ').slice(0, 19);
const mark = (e: Engine, t: Table, id: number | string) => { e.changed.set(`${t}#${id}`, e.now()); e.lastTable = t; };
const drop = (e: Engine, t: Table, row: object) => { e.gone.push({ table: t, row: { ...row }, t: e.now() }); e.lastTable = t; };
/** Python's str(float): 200.0, 600.66 */
export const pyFloat = (n: number) => Number.isInteger(n) ? `${n}.0` : String(n);
/** Django's DecimalField with 2 places: 69.00, 600.66 */
export const dec = (n: number) => n.toFixed(2);
/** str(self.cart).replace("'", '"'): what Cart.add() writes into Profile.old_cart */
export const cartString = (cart: Cart) => `{${cart.map(([k, v]) => `"${k}": ${pyFloat(v)}`).join(', ')}}`;
const has = (cart: Cart, k: string) => cart.some(([x]) => x === k);
/** the session dict, shown the way Python prints it */
export const sessionString = (d: SessionData) => `{${Object.entries(d).map(([k, v]) => `'${k}': ${Array.isArray(v) ? `{${(v as Cart).map(([a, b]) => `'${a}': ${pyFloat(b)}`).join(', ')}}` : `'${v}'`}`).join(', ')}}`;
const randKey = () => Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
/** Django's default DATETIME_FORMAT 'N j, Y, P' (en-us, UTC) */
export function djDate(iso: string) {
  const d = new Date(iso + 'Z');
  const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  const time = h === 0 && m === 0 ? 'midnight' : h === 12 && m === 0 ? 'noon' : `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${time}`;
}

type Ctx = { e: Engine; sql: string[]; row: SessionRow | null; user: User | null; dirty: boolean };
const SEL_F = 'SELECT "store_formation"."id", "store_formation"."titre", "store_formation"."descriptif", "store_formation"."prix", "store_formation"."date_formation", "store_formation"."formateur_id", "store_formation"."image" FROM "store_formation"';

/** SessionMiddleware + AuthenticationMiddleware: the session is read lazily, the user from it */
function open(e: Engine): Ctx {
  const c: Ctx = { e, sql: [], row: null, user: null, dirty: false };
  if (e.cookie) {
    c.sql.push(`SELECT "django_session"."session_key", "django_session"."session_data", "django_session"."expire_date" FROM "django_session" WHERE ("django_session"."expire_date" > '${stamp(e)}' AND "django_session"."session_key" = '${e.cookie}') LIMIT 21`);
    c.row = e.db.django_session.find(s => s.session_key === e.cookie) ?? null;
    const uid = c.row?.data._auth_user_id;
    if (uid) {
      c.sql.push(`SELECT "auth_user"."id", "auth_user"."password", "auth_user"."last_login", "auth_user"."is_superuser", "auth_user"."username", … FROM "auth_user" WHERE "auth_user"."id" = ${uid} LIMIT 21`);
      c.user = e.db.auth_user.find(u => u.id === Number(uid)) ?? null;
    }
  }
  return c;
}
/** cart.cart.Cart(request): creates session['session_key'] = {} the first time, which saves a session */
function cartOf(c: Ctx): Cart {
  if (!c.row) { c.row = { session_key: randKey(), data: {}, expire_date: '' }; c.e.cookie = c.row.session_key; }
  if (!c.row.data.session_key) { c.row.data.session_key = []; c.dirty = true; }
  return c.row.data.session_key;
}
/** SessionMiddleware.process_response: saves the session when modified */
function close(c: Ctx) {
  const { e } = c;
  if (!c.row || !c.dirty) return;
  c.row.expire_date = new Date(e.now() + 14 * 86_400_000).toISOString().replace('T', ' ').slice(0, 19);
  const exists = e.db.django_session.includes(c.row);
  if (!exists) {
    e.db.django_session.push(c.row);
    c.sql.push(`INSERT INTO "django_session" ("session_key", "session_data", "expire_date") VALUES ('${c.row.session_key}', '…', '${c.row.expire_date}')`);
  } else c.sql.push(`UPDATE "django_session" SET "session_data" = '…', "expire_date" = '${c.row.expire_date}' WHERE "django_session"."session_key" = '${c.row.session_key}'`);
  mark(e, 'django_session', c.row.session_key);
}
function saveOldCart(c: Ctx, cart: Cart) {
  if (!c.user) return;
  const p = c.e.db.store_profile.find(x => x.user_id === c.user!.id);
  if (!p) return;
  p.old_cart = cartString(cart);
  c.sql.push(`UPDATE "store_profile" SET "old_cart" = ${q(p.old_cart)} WHERE "store_profile"."user_id" = ${c.user.id}`);
  mark(c.e, 'store_profile', p.id);
}
const msg = (e: Engine, level: Message['level'], text: string) => e.pending.push({ level, text });

/** One HTTP request to the dev server. */
export function request(e: Engine, method: 'GET' | 'POST', url: string, form: Record<string, string> = {}, xhr = false): Response | { json: Record<string, unknown> } {
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
  const c = open(e);
  let out: Response | { json: Record<string, unknown> };
  try { out = route(c, method, path.split('?')[0], form); }
  catch (err) { out = { page: { v: 'debug500', path, error: String((err as Error).message) }, messages: [], user: c.user, cartCount: 0 }; }
  close(c);
  const status = 'redirect' in out ? 302 : 'json' in out ? 200 : out.page.v === 'debug404' ? 404 : out.page.v === 'debug500' ? 500 : 200;
  const bytes = 'redirect' in out ? 0 : 'json' in out ? JSON.stringify(out.json).length : 4200 + Math.floor(Math.random() * 900) + ('page' in out && out.page.v === 'home' ? 3800 : 0);
  e.log.unshift({ id: (e.log[0]?.id ?? 0) + 1, t: e.now(), method, path, status, bytes, sql: c.sql, xhr });
  if (e.log.length > 60) e.log.pop();
  return out;
}

/** A rendered base.html page: the context processor builds the cart, the messages are consumed. */
function render(c: Ctx, page: Page): Response {
  const cart = cartOf(c);
  const messages = c.e.pending; c.e.pending = [];
  return { page, messages, user: c.user, cartCount: cart.length };
}
function adminRender(c: Ctx, page: Page): Response {
  const messages = c.e.pending; c.e.pending = [];
  return { page, messages, user: c.user, cartCount: 0 };
}

function route(c: Ctx, method: 'GET' | 'POST', path: string, f: Record<string, string>): Response | { json: Record<string, unknown> } {
  const { e } = c;
  const db = e.db;
  const formations = () => { c.sql.push(SEL_F); return db.store_formation.map(x => ({ ...x })); };
  const formation = (id: number) => {
    c.sql.push(`${SEL_F} WHERE "store_formation"."id" = ${id} LIMIT 21`);
    return db.store_formation.find(x => x.id === id);
  };
  const trainerOf = (fm: Formation) => {
    c.sql.push(`SELECT "store_formateur"."id", "store_formateur"."username", "store_formateur"."email", "store_formateur"."password" FROM "store_formateur" WHERE "store_formateur"."id" = ${fm.formateur_id} LIMIT 21`);
    return db.store_formateur.find(t => t.id === fm.formateur_id)?.username ?? '';
  };
  const needLogin = () => { msg(e, 'success', 'You must be Logged in to access this page!!'); return { redirect: '/' }; };

  // ---- admin site
  if (path.startsWith('/admin')) return admin(c, method, path, f);

  // ---- store
  if (path === '/') { e.steps.add('browse'); return render(c, { v: 'home', formations: formations() }); }
  const fm = /^\/formation\/(\d+)$/.exec(path);
  if (fm) {
    const x = formation(Number(fm[1]));
    if (!x) throw new Error('Formation matching query does not exist.');
    e.steps.add('browse');
    return render(c, { v: 'formation', f: { ...x }, trainer: trainerOf(x) });
  }
  if (path === '/about/') return render(c, { v: 'about' });
  if (path === '/search') {
    if (method === 'GET') return render(c, { v: 'search', searched: null });
    const term = f.searched ?? '';
    c.sql.push(`${SEL_F} WHERE "store_formation"."titre" LIKE '%${term.replace(/'/g, "''")}%' ESCAPE '\\'`);
    const found = db.store_formation.filter(x => x.titre.toLowerCase().includes(term.toLowerCase())).map(x => ({ ...x }));
    if (!found.length) msg(e, 'success', 'No such Formation in our Koursero!');
    e.steps.add('browse');
    return render(c, { v: 'search', searched: found });
  }
  if (path === '/login/') {
    if (method === 'GET') return render(c, { v: 'login' });
    c.sql.push(`SELECT "auth_user"."id", "auth_user"."password", … FROM "auth_user" WHERE "auth_user"."username" = ${q(f.username ?? '')} LIMIT 21`);
    const u = db.auth_user.find(x => x.username === f.username && x.is_active);
    if (!u || e.secrets.get(u.id) !== f.password) { msg(e, 'error', 'There was an error, please try again..'); return { redirect: '/login/' }; }
    loginAs(c, u);
    // restore the saved cart into the session
    c.sql.push(`SELECT "store_profile"."id", "store_profile"."phone", "store_profile"."city", "store_profile"."country", "store_profile"."user_id", "store_profile"."old_cart" FROM "store_profile" WHERE "store_profile"."user_id" = ${u.id} LIMIT 21`);
    const p = db.store_profile.find(x => x.user_id === u.id);
    if (p?.old_cart) {
      // json.loads keeps the saved order
      const saved = [...p.old_cart.matchAll(/"(\d+)":\s*([\d.]+)/g)].map(m => [m[1], Number(m[2])] as [string, number]);
      const cart = cartOf(c);
      for (const [k, price] of saved) { if (!has(cart, k)) cart.push([k, price]); c.dirty = true; saveOldCart(c, cart); }
      if (saved.length) e.steps.add('restore');
    }
    e.steps.add('login');
    msg(e, 'success', 'You have been logged in!');
    return { redirect: '/' };
  }
  if (path === '/logout') {
    if (c.row) { db.django_session = db.django_session.filter(s => s !== c.row); drop(e, 'django_session', c.row); c.sql.push(`DELETE FROM "django_session" WHERE "django_session"."session_key" IN ('${c.row.session_key}')`); }
    // logout() flushes the session: nothing is saved until the next page creates the cart again
    c.row = null; e.cookie = null; c.user = null; c.dirty = false;
    msg(e, 'success', 'You have been logged out!');
    return { redirect: '/' };
  }
  if (path === '/register/') {
    if (method === 'GET') return render(c, { v: 'register' });
    const err = signupErrors(c, f);
    if (err) { msg(e, 'error', 'There was an error, please try again..'); return { redirect: '/register/' }; }
    const u: User = { id: ++e.seq.auth_user, username: f.username, first_name: f.first_name, last_name: f.last_name, email: f.email, password: HASH(e.seq.auth_user),
      is_staff: false, is_superuser: false, is_active: true, last_login: null, date_joined: stamp(e) };
    db.auth_user.push(u); e.secrets.set(u.id, f.password1); mark(e, 'auth_user', u.id);
    c.sql.push(`INSERT INTO "auth_user" ("password", "last_login", "is_superuser", "username", "last_name", "email", "is_staff", "is_active", "date_joined", "first_name") VALUES ('pbkdf2_sha256$720000$…', NULL, 0, ${q(u.username)}, ${q(u.last_name)}, ${q(u.email)}, 0, 1, '${u.date_joined}', ${q(u.first_name)})`);
    // post_save signal: create_profile
    const p: Profile = { id: ++e.seq.store_profile, user_id: u.id, phone: '', city: '', country: '', old_cart: null };
    db.store_profile.push(p); mark(e, 'store_profile', p.id);
    c.sql.push(`INSERT INTO "store_profile" ("user_id", "phone", "city", "country", "old_cart") VALUES (${u.id}, '', '', '', NULL)`);
    c.sql.push(`SELECT "auth_user"."id", "auth_user"."password", … FROM "auth_user" WHERE "auth_user"."username" = ${q(u.username)} LIMIT 21`);
    loginAs(c, u);
    e.steps.add('register');
    msg(e, 'success', 'You have been registered successfully !');
    return { redirect: '/update_info/' };
  }
  if (path === '/update_user/') {
    if (!c.user) return needLogin();
    const u = c.user;
    if (method === 'GET') return render(c, { v: 'update_user', user: { ...u } });
    if (!f.username?.trim() || (f.username !== u.username && db.auth_user.some(x => x.username === f.username))) return render(c, { v: 'update_user', user: { ...u, ...f } as User });
    Object.assign(u, { username: f.username.trim(), first_name: f.first_name ?? '', last_name: f.last_name ?? '', email: f.email ?? '' });
    c.sql.push(`UPDATE "auth_user" SET "password" = '…', "last_login" = …, "username" = ${q(u.username)}, "last_name" = ${q(u.last_name)}, "email" = ${q(u.email)}, … "first_name" = ${q(u.first_name)} WHERE "auth_user"."id" = ${u.id}`);
    mark(e, 'auth_user', u.id);
    loginAs(c, u);
    msg(e, 'success', 'User Profile has been updated!!');
    return { redirect: '/' };
  }
  if (path === '/update_info/') {
    if (!c.user) return needLogin();
    c.sql.push(`SELECT "store_profile"."id", … FROM "store_profile" INNER JOIN "auth_user" ON ("store_profile"."user_id" = "auth_user"."id") WHERE "auth_user"."id" = ${c.user.id} LIMIT 21`);
    const p = db.store_profile.find(x => x.user_id === c.user!.id)!;
    if (method === 'GET') return render(c, { v: 'update_info', profile: { ...p } });
    Object.assign(p, { phone: f.phone ?? '', city: f.city ?? '', country: f.country ?? '' });
    c.sql.push(`UPDATE "store_profile" SET "user_id" = ${p.user_id}, "phone" = ${q(p.phone)}, "city" = ${q(p.city)}, "country" = ${q(p.country)}, "old_cart" = ${p.old_cart ? q(p.old_cart) : 'NULL'} WHERE "store_profile"."id" = ${p.id}`);
    mark(e, 'store_profile', p.id);
    msg(e, 'success', 'Your Profile has been updated!!');
    return { redirect: '/update_info/' };
  }
  if (path === '/update_password/') {
    if (method === 'GET' || !c.user) return render(c, { v: 'update_password' });
    const errors = passwordErrors(c.user, f.new_password1 ?? '', f.new_password2 ?? '');
    if (errors.length) { errors.forEach(x => msg(e, 'error', x)); return render(c, { v: 'update_password' }); }
    e.secrets.set(c.user.id, f.new_password1);
    c.user.password = HASH(c.user.id) + 'n';
    c.sql.push(`UPDATE "auth_user" SET "password" = 'pbkdf2_sha256$720000$…', … WHERE "auth_user"."id" = ${c.user.id}`);
    mark(e, 'auth_user', c.user.id);
    // no update_session_auth_hash(): the session's hash no longer matches, the user is signed out on the next request
    if (c.row) { delete c.row.data._auth_user_id; delete c.row.data._auth_user_hash; delete c.row.data._auth_user_backend; c.dirty = true; }
    msg(e, 'success', 'Your password has been updated. Please log in again.');
    return { redirect: '/login/' };
  }

  // ---- cart
  if (path === '/cart/') {
    const cart = cartOf(c);
    const ids = cart.map(([k]) => Number(k));
    c.sql.push(`${SEL_F} WHERE "store_formation"."id" IN (${ids.join(', ')})`);
    // filter(id__in=...) comes back in table order; the total sums the session's prices in insertion order
    const items = db.store_formation.filter(x => ids.includes(x.id)).map(x => ({ ...x }));
    const total = cart.reduce((s, [, p]) => s + p, 0);
    return render(c, { v: 'cart', items, total });
  }
  if (path === '/cart/add/' && f.action === 'post') {
    const cart = cartOf(c);
    const id = Number(f.formation_id);
    const x = formation(id);
    if (!x) return { json: { detail: 'Not found' } };
    if (!has(cart, String(id))) cart.push([String(id), x.prix]);
    c.dirty = true;
    saveOldCart(c, cart);
    msg(e, 'success', 'Formation Added to Cart...');
    e.steps.add('cart');
    return { json: { qty: cart.length } };
  }
  if (path === '/cart/delete/' && f.action === 'post') {
    const cart = cartOf(c);
    const k = String(Number(f.formation_id));
    const i = cart.findIndex(([x]) => x === k);
    if (i >= 0) cart.splice(i, 1);
    c.dirty = true;
    saveOldCart(c, cart);
    msg(e, 'success', 'Formation Deleted from Cart...');
    return { json: { formation: Number(f.formation_id) } };
  }
  return render(c, { v: 'debug404', path });
}

function loginAs(c: Ctx, u: User) {
  const { e } = c;
  // login(): cycle_key() keeps the data under a new key, then stores the user
  if (c.row) {
    const old = c.row.session_key;
    if (e.db.django_session.includes(c.row)) c.sql.push(`DELETE FROM "django_session" WHERE "django_session"."session_key" IN ('${old}')`);
    e.db.django_session = e.db.django_session.filter(s => s !== c.row);
    c.row = { ...c.row, session_key: randKey(), data: { ...c.row.data } };
  } else c.row = { session_key: randKey(), data: {}, expire_date: '' };
  e.cookie = c.row.session_key;
  c.row.data = { ...c.row.data, _auth_user_id: String(u.id), _auth_user_backend: 'django.contrib.auth.backends.ModelBackend', _auth_user_hash: 'a3f9…' };
  c.dirty = true;
  u.last_login = stamp(e);
  c.sql.push(`UPDATE "auth_user" SET "last_login" = '${u.last_login}' WHERE "auth_user"."id" = ${u.id}`);
  mark(e, 'auth_user', u.id);
  c.user = u;
}

const COMMON = ['password', 'password123', '12345678', 'azerty123', 'qwerty123', 'koursero'];
function passwordErrors(u: { username: string; first_name?: string; last_name?: string; email?: string }, p1: string, p2: string): string[] {
  if (!p1 || !p2) return ['This field is required.'];
  if (p1 !== p2) return ['The two password fields didn’t match.'];
  const out: string[] = [];
  const similar = [u.username, u.first_name, u.last_name, (u.email ?? '').split('@')[0]].filter(x => x && x.length > 2).some(x => p1.toLowerCase().includes(x!.toLowerCase()));
  if (similar) out.push('The password is too similar to the username.');
  if (p1.length < 8) out.push('This password is too short. It must contain at least 8 characters.');
  if (COMMON.includes(p1.toLowerCase())) out.push('This password is too common.');
  if (/^\d+$/.test(p1)) out.push('This password is entirely numeric.');
  return out;
}
function signupErrors(c: Ctx, f: Record<string, string>) {
  if (!['username', 'first_name', 'last_name', 'email', 'password1', 'password2'].every(k => (f[k] ?? '').trim())) return true;
  if (!/^[\w.@+-]+$/.test(f.username) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return true;
  c.sql.push(`SELECT 1 AS "a" FROM "auth_user" WHERE "auth_user"."username" = ${q(f.username)} LIMIT 1`);
  if (c.e.db.auth_user.some(u => u.username.toLowerCase() === f.username.toLowerCase())) return true;
  return passwordErrors(f as never, f.password1, f.password2).length > 0;
}

// ---------------------------------------------------------------- Django admin (admin.site.register for the five store models, User with a Profile inline)
function admin(c: Ctx, method: 'GET' | 'POST', path: string, f: Record<string, string>): Response {
  const { e } = c;
  const db = e.db;
  if (path === '/admin/logout/') return { redirect: '/logout' };
  if (path === '/admin/login/') {
    if (method === 'GET') return adminRender(c, { v: 'admin_login', error: '' });
    c.sql.push(`SELECT "auth_user"."id", "auth_user"."password", … FROM "auth_user" WHERE "auth_user"."username" = ${q(f.username ?? '')} LIMIT 21`);
    const u = db.auth_user.find(x => x.username === f.username);
    if (!u || e.secrets.get(u.id) !== f.password || !u.is_staff)
      return adminRender(c, { v: 'admin_login', error: 'Please enter the correct username and password for a staff account. Note that both fields may be case-sensitive.' });
    loginAs(c, u);
    return { redirect: '/admin/' };
  }
  if (!c.user?.is_staff) return { redirect: `/admin/login/?next=${path}` };
  if (path === '/admin/') return adminRender(c, { v: 'admin_index' });
  const list = /^\/admin\/(store|auth)\/(\w+)\/$/.exec(path);
  if (list) {
    const model = list[2] as AdminModel;
    if (method === 'POST' && model === 'formation' && f.action === 'delete_selected') { /* handled by the change view */ }
    c.sql.push(`SELECT COUNT(*) AS "__count" FROM "${list[1] === 'auth' ? 'auth' : 'store'}_${model}"`, `SELECT … FROM "${list[1] === 'auth' ? 'auth' : 'store'}_${model}" ORDER BY "${list[1] === 'auth' ? 'auth' : 'store'}_${model}"."id" DESC`);
    if (model === 'formation') e.steps.add('admin');
    return adminRender(c, { v: 'admin_list', model });
  }
  if (path === '/admin/store/formation/add/') {
    if (method === 'GET') return adminRender(c, { v: 'admin_change', f: null });
    if (!f.titre?.trim() || !f.prix?.trim() || isNaN(Number(f.prix))) return adminRender(c, { v: 'admin_change', f: null });
    const x: Formation = { id: ++e.seq.store_formation, titre: f.titre.trim(), descriptif: f.descriptif ?? '', prix: Number(Number(f.prix).toFixed(2)), date_formation: stamp(e).replace(' ', 'T'), formateur_id: 2, image: f.image || 'uploads/formation/default.jpg' };
    db.store_formation.push(x); mark(e, 'store_formation', x.id);
    c.sql.push(`INSERT INTO "store_formation" ("titre", "descriptif", "prix", "date_formation", "formateur_id", "image") VALUES (${q(x.titre)}, ${q(x.descriptif)}, '${dec(x.prix)}', '${stamp(e)}', 2, ${q(x.image)})`);
    c.sql.push(`INSERT INTO "django_admin_log" ("action_time", "user_id", "content_type_id", "object_id", "object_repr", "action_flag", "change_message") VALUES (…, ${c.user.id}, …, '${x.id}', ${q(x.titre)}, 1, '[{"added": {}}]')`);
    msg(e, 'success', `The formation “${x.titre}” was added successfully.`);
    e.steps.add('admin');
    return { redirect: '/admin/store/formation/' };
  }
  const ch = /^\/admin\/store\/formation\/(\d+)\/(change|delete)\/$/.exec(path);
  if (ch) {
    const id = Number(ch[1]);
    c.sql.push(`${SEL_F} WHERE "store_formation"."id" = ${id} LIMIT 21`);
    const x = db.store_formation.find(y => y.id === id);
    if (!x) { msg(e, 'error', `Formation with ID “${id}” doesn’t exist. Perhaps it was deleted?`); return { redirect: '/admin/' }; }
    if (ch[2] === 'delete') {
      if (method === 'GET') return adminRender(c, { v: 'admin_delete', f: { ...x } });
      db.store_formation = db.store_formation.filter(y => y !== x); drop(e, 'store_formation', x);
      c.sql.push(`DELETE FROM "store_formation" WHERE "store_formation"."id" IN (${id})`);
      msg(e, 'success', `The formation “${x.titre}” was deleted successfully.`);
      e.steps.add('admin');
      return { redirect: '/admin/store/formation/' };
    }
    if (method === 'GET') return adminRender(c, { v: 'admin_change', f: { ...x } });
    if (!f.titre?.trim() || isNaN(Number(f.prix))) return adminRender(c, { v: 'admin_change', f: { ...x } });
    Object.assign(x, { titre: f.titre.trim(), descriptif: f.descriptif ?? '', prix: Number(Number(f.prix).toFixed(2)) });
    c.sql.push(`UPDATE "store_formation" SET "titre" = ${q(x.titre)}, "descriptif" = ${q(x.descriptif)}, "prix" = '${dec(x.prix)}', "date_formation" = '${x.date_formation.replace('T', ' ')}', "formateur_id" = 2, "image" = ${q(x.image)} WHERE "store_formation"."id" = ${id}`);
    mark(e, 'store_formation', id);
    msg(e, 'success', `The formation “${x.titre}” was changed successfully.`);
    e.steps.add('admin');
    return { redirect: '/admin/store/formation/' };
  }
  return adminRender(c, { v: 'debug404', path });
}

// ---------------------------------------------------------------- what the SQLite panel shows
export const COLS: Record<Table, string[]> = {
  store_formation: ['id', 'titre', 'descriptif', 'prix', 'date_formation', 'formateur_id', 'image'],
  store_formateur: ['id', 'username', 'email', 'password'],
  auth_user: ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'is_staff', 'last_login'],
  store_profile: ['id', 'user_id', 'phone', 'city', 'country', 'old_cart'],
  django_session: ['session_key', 'session_data', 'expire_date'],
  store_client: ['id', 'username', 'email', 'password'],
  store_reservation: ['id', 'client_id', 'formation_id', 'formateur_id', 'date_reservation']
};
export function rowsOf(e: Engine, t: Table): Record<string, unknown>[] {
  if (t === 'django_session') return e.db.django_session.map(s => ({ session_key: s.session_key, session_data: sessionString(s.data), expire_date: s.expire_date }));
  if (t === 'store_formateur') return e.db.store_formateur.map(x => ({ ...x, password: '••••' }));
  return e.db[t] as unknown as Record<string, unknown>[];
}
export const currentSession = (e: Engine) => e.db.django_session.find(s => s.session_key === e.cookie) ?? null;
