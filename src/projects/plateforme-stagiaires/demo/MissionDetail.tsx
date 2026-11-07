// The detail of a mission: overview, team, deliverables (file or commit), expected skills, comments, help requests, and the AI assistant.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommitRow, MissionDetailDto } from './logic';
import MissionChat from './MissionChat';
import { Meter } from './Missions';
import { dateFr, dateTimeFr, DIFFICULTY, STATUS, Sv, type Ctx } from './shared';

const SECTIONS = [
  ['overview', 'Vue globale', 'Mission, consignes', 'file'], ['team', 'Équipe', 'Membres, postes', 'users'], ['deliver', 'Livrables', 'Dépôts et retours', 'download'],
  ['skills', 'Compétences', 'Compétences attendues', 'target'], ['comments', 'Commentaires', 'Discussion mission', 'commit'], ['help', 'Aide', 'Demandes ouvertes', 'spark']
] as const;
type Section = typeof SECTIONS[number][0];
const DELIVERABLE = { SOUMIS: 'Soumis', EN_REVUE: 'En revue', CORRECTIONS: 'Corrections demandées', ACCEPTE: 'Accepté', REFUSE: 'Refusé' } as const;
/** Files the visitor can "attach": nothing is read from their computer. */
const FILES = ['rapport-api-reservation-v2.pdf', 'tests-regles-reservation.zip', 'documentation-endpoints.pdf'];
type Repos = { repository: string; repositoryId: number; commits: CommitRow[] }[];

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

