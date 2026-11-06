// What every screen of the demo shares: the app context, the small icon set and the date formats.
import type { ReactNode } from 'react';
import type { Engine, Method, Res, Step } from './logic';
import type { DemoStrings } from './strings';

export type Lang = 'fr' | 'en';
export type Dialog = { title: string; text: string; ok: string; run: () => void } | null;
export type Me = { id: number; name: string; first: string; initial: string; email: string; initials: string; role: 'STAGIAIRE' | 'ENCADRANT' };
export type App = {
  route: string; past: string[]; typed: string | null; token: string | null; me: Me | null; dialog: Dialog; toast: string; bell: boolean; menu: string | null;
};
export type Ctx = {
  e: Engine; app: App; t: DemoStrings; lang: Lang;
  go: (path: string, push?: boolean) => void;
  back: () => void;
  api: <T>(method: Method, url: string, body?: unknown) => Res<T>;
  step: (s: Step) => void;
  refresh: () => void;
  toast: (text: string) => void;
  signIn: (token: string) => void;
  layer: HTMLElement | null;
};

const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" /><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18 15c1.6.8 2.6 2.5 3 5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  badge: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="m9 12 2 2 4-4M9 7h6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  box: <><path d="M3 7h18v13H3z" /><path d="M8 3h8l1 4H7zM10 12h4" /></>,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z" /><path d="M10 21h4" /></>,
  logout: <><path d="M10 4H5v16h5" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  down: <path d="m6 9 6 6 6-6" />,
  right: <path d="m9 6 6 6-6 6" />,
  left: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  branch: <><circle cx="7" cy="5" r="2" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="8" r="2" /><path d="M7 7v10M17 10c0 4-10 2-10 6" /></>,
  commit: <><circle cx="12" cy="12" r="3.5" /><path d="M2 12h6.5M15.5 12H22" /></>,
  refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M19 11a7 7 0 0 0-12-3.5L4 11M5 13a7 7 0 0 0 12 3.5l3-3.5" /></>,
  download: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
  link: <><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1" /><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  spark: <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" />,
  git: <><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" /><path d="M8 6h6a4 4 0 0 1 4 4v6" /></>
};
export const Sv = ({ n, size = 16 }: { n: string; size?: number }) => (
  <svg className="sv" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[n]}</svg>
);
/** An icon of the portfolio's own sprite (GitHub, LinkedIn, mail…). */
export const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;

/** The demo's invented logo: an E made of three bars of growing length, one step of progress at a time. */
export const Logo = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <defs><linearGradient id="stg-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4f73d9" /><stop offset="1" stopColor="#e8733a" /></linearGradient></defs>
    <rect width="32" height="32" rx="9" fill="url(#stg-logo)" />
    <path d="M8 8.5h7M8 16h12M8 23.5h16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const pad = (n: number) => String(n).padStart(2, '0');
export const dateFr = (s: string) => { const d = new Date(s); return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const dateTimeFr = (s: string) => { const d = new Date(s); return `${dateFr(s)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export const DIFFICULTY = { EASY: 'Facile', MEDIUM: 'Moyenne', HARD: 'Difficile' } as const;
export const STATUS = { A_FAIRE: 'À faire', EN_COURS: 'En cours', COMPLETEE: 'Complétée', VALIDEE: 'Validée' } as const;
