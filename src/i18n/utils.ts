import fr from './fr.json';
import en from './en.json';

export const languages = ['fr', 'en'] as const;
export type Lang = (typeof languages)[number];
export type Key = keyof typeof fr;

const dictionaries: Record<Lang, Record<Key, string>> = { fr, en };

/** The `[...lang]` route parameter: undefined for French (served at the root), "en" for English. */
export const langPaths = () => [{ params: { lang: undefined } }, { params: { lang: 'en' } }];

export const toLang = (param: string | undefined): Lang => (param === 'en' ? 'en' : 'fr');

/** Translate an interface key, filling `{name}`-style placeholders. */
export function useTranslations(lang: Lang) {
  return (key: Key, values: Record<string, string> = {}) =>
    dictionaries[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);
}

/** Path of a page in a language: localePath('en', '/projets/') -> '/en/projets/'. */
export const localePath = (lang: Lang, path: string) => (lang === 'fr' ? path : `/en${path === '/' ? '/' : path}`);

/** The same page in the other language, so the switcher keeps the reader where they are. */
export function alternatePath(pathname: string): { lang: Lang; path: string } {
  if (pathname === '/en' || pathname.startsWith('/en/')) return { lang: 'fr', path: pathname.slice(3) || '/' };
  return { lang: 'en', path: `/en${pathname}` };
}

/** Pick the text of a localized field. */
export const pick = (value: { fr: string; en: string }, lang: Lang) => value[lang];
