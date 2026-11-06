import { describe, expect, it } from 'vitest';
import { call, createEngine, DEMO_PASSWORD, readToken, type AssignmentDto, type CommitRow, type CompetenceTree, type ContentItem, type Engine, type FileDto, type GitIdentity, type RepositoryDto, type SubjectDto, type TeamDto } from '../src/projects/plateforme-stagiaires/demo/logic';

const login = (e: Engine, email: string, password = DEMO_PASSWORD) => {
  const r = call<{ accessToken: string }>(e, 't', 'POST', '/api/auth/login', null, { email, password });
  return r.status === 200 ? r.body.accessToken : null;
};
const SARA = 'sara.alaoui@estage.demo', YASSINE = 'yassine.idrissi@estage.demo', KARIM = 'karim.benali@estage.demo';
const join = (e: Engine, token: string | null, subject = 1, teamId = 1, subjectPositionId = 1) => call(e, 't', 'POST', `/api/stagiaire/subjects/${subject}/select`, token, { teamId, subjectPositionId });

describe('intern platform demo, the rules of the services', () => {
  it('signs a 15 minute JWT carrying the user and the role, and refuses a wrong password', () => {
    const e = createEngine('fr');
    const claims = readToken(login(e, SARA))!;
    expect(claims).toMatchObject({ sub: SARA, userId: 3, roles: ['STAGIAIRE'] });
    expect(claims.exp - claims.iat).toBe(900);
    expect(login(e, SARA, 'nope')).toBeNull();
    expect(login(e, 'ghost@estage.demo')).toBeNull();
  });

  it('accepts the simulated face login only for a known account', () => {
    const e = createEngine('fr');
    const face = (email: string) => call<{ accessToken: string }>(e, 't', 'POST', '/api/auth/login/face', null, { email });
    expect(readToken(face(SARA).body.accessToken)?.userId).toBe(3);
    expect(face('ghost@estage.demo').status).toBe(401);
  });

  it('the gateway answers 401 without a token, and intern routes refuse a supervisor', () => {
    const e = createEngine('fr');
    expect(call(e, 't', 'GET', '/api/stagiaire/subjects', null).status).toBe(401);
    expect(call(e, 't', 'GET', '/api/stagiaire/subjects', 'broken').status).toBe(401);
    expect(call(e, 't', 'GET', '/api/stagiaire/subjects', login(e, KARIM)).status).toBe(403);
  });

  it('counts free seats and occupation from the slots of every team of a subject', () => {
    const e = createEngine('fr');
    const rooms = () => call<SubjectDto[]>(e, 't', 'GET', '/api/stagiaire/subjects', login(e, SARA)).body.find(s => s.code === 'ROOMS')!;
    // 2 teams of 5 seats, 5 taken
    expect(rooms()).toMatchObject({ free: 5, occupation: 50 });
    join(e, login(e, SARA));
    expect(rooms()).toMatchObject({ free: 4, occupation: 60 });
  });

  it('joining takes a seat, writes the selection and the history, then shows the assignment', () => {
    const e = createEngine('fr');
    const token = login(e, SARA);
    expect(call(e, 't', 'GET', '/api/stagiaire/team-membership', token).status).toBe(404);
    expect(join(e, token).status).toBe(201);
    const a = call<AssignmentDto>(e, 't', 'GET', '/api/stagiaire/team-membership', token).body;
    expect(a.team.name).toBe('Team-ROOMS-1');
    expect(a.position.title).toBe('Développeur backend');
    expect(a.team.members.map(m => m.name)).toContain('Sara Alaoui');
    expect(e.db.internship_db.subject_selections.some(s => s.stagiaire_id === 3)).toBe(true);
    expect(e.db.internship_db.team_histories[0].detail).toContain('Développeur backend');
  });

  it('refuses a second team, a full position and a team of another subject', () => {
    const e = createEngine('fr');
    expect(join(e, login(e, YASSINE)).status).toBe(409);
    const token = login(e, SARA);
    expect(join(e, token, 1, 1, 3).status).toBe(409); // DevOps of Team-ROOMS-1 is taken
    expect(join(e, token, 1, 3, 1).status).toBe(400); // Team-ENERGY-1 is not a ROOMS team
    expect(join(e, token, 1, 1, 4).status).toBe(400); // nor is the data analyst a ROOMS position
    expect(e.db.internship_db.team_memberships.some(m => m.stagiaire_id === 3)).toBe(false);
  });

  it('a team becomes FULL with its last seat, and OPEN again when someone leaves', () => {
    const e = createEngine('fr');
    const status = () => e.db.internship_db.teams[0].status;
    const token = login(e, SARA);
    expect(status()).toBe('OPEN');
    // everything is taken but the frontend seat Sara is about to take
    e.db.internship_db.team_position_slots.filter(s => s.team_id === 1).forEach(s => { s.occupied_count = s.capacity - (s.position_id === 2 ? 1 : 0); });
    expect(join(e, token, 1, 1, 2).status).toBe(201);
    expect(status()).toBe('FULL');
    expect(call(e, 't', 'DELETE', '/api/stagiaire/team-membership', token).status).toBe(204);
    expect(status()).toBe('OPEN');
  });

  it('changing position moves the seat, and refuses a full one or another subject', () => {
    const e = createEngine('fr');
    const token = login(e, YASSINE);
    const seats = (positionId: number) => e.db.internship_db.team_position_slots.find(s => s.team_id === 1 && s.position_id === positionId)!.occupied_count;
    expect(call(e, 't', 'PUT', '/api/stagiaire/team-membership/position', token, { subjectPositionId: 3 }).status).toBe(409);
    expect(call(e, 't', 'PUT', '/api/stagiaire/team-membership/position', token, { subjectPositionId: 4 }).status).toBe(400);
    expect(call(e, 't', 'PUT', '/api/stagiaire/team-membership/position', token, { subjectPositionId: 2 }).status).toBe(200);
    expect([seats(1), seats(2)]).toEqual([0, 2]);
    const a = call<AssignmentDto>(e, 't', 'GET', '/api/stagiaire/team-membership', token).body;
    expect(a.position.title).toBe('Développeur frontend');
  });

  it('leaving frees the seat and a new team can be joined', () => {
    const e = createEngine('fr');
    const token = login(e, YASSINE);
    expect(call(e, 't', 'DELETE', '/api/stagiaire/team-membership', token).status).toBe(204);
    expect(call(e, 't', 'DELETE', '/api/stagiaire/team-membership', token).status).toBe(404);
    expect(call<TeamDto[]>(e, 't', 'GET', '/api/stagiaire/subjects/1/teams', token).body[0].free).toBe(3);
    expect(join(e, token, 1, 2, 3).status).toBe(201);
  });

  it('the skill tree only holds validated missions, by member', () => {
    const e = createEngine('fr');
    const token = login(e, YASSINE);
    const tree = call<CompetenceTree>(e, 't', 'GET', '/api/stagiaire/teams/1/acquired-competences', token).body;
    const yassine = tree.members.find(m => m.name === 'Yassine Idrissi')!;
    expect(yassine.missions.map(m => m.title)).toEqual(['Modèle de données des réservations']);
    expect(yassine.missions[0].competences).toContain('JPA et PostgreSQL');
    expect(call(e, 't', 'GET', '/api/stagiaire/teams/2/acquired-competences', token).status).toBe(403);
  });
});

