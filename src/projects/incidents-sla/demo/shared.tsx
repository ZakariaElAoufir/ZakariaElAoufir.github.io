// What every screen of the demo shares: the app context, the icons and the date format.
import type { ReactNode } from 'react';
import type { Engine, Method, Res, Step } from './logic';
import type { DemoStrings } from './strings';

export type Lang = 'fr' | 'en';
export type App = { route: string; past: string[]; typed: string | null; token: string | null; role: 'ADMIN' | 'TECHNICIEN' | 'CLIENT' | null; username: string | null };
export type Ctx = {
  e: Engine; app: App; t: DemoStrings; lang: Lang;
  go: (path: string, push?: boolean) => void;
  back: () => void;
  api: <T>(method: Method, url: string, body?: unknown) => Res<T>;
  step: (s: Step) => void;
  signIn: (token: string, username: string, role: string) => void;
  logout: () => void;
};

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.500V20h-6v-5H9v5H3z" fill="currentColor" stroke="none" />,
  ticket: <path d="M2 7h20v3.500a1.500 1.500 0 0 0 0 3V17H2v-3.500a1.500 1.500 0 0 0 0-3zM9 9.500v5h6v-5z" fill="currentColor" stroke="none" fillRule="evenodd" />,
  users: <g fill="currentColor" stroke="none"><circle cx="12" cy="8" r="3.500" /><circle cx="5" cy="9.500" r="2.500" /><circle cx="19" cy="9.500" r="2.500" /><path d="M6.500 19c.3-3.600 2.600-5.500 5.500-5.500s5.200 1.900 5.500 5.500zM1 17.500c.2-2.500 1.700-4 3.800-4 .8 0 1.400.2 2 .5A7.600 7.600 0 0 0 4.800 17.500zM23 17.500c-.2-2.500-1.700-4-3.800-4-.8 0-1.400.2-2 .5a7.600 7.600 0 0 1 2 3.500z" /></g>,
  logout: <><path d="M10 5H4v14h6" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
  bell: <path d="M12 2a1.500 1.500 0 0 0-1.500 1.500v.7A6.500 6.500 0 0 0 5.500 10.500v4L3.500 17.500V19h17v-1.500l-2-3v-4a6.500 6.500 0 0 0-5-6.300v-.7A1.500 1.500 0 0 0 12 2zM9.500 20a2.500 2.500 0 0 0 5 0z" fill="currentColor" stroke="none" />,
  pin: <path d="M7 2h10v2l-2 1v6l3 3v2h-5v6l-1 1-1-1v-6H6v-2l3-3V5L7 4z" fill="currentColor" stroke="none" />,
  folder: <path d="M2 5.500h7.500l2 2.500H22v11.500H2z" fill="currentColor" stroke="none" />,
  list: <><path d="M9 6h12M9 12h12M9 18h12" strokeWidth="2.400" /><path d="M3.500 6h.1M3.500 12h.1M3.500 18h.1" strokeWidth="3.400" /></>,
  eye: <path d="M12 5C6.500 5 2.500 9 1 12c1.500 3 5.500 7 11 7s9.500-4 11-7c-1.500-3-5.500-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" stroke="none" fillRule="evenodd" />,
  user: <><circle cx="12" cy="8" r="4" fill="currentColor" stroke="none" /><path d="M4 21c.6-4.500 3.800-7 8-7s7.400 2.500 8 7z" fill="currentColor" stroke="none" /></>,
  lock: <path d="M7 10V7.500a5 5 0 0 1 10 0V10h2v11H5V10zm3 0h4V7.500a2 2 0 0 0-4 0z" fill="currentColor" stroke="none" fillRule="evenodd" />,
  chevron: <path d="m9 5 7 7-7 7" strokeWidth="3" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  clock: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.400l3.500 2.100-1 1.700L11 13.500V7z" fill="currentColor" stroke="none" fillRule="evenodd" />,
  file: <path d="M6 2h8l5 5v15H6zm3 10v2h7v-2zm0 4v2h7v-2z" fill="currentColor" stroke="none" fillRule="evenodd" />,
  clip: <path d="m20 11-8.500 8.500a5 5 0 0 1-7-7L13 4a3.300 3.300 0 0 1 4.700 4.700l-8.500 8.500a1.600 1.600 0 0 1-2.300-2.300l7.800-7.800" />,
  userPlus: <g fill="currentColor" stroke="none"><circle cx="9" cy="8" r="4" /><path d="M2 21c.5-4.500 3.300-7 7-7s6.500 2.500 7 7z" /><path d="M18 8V5h2v3h3v2h-3v3h-2v-3h-3V8z" /></g>,
  send: <path d="M22 2 2 10l7 3.500L19 5l-8.500 10L14 22z" fill="currentColor" stroke="none" />,
  escalate: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
  left: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.500" /><circle cx="12" cy="12" r="3.500" /><path d="M16.800 7.200h.1" /></>,
  facebook: <path d="M14 22v-8.500h3l.5-3.500H14V8c0-1 .4-1.700 1.800-1.700h1.900V3.200C17.300 3.100 16.200 3 15 3c-2.700 0-4.500 1.600-4.500 4.600V10H7.500v3.500h3V22z" fill="currentColor" stroke="none" />,
  twitter: <path d="M22 5.800c-.7.300-1.500.5-2.300.6.800-.5 1.500-1.300 1.800-2.200-.8.500-1.700.8-2.600 1a4 4 0 0 0-6.900 3.700C8.700 8.700 5.700 7.100 3.700 4.600a4 4 0 0 0 1.200 5.400c-.6 0-1.300-.2-1.800-.5 0 2 1.400 3.700 3.300 4.100-.6.200-1.200.2-1.800.1.500 1.600 2 2.800 3.800 2.800A8.100 8.100 0 0 1 2 18.200 11.400 11.400 0 0 0 19.600 8.100c.9-.6 1.700-1.400 2.400-2.300z" fill="currentColor" stroke="none" />
};
export const Sv = ({ n, size = 16 }: { n: string; size?: number }) => (
  <svg className="sv" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[n]}</svg>
);
/** An icon of the portfolio's own sprite (GitHub, LinkedIn, mail…). */
export const Icon = ({ name }: { name: string }) => <svg className="i" aria-hidden="true"><use href={`/icons.svg#${name}`} /></svg>;

const pad = (n: number) => String(n).padStart(2, '0');
/** Angular's date:'dd/MM/yyyy HH:mm'. */
export const dateTime = (s: string) => { const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
