import { useEffect, useRef, useState } from 'react';
import logo from '../media/logo.png';
import { ask, conversationLabel, initialConversations, OFF_TOPIC, SUGGESTIONS, type Conversation, type Exchange, type Reply } from './logic';
import { strings } from './strings';
import './demo.css';

type Props = { lang: 'fr' | 'en' };
type Hood = { reply: Exclude<Reply, { kind: 'unknown' }> } | null;

const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;
const Avatar = ({ who }: { who: 'user' | 'bot' }) => (
  <span className="av" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {who === 'user'
        ? <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>
        : <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 4v4M9 13h.01M15 13h.01" /></>}
    </svg>
  </span>
);
const paragraphs = (e: Exchange) => (e.offTopic ? [OFF_TOPIC] : e.paragraphs);

/** The AgriGPT Streamlit interface, rebuilt in React with a mocked backend. */
export default function AgriGptDemo({ lang }: Props) {
  const t = strings[lang];
  const [convs, setConvs] = useState<Conversation[]>(initialConversations);
  const [current, setCurrent] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState(false);
  const [warn, setWarn] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [preview, setPreview] = useState(false);
  const [full, setFull] = useState(false);
  const [hood, setHood] = useState<Hood>(null);
  const main = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const conversation = convs.find(c => c.id === current);
  const messages = conversation?.messages ?? [];

  // full screen: the demo in front of everything, Esc brings it back
  useEffect(() => {
    document.body.classList.toggle('demo-locked', full);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (preview) setPreview(false); else setFull(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full, preview]);

  useEffect(() => { main.current?.scrollTo({ top: main.current.scrollHeight }); }, [messages.length]);

  const open = (id: string | null) => { setCurrent(id); setWarn(false); setCanDownload(false); };

  const send = () => {
    const text = question.trim();
    if (running || !text) return;
    const reply = ask(text);
    if (reply.kind === 'unknown') { setNotice(true); return; }
    setNotice(false);
    setRunning(true);
    // the real app waits for Ollama; the demo just pretends for a moment
    setTimeout(() => {
      const id = current ?? `c${Date.now()}`;
      setConvs(list => {
        const exists = list.some(c => c.id === id);
        const withConv = exists ? list : [{ id, messages: [] }, ...list];
        return withConv.map(c => (c.id === id ? { ...c, messages: [...c.messages, reply.exchange] } : c));
      });
      setCurrent(id);
      setQuestion('');
      setRunning(false);
      setWarn(false);
      setCanDownload(false);
      setHood({ reply });
    }, 1300);
  };

  const exportPdf = () => {
    if (!messages.length) { setWarn(true); setCanDownload(false); return; }
    setWarn(false);
    setCanDownload(true);
  };

  return (
    <div className="agd">
      <div className="wide">
        <div className={`window${full ? ' max' : ''}`}>
          <div className="chrome">
            <span className="dots"><i /><i /><i /></span>
            <span className="url">localhost:8501</span>
            <button className="btn small ghost" aria-pressed={full} onClick={() => setFull(f => !f)}>
              <Icon name="layers" />{full ? t.exitFullscreen : t.fullscreen}
            </button>
          </div>
          <div className="suggest">
            <p>{t.suggestions}</p>
            <div className="list">
              {SUGGESTIONS.map((q, i) => (
                <button key={q} className={i === SUGGESTIONS.length - 1 ? 'off' : ''} onClick={() => { setQuestion(q); input.current?.focus(); }}>{q}</button>
              ))}
            </div>
          </div>

          <div className="st" lang="fr">
            <aside className="st-side">
              <img src={logo.src} alt="Logo AgriGPT" width={150} height={150} />
              <h3><Icon name="layers" />Historique des conversations</h3>
              <div className="conv">
                {convs.map(c => (
                  <button key={c.id} className={`st-btn${c.id === current ? ' on' : ''}`} onClick={() => open(c.id)}>{conversationLabel(c)}</button>
                ))}
              </div>
              <hr className="st-hr" />
              <button className="st-btn" onClick={() => open(null)}><b>+</b> Nouvelle conversation</button>
            </aside>

            <section className="st-main" ref={main}>
              <div className="st-top" aria-live="polite">{running && <span className="run"><i />Running...</span>}</div>
              <div className="st-head">
                <div>
                  <h1>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 22V11" /><path d="M12 11c0-4 3-7 8-7 0 5-3 8-8 7z" /><path d="M12 14c0-3-2.5-5.5-7-5.5 0 4 2.5 6.5 7 5.5z" /></svg>
                    AgriGPT – Assistant Agricole Intelligent
                  </h1>
                  <p className="st-caption">Système de question-réponse basé sur des documents agricoles officiels</p>
                </div>
                <div className="st-pdf">
                  <button className="st-btn" onClick={exportPdf}><Icon name="download" />Exporter en PDF</button>
                  {canDownload && <button className="st-btn" onClick={() => setPreview(true)}><Icon name="download" />Télécharger le PDF</button>}
                </div>
              </div>
              {warn && <p className="st-warn">Aucune conversation à exporter.</p>}
              <hr className="st-hr" />

              {messages.map((m, i) => (
                <div key={i}>
                  <div className="msg user"><Avatar who="user" /><div><p className="lab">Question</p><p>{m.question}</p></div></div>
                  <div className="msg bot"><Avatar who="bot" /><div>
                    <p className="lab">Réponse</p>
                    {paragraphs(m).map((p, j) => <p key={j}>{p}</p>)}
                    {!m.offTopic && m.sources.length > 0 && <p className="src">Sources : {m.sources.join(', ')}</p>}
                  </div></div>
                  <hr className="st-hr" />
                </div>
              ))}

              <div className="st-input">
                <label htmlFor="agd-q">Question agricole</label>
                <input id="agd-q" ref={input} autoComplete="off" value={question} placeholder="Exemple : Comment gérer l’irrigation du blé en zone semi-aride ?"
                  onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
                <button className="st-btn" onClick={send} disabled={running}>Envoyer</button>
                {notice && <p className="notice" lang={lang}>{t.unknown}</p>}
              </div>
            </section>

            {preview && conversation && (
              <div className="pdf" role="dialog" aria-modal="true" aria-label="Aperçu du PDF">
                <div>
                  <div className="page">
                    <img src={logo.src} alt="" width={60} height={60} />
                    <h4>AgriGPT – Historique de conversation</h4>
                    {conversation.messages.map((m, i) => (
                      <div key={i}>
                        <b>Question {i + 1} :</b><p>{m.question}</p>
                        <b>Réponse :</b><p>{paragraphs(m).join(' ')}</p>
                        {!m.offTopic && <p className="s">Sources : {m.sources.join(', ')}</p>}
                      </div>
                    ))}
                  </div>
                  <button className="btn small close" onClick={() => setPreview(false)} lang={lang}>{t.closePreview}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="hood" aria-live="polite">
        <h2>{t.hoodTitle}</h2>
        <p>{!hood ? t.hoodIdle : hood.reply.kind === 'refusal' ? t.hoodRefusal : t.hoodAnswer}</p>
        <div className="steps">
          {t.steps.map(([title, idle], i) => {
            const r = hood?.reply;
            let text: React.ReactNode = idle, cls = '';
            if (r?.kind === 'refusal') {
              [text, cls] = i === 0 ? [t.refused, 'stop'] : i === 4 ? [t.savedRefusal, 'done'] : [t.skipped, ''];
            } else if (r?.kind === 'answer') {
              const a = r.exchange;
              cls = 'done';
              text = [<>{t.keywordFound} <code>{r.keyword}</code></>, t.embedded, t.bestDistance(a.chunks[0].distance), t.prompt(a.chunks.length),
                <>{t.saved} <code>{a.sources.join(', ')}</code></>][i];
            }
            return <div key={title} className={`step ${cls}`}><span className="n">{i + 1}</span><h3>{title}</h3><p>{text}</p></div>;
          })}
        </div>
        {hood?.reply.kind === 'answer' && (
          <div className="chunks">
            {hood.reply.exchange.chunks.map(c => (
              <div key={c.text} className="chunk"><span className="f">{c.source}</span><span className="t" lang="fr">{c.text}</span><span className="d">{c.distance}</span></div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
