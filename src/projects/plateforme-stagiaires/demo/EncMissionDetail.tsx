// A mission seen by its supervisor: validation, review of deliverables and commits, the AI review, comments, help requests and history.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Backdrop, CommitDiff, Preview } from './Deliverables';
import type { DeliverableStatus, EncMissionDetail as Detail, ReviewAnswer, SubmissionStatus, SubmittedCommit } from './logic';
import { DocViewer } from './MissionDetail';
import { Meter } from './Missions';
import { dateFr, dateTimeFr, DIFFICULTY, Icon, STATUS, Sv, type Ctx } from './shared';

const SECTIONS = [
  ['overview', 'Vue globale', 'Mission, sujet et consignes', 'file'], ['team', 'Équipe', 'Membres, postes', 'users'], ['skills', 'Compétences', 'Compétences attendues', 'target'],
  ['deliver', 'Livrables', 'Dépôts et revues', 'download'], ['comments', 'Commentaires', 'Discussion mission', 'commit'], ['help', 'Aide', 'Demandes ouvertes', 'spark'], ['history', 'Historique', 'Actions mission', 'refresh']
] as const;
type Section = typeof SECTIONS[number][0];
const DELIVERABLE: Record<DeliverableStatus, [string, string]> = { SOUMIS: ['Soumis / en attente', 'blue'], EN_REVUE: ['En revue', 'orange'], CORRECTIONS: ['À corriger', 'orange'], ACCEPTE: ['Accepté', 'green'], REFUSE: ['Rejeté', 'red'] };
const SUBMISSION: Record<SubmissionStatus, [string, string]> = { PENDING_REVIEW: ['En attente de revue', 'orange'], CHANGES_REQUESTED: ['À corriger', 'orange'], ACCEPTED: ['Accepté', 'green'], REJECTED: ['Rejeté', 'red'] };
const HELP: Record<string, [string, string]> = { OUVERTE: ['Ouverte', 'orange'], RESOLUE: ['Résolue', 'green'], DECLINEE: ['Déclinée', 'red'] };
const BASE = '/api/encadrant/missions';
type Action = {
  eyebrow: string; title: string; description: string; target?: string; label?: string; badge?: string; placeholder?: string; initial?: string;
  required?: boolean; confirm: string; tone: 'primary' | 'danger' | 'success'; run: (text: string) => void;
};

