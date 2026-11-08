// The supervisor's teams, subject by subject, following the platform's "Mes équipes par sujet".
import { useState } from 'react';
import type { EncSubjectSummary, EncTeamDto } from './logic';
import { dateFr, Sv, type Ctx } from './shared';

export default function EncTeams({ ctx }: { ctx: Ctx }) {
  const [subjects] = useState(() => ctx.api<EncSubjectSummary[]>('GET', '/api/encadrant/subjects/summary').body);
  const [subjectId, setSubjectId] = useState(subjects.find(s => s.code === 'ROOMS')?.id ?? subjects[0]?.id ?? 0);
  const load = (id: number) => ctx.api<EncTeamDto[]>('GET', `/api/encadrant/subjects/${id}/teams`).body;
  const [teams, setTeams] = useState(() => subjectId ? load(subjectId) : []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [filters, setFilters] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const subject = subjects.find(s => s.id === subjectId);
  const pick = (id: number) => { setSubjectId(id); setTeams(load(id)); setOpen(null); setQ(''); setStatus('ALL'); };
  const term = q.trim().toLowerCase();
  const shown = teams.filter(t => (status === 'ALL' || t.status === status) && (!term || [t.name, t.status, ...t.members.map(m => m.name)].some(x => x.toLowerCase().includes(term))));
  const members = shown.reduce((n, t) => n + t.members.length, 0);
  const avg = shown.length ? Math.round(shown.reduce((n, t) => n + t.engagement, 0) / shown.length) : 0;

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="hero-top">
            <button className="back-pill" onClick={() => ctx.go('/encadrant/subjects')}><Sv n="left" size={13} />Retour aux sujets</button>
            <span className="pill"><Sv n="spark" size={13} />Encadrant : équipes par sujet</span>
          </div>
          <h1>Mes équipes<em>par sujet</em></h1>
          <p>Visualise rapidement les sujets que tu encadres, les équipes associées, leur capacité, leurs membres, leurs points et leur niveau d’engagement global.</p>
        </div>
        <div className="view-card">
          <small className="eye">Vue actuelle</small>
          <b>{shown.length} équipe{shown.length > 1 ? 's' : ''}</b>
          <span>{members} membre{members > 1 ? 's' : ''}, {avg} % d’engagement moyen</span>
          <span className="bar"><i style={{ width: `${avg}%` }} /></span>
        </div>
      </section>

      <div className="team-grid solo">
        <aside className="card secs">
          <p className="eye">Sujets</p>
          <h3>Mes sujets</h3>
          {subjects.map(s => (
            <button key={s.id} className={s.id === subjectId ? 'on' : ''} aria-current={s.id === subjectId ? 'true' : undefined} onClick={() => pick(s.id)}>
              <span className="tile"><Sv n="file" size={15} /></span><span className="sec-txt">{s.code}<small>{s.teams} équipe{s.teams > 1 ? 's' : ''}, {s.members} membre{s.members > 1 ? 's' : ''}</small></span><i />
            </button>
          ))}
        </aside>

        {subject && (
          <section className="card">
            <div className="assign">
              <div className="assign-top">
                <span className="code-tile big-letter">{subject.code[0]}</span>
                <div className="grow-box">
                  <p className="eye">Sujet sélectionné</p>
                  <h3>{subject.title}</h3>
                  <p>{subject.description}</p>
                  <span className="chips"><i className="blue">{subject.code}</i><i className="orange">{subject.maxTeams} équipe{subject.maxTeams > 1 ? 's' : ''} max</i><i>Créé le {dateFr(subject.createdAt)}</i></span>
                </div>
                <div className="subj-acts">
                  <button className="sec small" aria-pressed={filters} onClick={() => setFilters(f => !f)}><Sv n="search" size={14} />Filtrer</button>
                  <button className="prim small-prim" onClick={() => ctx.go('/encadrant/teams/edit')}><Sv n="users" size={14} />Ajouter équipe</button>
                </div>
              </div>
              <dl className="kpis">
                <div><dt>Équipes</dt><dd>{subject.teams}/{subject.maxTeams}</dd></div>
                <div><dt>Membres</dt><dd>{subject.members}</dd></div>
                <div><dt>Capacité</dt><dd>{subject.occupied}/{subject.capacity}</dd></div>
                <div><dt>Points</dt><dd>{subject.points}</dd></div>
              </dl>
            </div>

            {filters && (
              <div className="team-filter">
                <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher une équipe" placeholder="Rechercher une équipe, un membre ou un statut..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
                <select aria-label="Statut" value={status} onChange={ev => setStatus(ev.target.value)}><option value="ALL">Tous les statuts</option><option value="OPEN">Ouverte</option><option value="FULL">Complète</option></select>
                <span className="count">{shown.length} résultat{shown.length > 1 ? 's' : ''}</span>
              </div>
            )}

            {!shown.length && <div className="empty"><b>Aucune équipe trouvée</b><span>Aucune équipe ne correspond au filtre actuel.</span></div>}
            <div className="et-list">
              {shown.map(t => {
                const expanded = open === t.id;
                const free = t.capacity - t.occupied;
                return (
                  <article key={t.id} className={`et-card${expanded ? ' open' : ''}`}>
                    <button className="et-head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : t.id)}>
                      <span className="ava">{t.name[0]}</span>
                      <span className="et-main"><b>{t.name}</b><small>Équipe #{t.number}, créée le {dateFr(t.createdAt)}</small>
                        <span className="chips"><i className={t.status === 'OPEN' ? 'green' : 'orange'}>{t.status}</i>{t.positions.map(p => <i key={p.id} className="blue">{p.title}</i>)}</span>
                      </span>
                      <span className="eng-ring" style={{ ['--p' as string]: t.engagement }}><b>{t.engagement} %</b></span>
                      <span className="et-points"><b>{t.points}</b><small>points</small></span>
                      <span className="chev"><Sv n={expanded ? 'down' : 'right'} /></span>
                    </button>
                    {expanded && (
                      <div className="et-body">
                        <dl className="facts">
                          <div><dt>Membres</dt><dd>{t.members.length}</dd></div>
                          <div><dt>Capacité</dt><dd>{t.occupied}/{t.capacity}</dd></div>
                          <div><dt>Disponible</dt><dd>{free}</dd></div>
                        </dl>
                        <div className="et-title"><h4>Membres de l’équipe</h4><span>{free > 0 ? `${free} place${free > 1 ? 's' : ''} encore disponible${free > 1 ? 's' : ''}` : 'Équipe complète'}</span></div>
                        <div className="et-members">
                          {!t.members.length && <div className="dash-empty">Aucun membre pour l’instant.</div>}
                          {t.members.map(m => <div key={m.id} className="person"><span className="ava">{m.initials}</span><span><b>{m.name}</b><small>{m.position}</small></span></div>)}
                        </div>
                        <button className="prim" onClick={() => ctx.go(`/encadrant/teams/${t.id}`)}>Voir le détail de l’équipe<Sv n="arrow" /></button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
