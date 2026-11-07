// "Mes livrables": the upload banner, the GitHub commit banner with its submitted commits, and the list of deliverables.
// The three popups follow the platform's design: the deliverable form, the commit selector, and the commit diff.
import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AvailableRepo, CommitDetails, MemberDto, MissionDetailDto, SubmittedCommit } from './logic';
import { dateTimeFr, Icon, Sv, type Ctx } from './shared';

const DELIVERABLE = {
  SOUMIS: ['Soumis', 'download', 'blue'], EN_REVUE: ['En revue', 'eye', 'orange'], CORRECTIONS: ['Corrections demandées', 'refresh', 'orange'],
  ACCEPTE: ['Accepté', 'check', 'green'], REFUSE: ['Rejeté', 'x', 'red']
} as const;
const SUBMISSION = { PENDING_REVIEW: ['En attente de revue', 'orange'], CHANGES_REQUESTED: ['À corriger', 'orange'], ACCEPTED: ['Accepté', 'green'], REJECTED: ['Rejeté', 'red'] } as const;
/** Example files for visitors who would rather not pick one of their own: in both cases only the name and size are kept. */
const EXAMPLES = [['rapport-api-reservation-v2.pdf', 236], ['tests-regles-reservation.zip', 48], ['documentation-endpoints.pdf', 120]] as const;
type Picked = { name: string; sizeKb: number };
type Modal = { kind: 'submit' } | { kind: 'replace'; id: number; name: string; contributors: number[] } | { kind: 'preview'; id: number; name: string; sizeKb: number } | { kind: 'select' } | { kind: 'diff'; commit: SubmittedCommit } | null;
const sizeLabel = (kb: number) => kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} Mo` : `${kb} Ko`;

export default function Deliverables({ ctx, m, reload }: { ctx: Ctx; m: MissionDetailDto; reload: () => void }) {
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState('');
  const open = m.status !== 'COMPLETEE' && m.status !== 'VALIDEE';
  const closedText = `La mission est ${m.status === 'VALIDEE' ? 'validée' : 'complétée'} : elle n’accepte plus de nouveau dépôt.`;
  const done = (status: number, body: { message?: string } | null, ok: string) => {
    if (status >= 300) { const msg = body?.message ?? 'Action impossible.'; setError(msg); ctx.toast(msg); return false; }
    setError(''); ctx.toast(ok); reload(); return true;
  };
  const remove = (id: number) => {
    ctx.app.dialog = { title: 'Supprimer ce livrable ?', text: 'Il disparaîtra de la mission avant toute revue.', ok: 'Supprimer', run: () => {
      const r = ctx.api<{ message?: string }>('DELETE', `/api/stagiaire/missions/${m.id}/deliverables/${id}`);
      done(r.status, r.body, 'Livrable supprimé.');
    } };
    ctx.refresh();
  };
  const commitsCount = m.commitSubmissions.reduce((n, s) => n + s.commits.length, 0);
  const close = () => setModal(null);

  return (
    <section className="card">
      <p className="eye">Mes livrables</p><h2>Dépôts envoyés</h2><p className="sub-lead">Historique de tes livrables, statuts de revue et commentaires de l’encadrant.</p>

      <button className="up-banner" disabled={!open} onClick={() => setModal({ kind: 'submit' })}>
        <span className="up-ic"><Sv n="upload" size={22} /></span>
        <span className="up-txt"><small>{open ? 'Déposer une nouvelle version' : 'Dépôt indisponible'}</small><b>{open ? 'Joindre un fichier et envoyer' : 'Mission fermée aux dépôts'}</b><em>{open ? 'Ajoute ton livrable puis soumets la version.' : closedText}</em></span>
      </button>

      <button className="gh-banner" disabled={!open} onClick={() => setModal({ kind: 'select' })}>
        <span className="gh-ic"><Icon name="github" /></span>
        <span className="up-txt"><small>Soumission par commit GitHub</small><b>{open ? 'Sélectionner un commit comme résolution' : 'Soumission GitHub indisponible'}</b><em>{open ? 'Choisis un ou plusieurs repositories liés à ton équipe, puis maximum un commit par repository.' : closedText}</em></span>
        <span className="gh-count">{commitsCount} soumis</span>
      </button>

      <h3 className="small-title"><Icon name="github" />Commits soumis</h3>
      {!m.commitSubmissions.length && <div className="dash-empty">Aucun commit soumis pour cette mission.</div>}
      {m.commitSubmissions.map(s => (
        <article key={s.id} className="sub-card">
          <div className="sub-top">
            <span className="person"><span className="ava">{s.author.initials}</span><span><b>{s.author.name}</b><small>{dateTimeFr(s.submittedAt)}{s.note ? ` · ${s.note}` : ''}</small></span></span>
            <span className={`badge ${SUBMISSION[s.status][1]}`}>{SUBMISSION[s.status][0]}</span>
          </div>
          {s.reviewComment && <p className="review-note"><Sv n="commit" size={15} />{s.reviewComment}</p>}
          <div className="commit-chips">
            {s.commits.map(k => (
              <button key={k.commitTraceId} className="commit-chip" onClick={() => setModal({ kind: 'diff', commit: k })}>
                <span className="sha">{k.sha}</span><span className="msg-txt">{k.message}</span><small>{k.repository} · +{k.additions} -{k.deletions}</small>
              </button>
            ))}
          </div>
        </article>
      ))}

      {error && <p className="wz-err" role="alert">{error}</p>}

      <div className="dv-list">
        {!m.deliverables.length && <div className="dash-empty">Aucun livrable déposé pour cette mission.</div>}
        {m.deliverables.map(d => {
          const [label, icon, tone] = DELIVERABLE[d.status];
          const editable = d.status === 'SOUMIS';
          return (
            <article key={d.id} className="dv-card">
              <div className="dv-main">
                <span className="ava">{d.author.initials}</span>
                <div>
                  <small className="dv-author">{d.author.name}</small>
                  <div className="dv-title"><h3>{d.file_name}</h3><span className={`badge ${tone}`}><Sv n={icon} size={13} />{label}</span></div>
                  <p className="dv-meta">Version {d.version} · envoyé le {dateTimeFr(d.submitted_at)}</p>
                  <div className="contrib-row"><small className="eye">Contributeurs</small>
                    <div className="contribs">{d.contributorList.map(p => <span key={p.id} className={`contrib${p.id === d.stagiaire_id ? ' me' : ''}`}><i>{p.initials}</i>{p.name}{p.id === d.stagiaire_id && <em>Submitter</em>}</span>)}</div>
                  </div>
                  {d.review_comment && <p className="review-note"><Sv n="commit" size={15} />{d.review_comment}</p>}
                </div>
              </div>
              <div className="dv-acts">
                {editable && <button className="small-act" onClick={() => setModal({ kind: 'replace', id: d.id, name: d.file_name, contributors: d.contributors })}><Sv n="refresh" size={15} />Remplacer</button>}
                {editable && <button className="small-act" onClick={() => remove(d.id)}><Sv n="trash" size={15} />Supprimer</button>}
                <button className="small-act" onClick={() => setModal({ kind: 'preview', id: d.id, name: d.file_name, sizeKb: d.size_kb })}><Sv n="eye" size={15} />Preview</button>
                <button className="small-act" onClick={() => ctx.toast(ctx.t.fileNote)}><Sv n="download" size={15} />Télécharger</button>
              </div>
            </article>
          );
        })}
      </div>

      {modal && ctx.layer && createPortal(
        modal.kind === 'submit' || modal.kind === 'replace' ? <FileModal ctx={ctx} m={m} modal={modal} close={close} done={done} />
          : modal.kind === 'select' ? <CommitSelector ctx={ctx} m={m} close={close} done={done} />
            : modal.kind === 'diff' ? <CommitDiff ctx={ctx} commit={modal.commit} close={close} />
              : <Preview ctx={ctx} modal={modal} close={close} />,
        ctx.layer
      )}
    </section>
  );
}

function Backdrop({ close, children, label }: { close: () => void; children: ReactNode; label: string }) {
  return <div className="md-back" role="dialog" aria-modal="true" aria-label={label} onClick={close}><div onClick={ev => ev.stopPropagation()} className="md-wrap">{children}</div></div>;
}

function FileModal({ ctx, m, modal, close, done }: { ctx: Ctx; m: MissionDetailDto; modal: { kind: 'submit' } | { kind: 'replace'; id: number; name: string; contributors: number[] }; close: () => void; done: (s: number, b: { message?: string } | null, ok: string) => boolean }) {
  const me = ctx.app.me!.id;
  const [options] = useState(() => ctx.api<(MemberDto & { isSubmitter: boolean })[]>('GET', `/api/stagiaire/missions/${m.id}/deliverable-contributor-options`).body);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [chosen, setChosen] = useState<number[]>(modal.kind === 'replace' ? modal.contributors : [me]);
  const replace = modal.kind === 'replace';
  const toggle = (id: number) => { if (id !== me) setChosen(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]); };
  const send = () => {
    if (!picked) return;
    const body = { fileName: picked.name, sizeKb: picked.sizeKb, contributorIds: chosen };
    const r = replace
      ? ctx.api<{ message?: string }>('PUT', `/api/stagiaire/missions/${m.id}/deliverables/${modal.id}`, body)
      : ctx.api<{ message?: string }>('POST', `/api/stagiaire/missions/${m.id}/deliverables`, body);
    if (done(r.status, r.body, replace ? 'Livrable remplacé.' : 'Livrable soumis.')) { ctx.step('deliver'); close(); }
  };
  return (
    <Backdrop close={close} label={replace ? 'Remplacer le livrable' : 'Soumettre un livrable'}>
      <div className="md-card">
        <i className="md-grad" />
        <header className="md-head"><div><p className="eye">{replace ? 'Remplacement livrable' : 'Dépôt livrable'}</p><h2>{replace ? 'Remplacer le livrable' : 'Soumettre un livrable'}</h2></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        <p className="sub-lead">{replace ? `Sélectionne le nouveau fichier qui remplacera ${modal.name}.` : 'Dépose ton fichier pour cette mission.'}</p>
        <label className="file-in">
          <input type="file" onChange={ev => { const f = ev.target.files?.[0]; if (f) setPicked({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) }); }} />
          <span className="file-ic"><Sv n={replace ? 'refresh' : 'upload'} size={20} /></span>
          <span><b>{picked ? picked.name : replace ? 'Choisir le nouveau fichier' : 'Choisir un fichier'}</b><small>{picked ? `${sizeLabel(picked.sizeKb)} sélectionné` : replace ? 'Le livrable garde le même identifiant avec une nouvelle version' : 'PDF, image, Word, Excel ou document projet'}</small></span>
        </label>
        <div className="examples"><small>Ou un fichier d’exemple :</small>{EXAMPLES.map(([n, kb]) => <button key={n} className={picked?.name === n ? 'on' : ''} onClick={() => setPicked({ name: n, sizeKb: kb })}>{n}</button>)}</div>
        <small className="hint">{ctx.t.fileNote}</small>
        <div className="contrib-pick">
          <div className="cp-head"><Sv n="users" size={16} /><div><b>Contributeurs</b><p>{replace ? 'Garde ou ajuste les membres qui ont contribué à cette nouvelle version.' : 'Le submitter est ajouté automatiquement. Tu peux mentionner les autres membres concernés.'}</p></div></div>
          <div className="cp-options">
            {options.map(o => (
              <button key={o.id} className={`cp-opt${chosen.includes(o.id) ? ' on' : ''}${o.isSubmitter ? ' locked' : ''}`} aria-pressed={chosen.includes(o.id)} onClick={() => toggle(o.id)}>
                <i>{o.initials}</i><span><b>{o.name}</b><small>{o.position}</small></span>{o.isSubmitter && <em>Submitter</em>}
              </button>
            ))}
          </div>
        </div>
        <footer className="md-foot"><button className="sec" onClick={close}>Annuler</button><button className="prim" disabled={!picked} onClick={send}>{replace ? 'Remplacer' : 'Soumettre'}<Sv n="upload" size={15} /></button></footer>
      </div>
    </Backdrop>
  );
}

function CommitSelector({ ctx, m, close, done }: { ctx: Ctx; m: MissionDetailDto; close: () => void; done: (s: number, b: { message?: string } | null, ok: string) => boolean }) {
  const [repos] = useState(() => ctx.api<AvailableRepo[]>('GET', `/api/stagiaire/missions/${m.id}/available-commits`).body);
  const [repoId, setRepoId] = useState<number | null>(repos[0]?.repositoryId ?? null);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const repo = repos.find(r => r.repositoryId === repoId) ?? null;
  const term = q.trim().toLowerCase();
  const shown = useMemo(() => (repo?.commits ?? []).filter(k => !term || `${k.message} ${k.sha}`.toLowerCase().includes(term)), [repo, term]);
  const count = Object.keys(draft).length;
  const pick = (repository: number, commit: number) => setDraft(d => d[repository] === commit ? Object.fromEntries(Object.entries(d).filter(([k]) => +k !== repository)) : { ...d, [repository]: commit });
  const submit = () => {
    const r = ctx.api<{ message?: string }>('POST', `/api/stagiaire/missions/${m.id}/commit-submissions`, { commitTraceIds: Object.values(draft), note });
    if (done(r.status, r.body, 'Commit soumis comme résolution.')) { ctx.step('deliver'); close(); }
  };
  return (
    <Backdrop close={close} label="Sélectionner des commits">
      <div className="md-card cs">
        <header className="md-head cs-head">
          <div><span className="cs-ic"><Icon name="github" /></span><h2>Sélectionner des commits</h2><p>Les repositories proviennent de l’équipe {m.teamName}. Le service ne propose que les commits liés à ton identité Git.</p></div>
          <button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button>
        </header>
        <div className="cs-layout">
          <aside className="cs-repos">
            {!repos.length && <div className="dash-empty">Aucun repository GitHub lié à cette équipe.</div>}
            {repos.map(r => (
              <button key={r.repositoryId} className={`repo-item${repoId === r.repositoryId || draft[r.repositoryId] ? ' on' : ''}`} onClick={() => setRepoId(r.repositoryId)}>
                <Icon name="github" /><span><b>{r.repository.split('/')[1]}</b><span>{r.repository}</span><small>{r.defaultBranch} · {r.commitsCount} commits</small></span>
              </button>
            ))}
          </aside>
          <section className="cs-commits">
            <div className="cs-title"><div><p className="eye">Repository sélectionné</p><h3>{repo?.repository ?? 'Aucun repository'}</h3></div>{repo && <span className="repo-pill"><Sv n="branch" size={14} />{repo.defaultBranch}</span>}</div>
            <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher dans les commits" placeholder="Rechercher dans les commits" value={q} onChange={ev => setQ(ev.target.value)} /></label>
            {repo && !repo.commits.length && <div className="dash-empty">Aucun commit disponible pour ce repository. Vérifie que ton identité Git est liée (section GitHub de l’équipe) et que le commit n’a pas déjà été soumis.</div>}
            {shown.map(k => (
              <button key={k.id} className={`commit-opt${draft[k.repository_id] === k.id ? ' on' : ''}`} aria-pressed={draft[k.repository_id] === k.id} onClick={() => pick(k.repository_id, k.id)}>
                <span><span className="sha">{k.sha}</span><b>{k.message}</b><small>{k.author_name} · {dateTimeFr(k.committed_at)} · {k.branch}</small></span>
                <span className="commit-stats"><i>+{k.additions}</i><s>-{k.deletions}</s><small>{k.changed_files} fichier{k.changed_files > 1 ? 's' : ''}</small></span>
              </button>
            ))}
          </section>
        </div>
        <label className="cs-note"><span>Note de soumission</span><textarea rows={2} value={note} placeholder="Exemple : implémentation backend et tests des règles" onChange={ev => setNote(ev.target.value)} /></label>
        <footer className="md-foot"><span className="draft">{count} commit{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</span><button className="sec" onClick={close}>Annuler</button><button className="prim" disabled={!count} onClick={submit}>Soumettre la sélection</button></footer>
      </div>
    </Backdrop>
  );
}

function CommitDiff({ ctx, commit, close }: { ctx: Ctx; commit: SubmittedCommit; close: () => void }) {
  const [d] = useState(() => ctx.api<CommitDetails>('POST', `/api/github/commits/${commit.commitTraceId}/sync-details`).body);
  const [at, setAt] = useState(0);
  const file = d.files[at];
  let line = 0;
  return (
    <Backdrop close={close} label={`Commit ${d.sha}`}>
      <div className="diff">
        <header className="diff-top"><div><h2>Commit <span>{d.sha}</span></h2><p>{d.authorLogin} committed · {dateTimeFr(d.committedAt)}</p></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        <div className="diff-msg">{d.message}</div>
        <div className="diff-sum"><b>{d.files.length} file{d.files.length > 1 ? 's' : ''} changed</b><i>+{d.additions}</i><s>-{d.deletions}</s></div>
        <div className="diff-layout">
          <aside className="diff-files">
            <p className="diff-card-title"><Sv n="file" size={15} />Fichiers modifiés</p>
            {d.files.map((f, i) => <button key={f.filename} className={i === at ? 'on' : ''} onClick={() => setAt(i)}><span>{f.filename}</span><small>{f.status} · +{f.additions} -{f.deletions}</small></button>)}
          </aside>
          <section className="diff-content">
            <div className="file-head"><Sv n="file" size={15} /><b>{file.filename}</b><span>+{file.additions} -{file.deletions}</span></div>
            <div className="patch">
              {file.patch.map((l, i) => {
                const kind = l.startsWith('@@') ? 'meta' : l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : 'ctx';
                if (kind === 'meta') line = Number(l.match(/\+(\d+)/)?.[1] ?? 1) - 1;
                else if (kind !== 'del') line++;
                return <div key={i} className={`pl ${kind}`}><span className="ln">{kind === 'meta' || kind === 'del' ? '' : line}</span><code>{l}</code></div>;
              })}
            </div>
          </section>
        </div>
      </div>
    </Backdrop>
  );
}

const PREVIEW: Record<string, string[]> = {
  'rapport-api-reservation.pdf': ['Rapport : API de réservation des salles', 'Choix de conception. La détection de chevauchement est faite par une requête unique sur la table reservation, avec la condition début < fin demandée et fin > début demandé.', 'Schéma. Deux tables, room et reservation, reliées par room_id. Une contrainte CHECK garantit que la fin suit le début.', 'Limites connues. Les créneaux récurrents ne sont pas encore gérés.'],
  'rapport-api-reservation-v2.pdf': ['Rapport : API de réservation des salles, version 2', 'Ajouts. La règle R2 (fin après début) et ses tests. Les erreurs suivent maintenant le format commun : code, message et champ.', 'Limites connues. Les horaires d’ouverture (règle R4) restent à couvrir par un test d’intégration.']
};
function Preview({ ctx, modal, close }: { ctx: Ctx; modal: { kind: 'preview'; id: number; name: string; sizeKb: number }; close: () => void }) {
  useState(() => ctx.api('GET', `/api/stagiaire/missions/deliverables/${modal.id}/file`));
  const text = PREVIEW[modal.name];
  return (
    <Backdrop close={close} label={modal.name}>
      <div className="md-card">
        <i className="md-grad" />
        <header className="md-head"><div><p className="eye">Aperçu document</p><h2>{modal.name}</h2></div><button className="round" aria-label="Fermer" onClick={close}><Sv n="x" /></button></header>
        {text
          ? <article className="pdf-page">{text.map((p, i) => i === 0 ? <p key={i}><b>{p}</b></p> : <p key={i}>{p}</p>)}</article>
          : <div className="dash-empty">Aperçu indisponible dans la démo : seul le nom du fichier ({sizeLabel(modal.sizeKb)}) a été enregistré.</div>}
        <footer className="md-foot"><button className="sec" onClick={close}>Fermer</button><button className="prim" onClick={() => ctx.toast(ctx.t.fileNote)}>Télécharger<Sv n="download" size={15} /></button></footer>
      </div>
    </Backdrop>
  );
}
