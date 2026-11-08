import { describe, expect, it } from 'vitest';
import { call, createEngine, DEMO_PASSWORD, readToken, runSlaCheck, SLA_HOURS, type DashboardDto, type Engine, type LoginDto, type MeDto, type TicketDto } from '../src/projects/incidents-sla/demo/logic';

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

describe('incident platform demo, the actions on a ticket', () => {
  const API = '/api/techniciens/my-tickets';
  const detail = (e: Engine, token: string, id: number) => get<TicketDto>(e, token, `/api/techniciens/team/tickets/${id}`).body;
  const send = (e: Engine, token: string, method: 'PUT' | 'POST' | 'PATCH', path: string, body?: unknown) => call(e, 't', method, `${API}/${path}`, token, body);
  const statusOf = (e: Engine, id: number) => e.db.sla.find(s => s.id === id)!.statut_sla;

  it('assigns an open ticket of the team, writes the history and alerts the administrator', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(send(e, token, 'PUT', '6', {}).status).toBe(200);
    const t = detail(e, token, 6);
    expect(t.status).toBe('EN_COURS');
    expect(t.technicien?.username).toBe('amine.tazi');
    expect(t.historiques[0].action).toContain('Ticket assigned to technicien');
    expect(e.db.alerte).toMatchObject([{ type_alerte: 'CRITIQUE', ticket_id: 6, utilisateur_id: 1 }]);
  });

  it('refuses to assign a ticket twice', () => {
    const e = createEngine('fr');
    expect(send(e, tokenOf(e, 'amine.tazi'), 'PUT', '6', {}).status).toBe(200);
    expect(send(e, tokenOf(e, 'salma.idrissi'), 'PUT', '6', {}).status).toBe(500);
    expect(e.traces[0].hops.at(-1)?.bad).toBe(true);
    expect(e.db.ticket.find(t => t.id === 6)!.technicien_id).toBe(2);
  });

  it('keeps every action for the assigned technician', () => {
    const e = createEngine('fr'), salma = tokenOf(e, 'salma.idrissi');
    expect(send(e, salma, 'PATCH', '1/status?status=ANNULE').status).toBe(500);
    expect(send(e, salma, 'PATCH', '1/priority?priority=FAIBLE').status).toBe(500);
    expect(send(e, salma, 'POST', '1/comment', 'x').status).toBe(500);
    expect(send(e, salma, 'POST', '1/escalate', 'x').status).toBe(500);
    expect(e.db.ticket[0]).toMatchObject({ status: 'EN_COURS', priorite: 'HAUTE', commentaire: null });
    expect(e.db.historique).toHaveLength(8);
  });

  it('changes the status and the priority and records both, without moving the deadline', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    const before = e.db.sla[0].details_resolution;
    expect(send(e, token, 'PATCH', '1/priority?priority=CRITIQUE').status).toBe(200);
    expect(send(e, token, 'PATCH', '1/status?status=ANNULE').status).toBe(200);
    const t = detail(e, token, 1);
    expect(t).toMatchObject({ priorite: 'CRITIQUE', status: 'ANNULE' });
    expect(t.historiques.map(h => h.action)).toContain('Change ticket priority to CRITIQUE');
    expect(t.historiques.map(h => h.action)).toContain('Change ticket status to ANNULE');
    expect(e.db.sla[0].details_resolution).toBe(before);
  });

  it('resolves with a comment and closes the SLA, reopening runs it again', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(send(e, token, 'POST', '1/comment', 'VPN relancé').status).toBe(200);
    const t = detail(e, token, 1);
    expect(t).toMatchObject({ status: 'RESOLU', commentaire: 'VPN relancé' });
    expect(t.dateResolution).not.toBeNull();
    expect(statusOf(e, 1)).toBe('RESPECTE');
    send(e, token, 'PATCH', '1/status?status=EN_COURS');
    expect(statusOf(e, 1)).toBe('EN_COURS');
  });

  it('leaves an expired SLA expired when the ticket is resolved late', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    e.skew = 3 * 3_600_000;
    runSlaCheck(e);
    expect(statusOf(e, 2)).toBe('EXPIRE');
    send(e, token, 'POST', '2/comment', 'Volume étendu');
    expect(statusOf(e, 2)).toBe('EXPIRE');
  });

  it('escalates with a reason and alerts the administrator', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(send(e, token, 'POST', '5/escalate', 'Besoin du fournisseur').status).toBe(200);
    expect(detail(e, token, 5)).toMatchObject({ status: 'ESCALADE', commentaire: 'Besoin du fournisseur' });
    expect(e.db.alerte[0]).toMatchObject({ type_alerte: 'CRITIQUE', utilisateur_id: 1, message: 'The ticket ID 5 has been escalated by amine.tazi' });
  });

  it('serves the attachment of a team ticket, and 404 when there is none', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    expect(get(e, token, '/api/techniciens/team/tickets/1/attachment').status).toBe(200);
    expect(get(e, token, '/api/techniciens/team/tickets/2/attachment').status).toBe(404);
  });

  it('applies the thresholds of the SLA check', () => {
    const e = createEngine('fr', () => 1_700_000_000_000);
    // ticket 3 ends in 45 min, ticket 2 in 1 h: both under 2 h; ticket 6 is close but nobody holds it
    expect(runSlaCheck(e)).toEqual({ expired: 0, alerts: 2 });
    expect(e.db.alerte.map(a => [a.ticket_id, a.type_alerte])).toEqual([[2, 'WARNING'], [3, 'WARNING']]);
    expect(e.db.alerte[0].utilisateur_id).toBe(2);
    e.db.alerte.length = 0;
    e.skew = 30 * 60_000; // ticket 3 now has 15 min left
    runSlaCheck(e);
    expect(e.db.alerte.find(a => a.ticket_id === 3)).toMatchObject({ type_alerte: 'CRITIQUE' });
    expect(e.db.alerte.find(a => a.ticket_id === 2)).toMatchObject({ type_alerte: 'WARNING' });
    e.db.alerte.length = 0;
    e.skew = 2 * 3_600_000;
    expect(runSlaCheck(e).expired).toBe(3); // tickets 2, 3 and the unassigned 6
    expect(statusOf(e, 6)).toBe('EXPIRE');
    expect(e.db.alerte.map(a => a.ticket_id)).toEqual([2, 3]);
    expect(e.traces[0]).toMatchObject({ method: 'JOB', by: 'scheduler' });
  });

  it('skips the SLAs that are no longer running', () => {
    const e = createEngine('fr'), token = tokenOf(e, 'amine.tazi');
    send(e, token, 'POST', '2/comment', 'ok');
    e.skew = 3 * 3_600_000;
    runSlaCheck(e);
    expect(statusOf(e, 2)).toBe('RESPECTE');
    expect(statusOf(e, 4)).toBe('RESPECTE');
  });
});
