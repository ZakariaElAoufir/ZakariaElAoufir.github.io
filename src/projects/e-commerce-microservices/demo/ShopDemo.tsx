import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  call, createEngine, readToken, rowsOf, TABLES,
  type CartResponse, type Engine, type Method, type Node, type Page, type PaymentHistory, type PaymentMethod, type ProductDto, type Seg,
  type Step, type TableRef, type UserResponse
} from './logic';
import { pictureOf, PICKABLE } from './guitars';
import { strings, type DemoStrings } from './strings';
import hero from '../media/hero.jpg';
import loginBg from '../media/login-bg.jpg';
import photo from '../media/guitare.jpg';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
type Dialog = { kind: 'alert'; text: string } | { kind: 'confirm'; text: string; ok: () => void } | null;
type ProductForm = { id?: number; name: string; description: string; price: number | string; active: boolean; image: string | null; picking?: boolean };
type UserForm = { id?: number; username: string; password: string; role: 'ADMIN' | 'USER'; enabled: boolean };
type App = {
  route: string; past: string[]; token: string | null; typed: string | null; dialog: Dialog;
  form: { username: string; password: string; show: boolean; error: string; success: string };
  shop: { keyword: string; order: 'asc' | 'desc'; page: number; data: Page<ProductDto> | null };
  detail: { product: ProductDto | null; sugg: ProductDto[]; suggPage: number; suggTotal: number };
  cart: CartResponse | null; count: number;
  pay: { method: PaymentMethod; name: string; number: string; expiry: string; cvv: string; loading: boolean };
  history: PaymentHistory[] | null;
  admin: {
    keyword: string; order: 'asc' | 'desc'; page: number; products: Page<ProductDto> | null; add: ProductForm | null; edit: ProductForm | null;
    users: UserResponse[] | null; usersError: string; userSearch: string; addUser: UserForm | null; editUser: UserForm | null;
    payments: Page<PaymentHistory> | null; payPage: number; paySearch: string; payStatus: string; payMethod: string; payError: string; shown: PaymentHistory[];
  };
};

