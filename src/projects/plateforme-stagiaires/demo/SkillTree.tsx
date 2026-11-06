// The acquired skills of a team, as a tree on a canvas the visitor can drag and zoom: member, validated mission, skill.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { CompetenceTree } from './logic';
import { dateFr, Sv, type Ctx } from './shared';

const MEMBER_W = 170, MISSION_W = 180, SKILL_W = 112, GAP = 8, GAP_Y = 92, TOP = 26, ROW = 70;
type Laid = { x: number; y: number };

/** Lays the tree out: skills in a row, each mission over its skills, each member over its missions. */
function layout(tree: CompetenceTree) {
  let cursor = 20;
  const members = tree.members.map(m => {
    const start = cursor;
    const missions = m.missions.map(x => {
      const from = cursor;
      const skills = x.competences.map(c => { const at: Laid = { x: cursor, y: TOP + GAP_Y * 2 + ROW }; cursor += SKILL_W + GAP; return { name: c, at }; });
      const width = Math.max(cursor - GAP - from, MISSION_W);
      if (cursor - GAP - from < MISSION_W) cursor = from + MISSION_W + GAP;
      return { ...x, skills, at: { x: from + (width - MISSION_W) / 2, y: TOP + GAP_Y + ROW / 2 } as Laid };
    });
    if (!m.missions.length) cursor += MEMBER_W + GAP;
    const width = cursor - GAP - start;
    const node = { ...m, missions, at: { x: start + (width - MEMBER_W) / 2, y: TOP } as Laid };
    cursor += 18;
    return node;
  });
  return { members, width: cursor + 10, height: TOP + GAP_Y * 2 + ROW + 80 };
}

export default function SkillTree({ ctx, teamId }: { ctx: Ctx; teamId: number }) {
  const [tree] = useState(() => ctx.api<CompetenceTree>('GET', `/api/stagiaire/teams/${teamId}/acquired-competences`).body);
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState(.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<{ name: string; mission: string; date: string } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const laid = useMemo(() => layout(tree), [tree]);
  const box = useRef<HTMLDivElement>(null);
  /** the zoom that shows the whole tree in the canvas */
  const fit = () => Math.max(.6, Math.min(1, Math.floor((box.current?.clientWidth ?? 800) / laid.width * 20) / 20));
  useEffect(() => { ctx.step('skills'); setZoom(fit()); }, []);

  const term = q.trim().toLowerCase();
  const hit = (s: string) => !term || s.toLowerCase().includes(term);
  const total = laid.members.reduce((n, m) => n + m.missions.reduce((k, x) => k + x.skills.length, 0), 0);
  const down = (ev: RPointerEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest('button')) return;
    drag.current = { x: ev.clientX, y: ev.clientY, px: pan.x, py: pan.y };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const move = (ev: RPointerEvent<HTMLDivElement>) => {
    if (drag.current) setPan({ x: drag.current.px + ev.clientX - drag.current.x, y: drag.current.py + ev.clientY - drag.current.y });
  };
  const reset = () => { setZoom(fit()); setPan({ x: 0, y: 0 }); setQ(''); setPicked(null); };

  return (
    <section className="card">
      <div className="sec-top">
        <div><p className="eye">Progression</p><h2>Compétences acquises</h2><p className="sub-lead">Chaque compétence vient d’une mission validée par l’encadrant. {total} compétence{total > 1 ? 's' : ''} acquise{total > 1 ? 's' : ''} dans l’équipe.</p></div>
      </div>
      <div className="tree-tools">
        <label className="search"><Sv n="search" size={14} /><input aria-label="Rechercher dans l’arbre" placeholder="Rechercher stagiaire ou mission..." value={q} onChange={ev => setQ(ev.target.value)} /></label>
        <button className="round" aria-label="Réduire" title="Réduire" onClick={() => setZoom(z => Math.max(.6, +(z - .1).toFixed(2)))}><Sv n="minus" /></button>
        <span className="zoom">{Math.round(zoom * 100)} %</span>
        <button className="round" aria-label="Agrandir" title="Agrandir" onClick={() => setZoom(z => Math.min(1.4, +(z + .1).toFixed(2)))}><Sv n="plus" /></button>
        <button className="sec" onClick={reset}><Sv n="refresh" size={14} />Réinitialiser</button>
      </div>
      <div className="tree" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="tree-in" style={{ width: laid.width, height: laid.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg width={laid.width} height={laid.height} aria-hidden="true">
            {laid.members.flatMap(m => m.missions.flatMap(x => {
              const mx = m.at.x + MEMBER_W / 2, my = m.at.y + ROW - 8, tx = x.at.x + MISSION_W / 2, ty = x.at.y;
              return [
                <path key={`m${x.id}`} d={`M${mx} ${my} C${mx} ${my + 40} ${tx} ${ty - 40} ${tx} ${ty}`} />,
                ...x.skills.map(s => {
                  const sx = s.at.x + SKILL_W / 2, sy = s.at.y;
                  return <path key={`s${x.id}${s.name}`} d={`M${tx} ${ty + ROW - 12} C${tx} ${ty + ROW + 20} ${sx} ${sy - 32} ${sx} ${sy}`} />;
                })
              ];
            }))}
          </svg>
          {laid.members.map(m => {
            const dim = term && !hit(m.name) && !m.missions.some(x => hit(x.title) || x.skills.some(s => hit(s.name)));
            return (
              <div key={m.id}>
                <div className={`t-member${dim ? ' dim' : ''}`} style={{ left: m.at.x, top: m.at.y, width: MEMBER_W }}><span className="ava">{m.initials}</span><span><b>{m.name}</b><small>{m.position}</small></span></div>
                {!m.missions.length && <div className="t-none" style={{ left: m.at.x, top: m.at.y + ROW + 10, width: MEMBER_W }}>Aucune mission validée pour l’instant</div>}
                {m.missions.map(x => (
                  <div key={x.id}>
                    <div className={`t-mission${term && !hit(x.title) && !hit(m.name) ? ' dim' : ''}`} style={{ left: x.at.x, top: x.at.y, width: MISSION_W }}><b>{x.title}</b><small>Validée le {dateFr(x.validatedAt)}</small></div>
                    {x.skills.map(s => (
                      <button key={s.name} className={`t-skill${term && !hit(s.name) && !hit(x.title) && !hit(m.name) ? ' dim' : ''}${picked?.name === s.name ? ' on' : ''}`} style={{ left: s.at.x, top: s.at.y, width: SKILL_W }} onClick={() => setPicked({ name: s.name, mission: x.title, date: x.validatedAt })}>
                        <span className="t-spark"><Sv n="spark" size={15} /></span>{s.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {picked
        ? <div className="tree-info"><span className="t-spark"><Sv n="check" size={15} /></span><p><b>{picked.name}</b>Mission associée : {picked.mission}. Validée le {dateFr(picked.date)}.</p></div>
        : <p className="tree-hint">Faites glisser le canevas pour vous déplacer, et cliquez sur une compétence pour lire son détail.</p>}
    </section>
  );
}
