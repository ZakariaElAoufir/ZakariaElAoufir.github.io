import { describe, expect, it } from 'vitest';
import { ACCOUNTS, cartString, createEngine, currentSession, djDate, pyFloat, request, type Engine } from '../src/projects/vente-formations/demo/logic';

const get = (e: Engine, url: string) => request(e, 'GET', url);
const post = (e: Engine, url: string, form: Record<string, string>, xhr = false) => request(e, 'POST', url, form, xhr);
const page = (r: ReturnType<typeof request>) => ('page' in r ? r.page : null);
const cart = (e: Engine) => currentSession(e)?.data.session_key ?? [];
const signIn = (e: Engine, who: keyof typeof ACCOUNTS) => post(e, '/login/', ACCOUNTS[who]);

describe('Koursero demo, rules copied from the Django code', () => {
  it('lists the catalogue of the repo and shows a course with Django’s date format', () => {
    const e = createEngine('fr');
    const home = page(get(e, '/'));
    expect(home?.v === 'home' && home.formations.length).toBe(8);
    const f = page(get(e, '/formation/1'));
    expect(f?.v === 'formation' && f.trainer).toBe('Hamza');
    expect(djDate('2024-05-04T18:21:48')).toBe('May 4, 2024, 6:21 p.m.');
  });

  it('a missing course is a 500 with DoesNotExist, an unknown URL a 404', () => {
    const e = createEngine('fr');
    expect(page(get(e, '/formation/99'))?.v).toBe('debug500');
    expect(page(get(e, '/checkout'))?.v).toBe('debug404');
  });

  it('searches titles case-insensitively, with a message when nothing matches', () => {
    const e = createEngine('fr');
    const r = post(e, '/search', { searched: 'sql' });
    expect(page(r)?.v === 'search' && (page(r) as { searched: unknown[] }).searched.length).toBe(2);
    const none = post(e, '/search', { searched: 'cobol' });
    expect('messages' in none && none.messages[0].text).toBe('No such Formation in our Koursero!');
  });

  it('adds a course to the session cart once, keeping insertion order', () => {
    const e = createEngine('fr');
    get(e, '/');
    expect(post(e, '/cart/add/', { formation_id: '6', action: 'post' }, true)).toEqual({ json: { qty: 1 } });
    post(e, '/cart/add/', { formation_id: '2', action: 'post' }, true);
    post(e, '/cart/add/', { formation_id: '6', action: 'post' }, true);
    expect(cart(e)).toEqual([['6', 789], ['2', 69]]);
    expect(cartString(cart(e))).toBe('{"6": 789.0, "2": 69.0}');
  });

  it('signing in changes the session key and merges the saved cart', () => {
    const e = createEngine('fr');
    get(e, '/');
    post(e, '/cart/add/', { formation_id: '6', action: 'post' }, true);
    const before = e.cookie;
    expect(signIn(e, 'customer')).toEqual({ redirect: '/' });
    expect(e.cookie).not.toBe(before);
    expect(cart(e).map(([k]) => k)).toEqual(['6', '1', '4']);
    expect(e.db.store_profile.find(p => p.user_id === 2)?.old_cart).toBe('{"6": 789.0, "1": 600.66, "4": 200.0}');
    const c = page(get(e, '/cart/'));
    expect(c?.v === 'cart' && pyFloat(c.total)).toBe('1589.6599999999999');
  });

  it('logging out flushes the session; the saved cart comes back at the next sign-in', () => {
    const e = createEngine('fr');
    signIn(e, 'customer');
    get(e, '/logout');
    expect(cart(e)).toEqual([]);
    signIn(e, 'customer');
    expect(cart(e).map(([k]) => k)).toEqual(['1', '4']);
  });

  it('register applies Django’s password rules, creates the profile and signs in', () => {
    const e = createEngine('fr');
    const form = { username: 'nadia', first_name: 'Nadia', last_name: 'Alami', email: 'nadia@mail.ma', password1: '12345678', password2: '12345678' };
    expect(post(e, '/register/', form)).toEqual({ redirect: '/register/' });
    expect(post(e, '/register/', { ...form, password1: 'Rabat-Formation24', password2: 'Rabat-Formation24' })).toEqual({ redirect: '/update_info/' });
    const u = e.db.auth_user.at(-1)!;
    expect(u.username).toBe('nadia');
    expect(e.db.store_profile.some(p => p.user_id === u.id)).toBe(true);
    expect(currentSession(e)?.data._auth_user_id).toBe(String(u.id));
  });

  it('the admin needs a staff account and can add a course', () => {
    const e = createEngine('fr');
    signIn(e, 'customer');
    expect(get(e, '/admin/')).toEqual({ redirect: '/admin/login/?next=/admin/' });
    post(e, '/admin/login/', ACCOUNTS.admin);
    expect(page(get(e, '/admin/'))?.v).toBe('admin_index');
    expect(post(e, '/admin/store/formation/add/', { titre: 'Django', descriptif: '', prix: '350', image: 'uploads/formation/1.jpg' })).toEqual({ redirect: '/admin/store/formation/' });
    expect(e.db.store_formation.at(-1)).toMatchObject({ titre: 'Django', prix: 350 });
  });

  it('changing the password signs the user out', () => {
    const e = createEngine('fr');
    signIn(e, 'customer');
    expect(post(e, '/update_password/', { new_password1: 'Nouveau-Mot-2024', new_password2: 'Nouveau-Mot-2024' })).toEqual({ redirect: '/login/' });
    expect(currentSession(e)?.data._auth_user_id).toBeUndefined();
  });
});
