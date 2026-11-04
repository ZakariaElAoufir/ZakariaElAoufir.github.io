// MCommerce replayed in the browser: the rules of the Spring services (gateway, auth, product, cart, payment), copied from the code.
// Nothing leaves the page: every "HTTP call" is a function call that also records the journey it would take through the stack.

export type Lang = 'fr' | 'en';
export type Role = 'USER' | 'ADMIN';
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type PaymentMethod = 'CARD' | 'PAYPAL' | 'CASH';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type User = { id: number; username: string; password: string; role: Role; enabled: boolean; created_date: string; updated_date: string };
export type Product = { id: number; name: string; description: string; price: number; image_url: string | null; active: boolean; created_date: string; updated_date: string };
export type Cart = { id: number; user_id: number; total_amount: number; created_date: string; updated_date: string };
export type CartItem = { id: number; cart_id: number; product_id: number; product_name: string; product_image_url: string | null; price: number; quantity: number };
export type Payment = { id: number; user_id: number; cart_id: number; amount: number; status: PaymentStatus; payment_method: PaymentMethod; created_date: string; updated_date: string };

/** One database per service, as created by docker/postgres/init-databases.sql. */
export type Db = {
  auth_db: { users: User[] };
  product_db: { products: Product[] };
  cart_db: { carts: Cart[]; cart_items: CartItem[] };
  payment_db: { payment_transactions: Payment[] };
};
export type DbName = keyof Db;
export type TableRef = { db: DbName; table: string };

/** A piece of a trace line: plain text, a value (highlighted) or a dimmed note. */
export type Seg = string | { v: string } | { d: string };
export type Node = 'browser' | 'nginx' | 'gateway' | 'eureka' | 'auth' | 'product' | 'cart' | 'payment' | 'postgres';
export type Hop = { node: Node; at: string; text: Seg[]; bad?: boolean };
export type Trace = { id: number; t: number; by: string; method: Method; path: string; status: number; hops: Hop[] };
export type Step = 'login' | 'browse' | 'cart' | 'pay' | 'admin' | 'guard';

export type Engine = {
  lang: Lang;
  db: Db;
  traces: Trace[];
  steps: Set<Step>;
  /** rows written by the last calls, by "db.table#id", with the time they were written */
  changed: Map<string, number>;
  gone: { ref: TableRef; row: Record<string, unknown>; t: number }[];
  lastTable: TableRef | null;
  seq: Record<string, number>;
  now: () => number;
};

export type Res<T = unknown> = { status: number; body: T };
export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number };

// ---------------------------------------------------------------- seed (sample catalogue: the repo ships no data)
const H = 3600_000, D = 24 * H;
const iso = (t: number) => new Date(t).toISOString().slice(0, 23);
type Seed = { name: string; price: number; img: string | null; fr: string; en: string };
const CATALOGUE: Seed[] = [
  { name: 'Yamaha Pacifica 012', price: 2490, img: 'pacifica', fr: 'Corps en agathis, manche en érable, configuration HSS : une première électrique polyvalente.', en: 'Agathis body, maple neck, HSS pickups: a versatile first electric guitar.' },
  { name: 'Stratocaster Sonic Blue', price: 7900, img: 'strat-blue', fr: 'Trois micros simple bobinage, vibrato six vis, touche en palissandre.', en: 'Three single-coil pickups, six-screw tremolo, rosewood fretboard.' },
  { name: 'Les Paul Standard Ocean', price: 14500, img: 'lp-ocean', fr: 'Table en érable flammé, deux humbuckers, chevalet Tune-o-matic.', en: 'Flamed maple top, two humbuckers, Tune-o-matic bridge.' },
  { name: 'Telecaster Butterscotch', price: 6800, img: 'tele', fr: 'Corps en frêne, deux micros simple bobinage, son clair et tranchant.', en: 'Ash body, two single-coil pickups, a clear and cutting sound.' },
  { name: 'Folk Dreadnought Natural', price: 3200, img: 'acoustic', fr: 'Acoustique table épicéa, dos et éclisses en acajou, cordes acier.', en: 'Spruce top acoustic, mahogany back and sides, steel strings.' },
  { name: 'Classique Alhambra 1C', price: 4100, img: 'classical', fr: 'Guitare classique table cèdre, cordes nylon, idéale pour débuter.', en: 'Classical guitar with a cedar top and nylon strings, ideal to start.' },
  { name: 'Jazz Bass Black', price: 8900, img: 'bass', fr: 'Basse 4 cordes, deux micros simple bobinage, manche fin.', en: '4-string bass, two single-coil pickups, slim neck.' },
  { name: 'Stratocaster Candy Red', price: 5600, img: 'strat-red', fr: 'Corps en aulne, configuration SSS, finition rouge brillante.', en: 'Alder body, SSS pickups, glossy red finish.' },
  { name: 'Les Paul Junior Cherry', price: 5200, img: 'lp-cherry', fr: 'Un seul micro P-90, corps en acajou, simple et nerveuse.', en: 'One P-90 pickup, mahogany body, simple and punchy.' },
  { name: 'Ukulélé Soprano', price: 690, img: 'uke', fr: 'Petit format quatre cordes, parfait pour voyager.', en: 'Small four-string format, perfect for travelling.' }
];

