// The intern chooses a subject: subjects by supervisor, then the four-step wizard (subject, team, position, confirmation).
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PersonDto, PositionDto, SubjectDto, TeamDto } from './logic';
import { dateFr, Sv, type Ctx } from './shared';

const WIZARD = ['Sujet', 'Équipe', 'Poste', 'Confirmation'];

export default function Subjects({ ctx }: { ctx: Ctx }) {
  const [subjects] = useState(() => ctx.api<SubjectDto[]>('GET', '/api/stagiaire/subjects').body);
  const [supervisor, setSupervisor] = useState<number | 'ALL'>('ALL');
  const [peopleQ, setPeopleQ] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(1);
  const [wizard, setWizard] = useState<SubjectDto | null>(null);
  const [fresh, setFresh] = useState(subjects);

  const supervisors = useMemo(() => {
    const seen = new Map<number, PersonDto>();
    for (const s of subjects) seen.set(s.supervisor.id, s.supervisor);
    return [...seen.values()];
  }, [subjects]);
  const term = q.trim().toLowerCase();
  const shown = fresh.filter(s =>
    (supervisor === 'ALL' || s.supervisor.id === supervisor) &&
    (!term || [s.title, s.code, s.description, ...s.positions.map(p => p.title)].some(x => x.toLowerCase().includes(term))));
  const groups = supervisors.map(p => ({ p, list: shown.filter(s => s.supervisor.id === p.id) })).filter(g => g.list.length);
  const peopleTerm = peopleQ.trim().toLowerCase();

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="pill"><Sv n="spark" size={13} />Stagiaire : choix du sujet</span>
          <h1>Sujets disponibles<em>par encadrant</em></h1>
          <p>Sélectionnez un encadrant pour afficher ses sujets, consultez les postes disponibles, puis rejoignez une équipe avec un formulaire en quatre étapes.</p>
        </div>
        <dl className="stats">
          <div><dt>Sujets affichés</dt><dd>{shown.length}</dd></div>
          <div><dt>Postes</dt><dd>{shown.reduce((n, s) => n + s.positions.length, 0)}</dd></div>
          <div><dt>Places libres</dt><dd>{shown.reduce((n, s) => n + s.free, 0)}</dd></div>
          <div><dt>Équipes max</dt><dd>{shown.reduce((n, s) => n + s.maxTeams, 0)}</dd></div>
        </dl>
      </section>

      <div className="split">
        <aside className="card sup">
          <p className="eye">Encadrants</p>
          <h3>Liste encadrants</h3>
          <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher un encadrant" placeholder="Rechercher..." value={peopleQ} onChange={ev => setPeopleQ(ev.target.value)} /></label>
          <button className={`sup-row${supervisor === 'ALL' ? ' on' : ''}`} onClick={() => setSupervisor('ALL')}><span className="ava dark">Tous</span><span><b>Tous les encadrants</b><small>Afficher tous les sujets</small></span></button>
          {supervisors.filter(p => !peopleTerm || p.name.toLowerCase().includes(peopleTerm)).map(p => (
            <button key={p.id} className={`sup-row${supervisor === p.id ? ' on' : ''}`} onClick={() => setSupervisor(p.id)}><span className="ava">{p.initials}</span><span><b>{p.name}</b><small>{p.email}</small></span></button>
          ))}
        </aside>

        <section className="card subs">
          <div className="subs-top">
            <div><p className="eye">Sujets</p><h3>Sujets par encadrant</h3></div>
            <span className="count">{shown.length} affiché{shown.length > 1 ? 's' : ''}</span>
          </div>
          <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher un sujet" placeholder="Rechercher un sujet, un code, un poste..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
          {!groups.length && (
            <div className="empty"><b>Aucun sujet ne correspond à cette recherche.</b><button className="link" onClick={() => { setQ(''); setSupervisor('ALL'); }}>Effacer les filtres</button></div>
          )}
          {groups.map(({ p, list }) => (
            <div key={p.id} className="group">
              <header><span className="ava">{p.initials}</span><span><b>{p.name}</b><small>{p.email}</small></span><em>{list.length} sujet{list.length > 1 ? 's' : ''}</em></header>
              {list.map(s => (
                <article key={s.id} className={`sub${open === s.id ? ' open' : ''}`}>
                  <button className="sub-head" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <span className="doc"><Sv n="file" /></span>
                    <span className="sub-main">
                      <span className="sub-title"><b>{s.title}</b><code>{s.code}</code><i className={s.free ? 'free' : 'none'}>{s.free} place{s.free > 1 ? 's' : ''} libre{s.free > 1 ? 's' : ''}</i></span>
                      <span className="sub-desc">{s.description}</span>
                      <span className="chips"><i>{s.maxTeams} équipe{s.maxTeams > 1 ? 's' : ''} max</i><i>Créé le {dateFr(s.createdAt)}</i><i>{s.positions.length} postes</i></span>
                    </span>
                    <span className="occ"><small>Occupation</small><b>{s.occupation} %</b><span className="bar"><i style={{ width: `${s.occupation}%` }} /></span></span>
                    <span className="chev"><Sv n={open === s.id ? 'down' : 'right'} /></span>
                  </button>
                  {open === s.id && (
                    <div className="sub-body">
                      <h4>Postes disponibles sur ce sujet</h4>
                      <div className="pos-list">
                        {s.positions.map(x => <div key={x.id} className="pos"><b>{x.title}</b><span>{x.description}</span><small>{x.occupied} occupé{x.occupied > 1 ? 's' : ''} sur {x.capacity * s.maxTeams}, {x.free} libre{x.free > 1 ? 's' : ''}</small></div>)}
                      </div>
                      <button className="prim" onClick={() => setWizard(s)}>Rejoindre ce sujet<Sv n="arrow" /></button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ))}
        </section>
      </div>
      {wizard && ctx.layer && createPortal(
        <Wizard ctx={ctx} subject={wizard} close={() => { setWizard(null); setFresh(ctx.api<SubjectDto[]>('GET', '/api/stagiaire/subjects').body); }} />,
        ctx.layer
      )}
    </div>
  );
}

function Wizard({ ctx, subject, close }: { ctx: Ctx; subject: SubjectDto; close: () => void }) {
  const [at, setAt] = useState(0);
  const [teams, setTeams] = useState<TeamDto[] | null>(null);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [position, setPosition] = useState<PositionDto | null>(null);
  const [error, setError] = useState('');

  const next = () => {
    setError('');
    if (at === 0 && !teams) setTeams(ctx.api<TeamDto[]>('GET', `/api/stagiaire/subjects/${subject.id}/teams`).body);
    setAt(at + 1);
  };
  const confirm = () => {
    const r = ctx.api<{ message?: string }>('POST', `/api/stagiaire/subjects/${subject.id}/select`, { teamId: team!.id, subjectPositionId: position!.id });
    if (r.status !== 201) { setError(r.body.message ?? 'Sélection impossible.'); return; }
    ctx.step('join');
    ctx.toast(`Vous avez rejoint ${team!.name}.`);
    ctx.go('/stagiaire/team');
  };
  const canNext = at === 0 || (at === 1 && team) || (at === 2 && position);

  return (
    <div className="wz-back" role="dialog" aria-modal="true" aria-label="Rejoindre un sujet">
      <div className="wz">
        <header>
          <div><p className="eye">Formulaire en 4 étapes</p><h3>Rejoindre un sujet</h3><p>Choisir un sujet, une équipe, puis un poste disponible.</p></div>
          <button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button>
        </header>
        <ol className="wz-steps">
          {WIZARD.map((w, i) => <li key={w} className={i < at ? 'done' : i === at ? 'on' : ''}><i>{i < at ? <Sv n="check" size={13} /> : i + 1}</i>{w}</li>)}
        </ol>
        <div className="wz-body">
          {at === 0 && (
            <div className="choice on static">
              <code>{subject.code}</code>
              <h4>{subject.title}</h4>
              <p>{subject.description}</p>
              <dl className="facts"><div><dt>Encadrant</dt><dd>{subject.supervisor.name}</dd></div><div><dt>Équipes max</dt><dd>{subject.maxTeams}</dd></div><div><dt>Date de création</dt><dd>{dateFr(subject.createdAt)}</dd></div></dl>
            </div>
          )}
          {at === 1 && teams?.map(x => {
            const on = team?.id === x.id;
            return (
              <button key={x.id} className={`choice${on ? ' on' : ''}`} aria-pressed={on} disabled={x.free === 0} onClick={() => { setTeam(x); setPosition(null); }}>
                <h4>{x.name}</h4>
                <p>Créée le {dateFr(x.createdAt)}, {x.points} points, {x.members.length} membre{x.members.length > 1 ? 's' : ''}</p>
                <span className="avas">{x.members.map(m => <i key={m.id} className="ava small" title={`${m.name}, ${m.position}`}>{m.initials}</i>)}{!x.members.length && <small>Aucun membre pour l’instant</small>}</span>
                <span className="choice-foot"><em className={x.free ? '' : 'none'}>{x.free ? `${x.free} place${x.free > 1 ? 's' : ''} libre${x.free > 1 ? 's' : ''}` : 'Équipe complète'}</em><span className="bar"><i style={{ width: `${x.progress}%` }} /></span><small>Progression {x.progress} %</small></span>
              </button>
            );
          })}
          {at === 2 && team?.positions.map(x => {
            const on = position?.id === x.id;
            return (
              <button key={x.id} className={`choice${on ? ' on' : ''}`} aria-pressed={on} disabled={x.free === 0} onClick={() => setPosition(x)}>
                <small className="eye">{x.free ? 'Poste disponible' : 'Poste complet'}</small>
                <h4>{x.title}</h4>
                <p>{x.description}</p>
                <dl className="facts"><div><dt>Capacité</dt><dd>{x.capacity}</dd></div><div><dt>Occupés</dt><dd>{x.occupied}</dd></div><div><dt>Libres</dt><dd>{x.free}</dd></div></dl>
              </button>
            );
          })}
          {at === 3 && (
            <div className="sum">
              <span className="pill"><Sv n="check" size={13} />Prêt à valider</span>
              <h4>Confirmation de sélection</h4>
              <dl className="facts col"><div><dt>Sujet choisi</dt><dd>{subject.title}</dd></div><div><dt>Équipe choisie</dt><dd>{team!.name}</dd></div><div><dt>Poste choisi</dt><dd>{position!.title}</dd></div></dl>
            </div>
          )}
          {error && <p className="wz-err" role="alert">{error}</p>}
        </div>
        <footer>
          <button className="sec" onClick={at === 0 ? close : () => { setError(''); setAt(at - 1); }}>{at === 0 ? 'Annuler' : 'Précédent'}</button>
          {at < 3
            ? <button className="prim" disabled={!canNext} onClick={next}>Suivant<Sv n="arrow" /></button>
            : <button className="prim" onClick={confirm}>Valider la sélection<Sv n="check" /></button>}
        </footer>
      </div>
    </div>
  );
}
