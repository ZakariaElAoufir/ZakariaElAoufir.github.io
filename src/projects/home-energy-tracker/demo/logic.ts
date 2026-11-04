// A small in-browser replay of Home Energy Tracker. The rules are copied from the project's code:
// - ParallelDataSimulator: 1 000 readings every 5 s, deviceId random in [1, 200), energy random in [0, 2) rounded to 0.01
// - UsageService: every 10 s, sum of the last hour per device, owner from device-service, threshold and e-mail from
//   user-service, event on energy-alerts when the total is above the threshold and alerting is on (sent again every 10 s)
// - AlertService / EmailService: subject "Energy Usage Alert for User {id}", body "Alert: …\nThreshold: …\nEnergy Consumed: …"
// - api-gateway: every /api/v1 route needs a JWT, otherwise 401
// Nothing here calls a server.

export const READINGS_PER_BATCH = 1000;
export const BATCH_MS = 5000;
export const AGGREGATION_MS = 10000;
export const DEVICE_IDS = 199;          // random.nextLong(1, 200)
const HOUR_MS = 3_600_000;

export type Lang = 'fr' | 'en';
export type User = { id: number; name: string; surname: string; email: string; address: string; alerting: boolean; energyAlertingThreshold: number };
export type Device = { id: number; name: string; type: string; location: string; userId: number };
export type UsageEvent = { deviceId: number; energyConsumed: number; timestamp: string };
export type AlertEvent = { userId: number; message: string; threshold: number; energyConsumed: number; email: string };
export type Message<T> = { offset: number; value: T; t: number };
export type Mail = { id: number; event: AlertEvent; t: number; read: boolean };
export type HttpHit = { app: string; uri: string; method: string; status: number; t: number };
export type Aggregation = { n: number; total: number; threshold: number; outcome: 'alert' | 'below' | 'disabled' };
export type Counts = { sim: number; ing: number; ku: number; infl: number; agg: number; ka: number; mail: number };

export type Engine = {
  running: boolean;
  token: string | null;
  user: User;
  devices: Device[];
  nextDeviceId: number;
  readings: { deviceId: number; energy: number; t: number }[];
  counts: Counts;
  usageMessages: Message<UsageEvent>[];
  alertMessages: Message<AlertEvent>[];
  mails: Mail[];
  http: HttpHit[];
  last: Aggregation | null;
};

const DEVICE_NAMES: Record<Lang, [string, string, string][]> = {
  fr: [['Enceinte salon', 'SPEAKER', 'Salon'], ['Caméra entrée', 'CAMERA', 'Entrée'], ['Thermostat', 'THERMOSTAT', 'Couloir'],
    ['Lumière cuisine', 'LIGHT', 'Cuisine'], ['Serrure', 'LOCK', "Porte d'entrée"], ['Sonnette', 'DOORBELL', "Porte d'entrée"]],
  en: [['Living room speaker', 'SPEAKER', 'Living room'], ['Entrance camera', 'CAMERA', 'Entrance'], ['Thermostat', 'THERMOSTAT', 'Hallway'],
    ['Kitchen light', 'LIGHT', 'Kitchen'], ['Lock', 'LOCK', 'Front door'], ['Doorbell', 'DOORBELL', 'Front door']]
};