export function createEngine(lang: Lang, now: () => number = Date.now): Engine {
  const t0 = now();
  const users: User[] = [
    { id: 1, username: 'admin', password: 'admin123', role: 'ADMIN', enabled: true, created_date: iso(t0 - 40 * D), updated_date: iso(t0 - 40 * D) },
    { id: 2, username: 'yassine', password: 'guitar2026', role: 'USER', enabled: true, created_date: iso(t0 - 12 * D), updated_date: iso(t0 - 12 * D) },
    { id: 3, username: 'salma', password: 'salma2026', role: 'USER', enabled: true, created_date: iso(t0 - 6 * D), updated_date: iso(t0 - 6 * D) }
  ];
  const products: Product[] = CATALOGUE.map((p, i) => ({
    id: i + 1, name: p.name, description: p[lang], price: p.price, image_url: p.img && `/uploads/${1767000000000 + i * 7311}_${p.img}.jpg`,
    active: true, created_date: iso(t0 - (30 - i) * D), updated_date: iso(t0 - (30 - i) * D)
  }));
  const carts: Cart[] = [
    { id: 1, user_id: 3, total_amount: 0, created_date: iso(t0 - 5 * D), updated_date: iso(t0 - 2 * D) },
    { id: 2, user_id: 2, total_amount: 0, created_date: iso(t0 - 11 * D), updated_date: iso(t0 - 3 * D) }
  ];
  const payments: Payment[] = [
    { id: 1, user_id: 3, cart_id: 1, amount: 4100, status: 'SUCCESS', payment_method: 'CASH', created_date: iso(t0 - 4 * D), updated_date: iso(t0 - 4 * D) },
    { id: 2, user_id: 2, cart_id: 2, amount: 3180, status: 'SUCCESS', payment_method: 'CARD', created_date: iso(t0 - 3 * D), updated_date: iso(t0 - 3 * D) },
    { id: 3, user_id: 3, cart_id: 1, amount: 690, status: 'SUCCESS', payment_method: 'PAYPAL', created_date: iso(t0 - 2 * D), updated_date: iso(t0 - 2 * D) }
  ];
  return {
    lang, now, traces: [], steps: new Set(), changed: new Map(), gone: [], lastTable: null,
    db: { auth_db: { users }, product_db: { products }, cart_db: { carts, cart_items: [] }, payment_db: { payment_transactions: payments } },
    seq: { users: 3, products: products.length, carts: 2, cart_items: 0, payment_transactions: 3 }
  };
}

// ---------------------------------------------------------------- JWT (HS256 in the real service; here only its payload matters)
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export function makeToken(e: Engine, u: User) {
  const iat = Math.floor(e.now() / 1000);
  return `${b64({ alg: 'HS256' })}.${b64({ sub: u.username, userId: u.id, role: u.role, iat, exp: iat + 3600 })}.demo-signature`;
}
export type Claims = { sub: string; userId: number; role: Role };
export function readToken(token: string | null): Claims | null {
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null; }
}

