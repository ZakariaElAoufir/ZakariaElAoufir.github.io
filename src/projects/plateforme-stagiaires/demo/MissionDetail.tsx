// The detail of a mission: overview, team, deliverables (file or commit), expected skills, comments, help requests, and the AI assistant.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { MissionDetailDto } from './logic';
import Deliverables from './Deliverables';
import MissionChat from './MissionChat';
import { Meter } from './Missions';
import { dateFr, dateTimeFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

const SECTIONS = [
  ['overview', 'Vue globale', 'Mission, consignes', 'file'], ['team', 'Équipe', 'Membres, postes', 'users'], ['deliver', 'Livrables', 'Dépôts et retours', 'download'],
  ['skills', 'Compétences', 'Compétences attendues', 'target'], ['comments', 'Commentaires', 'Discussion mission', 'commit'], ['help', 'Aide', 'Demandes ouvertes', 'spark']
] as const;
type Section = typeof SECTIONS[number][0];


export default function MissionDetail({ ctx, id }: { ctx: Ctx; id: number }) {
  const load = () => ctx.api<MissionDetailDto & { message?: string }>('GET', `/api/stagiaire/missions/${id}/full-detail`);
  const [r, setR] = useState(load);
  const [section, setSection] = useState<Section>('overview');
  const [doc, setDoc] = useState(false);
  if (r.status !== 200) {
    return (
      <div className="page"><div className="notice"><div className="notice-card">
        <span className="notice-mark tile"><Sv n="file" size={24} /></span>
        <h2>Mission indisponible</h2><p>{r.body.message}</p>
        <div className="notice-acts"><button className="prim" onClick={() => ctx.go('/stagiaire/missions')}>Retour aux missions<Sv n="arrow" /></button></div>
      </div></div></div>
    );
  }
  const m = r.body;
  const reload = () => setR(load());
  const open = (s: Section) => { setSection(s); };

  return (
    <div className="page">
      <section className="hero md-hero">
        <div>
          <div className="hero-top">
            <button className="back-pill" onClick={() => ctx.go('/stagiaire/missions')}><Sv n="left" size={13} />Retour aux missions</button>
            <span className="pill"><Sv n="spark" size={13} />Détail mission stagiaire</span>
          </div>
          <h1>{m.title}<em>{m.subjectCode}</em></h1>
          <p>{m.description} Suis ton niveau d’engagement, consulte les consignes, dépose tes livrables et échange avec ton encadrant.</p>
          <span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className={`df-${m.difficulty}`}>{DIFFICULTY[m.difficulty]}</i><i className="green">Échéance {dateFr(m.dueDate)}</i></span>
        </div>
        <div className="md-acts">
          <button className="prim" onClick={() => open('deliver')}><Sv n="download" />Soumettre un livrable</button>
          <button className="sec" onClick={() => open('help')}><Sv n="spark" />Demander de l’aide</button>
          <button className="sec" onClick={() => open('comments')}><Sv n="commit" />Commenter</button>
        </div>
      </section>

      <div className="team-grid solo">
        <nav className="card secs md-secs" aria-label="Sections">
          <p className="eye">Sections</p>
          <h3>Navigation</h3>
          {SECTIONS.map(([sid, label, hint, icon]) => (
            <button key={sid} className={section === sid ? 'on' : ''} aria-current={section === sid ? 'page' : undefined} onClick={() => open(sid)}>
              <span className="tile"><Sv n={icon} size={15} /></span><span className="sec-txt">{label}<small>{hint}</small></span><i />
            </button>
          ))}
        </nav>
        <main className="sec-main">
          {section === 'overview' && <Overview ctx={ctx} m={m} openDoc={() => setDoc(true)} />}
          {section === 'team' && <TeamSection m={m} />}
          {section === 'deliver' && <Deliverables ctx={ctx} m={m} reload={reload} />}
          {section === 'skills' && (
            <section className="card">
              <p className="eye">Compétences</p><h2>Compétences attendues</h2><p className="sub-lead">Compétences définies pour cette mission. Elles rejoignent l’arbre de l’équipe une fois la mission validée.</p>
              <div className="exp">{m.expected.map(x => <div key={x}><span className="t-spark"><Sv n="spark" size={15} /></span><small>Compétence attendue</small><b>{x}</b></div>)}</div>
            </section>
          )}
          {section === 'comments' && <Thread ctx={ctx} m={m} reload={reload} kind="comments" />}
          {section === 'help' && <Thread ctx={ctx} m={m} reload={reload} kind="help" />}
        </main>
      </div>

      {doc && ctx.layer && createPortal(<DocViewer ctx={ctx} attachmentId={m.attachments[0].id} close={() => setDoc(false)} />, ctx.layer)}
      {ctx.layer && createPortal(<MissionChat ctx={ctx} mission={m} />, ctx.layer)}
    </div>
  );
}

function Overview({ ctx, m, openDoc }: { ctx: Ctx; m: MissionDetailDto; openDoc: () => void }) {
  return (
    <section className="card">
      <p className="eye">Vue globale</p><h2>{m.title}</h2><p className="sub-lead">{m.description}</p>
      <div className="ov">
        <div className="ov-info">
          <div className="pv-top"><div><p className="eye">Informations mission</p><h3>{m.subjectCode} · {m.teamName}</h3></div><span className="doc"><Sv n="file" /></span></div>
          <dl className="facts">
            <div><dt>Échéance</dt><dd>{dateFr(m.dueDate)}</dd></div><div><dt>Cible</dt><dd>Toute l’équipe</dd></div>
            <div><dt>Sujet</dt><dd>{m.subjectTitle}</dd></div><div><dt>Équipe</dt><dd>{m.teamName} · équipe {m.teamNumber}</dd></div>
          </dl>
          <div className="sup-card flat"><span className="ava">{m.supervisor.initials}</span><div><b>{m.supervisor.name}</b><small>{m.supervisor.email}</small><i>Encadrant</i></div></div>
        </div>
        <div className="ov-side">
          <div className="mini"><h4>Niveau d’engagement</h4>
            <div className="rings tight">
              <span className="eng-ring" style={{ ['--p' as string]: m.myEngagement }}><b>{m.myEngagement} %<small>Moi</small></b></span>
              <span className="eng-ring blue" style={{ ['--p' as string]: m.teamEngagement }}><b>{m.teamEngagement} %<small>Équipe</small></b></span>
            </div>
          </div>
          <div className="mini"><h4>Récompenses</h4><dl className="rew"><div><dd>{m.points}</dd><dt>Points</dt></div><div><dd>{m.teamReward}</dd><dt>Équipe</dt></div><div><dd>{m.coins}</dd><dt>Coins</dt></div></dl></div>
        </div>
      </div>
      <h3 className="gh-h">Documents de consigne</h3>
      {m.attachments.length ? m.attachments.map(a => (
        <div key={a.id} className="att">
          <span className="att-ic"><Sv n="file" /></span>
          <div><b>{a.file_name}</b><small>Document de consigne, {a.size_kb} Ko, {dateTimeFr(a.uploaded_at)}</small></div>
          <button className="sec small" onClick={openDoc}><Sv n="eye" size={14} />Aperçu</button>
          <button className="sec small" onClick={() => ctx.toast(ctx.t.fileNote)}><Sv n="download" size={14} />Télécharger</button>
        </div>
      )) : <p className="sub-lead">Aucun document de consigne pour cette mission : l’assistant IA s’appuie seulement sur sa description.</p>}
    </section>
  );
}

function TeamSection({ m }: { m: MissionDetailDto }) {
  return (
    <section className="card">
      <p className="eye">Équipe</p><h2>{m.teamName}</h2><p className="sub-lead">Membres, postes et niveau d’engagement de chacun sur cette mission.</p>
      <dl className="kpis">
        <div><dt>Membres</dt><dd>{m.members.length}</dd></div><div><dt>Engagement équipe</dt><dd>{m.teamEngagement} %</dd></div>
        <div><dt>Livrables soumis</dt><dd>{m.members.reduce((n, x) => n + x.submitted, 0)}</dd></div><div><dt>Acceptés</dt><dd>{m.members.reduce((n, x) => n + x.accepted, 0)}</dd></div>
      </dl>
      <div className="people mbrs">
        {m.members.map(x => (
          <div key={x.id}>
            <span className="person"><span className="ava">{x.initials}</span><span><b>{x.name}</b><small>{x.position}</small></span></span>
            <Meter label="Niveau d’engagement" value={x.engagement} />
            <span className="counts"><span><b>{x.submitted}</b>soumis</span><span><b>{x.accepted}</b>acceptés</span></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Thread({ ctx, m, reload, kind }: { ctx: Ctx; m: MissionDetailDto; reload: () => void; kind: 'comments' | 'help' }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const help = kind === 'help';
  const post = () => {
    const res = ctx.api<{ message?: string }>('POST', `/api/stagiaire/missions/${m.id}/${help ? 'help-requests' : 'comments'}`, { content: text });
    if (res.status >= 300) { setError(res.body?.message ?? 'Envoi impossible.'); return; }
    setText(''); setError(''); ctx.toast(help ? 'Demande d’aide envoyée.' : 'Commentaire publié.'); reload();
  };
  const items: (MissionDetailDto['comments'][number] & { responses?: number; status?: string; answers?: MissionDetailDto['helpRequests'][number]['answers'] })[] = help ? m.helpRequests : m.comments;
  return (
    <section className="card">
      <p className="eye">{help ? 'Demandes d’aide' : 'Commentaires'}</p>
      <h2>{help ? 'Besoin d’assistance' : 'Discussion mission'}</h2>
      <p className="sub-lead">{help ? 'Crée une demande d’aide et suis celles déjà ouvertes. Ton encadrant et les équipes du sujet les voient.' : 'Échanges avec ton encadrant et ton équipe autour de cette mission.'}</p>
      <label className="compose">
        <span className="sr">{help ? 'Décrire le blocage rencontré' : 'Écrire un commentaire'}</span>
        <textarea rows={3} value={text} placeholder={help ? 'Explique ton problème pour recevoir une réponse.' : 'Écris ton message…'} onChange={ev => { setText(ev.target.value); setError(''); }} />
      </label>
      {error && <p className="wz-err" role="alert">{error}</p>}
      <div className="row-acts"><button className="prim" onClick={post}>{help ? 'Envoyer la demande' : 'Publier'}</button></div>
      <ul className="thread">
        {!items.length && <li className="sub-lead">{help ? 'Aucune demande ouverte.' : 'Aucun message pour l’instant.'}</li>}
        {items.map(x => (
          <li key={x.id}>
            <span className="ava">{x.author.initials}</span>
            <div><span className="th-head"><b>{x.author.name}</b><small>{dateTimeFr(x.created_at)}</small>{x.responses !== undefined && <i className="chip-open">{x.status === 'RESOLUE' ? 'Résolue' : x.status === 'DECLINEE' ? 'Déclinée' : 'Ouverte'}, {x.responses} réponse{x.responses > 1 ? 's' : ''}</i>}</span><p>{x.content}</p>{x.answers?.map(a => <p key={a.id} className="th-answer"><b>{a.responder.name}</b>{a.content}</p>)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocViewer({ ctx, attachmentId, close, base = '/api/stagiaire/missions' }: { ctx: Ctx; attachmentId: number; close: () => void; base?: string }) {
  const [doc] = useState(() => ctx.api<{ name: string; pages: { page: number; text: string }[] }>('GET', `${base}/attachments/${attachmentId}/file`).body);
  return (
    <div className="wz-back" role="dialog" aria-modal="true" aria-label={doc.name}>
      <div className="wz pdf">
        <header><div><p className="eye">Document de consigne</p><h3>{doc.name}</h3><p>{doc.pages.length} pages. C’est le document que l’assistant IA découpe et interroge.</p></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        <div className="wz-body">{doc.pages.map(p => <article key={p.page} className="pdf-page"><small>Page {p.page}</small>{p.text.split('\n').map((l, i) => <p key={i}>{l}</p>)}</article>)}</div>
      </div>
    </div>
  );
}
