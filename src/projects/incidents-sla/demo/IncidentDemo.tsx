import { useEffect, useReducer, useRef, useState } from 'react';
import { call, clock, createEngine, rowsOf, runSlaCheck, stamp, TABLES, type Engine, type Method, type Node, type Seg, type Step, type TableName } from './logic';
import Login from './Login';
import { Credit } from './Notices';
import { dateTime, Icon, type App, type Ctx } from './shared';
import { strings } from './strings';
import { Dashboard, MyGroup, MyTickets, TicketDetail } from './Technician';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
const FRESH = 1700;
const STEPS: Step[] = ['login', 'filter', 'group', 'assign', 'status', 'resolve', 'escalate', 'sla'];
const LOGO: Record<Node, string> = { proxy: 'angular', security: 'springsecurity', controller: 'springboot', service: 'spring', mysql: 'mysql' };
const HOME = { TECHNICIEN: '/technicien/dashboard-technicien', ADMIN: '/admin/dashboard', CLIENT: '/client/dashboard' } as const;
const ACCOUNTS: [string, string][] = [['Amine', 'amine.tazi'], ['Salma', 'salma.idrissi'], ['Admin', 'admin.demo'], ['Client', 'atlas.client']];
const newApp = (): App => ({ route: '/login', past: [], typed: null, token: null, role: null, username: null });
const Part = ({ s }: { s: Seg }) => typeof s === 'string' ? <>{s}</> : 'd' in s ? <s>{s.d}</s> : <em>{s.v}</em>;