// ---------------------------------------------------------------- the journey of a request
const SERVICE: Record<string, { node: Node; id: string; port: number; db: DbName | null }> = {
  products: { node: 'product', id: 'PRODUCT-SERVICE', port: 8081, db: 'product_db' },
  uploads: { node: 'product', id: 'PRODUCT-SERVICE', port: 8081, db: null },
  carts: { node: 'cart', id: 'CART-SERVICE', port: 8082, db: 'cart_db' },
  payments: { node: 'payment', id: 'PAYMENT-SERVICE', port: 8083, db: 'payment_db' },
  auth: { node: 'auth', id: 'AUTH-SERVICE', port: 8084, db: 'auth_db' },
  admin: { node: 'auth', id: 'AUTH-SERVICE', port: 8084, db: 'auth_db' }
};
const L = (e: Engine, fr: string, en: string) => e.lang === 'fr' ? fr : en;
type Ctx = { e: Engine; hops: Hop[]; headers: Record<string, string> };
const hop = (c: Ctx, node: Node, at: string, ...text: Seg[]) => { c.hops.push({ node, at, text }); };
const bad = (c: Ctx, node: Node, at: string, ...text: Seg[]) => { c.hops.push({ node, at, text, bad: true }); };
const sql = (c: Ctx, db: DbName, query: string) => hop(c, 'postgres', db, { v: query });

/**
 * One call from the Angular app. `headers` are the ones the Angular services add themselves
 * (the auth interceptor's Bearer token, X-User-Role: ADMIN on product calls, X-User-Id from localStorage on cart calls).
 */
export function call<T = unknown>(e: Engine, by: string, method: Method, url: string, headers: Record<string, string>, body?: unknown): Res<T> {
  const c: Ctx = { e, hops: [], headers: { ...headers } };
  const path = url.replace(/^\/api/, '');
  hop(c, 'nginx', ':4200', `location /api/ → `, { v: `proxy_pass http://api-gateway:9000${path.split('?')[0]}` });
  const res = gateway(c, method, path, body);
  e.traces.unshift({ id: (e.traces[0]?.id ?? 0) + 1, t: e.now(), by, method, path: url, status: res.status, hops: c.hops });
  if (e.traces.length > 60) e.traces.pop();
  return res as Res<T>;
}

function gateway(c: Ctx, method: Method, path: string, body: unknown): Res {
  const { e } = c;
  const route = path.split('?')[0];
  const first = route.split('/')[1];
  const auth = c.headers.Authorization;
  // JwtAuthenticationFilter
  if (first === 'auth') hop(c, 'gateway', ':9000', 'JwtAuthenticationFilter : ', { d: L(e, '/auth ignoré', '/auth skipped') });
  else if (!auth?.startsWith('Bearer ')) {
    hop(c, 'gateway', ':9000', 'JwtAuthenticationFilter : ', { d: L(e, 'pas de jeton, requête transmise telle quelle', 'no token, request passed on as is') });
  } else {
    const claims = readToken(auth.slice(7));
    if (!claims) { bad(c, 'gateway', ':9000', L(e, 'jeton invalide → ', 'invalid token → '), { v: '401' }); return { status: 401, body: null }; }
    if (route.startsWith('/admin') && claims.role !== 'ADMIN') {
      bad(c, 'gateway', ':9000', L(e, `jeton valide, rôle ${claims.role} sur /admin → `, `valid token, role ${claims.role} on /admin → `), { v: '403 Forbidden' });
      return { status: 403, body: null };
    }
    c.headers['X-User-Id'] = String(claims.userId);
    c.headers['X-User-Role'] = claims.role;
    c.headers['X-Username'] = claims.sub;
    hop(c, 'gateway', ':9000', L(e, 'JWT valide, ajoute ', 'valid JWT, adds '), { v: `X-User-Id: ${claims.userId}` }, ', ', { v: `X-User-Role: ${claims.role}` });
  }
  // SecurityConfig: /auth, /products, /uploads are public, the rest needs an authentication
  const open = ['auth', 'products', 'uploads'].includes(first);
  if (!open && !c.headers['X-Username']) {
    bad(c, 'gateway', ':9000', 'SecurityConfig : ', L(e, 'route protégée sans authentification → ', 'protected route without authentication → '), { v: '401' });
    return { status: 401, body: null };
  }
  const svc = SERVICE[first];
  if (!svc) { bad(c, 'gateway', ':9000', L(e, 'aucune route → ', 'no route → '), { v: '404' }); return { status: 404, body: null }; }
  hop(c, 'eureka', ':8761', { v: `lb://${svc.id}` }, ' → ', `${svc.id.toLowerCase()}:${svc.port}`, { d: L(e, ' (1 instance)', ' (1 instance)') });
  switch (svc.node) {
    case 'auth': return authService(c, method, route, body);
    case 'product': return productService(c, method, path, body);
    case 'cart': return cartService(c, method, path);
    default: return paymentService(c, method, path, body);
  }
}

