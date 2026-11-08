// The login page, drawn from login.html and login.css. The role in the answer decides where Angular goes next.
import { useEffect, useState } from 'react';
import { DEMO_PASSWORD, type LoginDto } from './logic';
import { Sv, type Ctx } from './shared';

export default function Login({ ctx, prefill }: { ctx: Ctx; prefill: { username: string; nonce: number } }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!prefill.username) return;
    setUsername(prefill.username); setPassword(DEMO_PASSWORD); setError('');
  }, [prefill.nonce, prefill.username]);

  const submit = () => {
    const r = ctx.api<LoginDto>('POST', '/api/auth/login', { username: username.trim(), password });
    if (r.status !== 200) { setError('Invalid username or password'); return; }
    ctx.step('login');
    ctx.signIn(r.body.token, r.body.username, r.body.role);
  };

  return (
    <div className="l-page">
      <div className="l-screen">
        <div className="l-content">
          <form className="l-form" onSubmit={ev => { ev.preventDefault(); submit(); }}>
            <label className="l-field">
              <Sv n="user" size={14} />
              <input value={username} required autoComplete="off" aria-label="User name" placeholder="User name / Email" onChange={ev => setUsername(ev.target.value)} />
            </label>
            <label className="l-field">
              <Sv n="lock" size={14} />
              <input type="password" value={password} required autoComplete="off" aria-label="Password" placeholder="Password" onChange={ev => setPassword(ev.target.value)} />
            </label>
            <button className="l-submit"><span>Log In Now</span><Sv n="chevron" size={20} /></button>
            {error && <p className="l-error" role="alert">{error}</p>}
          </form>
          <div className="l-social" aria-hidden="true">
            <h3>log in via</h3>
            <div><Sv n="instagram" /><Sv n="facebook" /><Sv n="twitter" /></div>
          </div>
        </div>
        <div className="l-bg" aria-hidden="true"><span className="s4" /><span className="s3" /><span className="s2" /><span className="s1" /></div>
      </div>
    </div>
  );
}
