import { useEffect, useReducer, useRef, useState } from 'react';
import { aggregate, BATCH_MS, AGGREGATION_MS, callApi, createEngine, curlOf, DEMO_TOKEN, mailBody, mailSubject, OPERATIONS, runBatch, userHourTotal, type Engine } from './logic';
import { strings, type DemoStrings } from './strings';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
type View = 'api' | 'kafka' | 'mail' | 'grafana';
const URLS: Record<View, string> = {
  api: 'localhost:9000/swagger-ui.html',
  kafka: 'localhost:8070/ui/clusters/local/all-topics',
  mail: 'localhost:8025',
  grafana: 'localhost:3000/d/het-overview/home-energy-tracker-overview'
};
const STAGE_KEYS = ['sim', 'ing', 'ku', 'infl', 'agg', 'ka', 'mail'] as const;
const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;

/** Home Energy Tracker's tools (API through the gateway, Kafka UI, Mailpit, Grafana) on a pipeline replayed in the browser. */
export default function HetDemo({ lang }: Props) {
  const t = strings[lang];
  const engine = useRef<Engine>(createEngine(lang));
  const metrics = useRef(createMetrics());
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [view, setView] = useState<View>('api');
  const [full, setFull] = useState(false);
  const [hot, setHot] = useState<Set<string>>(new Set());
  const e = engine.current;

  const flash = (keys: string[]) => {
    keys.forEach((k, i) => setTimeout(() => {
      setHot(h => new Set(h).add(k));
      setTimeout(() => setHot(h => { const n = new Set(h); n.delete(k); return n; }), 600);
    }, i * 180));
  };

  // the simulator: a run every 5 s while it is on
  useEffect(() => {
    if (!e.running) return;
    const tick = () => { runBatch(e); flash(['sim', 'ing', 'ku', 'infl']); refresh(); };
    tick();
    const id = setInterval(tick, BATCH_MS);
    return () => clearInterval(id);
  }, [e.running]);

  // usage-service's aggregation every 10 s, and Grafana's samples every 2 s
  useEffect(() => {
    const agg = setInterval(() => {
      const r = aggregate(e);
      if (r) { flash(r.outcome === 'alert' ? ['agg', 'ka', 'mail'] : ['agg']); refresh(); }
    }, AGGREGATION_MS);
    const sample = setInterval(() => { sampleMetrics(metrics.current, e); refresh(); }, 2000);
    return () => { clearInterval(agg); clearInterval(sample); };
  }, []);

  // full screen: the demo in front of everything, Esc brings it back
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setFull(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  const unread = e.mails.filter(m => !m.read).length;
  const fmt = (n: number, d = 1) => n.toLocaleString(t.number, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="het">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <div className="btabs" role="tablist">
              {([['api', 'swagger', 'API · gateway :9000'], ['kafka', 'kafka', 'Kafka UI · :8070'], ['mail', 'mail', 'Mailpit · :8025'], ['grafana', 'grafana', 'Grafana · :3000']] as const).map(([v, logo, label]) => (
                <button key={v} className="btab" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                  <i style={{ ['--logo' as string]: `url(/logos/${logo}.svg)` }} />{label}
                  {v === 'mail' && unread > 0 && <span className="n">{unread}</span>}
                </button>
              ))}
            </div>
            <button className="btn small ghost full-btn" aria-pressed={full} onClick={() => setFull(f => !f)}><Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}</button>
          </div>

          <div className="ctrl">
            <span className="lab">{t.scenario}</span>
            <button className="btn small" onClick={() => { e.running = !e.running; refresh(); }}><Icon name={e.running ? 'check' : 'play'} />{e.running ? t.stop : t.start}</button>
            <label>{t.threshold}
              <input type="range" min={20} max={600} step={10} value={Math.min(600, Math.max(20, e.user.energyAlertingThreshold))}
                onChange={ev => { e.user = { ...e.user, energyAlertingThreshold: +ev.target.value }; refresh(); }} />
              <output>{e.user.energyAlertingThreshold} kWh</output>
            </label>
            <label><input type="checkbox" checked={e.user.alerting} onChange={ev => { e.user = { ...e.user, alerting: ev.target.checked }; refresh(); }} /> {t.alerting}</label>
            <span className="stat"><span>{t.sent} <b>{e.counts.sim.toLocaleString(t.number)}</b></span><span>{t.userHour} <b>{fmt(userHourTotal(e))} kWh</b></span></span>
          </div>

          <div className="urlbar"><span>{URLS[view]}</span></div>
          <div className="app" lang="en">
            {view === 'api' && <ApiView e={e} t={t} onChange={refresh} onIngest={() => flash(['ing', 'ku', 'infl'])} />}
            {view === 'kafka' && <KafkaView e={e} />}
            {view === 'mail' && <MailView e={e} onChange={refresh} />}
            {view === 'grafana' && <GrafanaView m={metrics.current} e={e} />}
          </div>
        </div>
      </div>

      <section className="hood" aria-live="polite">
        <h2>{t.hoodTitle}</h2>
        <p>{t.hoodLead}</p>
        <div className="pipe">
          {STAGE_KEYS.map((k, i) => (
            <div key={k} className={`stage${hot.has(k) ? ' hot' : ''}${k === 'ka' && e.last?.outcome === 'alert' ? ' alarm' : ''}`}>
              <h3>{t.stages[i][0]}</h3><b>{e.counts[k].toLocaleString(t.number)}</b><p>{t.stages[i][1]}</p>
            </div>
          ))}
        </div>
        <p className="agg">{e.last ? t.aggregation(e.last.n, fmt(e.last.total, 2), e.last.threshold) + t.outcomes[e.last.outcome] : t.idle}</p>
      </section>
    </div>
  );
}

