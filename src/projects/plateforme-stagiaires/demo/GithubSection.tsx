// The team's GitHub workflow, mocked from the platform's design: the repository, its branches and commits, its files and the Git identities.
import { useEffect, useState } from 'react';
import type { CommitRow, ContentItem, FileDto, GitIdentity, MemberDto, RepositoryDto } from './logic';
import { dateTimeFr, Icon, Sv, type Ctx } from './shared';

type Tab = 'summary' | 'branches' | 'commits' | 'files' | 'identity';
const TABS: [Tab, string][] = [['summary', 'Résumé'], ['branches', 'Branches'], ['commits', 'Commits'], ['files', 'Fichiers'], ['identity', 'Identité Git']];

export default function GithubSection({ ctx, teamId, teamName, members, readOnly }: { ctx: Ctx; teamId: number; teamName: string; members: MemberDto[]; readOnly?: boolean }) {
  const [repo, setRepo] = useState<RepositoryDto | null>(() => ctx.api<RepositoryDto[]>('GET', `/api/github/teams/${teamId}/repositories`).body[0] ?? null);
  const [tab, setTab] = useState<Tab>('summary');
  const mock = () => ctx.toast(ctx.t.mockAction);
  const refresh = () => {
    const r = ctx.api<RepositoryDto[]>('POST', `/api/github/teams/${teamId}/repositories/refresh-selection`);
    if (r.body[0]) setRepo(r.body[0]);
    ctx.toast('Repositories actualisés.');
  };
  const open = (next: Tab) => { setTab(next); if (next !== 'summary') ctx.step('github'); };

  return (
    <section className="card gh">
      <div className="sec-top">
        <div><p className="eye">GitHub et équipe</p><h2>Workflow GitHub</h2><p className="sub-lead">Liaison du repository, synchronisation, branches, commits, fichiers et identité Git du stagiaire.</p></div>
        {!readOnly && <div className="gh-acts">
          <button className="sec" onClick={mock}><Icon name="github" />Modifier la sélection GitHub</button>
          <button className="prim" onClick={refresh}><Sv n="refresh" size={14} />Actualiser les repositories</button>
        </div>}
      </div>
      {!repo ? (
        <div className="empty roomy">
          <Sv n="git" size={26} />
          <b>Aucun repository lié</b>
          <p>Aucun repository GitHub n’est encore rattaché à {teamName}. Dans cette démo, seules les équipes du sujet ROOMS ont un dépôt simulé.</p>
        </div>
      ) : (
        <>
          <dl className="kpis four">
            <div><dt>Repository</dt><dd>1</dd></div>
            <div><dt>Branches</dt><dd>{repo.branches.length}</dd></div>
            <div><dt>Commits</dt><dd>{repo.commits}</dd></div>
            <div><dt>Synchronisation</dt><dd className="ok">Active</dd></div>
          </dl>
          <div className="repo-card">
            <span className="gh-tile"><Icon name="github" /></span>
            <div><b>{repo.fullName}</b><small>Dernière synchronisation : {dateTimeFr(repo.lastSyncAt)}</small></div>
            <span className="chips"><i>Privé</i><i className="green">Actif</i></span>
          </div>
          <div className="gh-tabs" role="tablist">
            {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => open(id)}>{label}</button>)}
          </div>
          {tab === 'summary' && (
            <div className="info-cards">
              <div><h4>Repo lié</h4><p>{repo.fullName}, branche par défaut {repo.defaultBranch}.</p></div>
              <div><h4>Sync active</h4><p>Les webhooks de la GitHub App tiennent les branches et les commits à jour.</p></div>
              <div><h4>Équipe</h4><p>{teamName}, {members.length} membre{members.length > 1 ? 's' : ''}.</p></div>
            </div>
          )}
          {tab === 'branches' && (
            <>
              <h3 className="gh-h">Branches du repository</h3>
              <ul className="rows flat">
                {repo.branches.map(b => (
                  <li key={b.id}><div className="gh-row"><Sv n="branch" /><span className="row-main"><b>{b.name}</b><small>HEAD {b.head_sha}</small></span>{b.is_default && <span className="chips"><i className="blue">default</i></span>}<button className="sec small" onClick={mock}><Sv n="download" size={14} />Télécharger ZIP</button></div></li>
                ))}
              </ul>
            </>
          )}
          {tab === 'commits' && <Commits ctx={ctx} repo={repo} />}
          {tab === 'files' && <Files ctx={ctx} repo={repo} />}
          {tab === 'identity' && <Identities ctx={ctx} teamId={teamId} repo={repo} members={members} />}
        </>
      )}
    </section>
  );
}

const BranchPick = ({ repo, value, onChange }: { repo: RepositoryDto; value: string; onChange: (v: string) => void }) => (
  <label className="branch"><Sv n="branch" size={14} /><select aria-label="Branche" value={value} onChange={ev => onChange(ev.target.value)}>{repo.branches.map(b => <option key={b.id}>{b.name}</option>)}</select></label>
);

