import { useEffect, useReducer, useRef, useState } from 'react';
import { call, createEngine, fullName, readToken, rowsOf, TABLES, type Engine, type Method, type Node, type Seg, type Step, type TableRef } from './logic';
import Login from './Login';
import { Contact, Credit, Later, type Owner } from './Notices';
import { Icon, Logo, Sv, type App, type Ctx } from './shared';
import { strings } from './strings';
import Subjects from './Subjects';
import Team from './Team';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
const FRESH = 1700;
const STEPS: Step[] = ['login', 'face', 'join', 'role', 'github', 'skills'];
const LOGO: Record<Node, string> = { nginx: 'window', gateway: 'gateway', auth: 'springsecurity', face: 'user', internship: 'springboot', github: 'github', postgres: 'postgresql' };

/** The pages that are not rebuilt: a teammate's module (credit) or a part of Zakaria's own (contact). */
const CREDITS: Record<string, [Owner, string]> = {
  '/gamification': ['aya', 'Gamification'], '/dossier': ['aya', 'Mon dossier'],
  '/publications': ['redouane', 'Fil d’actualités'], '/boutique': ['redouane', 'Boutique'], '/messagerie': ['redouane', 'Messagerie']
};
const CONTACTS: Record<string, string> = {
  '/accueil': 'Accueil et profil', '/profil': 'Profil', '/stagiaire/aide': 'Aide visible', '/mot-de-passe-oublie': 'Mot de passe oublié'
};
const LATER: Record<string, string> = { '/stagiaire/missions': 'Missions', '/encadrant/teams': 'Espace encadrant' };
const ROUTES = ['/login', '/stagiaire/subjects', '/stagiaire/team', ...Object.keys(CREDITS), ...Object.keys(CONTACTS), ...Object.keys(LATER)];
const PUBLIC = ['/login', '/mot-de-passe-oublie'];
const newApp = (): App => ({ route: '/login', past: [], typed: null, token: null, me: null, dialog: null, toast: '', bell: false, menu: null });
const NOTIFICATIONS = ['Karim Benali a commenté votre livrable.', 'Une nouvelle mission a été affectée à votre équipe.', 'Votre équipe a gagné 15 points.'];
const Part = ({ s }: { s: Seg }) => typeof s === 'string' ? <>{s}</> : 'd' in s ? <s>{s.d}</s> : <em>{s.v}</em>;

