import { describe, expect, it } from 'vitest';
import { answerQuestion, chunkPages, retrieve, SPEC_PDF, workPlan, CHUNK_OVERLAP, CHUNK_SIZE } from '../src/projects/plateforme-stagiaires/demo/ai';
import { call, createEngine, DEMO_PASSWORD, type ChatAnswer, type ChatHistory, type Engine, type MissionCardDto, type MissionDetailDto, type WorkPlanDto } from '../src/projects/plateforme-stagiaires/demo/logic';

const login = (e: Engine, email: string) => call<{ accessToken: string }>(e, 't', 'POST', '/api/auth/login', null, { email, password: DEMO_PASSWORD }).body.accessToken;
const YASSINE = 'yassine.idrissi@estage.demo', SARA = 'sara.alaoui@estage.demo';
const setup = () => { const e = createEngine('fr'); return { e, token: login(e, YASSINE) }; };
const detail = (e: Engine, token: string, id: number) => call<MissionDetailDto>(e, 't', 'GET', `/api/stagiaire/missions/${id}/full-detail`, token);

describe('intern platform demo, missions', () => {
  it('lists the missions of my team only, and nothing without a team', () => {
    const { e, token } = setup();
    const list = call<MissionCardDto[]>(e, 't', 'GET', '/api/stagiaire/missions', token).body;
    expect(list).toHaveLength(6);
    expect(list.every(m => m.teamName === 'Team-ROOMS-1')).toBe(true);
    expect(list.find(m => m.id === 1)).toMatchObject({ myEngagement: 67, teamEngagement: 50, teamReward: 80 });
    expect(call<MissionCardDto[]>(e, 't', 'GET', '/api/stagiaire/missions', login(e, SARA)).body).toEqual([]);
  });

  it('refuses the detail of another team’s mission', () => {
    const { e, token } = setup();
    expect(detail(e, token, 7).status).toBe(403);
    expect(detail(e, token, 99).status).toBe(404);
    expect(detail(e, token, 1).body.attachments[0].file_name).toBe('cahier-des-charges-api.pdf');
  });

  it('a deliverable gets the next version, and the first one starts a to-do mission', () => {
    const { e, token } = setup();
    const send = (id: number, fileName: string) => call<{ version: number; message?: string }>(e, 't', 'POST', `/api/stagiaire/missions/${id}/deliverables`, token, { fileName });
    expect(send(1, 'v2.pdf').body.version).toBe(2);
    expect(send(1, 'v3.pdf').body.version).toBe(3);
    expect(e.db.internship_db.missions.find(m => m.id === 3)!.status).toBe('A_FAIRE');
    expect(send(3, 'ci.pdf').body.version).toBe(1);
    expect(e.db.internship_db.missions.find(m => m.id === 3)!.status).toBe('EN_COURS');
  });

  it('refuses a deliverable on a finished mission and an empty file', () => {
    const { e, token } = setup();
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/2/deliverables', token, { fileName: 'x.pdf' }).status).toBe(409);
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/4/deliverables', token, { fileName: 'x.pdf' }).status).toBe(409);
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/1/deliverables', token, { fileName: '' }).status).toBe(400);
  });

  it('replaces or deletes only one’s own deliverable, before any review', () => {
    const { e, token } = setup();
    expect(call(e, 't', 'PUT', '/api/stagiaire/missions/1/deliverables/1', token, { fileName: 'nouveau.pdf' }).status).toBe(200);
    expect(e.db.internship_db.deliverables.find(d => d.id === 1)!.file_name).toBe('nouveau.pdf');
    e.db.internship_db.deliverables.find(d => d.id === 1)!.status = 'EN_REVUE';
    expect(call(e, 't', 'DELETE', '/api/stagiaire/missions/1/deliverables/1', token).status).toBe(409);
    const omar = login(e, 'omar.tazi@estage.demo');
    expect(call(e, 't', 'DELETE', '/api/stagiaire/missions/2/deliverables/3', omar).status).toBe(404);
  });

  it('accepts one commit per repository and only from the team’s repositories', () => {
    const { e, token } = setup();
    const commit = (commitTraceId: number) => call(e, 't', 'POST', '/api/stagiaire/missions/1/commit-submissions', token, { commitTraceId });
    expect(commit(1).status).toBe(201);
    expect(commit(2).status).toBe(409);
    expect(commit(10).status).toBe(400); // a commit of Team-ROOMS-2's repository
    const [sub] = detail(e, token, 1).body.commitSubmissions;
    expect(call(e, 't', 'DELETE', `/api/stagiaire/missions/1/commit-submissions/${sub.id}`, token).status).toBe(204);
    expect(commit(2).status).toBe(201);
  });

  it('posts comments and help requests, refusing empty ones', () => {
    const { e, token } = setup();
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/1/comments', token, { content: '  ' }).status).toBe(400);
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/1/comments', token, { content: 'Fait.' }).status).toBe(201);
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/1/help-requests', token, { content: 'Bloqué sur R4.' }).status).toBe(201);
    const d = detail(e, token, 1).body;
    expect(d.comments.at(-1)?.content).toBe('Fait.');
    expect(d.helpRequests.map(h => h.author.name)).toContain('Yassine Idrissi');
  });
});

