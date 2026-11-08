import { describe, expect, it } from 'vitest';
import { call, createEngine, DEMO_PASSWORD, readToken, SLA_HOURS, type DashboardDto, type Engine, type LoginDto, type MeDto, type TicketDto } from '../src/projects/incidents-sla/demo/logic';

const login = (e: Engine, username: string, password = DEMO_PASSWORD) => call<LoginDto>(e, 't', 'POST', '/api/auth/login', null, { username, password });
const tokenOf = (e: Engine, username: string) => login(e, username).body.token;
const ids = (list: TicketDto[]) => list.map(t => t.id);
const get = <T>(e: Engine, token: string | null, url: string) => call<T>(e, 't', 'GET', url, token);

describe('incident platform demo, the technician API', () => {
  it('signs a JWT carrying the role, and refuses a wrong password', () => {
    const e = createEngine('fr', () => 1_000_000);
    const r = login(e, 'amine.tazi');
    expect(r.status).toBe(200);
    expect(r.body.role).toBe('ROLE_TECHNICIEN');
    expect(readToken(r.body.token)).toMatchObject({ sub: 'amine.tazi', role: 'ROLE_TECHNICIEN', exp: 1_000_000 + 7_200_000 });
    expect(login(e, 'amine.tazi', 'nope').status).toBe(401);
    expect(login(e, 'personne').status).toBe(401);
  });

  it('keeps the technician routes for technicians', () => {
    const e = createEngine('fr');
    expect(get(e, null, '/api/techniciens/me').status).toBe(401);
    expect(get(e, tokenOf(e, 'admin.demo'), '/api/techniciens/me').status).toBe(403);
    expect(get(e, tokenOf(e, 'atlas.client'), '/api/techniciens/dashboard').status).toBe(403);
    const me = get<MeDto>(e, tokenOf(e, 'amine.tazi'), '/api/techniciens/me');
    expect(me.body).toEqual({ id: 2, username: 'amine.tazi', specialite: 'Réseau' });
  });

  it('counts the dashboard and lists the nearest deadlines first', () => {
    const e = createEngine('fr');
    const { stats, urgentTicket } = get<DashboardDto>(e, tokenOf(e, 'amine.tazi'), '/api/techniciens/dashboard?recentTicketLimit=5').body;
    expect(stats).toEqual({ total: 5, inProgress: 3, escalated: 1, resolved: 1 });
    expect(ids(urgentTicket)).toEqual([3, 2, 1, 4, 5]);
    const deadlines = urgentTicket.map(t => t.sla.detailsResolution);
    expect([...deadlines].sort()).toEqual(deadlines);
  });

  it('gives each ticket the SLA deadline of its priority', () => {
    const e = createEngine('fr');
    for (const t of get<TicketDto[]>(e, tokenOf(e, 'amine.tazi'), '/api/techniciens/team/tickets').body) {
      const hours = (new Date(t.sla.detailsResolution).getTime() - new Date(t.dateCreation).getTime()) / 3_600_000;
      expect(hours).toBeCloseTo(SLA_HOURS[t.priorite]);
    }
  });

  it('separates my tickets from those of my group', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(ids(get<TicketDto[]>(e, token, '/api/techniciens/my-tickets').body)).toEqual([1, 2, 3, 4, 5]);
    expect(ids(get<TicketDto[]>(e, token, '/api/techniciens/team/tickets').body)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ids(get<TicketDto[]>(e, tokenOf(e, 'salma.idrissi'), '/api/techniciens/my-tickets').body)).toEqual([8]);
  });

  it('filters by status and priority, and sorts by date or deadline', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    const f = (q: string, base = 'team/tickets/filter') => ids(get<TicketDto[]>(e, token, `/api/techniciens/${base}?${q}`).body);
    expect(f('status=OUVERT')).toEqual([6, 7]);
    expect(f('priority=CRITIQUE')).toEqual([2, 6]);
    expect(f('status=OUVERT&priority=FAIBLE')).toEqual([7]);
    expect(f('status=OUVERT', 'my-tickets/filtered')).toEqual([]);
    expect(f('dateOrder=DESC')).toEqual([6, 2, 7, 1, 8, 5, 4, 3]);
    expect(f('dateOrder=ASC')).toEqual([3, 4, 5, 8, 1, 7, 2, 6]);
    expect(f('slaOrder=ASC')[0]).toBe(3);
    expect(f('slaOrder=DESC')[0]).toBe(7);
    expect(e.steps.has('filter')).toBe(true);
  });

  it('searches titles within the right scope, ignoring case', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(ids(get<TicketDto[]>(e, token, '/api/techniciens/my-tickets/search?titre=vpn').body)).toEqual([1]);
    expect(ids(get<TicketDto[]>(e, token, '/api/techniciens/my-tickets/search?titre=imprimante').body)).toEqual([]);
    expect(ids(get<TicketDto[]>(e, token, '/api/techniciens/team/tickets/search?titre=imprimante').body)).toEqual([8]);
  });

  it('records the journey of a request and masks nothing it should not show', () => {
    const e = createEngine('en'), token = tokenOf(e, 'amine.tazi');
    get(e, token, '/api/techniciens/my-tickets');
    expect(e.traces[0].hops.map(h => h.node)).toEqual(['proxy', 'security', 'security', 'mysql', 'controller', 'service', 'mysql']);
    expect(e.traces[0].status).toBe(200);
  });
});
