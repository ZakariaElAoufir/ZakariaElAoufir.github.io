// The screens that stand in for what the demo does not rebuild: a teammate's module, or a part of Zakaria's own that is not reconstructed.
import profile from '../../../content/profile/profile.json';
import { Icon, Logo, Sv, type Ctx } from './shared';

export const OWNERS = {
  redouane: { name: 'Redouane Boulhimez', url: 'https://github.com/redouaneboulhimez' },
  aya: { name: 'Aya Amayou', url: 'https://github.com/ayaamayou' }
} as const;
export type Owner = keyof typeof OWNERS;

/** Centered in the page: this part belongs to a teammate, with a button to their GitHub. */
export function Credit({ ctx, owner, module }: { ctx: Ctx; owner: Owner; module: string }) {
  const { t } = ctx, who = OWNERS[owner];
  return (
    <div className="notice">
      <div className="notice-card">
        <span className="notice-mark"><Logo size={44} /></span>
        <p className="notice-mod">{module}</p>
        <h2><span>{t.credit.owner}</span> {who.name}</h2>
        <p>{t.credit.demo}</p>
        <div className="notice-acts">
          <a className="cbtn dark" href={who.url} target="_blank" rel="noopener"><Icon name="github" />{t.credit.github}</a>
          {ctx.app.past.length > 0 && <button className="cbtn" onClick={ctx.back}><Sv n="left" />{t.credit.backTo}</button>}
        </div>
      </div>
    </div>
  );
}

/** The contact buttons: GitHub, LinkedIn and mail. */
export function ContactButtons({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  return (
    <div className="notice-acts">
      <a className="cbtn dark" href={profile.github} target="_blank" rel="noopener"><Icon name="github" />{t.contact.github}</a>
      <a className="cbtn blue" href={profile.linkedin} target="_blank" rel="noopener"><Icon name="linkedin" />{t.contact.linkedin}</a>
      <a className="cbtn orange" href={`mailto:${profile.email}`}><Icon name="mail" />{t.contact.mail}</a>
    </div>
  );
}

/** This part is Zakaria's, but is not rebuilt here: the visitor can ask him about it. */
export function Contact({ ctx, module, inline }: { ctx: Ctx; module: string; inline?: boolean }) {
  const { t } = ctx;
  const card = (
    <div className="notice-card">
      <span className="notice-mark"><Logo size={44} /></span>
      <p className="notice-mod">{module}</p>
      <h2>{t.contact.title}</h2>
      <p>{t.contact.text}</p>
      <ContactButtons ctx={ctx} />
      {!inline && ctx.app.past.length > 0 && <button className="notice-back" onClick={ctx.back}><Sv n="left" />{t.contact.backTo}</button>}
    </div>
  );
  return inline ? <div className="notice inline">{card}</div> : <div className="notice">{card}</div>;
}

/** A screen of a later stage of the rebuild. */
export function Later({ ctx, module }: { ctx: Ctx; module: string }) {
  const { t } = ctx;
  return (
    <div className="notice">
      <div className="notice-card">
        <span className="notice-mark"><Logo size={44} /></span>
        <p className="notice-mod">{module}</p>
        <h2>{t.later.title}</h2>
        <p>{t.later.text}</p>
        {ctx.app.past.length > 0 && <button className="notice-back" onClick={ctx.back}><Sv n="left" />{t.contact.backTo}</button>}
      </div>
    </div>
  );
}