/** The technician area of the Angular front in a browser window, with the journey of each request and the MySQL tables beside it. */
export default function IncidentDemo({ lang }: Props) {
  const t = strings[lang];
  // the world holds clocks: it is built in the browser only, so the server's HTML never disagrees with it
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; app: App } | null>(null);
  if (ready && !world.current) world.current = { e: createEngine(lang), app: newApp() };
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<'trace' | 'db'>('trace');
  const [picked, setPicked] = useState<number | null>(null);
  const [table, setTable] = useState<TableName>('ticket');
  const [followW, setFollowW] = useState(true);
  const [full, setFull] = useState(false);
  const [prefill, setPrefill] = useState({ username: '', nonce: 0 });
  const [page, setPage] = useState(0); // a new value remounts the page, which reloads its data like ngOnInit
  useEffect(() => setReady(true), []);
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setFull(false); };
    addEventListener('keydown', onKey);
    return () => { removeEventListener('keydown', onKey); document.body.classList.remove('demo-locked'); };
  }, [full]);

  if (!world.current) return <div className="inc"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, app } = world.current;

  const api = <T,>(method: Method, url: string, body?: unknown) => {
    const before = e.lastTable;
    const res = call<T>(e, app.username ?? (lang === 'fr' ? 'anonyme' : 'anonymous'), method, url, app.token, body);
    // pages load their data while they render: the panel beside them updates just after
    const written = e.lastTable !== before ? e.lastTable : null;
    queueMicrotask(() => { if (written && followW) setTable(written); setPicked(null); refresh(); });
    setTimeout(refresh, FRESH + 50);
    return res;
  };
  /** The router and its guards. */
  const go = (path: string, push = true) => {
    let route = path.trim().replace(/^(https?:\/\/)?localhost:4200/, '').replace(/\/+$/, '') || '/login';
    if (!route.startsWith('/')) route = `/${route}`;
    if (!app.role) route = '/login';
    else {
      const own = HOME[app.role];
      const allowed = app.role === 'TECHNICIEN' ? route.startsWith('/technicien/') && (route === own || /\/(my-tickets-technicien|group-tickets-technicien|detail-ticket-technicien\/\d+)$/.test(route)) : route.startsWith(own.split('/dashboard')[0]);
      if (!allowed) route = own;
    }
    if (route.endsWith('/group-tickets-technicien')) e.steps.add('group');
    if (push && route !== app.route) app.past.push(app.route);
    app.route = route; app.typed = null;
    setPage(n => n + 1);
    refresh();
  };
  const ctx: Ctx = {
    e, app, t, lang, go, api,
    back: () => { const p = app.past.pop(); if (p) go(p, false); },
    step: s => { e.steps.add(s); refresh(); },
    signIn: (token, username, role) => { app.token = token; app.username = username; app.role = role.replace('ROLE_', '') as App['role']; app.past = []; go(HOME[app.role!], false); },
    logout: () => { app.token = null; app.username = null; app.role = null; app.past = []; go('/login', false); }
  };
  const reset = () => {
    world.current = { e: createEngine(lang), app: newApp() };
    setPrefill({ username: '', nonce: 0 }); setPicked(null); setPage(n => n + 1); setTab('trace');
  };
  const advance = (minutes: number) => { e.skew += minutes * 60_000; refresh(); };
  const check = () => {
    const before = e.lastTable;
    runSlaCheck(e);
    if (e.lastTable !== before && followW && e.lastTable) setTable(e.lastTable);
    setPicked(null);
    setTimeout(refresh, FRESH + 50);
    go(app.route, false); // the open page reloads, so a ticket shows its new SLA status
  };
  const fill = (username: string) => {
    if (app.role) ctx.logout();
    setPrefill(p => ({ username, nonce: p.nonce + 1 }));
  };

  const now = e.now();
  // after an action, its reload follows it: the panel opens on the action rather than on that GET
  const trace = e.traces.find(x => x.id === picked) ?? e.traces.slice(0, 3).find(r => r.method !== 'GET') ?? e.traces[0];
  const meta = TABLES.find(x => x.table === table)!;
  const rows = rowsOf(e, table);

  return (
    <div className="inc">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="title"><i style={{ ['--logo' as string]: 'url(/logos/angular.svg)' }} />{t.title}</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>
          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <span className="hint">{t.hint.map((s, i) => i % 2 ? <b key={i}>{s}</b> : s)}</span>
            <span className="accts">{t.accounts}
              {ACCOUNTS.map(([label, username]) => <button key={username} className="btn small ghost" onClick={() => fill(username)}>{label}</button>)}
            </span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="ctrl clockbar">
            <span className="lab">{t.clock.label}</span>
            <b className="clock-now">{dateTime(stamp(clock(e)))}</b>
            <button className="btn small ghost" onClick={() => advance(30)}>+30 min</button>
            <button className="btn small ghost" onClick={() => advance(120)}>+2 h</button>
            <button className="btn small" onClick={check}>{t.clock.run}</button>
            <span className="hint">{t.clock.note}</span>
          </div>
          <div className="stage">
            <section className="browser" aria-label="Predict SLA">
              <div className="bbar">
                <button className="nav" aria-label={t.back} disabled={!app.past.length} onClick={ctx.back}>&#8592;</button>
                <button className="nav" aria-label={t.reload} onClick={() => go(app.route, false)}>&#8635;</button>
                <form className="url" onSubmit={ev => { ev.preventDefault(); go(app.typed ?? app.route); }}>
                  <span className="lock" />
                  <input value={app.typed ?? `localhost:4200${app.route}`} onChange={ev => { app.typed = ev.target.value; refresh(); }} onFocus={ev => ev.target.select()} aria-label="URL" spellCheck={false} />
                </form>
              </div>
              <div className="viewport">
                <div className="view"><Screen key={`${app.route}#${page}`} ctx={ctx} prefill={prefill} /></div>
              </div>
            </section>

            <section className="back" aria-label={t.trace}>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'trace'} onClick={() => setTab('trace')}>{t.trace}<small>{e.traces.length}</small></button>
                <button role="tab" aria-selected={tab === 'db'} onClick={() => setTab('db')}><i style={{ ['--logo' as string]: 'url(/logos/mysql.svg)' }} />{t.tables}</button>
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
                        <li className="hop n-browser"><span className="who"><i style={{ ['--logo' as string]: 'url(/logos/angular.svg)' }} />{t.nodes.browser}</span><code>{trace.method} {trace.path}</code></li>
                        {trace.hops.map((h, i) => (
                          <li key={i} className={`hop n-${h.node}${h.bad ? ' bad' : ''}`}>
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
                        <button key={x.table} className={x.table === table ? 'on' : ''} onClick={() => { setTable(x.table); setFollowW(false); }}>
                          {x.table}<small>{rowsOf(e, x.table).length}</small>
                        </button>
                      ))}
                    </div>
                    <label><input type="checkbox" checked={followW} onChange={ev => setFollowW(ev.target.checked)} /> {t.follow}</label>
                  </div>
                  <div className="dbgrid">
                    <table>
                      <thead><tr>{meta.cols.map(([c, type]) => <th key={c}>{c}<small>{type}</small></th>)}</tr></thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={String(r.id)} className={now - (e.changed.get(`${table}#${r.id}`) ?? 0) < FRESH ? 'new' : ''}>
                            {meta.cols.map(([c, type]) => <Cell key={c} v={c === 'password' ? `$2a$10$${String(r.id).padStart(2, '0')}…` : r[c]} type={type} />)}
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

function Cell({ v, type }: { v: unknown; type: string }) {
  if (v === null || v === undefined) return <td className="null">NULL</td>;
  if (type === 'bool') return <td className={v ? 't' : 'f'}>{String(v)}</td>;
  if (type === 'timestamp') return <td>{String(v).replace('T', ' ').slice(0, 19)}</td>;
  if (type === 'int') return <td className="n">{String(v)}</td>;
  return <td title={String(v)}>{String(v)}</td>;
}

function Screen({ ctx, prefill }: { ctx: Ctx; prefill: { username: string; nonce: number } }) {
  const route = ctx.app.route;
  if (route === '/login') return <Login ctx={ctx} prefill={prefill} />;
  if (route.startsWith('/admin')) return <Credit ctx={ctx} owner="admin" />;
  if (route.startsWith('/client')) return <Credit ctx={ctx} owner="client" />;
  if (route.endsWith('/dashboard-technicien')) return <Dashboard ctx={ctx} />;
  if (route.endsWith('/my-tickets-technicien')) return <MyTickets ctx={ctx} />;
  if (route.endsWith('/group-tickets-technicien')) return <MyGroup ctx={ctx} />;
  return <TicketDetail ctx={ctx} id={Number(route.split('/').pop())} />;
}