describe('intern platform demo, the simulated GitHub repository', () => {
  const setup = () => { const e = createEngine('fr'); return { e, token: login(e, YASSINE) }; };

  it('lists the linked repository for team members only', () => {
    const { e, token } = setup();
    const [repo] = call<RepositoryDto[]>(e, 't', 'GET', '/api/github/teams/1/repositories', token).body;
    expect(repo).toMatchObject({ fullName: 'estage-demo/team-rooms-1', defaultBranch: 'main' });
    expect(repo.branches.map(b => b.name)).toEqual(['main', 'develop', 'feature/reservations-api']);
    expect(call(e, 't', 'GET', '/api/github/teams/2/repositories', token).status).toBe(403);
    expect(call(e, 't', 'GET', '/api/github/repositories/2/commits?branch=main', token).status).toBe(403);
  });

  it('a branch holds its own commits and those of the branches it is built on', () => {
    const { e, token } = setup();
    const count = (branch: string) => call<CommitRow[]>(e, 't', 'GET', `/api/github/repositories/1/commits?branch=${encodeURIComponent(branch)}`, token).body.length;
    expect([count('main'), count('develop'), count('feature/reservations-api')]).toEqual([3, 6, 9]);
  });

  it('each branch head is its newest commit', () => {
    const { e, token } = setup();
    const [repo] = call<RepositoryDto[]>(e, 't', 'GET', '/api/github/teams/1/repositories', token).body;
    for (const b of repo.branches) {
      const list = call<CommitRow[]>(e, 't', 'GET', `/api/github/repositories/1/commits?branch=${encodeURIComponent(b.name)}`, token).body;
      expect(b.head_sha).toBe(list[0].sha);
    }
  });

  it('browses folders first, then files, on the chosen branch', () => {
    const { e, token } = setup();
    const list = (branch: string, path = '') => call<ContentItem[]>(e, 't', 'GET', `/api/github/repositories/1/contents?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`, token).body;
    const names = list('develop').map(i => i.name);
    expect(names.slice(0, 3)).toEqual(['.github', 'backend', 'frontend']);
    expect(names).toContain('README.md');
    expect(list('main').map(i => i.name)).not.toContain('README.md');
    expect(list('feature/reservations-api', 'backend/src/main/java/demo/rooms').map(i => i.name)).toEqual(['ReservationController.java', 'ReservationService.java']);
  });

  it('reads a file on its branch and answers 404 on a branch without it', () => {
    const { e, token } = setup();
    const read = (branch: string) => call<FileDto>(e, 't', 'GET', `/api/github/repositories/1/files?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent('backend/src/main/java/demo/rooms/ReservationService.java')}`, token);
    expect(read('feature/reservations-api').body.content).toContain('existsOverlap');
    expect(read('main').status).toBe(404);
  });

  it('links a Git identity only to the account using its email', () => {
    const e = createEngine('fr');
    const sara = login(e, SARA);
    join(e, sara);
    const list = () => call<GitIdentity[]>(e, 't', 'GET', '/api/github/teams/1/git-identities', sara).body;
    const mine = list().find(g => g.login === 'sara-alaoui-dev')!;
    expect(mine.linked_user_id).toBeNull();
    const yassine = login(e, YASSINE);
    expect(call(e, 't', 'POST', `/api/github/teams/1/git-identities/${mine.id}/link`, yassine).status).toBe(409);
    expect(call(e, 't', 'POST', `/api/github/teams/1/git-identities/${mine.id}/link`, sara).status).toBe(200);
    expect(list().find(g => g.login === 'sara-alaoui-dev')!.linked_user_id).toBe(3);
  });

  it('records each request with its journey, and refreshing updates the sync date', () => {
    let t = 1_800_000_000_000;
    const e = createEngine('fr', () => t);
    const token = login(e, YASSINE);
    const before = e.db.internship_db.project_repositories[0].last_sync_at;
    t += 3_600_000;
    call(e, 't', 'POST', '/api/github/teams/1/repositories/refresh-selection', token);
    expect(e.db.internship_db.project_repositories[0].last_sync_at > before).toBe(true);
    expect(e.traces[0].hops.map(h => h.node)).toEqual(['nginx', 'gateway', 'github', 'postgres']);
  });
});
