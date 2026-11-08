// The supervisor's mission dashboard: counters, filters, cards and the side panel of a mission.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { EncMissionCard, MissionStatus } from './logic';
import { Meter } from './Missions';
import { dateFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

type Sort = 'recent' | 'deadline' | 'progress' | 'points';
const deadline = (m: EncMissionCard) => m.dueDaysLeft < 0 ? `${-m.dueDaysLeft}j de retard` : `${m.dueDaysLeft}j restants`;
const dtone = (m: EncMissionCard) => m.status === 'VALIDEE' ? 'green' : m.dueDaysLeft < 0 ? 'red' : m.dueDaysLeft <= 3 ? 'orange' : 'blue';

export default function EncMissions({ ctx }: { ctx: Ctx }) {
  const [list] = useState(() => ctx.api<EncMissionCard[]>('GET', '/api/encadrant/missions').body);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [level, setLevel] = useState('ALL');
  const [sort, setSort] = useState<Sort>('recent');
  const [picked, setPicked] = useState<EncMissionCard | null>(null);
  const count = (s: MissionStatus) => list.filter(m => m.status === s).length;
  const late = list.filter(m => m.dueDaysLeft < 0 && m.status !== 'VALIDEE' && m.status !== 'COMPLETEE').length;
  const avg = list.length ? Math.round(list.reduce((n, m) => n + m.teamEngagement, 0) / list.length) : 0;
  const term = q.trim().toLowerCase();
  const shown = list
    .filter(m => (status === 'ALL' || m.status === status) && (level === 'ALL' || m.difficulty === level) && (!term || `${m.title} ${m.description} ${m.teamName}`.toLowerCase().includes(term)))
    .sort((a, b) => sort === 'deadline' ? a.dueDate.localeCompare(b.dueDate) : sort === 'progress' ? b.teamEngagement - a.teamEngagement : sort === 'points' ? b.points - a.points : a.id - b.id);
  const STATS: [string, number, string, string][] = [['Total missions', list.length, 'créées', 'blue'], ['En cours', count('EN_COURS'), 'actuellement actives', 'blue'], ['En retard', late, 'missions à surveiller', 'orange'], ['Validées', count('VALIDEE'), 'missions terminées', 'green']];

  return (
    <div className="page">
      <div className="em-head">
        <div>
          <span className="pill"><Sv n="spark" size={13} />Encadrant : tableau de bord missions</span>
          <h1 className="em-title">Mes missions</h1>
          <p className="sub-lead">{list.length} missions créées, {count('EN_COURS')} en cours d’exécution</p>
        </div>
        <div className="em-avg"><span className="eng-ring" style={{ ['--p' as string]: avg }}><b>{avg} %</b></span><span><small className="eye">Engagement moyen</small><b>sur toutes les missions</b></span></div>
      </div>
      <div className="em-stats">{STATS.map(([label, value, hint, tone]) => <div key={label} className={`em-stat ${tone}`}><small className="eye">{label}</small><b>{value}</b><span>{hint}</span></div>)}</div>
      <div className="chips em-pills">{(Object.keys(STATUS) as MissionStatus[]).map(s => <i key={s}>{STATUS[s]} {count(s)}</i>)}</div>
      <div className="em-bar">
        <b>{shown.length} mission{shown.length > 1 ? 's' : ''}</b>
        <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher" placeholder="Rechercher..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
        <select aria-label="Statut" value={status} onChange={ev => setStatus(ev.target.value)}><option value="ALL">Tous statuts</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Difficulté" value={level} onChange={ev => setLevel(ev.target.value)}><option value="ALL">Toutes difficultés</option>{Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Tri" value={sort} onChange={ev => setSort(ev.target.value as Sort)}><option value="recent">Plus récent</option><option value="deadline">Échéance</option><option value="progress">Avancement</option><option value="points">Points</option></select>
        <button className="prim small-prim" onClick={() => ctx.go('/encadrant/missions/new')}><Sv n="plus" size={14} />Nouvelle mission</button>
      </div>
      {!shown.length && <div className="dash-empty">Aucune mission ne correspond à ces filtres.</div>}
      <div className="em-list">
        {shown.map(m => (
          <button key={m.id} className={`em-card${picked?.id === m.id ? ' on' : ''}`} onClick={() => setPicked(m)}>
            <i className="md-grad" />
            <span className="em-main"><small className="eye">{m.subjectCode}</small><b>{m.title}</b><span className="ms-desc">{m.description}</span><span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className={`df-${m.difficulty}`}>{DIFFICULTY[m.difficulty]}</i></span></span>
            <span className="em-meta"><span><small>Sujet</small><b>{m.subjectTitle}</b></span><span><small>Équipe</small><b>{m.teamLabel}</b></span><span><small>Cible</small><b>Toute l’équipe</b></span></span>
            <span className="em-side">
              <span className="eng-ring" style={{ ['--p' as string]: m.teamEngagement }}><b>{m.teamEngagement} %</b></span>
              <span className="chips"><i className={dtone(m)}>{deadline(m)}, {dateFr(m.dueDate)}</i></span>
              <span className="chips"><i className="orange">{m.points} pts</i><i className="blue">+{m.teamReward} team pts</i><i className="green">{m.coins} coins</i></span>
            </span>
          </button>
        ))}
      </div>

      {picked && ctx.layer && createPortal(
        <aside className="em-panel" aria-label={picked.title}>
          <button className="round" aria-label="Fermer le détail" onClick={() => setPicked(null)}><Sv n="x" /></button>
          <div className="assign"><small className="eye">{picked.subjectCode}</small><h2>{picked.title}</h2><span className="chips"><i className={`st-${picked.status}`}>{STATUS[picked.status]}</i><i className={`df-${picked.difficulty}`}>{DIFFICULTY[picked.difficulty]}</i></span></div>
          <Meter label="Niveau d’engagement" value={picked.teamEngagement} />
          <dl className="facts">
            <div><dt>Sujet</dt><dd>{picked.subjectTitle}</dd></div><div><dt>Équipe</dt><dd>{picked.teamLabel}</dd></div>
            <div><dt>Échéance</dt><dd>{dateFr(picked.dueDate)}</dd></div><div><dt>Créée le</dt><dd>{dateFr(picked.createdAt)}</dd></div>
          </dl>
          <p className="sub-lead">{picked.description}</p>
          <dl className="rew"><div><dd>{picked.points}</dd><dt>Points</dt></div><div><dd>{picked.teamReward}</dd><dt>Équipe</dt></div><div><dd>{picked.coins}</dd><dt>Coins</dt></div></dl>
          <button className="prim wide-btn" onClick={() => ctx.go(`/encadrant/missions/${picked.id}`)}>Ouvrir la mission<Sv n="arrow" /></button>
          <button className="sec wide-btn" onClick={() => ctx.go('/encadrant/missions/edit')}>Modifier</button>
        </aside>,
        ctx.layer
      )}
    </div>
  );
}