export default function EncMissionDetail({ ctx, id }: { ctx: Ctx; id: number }) {
  const load = () => ctx.api<Detail & { message?: string }>('GET', `${BASE}/${id}`);
  const [r, setR] = useState(load);
  const [section, setSection] = useState<Section>('overview');
  const [action, setAction] = useState<Action | null>(null);
  const [diff, setDiff] = useState<SubmittedCommit | null>(null);
  const [preview, setPreview] = useState<{ id: number; name: string; sizeKb: number } | null>(null);
  const [doc, setDoc] = useState(false);
  const [reviews, setReviews] = useState<Record<number, ReviewAnswer>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [text, setText] = useState('');
  if (r.status !== 200) {
    return <div className="page"><div className="notice"><div className="notice-card"><span className="notice-mark tile"><Sv n="file" size={24} /></span><h2>Mission indisponible</h2><p>{r.body.message}</p><div className="notice-acts"><button className="prim" onClick={() => ctx.go('/encadrant/missions')}>Retour aux missions<Sv n="arrow" /></button></div></div></div></div>;
  }
  const m = r.body;
  const reload = () => setR(load());
  const done = (res: { status: number; body: { message?: string } | null }, ok: string) => {
    if (res.status >= 300) { ctx.toast(res.body?.message ?? 'Action impossible.'); return; }
    ctx.toast(ok); reload();
  };
  const reviewFile = (did: number, status: DeliverableStatus, comment?: string) => done(ctx.api(  'PUT', `${BASE}/${id}/deliverables/${did}/review`, { status, comment }) as { status: number; body: { message?: string } | null }, status === 'ACCEPTE' ? 'Livrable approuvé.' : status === 'REFUSE' ? 'Livrable rejeté.' : 'Corrections demandées.');
  const fix = (d: { id: number; file_name: string }, initial = '') => setAction({ eyebrow: 'Corrections livrable', title: 'Demander des corrections', description: 'Explique précisément les corrections attendues avant de renvoyer le livrable au stagiaire.', target: d.file_name, label: 'Corrections à effectuer', badge: 'Requis', required: true, initial, placeholder: 'Exemple : ajouter les tests de chaque règle et le schéma des tables.', confirm: 'Demander les corrections', tone: 'primary', run: c => reviewFile(d.id, 'CORRECTIONS', c) });
  const reject = (d: { id: number; file_name: string }, initial = '') => setAction({ eyebrow: 'Rejet livrable', title: 'Refuser le livrable', description: 'Réserve ce statut aux livrables trop incorrects ou à refaire complètement. La mission repasse à « Rejetée ».', target: d.file_name, label: 'Raison du refus', badge: 'Requis', required: true, initial, placeholder: 'Exemple : livrable trop incomplet, structure à reprendre.', confirm: 'Refuser le livrable', tone: 'danger', run: c => reviewFile(d.id, 'REFUSE', c) });
  const reviewCommits = (s: Detail['commitSubmissions'][number], status: SubmissionStatus) => {
    const required = status !== 'ACCEPTED';
    const title = status === 'ACCEPTED' ? 'Approuver la soumission GitHub' : status === 'REJECTED' ? 'Rejeter la soumission GitHub' : 'Demander des corrections';
    setAction({
      eyebrow: 'Review GitHub', title, description: 'Ajoute ton commentaire de revue avant d’envoyer le statut de cette soumission GitHub.',
      target: `${s.commits.length} commit${s.commits.length > 1 ? 's' : ''}, ${dateTimeFr(s.submittedAt)}`, label: 'Commentaire de revue', badge: required ? 'Requis' : 'Optionnel', required,
      placeholder: 'Exemple : bon travail, ou indique précisément les corrections attendues.', confirm: status === 'ACCEPTED' ? 'Approuver' : status === 'REJECTED' ? 'Rejeter' : 'Demander les corrections', tone: status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'danger' : 'primary',
      run: c => done(ctx.api('PUT', `/api/encadrant/mission-commit-submissions/${s.id}/review`, { status, reviewComment: c }) as { status: number; body: { message?: string } | null }, status === 'ACCEPTED' ? 'Soumission approuvée.' : status === 'REJECTED' ? 'Soumission rejetée.' : 'Corrections demandées.')
    });
  };
  const validate = () => setAction({ eyebrow: 'Validation', title: 'Valider la mission', description: 'La mission sera marquée comme validée : l’équipe reçoit sa récompense et les compétences rejoignent son arbre.', target: m.title, confirm: 'Valider', tone: 'success', run: () => done(ctx.api('PUT', `${BASE}/${id}/validate`) as { status: number; body: { message?: string } | null }, 'Mission validée.') });
  const askAi = (did: number) => {
    setBusy(did);
    window.setTimeout(() => {
      const res = ctx.api<ReviewAnswer>('POST', `/api/ai/encadrant/missions/${id}/deliverables/${did}/review-assistant`);
      setBusy(null);
      if (res.status === 200) { setReviews(x => ({ ...x, [did]: res.body })); ctx.step('review'); }
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200);
  };
  const post = () => {
    const res = ctx.api<{ message?: string }>('POST', `${BASE}/${id}/comments`, { content: text });
    if (res.status < 300) setText('');
    done(res, 'Commentaire publié.');
  };
  const answer = (h: Detail['helpRequests'][number]) => setAction({ eyebrow: 'Assistance stagiaire', title: 'Répondre à la demande d’aide', description: 'Rédige une réponse claire pour aider le stagiaire à avancer sur sa difficulté.', target: h.author.name, label: 'Réponse', badge: 'Requis', required: true, placeholder: 'Exemple : les dates sont en ISO 8601 avec fuseau.', confirm: 'Envoyer la réponse', tone: 'primary', run: c => done(ctx.api('POST', `/api/encadrant/help-requests/${h.id}/answer`, { content: c }) as { status: number; body: { message?: string } | null }, 'Réponse envoyée.') });
  const decline = (h: Detail['helpRequests'][number]) => setAction({ eyebrow: 'Demande d’aide', title: 'Décliner la demande d’aide', description: 'Cette action décline la demande sans envoyer de message.', target: h.author.name, confirm: 'Décliner la demande', tone: 'danger', run: () => done(ctx.api('PUT', `/api/encadrant/help-requests/${h.id}/decline`) as { status: number; body: { message?: string } | null }, 'Demande déclinée.') });
  const submitted = m.commitSubmissions.reduce((n, s) => n + s.commits.length, 0);

  return (
    <div className="page">
      <section className="hero md-hero">
        <div>
          <div className="hero-top"><button className="back-pill" onClick={() => ctx.go('/encadrant/missions')}><Sv n="left" size={13} />Retour aux missions</button><span className="pill"><Sv n="file" size={13} />Détail mission encadrant</span></div>
          <h1>{m.title}<em>{m.subjectCode}</em></h1>
          <p>{m.description} Suivi des consignes, livrables stagiaires, commentaires, demandes d’aide et actions de validation.</p>
          <span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className="blue">{m.teamName}</i><i className="green">Échéance {dateFr(m.dueDate)}</i></span>
        </div>
        <div className="md-acts">
          <button className="prim" disabled={m.status === 'VALIDEE'} onClick={validate}><Sv n="check" />Valider la mission</button>
          <button className="sec" onClick={() => ctx.go('/encadrant/missions/edit')}><Sv n="link" />Modifier la mission</button>
          <button className="soft-red md-del" onClick={() => ctx.go('/encadrant/missions/edit')}><Sv n="trash" size={15} />Supprimer la mission</button>
        </div>
      </section>

      <div className="team-grid solo">
        <nav className="card secs md-secs" aria-label="Sections">
          <p className="eye">Sections</p><h3>Navigation</h3>
          {SECTIONS.map(([sid, label, hint, icon]) => <button key={sid} className={section === sid ? 'on' : ''} aria-current={section === sid ? 'page' : undefined} onClick={() => setSection(sid)}><span className="tile"><Sv n={icon} size={15} /></span><span className="sec-txt">{label}<small>{hint}</small></span><i /></button>)}
        </nav>
        <main className="sec-main">
          {section === 'overview' && (
            <section className="card">
              <p className="eye">Vue globale</p><h2>{m.title}</h2><p className="sub-lead">{m.description}</p>
              <div className="ov">
                <div className="ov-info">
                  <div className="pv-top"><div><p className="eye">Informations mission</p><h3>{m.subjectCode} · {m.teamName}</h3><span className="chips"><i className={`st-${m.status}`}>{STATUS[m.status]}</i><i className={`df-${m.difficulty}`}>{DIFFICULTY[m.difficulty]}</i></span></div><span className="doc"><Sv n="file" /></span></div>
                  <dl className="facts"><div><dt>Échéance</dt><dd>{dateFr(m.dueDate)}</dd></div><div><dt>Cible</dt><dd>Toute l’équipe</dd></div><div><dt>Sujet</dt><dd>{m.subjectTitle}</dd></div><div><dt>Équipe</dt><dd>{m.teamName} · équipe {m.teamNumber}</dd></div></dl>
                </div>
                <div className="ov-side">
                  <div className="mini"><h4>Niveau d’engagement</h4><div className="rings tight"><span className="eng-ring blue" style={{ ['--p' as string]: m.teamEngagement }}><b>{m.teamEngagement} %<small>Équipe</small></b></span></div></div>
                  <div className="mini"><h4>Récompenses</h4><dl className="rew"><div><dd>{m.points}</dd><dt>Points</dt></div><div><dd>{m.teamReward}</dd><dt>Équipe</dt></div><div><dd>{m.coins}</dd><dt>Coins</dt></div></dl></div>
                </div>
              </div>
              <h3 className="gh-h">Documents de consigne</h3>
              {m.attachments.length ? m.attachments.map(a => <div key={a.id} className="att"><span className="att-ic"><Sv n="file" /></span><div><b>{a.file_name}</b><small>Consigne encadrant, {a.size_kb} Ko, {dateTimeFr(a.uploaded_at)}</small></div><button className="sec small" onClick={() => setDoc(true)}><Sv n="eye" size={14} />Aperçu</button></div>) : <p className="sub-lead">Aucun document de consigne pour cette mission.</p>}
            </section>
          )}
          {section === 'team' && (
            <section className="card">
              <p className="eye">Équipe</p><h2>{m.teamName}</h2><p className="sub-lead">Composition, postes et avancement des membres sur cette mission.</p>
              <dl className="kpis"><div><dt>Membres</dt><dd>{m.members.length}</dd></div><div><dt>Postes</dt><dd>{m.members.length}</dd></div><div><dt>Engagement</dt><dd>{m.teamEngagement} %</dd></div><div><dt>Points équipe</dt><dd>{m.teamPoints}</dd></div></dl>
              <div className="people mbrs">{m.members.map(x => <div key={x.id}><span className="person"><span className="ava">{x.initials}</span><span><b>{x.name}</b><small>{x.email}</small></span></span><span className="chips"><i className="blue">{x.position}</i></span><Meter label="Niveau d’engagement" value={x.engagement} /><span className="counts"><span><b>{x.submitted}</b>soumis</span><span><b>{x.accepted}</b>acceptés</span></span></div>)}</div>
            </section>
          )}
          {section === 'skills' && <section className="card"><p className="eye">Compétences</p><h2>Compétences attendues</h2><p className="sub-lead">Elles rejoignent l’arbre de l’équipe quand la mission est validée.</p><div className="exp">{m.expected.map(x => <div key={x}><span className="t-spark"><Sv n="spark" size={15} /></span><small>Compétence attendue</small><b>{x}</b></div>)}</div></section>}
          {section === 'deliver' && (
            <section className="card">
              <p className="eye">Livrables</p><h2>Suivi des dépôts</h2><p className="sub-lead">Documents envoyés par les stagiaires avec statut, version, revue et preview.</p>
              <div className="gh-banner static-banner"><span className="gh-ic"><Icon name="github" /></span><span className="up-txt"><small>Soumissions par commit GitHub</small><b>Commits soumis par les stagiaires</b><em>Consulte les commits liés à cette mission, ouvre le diff GitHub et envoie ta revue.</em></span><span className="gh-count">{submitted} soumis</span></div>
              <h3 className="small-title"><Icon name="github" />Commits soumis</h3>
              {!m.commitSubmissions.length && <div className="dash-empty">Aucun commit soumis pour cette mission.</div>}
              {m.commitSubmissions.map(s => (
                <article key={s.id} className="sub-card">
                  <div className="sub-top"><span className="person"><span className="ava">{s.author.initials}</span><span><b>{s.author.name}</b><small>{dateTimeFr(s.submittedAt)}{s.note ? ` · ${s.note}` : ''}</small></span></span><span className={`badge ${SUBMISSION[s.status][1]}`}>{SUBMISSION[s.status][0]}</span></div>
                  {s.reviewComment && <p className="review-note"><Sv n="commit" size={15} />{s.reviewComment}</p>}
                  <div className="commit-chips">{s.commits.map(k => <button key={k.commitTraceId} className="commit-chip" onClick={() => setDiff(k)}><span className="sha">{k.sha}</span><span className="msg-txt">{k.message}</span><small>{k.repository} · +{k.additions} -{k.deletions}</small></button>)}</div>
                  {s.status === 'PENDING_REVIEW' && <div className="rv-acts"><button className="small-act ok" onClick={() => reviewCommits(s, 'ACCEPTED')}><Sv n="check" size={15} />Approuver</button><button className="small-act fix" onClick={() => reviewCommits(s, 'CHANGES_REQUESTED')}>À corriger</button><button className="small-act ko" onClick={() => reviewCommits(s, 'REJECTED')}><Sv n="x" size={15} />Rejeter</button></div>}
                </article>
              ))}
              <div className="dv-list">
                {!m.deliverables.length && <div className="dash-empty">Aucun livrable déposé pour cette mission.</div>}
                {m.deliverables.map(d => {
                  const [label, tone] = DELIVERABLE[d.status];
                  const canReview = d.status === 'SOUMIS' || d.status === 'EN_REVUE';
                  const ai = reviews[d.id]?.review;
                  return (
                    <article key={d.id} className="dv-card rv-card">
                      <div className="dv-main">
                        <span className="ava">{d.author.initials}</span>
                        <div>
                          <div className="dv-title"><h3>{d.file_name}</h3><span className={`badge ${tone}`}>{label}</span><button className="ai-trigger" disabled={busy !== null} onClick={() => askAi(d.id)}>{busy === d.id ? <i className="spin" /> : <Sv n="spark" size={14} />}Vérification</button></div>
                          <p className="dv-meta">Envoyé par <b>{d.author.name}</b>, version {d.version}</p>
                          <small className="dv-author">{dateTimeFr(d.submitted_at)}</small>
                          <div className="contrib-row"><small className="eye">Contributeurs</small><div className="contribs">{d.contributorList.map(p => <span key={p.id} className={`contrib${p.id === d.stagiaire_id ? ' me' : ''}`}><i>{p.initials}</i>{p.name}{p.id === d.stagiaire_id && <em>Submitter</em>}</span>)}</div></div>
                          {d.review_comment && <p className="review-note"><Sv n="commit" size={15} />{d.review_comment}</p>}
                        </div>
                      </div>
                      <div className="rv-side">
                        <button className="small-act" onClick={() => setPreview({ id: d.id, name: d.file_name, sizeKb: d.size_kb })}><Sv n="eye" size={15} />Preview</button>
                        <button className="small-act" onClick={() => ctx.toast(ctx.t.fileNote)}><Sv n="download" size={15} />Télécharger</button>
                        {canReview && <button className="small-act ok" onClick={() => reviewFile(d.id, 'ACCEPTE')}><Sv n="check" size={15} />Approuver</button>}
                        {canReview && <button className="small-act ko" onClick={() => reject(d)}><Sv n="x" size={15} />Rejeter</button>}
                        {canReview && <button className="small-act fix" onClick={() => fix(d)}>À corriger</button>}
                      </div>
                      {ai && (
                        <div className="ai-panel">
                          <header><span className="tile"><Sv n="spark" size={15} /></span><div><b>Vérification IA</b><small>Terminée, recommandation seulement</small></div><span className={`badge ${ai.verdict === 'Approuver' ? 'green' : ai.verdict === 'Rejeter' ? 'red' : 'orange'}`}>{ai.verdict}</span></header>
                          <ol className="plan-list">
                            <li><h4>Verdict suggéré</h4><p>{ai.verdict}. La décision finale revient à l’encadrant.</p></li>
                            <li><h4>Conformité à la mission</h4><p>{ai.conformity}</p></li>
                            <li><h4>Points corrects</h4>{ai.correct.length ? <ul>{ai.correct.map(x => <li key={x}>{x}</li>)}</ul> : <p>Aucun point vérifiable.</p>}</li>
                            <li><h4>Manques ou incohérences</h4>{ai.gaps.length ? <ul>{ai.gaps.map(x => <li key={x}>{x}</li>)}</ul> : <p>Aucun manque relevé.</p>}</li>
                            <li><h4>Corrections recommandées</h4>{ai.fixes.length ? <ul>{ai.fixes.map(x => <li key={x}>{x}</li>)}</ul> : <p>Aucune correction nécessaire.</p>}</li>
                            <li><h4>Commentaire de review proposé</h4><p className="ai-comment">{ai.comment}</p></li>
                          </ol>
                          {canReview && ai.verdict !== 'Approuver' && <button className="sec small" onClick={() => ai.verdict === 'Rejeter' ? reject(d, ai.comment) : fix(d, ai.comment)}>Reprendre ce commentaire</button>}
                          <small className="hint">{ctx.t.reviewNote}</small>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {section === 'comments' && (
            <section className="card">
              <p className="eye">Commentaires</p><h2>Discussion mission</h2><p className="sub-lead">Échanges avec les stagiaires autour de cette mission.</p>
              <label className="compose"><span className="sr">Écrire un commentaire</span><textarea rows={3} value={text} placeholder="Écris ton message…" onChange={ev => setText(ev.target.value)} /></label>
              <div className="row-acts"><button className="prim" onClick={post}>Publier</button></div>
              <ul className="thread">{!m.comments.length && <li className="sub-lead">Aucun message pour l’instant.</li>}{m.comments.map(x => <li key={x.id}><span className="ava">{x.author.initials}</span><div><span className="th-head"><b>{x.author.name}</b><small>{dateTimeFr(x.created_at)}</small></span><p>{x.content}</p></div></li>)}</ul>
            </section>
          )}
          {section === 'help' && (
            <section className="card">
              <p className="eye">Demandes d’aide</p><h2>Assistance stagiaire</h2><p className="sub-lead">Demandes ouvertes par les stagiaires concernant cette mission.</p>
              <ul className="thread">{!m.helpRequests.length && <li className="sub-lead">Aucune demande d’aide pour cette mission.</li>}
                {m.helpRequests.map(h => (
                  <li key={h.id}><span className="ava">{h.author.initials}</span><div>
                    <span className="th-head"><b>{h.author.name}</b><small>{dateTimeFr(h.created_at)}</small><span className={`badge ${HELP[h.status][1]}`}>{HELP[h.status][0]}</span></span>
                    <p>{h.content}</p>
                    {h.answers.map(a => <p key={a.id} className="th-answer"><b>{a.responder.name}</b>{a.content}</p>)}
                    {h.status === 'OUVERTE' && <div className="rv-acts"><button className="small-act ok" onClick={() => answer(h)}><Sv n="commit" size={15} />Répondre</button><button className="small-act ko" onClick={() => decline(h)}><Sv n="x" size={15} />Décliner</button></div>}
                  </div></li>
                ))}
              </ul>
            </section>
          )}
          {section === 'history' && (
            <section className="card">
              <p className="eye">Historique</p><h2>Actions mission</h2><p className="sub-lead">Chaque changement de statut et chaque revue, du plus récent au plus ancien.</p>
              <ul className="hist">{m.histories.map(h => <li key={h.id}><i /><div><b>{h.detail}</b><small>{h.actor.name}, {dateTimeFr(h.created_at)}</small></div></li>)}</ul>
            </section>
          )}
        </main>
      </div>

      {ctx.layer && action && createPortal(<ActionModal action={action} close={() => setAction(null)} />, ctx.layer)}
      {ctx.layer && diff && createPortal(<CommitDiff ctx={ctx} commit={diff} close={() => setDiff(null)} />, ctx.layer)}
      {ctx.layer && preview && createPortal(<Preview ctx={ctx} modal={preview} base={BASE} close={() => setPreview(null)} />, ctx.layer)}
      {ctx.layer && doc && createPortal(<DocViewer ctx={ctx} attachmentId={m.attachments[0].id} base={BASE} close={() => setDoc(false)} />, ctx.layer)}
    </div>
  );
}

function ActionModal({ action, close }: { action: Action; close: () => void }) {
  const [text, setText] = useState(action.initial ?? '');
  return (
    <Backdrop close={close} label={action.title}>
      <div className="md-card">
        <i className="md-grad" />
        <header className="md-head"><div><p className="eye">{action.eyebrow}</p><h2>{action.title}</h2></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        <p className="sub-lead">{action.description}</p>
        {action.target && <div className="md-target"><small className="eye">Élément concerné</small><b>{action.target}</b></div>}
        {action.label && <label className="compose tight-compose"><span className="md-label">{action.label}<em className={action.required ? 'req' : ''}>{action.badge}</em></span><textarea rows={3} autoFocus value={text} placeholder={action.placeholder} onChange={ev => setText(ev.target.value)} /></label>}
        <footer className="md-foot"><button className="sec" onClick={close}>Annuler</button><button className={`prim tone-${action.tone}`} disabled={!!action.required && !text.trim()} onClick={() => { close(); action.run(text); }}>{action.confirm}</button></footer>
      </div>
    </Backdrop>
  );
}