function Deliverables({ ctx, m, reload }: { ctx: Ctx; m: MissionDetailDto; reload: () => void }) {
  const [file, setFile] = useState<string | null>(null);
  const [replace, setReplace] = useState<number | null>(null);
  const [repos, setRepos] = useState<Repos | null>(null);
  const [error, setError] = useState('');
  const done = (status: number, body: { message?: string } | null, ok: string) => {
    if (status >= 300) { const msg = body?.message ?? 'Action impossible.'; setError(msg); ctx.toast(msg); return false; }
    setError(''); ctx.toast(ok); reload(); return true;
  };
  const send = () => {
    if (!file) { setError('Choisis un fichier à envoyer.'); return; }
    const res = replace
      ? ctx.api<{ message?: string }>('PUT', `/api/stagiaire/missions/${m.id}/deliverables/${replace}`, { fileName: file })
      : ctx.api<{ message?: string }>('POST', `/api/stagiaire/missions/${m.id}/deliverables`, { fileName: file });
    if (done(res.status, res.body, replace ? 'Livrable remplacé.' : 'Livrable envoyé.')) { setFile(null); setReplace(null); ctx.step('deliver'); }
  };
  const remove = (did: number) => {
    ctx.app.dialog = { title: 'Supprimer ce livrable ?', text: 'Il disparaîtra de la mission avant toute revue.', ok: 'Supprimer', run: () => {
      const res = ctx.api<{ message?: string }>('DELETE', `/api/stagiaire/missions/${m.id}/deliverables/${did}`);
      done(res.status, res.body, 'Livrable supprimé.');
    } };
    ctx.refresh();
  };
  const pickCommit = (commitId: number) => {
    const res = ctx.api<{ message?: string }>('POST', `/api/stagiaire/missions/${m.id}/commit-submissions`, { commitTraceId: commitId });
    if (done(res.status, res.body, 'Commit soumis comme résolution.')) { setRepos(null); ctx.step('deliver'); }
  };
  const finished = m.status === 'COMPLETEE' || m.status === 'VALIDEE';

  return (
    <section className="card">
      <p className="eye">Mes livrables</p><h2>Dépôts envoyés</h2><p className="sub-lead">Historique de tes livrables, statuts de revue et commentaires de l’encadrant.</p>
      {finished && <p className="info-line">Cette mission est {STATUS[m.status].toLowerCase()} : le service refusera un nouveau dépôt. Essaie quand même pour voir la réponse.</p>}
      {error && <p className="wz-err" role="alert">{error}</p>}
      <div className="dv-grid">
        <div className="dv-box">
          <p className="eye">{replace ? 'Remplacer le fichier' : 'Déposer une nouvelle version'}</p>
          <h4>Joindre un fichier et envoyer</h4>
          <div className="files-pick" role="radiogroup" aria-label="Fichier">
            {FILES.map(f => <button key={f} role="radio" aria-checked={file === f} className={file === f ? 'on' : ''} onClick={() => setFile(f)}><Sv n="file" size={14} />{f}</button>)}
          </div>
          <small className="hint">{ctx.t.fileNote}</small>
          <div className="row-acts">
            {replace && <button className="sec" onClick={() => { setReplace(null); setFile(null); }}>Annuler</button>}
            <button className="prim" onClick={send}><Sv n="download" />{replace ? 'Remplacer' : 'Envoyer'}</button>
          </div>
        </div>
        <div className="dv-box">
          <p className="eye">Soumission par commit GitHub</p>
          <h4>Choisir un commit comme résolution</h4>
          <p className="sub-lead">Un commit au plus par repository de l’équipe.</p>
          {repos ? repos.map(rp => (
            <div key={rp.repositoryId} className="commit-pick">
              <b>{rp.repository}</b>
              <ul>{rp.commits.slice(0, 5).map(k => <li key={k.id}><button onClick={() => pickCommit(k.id)}><code>{k.sha}</code><span>{k.message}</span></button></li>)}</ul>
            </div>
          )) : <button className="sec" onClick={() => setRepos(ctx.api<Repos>('GET', `/api/stagiaire/missions/${m.id}/available-commits`).body)}><Sv n="git" />Afficher les commits</button>}
          {!repos && !m.commitSubmissions.length && <p className="sub-lead">Aucun commit soumis pour cette mission.</p>}
          {m.commitSubmissions.map(x => (
            <div key={x.id} className="gh-row small-row">
              <Sv n="commit" /><span className="row-main"><b>{x.message}</b><small>{x.repository}, {x.author.name}, {dateTimeFr(x.submittedAt)}</small></span><code>{x.sha}</code>
              <button className="round" aria-label="Retirer ce commit" title="Retirer" onClick={() => { const res = ctx.api<{ message?: string }>('DELETE', `/api/stagiaire/missions/${m.id}/commit-submissions/${x.id}`); done(res.status, res.body, 'Commit retiré.'); }}><Sv n="x" size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <ul className="rows">
        {!m.deliverables.length && <li className="sub-lead">Tu n’as encore rien déposé sur cette mission.</li>}
        {m.deliverables.map(d => (
          <li key={d.id}><div className="gh-row dv-row">
            <span className="ava small">{d.author.initials}</span>
            <span className="row-main"><b>{d.file_name}</b><small>Version {d.version}, envoyé le {dateTimeFr(d.submitted_at)}</small>{d.review_comment && <small className="review">Encadrant : {d.review_comment}</small>}</span>
            <span className="chips"><i className={`dv-${d.status}`}>{DELIVERABLE[d.status]}</i></span>
            <button className="sec small" onClick={() => { setReplace(d.id); setFile(null); setError(''); }}>Remplacer</button>
            <button className="sec small" onClick={() => remove(d.id)}>Supprimer</button>
          </div></li>
        ))}
      </ul>
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
  const items: (MissionDetailDto['comments'][number] & { responses?: number })[] = help ? m.helpRequests : m.comments;
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
            <div><span className="th-head"><b>{x.author.name}</b><small>{dateTimeFr(x.created_at)}</small>{x.responses !== undefined && <i className="chip-open">Ouverte, {x.responses} réponse{x.responses > 1 ? 's' : ''}</i>}</span><p>{x.content}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocViewer({ ctx, attachmentId, close }: { ctx: Ctx; attachmentId: number; close: () => void }) {
  const [doc] = useState(() => ctx.api<{ name: string; pages: { page: number; text: string }[] }>('GET', `/api/stagiaire/missions/attachments/${attachmentId}/file`).body);
  return (
    <div className="wz-back" role="dialog" aria-modal="true" aria-label={doc.name}>
      <div className="wz pdf">
        <header><div><p className="eye">Document de consigne</p><h3>{doc.name}</h3><p>{doc.pages.length} pages. C’est le document que l’assistant IA découpe et interroge.</p></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        <div className="wz-body">{doc.pages.map(p => <article key={p.page} className="pdf-page"><small>Page {p.page}</small>{p.text.split('\n').map((l, i) => <p key={i}>{l}</p>)}</article>)}</div>
      </div>
    </div>
  );
}
