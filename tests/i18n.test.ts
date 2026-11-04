import { describe, expect, it } from 'vitest';
import fr from '../src/i18n/fr.json';
import en from '../src/i18n/en.json';
import { alternatePath, localePath, useTranslations } from '../src/i18n/utils';

describe('interface translations', () => {
  it('has the same keys in French and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('has no empty text', () => {
    for (const dict of [fr, en]) for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
  });

  it('fills placeholders', () => {
    expect(useTranslations('fr')('home.openProject', { name: 'AgriGPT' })).toBe('Ouvrir AgriGPT');
  });
});

describe('language switch', () => {
  it('keeps the same page', () => {
    expect(alternatePath('/')).toEqual({ lang: 'en', path: '/en/' });
    expect(alternatePath('/projets/')).toEqual({ lang: 'en', path: '/en/projets/' });
    expect(alternatePath('/en/projets/')).toEqual({ lang: 'fr', path: '/projets/' });
    expect(alternatePath('/en/')).toEqual({ lang: 'fr', path: '/' });
  });

  it('builds paths per language', () => {
    expect(localePath('fr', '/certifications/')).toBe('/certifications/');
    expect(localePath('en', '/certifications/')).toBe('/en/certifications/');
    expect(localePath('en', '/')).toBe('/en/');
  });
});
