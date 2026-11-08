import { describe, expect, it } from 'vitest';
import { reviewDeliverable } from '../src/projects/plateforme-stagiaires/demo/ai';
import { call, createEngine, DEMO_PASSWORD, type CompetenceTree, type EncMissionCard, type EncMissionDetail, type EncSubjectSummary, type EncTeamDetail, type EncTeamDto, type Engine, type MissionDetailDto, type ReviewAnswer } from '../src/projects/plateforme-stagiaires/demo/logic';

const login = (e: Engine, email: string) => call<{ accessToken: string }>(e, 't', 'POST', '/api/auth/login', null, { email, password: DEMO_PASSWORD }).body.accessToken;
const KARIM = 'karim.benali@estage.demo', NADIA = 'nadia.chraibi@estage.demo', YASSINE = 'yassine.idrissi@estage.demo';
const setup = () => { const e = createEngine('fr'); return { e, token: login(e, KARIM) }; };
const mission = (e: Engine, token: string, id = 1) => call<EncMissionDetail>(e, 't', 'GET', `/api/encadrant/missions/${id}`, token).body;
const review = (e: Engine, token: string, did: number, status: string, comment?: string, id = 1) => call<{ message?: string }>(e, 't', 'PUT', `/api/encadrant/missions/${id}/deliverables/${did}/review`, token, { status, comment });
const team = (e: Engine) => e.db.internship_db.teams[0];
const m1 = (e: Engine) => e.db.internship_db.missions[0];

describe('intern platform demo, the supervisor', () => {
  it('sees only their own subjects, teams and missions, and interns are refused', () => {
    const { e, token } = setup();
    expect(call<EncSubjectSummary[]>(e, 't', 'GET', '/api/encadrant/subjects/summary', token).body.map(s => s.code)).toEqual(['ROOMS', 'ENERGY']);
    expect(call<EncMissionCard[]>(e, 't', 'GET', '/api/encadrant/missions', token).body).toHaveLength(8);
    expect(call(e, 't', 'GET', '/api/encadrant/subjects/3/teams', token).status).toBe(403);
    expect(call(e, 't', 'GET', '/api/encadrant/teams/4/detail-view', token).status).toBe(403);
    const nadia = login(e, NADIA);
    expect(call(e, 't', 'GET', '/api/encadrant/missions/1', nadia).status).toBe(403);
    expect(call(e, 't', 'PUT', '/api/encadrant/missions/1/validate', nadia).status).toBe(403);
    expect(call(e, 't', 'GET', '/api/encadrant/missions', login(e, YASSINE)).status).toBe(403);
  });

  it('counts the seats of a subject, and shows each team’s status', () => {
    const { e, token } = setup();
    const rooms = call<EncSubjectSummary[]>(e, 't', 'GET', '/api/encadrant/subjects/summary', token).body[0];
    expect(rooms).toMatchObject({ teams: 2, maxTeams: 2, members: 5, occupied: 5, capacity: 10 });
    const teams = call<EncTeamDto[]>(e, 't', 'GET', '/api/encadrant/subjects/1/teams', token).body;
    expect(teams[0].health).toBe('LIVRABLES_EN_ATTENTE');
    expect(teams[1].health).toBe('SANS_ACTIVITE');
  });

  it('a team falls into difficulty after a refused proof', () => {
    const { e, token } = setup();
    review(e, token, 1, 'REFUSE', 'À reprendre.');
    expect(call<EncTeamDetail>(e, 't', 'GET', '/api/encadrant/teams/1/detail-view', token).body.team.health).toBe('EN_DIFFICULTE');
  });

  it('details a team: missions, members and slots', () => {
    const { e, token } = setup();
    const d = call<EncTeamDetail>(e, 't', 'GET', '/api/encadrant/teams/1/detail-view', token).body;
    expect(d).toMatchObject({ total: 6, validated: 3, deliverables: 3, acceptedDeliverables: 1 });
    expect(d.members.map(m => m.name)).toContain('Yassine Idrissi');
    expect(d.slots).toHaveLength(3);
  });

  it('reads the team’s skills and GitHub repository through the same services', () => {
    const { e, token } = setup();
    expect(call<CompetenceTree>(e, 't', 'GET', '/api/encadrant/teams/1/acquired-competences', token).body.members).toHaveLength(3);
    expect(call(e, 't', 'GET', '/api/github/teams/1/repositories', token).status).toBe(200);
    expect(call(e, 't', 'POST', '/api/github/commits/1/sync-details', token).status).toBe(200);
    expect(call(e, 't', 'GET', '/api/github/teams/4/repositories', login(e, NADIA)).status).toBe(200);
    expect(call(e, 't', 'GET', '/api/github/teams/4/repositories', token).status).toBe(403);
  });
});

