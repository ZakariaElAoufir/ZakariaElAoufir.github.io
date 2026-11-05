import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  ACCOUNTS, COLS, createEngine, currentSession, dec, djDate, pyFloat, request, rowsOf, sessionString,
  type AdminModel, type Engine, type Formation, type Message, type Page, type Response, type Step, type Table, type User
} from './logic';
import { strings, type DemoStrings } from './strings';
import logo from '../media/logo.png';
import './demo.css';

const pictures = import.meta.glob<{ default: { src: string } }>('../media/formations/*.jpg', { eager: true });
const picture = (image: string) => {
  const n = /(\d+)\.jpg$/.exec(image)?.[1];
  return n ? pictures[`../media/formations/${n}.jpg`]?.default.src ?? '' : '';
};

type Props = { lang: 'fr' | 'en' };
type View = Extract<Response, { page: Page }>;
type Browser = { url: string; typed: string | null; view: View | null; past: string[]; menu: boolean; fill: Record<string, string>; closed: Set<number> };
const STEPS: Step[] = ['browse', 'cart', 'login', 'restore', 'register', 'admin'];
const TABLES: Table[] = ['store_formation', 'auth_user', 'store_profile', 'django_session', 'store_formateur', 'store_client', 'store_reservation'];
const FRESH = 1700;
const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;
const newBrowser = (): Browser => ({ url: '/', typed: null, view: null, past: [], menu: false, fill: {}, closed: new Set() });