const FRESH = 1700;
const STEPS: Step[] = ['login', 'browse', 'cart', 'pay', 'admin', 'guard'];
const ROUTES = ['/login', '/register', '/products', '/cart', '/payment', '/profile', '/admin/products', '/admin/users', '/admin/payments'];
const LOGO: Record<Node, string> = { browser: 'angular', nginx: 'window', gateway: 'gateway', eureka: 'microservices', auth: 'springboot', product: 'springboot', cart: 'springboot', payment: 'springboot', postgres: 'postgresql' };
const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;
const pad = (n: number) => String(n).padStart(2, '0');
// Angular date pipes as used in the templates
const ddmmyyyy = (s: string) => { const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const ddmmyyyyHHmm = (s: string) => { const d = new Date(s); return `${ddmmyyyy(s)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const short = (s: string) => { const d = new Date(s); const h = d.getHours() % 12 || 12; return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}, ${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`; };

function newApp(): App {
  return {
    route: '/login', past: [], token: null, typed: null, dialog: null,
    form: { username: '', password: '', show: false, error: '', success: '' },
    shop: { keyword: '', order: 'asc', page: 0, data: null },
    detail: { product: null, sugg: [], suggPage: 0, suggTotal: 0 },
    cart: null, count: 0,
    pay: { method: 'CARD', name: '', number: '', expiry: '', cvv: '', loading: false },
    history: null,
    admin: {
      keyword: '', order: 'asc', page: 0, products: null, add: null, edit: null,
      users: null, usersError: '', userSearch: '', addUser: null, editUser: null,
      payments: null, payPage: 0, paySearch: '', payStatus: '', payMethod: '', payError: '', shown: []
    }
  };
}

/** MCommerce's Angular front in a browser window, with the journey of each request and the four PostgreSQL databases beside it. */
export default function ShopDemo({ lang }: Props) {
  const t = strings[lang];
  // the world holds clocks: it is built in the browser only, so the server's HTML never disagrees with it
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; app: App } | null>(null);
  if (ready && !world.current) world.current = { e: createEngine(lang), app: newApp() };
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<'trace' | 'db'>('trace');
  const [picked, setPicked] = useState<number | null>(null);
  const [table, setTable] = useState<TableRef>({ db: 'product_db', table: 'products' });
  const [followW, setFollowW] = useState(true);
  const [full, setFull] = useState(false);
  const view = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      const app = world.current?.app;
      if (app && (app.dialog || app.admin.add || app.admin.edit || app.admin.addUser || app.admin.editUser)) {
        app.dialog = null; app.admin.add = app.admin.edit = null; app.admin.addUser = app.admin.editUser = null; refresh();
      } else setFull(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  if (!world.current) return <div className="ec"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, app } = world.current;
  const step = (s: Step) => e.steps.add(s);

  // ---------------- the Angular services: same URLs and the same headers they add
  const api = <T,>(method: Method, url: string, body?: unknown, extra: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extra };
    if (app.token) headers.Authorization = `Bearer ${app.token}`; // AuthInterceptor
    const before = e.lastTable;
    const res = call<T>(e, readToken(app.token)?.sub ?? t.anonymous, method, url, headers, body);
    if (e.lastTable && e.lastTable !== before && followW) setTable(e.lastTable);
    setPicked(null);
    setTimeout(refresh, FRESH + 50);
    return res;
  };
  const ADMIN_HDR = { 'X-User-Role': 'ADMIN' }; // ProductService.adminHeaders(), sent on every product call
  const USER_HDR = { 'X-User-Id': '1' }; // CartService.userHeaders(): localStorage userId is never set, so '1'
  const ok = (s: number) => s >= 200 && s < 300;
  const loadCart = () => {
    const r = api<CartResponse>('GET', '/api/carts/me', undefined, USER_HDR);
    if (ok(r.status)) { app.cart = r.body; app.count = r.body.items.reduce((s, i) => s + i.quantity, 0); }
    return r;
  };
  const loadShop = () => {
    const s = app.shop;
    const r = api<Page<ProductDto>>('GET', `/api/products?keyword=${encodeURIComponent(s.keyword)}&page=${s.page}&size=8&sortBy=price&direction=${s.order}`, undefined, ADMIN_HDR);
    if (ok(r.status)) s.data = r.body;
  };
  const loadSugg = (current: number) => {
    const d = app.detail;
    const r = api<Page<ProductDto>>('GET', `/api/products?keyword=&page=${d.suggPage}&size=6&sortBy=price&direction=asc`, undefined, ADMIN_HDR);
    if (ok(r.status)) { d.sugg = r.body.content.filter(p => p.id !== current); d.suggTotal = r.body.totalPages; }
  };
  const loadAdminProducts = () => {
    const a = app.admin;
    const r = api<Page<ProductDto>>('GET', `/api/products?keyword=${encodeURIComponent(a.keyword)}&page=${a.page}&size=5&sortBy=price&direction=${a.order}`, undefined, ADMIN_HDR);
    if (ok(r.status)) a.products = r.body;
  };
  const loadUsers = () => {
    const a = app.admin;
    const r = api<UserResponse[]>('GET', '/api/admin/users');
    if (ok(r.status)) { a.users = r.body; a.usersError = ''; } else { a.users = null; a.usersError = 'Erreur lors du chargement des utilisateurs'; if (r.status === 403) step('guard'); }
  };
  const loadPayments = () => {
    const a = app.admin;
    const r = api<Page<PaymentHistory>>('GET', `/api/payments/history?page=${a.payPage}&size=5`);
    if (ok(r.status)) { a.payments = r.body; a.shown = [...r.body.content]; a.payError = ''; } else { a.payments = null; a.shown = []; a.payError = 'Erreur chargement paiements'; }
  };

  /** The router: opening a page runs what its component does in ngOnInit. */
  const go = (path: string, push = true) => {
    let route = path.trim().replace(/^(https?:\/\/)?localhost:4200/, '').replace(/\/+$/, '') || '/';
    if (!route.startsWith('/')) route = '/' + route;
    if (route === '/' || route === '/admin') route = route === '/' ? '/login' : '/admin/products';
    const known = ROUTES.includes(route) || /^\/products\/\d+$/.test(route);
    if (!known) route = '/login'; // { path: '**', redirectTo: 'login' }
    if (push && route !== app.route) app.past.push(app.route);
    app.route = route; app.typed = null; app.dialog = null;
    app.form.error = ''; app.form.success = '';
    const a = app.admin;
    a.add = a.edit = null; a.addUser = a.editUser = null;
    if (route === '/products') { loadCart(); loadShop(); }
    else if (route.startsWith('/products/')) {
      const id = Number(route.split('/')[2]);
      const r = api<ProductDto>('GET', `/api/products/${id}`);
      if (!ok(r.status)) { go('/products', false); return; }
      app.detail.product = r.body; app.detail.suggPage = 0;
      loadSugg(id); loadCart();
    }
    else if (route === '/cart') { loadCart(); loadCart(); }
    else if (route === '/payment') { loadCart(); loadCart(); app.pay.loading = false; }
    else if (route === '/profile') {
      const r = api<Page<PaymentHistory>>('GET', '/api/payments/history?page=0&size=5');
      app.history = ok(r.status) ? r.body.content : [];
      loadCart();
    }
    else if (route === '/admin/products') { a.page = 0; loadAdminProducts(); }
    else if (route === '/admin/users') { a.userSearch = ''; loadUsers(); }
    else if (route === '/admin/payments') { a.payPage = 0; a.paySearch = a.payStatus = a.payMethod = ''; loadPayments(); }
    if (view.current) view.current.scrollTop = 0;
    refresh();
  };
  const back = () => { const p = app.past.pop(); if (p) go(p, false); };
  const alert = (text: string) => { app.dialog = { kind: 'alert', text }; refresh(); };
  const confirm = (text: string, fn: () => void) => { app.dialog = { kind: 'confirm', text, ok: fn }; refresh(); };

  // ---------------- actions
  const login = () => {
    const f = app.form; f.error = '';
    const r = api<{ token: string }>('POST', '/api/auth/login', { username: f.username, password: f.password });
    if (!ok(r.status)) { f.error = 'Invalid username or password'; refresh(); return; }
    app.token = r.body.token; step('login');
    f.username = ''; f.password = ''; f.show = false;
    go(readToken(app.token)?.role === 'ADMIN' ? '/admin/products' : '/products');
  };
  const register = () => {
    const f = app.form; f.error = ''; f.success = '';
    const r = api('POST', '/api/auth/register', { username: f.username, password: f.password });
    if (!ok(r.status)) { f.error = 'Registration failed'; refresh(); return; }
    f.success = 'Account created successfully'; refresh();
    setTimeout(() => { if (app.route === '/register') { f.username = ''; f.password = ''; go('/login'); } }, 1500);
  };
  const logout = () => { app.token = null; app.cart = null; app.count = 0; go('/login'); }; // localStorage.clear()
  const addToCart = () => {
    const p = app.detail.product; if (!p) return;
    const r = api<CartResponse>('POST', `/api/carts/me/items/${p.id}`, {}, USER_HDR);
    if (ok(r.status)) { app.cart = r.body; app.count = r.body.items.reduce((s, i) => s + i.quantity, 0); step('cart'); }
    refresh();
  };
  const setQty = (productId: number, quantity: number) => {
    const r = api<CartResponse>('PUT', `/api/carts/me/items/${productId}?quantity=${Math.max(1, quantity)}`, {}, USER_HDR);
    if (ok(r.status)) { app.cart = r.body; app.count = r.body.items.reduce((s, i) => s + i.quantity, 0); }
    refresh();
  };
  const removeItem = (productId: number) => {
    const r = api<CartResponse>('DELETE', `/api/carts/me/items/${productId}`, undefined, USER_HDR);
    if (ok(r.status)) { app.cart = r.body; app.count = r.body.items.reduce((s, i) => s + i.quantity, 0); }
    refresh();
  };
  const pay = () => {
    if (!app.cart?.items.length) { alert('Votre panier est vide'); return; }
    app.pay.loading = true; refresh();
    setTimeout(() => {
      const r = api<{ status: string }>('POST', '/api/payments/checkout', { paymentMethod: app.pay.method });
      app.pay.loading = false;
      if (!ok(r.status)) { alert('Erreur lors du paiement'); return; }
      if (r.body.status === 'SUCCESS') step('pay');
      app.pay.name = app.pay.number = app.pay.expiry = app.pay.cvv = '';
      go('/profile');
    }, 700);
  };
  const saveProduct = (form: ProductForm) => {
    const body = { product: { name: form.name, description: form.description, price: Number(form.price), active: form.active }, image: form.image };
    const r = form.id
      ? api('PATCH', `/api/products/${form.id}`, body, ADMIN_HDR)
      : api('POST', '/api/products', body, ADMIN_HDR);
    if (!ok(r.status)) { if (!form.id) alert('Erreur lors de la création du produit'); else refresh(); return; }
    if (readToken(app.token)?.role === 'ADMIN') step('admin');
    loadAdminProducts(); app.admin.add = app.admin.edit = null; refresh();
  };
  const deleteProduct = (id: number) => confirm(t.confirmDelete, () => {
    const r = api('DELETE', `/api/products/${id}`, undefined, ADMIN_HDR);
    if (ok(r.status) && readToken(app.token)?.role === 'ADMIN') step('admin');
    loadAdminProducts(); refresh();
  });
  const saveUser = (form: UserForm) => {
    const r = form.id
      ? api('PUT', `/api/admin/users/${form.id}`, { username: form.username, role: form.role, enabled: form.enabled })
      : api('POST', '/api/admin/users', { username: form.username, password: form.password, role: form.role });
    if (!ok(r.status)) { if (r.status === 403) step('guard'); alert(form.id ? 'Erreur modification utilisateur' : 'Erreur création utilisateur'); return; }
    app.admin.addUser = app.admin.editUser = null; loadUsers(); refresh();
  };
  const deleteUser = (id: number) => confirm(t.confirmUser, () => {
    const r = api('DELETE', `/api/admin/users/${id}`);
    if (!ok(r.status)) { alert('Erreur suppression utilisateur'); return; }
    loadUsers(); refresh();
  });
  const filterPayments = () => {
    const a = app.admin;
    a.shown = (a.payments?.content ?? []).filter(p => (!a.paySearch || String(p.transactionId).includes(a.paySearch) || String(p.userId).includes(a.paySearch))
      && (!a.payStatus || p.status === a.payStatus) && (!a.payMethod || p.paymentMethod === a.payMethod));
    refresh();
  };
  const fill = (u: string, p: string) => { if (app.route !== '/login') go('/login'); app.form.username = u; app.form.password = p; refresh(); };
  const reset = () => { world.current = { e: createEngine(lang), app: newApp() }; setPicked(null); setTable({ db: 'product_db', table: 'products' }); refresh(); };

  const ctx: Ctx = { app, t, go, layer: () => layer.current, refresh, login, register, logout, addToCart, setQty, removeItem, pay, saveProduct, deleteProduct, saveUser, deleteUser, filterPayments,
    loadShop: () => { loadShop(); refresh(); }, loadSugg: () => { loadSugg(app.detail.product!.id); refresh(); },
    loadAdminProducts: () => { loadAdminProducts(); refresh(); }, loadPayments: () => { loadPayments(); refresh(); }, step };

  const now = Date.now();
  const trace = e.traces.find(x => x.id === picked) ?? e.traces[0];
  const meta = TABLES.find(x => x.db === table.db && x.table === table.table)!;
  const rows = rowsOf(e, table);
  const gone = e.gone.filter(g => g.ref.db === table.db && g.ref.table === table.table && now - g.t < FRESH);
  const address = `localhost:4200${app.route}`;

  return (
    <div className="ec">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="title"><i style={{ ['--logo' as string]: 'url(/logos/angular.svg)' }} />{t.title}</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>
          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <span className="hint">{t.hint[0]}<b>{t.hint[1]}</b>{t.hint[2]}<b>{t.hint[3]}</b>{t.hint[4]}</span>
            <span className="accts">{t.accounts}
              <button className="btn small ghost" onClick={() => fill('yassine', 'guitar2026')}>yassine</button>
              <button className="btn small ghost" onClick={() => fill('admin', 'admin123')}>admin</button>
            </span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="stage">
            {/* ---------- the browser running the Angular app ---------- */}
            <section className="browser" aria-label="Guitara">
              <div className="bbar">
                <button className="nav" aria-label={t.back} disabled={!app.past.length} onClick={back}>&#8592;</button>
                <button className="nav" aria-label={t.reload} onClick={() => go(app.route, false)}>&#8635;</button>
                <form className="url" onSubmit={ev => { ev.preventDefault(); go(app.typed ?? app.route); }}>
                  <span className="lock" />
                  <input value={app.typed ?? address} onChange={ev => { app.typed = ev.target.value; refresh(); }} onFocus={ev => ev.target.select()} list="ec-routes" aria-label="URL" spellCheck={false} />
                  <datalist id="ec-routes">{ROUTES.map(r => <option key={r} value={`localhost:4200${r}`} />)}</datalist>
                </form>
              </div>
              <div className="viewport">
              <div className="view" ref={view}>
                <Shop ctx={ctx} />
              </div>
              <div className="layer" ref={layer}>
                {app.dialog && (
                  <div className="dlg-back">
                    <div className="dlg" role="dialog">
                      <p className="from">{lang === 'fr' ? 'localhost:4200 indique' : 'localhost:4200 says'}</p>
                      <p>{app.dialog.text}</p>
                      <div>
                        {app.dialog.kind === 'confirm' && <button onClick={() => { app.dialog = null; refresh(); }}>{t.cancel}</button>}
                        <button className="pri" autoFocus onClick={() => { const d = app.dialog; app.dialog = null; if (d?.kind === 'confirm') d.ok(); refresh(); }}>{t.ok}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </section>

            {/* ---------- what happens behind ---------- */}
            <section className="back" aria-label={t.trace}>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'trace'} onClick={() => setTab('trace')}>{t.trace}<small>{e.traces.length}</small></button>
                <button role="tab" aria-selected={tab === 'db'} onClick={() => setTab('db')}><i style={{ ['--logo' as string]: 'url(/logos/postgresql.svg)' }} />{t.tables}</button>
              </div>
              {tab === 'trace' ? (
                <div className="tr">
                  <ol className="reqs">
                    {!e.traces.length && <li className="none">{t.noTrace}</li>}
                    {e.traces.map(r => (
                      <li key={r.id}>
                        <button className={`${r.id === trace?.id ? 'on' : ''}${now - r.t < 1400 ? ' new' : ''}`} onClick={() => setPicked(r.id)}>
                          <b className={`m ${r.method}`}>{r.method}</b>
                          <code>{r.path.replace(/\?.*$/, '')}</code>
                          <span className={`st s${String(r.status)[0]}`}>{r.status}</span>
                          <small>{r.by}</small>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {trace && (
                    <div className="hops">
                      <h4><b className={`m ${trace.method}`}>{trace.method}</b> <code>{trace.path}</code></h4>
                      <ol>
                        <li className="hop"><span className="who"><i style={{ ['--logo' as string]: 'url(/logos/angular.svg)' }} />{t.nodes.browser}</span><code>{trace.method} {trace.path}</code></li>
                        {trace.hops.map((h, i) => (
                          <li key={i} className={`hop ${h.node}${h.bad ? ' bad' : ''}`}>
                            <span className="who"><i style={{ ['--logo' as string]: `url(/logos/${LOGO[h.node]}.svg)` }} />{t.nodes[h.node]}<small>{h.at}</small></span>
                            <code>{h.text.map((s, k) => <Part key={k} s={s} />)}</code>
                          </li>
                        ))}
                        <li className={`hop end s${String(trace.status)[0]}`}><span className="who">HTTP</span><code>{trace.status}</code></li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="db">
                  <div className="db-top">
                    <div className="chips">
                      {TABLES.map(x => (
                        <button key={x.table} className={x.table === table.table ? 'on' : ''} onClick={() => { setTable({ db: x.db, table: x.table }); setFollowW(false); }}>
                          <s>{x.db}.</s>{x.table}<small>{rowsOf(e, x).length}</small>
                        </button>
                      ))}
                    </div>
                    <label><input type="checkbox" checked={followW} onChange={ev => setFollowW(ev.target.checked)} /> {t.follow}</label>
                  </div>
                  <div className="grid">
                    <table>
                      <thead><tr>{meta.cols.map(([c, type]) => <th key={c}>{c}<small>{type}</small></th>)}</tr></thead>
                      <tbody>
                        {gone.map((g, i) => <tr key={`g${i}`} className="gone">{meta.cols.map(([c, type]) => <Cell key={c} v={g.row[c]} type={type} />)}</tr>)}
                        {rows.map(r => (
                          <tr key={String(r.id)} className={now - (e.changed.get(`${table.db}.${table.table}#${r.id}`) ?? 0) < FRESH ? 'new' : ''}>
                            {meta.cols.map(([c, type]) => <Cell key={c} v={c === 'password' ? '$2a$10$' + String(r.id).padStart(2, '0') + '…' : r[c]} type={type} />)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
        <p className="note">{t.note[0]}<b>{t.note[1]}</b>{t.note[2]}</p>
      </section>
    </div>
  );
}

const Part = ({ s }: { s: Seg }) => typeof s === 'string' ? <>{s}</> : 'd' in s ? <s>{s.d}</s> : <em>{s.v}</em>;
function Cell({ v, type }: { v: unknown; type: string }) {
  if (v === null || v === undefined) return <td className="null">NULL</td>;
  if (type === 'bool') return <td className={v ? 't' : 'f'}>{String(v)}</td>;
  if (type === 'numeric') return <td className="n">{Number(v).toFixed(2)}</td>;
  if (type === 'timestamp') return <td>{String(v).replace('T', ' ').slice(0, 19)}</td>;
  return <td title={String(v)}>{String(v)}</td>;
}

// ======================================================================
// the Angular app: one component per page, same markup and wording
// ======================================================================
type Ctx = {
  app: App; t: DemoStrings; go: (p: string) => void; layer: () => HTMLDivElement | null; refresh: () => void; step: (s: Step) => void;
  login: () => void; register: () => void; logout: () => void; addToCart: () => void; setQty: (id: number, q: number) => void; removeItem: (id: number) => void; pay: () => void;
  saveProduct: (f: ProductForm) => void; deleteProduct: (id: number) => void; saveUser: (f: UserForm) => void; deleteUser: (id: number) => void; filterPayments: () => void;
  loadShop: () => void; loadSugg: () => void; loadAdminProducts: () => void; loadPayments: () => void;
};
const img = (url: string | null | undefined) => pictureOf(url, photo.src);
/** Admin modals float over the browser's viewport, not over the scrolled page. */
const Modal = ({ ctx, children }: { ctx: Ctx; children: ReactNode }) => { const el = ctx.layer(); const box = <div className="modal"><div className="modal-content">{children}</div></div>; return el ? createPortal(box, el) : box; };
const Link = ({ ctx, to, className, children }: { ctx: Ctx; to: string; className?: string; children: ReactNode }) =>
  <a className={className} href={`#${to}`} onClick={ev => { ev.preventDefault(); ctx.go(to); }}>{children}</a>;

function Shop({ ctx }: { ctx: Ctx }) {
  const r = ctx.app.route;
  if (r === '/login' || r === '/register') return <Auth ctx={ctx} register={r === '/register'} />;
  if (r.startsWith('/admin')) return <Admin ctx={ctx} />;
  return (
    <div className="shop">
      <Navbar ctx={ctx} />
      {r === '/products' && <Products ctx={ctx} />}
      {r.startsWith('/products/') && <Detail ctx={ctx} />}
      {r === '/cart' && <CartPage ctx={ctx} />}
      {r === '/payment' && <PaymentPage ctx={ctx} />}
      {r === '/profile' && <Profile ctx={ctx} />}
    </div>
  );
}

function Auth({ ctx, register }: { ctx: Ctx; register: boolean }) {
  const f = ctx.app.form;
  const set = (k: 'username' | 'password', v: string) => { f[k] = v; ctx.refresh(); };
  return (
    <div className="login-background" style={{ backgroundImage: `url(${loginBg.src})` }}>
      <div className="login-card">
        <div className="login-header">
          <div className="logo-square" />
          <h2>{register ? 'Sign Up' : 'Sign In'}</h2>
          <p>{register ? 'Create your account' : 'Enter your credentials'}</p>
        </div>
        <form onSubmit={ev => { ev.preventDefault(); register ? ctx.register() : ctx.login(); }}>
          <label className="form-label">Username</label>
          <div className="input-wrapper"><input value={f.username} onChange={ev => set('username', ev.target.value)} required autoComplete="off" /></div>
          <label className="form-label">Password</label>
          <div className="input-wrapper pw">
            <input type={f.show ? 'text' : 'password'} value={f.password} onChange={ev => set('password', ev.target.value)} required autoComplete="off" />
            <button type="button" className="password-toggle" onClick={() => { f.show = !f.show; ctx.refresh(); }}>{f.show ? 'HIDE' : 'SHOW'}</button>
          </div>
          <button type="submit" className="login-btn">{register ? 'SIGN UP' : 'SIGN IN'}</button>
          {f.error && <p className="msg err">{f.error}</p>}
          {f.success && <p className="msg ok">{f.success}</p>}
        </form>
        <div className="signup-link">
          {register ? <><span>Already have an account?</span> <Link ctx={ctx} to="/login">Sign in</Link></> : <><span>No account?</span> <Link ctx={ctx} to="/register">Create one</Link></>}
        </div>
      </div>
    </div>
  );
}

const P = {
  cart: 'M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49-1.74-.99-3.58 6.48H7.42L6.27 4H2v2h3l3.6 7.59-1.35 2.44C6.52 16.37 6.96 17 7.7 17H19v-2H7.7l.5-1z',
  user: 'M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z',
  out: 'M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2z',
  guitar: 'M20.6 1.4a1.4 1.4 0 0 0-2 0l-3.3 3.3.8.8-4.3 4.3c-1.6-.8-3.5-.7-4.6.4-.6.6-.9 1.5-1 2.4-.1 1.2-1 2.1-2.2 2.3-1 .1-1.8.5-2.4 1.1-1.9 1.9-1.4 5.4 1 7.8s5.9 2.9 7.8 1c.6-.6 1-1.4 1.1-2.4.2-1.2 1.1-2.1 2.3-2.2.9-.1 1.8-.4 2.4-1 1.1-1.1 1.2-3 .4-4.6l4.3-4.3.8.8 3.3-3.3a1.4 1.4 0 0 0 0-2zM9.5 17.2a2.1 2.1 0 1 1-3-3 2.1 2.1 0 0 1 3 3z'
};
const Svg = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

function Navbar({ ctx }: { ctx: Ctx }) {
  return (
    <div className="navbar">
      <Link ctx={ctx} to="/products" className="logo"><Svg d={P.guitar} />Guitara</Link>
      <div className="nav-actions">
        <Link ctx={ctx} to="/cart" className="icon-btn cart-btn"><Svg d={P.cart} />{ctx.app.count > 0 && <span className="cart-count">{ctx.app.count}</span>}</Link>
        <Link ctx={ctx} to="/profile" className="icon-btn"><Svg d={P.user} /></Link>
        <button className="icon-btn logout" title="Déconnexion" onClick={ctx.logout}><Svg d={P.out} /></button>
      </div>
    </div>
  );
}

function Grid({ ctx, list }: { ctx: Ctx; list: ProductDto[] }) {
  return (
    <div className="products">
      {list.map(p => (
        <div className="product-card" key={p.id}>
          <img src={img(p.imageUrl)} alt={p.name} />
          <div className="product-info">
            <h3>{p.name}</h3>
            <p className="price">{p.price} DH</p>
            <Link ctx={ctx} to={`/products/${p.id}`} className="details-btn">Voir détails</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
function Pager({ page, total, onGo }: { page: number; total: number; onGo: (p: number) => void }) {
  return (
    <div className="pagination">
      <button className="page" disabled={page === 0} onClick={() => onGo(page - 1)}>&#8249;</button>
      <span className="page active">{page + 1} / {total}</span>
      <button className="page" disabled={page + 1 >= total} onClick={() => onGo(page + 1)}>&#8250;</button>
    </div>
  );
}

function Products({ ctx }: { ctx: Ctx }) {
  const s = ctx.app.shop;
  return (
    <>
      <div className="hero"><img src={hero.src} alt="Shop Hero" /><h1>Guitar Store!</h1></div>
      <div className="section">
        <div className="shop-filter-bar">
          <input className="shop-search" placeholder="Rechercher un produit..." value={s.keyword}
            onChange={ev => { s.keyword = ev.target.value; s.page = 0; if (s.keyword.trim()) ctx.step('browse'); ctx.loadShop(); }} />
          <select className="shop-sort" value={s.order} onChange={ev => { s.order = ev.target.value as 'asc' | 'desc'; s.page = 0; ctx.step('browse'); ctx.loadShop(); }}>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
        </div>
        <Grid ctx={ctx} list={s.data?.content ?? []} />
        {s.data && s.data.totalPages >= 1 && <Pager page={s.page} total={s.data.totalPages} onGo={p => { s.page = p; ctx.loadShop(); }} />}
      </div>
    </>
  );
}

function Detail({ ctx }: { ctx: Ctx }) {
  const d = ctx.app.detail, p = d.product;
  if (!p) return <p className="loading">Chargement du produit...</p>;
  return (
    <>
      <div className="product-detail">
        <img src={img(p.imageUrl)} alt={p.name} />
        <div className="product-detail-info">
          <h2>{p.name}</h2>
          <p className="description">{p.description}</p>
          <p className="price">{p.price} DH</p>
          <button className="add-cart" onClick={ctx.addToCart}>Ajouter au panier</button>
        </div>
      </div>
      {d.sugg.length > 0 && (
        <div className="suggestions">
          <h3>Produits similaires</h3>
          <Grid ctx={ctx} list={d.sugg} />
          {d.suggTotal > 1 && <Pager page={d.suggPage} total={d.suggTotal} onGo={n => { d.suggPage = n; ctx.loadSugg(); }} />}
        </div>
      )}
    </>
  );
}

function CartPage({ ctx }: { ctx: Ctx }) {
  const items = ctx.app.cart?.items ?? [];
  return (
    <div className="cart-page">
      <h1 className="page-title">Mon Panier</h1>
      <div className="cart-items">
        {items.map(i => (
          <div className="cart-item" key={i.productId}>
            <img src={img(i.productImageUrl)} alt={i.productName} />
            <div className="cart-item-info">
              <h3>{i.productName}</h3>
              <p className="price">{i.price} DH</p>
              <div className="cart-actions">
                <label>Quantité</label>
                <input type="number" min={1} value={i.quantity} onChange={ev => ctx.setQty(i.productId, Number(ev.target.value))} />
                <button className="remove-btn" onClick={() => ctx.removeItem(i.productId)}>Supprimer</button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <p>Votre panier est vide.</p>}
      </div>
      {items.length > 0 && (
        <div className="cart-summary">
          <p>Total : <strong>{ctx.app.cart!.totalAmount} DH</strong></p>
          <button className="checkout-btn" onClick={() => ctx.go('/payment')}>Checkout</button>
        </div>
      )}
    </div>
  );
}

function PaymentPage({ ctx }: { ctx: Ctx }) {
  const p = ctx.app.pay, cart = ctx.app.cart;
  const set = (k: 'name' | 'number' | 'expiry' | 'cvv', v: string) => { p[k] = v; ctx.refresh(); };
  return (
    <div className="checkout-page">
      <h1 className="page-title">Paiement</h1>
      <div className="shop-filter-bar">
        <select className="shop-sort" value={p.method} onChange={ev => { p.method = ev.target.value as PaymentMethod; ctx.refresh(); }}>
          <option value="CARD">Carte bancaire</option>
          <option value="PAYPAL">PayPal</option>
          <option value="CASH">Paiement à la livraison</option>
        </select>
      </div>
      <div className="checkout-layout">
        <div className="checkout-form">
          <h2>Informations de paiement</h2>
          {p.method === 'CARD' && (
            <>
              <div className="credit-card">
                <div className="card-chip" />
                <div className="card-number">{p.number || '•••• •••• •••• ••••'}</div>
                <div className="card-footer">
                  <div><span>Nom</span><strong>{p.name || 'NOM PRENOM'}</strong></div>
                  <div><span>Exp</span><strong>{p.expiry || 'MM/AA'}</strong></div>
                </div>
              </div>
              <form className="fields" onSubmit={ev => ev.preventDefault()}>
                <input placeholder="Nom sur la carte" value={p.name} onChange={ev => set('name', ev.target.value)} autoComplete="off" />
                <input placeholder="Numéro de carte" maxLength={19} value={p.number} onChange={ev => set('number', ev.target.value)} autoComplete="off" inputMode="numeric" />
                <div className="form-row">
                  <input placeholder="MM / AA" maxLength={5} value={p.expiry} onChange={ev => set('expiry', ev.target.value)} autoComplete="off" />
                  <input placeholder="CVV" maxLength={3} type="password" value={p.cvv} onChange={ev => set('cvv', ev.target.value)} autoComplete="off" />
                </div>
              </form>
            </>
          )}
          {p.method === 'PAYPAL' && (
            <form className="fields" onSubmit={ev => ev.preventDefault()}>
              <input placeholder="Email PayPal" autoComplete="off" />
              <input type="password" placeholder="Mot de passe" autoComplete="off" />
            </form>
          )}
          {p.method === 'CASH' && <p className="cash">Vous paierez directement à la livraison.</p>}
          <button className="pay-btn" disabled={p.loading} onClick={ctx.pay}>{p.loading ? 'Traitement...' : 'Payer maintenant'}</button>
        </div>
        <div className="checkout-summary">
          <h2>Résumé de la commande</h2>
          {cart?.items.map(i => <div className="summary-item" key={i.productId}><span>{i.productName} × {i.quantity}</span><span>{i.totalPrice} DH</span></div>)}
          <div className="summary-total"><span>Total</span><span>{cart?.totalAmount ?? 0} DH</span></div>
        </div>
      </div>
    </div>
  );
}

function Profile({ ctx }: { ctx: Ctx }) {
  const claims = readToken(ctx.app.token);
  const list = ctx.app.history ?? [];
  return (
    <div className="profile-page">
      <h1 className="page-title">Mon Profil</h1>
      <div className="profile-card">
        <h2>Informations personnelles</h2>
        <div className="profile-row"><span>Username</span><span>{claims?.sub ?? ''}</span></div>
        <div className="profile-row"><span>Rôle</span><span>{claims?.role ?? ''}</span></div>
        <div className="profile-row"><span>Statut</span><span className="status active">Actif</span></div>
      </div>
      <div className="payment-history">
        <h2>Historique des paiements</h2>
        {!list.length && <p>Aucun paiement trouvé</p>}
        {list.map(p => (
          <div className="payment-item" key={p.transactionId}>
            <div><strong>Transaction #{p.transactionId}</strong><p>{p.paymentMethod}</p></div>
            <div>
              <p className="amount">{p.amount} DH</p>
              <p className={`status ${p.status === 'SUCCESS' ? 'success' : 'failed'}`}>{p.status === 'SUCCESS' ? 'PAYÉ' : 'ÉCHOUÉ'}</p>
              <p className="date">{ddmmyyyy(p.createdDate)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- the admin area (sidebar + three pages)
function Admin({ ctx }: { ctx: Ctx }) {
  const r = ctx.app.route;
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div>
          <h2 className="sidebar-title">Admin</h2>
          <nav className="sidebar-menu">
            <Link ctx={ctx} to="/admin/products" className={r === '/admin/products' ? 'active' : ''}>Produits</Link>
            <Link ctx={ctx} to="/admin/users" className={r === '/admin/users' ? 'active' : ''}>Utilisateurs</Link>
            <Link ctx={ctx} to="/admin/payments" className={r === '/admin/payments' ? 'active' : ''}>Paiements</Link>
          </nav>
        </div>
        <button className="logout-btn" onClick={ctx.logout}>Déconnexion</button>
      </aside>
      <div className="admin-content">
        {r === '/admin/products' && <ProductsAdmin ctx={ctx} />}
        {r === '/admin/users' && <UsersAdmin ctx={ctx} />}
        {r === '/admin/payments' && <PaymentsAdmin ctx={ctx} />}
      </div>
    </div>
  );
}

function ProductsAdmin({ ctx }: { ctx: Ctx }) {
  const a = ctx.app.admin;
  const list = a.products?.content ?? [];
  const blank: ProductForm = { name: '', description: '', price: 0, active: true, image: null };
  return (
    <div className="main-content">
      <h1 className="page-title">Gestion des Produits</h1>
      <button className="abtn" onClick={() => { a.add = { ...blank }; ctx.refresh(); }}>+ Ajouter produit</button>
      <div className="filter-bar">
        <input className="search-input" placeholder="Rechercher un produit..." value={a.keyword} onChange={ev => { a.keyword = ev.target.value; a.page = 0; ctx.loadAdminProducts(); }} />
        <select className="select-filter" value={a.order} onChange={ev => { a.order = ev.target.value as 'asc' | 'desc'; a.page = 0; ctx.loadAdminProducts(); }}>
          <option value="asc">Prix croissant</option>
          <option value="desc">Prix décroissant</option>
        </select>
      </div>
      <div className="cards">
        {list.map(p => (
          <div className="card" key={p.id}>
            <div className="product-image"><img src={img(p.imageUrl)} alt={p.name} /></div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <p className="price">{p.price} DH</p>
            <p className={`status ${p.active ? 'active' : 'inactive'}`}>{p.active ? 'Actif' : 'Inactif'}</p>
            <p><strong>Créé :</strong> {ddmmyyyyHHmm(p.createdDate)}</p>
            <div className="card-actions">
              <button className="abtn" onClick={() => { a.edit = { id: p.id, name: p.name, description: p.description, price: p.price, active: p.active, image: null }; ctx.refresh(); }}>Modifier</button>
              <button className="abtn danger" onClick={() => ctx.deleteProduct(p.id)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      <div className="apager">
        <button className="abtn" disabled={a.page === 0} onClick={() => { a.page--; ctx.loadAdminProducts(); }}>&#8592; Précédent</button>
        <span className="page-info">Page {a.page + 1} / {a.products?.totalPages ?? 0}</span>
        <button className="abtn" disabled={a.page + 1 >= (a.products?.totalPages ?? 0)} onClick={() => { a.page++; ctx.loadAdminProducts(); }}>Suivant &#8594;</button>
      </div>
      {a.add && <ProductModal ctx={ctx} form={a.add} title="Ajouter Produit" action="Créer" close={() => { a.add = null; ctx.refresh(); }} />}
      {a.edit && <ProductModal ctx={ctx} form={a.edit} title="Modifier Produit" action="Modifier" close={() => { a.edit = null; ctx.refresh(); }} />}
    </div>
  );
}

function ProductModal({ ctx, form, title, action, close }: { ctx: Ctx; form: ProductForm; title: string; action: string; close: () => void }) {
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => { form[k] = v; ctx.refresh(); };
  const adding = !form.id;
  return (
    <Modal ctx={ctx}>
        <h3>{title}</h3>
        <input type="text" placeholder={adding ? 'Nom du produit' : undefined} value={form.name} onChange={ev => set('name', ev.target.value)} />
        <textarea placeholder={adding ? 'Description' : undefined} value={form.description} onChange={ev => set('description', ev.target.value)} />
        <input type="number" placeholder={adding ? 'Prix' : undefined} value={form.price} onChange={ev => set('price', ev.target.value)} />
        <label><strong>{adding ? 'Image produit' : 'Changer l’image'}</strong></label>
        <div className="file">
          <button type="button" onClick={() => set('picking', !form.picking)}>{ctx.t.picker}</button>
          <span>{form.image ? `${form.image}.jpg` : ctx.t.pickerFile}</span>
        </div>
        {form.picking && (
          <div className="pick">
            {PICKABLE.map(k => <button key={k} type="button" className={form.image === k ? 'on' : ''} onClick={() => { form.image = k; form.picking = false; ctx.refresh(); }}><img src={pictureOf(`/uploads/0_${k}.jpg`, '')} alt={`${k}.jpg`} /><small>{k}.jpg</small></button>)}
          </div>
        )}
        <select value={String(form.active)} onChange={ev => set('active', ev.target.value === 'true')}>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </select>
        <div className="row">
          <button className="abtn" onClick={() => ctx.saveProduct(form)}>{action}</button>
          <button className="modal-close" onClick={close}>Fermer</button>
        </div>
    </Modal>
  );
}

function UsersAdmin({ ctx }: { ctx: Ctx }) {
  const a = ctx.app.admin;
  const term = a.userSearch.trim().toLowerCase();
  const users = (a.users ?? []).filter(u => !term || u.username.toLowerCase().includes(term));
  return (
    <div className="main-content">
      <h1 className="page-title">Gestion des Utilisateurs</h1>
      <div className="filter-bar"><input className="search-input" placeholder="Rechercher un utilisateur..." value={a.userSearch} onChange={ev => { a.userSearch = ev.target.value; ctx.refresh(); }} /></div>
      <button className="abtn" onClick={() => { a.addUser = { username: '', password: '', role: 'USER', enabled: true }; ctx.refresh(); }}>+ Ajouter user</button>
      {a.usersError && <p className="err">{a.usersError}</p>}
      {users.length > 0 && (
        <table className="table">
          <tbody>
            <tr><th>ID</th><th>Username</th><th>Role</th><th>Enabled</th><th>Créé</th><th>Actions</th></tr>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.username}</td><td>{u.role}</td><td>{String(u.enabled)}</td><td>{short(u.createdDate)}</td>
                <td className="acts">
                  <button className="abtn" onClick={() => { a.editUser = { id: u.id, username: u.username, password: '', role: u.role, enabled: u.enabled }; ctx.refresh(); }}>Modifier</button>
                  <button className="abtn danger" onClick={() => ctx.deleteUser(u.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!users.length && <p>Aucun utilisateur trouvé.</p>}
      {(a.addUser || a.editUser) && (() => {
        const f = (a.addUser ?? a.editUser)!;
        const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => { f[k] = v; ctx.refresh(); };
        return (
          <Modal ctx={ctx}>
              <h3>{a.addUser ? 'Ajouter User' : 'Modifier User'}</h3>
              <input placeholder="Username" value={f.username} onChange={ev => set('username', ev.target.value)} autoComplete="off" />
              {a.addUser && <input type="password" placeholder="Password" value={f.password} onChange={ev => set('password', ev.target.value)} autoComplete="off" />}
              <select value={f.role} onChange={ev => set('role', ev.target.value as 'ADMIN' | 'USER')}><option value="ADMIN">ADMIN</option><option value="USER">USER</option></select>
              {a.editUser && <select value={String(f.enabled)} onChange={ev => set('enabled', ev.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select>}
              <div className="row">
                <button className="abtn" onClick={() => ctx.saveUser(f)}>{a.addUser ? 'Créer' : 'Modifier'}</button>
                <button className="modal-close" onClick={() => { a.addUser = a.editUser = null; ctx.refresh(); }}>Fermer</button>
              </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function PaymentsAdmin({ ctx }: { ctx: Ctx }) {
  const a = ctx.app.admin;
  const total = a.payments?.totalPages ?? 0;
  return (
    <div className="main-content">
      <h1 className="page-title">Historique des Paiements</h1>
      <div className="filter-bar">
        <input className="search-input" placeholder="Transaction / User ID" value={a.paySearch} onChange={ev => { a.paySearch = ev.target.value; ctx.filterPayments(); }} />
        <select className="select-filter" value={a.payStatus} onChange={ev => { a.payStatus = ev.target.value; ctx.filterPayments(); }}>
          <option value="">Tous les statuts</option><option value="SUCCESS">SUCCESS</option><option value="FAILED">FAILED</option><option value="PENDING">PENDING</option>
        </select>
        <select className="select-filter" value={a.payMethod} onChange={ev => { a.payMethod = ev.target.value; ctx.filterPayments(); }}>
          <option value="">Toutes méthodes</option><option value="CARD">CARD</option><option value="PAYPAL">PAYPAL</option>
        </select>
        <button className="abtn" onClick={() => { a.paySearch = a.payStatus = a.payMethod = ''; ctx.filterPayments(); }}>Reset</button>
      </div>
      {a.payError && <p className="err">{a.payError}</p>}
      {a.shown.length > 0 && (
        <table className="table">
          <tbody>
            <tr><th>Transaction</th><th>User ID</th><th>Montant</th><th>Status</th><th>Méthode</th><th>Date</th></tr>
            {a.shown.map(p => <tr key={p.transactionId}><td>{p.transactionId}</td><td>{p.userId}</td><td>{p.amount} DH</td><td>{p.status}</td><td>{p.paymentMethod}</td><td>{short(p.createdDate)}</td></tr>)}
          </tbody>
        </table>
      )}
      {!a.shown.length && <p>Aucun paiement trouvé.</p>}
      <div className="apager">
        <button className="abtn" disabled={a.payPage === 0} onClick={() => { a.payPage--; ctx.loadPayments(); }}>&#8592; Précédent</button>
        <span>Page {a.payPage + 1} / {total}</span>
        <button className="abtn" disabled={a.payPage + 1 >= total} onClick={() => { a.payPage++; ctx.loadPayments(); }}>Suivant &#8594;</button>
      </div>
    </div>
  );
}
