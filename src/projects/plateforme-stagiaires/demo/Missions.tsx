// "Mes missions": the team's missions with filters, a preview, and the AI work plan.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { MissionCardDto, WorkPlanDto } from './logic';
import { dateFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

const DAY = 24 * 3600_000;
type DateFilter = 'ALL' | 'WEEK' | 'MONTH' | 'LATE';

export default function Missions({ ctx }: { ctx: Ctx }) {
  const [list] = useState(() => ctx.api<MissionCardDto[]>('GET', '/api/stagiaire/missions').body);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [when, setWhen] = useState<DateFilter>('ALL');
  const [picked, setPicked] = useState<number | null>(list.find(m => m.status === 'EN_COURS')?.id ?? list[0]?.id ?? null);
  const [plan, setPlan] = useState<WorkPlanDto | null | 'busy'>(null);
  const now = ctx.e.now();

  const term = q.trim().toLowerCase();
  const shown = list.filter(m => {
    const left = (Date.parse(m.dueDate) - now) / DAY;
    return (!term || `${m.title} ${m.description}`.toLowerCase().includes(term))
      && (status === 'ALL' || m.status === status)
      && (when === 'ALL' || (when === 'WEEK' && left >= 0 && left <= 7) || (when === 'MONTH' && left >= 0 && left <= 31) || (when === 'LATE' && left < 0 && m.status !== 'VALIDEE'));
  });
  const current = list.find(m => m.id === picked) ?? null;
  const avg = list.length ? Math.round(list.reduce((n, m) => n + m.myEngagement, 0) / list.length) : 0;
  const askPlan = () => {
    setPlan('busy');
    window.setTimeout(() => {
      const r = ctx.api<WorkPlanDto>('POST', '/api/ai/stagiaire/missions/work-plan', { question: 'Organise mes missions.' });
      setPlan(r.body); ctx.step('plan');
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1300);
  };

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="pill"><Sv n="spark" size={13} />Espace stagiaire</span>
          <h1>Mes missions<em>assignées</em></h1>
          <p>Consulte les missions de ton équipe, suis ton niveau d’engagement et compare-le avec l’avancement global de ton équipe.</p>
          <button className="prim plan-btn" onClick={askPlan} disabled={!list.length}><Sv n="spark" />Planifier vos missions</button>
        </div>
        <dl className="stats three">
          <div><dt>Missions</dt><dd>{list.length}</dd></div>
          <div><dt>En cours</dt><dd>{list.filter(m => m.status === 'EN_COURS').length}</dd></div>
          <div><dt>Mon engagement</dt><dd>{avg} %</dd></div>
        </dl>
      </section>

      {!list.length ? (
        <div className="notice"><div className="notice-card">
          <span className="notice-mark tile"><Sv n="file" size={24} /></span>
          <h2>Aucune mission pour l’instant</h2>
          <p>Ton encadrant n’a pas encore confié de mission à ton équipe. Rejoins une équipe ou reviens plus tard.</p>
          <div className="notice-acts"><button className="prim" onClick={() => ctx.go('/stagiaire/team')}>Voir mon équipe<Sv n="arrow" /></button></div>
        </div></div>
      ) : (
        <div className="ms-grid">
          <section className="card">
            <div className="subs-top"><div><p className="eye">Liste</p><h3>Missions de l’équipe</h3></div><span className="count">{shown.length} sur {list.length}</span></div>
            <div className="filters">
              <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher une mission" placeholder="Rechercher une mission..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
              <select aria-label="Statut" value={status} onChange={ev => setStatus(ev.target.value)}>
                <option value="ALL">Tous statuts</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select aria-label="Échéance" value={when} onChange={ev => setWhen(ev.target.value as DateFilter)}>
                <option value="ALL">Toutes dates</option><option value="WEEK">Cette semaine</option><option value="MONTH">Ce mois</option><option value="LATE">En retard</option>
              </select>
            </div>
            {!shown.length && <div className="empty"><b>Aucune mission ne correspond à ces filtres.</b><button className="link" onClick={() => { setQ(''); setStatus('ALL'); setWhen('ALL'); }}>Effacer les filtres</button></div>}
            <ul className="ms-list">
              {shown.map(m => (
                <li key={m.id}>
                  <button className={`ms-card${m.id === picked ? ' on' : ''}`} aria-pressed={m.id === picked} onClick={() => setPicked(m.id)}>
                    <span className="ms-head"><span className="tile"><Sv n="users" size={15} /></span><span><b>{m.title}</b><small>{m.subjectCode} · {m.teamName}</small></span></span>
                    <span className="ms-desc">{m.description}</span>
                    <span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className={`df-${m.difficulty}`}>{DIFFICULTY[m.difficulty]}</i></span>
                    <Meter label="Mon niveau d’engagement" value={m.myEngagement} />
                    <Meter label="Niveau d’engagement de mon équipe" value={m.teamEngagement} />
                    <span className="ms-foot"><span><Sv n="calendar" size={13} />{dateFr(m.dueDate)}</span><em>Aperçu</em></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {current && (
            <section className="card preview">
              <div className="pv-top">
                <div><p className="eye">Aperçu mission</p><h2>{current.title}</h2><p className="sub-lead">{current.description}</p>
                  <span className="chips"><i className={`st-${current.status}`}>{STATUS[current.status]}</i><i className={`df-${current.difficulty}`}>{DIFFICULTY[current.difficulty]}</i><i className="violet">Toute l’équipe</i></span></div>
                <span className="doc"><Sv n="file" /></span>
              </div>
              <div className="rings">
                <div><span className="eng-ring" style={{ ['--p' as string]: current.myEngagement }}><b>{current.myEngagement} %</b></span><p><b>Mon engagement</b>Ton avancement personnel sur cette mission.</p></div>
                <div><span className="eng-ring blue" style={{ ['--p' as string]: current.teamEngagement }}><b>{current.teamEngagement} %</b></span><p><b>Mon équipe</b>Avancement global de ton équipe sur cette mission.</p></div>
              </div>
              <dl className="facts">
                <div><dt>Échéance</dt><dd>{dateFr(current.dueDate)}</dd></div>
                <div><dt>Sujet</dt><dd>{current.subjectTitle}</dd></div>
                <div><dt>Équipe</dt><dd>{current.teamName}</dd></div>
                <div><dt>Points mission</dt><dd>{current.points}</dd></div>
                <div><dt>Coins</dt><dd>{current.coins}</dd></div>
                <div><dt>Récompense équipe</dt><dd>{current.teamReward} pts</dd></div>
              </dl>
              <button className="prim wide-btn" onClick={() => ctx.go(`/stagiaire/missions/${current.id}`)}>Voir la mission en détail<Sv n="arrow" /></button>
            </section>
          )}
        </div>
      )}

      {plan && ctx.layer && createPortal(
        <div className="pop plan" role="dialog" aria-label="Planifier vos missions">
          <header>
            <span className="tile"><Sv n="spark" /></span>
            <div><b>Planifier vos missions</b><small>Priorités, échéances et organisation</small></div>
            <button className="round" aria-label="Régénérer" title="Régénérer" disabled={plan === 'busy'} onClick={askPlan}><Sv n="refresh" size={15} /></button>
            <button className="round dark" aria-label="Fermer" onClick={() => setPlan(null)}><Sv n="x" size={15} /></button>
          </header>
          <div className="pop-body">
            {plan === 'busy' ? <p className="thinking"><i /><i /><i />Analyse de tes missions…</p> : (
              <ol className="plan-list">
                <li><h4>Ordre recommandé</h4><ol>{plan.sections.order.map(x => <li key={x}>{x}</li>)}</ol></li>
                <li><h4>Pourquoi cet ordre</h4><ul>{plan.sections.why.map(x => <li key={x}>{x}</li>)}</ul></li>
                <li><h4>Plan de travail concret</h4><ul>{plan.sections.plan.map(x => <li key={x}>{x}</li>)}</ul></li>
                <li><h4>Points de vigilance</h4><ul>{plan.sections.watch.map(x => <li key={x}>{x}</li>)}</ul></li>
              </ol>
            )}
          </div>
          <footer><code>{plan === 'busy' ? '…' : `${plan.model} · ${plan.scope}`}</code><small>{ctx.t.aiNote}</small></footer>
        </div>,
        ctx.layer
      )}
    </div>
  );
}

export const Meter = ({ label, value }: { label: string; value: number }) => (
  <span className="meter"><span><b>{label}</b><em>{value} %</em></span><span className="bar"><i style={{ width: `${value}%` }} /></span></span>
);