// ======================== 1. API through the gateway, in the Swagger UI look ========================
const LOCKED = 'M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8zM12 8H8V5.199C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8z';
const OPEN = 'M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V6h2v-.801C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8z';
const Lock = ({ closed }: { closed: boolean }) => <svg className="lk" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d={closed ? LOCKED : OPEN} /></svg>;

type Result = { curl: string; url: string; status: number; body: string; headers: string } | 'loading';

function ApiView({ e, t, onChange, onIngest }: { e: Engine; t: DemoStrings; onChange: () => void; onIngest: () => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [trying, setTrying] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Record<number, Result>>({});
  const [inputs, setInputs] = useState<Record<number, { params: Record<string, string>; body?: string }>>({});
  const [modal, setModal] = useState(false);
  const [token, setToken] = useState('');
  const toggle = (set: Set<number>, i: number, apply: (s: Set<number>) => void) => { const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); apply(n); };

  const inputOf = (i: number) => inputs[i] ?? {
    params: Object.fromEntries(Object.entries(OPERATIONS[i].params ?? {}).map(([k, v]) => [k, String(v)])),
    body: OPERATIONS[i].body?.(e)
  };
  const execute = (i: number) => {
    const { params, body } = inputOf(i);
    const path = OPERATIONS[i].path.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? '');
    const res = callApi(e, i, params, body);
    const done = () => {
      setResults(r => ({ ...r, [i]: { curl: curlOf(e, i, path, body), url: `http://localhost:9000${path}`, status: res.status, body: res.body, headers: res.headers } }));
      if (i === 5 && res.status === 201) onIngest();
      onChange();
    };
    if (res.delayMs) { setResults(r => ({ ...r, [i]: 'loading' })); setTimeout(done, res.delayMs); } else done();
  };

  const tags = [...new Set(OPERATIONS.map(o => o.tag))];
  return (
    <div className="sw">
      <div className="sw-top"><span className="logo"><i />Swagger</span><span className="def">Select a definition <select><option>Home Energy Tracker (via api-gateway)</option></select></span></div>
      <div className="sw-body">
        <div className="sw-info"><h2>Home Energy Tracker API <small>1.0.0</small></h2><p lang={t === strings.fr ? 'fr' : 'en'}>{t.apiNote}</p></div>
        <div className="sw-scheme">
          <div className="srv">Servers<span>http://localhost:9000</span></div>
          <button className="sw-btn" onClick={() => { setToken(e.token ?? ''); setModal(true); }}>Authorize<Lock closed={!!e.token} /></button>
        </div>
        {tags.map(tag => (
          <div key={tag} className="sw-tag">
            <h3>{tag} <small>{t.tags[tag]}</small></h3>
            {OPERATIONS.map((o, i) => o.tag !== tag ? null : (
              <div key={i} className={`op ${o.method}${open.has(i) ? ' open' : ''}`}>
                <button className="head" aria-expanded={open.has(i)} onClick={() => toggle(open, i, setOpen)}>
                  <span className="m">{o.method.toUpperCase()}</span><span className="p">{o.path}</span><span className="d">{t.summaries[i]}</span><Lock closed={!!e.token} />
                </button>
                {open.has(i) && (
                  <div className="op-body">
                    <div className="op-sec">{o.body ? 'Request body' : 'Parameters'}
                      <button className={`try${trying.has(i) ? ' cancel' : ''}`} onClick={() => toggle(trying, i, setTrying)}>{trying.has(i) ? 'Cancel' : 'Try it out'}</button>
                    </div>
                    <div className="op-fields">
                      {Object.entries(inputOf(i).params).map(([k, v]) => (
                        <label key={k}><span>{k} <small>integer (path)</small></span>
                          <input value={v} disabled={!trying.has(i)} onChange={ev => setInputs(s => ({ ...s, [i]: { ...inputOf(i), params: { ...inputOf(i).params, [k]: ev.target.value } } }))} /></label>
                      ))}
                      {o.body && (
                        <label><span>body <small>application/json</small></span>
                          <textarea value={inputOf(i).body} disabled={!trying.has(i)} onChange={ev => setInputs(s => ({ ...s, [i]: { ...inputOf(i), body: ev.target.value } }))} /></label>
                      )}
                    </div>
                    {trying.has(i) && <button className="exec" onClick={() => execute(i)}>Execute</button>}
                    <ResultBlock r={results[i]} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {modal && (
        <div className="sw-modal" role="dialog" aria-modal="true" aria-label="Available authorizations">
          <div className="box">
            <header>Available authorizations<button onClick={() => setModal(false)} aria-label="Close">×</button></header>
            <div className="inner">
              <h4>bearerAuth (http, Bearer)</h4>
              <p lang={t === strings.fr ? 'fr' : 'en'}>{t.tokenHelp}</p>
              <input value={token} placeholder="Value" onChange={ev => setToken(ev.target.value)} />
              <div className="row">
                <button className="sw-btn kc" onClick={() => setToken(DEMO_TOKEN)}>{t.getToken}</button>
                <button className="sw-btn" onClick={() => { e.token = token.trim() || null; setModal(false); onChange(); }}>Authorize</button>
                <button className="sw-btn kc" onClick={() => { e.token = null; setToken(''); onChange(); }}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ r }: { r?: Result }) {
  if (!r) return null;
  if (r === 'loading') return <p className="loading">Waiting for insight-service (Ollama)…</p>;
  return (
    <div className="op-res">
      <h4>Curl</h4><pre>{r.curl}</pre>
      <h4>Request URL</h4><pre>{r.url}</pre>
      <h4>Server response</h4>
      <div className="code"><b className={r.status >= 400 ? 'err' : ''}>{r.status}</b><span>{r.status === 401 ? 'Error: Unauthorized' : ''}</span></div>
      {r.body !== '' && <><h4>Response body</h4><pre>{r.body}</pre></>}
      <h4>Response headers</h4><pre>{r.headers}</pre>
    </div>
  );
}

// ======================== 2. Kafka UI ========================
function KafkaView({ e }: { e: Engine }) {
  const [page, setPage] = useState<'topics' | 'consumers'>('topics');
  const [topic, setTopic] = useState<string | null>(null);
  const now = Date.now();
  return (
    <div className="kui">
      <nav>
        <div className="brand"><i />UI for Apache Kafka</div><div className="cl">local</div>
        <button className={page === 'topics' ? 'on' : ''} onClick={() => { setPage('topics'); setTopic(null); }}>Topics</button>
        <button className={page === 'consumers' ? 'on' : ''} onClick={() => setPage('consumers')}>Consumers</button>
      </nav>
      <main>
        {page === 'consumers' ? (
          <><h2>Consumers</h2>
            <table><thead><tr><th>Group ID</th><th>Num of members</th><th>Topics</th><th>Consumer lag</th><th>State</th></tr></thead><tbody>
              <tr><td className="link">usage-service</td><td>1</td><td>energy-usage</td><td><span className="lag">{e.running ? 12 : 0}</span></td><td>STABLE</td></tr>
              <tr><td className="link">alert-service</td><td>1</td><td>energy-alerts</td><td><span className="lag">0</span></td><td>STABLE</td></tr>
            </tbody></table></>
        ) : !topic ? (
          <><h2>Topics</h2>
            <table><thead><tr><th>Topic name</th><th>Partitions</th><th>Out of sync replicas</th><th>Replication factor</th><th>Number of messages</th><th>Size</th></tr></thead><tbody>
              {([['energy-usage', e.counts.ku], ['energy-alerts', e.counts.ka]] as const).map(([name, count]) => (
                <tr key={name}><td className="link"><button onClick={() => setTopic(name)}>{name}</button></td><td>1</td><td>0</td><td>1</td><td>{count.toLocaleString('en-GB')}</td><td>{(count * 0.11 / 1024).toFixed(2)} MB</td></tr>
              ))}
            </tbody></table></>
        ) : (
          <><h2><button className="bc" onClick={() => setTopic(null)}>Topics</button> › {topic}</h2>
            <div className="tabsk"><span>Overview</span><span className="on">Messages</span><span>Consumers</span><span>Settings</span></div>
            <table><thead><tr><th>Offset</th><th>Partition</th><th>Timestamp</th><th>Key</th><th>Value</th></tr></thead><tbody>
              {(topic === 'energy-usage' ? e.usageMessages : e.alertMessages).slice(-30).reverse().map(m => (
                <tr key={m.offset} className={now - m.t < 1500 ? 'new' : ''}><td>{m.offset}</td><td>0</td><td>{new Date(m.t).toLocaleTimeString('en-GB')}</td><td>null</td><td><code>{JSON.stringify(m.value)}</code></td></tr>
              ))}
              {!(topic === 'energy-usage' ? e.usageMessages : e.alertMessages).length && <tr><td colSpan={5}>No messages found</td></tr>}
            </tbody></table></>
        )}
      </main>
    </div>
  );
}

// ======================== 3. Mailpit ========================
function MailView({ e, onChange }: { e: Engine; onChange: () => void }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const mail = e.mails.find(m => m.id === openId);
  return (
    <div className="mp">
      <div className="mp-top"><b>Mailpit</b><input placeholder="Search mailbox" disabled /></div>
      <div className="mp-main">
        <div className="mp-side"><span>Inbox <span className="c">{e.mails.length}</span></span></div>
        <div className="mp-list">
          {mail ? (
            <div className="mp-msg">
              <button className="back" onClick={() => setOpenId(null)}>‹ Back</button>
              <table><tbody><tr><th>From</th><td>noreply@zakariadev.com</td></tr><tr><th>To</th><td>{mail.event.email}</td></tr><tr><th>Date</th><td>{new Date(mail.t).toLocaleString('en-GB')}</td></tr></tbody></table>
              <h3>{mailSubject(mail.event)}</h3>
              <pre>{mailBody(mail.event)}</pre>
            </div>
          ) : e.mails.length ? e.mails.map(m => (
            <button key={m.id} className={`mp-item${m.read ? '' : ' unread'}`} onClick={() => { m.read = true; setOpenId(m.id); onChange(); }}>
              <span className="from">noreply@zakariadev.com</span><span>{mailSubject(m.event)}</span><span className="when">{new Date(m.t).toLocaleTimeString('en-GB')}</span>
            </button>
          )) : <p className="mp-empty">No messages in your mailbox</p>}
        </div>
      </div>
    </div>
  );
}

// ======================== 4. Grafana ========================
const COLORS = ['#73bf69', '#f2cc0c', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#8ab8ff'];
const APPS = ['api-gateway', 'user-service', 'device-service', 'ingestion-service', 'usage-service', 'alert-service', 'insight-service'];
const STATUSES = ['200', '201', '204', '401', '404'];
const POINTS = 60;
type Metrics = { rate: Record<string, number[]>; heap: Record<string, number[]>; status: Record<string, number[]> };

function createMetrics(): Metrics {
  const m: Metrics = { rate: {}, heap: {}, status: {} };
  APPS.forEach((a, i) => { m.rate[a] = Array(POINTS).fill(0); m.heap[a] = Array.from({ length: POINTS }, () => 140 + i * 18 + Math.random() * 10); });
  STATUSES.forEach(s => { m.status[s] = Array(POINTS).fill(0); });
  return m;
}

/** One Prometheus scrape: request rates over the last 10 s, a heap that grows and drops at each garbage collection. */
function sampleMetrics(m: Metrics, e: Engine) {
  const now = Date.now(), win = e.http.filter(h => now - h.t < 10000);
  e.http = e.http.filter(h => now - h.t < 60000);
  const push = (list: number[], v: number) => { list.push(v); if (list.length > POINTS) list.shift(); };
  APPS.forEach((a, i) => {
    let r = win.filter(h => h.app === a).length / 10;
    if (a === 'ingestion-service' && e.running) r = 200 + Math.random() * 6;
    if (a === 'api-gateway') r += 0.2 + Math.random() * 0.1;
    if (a === 'usage-service' && e.running) r += 0.4;
    push(m.rate[a], r);
    let v = m.heap[a].at(-1)! + (Math.random() - 0.45) * 6 + (a === 'usage-service' && e.running ? 2 : 0);
    if (v > 260 + i * 18) v = 150 + i * 18;
    push(m.heap[a], v);
  });
  const byStatus: Record<string, number> = {};
  win.forEach(h => { byStatus[h.status] = (byStatus[h.status] ?? 0) + 1; });
  if (e.running) byStatus['201'] = (byStatus['201'] ?? 0) + 2000;
  STATUSES.forEach(s => push(m.status[s], (byStatus[s] ?? 0) / 10));
}

type Line = { name: string; color: string; data: number[] };
function Chart({ lines, unit, max }: { lines: Line[]; unit: (v: number) => string; max?: number }) {
  const W = 600, H = 150;
  const top = max ?? Math.max(1, ...lines.flatMap(l => l.data)) * 1.15;
  const y = (v: number) => H - 16 - (v / top) * (H - 26);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {[0, 0.5, 1].map(f => <g key={f}><line x1="40" x2={W} y1={y(top * f)} y2={y(top * f)} stroke="#22252b" /><text x="0" y={y(top * f) + 3}>{unit(top * f)}</text></g>)}
      {lines.map(l => <polyline key={l.name} fill="none" stroke={l.color} strokeWidth="1.6" points={l.data.map((v, i) => `${40 + (i * (W - 44)) / (POINTS - 1)},${y(v).toFixed(1)}`).join(' ')} />)}
    </svg>
  );
}
const Legend = ({ lines }: { lines: Line[] }) => <div className="gf-legend">{lines.map(l => <span key={l.name}><i style={{ background: l.color }} />{l.name}</span>)}</div>;

function GrafanaView({ m, e }: { m: Metrics; e: Engine }) {
  const rate = APPS.map((a, i) => ({ name: a, color: COLORS[i], data: m.rate[a] }));
  const heap = APPS.map((a, i) => ({ name: a, color: COLORS[i], data: m.heap[a] }));
  const up = APPS.map((a, i) => ({ name: a, color: COLORS[i], data: Array(POINTS).fill(1) }));
  const status = STATUSES.map((s, i) => ({ name: s, color: COLORS[i], data: m.status[s] }));
  const rps = (v: number) => (v >= 10 ? `${Math.round(v)} req/s` : `${v.toFixed(1)} req/s`);
  const now = Date.now();
  const grouped = new Map<string, { app: string; uri: string; method: string; status: number; n: number }>();
  e.http.filter(h => now - h.t < 10000).forEach(h => {
    const k = `${h.app} ${h.method} ${h.uri} ${h.status}`;
    grouped.set(k, { ...h, n: (grouped.get(k)?.n ?? 0) + 1 });
  });
  const top = [...grouped.values()].map(r => ({ ...r, rate: r.app === 'ingestion-service' && e.running ? 200 : r.n / 10 })).sort((a, b) => b.rate - a.rate).slice(0, 5);
  const errors4xx = (m.status['401'].at(-1) ?? 0) + (m.status['404'].at(-1) ?? 0);
  return (
    <div className="gf">
      <div className="gf-top"><span className="crumb">Dashboards ›</span><h2>Home Energy Tracker - Overview</h2><span className="pick"><span>Last 15 minutes</span><span>Refresh 10s</span></span></div>
      <div className="gf-grid">
        <div className="gf-panel" style={{ gridColumn: 'span 12', height: 230 }}><h4>HTTP request rate (by application tag)</h4><Chart lines={rate} unit={rps} /><Legend lines={rate} /></div>
        <div className="gf-panel" style={{ gridColumn: 'span 12', height: 230 }}><h4>JVM heap used (by application tag)</h4><Chart lines={heap} unit={v => `${Math.round(v)} MiB`} /><Legend lines={heap} /></div>
        <div className="gf-panel" style={{ gridColumn: 'span 24', height: 180 }}><h4>Scrape target up (1 = reachable)</h4><Chart lines={up} unit={v => v.toFixed(1)} max={1.3} /><Legend lines={up} /></div>
        <div className="gf-panel" style={{ gridColumn: 'span 12', height: 220 }}><h4>HTTP request rate by status code (all services)</h4><Chart lines={status} unit={rps} /><Legend lines={status} /></div>
        <div className="gf-panel" style={{ gridColumn: 'span 4', height: 220 }}><h4>Client error rate (4xx)</h4><div className={`gf-stat${errors4xx > 0 ? ' bad' : ''}`}>{errors4xx.toFixed(2)}</div></div>
        <div className="gf-panel" style={{ gridColumn: 'span 4', height: 220 }}><h4>Server error rate (5xx)</h4><div className="gf-stat">0</div></div>
        <div className="gf-panel" style={{ gridColumn: 'span 4', height: 220 }}><h4>Top endpoints by request rate</h4>
          <table className="gf-table"><thead><tr><th>application</th><th>uri</th><th>status</th><th>req/s</th></tr></thead><tbody>
            {top.length ? top.map(r => <tr key={`${r.app}${r.uri}${r.status}`}><td>{r.app}</td><td>{r.method} {r.uri}</td><td>{r.status}</td><td>{r.rate.toFixed(1)}</td></tr>) : <tr><td colSpan={4}>No data</td></tr>}
          </tbody></table></div>
      </div>
    </div>
  );
}
