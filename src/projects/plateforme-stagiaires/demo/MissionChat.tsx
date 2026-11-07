// The mission's AI assistant: a floating chat that answers only about this mission, with the passages of the instructions it used.
import { useEffect, useRef, useState } from 'react';
import type { ChatAnswer, ChatHistory, MissionDetailDto } from './logic';
import { Sv, type Ctx } from './shared';

type Msg = { role: 'USER' | 'ASSISTANT'; content: string; scope?: string | null; sources?: ChatAnswer['sources']; partial?: boolean };
const SUGGESTIONS = ['Quelles règles métier dois-je respecter ?', 'Quel format de date l’API attend-elle ?', 'Quels tests sont attendus ?', 'Par où commencer ?', 'Quel temps fera-t-il demain ?'];
const SCOPE: Record<string, string> = { MISSION_CONTEXT_ONLY: 'Dans le contexte', OUT_OF_SCOPE: 'Hors sujet', INSUFFICIENT_CONTEXT: 'Contexte insuffisant' };

export default function MissionChat({ ctx, mission }: { ctx: Ctx; mission: MissionDetailDto }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'thinking' | 'typing' | null>(null);
  const timer = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => () => { clearInterval(timer.current); clearTimeout(timer.current); }, []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs, busy]);

  const toggle = () => {
    if (!open && !msgs) setMsgs(ctx.api<ChatHistory>('GET', `/api/ai/missions/${mission.id}/chat/history`).body.map(x => ({ role: x.role, content: x.content, scope: x.scope })));
    setOpen(o => !o);
  };
  const ask = (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setText('');
    setMsgs(m => [...(m ?? []), { role: 'USER', content: question }]);
    setBusy('thinking');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => {
      const r = ctx.api<ChatAnswer & { message?: string }>('POST', `/api/ai/missions/${mission.id}/chat`, { question });
      if (r.status !== 200) { setMsgs(m => [...(m ?? []), { role: 'ASSISTANT', content: r.body.message ?? 'Le service IA ne répond pas.', scope: null }]); setBusy(null); return; }
      ctx.step('chat');
      const full = r.body;
      if (reduce) { setMsgs(m => [...(m ?? []), { role: 'ASSISTANT', content: full.answer, scope: full.scope, sources: full.sources }]); setBusy(null); return; }
      // the real widget streams the answer: here it is revealed a few words at a time
      const words = full.answer.split(/(\s+)/);
      let shown = 0;
      setBusy('typing');
      setMsgs(m => [...(m ?? []), { role: 'ASSISTANT', content: '', partial: true }]);
      timer.current = window.setInterval(() => {
        shown = Math.min(words.length, shown + 4);
        const done = shown >= words.length;
        setMsgs(m => { const next = [...(m ?? [])]; next[next.length - 1] = { role: 'ASSISTANT', content: words.slice(0, shown).join(''), partial: !done, scope: done ? full.scope : null, sources: done ? full.sources : undefined }; return next; });
        if (done) { clearInterval(timer.current); setBusy(null); }
      }, 45);
    }, reduce ? 0 : 900);
  };
  const stop = () => {
    clearInterval(timer.current); clearTimeout(timer.current);
    if (busy === 'typing') ctx.api('POST', `/api/ai/missions/${mission.id}/chat/cancel`);
    setMsgs(m => {
      const next = [...(m ?? [])];
      if (busy === 'typing') next.pop();
      next.pop();
      return [...next, { role: 'ASSISTANT', content: 'Génération arrêtée : ta question a été retirée de l’historique.', scope: null }];
    });
    setBusy(null);
  };

  if (!open) return <button className="chat-fab" onClick={toggle}><span className="bot"><Sv n="spark" size={16} /></span><span><b>Assistant IA</b><small>Prêt à vous aider</small></span></button>;
  return (
    <div className="pop chat" role="dialog" aria-label="Assistant IA">
      <header>
        <span className="tile bot"><Sv n="spark" /><i className="online" /></span>
        <div><b>Assistant IA</b><small>{mission.title}</small></div>
        <button className="round dark" aria-label="Réduire l’assistant" onClick={toggle}><Sv n="down" size={15} /></button>
      </header>
      <div className="chat-list" ref={list} aria-live="polite">
        <p className="msg ai">Bonjour, je suis l’assistant de la mission « {mission.title} ». Je réponds à partir de ses informations{mission.attachments.length ? ' et de son cahier des charges' : ''}.</p>
        {msgs?.map((x, i) => (
          <div key={i} className={`msg ${x.role === 'USER' ? 'me' : 'ai'}`}>
            {x.content.split('\n').map((l, k) => <p key={k}>{l}</p>)}
            {x.partial && <span className="caret" />}
            {x.scope && <span className={`scope sc-${x.scope}`}>{SCOPE[x.scope]}</span>}
            {!!x.sources?.length && (
              <details className="srcs"><summary>{x.sources.length} passage{x.sources.length > 1 ? 's' : ''} du cahier des charges</summary>
                {x.sources.map((s, k) => <p key={k}><b>Page {s.page}</b> <em>pertinence {s.score.toFixed(2)}</em><br />{s.excerpt}…</p>)}
              </details>
            )}
          </div>
        ))}
        {busy === 'thinking' && <p className="thinking"><i /><i /><i />Recherche dans la mission…</p>}
      </div>
      {!busy && (
        <div className="sugg">{SUGGESTIONS.filter(s => mission.attachments.length || !/format de date|tests/.test(s)).map(s => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
      )}
      <form className="chat-in" onSubmit={ev => { ev.preventDefault(); ask(text); }}>
        <textarea rows={2} aria-label="Votre question" placeholder="Pose une question sur la mission…" value={text} onChange={ev => setText(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ask(text); } }} />
        {busy
          ? <button type="button" className="send stop" aria-label="Arrêter la génération" title="Arrêter" onClick={stop}><Sv n="x" /></button>
          : <button className="send" aria-label="Envoyer" disabled={!text.trim()}><Sv n="arrow" /></button>}
      </form>
      <small className="ai-note">{ctx.t.aiNote}</small>
    </div>
  );
}