export function createEngine(lang: Lang): Engine {
  return {
    running: false,
    token: null,
    user: { id: 1, name: 'Demo', surname: 'User', email: 'demo.user@het.local', address: '12 rue des Lilas, Rabat', alerting: true, energyAlertingThreshold: 120 },
    devices: DEVICE_NAMES[lang].map(([name, type, location], i) => ({ id: i + 1, name, type, location, userId: 1 })),
    nextDeviceId: 200,
    readings: [],
    counts: { sim: 0, ing: 0, ku: 0, infl: 0, agg: 0, ka: 0, mail: 0 },
    usageMessages: [],
    alertMessages: [],
    mails: [],
    http: [],
    last: null
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const keep = <T,>(list: T[], max: number) => (list.length > max ? list.slice(-max) : list);

/** Energy of user 1's devices over the last hour, the figure UsageService compares with the threshold. */
export function userHourTotal(e: Engine, now = Date.now()) {
  const owned = new Set(e.devices.filter(d => d.userId === e.user.id).map(d => d.id));
  return e.readings.filter(r => owned.has(r.deviceId) && now - r.t < HOUR_MS).reduce((sum, r) => sum + r.energy, 0);
}

function record(e: Engine, deviceId: number, energy: number, now: number, showInTopic: boolean) {
  e.readings.push({ deviceId, energy, t: now });
  if (showInTopic) e.usageMessages.push({ offset: e.counts.ku, value: { deviceId, energyConsumed: energy, timestamp: new Date(now).toISOString() }, t: now });
  e.counts.ing++; e.counts.ku++; e.counts.infl++;
}

/** One run of the simulator: 1 000 readings. Only a sample is kept for the Kafka message list. */
export function runBatch(e: Engine, now = Date.now(), random = Math.random) {
  for (let i = 0; i < READINGS_PER_BATCH; i++) {
    const deviceId = 1 + Math.floor(random() * DEVICE_IDS);
    const energy = round2(random() * 2);
    record(e, deviceId, energy, now, i % 40 === 0 || deviceId <= 6);
  }
  e.counts.sim += READINGS_PER_BATCH;
  e.usageMessages = keep(e.usageMessages, 80);
  for (let i = 0; i < 40; i++) e.http.push({ app: 'ingestion-service', uri: '/api/v1/ingestion', method: 'POST', status: 201, t: now });
}

/** UsageService.aggregateDeviceEnergyUsage, for user 1. Returns null when there is nothing to add up. */
export function aggregate(e: Engine, now = Date.now()): Aggregation | null {
  e.readings = e.readings.filter(r => now - r.t < HOUR_MS);
  if (!e.readings.length) return null;
  e.counts.agg++;
  e.http.push({ app: 'device-service', uri: '/api/v1/device/{id}', method: 'GET', status: 200, t: now });
  e.http.push({ app: 'user-service', uri: '/api/v1/user/{id}', method: 'GET', status: 200, t: now });
  const total = userHourTotal(e, now), threshold = e.user.energyAlertingThreshold;
  let outcome: Aggregation['outcome'] = 'below';
  if (!e.user.alerting) outcome = 'disabled';
  else if (total > threshold) {
    outcome = 'alert';
    const event: AlertEvent = { userId: e.user.id, message: 'Energy consumption threshold exceeded', threshold, energyConsumed: round2(total), email: e.user.email };
    e.alertMessages = keep([...e.alertMessages, { offset: e.counts.ka, value: event, t: now }], 50);
    e.counts.ka++;
    e.mails = [{ id: e.counts.mail, event, t: now, read: false }, ...e.mails].slice(0, 50);
    e.counts.mail++;
  }
  e.last = { n: e.counts.agg, total, threshold, outcome };
  return e.last;
}

/** Java prints doubles with at least one decimal: 120 -> "120.0". */
export const javaDouble = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
export const mailSubject = (ev: AlertEvent) => `Energy Usage Alert for User ${ev.userId}`;
export const mailBody = (ev: AlertEvent) => `Alert: ${ev.message}\nThreshold: ${javaDouble(ev.threshold)}\nEnergy Consumed: ${javaDouble(ev.energyConsumed)}`;

// ---------- the API, as the gateway exposes it ----------
export type Operation = { tag: string; method: 'get' | 'post' | 'put' | 'delete'; path: string; params?: Record<string, number>; body?: (e: Engine) => string };

export const OPERATIONS: Operation[] = [
  { tag: 'user-service', method: 'get', path: '/api/v1/user/{id}', params: { id: 1 } },
  { tag: 'user-service', method: 'put', path: '/api/v1/user/{id}', params: { id: 1 },
    body: e => JSON.stringify({ name: e.user.name, surname: e.user.surname, email: e.user.email, address: e.user.address, alerting: e.user.alerting, energyAlertingThreshold: e.user.energyAlertingThreshold }, null, 2) },
  { tag: 'device-service', method: 'get', path: '/api/v1/device/user/{userId}', params: { userId: 1 } },
  { tag: 'device-service', method: 'post', path: '/api/v1/device/create', body: () => JSON.stringify({ name: 'Desk plug', type: 'LIGHT', location: 'Office', userId: 1 }, null, 2) },
  { tag: 'device-service', method: 'delete', path: '/api/v1/device/delete/{id}', params: { id: 6 } },
  { tag: 'ingestion-service', method: 'post', path: '/api/v1/ingestion', body: () => JSON.stringify({ deviceId: 3, energyConsumed: 25.5, timestamp: new Date().toISOString() }, null, 2) },
  { tag: 'insight-service', method: 'get', path: '/api/v1/insight/saving-tips/{userId}', params: { userId: 1 } },
  { tag: 'insight-service', method: 'get', path: '/api/v1/insight/overview/{userId}', params: { userId: 1 } }
];

export type ApiResponse = { status: number; body: string; headers: string; delayMs: number };

/** A fake token, shaped like the ones Keycloak issues for het-security-realm. */
export const DEMO_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJoZXQifQ.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwOTEvcmVhbG1zL2hldC1zZWN1cml0eS1yZWFsbSJ9.c2lnbmF0dXJl';

const json = (status: number, value: unknown, delayMs = 0): ApiResponse => ({ status, body: JSON.stringify(value, null, 2), headers: 'content-type: application/json', delayMs });
const text = (status: number, value: string): ApiResponse => ({ status, body: value, headers: 'content-type: text/plain;charset=UTF-8', delayMs: 0 });
const empty = (status: number, headers = 'content-length: 0'): ApiResponse => ({ status, body: '', headers, delayMs: 0 });

const TIPS = (total: number) => `Your total energy usage over the past 3 days is ${total} kWh. To reduce it: lower the thermostat by 1 to 2 °C when nobody is home, switch the speaker and the camera to eco mode at night, and use LED bulbs with motion sensors in the kitchen. Compared with an average household, this is a moderate consumption, mostly driven by heating.`;
const OVERVIEW = 'Overview of the past 3 days: the thermostat is the largest consumer, followed by the kitchen light. The camera, lock and doorbell use little energy but run all day. Actionable insights: schedule the thermostat and the lights, and check the speaker standby consumption.';

/** What the gateway and the service behind it answer. Mutates the engine like the real call would. */
export function callApi(e: Engine, index: number, params: Record<string, string>, bodyText: string | undefined, now = Date.now()): ApiResponse {
  const op = OPERATIONS[index];
  const hit = (status: number, app = op.tag) => {
    e.http.push({ app, uri: op.path, method: op.method.toUpperCase(), status, t: now });
  };
  if (!e.token) { hit(401, 'api-gateway'); return empty(401, 'www-authenticate: Bearer\ncontent-length: 0'); }

  let body: Record<string, unknown> = {};
  if (bodyText !== undefined) {
    try { body = JSON.parse(bodyText); } catch { hit(400); return json(400, { status: 400, error: 'Bad Request', message: 'JSON parse error' }); }
  }
  const id = Number(Object.values(params)[0]);
  const respond = (r: ApiResponse) => { hit(r.status); return r; };

  switch (index) {
    case 0: return respond(id === e.user.id ? json(200, e.user) : empty(404));
    case 1: {
      if (id !== e.user.id) return respond(text(404, 'User not found'));
      const threshold = Number(body.energyAlertingThreshold);
      e.user = { ...e.user, ...body, id: e.user.id, alerting: Boolean(body.alerting ?? e.user.alerting),
        energyAlertingThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : e.user.energyAlertingThreshold } as User;
      return respond(text(200, 'User Updated successfully'));
    }
    case 2: return respond(json(200, e.devices.filter(d => d.userId === id)));
    case 3: {
      const device: Device = { id: e.nextDeviceId++, name: String(body.name ?? ''), type: String(body.type ?? 'LIGHT'), location: String(body.location ?? ''), userId: Number(body.userId ?? 1) };
      e.devices = [...e.devices, device];
      return respond(json(201, device));
    }
    case 4: e.devices = e.devices.filter(d => d.id !== id); return respond(empty(204));
    case 5: {
      const deviceId = Number(body.deviceId), energy = Number(body.energyConsumed);
      if (!Number.isFinite(deviceId) || !Number.isFinite(energy)) return respond(json(400, { status: 400, error: 'Bad Request' }));
      record(e, deviceId, energy, now, true);
      return respond(empty(201));
    }
    default: {
      const total = round2(userHourTotal(e, now));
      return respond(json(200, { userId: id, tips: index === 6 ? TIPS(total) : OVERVIEW, energyUsage: total }, 1800));
    }
  }
}

/** The curl command Swagger UI shows for a call. */
export function curlOf(e: Engine, index: number, path: string, bodyText?: string) {
  const op = OPERATIONS[index];
  let c = `curl -X '${op.method.toUpperCase()}' \\\n  'http://localhost:9000${path}' \\\n  -H 'accept: */*'`;
  if (e.token) c += ` \\\n  -H 'Authorization: Bearer ${e.token.slice(0, 24)}…'`;
  if (bodyText) c += ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${bodyText.replace(/\s+/g, ' ')}'`;
  return c;
}