/** The platform's Angular front in a browser window, with the journey of each request and the PostgreSQL tables beside it. */
export default function StageDemo({ lang }: Props) {
  const t = strings[lang];
  // the world holds clocks: it is built in the browser only, so the server's HTML never disagrees with it
  const [ready, setReady] = useState(false);
  const world = useRef<{ e: Engine; app: App } | null>(null);
  if (ready && !world.current) world.current = { e: createEngine(lang), app: newApp() };
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<'trace' | 'db'>('trace');
  const [picked, setPicked] = useState<number | null>(null);
  const [table, setTable] = useState<TableRef>({ db: 'internship_db', table: 'team_memberships' });
  const [followW, setFollowW] = useState(true);
  const [full, setFull] = useState(false);
  const [prefill, setPrefill] = useState({ email: '', nonce: 0 });
  const [page, setPage] = useState(0); // a new value remounts the page, which reloads its data like ngOnInit
  const [layerEl, setLayerEl] = useState<HTMLDivElement | null>(null);
  const view = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      const app = world.current?.app;
      if (app?.dialog || app?.bell || app?.menu) { app.dialog = null; app.bell = false; app.menu = null; refresh(); } else setFull(false);
    };
    addEventListener('keydown', onKey);
    return () => { removeEventListener('keydown', onKey); document.body.classList.remove('demo-locked'); };
  }, [full]);

  if (!world.current) return <div className="stg"><div className="wide"><div className="window waiting" /></div></div>;
  const { e, app } = world.current;

  const api = <T,>(method: Method, url: string, body?: unknown) => {
    const before = e.lastTable;
    const res = call<T>(e, app.me?.first ?? (lang === 'fr' ? 'anonyme' : 'anonymous'), method, url, app.token, body);
    // pages load their data while they render: the panel beside them updates just after
    const written = e.lastTable !== before ? e.lastTable : null;
    queueMicrotask(() => { if (written && followW) setTable(written); setPicked(null); refresh(); });
    setTimeout(refresh, FRESH + 50);
    return res;
  };
  /** The router and its guards. */
  const go = (path: string, push = true) => {
    let route = path.trim().replace(/^(https?:\/\/)?localhost:4200/, '').replace(/\/+$/, '') || '/';
    if (!route.startsWith('/')) route = `/${route}`;
    if (route === '/') route = app.me ? '/accueil' : '/login';
    if (!ROUTES.includes(route)) route = app.me ? home() : '/login';
    if (!app.me && !PUBLIC.includes(route)) route = '/login';
    if (app.me && route === '/login') route = home();
    if (app.me?.role === 'ENCADRANT' && route.startsWith('/stagiaire')) route = '/encadrant/teams';
    if (app.me?.role === 'STAGIAIRE' && route.startsWith('/encadrant')) route = home();
    if (push && route !== app.route) app.past.push(app.route);
    app.route = route; app.typed = null; app.bell = false; app.menu = null;
    setPage(n => n + 1);
    if (view.current) view.current.scrollTop = 0;
    refresh();
  };
  const home = () => {
    if (app.me?.role === 'ENCADRANT') return '/encadrant/teams';
    return e.db.internship_db.team_memberships.some(m => m.stagiaire_id === app.me?.id) ? '/stagiaire/team' : '/stagiaire/subjects';
  };
  const signIn = (token: string) => {
    const claims = readToken(token)!;
    const a = e.db.authdb.accounts.find(x => x.id === claims.userId)!;
    app.token = token;
    app.me = { id: a.id, name: fullName(a), first: a.first_name, initial: a.last_name[0], email: a.email, initials: `${a.first_name[0]}${a.last_name[0]}`, role: a.role };
    app.past = [];
    go(home(), false);
  };
  const logout = () => {
    api('POST', '/api/auth/logout');
    app.token = null; app.me = null; app.past = [];
    go('/login', false);
  };
  const ctx: Ctx = {
    e, app, t, lang, go, api, refresh, signIn, layer: layerEl,
    back: () => { const p = app.past.pop(); if (p) go(p, false); },
    step: s => { e.steps.add(s); refresh(); },
    toast: text => { app.toast = text; clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => { app.toast = ''; refresh(); }, 4200); refresh(); }
  };
  const reset = () => {
    world.current = { e: createEngine(lang), app: newApp() };
    setPrefill({ email: '', nonce: 0 }); setPicked(null); setPage(n => n + 1); setTab('trace');
  };
  const fill = (email: string) => {
    if (app.me) { app.token = null; app.me = null; app.past = []; go('/login', false); }
    setPrefill(p => ({ email, nonce: p.nonce + 1 }));
  };

  const now = e.now();
  const trace = e.traces.find(x => x.id === picked) ?? e.traces[0];
  const meta = TABLES.find(x => x.db === table.db && x.table === table.table)!;
  const rows = rowsOf(e, table);
  const gone = e.gone.filter(g => g.ref.db === table.db && g.ref.table === table.table && now - g.t < FRESH);
  const signedOut = !app.me;

  return (
    <div className="stg">
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
              <button className="btn small ghost" onClick={() => fill('sara.alaoui@estage.demo')}>Sara</button>
              <button className="btn small ghost" onClick={() => fill('yassine.idrissi@estage.demo')}>Yassine</button>
            </span>
            <button className="btn small ghost" onClick={reset}><Icon name="arrow" />{t.reset}</button>
          </div>
          <div className="stage">
            <section className="browser" aria-label="e-Stage">
              <div className="bbar">
                <button className="nav" aria-label={t.back} disabled={!app.past.length} onClick={ctx.back}>&#8592;</button>
                <button className="nav" aria-label={t.reload} onClick={() => go(app.route, false)}>&#8635;</button>
                <form className="url" onSubmit={ev => { ev.preventDefault(); go(app.typed ?? app.route); }}>
                  <span className="lock" />
                  <input value={app.typed ?? `localhost:4200${app.route}`} onChange={ev => { app.typed = ev.target.value; refresh(); }} onFocus={ev => ev.target.select()} aria-label="URL" spellCheck={false} />
                </form>
              </div>
              <div className="viewport">
                <div className="view" ref={view}>
                  {!signedOut && <Navbar ctx={ctx} logout={logout} />}
                  <Screen key={`${app.route}#${page}`} ctx={ctx} prefill={prefill} />
                </div>
                <div className="layer" ref={setLayerEl}>
                  {app.toast && <div className="toast" role="status">{app.toast}</div>}
                  {app.dialog && (
                    <div className="wz-back" role="dialog" aria-modal="true" aria-label={app.dialog.title}>
                      <div className="confirm">
                        <h3>{app.dialog.title}</h3>
                        <p>{app.dialog.text}</p>
                        <footer>
                          <button className="sec" autoFocus onClick={() => { app.dialog = null; refresh(); }}>Annuler</button>
                          <button className="danger" onClick={() => { const d = app.dialog!; app.dialog = null; d.run(); refresh(); }}>{app.dialog.ok}</button>
                        </footer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

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
                        <button key={x.table} className={x.table === table.table ? 'on' : ''} onClick={() => { setTable({ db: x.db, table: x.table }); setFollowW(false); }}>
                          {x.table}<small>{rowsOf(e, x).length}</small>
                        </button>
                      ))}
                    </div>
                    <label><input type="checkbox" checked={followW} onChange={ev => setFollowW(ev.target.checked)} /> {t.follow}</label>
                  </div>
                  <div className="dbgrid">
                    <table>
                      <thead><tr>{meta.cols.map(([c, type]) => <th key={c}>{c}<small>{type}</small></th>)}</tr></thead>
                      <tbody>
                        {gone.map((g, i) => <tr key={`g${i}`} className="gone">{meta.cols.map(([c, type]) => <Cell key={c} v={g.row[c]} type={type} />)}</tr>)}
                        {rows.map(r => (
                          <tr key={String(r.id)} className={now - (e.changed.get(`${table.db}.${table.table}#${r.id}`) ?? 0) < FRESH ? 'new' : ''}>
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

function Screen({ ctx, prefill }: { ctx: Ctx; prefill: { email: string; nonce: number } }) {
  const route = ctx.app.route;
  if (route === '/login') return <Login ctx={ctx} prefill={prefill} />;
  if (route === '/stagiaire/subjects') return <Subjects ctx={ctx} />;
  if (route === '/stagiaire/team') return <Team ctx={ctx} />;
  if (CREDITS[route]) return <div className="page"><Credit ctx={ctx} owner={CREDITS[route][0]} module={CREDITS[route][1]} /></div>;
  if (LATER[route]) return <div className="page"><Later ctx={ctx} module={LATER[route]} /></div>;
  if (route === '/mot-de-passe-oublie') return <div className="page outside"><Contact ctx={ctx} module={CONTACTS[route]} /></div>;
  return <div className="page"><Contact ctx={ctx} module={CONTACTS[route]} /></div>;
}

function Navbar({ ctx, logout }: { ctx: Ctx; logout: () => void }) {
  const { app, go } = ctx;
  const me = app.me!;
  const link = (route: string, label: string) => <button className={app.route === route ? 'on' : ''} onClick={() => go(route)}>{label}</button>;
  const inInternship = ['/stagiaire/subjects', '/stagiaire/team', '/stagiaire/aide'].includes(app.route);
  return (
    <header className="nav-bar">
      <button className="brand" onClick={() => go('/accueil')} aria-label="Accueil"><Logo /><span>e-Stage</span></button>
      <nav>
        {me.role === 'STAGIAIRE' ? (
          <>
            {link('/accueil', 'Accueil')}
            <div className="drop">
              <button className={inInternship ? 'on' : ''} aria-expanded={app.menu === 'internship'} onClick={() => { app.menu = app.menu === 'internship' ? null : 'internship'; app.bell = false; ctx.refresh(); }}>Internship<Sv n="down" size={13} /></button>
              {app.menu === 'internship' && (
                <div className="drop-menu">
                  <button onClick={() => go('/stagiaire/subjects')}>Sujets</button>
                  <button onClick={() => go('/stagiaire/team')}>Mon équipe</button>
                  <button onClick={() => go('/stagiaire/missions')}>Missions</button>
                  <button onClick={() => go('/stagiaire/aide')}>Aide visible</button>
                </div>
              )}
            </div>
            {link('/gamification', 'Gamification')}
            {link('/stagiaire/missions', 'Missions')}
            {link('/publications', 'Fil d’actualités')}
            {link('/boutique', 'Boutique')}
            {link('/messagerie', 'Messagerie')}
            {link('/dossier', 'Dossier')}
          </>
        ) : link('/encadrant/teams', 'Équipes')}
      </nav>
      <div className="nav-end">
        <div className="drop">
          <button className="bell" aria-label="Notifications" aria-expanded={app.bell} onClick={() => { app.bell = !app.bell; app.menu = null; ctx.refresh(); }}><Sv n="bell" /><i>{NOTIFICATIONS.length}</i></button>
          {app.bell && <ul className="drop-menu right bell-list">{NOTIFICATIONS.map(n => <li key={n}>{n}</li>)}</ul>}
        </div>
        <button className="whoami" onClick={() => go('/profil')} aria-label="Profil"><span className="whoami-txt"><b>{me.first} {me.initial}.</b><small>{me.role === 'STAGIAIRE' ? 'Stagiaire' : 'Encadrant'}</small></span><span className="ava small">{me.initials}</span></button>
        <button className="out" onClick={logout} aria-label="Déconnexion"><Sv n="logout" size={15} /><span>Déconnexion</span></button>
      </div>
    </header>
  );
}