// ---------------------------------------------------------------- helpers for writes
const mark = (e: Engine, db: DbName, table: string, id: number) => { e.changed.set(`${db}.${table}#${id}`, e.now()); e.lastTable = { db, table }; };
const drop = (e: Engine, db: DbName, table: string, row: object) => { e.gone.push({ ref: { db, table }, row: { ...row }, t: e.now() }); e.lastTable = { db, table }; };
const next = (e: Engine, table: string) => ++e.seq[table];
const money = (n: number) => n.toFixed(2);
const page = <T,>(all: T[], pageNo: number, size: number): Page<T> => ({
  content: all.slice(pageNo * size, pageNo * size + size), totalElements: all.length, totalPages: Math.ceil(all.length / size), number: pageNo
});
const q = (path: string) => new URLSearchParams(path.split('?')[1] ?? '');

// ---------------------------------------------------------------- auth-service :8084 (auth_db)
export type UserResponse = { id: number; username: string; role: Role; enabled: boolean; createdDate: string; updatedDate: string };
const userResponse = (u: User): UserResponse => ({ id: u.id, username: u.username, role: u.role, enabled: u.enabled, createdDate: u.created_date, updatedDate: u.updated_date });

function authService(c: Ctx, method: Method, route: string, body: unknown): Res {
  const { e } = c;
  const users = e.db.auth_db.users;
  const b = (body ?? {}) as Record<string, string>;
  if (route === '/auth/login') {
    sql(c, 'auth_db', `select * from users where username='${b.username}'`);
    const u = users.find(x => x.username === b.username);
    if (!u) { bad(c, 'auth', ':8084', 'AuthServiceImpl : ', { v: 'RuntimeException("Utilisateur introuvable")' }, ' → 500'); return { status: 500, body: null }; }
    if (u.password !== b.password) { bad(c, 'auth', ':8084', 'BCrypt : ', { v: 'RuntimeException("Mot de passe incorrect")' }, ' → 500'); return { status: 500, body: null }; }
    const token = makeToken(e, u);
    hop(c, 'auth', ':8084', 'BCrypt OK, ', L(e, 'JWT signé HS256 avec ', 'JWT signed HS256 with '), { v: `sub=${u.username}, userId=${u.id}, role=${u.role}` }, { d: L(e, ', expire dans 1 h', ', expires in 1 h') });
    return { status: 200, body: { message: 'Connexion réussie', token } };
  }
  if (route === '/auth/register') {
    sql(c, 'auth_db', `select exists(select 1 from users where username='${b.username}')`);
    if (users.some(x => x.username === b.username)) { bad(c, 'auth', ':8084', { v: 'RuntimeException("Username déjà utilisé")' }, ' → 500'); return { status: 500, body: null }; }
    const u: User = { id: next(e, 'users'), username: b.username, password: b.password, role: 'USER', enabled: true, created_date: iso(e.now()), updated_date: iso(e.now()) };
    users.push(u); mark(e, 'auth_db', 'users', u.id);
    hop(c, 'auth', ':8084', L(e, 'mot de passe haché (BCrypt), rôle ', 'password hashed (BCrypt), role '), { v: 'USER' });
    sql(c, 'auth_db', `insert into users (username, password, role, enabled) values ('${u.username}', '$2a$10$…', 'USER', true)`);
    return { status: 200, body: { message: 'Utilisateur créé avec succès' } };
  }
  // /admin/users: the gateway already checked the ADMIN role; InternalHeadersFilter rebuilds the authentication from the headers
  hop(c, 'auth', ':8084', 'InternalHeadersFilter : ', { d: L(e, 'authentification reconstruite depuis ', 'authentication rebuilt from ') }, { v: `X-User-Role: ${c.headers['X-User-Role']}` });
  const id = Number(route.split('/')[3]);
  if (method === 'GET') { sql(c, 'auth_db', 'select * from users'); return { status: 200, body: users.map(userResponse) }; }
  if (method === 'POST') {
    if (users.some(x => x.username === b.username)) { bad(c, 'auth', ':8084', { v: 'RuntimeException("Username déjà utilisé")' }, ' → 500'); return { status: 500, body: null }; }
    const u: User = { id: next(e, 'users'), username: b.username, password: b.password, role: b.role as Role, enabled: true, created_date: iso(e.now()), updated_date: iso(e.now()) };
    users.push(u); mark(e, 'auth_db', 'users', u.id);
    sql(c, 'auth_db', `insert into users (username, password, role, enabled) values ('${u.username}', '$2a$10$…', '${u.role}', true)`);
    return { status: 201, body: userResponse(u) };
  }
  const u = users.find(x => x.id === id);
  if (!u) { bad(c, 'auth', ':8084', { v: 'RuntimeException("Utilisateur introuvable")' }); return { status: 500, body: null }; }
  if (method === 'PUT') {
    // AdminUserServiceImpl.updateUser: role, enabled and password only, the username is not updated
    const r = body as { username: string; role: Role; enabled: boolean };
    u.role = r.role; u.enabled = r.enabled; u.updated_date = iso(e.now()); mark(e, 'auth_db', 'users', u.id);
    if (r.username !== u.username) hop(c, 'auth', ':8084', { d: L(e, `username « ${r.username} » ignoré : updateUser ne le modifie pas`, `username "${r.username}" ignored: updateUser does not change it`) });
    sql(c, 'auth_db', `update users set role='${u.role}', enabled=${u.enabled} where id=${u.id}`);
    return { status: 200, body: userResponse(u) };
  }
  e.db.auth_db.users = users.filter(x => x !== u); drop(e, 'auth_db', 'users', u);
  sql(c, 'auth_db', `delete from users where id=${u.id}`);
  return { status: 204, body: null };
}