describe('intern platform demo, the mission assistant', () => {
  it('cuts the specification in windows of 900 characters overlapping by 150', () => {
    const chunks = chunkPages(SPEC_PDF.pages);
    expect(chunks.every(c => c.content.length <= CHUNK_SIZE)).toBe(true);
    const long = chunks.filter(c => c.page === chunks.find(x => x.content.length === CHUNK_SIZE)?.page);
    if (long.length > 1) expect(long[1].content.startsWith(long[0].content.slice(CHUNK_SIZE - CHUNK_OVERLAP, CHUNK_SIZE - CHUNK_OVERLAP + 20))).toBe(true);
    expect(new Set(chunks.map(c => c.page))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('finds the page of the business rules for a question about them', () => {
    const matches = retrieve(chunkPages(SPEC_PDF.pages), 'Quelles règles métier pour les réservations qui se chevauchent ?');
    expect(matches[0].page).toBe(2);
    expect(matches.length).toBeLessThanOrEqual(6);
  });

  it('indexes the document once, answers in context, and keeps the history', () => {
    const { e, token } = setup();
    const ask = (question: string) => call<ChatAnswer>(e, 't', 'POST', '/api/ai/missions/1/chat', token, { question });
    const first = ask('Quelles règles métier dois-je respecter ?');
    expect(first.body.scope).toBe('MISSION_CONTEXT_ONLY');
    expect(first.body.answer).toContain('409');
    expect(first.body.sources[0].page).toBe(2);
    const chunks = e.db.chabot_assistant_db.ai_document_chunks.length;
    expect(chunks).toBe(chunkPages(SPEC_PDF.pages).length);
    ask('Quel format de date ?');
    expect(e.db.chabot_assistant_db.ai_document_chunks.length).toBe(chunks);
    expect(e.db.chabot_assistant_db.ai_document_indexes).toHaveLength(1);
    expect(call<ChatHistory>(e, 't', 'GET', '/api/ai/missions/1/chat/history', token).body).toHaveLength(4);
  });

  it('declines a question outside the mission', () => {
    const { e, token } = setup();
    const r = call<ChatAnswer>(e, 't', 'POST', '/api/ai/missions/1/chat', token, { question: 'Quel temps fera-t-il demain ?' });
    expect(r.body.scope).toBe('OUT_OF_SCOPE');
  });

  it('says when a mission without instructions cannot answer', () => {
    const { e, token } = setup();
    const r = call<ChatAnswer>(e, 't', 'POST', '/api/ai/missions/3/chat', token, { question: 'Quel format de date pour le pipeline ?' });
    expect(r.body.scope).toBe('INSUFFICIENT_CONTEXT');
    expect(e.db.chabot_assistant_db.ai_document_chunks).toHaveLength(0);
  });

  it('stopping a generation removes the question and its answer from the history', () => {
    const { e, token } = setup();
    call(e, 't', 'POST', '/api/ai/missions/1/chat', token, { question: 'Quels tests sont attendus ?' });
    call(e, 't', 'POST', '/api/ai/missions/1/chat', token, { question: 'Quelles erreurs HTTP ?' });
    expect(call<{ cancelled: boolean }>(e, 't', 'POST', '/api/ai/missions/1/chat/cancel', token).body.cancelled).toBe(true);
    const history = call<ChatHistory>(e, 't', 'GET', '/api/ai/missions/1/chat/history', token).body;
    expect(history.map(h => h.content)).toEqual(expect.arrayContaining(['Quels tests sont attendus ?']));
    expect(history).toHaveLength(2);
  });

  it('the assistant of another team’s mission is refused', () => {
    const { e, token } = setup();
    expect(call(e, 't', 'POST', '/api/ai/missions/7/chat', token, { question: 'Règles ?' }).status).toBe(403);
  });

  it('answers the deadline and reward from the mission itself', () => {
    const a = answerQuestion('Quelle est l’échéance et combien de points ?', { title: 'X', description: 'd', dueDate: '2026-11-12T10:00:00', difficulty: 'Difficile', points: 40, coins: 20, competences: ['JPA'], hasSpec: true, status: 'EN_COURS' }, [], () => '12 nov. 2026');
    expect(a.answer).toContain('40 points');
    expect(a.answer).toContain('12 nov. 2026');
  });
});

describe('intern platform demo, the work plan', () => {
  it('puts overdue, then started, then closest missions first, and skips finished ones', () => {
    const plan = workPlan([
      { title: 'Plus tard', status: 'A_FAIRE', dueDate: '', difficulty: 'Facile', points: 1, daysLeft: 20, next: 'a' },
      { title: 'Commencée', status: 'EN_COURS', dueDate: '', difficulty: 'Difficile', points: 1, daysLeft: 8, next: 'b' },
      { title: 'En retard', status: 'A_FAIRE', dueDate: '', difficulty: 'Moyenne', points: 1, daysLeft: -2, next: 'c' },
      { title: 'Validée', status: 'VALIDEE', dueDate: '', difficulty: 'Facile', points: 1, daysLeft: -9, next: '' },
      { title: 'En revue', status: 'COMPLETEE', dueDate: '', difficulty: 'Facile', points: 1, daysLeft: 2, next: '' }
    ], () => 'date');
    expect(plan.order.map(x => x.split(' (')[0])).toEqual(['En retard', 'Commencée', 'Plus tard']);
    expect(plan.watch.join(' ')).toContain('En revue');
    expect(plan.watch.join(' ')).toContain('Commencée est difficile');
  });

  it('is built from the team’s missions through the AI service', () => {
    const { e, token } = setup();
    const r = call<WorkPlanDto>(e, 't', 'POST', '/api/ai/stagiaire/missions/work-plan', token, {});
    expect(r.body.scope).toBe('STUDENT_MISSIONS_CONTEXT');
    expect(r.body.sections.order[0]).toContain('API de réservation');
    expect(e.traces[0].hops.map(h => h.node)).toEqual(['nginx', 'gateway', 'ai', 'postgres', 'ollama']);
  });
});