function Commits({ ctx, repo }: { ctx: Ctx; repo: RepositoryDto }) {
  const [branch, setBranch] = useState('feature/reservations-api');
  const [list, setList] = useState<CommitRow[]>([]);
  useEffect(() => { setList(ctx.api<CommitRow[]>('GET', `/api/github/repositories/${repo.id}/commits?branch=${encodeURIComponent(branch)}`).body); }, [branch]);
  return (
    <>
      <div className="gh-head"><h3 className="gh-h">Commits récents</h3><BranchPick repo={repo} value={branch} onChange={setBranch} /></div>
      <ul className="rows flat">
        {list.map(c => (
          <li key={c.id}><div className="gh-row"><Sv n="commit" /><span className="row-main"><b>{c.message}</b><small>{c.author_name}, @{c.author_login}, {dateTimeFr(c.committed_at)}</small></span><code>{c.sha}</code><span className="diff"><i>+{c.additions}</i><s>-{c.deletions}</s></span></div></li>
        ))}
      </ul>
    </>
  );
}

function Files({ ctx, repo }: { ctx: Ctx; repo: RepositoryDto }) {
  const [branch, setBranch] = useState('feature/reservations-api');
  const [path, setPath] = useState('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [q, setQ] = useState('');
  const [file, setFile] = useState<FileDto | null>(null);
  const [missing, setMissing] = useState('');
  useEffect(() => {
    setItems(ctx.api<ContentItem[]>('GET', `/api/github/repositories/${repo.id}/contents?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`).body);
  }, [branch, path]);
  const read = (target: string, on = branch) => {
    const r = ctx.api<FileDto & { message?: string }>('GET', `/api/github/repositories/${repo.id}/files?branch=${encodeURIComponent(on)}&path=${encodeURIComponent(target)}`);
    if (r.status === 200) { setFile(r.body); setMissing(''); } else { setFile(null); setMissing(r.body.message ?? ''); }
  };
  const parts = path ? path.split('/') : [];
  const shown = items.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="files">
      <aside>
        <h3 className="gh-h">Fichiers</h3>
        <p className="sub-lead">Navigation dans le repository</p>
        <BranchPick repo={repo} value={branch} onChange={v => { setBranch(v); setPath(''); setFile(null); setMissing(''); }} />
        <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher dans ce dossier" placeholder="Rechercher dans ce dossier..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
        <p className="crumbs">
          <button onClick={() => setPath('')}>racine</button>
          {parts.map((p, i) => <span key={i}> / <button onClick={() => setPath(parts.slice(0, i + 1).join('/'))}>{p}</button></span>)}
        </p>
        <ul>
          {path && <li><button onClick={() => { setQ(''); setPath(parts.slice(0, -1).join('/')); }}><Sv n="left" size={14} /><span><b>Dossier parent</b></span></button></li>}
          {shown.map(i => (
            <li key={i.path}><button className={file?.path === i.path ? 'on' : ''} onClick={() => { setQ(''); i.type === 'dir' ? setPath(i.path) : read(i.path); }}><Sv n={i.type === 'dir' ? 'folder' : 'file'} size={14} /><span><b>{i.name}</b><small>{i.message}</small></span></button></li>
          ))}
          {!shown.length && <li className="none">Rien ici ne correspond à cette recherche.</li>}
        </ul>
      </aside>
      <div className="code">
        {file ? (
          <>
            <header><b>{file.path}</b><small>{file.lines} lignes, {file.sha}</small></header>
            <ol>{file.content.replace(/\n$/, '').split('\n').map((l, i) => <li key={i}><code>{l || ' '}</code></li>)}</ol>
          </>
        ) : <div className="code-empty"><Sv n="file" size={24} /><b>{missing || 'Sélectionne un fichier'}</b><span>Son contenu s’affiche ici, sur la branche choisie.</span></div>}
      </div>
    </div>
  );
}

function Identities({ ctx, teamId, repo, members }: { ctx: Ctx; teamId: number; repo: RepositoryDto; members: MemberDto[] }) {
  const [list, setList] = useState<GitIdentity[]>(() => ctx.api<GitIdentity[]>('GET', `/api/github/teams/${teamId}/git-identities`).body);
  const link = (g: GitIdentity) => {
    const r = ctx.api<GitIdentity & { message?: string }>('POST', `/api/github/teams/${teamId}/git-identities/${g.id}/link`);
    if (r.status === 200) { setList(ctx.api<GitIdentity[]>('GET', `/api/github/teams/${teamId}/git-identities`).body); ctx.toast(`@${g.login} est liée à votre profil.`); }
    else ctx.toast(r.body?.message ?? 'Liaison impossible.');
  };
  const me = ctx.app.me!;
  return (
    <>
      <h3 className="gh-h">Identités Git détectées</h3>
      <p className="sub-lead">Le service relie chaque auteur de commit au profil du stagiaire qui lui correspond.</p>
      <ul className="rows flat">
        {list.map(g => {
          const who = members.find(m => m.id === g.linked_user_id);
          return (
            <li key={g.id}><div className="gh-row">
              <Sv n="git" />
              <span className="row-main"><b>@{g.login}</b><small>{g.email}, {g.commits} commit{g.commits > 1 ? 's' : ''} sur {repo.fullName}</small></span>
              {g.linked_user_id
                ? <span className="chips"><i className="green">Liée</i><i>{who?.name ?? 'Profil lié'}</i></span>
                : g.email === me.email
                  ? <button className="sec small" onClick={() => link(g)}><Sv n="link" size={14} />Lier à mon profil</button>
                  : <span className="chips"><i className="orange">Non liée</i></span>}
            </div></li>
          );
        })}
      </ul>
    </>
  );
}