// ---------------------------------------------------------------- product-service :8081 (product_db)
export type ProductDto = { id: number; name: string; description: string; price: number; active: boolean; createdDate: string; imageUrl: string | null };
const dto = (p: Product): ProductDto => ({ id: p.id, name: p.name, description: p.description, price: p.price, active: p.active, createdDate: p.created_date, imageUrl: p.image_url });
/** The product-service only trusts the X-User-Role header, whoever set it. */
function isAdmin(c: Ctx) {
  const fromGateway = !!c.headers['X-Username'];
  const role = c.headers['X-User-Role'];
  hop(c, 'product', ':8081', L(c.e, 'contrôle ', 'checks '), { v: `X-User-Role: ${role ?? 'null'}` },
    { d: fromGateway ? L(c.e, ' (posé par la gateway)', ' (set by the gateway)') : L(c.e, ' (envoyé par le navigateur, non vérifié)', ' (sent by the browser, not checked)') });
  return role === 'ADMIN';
}

function productService(c: Ctx, method: Method, path: string, body: unknown): Res {
  const { e: en } = c;
  const route = path.split('?')[0];
  const products = en.db.product_db.products;
  const id = Number(route.split('/')[2]);
  if (method === 'GET' && !id) {
    const p = q(path);
    const keyword = p.get('keyword') ?? '', pageNo = Number(p.get('page') ?? 0), size = Number(p.get('size') ?? 5);
    const dir = p.get('direction') === 'desc' ? -1 : 1;
    const list = products.filter(x => x.active && x.name.toLowerCase().includes(keyword.toLowerCase())).sort((a, b) => dir * (a.price - b.price));
    sql(c, 'product_db', keyword.trim()
      ? `select * from products where upper(name) like upper('%${keyword}%') and active order by price ${dir < 0 ? 'desc' : 'asc'} offset ${pageNo * size} limit ${size}`
      : `select * from products where active order by price ${dir < 0 ? 'desc' : 'asc'} offset ${pageNo * size} limit ${size}`);
    return { status: 200, body: page(list.map(dto), pageNo, size) };
  }
  if (method === 'GET') {
    sql(c, 'product_db', `select * from products where id=${id}`);
    const p = products.find(x => x.id === id);
    if (!p) { bad(c, 'product', ':8081', { v: 'ResourceNotFoundException' }); return { status: 404, body: null }; }
    return { status: 200, body: dto(p) };
  }
  if (!isAdmin(c)) { bad(c, 'product', ':8081', L(en, 'rôle différent de ADMIN → ', 'role other than ADMIN → '), { v: '403' }); return { status: 403, body: null }; }
  const b = body as { product: { name: string; description: string; price: number }; image?: string | null };
  if (method === 'POST') {
    const p: Product = { id: next(en, 'products'), name: b.product.name, description: b.product.description, price: Number(b.product.price), active: true,
      image_url: b.image ? `/uploads/${en.now()}_${b.image}.jpg` : null, created_date: iso(en.now()), updated_date: iso(en.now()) };
    if (b.image) hop(c, 'product', ':8081', 'FileStorage : ', { v: `/data/uploads/${p.image_url!.slice(9)}` }, { d: L(en, ' (volume product-uploads)', ' (product-uploads volume)') });
    hop(c, 'product', ':8081', { d: L(en, 'active forcé à true à la création', 'active forced to true on creation') });
    products.push(p); mark(en, 'product_db', 'products', p.id);
    sql(c, 'product_db', `insert into products (name, price, image_url, active) values ('${p.name}', ${money(p.price)}, ${p.image_url ? `'${p.image_url}'` : 'null'}, true)`);
    return { status: 201, body: dto(p) };
  }
  const p = products.find(x => x.id === id);
  if (!p) { bad(c, 'product', ':8081', { v: 'RuntimeException("Product not found")' }); return { status: 500, body: null }; }
  if (method === 'PATCH') {
    // updateProduct: name, description, price and image; the "active" field of the form is not read
    p.name = b.product.name; p.description = b.product.description; p.price = Number(b.product.price); p.updated_date = iso(en.now());
    if (b.image) { p.image_url = `/uploads/${en.now()}_${b.image}.jpg`; hop(c, 'product', ':8081', 'FileStorage : ', { v: `/data/uploads/${p.image_url.slice(9)}` }); }
    mark(en, 'product_db', 'products', p.id);
    sql(c, 'product_db', `update products set name='${p.name}', price=${money(p.price)}${b.image ? `, image_url='${p.image_url}'` : ''} where id=${p.id}`);
    return { status: 200, body: dto(p) };
  }
  // DELETE: a soft delete, the row stays
  p.active = false; p.updated_date = iso(en.now()); mark(en, 'product_db', 'products', p.id);
  hop(c, 'product', ':8081', { d: L(en, 'suppression logique : la ligne reste, active passe à false', 'soft delete: the row stays, active turns false') });
  sql(c, 'product_db', `update products set active=false where id=${p.id}`);
  return { status: 204, body: null };
}