describe('intern platform demo, reviewing deliverables', () => {
  it('requires a comment to ask for corrections, and the status Soumis is the interns’ own', () => {
    const { e, token } = setup();
    expect(review(e, token, 1, 'CORRECTIONS', '  ').status).toBe(400);
    expect(review(e, token, 1, 'SOUMIS').status).toBe(400);
    expect(review(e, token, 1, 'CORRECTIONS', 'Ajouter les tests.').status).toBe(200);
    expect(e.db.internship_db.deliverable_review_histories[0]).toMatchObject({ previous_status: 'SOUMIS', new_status: 'CORRECTIONS' });
  });

  it('the intern sees the decision and can no longer replace the deliverable', () => {
    const { e, token } = setup();
    review(e, token, 1, 'CORRECTIONS', 'Ajouter les tests.');
    const yassine = login(e, YASSINE);
    const d = call<MissionDetailDto>(e, 't', 'GET', '/api/stagiaire/missions/1/full-detail', yassine).body.deliverables[0];
    expect(d).toMatchObject({ status: 'CORRECTIONS', review_comment: 'Ajouter les tests.' });
    expect(call(e, 't', 'DELETE', '/api/stagiaire/missions/1/deliverables/1', yassine).status).toBe(409);
  });

  it('refusing a deliverable rejects the mission, and a new proof restarts it', () => {
    const { e, token } = setup();
    expect(review(e, token, 1, 'REFUSE', 'Incomplet.').status).toBe(200);
    expect(m1(e).status).toBe('REJETEE');
    expect(call(e, 't', 'POST', '/api/stagiaire/missions/1/deliverables', login(e, YASSINE), { fileName: 'v2.pdf' }).status).toBe(201);
    expect(m1(e).status).toBe('EN_COURS');
  });

  it('completes the mission only once every member’s latest proof is accepted, and pays once', () => {
    const { e, token } = setup();
    const before = team(e).points, reward = m1(e).points * 2;
    expect(review(e, token, 1, 'ACCEPTE').status).toBe(200);
    expect(m1(e).status).toBe('EN_COURS');
    const db = e.db.internship_db;
    for (const id of [5, 6]) db.deliverables.push({ id: 90 + id, mission_id: 1, stagiaire_id: id, file_name: 'x.pdf', size_kb: 1, version: 1, status: 'SOUMIS', submitted_at: '2026-11-01T10:00:00', review_comment: null, contributors: [id] });
    review(e, token, 95, 'ACCEPTE');
    expect(m1(e).status).toBe('EN_COURS');
    review(e, token, 96, 'ACCEPTE');
    expect(m1(e).status).toBe('COMPLETEE');
    expect(team(e).points).toBe(before + reward);
    call(e, 't', 'PUT', '/api/encadrant/missions/1/validate', token);
    expect(m1(e).status).toBe('VALIDEE');
    expect(team(e).points).toBe(before + reward);
  });

  it('validating pays the team, publishes the skills, and writes the history once', () => {
    const { e, token } = setup();
    const before = team(e).points;
    expect(call(e, 't', 'PUT', '/api/encadrant/missions/3/validate', token).status).toBe(200);
    expect(call(e, 't', 'PUT', '/api/encadrant/missions/3/validate', token).status).toBe(200);
    expect(team(e).points).toBe(before + 50);
    expect(mission(e, token, 3).histories.filter(h => h.action === 'STATUS_CHANGED')).toHaveLength(1);
    const tree = call<CompetenceTree>(e, 't', 'GET', '/api/encadrant/teams/1/acquired-competences', token).body;
    expect(tree.members.flatMap(m => m.missions.flatMap(x => x.competences))).toContain('GitHub Actions');
  });

  it('reviews a GitHub submission once, with a comment unless approved', () => {
    const { e, token } = setup();
    const yassine = login(e, YASSINE);
    call(e, 't', 'POST', '/api/stagiaire/missions/1/commit-submissions', yassine, { commitTraceIds: [1], note: 'x' });
    const [s] = mission(e, token).commitSubmissions;
    const put = (status: string, reviewComment?: string) => call(e, 't', 'PUT', `/api/encadrant/mission-commit-submissions/${s.id}/review`, token, { status, reviewComment });
    expect(put('PENDING_REVIEW').status).toBe(400);
    expect(put('ACCEPTED').status).toBe(200);
    expect(put('REJECTED', 'non').status).toBe(409);
    expect(call<MissionDetailDto>(e, 't', 'GET', '/api/stagiaire/missions/1/full-detail', yassine).body.commitSubmissions[0].status).toBe('ACCEPTED');
  });

  it('answers or declines a help request, and the intern reads the answer', () => {
    const { e, token } = setup();
    expect(call(e, 't', 'POST', '/api/encadrant/help-requests/1/answer', token, { content: ' ' }).status).toBe(400);
    expect(call(e, 't', 'POST', '/api/encadrant/help-requests/1/answer', token, { content: 'ISO 8601 avec fuseau.' }).status).toBe(201);
    const h = call<MissionDetailDto>(e, 't', 'GET', '/api/stagiaire/missions/1/full-detail', login(e, YASSINE)).body.helpRequests[0];
    expect(h).toMatchObject({ status: 'RESOLUE', responses: 1 });
    expect(h.answers[0].content).toBe('ISO 8601 avec fuseau.');
    call(e, 't', 'PUT', '/api/encadrant/help-requests/1/decline', token);
    expect(e.db.internship_db.help_requests[0].status).toBe('DECLINEE');
  });
});

