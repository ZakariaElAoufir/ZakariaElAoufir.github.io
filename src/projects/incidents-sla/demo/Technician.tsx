// The technician area, drawn from the Angular components: sidebar, header, dashboard, My Tickets and My Group.
import { useState, type ReactNode } from 'react';
import type { DashboardDto, MeDto, TicketDto } from './logic';
import { dateTime, Sv, type Ctx } from './shared';

const R = '/technicien';
const DASH = `${R}/dashboard-technicien`, MINE = `${R}/my-tickets-technicien`, GROUP = `${R}/group-tickets-technicien`;
const detailOf = (id: number) => `${R}/detail-ticket-technicien/${id}`;

/** The invented mark that replaces the company's logo in the sidebar: the hands of a clock, for the time an SLA leaves. */
const Mark = () => (
  <div className="t-logo">
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><circle cx="23" cy="23" r="19" /><path d="M23 11v12l8 6" /></svg>
    <span>PREDICT SLA</span>
  </div>
);

export function Layout({ ctx, children }: { ctx: Ctx; children: ReactNode }) {
  const { go, logout } = ctx;
  const [me] = useState(() => ctx.api<MeDto>('GET', '/api/techniciens/me').body);
  return (
    <div className="t-layout">
      <aside className="t-side">
        <Mark />
        <nav>
          <button onClick={() => go(DASH)}><Sv n="home" />Dashboard</button>
          <button onClick={() => go(MINE)}><Sv n="ticket" />My Tickets</button>
          <button onClick={() => go(GROUP)}><Sv n="users" />My Group</button>
        </nav>
        <button className="t-out" onClick={logout}><Sv n="logout" />Log out</button>
      </aside>
      <div className="t-main">
        <header className="t-head">
          <span className="t-bell"><Sv n="bell" size={18} /></span>
          <div className="t-user">
            <span className="t-photo"><Sv n="user" size={26} /></span>
            <div><h4>{me.username}</h4><small>Spécialité: {me.specialite}</small></div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = { OUVERT: 'open', EN_COURS: 'in-progress', RESOLU: 'resolved', ANNULE: 'cancelled', ESCALADE: 'escalated' };
const PRIORITY_CLASS: Record<string, string> = { FAIBLE: 'low', MOYEN: 'medium', HAUTE: 'high', CRITIQUE: 'critical' };

/** The ticket table. The dashboard's one has its own header colour and no coloured cells, as in dashboard-technicien.css. */
function Table({ ctx, tickets, plain, subLabel }: { ctx: Ctx; tickets: TicketDto[]; plain?: boolean; subLabel: string }) {
  return (
    <table className={`t-table${plain ? ' plain' : ''}`}>
      <thead><tr><th>Reference</th><th>Title</th><th>Status</th><th>Priority</th><th>Creation Date</th><th>Service</th><th>{subLabel}</th><th>SLA Remaining</th><th>Action</th></tr></thead>
      <tbody>
        {tickets.map(t => (
          <tr key={t.id}>
            <td>#{t.id}</td>
            <td>{t.titre}</td>
            <td className={`st-${STATUS_CLASS[t.status]}`}>{t.status}</td>
            <td className={`pr-${PRIORITY_CLASS[t.priorite]}`}>{t.priorite}</td>
            <td>{dateTime(t.dateCreation)}</td>
            <td>{t.equipe.nomService}</td>
            <td>{t.sousService.nom}</td>
            <td className="t-sla">{dateTime(t.sla.detailsResolution)}</td>
            <td><button className="t-view" onClick={() => ctx.go(detailOf(t.id))}><Sv n="eye" />View</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Dashboard({ ctx }: { ctx: Ctx }) {
  const [data] = useState(() => ctx.api<DashboardDto>('GET', '/api/techniciens/dashboard?recentTicketLimit=5').body);
  const stats: [string, number][] = [['Tickets Assigned', data.stats.total], ['In Progress', data.stats.inProgress], ['Escalated', data.stats.escalated], ['Resolved', data.stats.resolved]];
  return (
    <Layout ctx={ctx}>
      <h1>Dashboard</h1>
      <div className="t-stats">{stats.map(([label, n]) => <div className="t-stat" key={label}><span>{label}</span><b>{n}</b></div>)}</div>
      <h2><Sv n="pin" size={18} />Quick Actions</h2>
      <div className="t-quick">
        <button className="blue" onClick={() => ctx.go(MINE)}><Sv n="folder" size={26} />Assigned Tickets</button>
        <button className="red" onClick={() => ctx.go(GROUP)}><Sv n="users" size={26} />My Groups</button>
      </div>
      <h2><Sv n="list" size={18} />Urgent Tickets</h2>
      <Table ctx={ctx} tickets={data.urgentTicket} plain subLabel="Service Subcategorie" />
    </Layout>
  );
}

/** Search (on Enter) and filters: what My Tickets and My Group share. Each one asks the backend again and replaces the list. */
function useTickets(ctx: Ctx, base: string, filterPath: string) {
  const [tickets, setTickets] = useState(() => ctx.api<TicketDto[]>('GET', base).body);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [dateOrder, setDateOrder] = useState('');
  const [slaOrder, setSlaOrder] = useState('');
  const load = () => setTickets(ctx.api<TicketDto[]>('GET', base).body);
  const apply = (next: { status?: string; priority?: string; dateOrder?: string; slaOrder?: string }) => {
    const f = { status, priority, dateOrder, slaOrder, ...next };
    const q = new URLSearchParams();
    if (f.status) q.set('status', f.status);
    if (f.priority) q.set('priority', f.priority);
    if (f.dateOrder) q.set('dateOrder', f.dateOrder);
    if (f.slaOrder) q.set('slaOrder', f.slaOrder);
    setTickets(ctx.api<TicketDto[]>('GET', `${filterPath}?${q}`).body);
  };
  const search = () => {
    if (term.trim()) setTickets(ctx.api<TicketDto[]>('GET', `${base}/search?titre=${encodeURIComponent(term.trim())}`).body);
    else load();
  };
  const reset = () => { setTerm(''); setStatus(''); setPriority(''); setDateOrder(''); setSlaOrder(''); load(); };
  const filters = (
    <div className="t-filters">
      <label className="t-search"><Sv n="search" size={14} /><input placeholder="Search" aria-label="Search by title" value={term} onChange={ev => setTerm(ev.target.value)} onKeyUp={ev => { if (ev.key === 'Enter') search(); }} /></label>
      <select aria-label="Status" value={status} onChange={ev => { setStatus(ev.target.value); apply({ status: ev.target.value }); }}>
        <option value="">Status</option><option value="OUVERT">Ouvert</option><option value="EN_COURS">En cours</option><option value="RESOLU">Résolu</option><option value="ANNULE">Annulé</option><option value="ESCALADE">Escaladé</option>
      </select>
      <select aria-label="Priority" value={priority} onChange={ev => { setPriority(ev.target.value); apply({ priority: ev.target.value }); }}>
        <option value="">Priority</option><option value="FAIBLE">Faible</option><option value="MOYEN">Moyen</option><option value="HAUTE">Haute</option><option value="CRITIQUE">Critique</option>
      </select>
      <select aria-label="Date" value={dateOrder} onChange={ev => { setDateOrder(ev.target.value); apply({ dateOrder: ev.target.value }); }}>
        <option value="">Date</option><option value="ASC">Oldest first</option><option value="DESC">Newest first</option>
      </select>
      <select aria-label="SLA" value={slaOrder} onChange={ev => { setSlaOrder(ev.target.value); apply({ slaOrder: ev.target.value }); }}>
        <option value="">SLA</option><option value="ASC">Soonest deadline</option><option value="DESC">Latest deadline</option>
      </select>
      <button className="t-pill" onClick={reset}>Reset</button>
    </div>
  );
  return { tickets, filters };
}

export function MyTickets({ ctx }: { ctx: Ctx }) {
  const { tickets, filters } = useTickets(ctx, '/api/techniciens/my-tickets', '/api/techniciens/my-tickets/filtered');
  return (
    <Layout ctx={ctx}>
      <h1>My Tickets</h1>
      <p className="t-sub">Liste des tickets qui me sont assignés</p>
      {filters}
      <Table ctx={ctx} tickets={tickets} subLabel="Subcategory" />
    </Layout>
  );
}

export function MyGroup({ ctx }: { ctx: Ctx }) {
  const { tickets, filters } = useTickets(ctx, '/api/techniciens/team/tickets', '/api/techniciens/team/tickets/filter');
  // the group's identity is kept from the first load: a filter that empties the list must not erase it
  const [equipe] = useState(() => tickets[0]?.equipe);
  return (
    <Layout ctx={ctx}>
      <h1>My Group : <span className="t-hl">{equipe?.nom}</span></h1>
      <div className="t-group"><span>{equipe?.specialite}</span><span>{equipe?.nomService}</span><span>{equipe?.sousServices.join(', ')}</span></div>
      <p className="t-sub">Here is a list of Ticket's assigned to my group</p>
      {filters}
      <Table ctx={ctx} tickets={tickets} subLabel="Service Subcategory" />
    </Layout>
  );
}