// ---------------------------------------------------------------- cart-service :8082 (cart_db), calls product-service with OpenFeign
export type CartItemResponse = { productId: number; productName: string; productImageUrl: string | null; price: number; quantity: number; totalPrice: number };
export type CartResponse = { id: number; userId: number; totalAmount: number; items: CartItemResponse[] };

function cartOf(c: Ctx, userId: number): Cart {
  const { e: en } = c;
  let cart = en.db.cart_db.carts.find(x => x.user_id === userId);
  sql(c, 'cart_db', `select * from carts where user_id=${userId}`);
  if (!cart) {
    cart = { id: next(en, 'carts'), user_id: userId, total_amount: 0, created_date: iso(en.now()), updated_date: iso(en.now()) };
    en.db.cart_db.carts.push(cart); mark(en, 'cart_db', 'carts', cart.id);
    sql(c, 'cart_db', `insert into carts (user_id, total_amount) values (${userId}, 0.00)`);
  }
  return cart;
}
const itemsOf = (en: Engine, cart: Cart) => en.db.cart_db.cart_items.filter(i => i.cart_id === cart.id);
function cartResponse(en: Engine, cart: Cart): CartResponse {
  return {
    id: cart.id, userId: cart.user_id, totalAmount: cart.total_amount,
    items: itemsOf(en, cart).map(i => ({ productId: i.product_id, productName: i.product_name, productImageUrl: i.product_image_url, price: i.price, quantity: i.quantity, totalPrice: i.price * i.quantity }))
  };
}
function total(c: Ctx, cart: Cart) {
  cart.total_amount = itemsOf(c.e, cart).reduce((s, i) => s + i.price * i.quantity, 0);
  cart.updated_date = iso(c.e.now()); mark(c.e, 'cart_db', 'carts', cart.id);
  sql(c, 'cart_db', `update carts set total_amount=${money(cart.total_amount)} where id=${cart.id}`);
}