/** Koursero (Django) in a browser, with the dev server's log, the session and the SQLite tables beside it. */
export default function KourseroDemo({ lang }: Props) {
  const t = strings[lang];
  // the world holds random session keys and clocks: it is built in the browser only
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; b: Browser } | null>(null);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<'server' | 'session' | 'tables'>('server');
  const [picked, setPicked] = useState<number | null>(null);
  const [table, setTable] = useState<Table>('store_formation');
  const [followW, setFollowW] = useState(true);
  const [full, setFull] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => setReady(true), []);
  if (ready && !world.current) { const e = createEngine(lang); const b = newBrowser(); world.current = { e, b }; nav(e, b, 'GET', '/'); }
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setFull(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  if (!world.current) return <div className="ks"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, b } = world.current;

  /** The browser: sends the request, follows redirects, shows the page. */
  const go = (method: 'GET' | 'POST', url: string, form: Record<string, string> = {}, push = true) => {
    const before = e.lastTable;
    if (push && method === 'GET' && url !== b.url) b.past.push(b.url);
    nav(e, b, method, url, form);
    if (e.lastTable && e.lastTable !== before && followW) setTable(e.lastTable);
    setPicked(null);
    if (viewRef.current) viewRef.current.scrollTop = 0;
    refresh();
    setTimeout(refresh, FRESH + 50);
  };
  /** $.ajax({type: 'POST', ...}) then location.reload() */
  const ajax = (url: string, form: Record<string, string>) => {
    request(e, 'POST', url, { ...form, action: 'post' }, true);
    go('GET', b.url, {}, false);
  };
  const ctx: Ctx = { e, b, t, go, ajax, refresh };
  const reset = () => { const ne = createEngine(lang); const nb = newBrowser(); world.current = { e: ne, b: nb }; nav(ne, nb, 'GET', '/'); setPicked(null); setTable('store_formation'); refresh(); };
  const fill = (who: keyof typeof ACCOUNTS) => {
    b.fill = { ...ACCOUNTS[who] };
    go('GET', who === 'admin' ? '/admin/login/' : '/login/');
  };

  const now = Date.now();
  const line = e.log.find(l => l.id === picked) ?? e.log[0];
  const session = currentSession(e);
  const me = b.view?.user ?? null;
  const profile = me ? e.db.store_profile.find(p => p.user_id === me.id) : null;
  const rows = rowsOf(e, table);
  const keyOf = (r: Record<string, unknown>) => String(table === 'django_session' ? r.session_key : r.id);
  const gone = e.gone.filter(g => g.table === table && now - g.t < FRESH);

  return (
    <div className="ks">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="title"><i style={{ ['--logo' as string]: 'url(/logos/django.svg)' }} />{t.title}</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>
          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <span className="hint">{t.hint[0]}<b>{t.hint[1]}</b>{t.hint[2]}<b>{t.hint[3]}</b>{t.hint[4]}</span>
            <span className="accts">{t.accounts}
              <button className="btn small ghost" onClick={() => fill('customer')}>yassine</button>
              <button className="btn small ghost" onClick={() => fill('admin')}>admin</button>
            </span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="stage">
            <section className="browser" aria-label="Koursero">
              <div className="bbar">
                <button className="nav" aria-label={t.back} disabled={!b.past.length} onClick={() => { const p = b.past.pop(); if (p) go('GET', p, {}, false); }}>&#8592;</button>
                <button className="nav" aria-label={t.reload} onClick={() => go('GET', b.url, {}, false)}>&#8635;</button>
                <form className="url" onSubmit={ev => { ev.preventDefault(); const u = (b.typed ?? b.url).trim().replace(/^(https?:\/\/)?(127\.0\.0\.1|localhost):8000/, '') || '/'; b.typed = null; go('GET', u.startsWith('/') ? u : '/' + u); }}>
                  <span className="info">i</span>
                  <input value={b.typed ?? `127.0.0.1:8000${b.url}`} onChange={ev => { b.typed = ev.target.value; refresh(); }} onFocus={ev => ev.target.select()} aria-label="URL" spellCheck={false} />
                </form>
              </div>
              <div className="view" ref={viewRef}>{b.view && <Site key={e.log[0]?.id} ctx={ctx} v={b.view} />}</div>
            </section>

            <section className="back" aria-label={t.server}>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'server'} onClick={() => setTab('server')}><span className="term">&gt;_</span>{t.server}<small>{e.log.length}</small></button>
                <button role="tab" aria-selected={tab === 'session'} onClick={() => setTab('session')}>{t.session}</button>
                <button role="tab" aria-selected={tab === 'tables'} onClick={() => setTab('tables')}><i style={{ ['--logo' as string]: 'url(/logos/sqlite.svg)' }} />{t.tables}</button>
              </div>
              {tab === 'server' && (
                <div className="srv">
                  <div className="console">
                    <p className="dim">Django version 5.0, using settings 'fromation.settings'<br />Starting development server at http://127.0.0.1:8000/</p>
                    {!e.log.length && <p className="dim">{t.noReq}</p>}
                    {[...e.log].reverse().map(l => (
                      <button key={l.id} className={`req${l.id === line?.id ? ' on' : ''}${now - l.t < 1400 ? ' new' : ''}`} onClick={() => setPicked(l.id)}>
                        [{new Date(l.t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '/')} {new Date(l.t).toTimeString().slice(0, 8)}] <span className={`s${String(l.status)[0]}`}>"{l.method} {l.path} HTTP/1.1" {l.status} {l.bytes}</span>{l.xhr && <em> xhr</em>}
                      </button>
                    ))}
                  </div>
                  <div className="sql">
                    <h4>{t.sqlFor} <code>{line ? `${line.method} ${line.path}` : ''}</code></h4>
                    <ol>
                      {line && !line.sql.length && <li className="dim">{t.noSql}</li>}
                      {line?.sql.map((s, i) => <li key={i}><Sql s={s} /></li>)}
                    </ol>
                  </div>
                </div>
              )}
              {tab === 'session' && (
                <div className="sess">
                  <h4>{t.cookie}</h4>
                  <p className="kv"><code>sessionid={e.cookie ?? '—'}</code></p>
                  <h4>{t.sessionData}</h4>
                  <pre>{session ? sessionString(session.data).replace(/, '/g, ",\n '") : t.noCookie}</pre>
                  <h4>{t.cartKey}</h4>
                  <pre>{`{${(session?.data.session_key ?? []).map(([k, v]) => `'${k}': ${pyFloat(v)}`).join(', ')}}`}</pre>
                  <h4>{t.oldCart}</h4>
                  <pre>{profile ? `user_id=${profile.user_id} (${me!.username})\nold_cart = ${profile.old_cart ?? 'NULL'}` : t.anon}</pre>
                </div>
              )}
              {tab === 'tables' && (
                <div className="tbl">
                  <div className="chips">
                    {TABLES.map(name => <button key={name} className={name === table ? 'on' : ''} onClick={() => { setTable(name); setFollowW(false); }}>{name}<small>{rowsOf(e, name).length}</small></button>)}
                  </div>
                  <label className="follow"><input type="checkbox" checked={followW} onChange={ev => setFollowW(ev.target.checked)} /> {t.follow}</label>
                  <div className="dbgrid">
                    <table>
                      <thead><tr>{COLS[table].map(c => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {rows.map(r => <tr key={keyOf(r)} className={now - (e.changed.get(`${table}#${keyOf(r)}`) ?? 0) < FRESH ? 'new' : ''}>{COLS[table].map(c => <Cell key={c} v={r[c]} col={c} />)}</tr>)}
                        {gone.map((g, i) => <tr key={`g${i}`} className="gone">{COLS[table].map(c => <Cell key={c} v={table === 'django_session' && c === 'session_data' ? sessionString((g.row as { data: never }).data) : g.row[c]} col={c} />)}</tr>)}
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

/** follows up to 5 redirects, like a browser */
function nav(e: Engine, b: Browser, method: 'GET' | 'POST', url: string, form: Record<string, string> = {}) {
  let res = request(e, method, url, form);
  let u = url;
  for (let i = 0; i < 5 && 'redirect' in res; i++) { u = res.redirect; res = request(e, 'GET', u); }
  if ('page' in res) { b.view = res; b.url = u; b.menu = false; b.closed = new Set(); }
}

function Sql({ s }: { s: string }) {
  const parts = s.split(/("(?:[^"]*)"|'(?:[^']|'')*')/g);
  return <code>{parts.map((p, i) => p.startsWith('"') ? <span key={i} className="id">{p}</span> : p.startsWith("'") ? <span key={i} className="str">{p}</span> : <span key={i}>{p.split(/\b(SELECT|FROM|WHERE|AND|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|IN|INNER JOIN|ON|ORDER BY|DESC|COUNT|AS|LIKE|ESCAPE|NULL)\b/g).map((w, j) => j % 2 ? <b key={j}>{w}</b> : w)}</span>)}</code>;
}
function Cell({ v, col }: { v: unknown; col: string }) {
  if (v === null || v === undefined) return <td className="null">NULL</td>;
  if (typeof v === 'boolean') return <td className="n">{v ? 1 : 0}</td>;
  if (typeof v === 'number') return <td className="n">{col === 'prix' ? dec(v) : v}</td>;
  return <td title={String(v)}>{String(v).replace('T', ' ')}</td>;
}

// ======================================================================
// the site: base.html, navbar.html and each template
// ======================================================================
type Ctx = { e: Engine; b: Browser; t: DemoStrings; go: (m: 'GET' | 'POST', url: string, form?: Record<string, string>, push?: boolean) => void; ajax: (url: string, form: Record<string, string>) => void; refresh: () => void };
const A = ({ ctx, to, className, children }: { ctx: Ctx; to: string; className?: string; children: ReactNode }) =>
  <a className={className} href={`#${to}`} onClick={ev => { ev.preventDefault(); ctx.go('GET', to); }}>{children}</a>;
/** a form whose fields are read on submit, posted to its action */
const Form = ({ ctx, action, children, className }: { ctx: Ctx; action: string; children: ReactNode; className?: string }) => (
  <form className={className} onSubmit={ev => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); const data: Record<string, string> = {}; fd.forEach((v, k) => { data[k] = String(v); }); ctx.b.fill = {}; ctx.go('POST', action, data); }}>{children}</form>
);

function Site({ ctx, v }: { ctx: Ctx; v: View }) {
  const p = v.page;
  if (p.v === 'debug404' || p.v === 'debug500') return <Debug p={p} />;
  if (p.v.startsWith('admin')) return <Admin ctx={ctx} v={v} />;
  return (
    <div className="bs">
      <Navbar ctx={ctx} v={v} />
      <div className="spacer" />
      {v.messages.map((m, i) => !ctx.b.closed.has(i) && <Alert key={i} m={m} onClose={() => { ctx.b.closed.add(i); ctx.refresh(); }} />)}
      <Body ctx={ctx} p={p} user={v.user} />
      <footer className="foot"><p>Copyright &copy; Zakaria El Aoufir - Walid El Hatimi 2024</p></footer>
    </div>
  );
}
const Alert = ({ m, onClose }: { m: Message; onClose: () => void }) => <div className="alert" role="alert">{m.text}<button className="x" aria-label="Close" onClick={onClose}>&times;</button></div>;

function Navbar({ ctx, v }: { ctx: Ctx; v: View }) {
  const { b } = ctx;
  return (
    <nav className="nb">
      <div className="container nbin">
        <A ctx={ctx} to="/" className="brand">Koursero</A>
        <ul>
          <li><A ctx={ctx} to="/" className="active">Home</A></li>
          <li><A ctx={ctx} to="/search">Search</A></li>
          <li><A ctx={ctx} to="/about/">About</A></li>
          {v.user ? <>
            <li><A ctx={ctx} to="/logout">Logout</A></li>
            <li className="dd">
              <a href="#" onClick={ev => { ev.preventDefault(); b.menu = !b.menu; ctx.refresh(); }} className="ddt">Profile Infos</a>
              {b.menu && <ul className="ddm"><li><A ctx={ctx} to="/update_info/">User Profile</A></li><li><hr /></li><li><A ctx={ctx} to="/update_user/">Update Profile</A></li></ul>}
            </li>
          </> : <>
            <li><A ctx={ctx} to="/login/">Login</A></li>
            <li><A ctx={ctx} to="/register/">Register</A></li>
          </>}
        </ul>
        <A ctx={ctx} to="/cart/" className="btn-od cartbtn"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" /></svg>Cart<span className="pill">{v.cartCount}</span></A>
      </div>
    </nav>
  );
}

const Hero = ({ title, lead }: { title: string; lead: string }) => <header className="hero"><h1>{title}</h1><p>{lead}</p></header>;
function Card({ ctx, f }: { ctx: Ctx; f: Formation }) {
  return (
    <div className="card">
      <div className="sale">Sale</div>
      <img src={picture(f.image)} alt="..." />
      <div className="cb">
        <h5>{f.titre}</h5><hr /><p>{f.descriptif}</p>
        <span className="strike">$50.00</span> ${dec(f.prix)}
      </div>
      <div className="cf"><A ctx={ctx} to={`/formation/${f.id}`} className="btn-od">View more</A></div>
    </div>
  );
}
/** the split box of login.html, register.html, update_*.html */
const Box = ({ children }: { children: ReactNode }) => (
  <div className="boxwrap"><div className="box-area">
    <div className="left-box"><img src={logo.src} alt="" /><p className="kname">Koursero</p><small>Select, Learn and Enjoy!</small></div>
    <div className="right-box">{children}</div>
  </div></div>
);
const Field = ({ name, placeholder, type = 'text', value, help, lg }: { name: string; placeholder: string; type?: string; value?: string; help?: ReactNode; lg?: boolean }) => (
  <p className="fld"><input className={`fc${lg ? ' lg' : ''}`} name={name} type={type} placeholder={placeholder} defaultValue={value} autoComplete="off" spellCheck={false} />{help}</p>
);
const LOREM = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Qui quas ullam tenetur, deserunt iusto omnis nemo veritatis distinctio velit, animi ad illum accusantium. Nemo suscipit vitae minima sint explicabo quasi.';
const PW_HELP = <ul className="help"><li>Your password can't be too similar to your other personal information.</li><li>Your password must contain at least 8 characters.</li><li>Your password can't be a commonly used password.</li><li>Your password can't be entirely numeric.</li></ul>;
const USER_HELP = <small className="help">Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.</small>;

function Body({ ctx, p, user }: { ctx: Ctx; p: Page; user: User | null }) {
  const fill = ctx.b.fill;
  switch (p.v) {
    case 'home': return <><Hero title="Learn in style" lead="Select, Learn and Enjoy!" /><section className="grid4">{p.formations.map(f => <Card key={f.id} ctx={ctx} f={f} />)}</section></>;
    case 'formation': return (
      <div className="container pt">
        <div className="hcard">
          <img src={picture(p.f.image)} alt="..." />
          <div className="hb">
            <div className="center">
              <h5>{p.f.titre}</h5><p>{p.f.descriptif}</p>
              <p><strong>Price: </strong><span className="strike">$50.00</span> ${dec(p.f.prix)}</p>
              <p><strong>Date: </strong>{djDate(p.f.date_formation)}</p>
              <p><strong>Made by: </strong>{p.trainer}</p>
            </div>
            <A ctx={ctx} to="/" className="btn-dark">Go back home</A>{' '}
            <button className="btn-sec" onClick={() => ctx.ajax('/cart/add/', { formation_id: String(p.f.id) })}>Add to cart</button>
          </div>
        </div>
      </div>
    );
    case 'cart': return (
      <><Hero title="Shopping Cart" lead="View Your Cart..." />
        <div className="container pt">
          {p.items.length ? <>
            {p.items.map(f => (
              <div className="hcard" key={f.id}>
                <img src={picture(f.image)} alt="..." />
                <div className="hb">
                  <div className="center"><h5>{f.titre}</h5><p>{f.descriptif}</p><p><strong>Price: </strong><span className="strike">$50.00</span> ${dec(f.prix)}</p><p><strong>Date: </strong>{djDate(f.date_formation)}</p><p><strong>Made by: </strong>Hamza</p></div>
                  <A ctx={ctx} to="/" className="btn-sec">Go back home</A>{' '}
                  <button className="btn-danger" onClick={() => ctx.ajax('/cart/delete/', { formation_id: String(f.id) })}>Delete</button>
                </div>
              </div>
            ))}
            <h3 className="total">Total: ${pyFloat(p.total)}</h3>
          </> : <p>There's Nothing In Your Cart...</p>}
        </div></>
    );
    case 'search': return (
      <><Hero title="Search Formation" lead="Find What You're Looking For..." />
        <div className="container pt narrow">
          <div className="scard"><div className="sh">Search Formation</div>
            <Form ctx={ctx} action="/search" className="sb"><input className="fc" name="searched" placeholder="Search for a Formation in Koursero" autoComplete="off" /><button className="btn-dark" type="submit">Search Formation</button></Form>
          </div>
          {p.searched && p.searched.map(f => <div className="one" key={f.id}><Card ctx={ctx} f={f} /></div>)}
        </div></>
    );
    case 'about': return (
      <><Hero title="About Us" lead="Welcome to Koursero" />
        <div className="container pt narrow"><p className="lorem">{LOREM}<br /><br />{LOREM}</p></div></>
    );
    case 'login': return (
      <Box>
        <div className="ht"><h2>Hello,Again</h2><p>We are happy to have you back.</p></div>
        <Form ctx={ctx} action="/login/">
          <Field name="username" placeholder="Enter your UserName..." value={fill.username} lg />
          <Field name="password" placeholder="Enter your Password..." type="password" value={fill.password} lg />
          <button className="btn-dark lg w100" type="submit">Login</button>
        </Form>
        <small>Don't have account? <A ctx={ctx} to="/register/">Sign Up</A></small>
      </Box>
    );
    case 'register': return (
      <Box>
        <div className="ht"><h2>Register</h2><p>Create your account.</p></div>
        <Form ctx={ctx} action="/register/">
          <Field name="username" placeholder="User Name" help={USER_HELP} />
          <Field name="first_name" placeholder="First Name" />
          <Field name="last_name" placeholder="Last Name" />
          <Field name="email" placeholder="Email Address" />
          <Field name="password1" placeholder="Password" type="password" help={PW_HELP} />
          <Field name="password2" placeholder="Confirm Password" type="password" help={<small className="help">Enter the same password as before, for verification.</small>} />
          <button className="btn-dark w100" type="submit">Register</button>
        </Form>
        <small>Already have an account? <A ctx={ctx} to="/login/">Login</A></small>
      </Box>
    );
    case 'update_user': return (
      <Box>
        <div className="ht"><h2>Update Profile</h2><p>Update User Profile.</p></div>
        <Form ctx={ctx} action="/update_user/">
          <Field name="username" placeholder="User Name" value={p.user.username} help={USER_HELP} />
          <Field name="first_name" placeholder="First Name" value={p.user.first_name} />
          <Field name="last_name" placeholder="Last Name" value={p.user.last_name} />
          <Field name="email" placeholder="Email Address" value={p.user.email} />
          <button className="btn-dark w100" type="submit">Update Profile</button>
          <small className="mt">Update current <A ctx={ctx} to="/update_password/">Password</A>?</small>
        </Form>
      </Box>
    );
    case 'update_info': return (
      <Box>
        <div className="ht"><h2>User Info</h2><p>Update User Info.</p></div>
        <Form ctx={ctx} action="/update_info/">
          <Field name="phone" placeholder="Phone(Optional)" value={p.profile.phone} />
          <Field name="city" placeholder="City(Optional)" value={p.profile.city} />
          <Field name="country" placeholder="Country(Optional)" value={p.profile.country} />
          <button className="btn-dark w100" type="submit">Update Profile</button>
        </Form>
      </Box>
    );
    case 'update_password': return (
      <Box>
        <div className="ht"><h2>Password</h2><p>Update User Password.</p></div>
        <Form ctx={ctx} action="/update_password/">
          <Field name="new_password1" placeholder="Password" type="password" help={PW_HELP} />
          <Field name="new_password2" placeholder="Confirm Password" type="password" help={<small className="help">Enter the same password as before, for verification.</small>} />
          <button className="btn-dark w100" type="submit">Update Password</button>
        </Form>
        <small className="mt">Go back <A ctx={ctx} to="/">Home</A>{user ? '' : ''}</small>
      </Box>
    );
    default: return null;
  }
}

function Debug({ p }: { p: Extract<Page, { v: 'debug404' | 'debug500' }> }) {
  return p.v === 'debug404' ? (
    <div className="dj404">
      <div className="sum"><h1>Page not found <span>(404)</span></h1><table><tbody><tr><th>Request Method:</th><td>GET</td></tr><tr><th>Request URL:</th><td>http://127.0.0.1:8000{p.path}</td></tr></tbody></table></div>
      <div className="info"><p>Using the URLconf defined in <code>fromation.urls</code>, Django tried these URL patterns, in this order:</p>
        <ol>{['admin/', '[name=\'home\']', 'about/ [name=\'about\']', 'login/ [name=\'login\']', 'logout [name=\'logout\']', 'search [name=\'search\']', 'register/ [name=\'register\']', 'update_user/ [name=\'update_user\']', 'update_info/ [name=\'update_info\']', 'update_password/ [name=\'update_password\']', 'formation/<int:pk> [name=\'formation\']', 'cart/', '^media/(?P<path>.*)$'].map(x => <li key={x}>{x}</li>)}</ol>
        <p>The current path, <code>{p.path.slice(1)}</code>, didn’t match any of these.</p></div>
      <div className="expl"><p>You’re seeing this error because you have <code>DEBUG = True</code> in your Django settings file.</p></div>
    </div>
  ) : (
    <div className="dj500">
      <div className="sum"><h1>DoesNotExist at {p.path}</h1><pre>{p.error}</pre>
        <table><tbody><tr><th>Request Method:</th><td>GET</td></tr><tr><th>Request URL:</th><td>http://127.0.0.1:8000{p.path}</td></tr><tr><th>Django Version:</th><td>5.0</td></tr><tr><th>Exception Type:</th><td>DoesNotExist</td></tr><tr><th>Exception Location:</th><td>django/db/models/query.py, in get</td></tr><tr><th>Raised during:</th><td>store.views.formation</td></tr></tbody></table></div>
      <div className="tb"><h2>Traceback</h2><pre>File "store/views.py", in formation{'\n'}    formation = Formation.objects.get(id=pk){'\n'}store.models.Formation.DoesNotExist: {p.error}</pre></div>
    </div>
  );
}

// ---------------------------------------------------------------- the Django admin
const MODELS: { app: string; label: string; models: [AdminModel, string][] }[] = [
  { app: 'auth', label: 'Authentication and Authorization', models: [['group', 'Groups'], ['user', 'Users']] },
  { app: 'store', label: 'Store', models: [['client', 'Clients'], ['formateur', 'Formateurs'], ['formation', 'Formations'], ['profile', 'Profiles'], ['reservation', 'Reservations']] }
];
function Admin({ ctx, v }: { ctx: Ctx; v: View }) {
  const p = v.page;
  const { e } = ctx;
  const head = (crumbs: [string, string | null][]) => (
    <>
      <div className="djh"><span className="brand">Django administration</span>{v.user && <span className="tools">WELCOME, <b>{v.user.username.toUpperCase()}</b>. <A ctx={ctx} to="/">VIEW SITE</A> / <A ctx={ctx} to="/admin/logout/">LOG OUT</A></span>}</div>
      <div className="crumbs">{crumbs.map(([label, to], i) => <span key={i}>{i > 0 && ' › '}{to ? <A ctx={ctx} to={to}>{label}</A> : label}</span>)}</div>
      {v.messages.map((m, i) => <p key={i} className={`djmsg ${m.level}`}>{m.text}</p>)}
    </>
  );
  if (p.v === 'admin_login') return (
    <div className="djlogin"><div className="djbox">
      <div className="djh"><span className="brand">Django administration</span></div>
      {v.user && !v.user.is_staff && <p className="errornote">You are authenticated as {v.user.username}, but are not authorized to access this page. Would you like to login to a different account?</p>}
      {p.error && <p className="errornote">{p.error}</p>}
      <Form ctx={ctx} action="/admin/login/" className="djform">
        <label>Username:<input name="username" defaultValue={ctx.b.fill.username} autoComplete="off" /></label>
        <label>Password:<input name="password" type="password" defaultValue={ctx.b.fill.password} autoComplete="off" /></label>
        <button type="submit">Log in</button>
      </Form>
    </div></div>
  );
  if (p.v === 'admin_index') return (
    <div className="dj">{head([['Home', null]])}
      <div className="djc"><h1>Site administration</h1>
        {MODELS.map(m => (
          <table className="mod" key={m.app}><caption>{m.label}</caption><tbody>
            {m.models.map(([k, label]) => <tr key={k}><th><A ctx={ctx} to={`/admin/${m.app}/${k}/`}>{label}</A></th><td><A ctx={ctx} to={k === 'formation' ? '/admin/store/formation/add/' : `/admin/${m.app}/${k}/`} className="addlink">+ Add</A></td><td><A ctx={ctx} to={`/admin/${m.app}/${k}/`} className="changelink">Change</A></td></tr>)}
          </tbody></table>
        ))}
      </div>
    </div>
  );
  if (p.v === 'admin_list') {
    const items: [number, string][] = p.model === 'formation' ? e.db.store_formation.map(f => [f.id, f.titre]) : p.model === 'formateur' ? e.db.store_formateur.map(f => [f.id, f.username])
      : p.model === 'profile' ? e.db.store_profile.map(x => [x.id, e.db.auth_user.find(u => u.id === x.user_id)?.username ?? '']) : p.model === 'user' ? e.db.auth_user.map(u => [u.id, u.username]) : [];
    const name = MODELS.flatMap(m => m.models).find(m => m[0] === p.model)![1];
    const single = name.toLowerCase().replace(/s$/, '');
    return (
      <div className="dj">{head([['Home', '/admin/'], [p.model === 'user' || p.model === 'group' ? 'Authentication and Authorization' : 'Store', null], [name, null]])}
        <div className="djc">
          <div className="ttl"><h1>Select {single} to change</h1>{p.model === 'formation' && <A ctx={ctx} to="/admin/store/formation/add/" className="addbtn">ADD FORMATION +</A>}</div>
          <div className="actions">Action: <select disabled><option>---------</option><option>Delete selected {name.toLowerCase()}</option></select> <button disabled>Go</button> <span>0 of {items.length} selected</span></div>
          <table className="res"><thead><tr><th className="cb"><input type="checkbox" disabled /></th><th>{single.toUpperCase()}</th></tr></thead>
            <tbody>{[...items].reverse().map(([id, label]) => <tr key={id}><td className="cb"><input type="checkbox" disabled /></td><th>{p.model === 'formation' ? <A ctx={ctx} to={`/admin/store/formation/${id}/change/`}>{label}</A> : label}</th></tr>)}</tbody>
          </table>
          <p className="count">{items.length} {items.length === 1 ? single : name.toLowerCase()}</p>
        </div>
      </div>
    );
  }
  if (p.v === 'admin_delete') return (
    <div className="dj">{head([['Home', '/admin/'], ['Store', null], ['Formations', '/admin/store/formation/'], [p.f.titre, `/admin/store/formation/${p.f.id}/change/`], ['Delete', null]])}
      <div className="djc"><h1>Are you sure?</h1>
        <p>Are you sure you want to delete the formation “{p.f.titre}”? All of the following related items will be deleted:</p>
        <ul><li>Formation: <A ctx={ctx} to={`/admin/store/formation/${p.f.id}/change/`}>{p.f.titre}</A></li></ul>
        <Form ctx={ctx} action={`/admin/store/formation/${p.f.id}/delete/`} className="row"><input type="hidden" name="post" value="yes" /><button className="del" type="submit">Yes, I’m sure</button> <A ctx={ctx} to={`/admin/store/formation/${p.f.id}/change/`} className="cancel">No, take me back</A></Form>
      </div>
    </div>
  );
  if (p.v === 'admin_change') {
    const f = p.f;
    return (
      <div className="dj">{head([['Home', '/admin/'], ['Store', null], ['Formations', '/admin/store/formation/'], [f ? f.titre : 'Add formation', null]])}
        <div className="djc"><h1>{f ? 'Change formation' : 'Add formation'}</h1>{f && <h2 className="obj">{f.titre}</h2>}
          <Form ctx={ctx} action={f ? `/admin/store/formation/${f.id}/change/` : '/admin/store/formation/add/'}>
            <fieldset className="module">
              <div className="frow"><label className="req">Titre:</label><input name="titre" defaultValue={f?.titre} className="vText" /></div>
              <div className="frow"><label>Descriptif:</label><input name="descriptif" defaultValue={f?.descriptif} className="vText" /></div>
              <div className="frow"><label className="req">Prix:</label><input name="prix" defaultValue={f ? dec(f.prix) : ''} className="vNum" /></div>
              <div className="frow"><label className="req">Date formation:</label><span className="dt">Date: <input value={(f?.date_formation ?? new Date().toISOString()).slice(0, 10)} readOnly className="vDate" /> Time: <input value={(f?.date_formation ?? new Date().toISOString()).slice(11, 19)} readOnly className="vTime" /></span></div>
              <div className="frow"><label className="req">Image:</label><span className="img">{f ? <>Currently: <a href="#" onClick={ev => ev.preventDefault()}>{f.image}</a><br /></> : null}Change: <select name="image" defaultValue={f?.image ?? 'uploads/formation/1.jpg'}>{e.db.store_formation.slice(0, 8).map(x => <option key={x.id} value={x.image}>{x.image.split('/').pop()}</option>)}</select></span></div>
              <div className="frow"><label className="req">Formateur:</label><select disabled><option>Hamza</option></select></div>
            </fieldset>
            <div className="submit-row">
              <button type="submit" className="default">SAVE</button>
              {f && <A ctx={ctx} to={`/admin/store/formation/${f.id}/delete/`} className="deletelink">Delete</A>}
            </div>
          </Form>
        </div>
      </div>
    );
  }
  return null;
}
