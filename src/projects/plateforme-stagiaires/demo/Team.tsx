// "Mon équipe": the assignment, the team's missions, members and positions, the skill tree and the GitHub section.
import { useState } from 'react';
import type { AssignmentDto } from './logic';
import GithubSection from './GithubSection';
import { Contact } from './Notices';
import SkillTree from './SkillTree';
import { dateFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

const SECTIONS = [
  ['assign', 'Affectation', 'target'], ['missions', 'Missions', 'file'], ['team', 'Équipe', 'users'], ['positions', 'Postes', 'layers'],
  ['skills', 'Compétences acquises', 'badge'], ['calendar', 'Calendrier', 'calendar'], ['storage', 'Stockage', 'box'], ['github', 'GitHub', 'git']
] as const;
type Section = typeof SECTIONS[number][0];
const WIDE: Section[] = ['skills', 'github', 'calendar', 'storage'];

export default function Team({ ctx }: { ctx: Ctx }) {
  const [section, setSection] = useState<Section>('assign');
  const load = () => ctx.api<AssignmentDto>('GET', '/api/stagiaire/team-membership');
  const [r, setR] = useState(load);
  if (r.status !== 200) {
    return (
      <div className="page">
        <div className="notice"><div className="notice-card">
          <span className="notice-mark tile"><Sv n="users" size={24} /></span>
          <h2>Aucune équipe active</h2>
          <p>Choisissez un sujet pour rejoindre une équipe et consulter les détails complets de votre affectation.</p>
          <div className="notice-acts"><button className="prim" onClick={() => ctx.go('/stagiaire/subjects')}>Choisir un sujet<Sv n="arrow" /></button></div>
        </div></div>
      </div>
    );
  }
  const a = r.body, me = ctx.app.me!;
  const mine = a.team.members.find(m => m.id === me.id)!;
  const leave = () => {
    ctx.app.dialog = {
      title: 'Quitter l’équipe ?', text: `Votre place au poste ${a.position.title} sera libérée dans ${a.team.name}.`, ok: 'Quitter l’équipe',
      run: () => { ctx.api('DELETE', '/api/stagiaire/team-membership'); ctx.toast(`Vous avez quitté ${a.team.name}.`); ctx.go('/stagiaire/subjects'); }
    };
    ctx.refresh();
  };
  const change = (positionId: number) => {
    const res = ctx.api<{ message?: string }>('PUT', '/api/stagiaire/team-membership/position', { subjectPositionId: positionId });
    if (res.status === 200) { ctx.step('role'); ctx.toast('Votre poste a été mis à jour.'); setR(load()); }
    else ctx.toast(res.body?.message ?? 'Changement impossible.');
  };
  const wide = WIDE.includes(section);

  return (
    <div className="page">
      <section className="hero team-hero">
        <div>
          <div className="hero-top">
            <button className="back-pill" onClick={() => ctx.go('/stagiaire/subjects')}><Sv n="left" size={13} />Retour aux sujets</button>
            <span className="pill"><Sv n="spark" size={13} />Stagiaire : mon équipe</span>
          </div>
          <h1>{a.team.name}<em>{a.subject.title}</em></h1>
          <p>Visualise ton équipe, ton encadrant, tes coéquipiers, ton rôle et l’avancement des missions qui te concernent.</p>
        </div>
        <div className="ring-card">
          <small>Niveau d’engagement de l’équipe</small>
          <div className="eng-ring" style={{ ['--p' as string]: a.team.engagement }}><b>{a.team.engagement} %</b></div>
        </div>
      </section>

      <div className={`team-grid${wide ? ' solo' : ''}`}>
        <nav className="card secs" aria-label="Sections">
          <p className="eye">Sections</p>
          <h3>{SECTIONS.find(s => s[0] === section)![1]}</h3>
          {SECTIONS.map(([id, label, icon]) => (
            <button key={id} className={section === id ? 'on' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}><span className="tile"><Sv n={icon} size={15} /></span>{label}<i /></button>
          ))}
        </nav>

        <main className="sec-main">
          {section === 'assign' && (
            <section className="card">
              <p className="eye">Sujet et équipe</p>
              <h2>Mon affectation</h2>
              <p className="sub-lead">Résumé de ton sujet de stage, de ton rôle et de l’état actuel de ton équipe.</p>
              <div className="assign">
                <div className="assign-top">
                  <span className="code-tile">{a.subject.code}</span>
                  <div>
                    <h3>{a.subject.title}</h3>
                    <p>{a.subject.description}</p>
                    <span className="chips"><i className="blue">{a.subject.code}</i><i className="green">{a.team.status}</i><i className="orange">Poste : {a.position.title}</i><i>Depuis le {dateFr(a.joinedAt)}</i><i className="violet">Équipe #{a.team.number}</i></span>
                  </div>
                </div>
                <dl className="kpis">
                  <div><dt>Points équipe</dt><dd>{a.team.points}</dd></div>
                  <div><dt>Membres</dt><dd>{a.team.members.length}</dd></div>
                  <div><dt>Missions</dt><dd>{a.missions.length}</dd></div>
                  <div><dt>Coins possibles</dt><dd>{a.coins}</dd></div>
                </dl>
              </div>
            </section>
          )}
          {section === 'missions' && (
            <section className="card">
              <p className="eye">Missions</p>
              <h2>Mes missions d’équipe</h2>
              <p className="sub-lead">{a.missions.length ? 'Les missions confiées à ton équipe, et à qui elles sont affectées.' : 'Ton encadrant n’a pas encore confié de mission à cette équipe.'}</p>
              <ul className="rows">
                {a.missions.map(m => (
                  <li key={m.id}><button onClick={() => ctx.go(`/stagiaire/missions/${m.id}`)}>
                    <span className="row-main"><b>{m.title}</b><small>{m.description}</small></span>
                    <span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i>{DIFFICULTY[m.difficulty]}</i><i>{m.points} pts</i><i>{m.assignee.initials}</i></span>
                    <Sv n="right" />
                  </button></li>
                ))}
              </ul>
            </section>
          )}
          {section === 'team' && (
            <section className="card">
              <p className="eye">Équipe</p>
              <h2>Membres de mon équipe</h2>
              <p className="sub-lead">{a.team.members.length} membre{a.team.members.length > 1 ? 's' : ''} et {a.team.free} place{a.team.free > 1 ? 's' : ''} encore libre{a.team.free > 1 ? 's' : ''}.</p>
              <div className="people">
                {a.team.members.map(m => <div key={m.id} className={m.id === me.id ? 'me' : ''}><span className="ava">{m.initials}</span><b>{m.name}{m.id === me.id && <em> (moi)</em>}</b><small>{m.position}</small><small>{m.email}</small></div>)}
              </div>
            </section>
          )}
          {section === 'positions' && (
            <section className="card">
              <p className="eye">Postes</p>
              <h2>Choisir mon rôle dans l’équipe</h2>
              <p className="sub-lead">Tu peux changer de poste tant qu’une place y est libre dans ton équipe.</p>
              <div className="pos-cards">
                {a.team.positions.map(p => {
                  const current = p.id === a.position.id;
                  return (
                    <article key={p.id} className={current ? 'on' : ''}>
                      <h4>{p.title}</h4>
                      <p>{p.description}</p>
                      <dl className="facts"><div><dt>Capacité</dt><dd>{p.capacity}</dd></div><div><dt>Occupés</dt><dd>{p.occupied}</dd></div><div><dt>Libres</dt><dd>{p.free}</dd></div></dl>
                      <button className={current ? 'sec' : 'prim'} disabled={current || p.free === 0} onClick={() => change(p.id)}>{current ? 'Mon poste actuel' : p.free === 0 ? 'Poste complet' : 'Choisir ce poste'}</button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {section === 'skills' && <SkillTree ctx={ctx} teamId={a.team.id} />}
          {section === 'calendar' && <Contact ctx={ctx} module="Calendrier de l’équipe" inline />}
          {section === 'storage' && <Contact ctx={ctx} module="Stockage de l’équipe" inline />}
          {section === 'github' && <GithubSection ctx={ctx} teamId={a.team.id} teamName={a.team.name} members={a.team.members} />}
        </main>

        {!wide && (
          <aside className="side">
            <section className="card me-card">
              <span className="ava xl">{me.initials}</span>
              <h3>{me.name}</h3>
              <p>{mine.position}</p>
              <dl className="facts col"><div><dt>Engagement de l’équipe</dt><dd>{a.team.engagement} %</dd></div><div><dt>Poste</dt><dd>{mine.position}</dd></div><div><dt>Sujet</dt><dd>{a.subject.code}</dd></div></dl>
              <button className="soft-blue" onClick={() => setSection('positions')}>Modifier mon poste</button>
              <button className="soft-red" onClick={leave}>Quitter l’équipe</button>
            </section>
            <section className="card sup-card">
              <span className="ava">{a.subject.supervisor.initials}</span>
              <div><b>{a.subject.supervisor.name}</b><small>{a.subject.supervisor.email}</small><i>Encadrant</i></div>
            </section>
            <section className="tip"><b>Conseil</b><p>Priorise les missions en cours et compare ton niveau d’engagement avec celui de l’équipe pour savoir où concentrer tes efforts.</p></section>
          </aside>
        )}
      </div>
    </div>
  );
}