describe('intern platform demo, the AI review', () => {
  const api = { title: 'API', hasSpec: true, competences: [] };
  it('compares the file with the mission and only recommends', () => {
    const v1 = reviewDeliverable('rapport-api-reservation.pdf', api);
    expect(v1.verdict).toBe('À corriger');
    expect(v1.correct).toContain('R1 : refus des chevauchements');
    expect(v1.gaps).toContain('R5 : capacité de la salle');
    expect(v1.comment).toContain('Avant validation');
    const v2 = reviewDeliverable('rapport-api-reservation-v2.pdf', api);
    expect(v2.correct.length).toBeGreaterThan(v1.correct.length);
  });

  it('says so when the content cannot be read', () => {
    const r = reviewDeliverable('tests-regles-reservation.zip', api);
    expect(r).toMatchObject({ readable: false, verdict: 'Contenu insuffisant' });
  });

  it('goes through the AI service without changing anything', () => {
    const { e, token } = setup();
    const before = JSON.stringify(e.db.internship_db.deliverables);
    const r = call<ReviewAnswer>(e, 't', 'POST', '/api/ai/encadrant/missions/1/deliverables/1/review-assistant', token);
    expect(r.body.scope).toBe('ENCADRANT_DELIVERABLE_REVIEW');
    expect(r.body.review.verdict).toBe('À corriger');
    expect(JSON.stringify(e.db.internship_db.deliverables)).toBe(before);
    expect(e.traces[0].hops.map(h => h.node)).toEqual(['nginx', 'gateway', 'ai', 'postgres', 'ai', 'ollama']);
    expect(call(e, 't', 'POST', '/api/ai/encadrant/missions/1/deliverables/1/review-assistant', login(e, YASSINE)).status).toBe(403);
  });
});
