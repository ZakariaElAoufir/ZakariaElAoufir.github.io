// One team seen by its supervisor: engagement, members, missions, slots, skills and GitHub (read only).
import { useState } from 'react';
import GithubSection from './GithubSection';
import type { EncTeamDetail as Detail, Health } from './logic';
import { Meter } from './Missions';
import { Contact } from './Notices';
import SkillTree from './SkillTree';
import { dateFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

const SECTIONS = [
  ['overview', 'Vue globale', 'target'], ['members', 'Membres', 'users'], ['missions', 'Missions', 'box'], ['slots', 'Slots', 'layers'], ['skills', 'Compétences acquises', 'badge'],
  ['calendar', 'Calendrier', 'calendar'], ['storage', 'Stockage', 'box'], ['history', 'Historique', 'refresh'], ['github', 'GitHub', 'git']
] as const;
type Section = typeof SECTIONS[number][0];
export const HEALTH: Record<Health, [string, string]> = {
  EN_DIFFICULTE: ['En difficulté', 'orange'], EN_RETARD: ['En retard', 'red'], LIVRABLES_EN_ATTENTE: ['Livrables en attente', 'blue'], STABLE: ['Stable', 'green'], SANS_ACTIVITE: ['Sans activité', '']
};

export default function EncTeamDetail({ ctx, id }: { ctx: Ctx; id: number }) {
  const [r] = useState(() => ctx.api<Detail & { message?: string }>('GET', `/api/encadrant/teams/${id}/detail-view`));
  const [section, setSection] = useState<Section>('overview');
  const [open, setOpen] = useState<number | null>(null);
  if (r.status !== 200) {
    return <div className="page"><div className="notice"><div className="notice-card"><span className="notice-mark tile"><Sv n="users" size={24} /></span><h2>Équipe indisponible</h2><p>{r.body.message}</p><div className="notice-acts"><button className="prim" onClick={() => ctx.go('/encadrant/teams')}>Retour aux équipes<Sv n="arrow" /></button></div></div></div></div>;
  }
  const d = r.body, t = d.team, [healthLabel, tone] = HEALTH[t.health];

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="hero-top">
            <button className="back-pill" onClick={() => ctx.go('/encadrant/teams')}><Sv n="left" size={13} />Retour au sujet</button>
            <span className="pill"><Sv n="spark" size={13} />Encadrant : détail équipe</span>
          </div>
          <h1>{t.name}<em>{d.subject.code}</em></h1>
          <p>Vue détaillée de l’équipe avec le niveau d’engagement, les missions, les livrables, les membres et les indicateurs de suivi.</p>
          <button className="prim plan-btn" onClick={() => ctx.go('/encadrant/teams/edit')}><Sv n="link" />Modifier</button>
        </div>
        <dl className="stats">
          <div><dt>Engagement</dt><dd>{t.engagement} %</dd></div>
          <div><dt>Missions</dt><dd>{d.validated}/{d.total}</dd></div>
          <div><dt>Livrables</dt><dd>{d.deliverables}</dd></div>
          <div><dt>Statut</dt><dd className="stat-word">{healthLabel}</dd></div>
        </dl>
      </section>

      <div className="team-grid solo">
        <nav className="card secs" aria-label="Sections">
          <p className="eye">Sections</p>
          <h3>{SECTIONS.find(s => s[0] === section)![1]}</h3>
          {SECTIONS.map(([sid, label, icon]) => <button key={sid} className={section === sid ? 'on' : ''} aria-current={section === sid ? 'page' : undefined} onClick={() => setSection(sid)}><span className="tile"><Sv n={icon} size={15} /></span>{label}<i /></button>)}
        </nav>
        <main className="sec-main">
          {section === 'overview' && (
            <section className="card">
              <p className="eye">Vue globale</p><h2>Détails de l’équipe</h2><p className="sub-lead">Navigation par section pour analyser l’avancement réel de l’équipe.</p>
              <div className="td-ov">
                <div className="assign">
                  <span className="chips"><i className={tone}>{healthLabel}</i></span>
                  <h3 className="td-name">{t.name}</h3>
                  <p className="sub-lead">Équipe #{t.number} affectée au sujet {d.subject.title}. Niveau d’engagement global de {t.engagement} % avec {d.validated} mission{d.validated > 1 ? 's' : ''} validée{d.validated > 1 ? 's' : ''}.</p>
                  <span className="chips td-chips"><i className="orange">{t.points} points</i><i className="blue">{t.members.length} membre{t.members.length > 1 ? 's' : ''}</i><i className="green">{d.late} retard{d.late > 1 ? 's' : ''}</i></span>
                  <Meter label="Niveau d’engagement de l’équipe" value={t.engagement} />
                </div>
                <div className="td-side">
                  <div><small className="eye">Sujet</small><b>{d.subject.code}</b><span>{d.subject.title}</span></div>
                  <div><small className="eye">Missions</small><b>{d.validated}/{d.total}</b><span>{d.late} en retard.</span></div>
                  <div><small className="eye">Livrables acceptés</small><b>{d.acceptedDeliverables}/{d.deliverables}</b><span>{d.toFix} livrable{d.toFix > 1 ? 's' : ''} à corriger.</span></div>
                </div>
              </div>
            </section>
          )}
          {section === 'members' && (
            <section className="card">
              <p className="eye">Membres</p><h2>Progression des membres</h2><p className="sub-lead">Le poste, l’engagement et les livrables de chacun.</p>
              {!d.members.length && <div className="dash-empty">Aucun membre dans cette équipe.</div>}
              <div className="people mbrs">
                {d.members.map(m => (
                  <div key={m.id}>
                    <span className="person"><span className="ava">{m.initials}</span><span><b>{m.name}</b><small>{m.email}</small></span></span>
                    <span className="chips"><i className="orange">{m.position}</i></span>
                    <Meter label="Engagement global" value={m.engagement} />
                    <span className="counts"><span><b>{m.missionsDone}/{m.missionsTotal}</b>missions</span><span><b>{m.delivered}</b>livrables</span><span><b>{m.accepted}</b>acceptés</span></span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {section === 'missions' && (
            <section className="card">
              <p className="eye">Missions</p><h2>Missions de l’équipe</h2><p className="sub-lead">Ouvre une mission pour voir l’avancement de chaque membre.</p>
              {!d.missions.length && <div className="dash-empty">Aucune mission pour cette équipe.</div>}
              <div className="et-list">
                {d.missions.map(m => (
                  <article key={m.id} className={`et-card${open === m.id ? ' open' : ''}`}>
                    <button className="et-head" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}>
                      <span className="et-main"><b>{m.title}</b><small>{m.description}</small><span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className={`df-${m.difficulty}`}>{DIFFICULTY[m.difficulty]}</i><i className="orange">{m.points} pts</i></span></span>
                      <span className="et-info"><small>Échéance</small><b>{dateFr(m.dueDate)}</b></span>
                      <span className="eng-ring" style={{ ['--p' as string]: m.teamEngagement }}><b>{m.teamEngagement} %</b></span>
                      <span className="chev"><Sv n={open === m.id ? 'down' : 'right'} /></span>
                    </button>
                    {open === m.id && (
                      <div className="et-body">
                        {m.members.map(x => (
                          <div key={x.id} className="line-member">
                            <span className="person"><span className="ava">{x.initials}</span><span><b>{x.name}</b><small>{x.position}</small></span></span>
                            <span className="et-info"><small>Livrables</small><b>{x.delivered}</b><small>{x.accepted} accepté{x.accepted > 1 ? 's' : ''}, {x.toFix} à corriger</small></span>
                            <Meter label="Avancement" value={x.engagement} />
                          </div>
                        ))}
                        <button className="prim" onClick={() => ctx.go(`/encadrant/missions/${m.id}`)}>Détails de la mission<Sv n="arrow" /></button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {section === 'slots' && (
            <section className="card">
              <p className="eye">Slots</p><h2>Postes de l’équipe</h2><p className="sub-lead">Occupation de chaque poste, calculée depuis team_position_slots.</p>
              <div className="pos-cards">
                {d.slots.map(s => <article key={s.id}><h4>{s.title}</h4><p>{s.description}</p><dl className="facts"><div><dt>Capacité</dt><dd>{s.capacity}</dd></div><div><dt>Occupés</dt><dd>{s.occupied}</dd></div><div><dt>Libres</dt><dd>{s.free}</dd></div></dl></article>)}
              </div>
            </section>
          )}
          {section === 'skills' && <SkillTree ctx={ctx} teamId={id} base="/api/encadrant" />}
          {section === 'github' && <GithubSection ctx={ctx} teamId={id} teamName={t.name} members={t.members} readOnly />}
          {section === 'calendar' && <Contact ctx={ctx} module="Calendrier de l’équipe" inline />}
          {section === 'storage' && <Contact ctx={ctx} module="Stockage de l’équipe" inline />}
          {section === 'history' && <Contact ctx={ctx} module="Historique de l’équipe" inline />}
        </main>
      </div>
    </div>
  );
}