function cartService(c: Ctx, method: Method, path: string): Res {
  const { e: en } = c;
  const route = path.split('?')[0];
  const userId = Number(c.headers['X-User-Id']);
  hop(c, 'cart', ':8082', L(en, 'panier de ', 'cart of '), { v: `X-User-Id: ${userId}` });
  const cart = cartOf(c, userId);
  const productId = Number(route.split('/')[4]);
  if (method === 'GET') return { status: 200, body: cartResponse(en, cart) };
  if (method === 'DELETE' && !productId) {
    for (const i of itemsOf(en, cart)) drop(en, 'cart_db', 'cart_items', i);
    en.db.cart_db.cart_items = en.db.cart_db.cart_items.filter(i => i.cart_id !== cart.id);
    cart.total_amount = 0; mark(en, 'cart_db', 'carts', cart.id);
    sql(c, 'cart_db', `delete from cart_items where cart_id=${cart.id}; update carts set total_amount=0.00`);
    return { status: 204, body: null };
  }
  const item = en.db.cart_db.cart_items.find(i => i.cart_id === cart.id && i.product_id === productId);
  if (method === 'POST') {
    if (item) {
      item.quantity++; mark(en, 'cart_db', 'cart_items', item.id);
      hop(c, 'cart', ':8082', { d: L(en, 'produit déjà dans le panier : quantité + 1', 'product already in the cart: quantity + 1') });
      sql(c, 'cart_db', `update cart_items set quantity=${item.quantity} where id=${item.id}`);
    } else {
      hop(c, 'cart', ':8082', 'OpenFeign ', { v: `ProductClient.getProductById(${productId})` }, ' → ', { v: 'lb://PRODUCT-SERVICE' });
      const p = en.db.product_db.products.find(x => x.id === productId)!;
      hop(c, 'product', ':8081', { v: `GET /products/${productId}` }, ' → 200');
      sql(c, 'product_db', `select * from products where id=${productId}`);
      const row: CartItem = { id: next(en, 'cart_items'), cart_id: cart.id, product_id: p.id, product_name: p.name, product_image_url: p.image_url, price: p.price, quantity: 1 };
      en.db.cart_db.cart_items.push(row); mark(en, 'cart_db', 'cart_items', row.id);
      hop(c, 'cart', ':8082', { d: L(en, 'nom, image et prix copiés dans la ligne du panier', 'name, image and price copied into the cart line') });
      sql(c, 'cart_db', `insert into cart_items (cart_id, product_id, product_name, price, quantity) values (${cart.id}, ${p.id}, '${p.name}', ${money(p.price)}, 1)`);
    }
    total(c, cart);
    return { status: 200, body: cartResponse(en, cart) };
  }
  if (method === 'PUT' && item) {
    const quantity = Number(q(path).get('quantity'));
    if (quantity <= 0) { en.db.cart_db.cart_items = en.db.cart_db.cart_items.filter(i => i !== item); drop(en, 'cart_db', 'cart_items', item); sql(c, 'cart_db', `delete from cart_items where id=${item.id}`); }
    else { item.quantity = quantity; mark(en, 'cart_db', 'cart_items', item.id); sql(c, 'cart_db', `update cart_items set quantity=${quantity} where id=${item.id}`); }
    total(c, cart);
    return { status: 200, body: cartResponse(en, cart) };
  }
  if (method === 'DELETE' && item) {
    en.db.cart_db.cart_items = en.db.cart_db.cart_items.filter(i => i !== item); drop(en, 'cart_db', 'cart_items', item);
    sql(c, 'cart_db', `delete from cart_items where id=${item.id}`);
    total(c, cart);
  }
  return { status: 200, body: cartResponse(en, cart) };
}

// ---------------------------------------------------------------- payment-service :8083 (payment_db), calls cart-service with OpenFeign
export type PaymentHistory = { transactionId: number; userId: number; amount: number; status: PaymentStatus; paymentMethod: PaymentMethod; createdDate: string };
const history = (p: Payment): PaymentHistory => ({ transactionId: p.id, userId: p.user_id, amount: p.amount, status: p.status, paymentMethod: p.payment_method, createdDate: p.created_date });

