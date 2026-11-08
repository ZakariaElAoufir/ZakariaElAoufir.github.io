// The screens that stand in for what the demo does not rebuild: a teammate's area, or a screen of a later stage.
import { Icon, Sv, type Ctx } from './shared';

export const OWNERS = {
  admin: { name: 'Younes9976', url: 'https://github.com/Younes9976' },
  client: { name: 'hslimi212', url: 'https://github.com/hslimi212' }
} as const;

/** Shown after signing in as an administrator or a client: that area belongs to a teammate. */
export function Credit({ ctx, owner }: { ctx: Ctx; owner: keyof typeof OWNERS }) {
  const { t } = ctx, who = OWNERS[owner];
  return (
    <div className="notice">
      <div className="notice-card">
        <p className="notice-mod">{t.credit.modules[owner]}</p>
        <h2><span>{t.credit.owner}</span> {who.name}</h2>
        <p>{t.credit.demo}</p>
        <div className="notice-acts">
          <a className="cbtn dark" href={who.url} target="_blank" rel="noopener"><Icon name="github" />{t.credit.github}</a>
          <button className="cbtn" onClick={ctx.logout}><Sv n="logout" />{t.credit.logout}</button>
        </div>
      </div>
    </div>
  );
}

export function Later({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  return (
    <div className="notice">
      <div className="notice-card">
        <h2>{t.later.title}</h2>
        <p>{t.later.text}</p>
        <div className="notice-acts"><button className="cbtn" onClick={ctx.back}><Sv n="left" />{t.later.back}</button></div>
      </div>
    </div>
  );
}
