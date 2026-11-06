// The login page: credentials, and the face login, whose scan is only an animation (no camera is ever turned on).
import { useEffect, useRef, useState } from 'react';
import { DEMO_PASSWORD } from './logic';
import { Icon, Logo, Sv, type Ctx } from './shared';

type Tab = 'password' | 'face';
type Scan = 'idle' | 'running' | 'done';
const REDOUANE = 'https://github.com/redouaneboulhimez';
const SCAN_MS = 2600;

export default function Login({ ctx, prefill }: { ctx: Ctx; prefill: { email: string; nonce: number } }) {
  const { t } = ctx;
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan] = useState<Scan>('idle');
  const [progress, setProgress] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    if (!prefill.email) return;
    setEmail(prefill.email); setPassword(DEMO_PASSWORD); setError('');
  }, [prefill.nonce, prefill.email]);
  useEffect(() => () => { cancelAnimationFrame(timer.current); clearTimeout(timer.current); }, []);

  const answer = (path: string, body: object, done: () => void) => {
    const r = ctx.api<{ accessToken: string; message?: string }>('POST', path, body);
    if (r.status !== 200) { setError(r.body.message ?? 'Connexion impossible.'); setScan('idle'); setProgress(0); return; }
    done();
    ctx.signIn(r.body.accessToken);
  };
  const submit = () => {
    if (!email.trim() || !password) { setError('Renseignez votre email et votre mot de passe.'); return; }
    setError('');
    answer('/api/auth/login', { email: email.trim(), password }, () => ctx.step('login'));
  };
  const startScan = () => {
    if (!email.trim()) { setError('Renseignez l’email du compte.'); return; }
    setError(''); setScan('running'); setProgress(0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = reduce ? 100 : Math.min(100, Math.round((now - t0) / SCAN_MS * 100));
      setProgress(p);
      if (p < 100) { timer.current = requestAnimationFrame(tick); return; }
      setScan('done');
      timer.current = window.setTimeout(() => answer('/api/auth/login/face', { email: email.trim() }, () => { ctx.step('login'); ctx.step('face'); }), 450);
    };
    timer.current = requestAnimationFrame(tick);
  };
  const resetScan = () => { cancelAnimationFrame(timer.current); clearTimeout(timer.current); setScan('idle'); setProgress(0); setError(''); };
  const switchTab = (next: Tab) => { resetScan(); setTab(next); };

  return (
    <div className="lg">
      <svg className="lg-waves" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M0 560C200 480 360 640 620 560s380-170 580-90" /><path d="M0 620C220 540 380 700 640 620s360-170 560-90" /><path d="M0 680C240 600 400 760 660 680s340-170 540-90" />
        <path className="b" d="M0 180C220 260 400 100 640 170s360 120 560 50" /><path className="b" d="M0 120C240 200 420 40 660 110s340 120 540 50" />
      </svg>
      <form className="lg-card" onSubmit={ev => { ev.preventDefault(); if (tab === 'password') submit(); else if (scan === 'idle') startScan(); }}>
        <div className="lg-brand"><Logo size={38} /><span>e-Stage</span></div>
        <p className="lg-eye">Authentification</p>
        <h2>Accéder à votre espace</h2>
        <div className="lg-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'password'} onClick={() => switchTab('password')}>Identifiants</button>
          <button type="button" role="tab" aria-selected={tab === 'face'} onClick={() => switchTab('face')}>Reconnaissance faciale</button>
        </div>
        <label className="fl">
          <span>{tab === 'face' ? 'Email du compte' : 'Email'}</span>
          <input type="email" value={email} autoComplete="off" onChange={ev => setEmail(ev.target.value)} placeholder="prenom.nom@estage.demo" />
        </label>
        {tab === 'password' ? (
          <>
            <label className="fl">
              <span>Mot de passe</span>
              <div className="pw">
                <input type={show ? 'text' : 'password'} value={password} autoComplete="off" onChange={ev => setPassword(ev.target.value)} />
                <button type="button" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show} onClick={() => setShow(s => !s)}><Sv n="eye" /></button>
              </div>
            </label>
            <button type="button" className="lg-forgot" onClick={() => ctx.go('/mot-de-passe-oublie')}>Mot de passe oublié ?</button>
            {error && <p className="lg-err" role="alert">{error}</p>}
            <button className="cta">Accéder au dashboard<Sv n="arrow" /></button>
          </>
        ) : (
          <>
            <div className={`scan ${scan}`}>
              <i className="c1" /><i className="c2" /><i className="c3" /><i className="c4" />
              <div className="face">
                <svg viewBox="0 0 64 64" width="66" height="66" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M20 26c0-9 5-15 12-15s12 6 12 15c0 11-6 20-12 20S20 37 20 26z" /><path d="M27 27h.1M37 27h.1M28 37c2.500 2 5.500 2 8 0" /><path d="M12 56c2-7 8-10 14-11M52 56c-2-7-8-10-14-11" />
                </svg>
                {scan === 'running' && <b className="beam" />}
              </div>
            </div>
            <div className="scan-bar"><i style={{ width: `${progress}%` }} /></div>
            <p className="scan-state" aria-live="polite">
              {scan === 'idle' && 'Positionnez votre visage, puis lancez la connexion faciale.'}
              {scan === 'running' && `Vérification biométrique en cours : ${progress} %`}
              {scan === 'done' && 'Identité confirmée.'}
            </p>
            {error && <p className="lg-err" role="alert">{error}</p>}
            <button className="cta" disabled={scan !== 'idle'}>Se connecter avec le visage<Sv n="arrow" /></button>
            <button type="button" className="lg-reset" onClick={resetScan}>Réinitialiser la caméra</button>
            <div className="lg-credit">
              <p><b>{t.faceCredit}</b> {t.faceNote}</p>
              <a className="ghub" href={REDOUANE} target="_blank" rel="noopener"><Icon name="github" />Redouane Boulhimez</a>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