function paymentService(c: Ctx, _method: Method, path: string, body: unknown): Res {
  const { e: en } = c;
  const route = path.split('?')[0];
  const userId = Number(c.headers['X-User-Id']), role = c.headers['X-User-Role'];
  const rows = en.db.payment_db.payment_transactions;
  if (route === '/payments/history') {
    const p = q(path); const pageNo = Number(p.get('page') ?? 0), size = Number(p.get('size') ?? 5);
    const all = role === 'ADMIN';
    hop(c, 'payment', ':8083', { v: `X-User-Role: ${role}` }, all ? L(en, ' : tous les paiements', ': every payment') : L(en, ' : seulement ses paiements', ': only their own payments'));
    sql(c, 'payment_db', `select * from payment_transactions${all ? '' : ` where user_id=${userId}`} order by created_date desc offset ${pageNo * size} limit ${size}`);
    const list = rows.filter(x => all || x.user_id === userId).sort((a, b) => b.created_date.localeCompare(a.created_date));
    return { status: 200, body: page(list.map(history), pageNo, size) };
  }
  // POST /payments/checkout
  const methodPay = (body as { paymentMethod: PaymentMethod }).paymentMethod;
  hop(c, 'payment', ':8083', 'OpenFeign ', { v: 'CartClient.getMyCart()' }, ' → ', { v: 'lb://CART-SERVICE' }, { d: L(en, ', en-têtes X-User-* recopiés (FeignAuthInterceptor)', ', X-User-* headers copied (FeignAuthInterceptor)') });
  const sub: Ctx = { e: en, hops: c.hops, headers: { 'X-User-Id': String(userId), 'X-User-Role': role } };
  const cart = (cartService(sub, 'GET', '/carts/me') as Res<CartResponse>).body;
  if (!cart.items.length) {
    bad(c, 'payment', ':8083', { v: 'EmptyCartException' }, ' → ', { v: '400 "Le panier est vide, paiement impossible"' });
    return { status: 400, body: { message: 'Le panier est vide, paiement impossible' } };
  }
  const tx: Payment = { id: next(en, 'payment_transactions'), user_id: userId, cart_id: cart.id, amount: cart.totalAmount, status: 'PENDING', payment_method: methodPay, created_date: iso(en.now()), updated_date: iso(en.now()) };
  rows.push(tx); mark(en, 'payment_db', 'payment_transactions', tx.id);
  sql(c, 'payment_db', `insert into payment_transactions (user_id, cart_id, amount, status, payment_method) values (${userId}, ${cart.id}, ${money(tx.amount)}, 'PENDING', '${methodPay}')`);
  // simulatePayment: succeeds when the total is above zero
  tx.status = tx.amount > 0 ? 'SUCCESS' : 'FAILED';
  hop(c, 'payment', ':8083', 'simulatePayment : ', { v: `totalAmount > 0 → ${tx.status}` });
  if (tx.status === 'SUCCESS') {
    hop(c, 'payment', ':8083', 'OpenFeign ', { v: 'CartClient.clearMyCart()' }, ' → ', { v: 'lb://CART-SERVICE' });
    cartService(sub, 'DELETE', '/carts/me');
  }
  sql(c, 'payment_db', `update payment_transactions set status='${tx.status}' where id=${tx.id}`);
  mark(en, 'payment_db', 'payment_transactions', tx.id);
  return { status: 201, body: { transactionId: tx.id, userId, totalAmount: tx.amount, status: tx.status, paymentMethod: methodPay, createdDate: tx.created_date } };
}

// ---------------------------------------------------------------- what the database panel shows
export const TABLES: { db: DbName; table: string; cols: [string, string][] }[] = [
  { db: 'auth_db', table: 'users', cols: [['id', 'int8'], ['username', 'varchar'], ['password', 'varchar'], ['role', 'varchar'], ['enabled', 'bool'], ['created_date', 'timestamp']] },
  { db: 'product_db', table: 'products', cols: [['id', 'int8'], ['name', 'varchar'], ['price', 'numeric'], ['image_url', 'varchar'], ['active', 'bool'], ['created_date', 'timestamp']] },
  { db: 'cart_db', table: 'carts', cols: [['id', 'int8'], ['user_id', 'int8'], ['total_amount', 'numeric'], ['updated_date', 'timestamp']] },
  { db: 'cart_db', table: 'cart_items', cols: [['id', 'int8'], ['cart_id', 'int8'], ['product_id', 'int8'], ['product_name', 'varchar'], ['price', 'numeric'], ['quantity', 'int4']] },
  { db: 'payment_db', table: 'payment_transactions', cols: [['id', 'int8'], ['user_id', 'int8'], ['cart_id', 'int8'], ['amount', 'numeric'], ['status', 'varchar'], ['payment_method', 'varchar'], ['created_date', 'timestamp']] }
];
export function rowsOf(e: Engine, ref: TableRef): Record<string, unknown>[] {
  return [...((e.db[ref.db] as Record<string, unknown[]>)[ref.table] as Record<string, unknown>[])].sort((a, b) => Number(b.id) - Number(a.id));
}
