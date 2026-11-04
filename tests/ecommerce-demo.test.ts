import { describe, expect, it } from 'vitest';
import { call, createEngine, makeToken, readToken, type CartResponse, type Engine, type Page, type ProductDto } from '../src/projects/e-commerce-microservices/demo/logic';

const login = (e: Engine, username: string, password: string) => {
  const r = call<{ token: string }>(e, 'test', 'POST', '/api/auth/login', {}, { username, password });
  return r.status === 200 ? r.body.token : null;
};
const auth = (token: string | null): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});
const products = (e: Engine, q = '') => call<Page<ProductDto>>(e, 'test', 'GET', `/api/products?keyword=${q}&page=0&size=8&sortBy=price&direction=asc`, { 'X-User-Role': 'ADMIN' }).body;

describe('MCommerce demo, rules copied from the Spring services', () => {
  it('signs in with a JWT carrying sub, userId and role, and refuses a wrong password', () => {
    const e = createEngine('fr');
    const token = login(e, 'yassine', 'guitar2026');
    expect(readToken(token)).toMatchObject({ sub: 'yassine', userId: 2, role: 'USER' });
    expect(login(e, 'yassine', 'nope')).toBeNull();
    expect(login(e, 'ghost', 'x')).toBeNull();
  });

  it('the gateway answers 401 without a token on protected routes and 403 on /admin for a USER', () => {
    const e = createEngine('fr');
    expect(call(e, 't', 'GET', '/api/carts/me', {}).status).toBe(401);
    expect(call(e, 't', 'GET', '/api/admin/users', auth(login(e, 'yassine', 'guitar2026'))).status).toBe(403);
    expect(call(e, 't', 'GET', '/api/admin/users', auth(login(e, 'admin', 'admin123'))).status).toBe(200);
    expect(call(e, 't', 'GET', '/api/carts/me', { Authorization: 'Bearer broken' }).status).toBe(401);
  });

  it('searches active products by name, sorted by price, with paging', () => {
    const e = createEngine('fr');
    const page = products(e);
    expect(page.totalElements).toBe(10);
    expect(page.content.map(p => p.price)).toEqual([...page.content.map(p => p.price)].sort((a, b) => a - b));
    expect(products(e, 'STRAT').content.map(p => p.name)).toEqual(['Stratocaster Candy Red', 'Stratocaster Sonic Blue']);
  });

  it('adding the same product twice raises the quantity, and the total follows', () => {
    const e = createEngine('fr');
    const h = auth(login(e, 'yassine', 'guitar2026'));
    call(e, 't', 'POST', '/api/carts/me/items/2', h);
    const cart = call<CartResponse>(e, 't', 'POST', '/api/carts/me/items/2', h).body;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId: 2, quantity: 2, totalPrice: 15800 });
    expect(cart.totalAmount).toBe(15800);
    const zero = call<CartResponse>(e, 't', 'PUT', '/api/carts/me/items/2?quantity=0', h).body;
    expect(zero.items).toHaveLength(0);
  });

  it('checkout refuses an empty cart, otherwise stores SUCCESS and empties the cart', () => {
    const e = createEngine('fr');
    const h = auth(login(e, 'yassine', 'guitar2026'));
    expect(call(e, 't', 'POST', '/api/payments/checkout', h, { paymentMethod: 'CARD' }).status).toBe(400);
    call(e, 't', 'POST', '/api/carts/me/items/5', h);
    const r = call<{ status: string; totalAmount: number }>(e, 't', 'POST', '/api/payments/checkout', h, { paymentMethod: 'CASH' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'SUCCESS', totalAmount: 3200 });
    expect(call<CartResponse>(e, 't', 'GET', '/api/carts/me', h).body.items).toHaveLength(0);
  });

  it('payment history: a USER sees their own payments, an ADMIN sees all of them', () => {
    const e = createEngine('fr');
    const mine = call<Page<{ userId: number }>>(e, 't', 'GET', '/api/payments/history?page=0&size=5', auth(login(e, 'yassine', 'guitar2026'))).body;
    expect(mine.content.every(p => p.userId === 2)).toBe(true);
    const all = call<Page<unknown>>(e, 't', 'GET', '/api/payments/history?page=0&size=5', auth(login(e, 'admin', 'admin123'))).body;
    expect(all.totalElements).toBe(3);
  });

  it('deleting a product is a soft delete: the row stays, inactive, and leaves the catalogue', () => {
    const e = createEngine('fr');
    const h = { ...auth(login(e, 'admin', 'admin123')), 'X-User-Role': 'ADMIN' };
    expect(call(e, 't', 'DELETE', '/api/products/10', h).status).toBe(204);
    expect(e.db.product_db.products.find(p => p.id === 10)?.active).toBe(false);
    expect(products(e).totalElements).toBe(9);
  });

  it('a USER token cannot write products, but without any token the browser header passes (real flaw)', () => {
    const e = createEngine('fr');
    const body = { product: { name: 'X', description: '', price: 1 } };
    const asUser = { ...auth(login(e, 'yassine', 'guitar2026')), 'X-User-Role': 'ADMIN' };
    expect(call(e, 't', 'POST', '/api/products', asUser, body).status).toBe(403);
    expect(call(e, 't', 'POST', '/api/products', { 'X-User-Role': 'ADMIN' }, body).status).toBe(201);
  });

  it('updating a user changes role and enabled, not the username', () => {
    const e = createEngine('fr');
    const h = auth(login(e, 'admin', 'admin123'));
    call(e, 't', 'PUT', '/api/admin/users/3', h, { username: 'renamed', role: 'ADMIN', enabled: false });
    expect(e.db.auth_db.users.find(u => u.id === 3)).toMatchObject({ username: 'salma', role: 'ADMIN', enabled: false });
  });

  it('a token made by the engine reads back', () => {
    const e = createEngine('en');
    expect(readToken(makeToken(e, e.db.auth_db.users[0]))?.role).toBe('ADMIN');
  });
});
