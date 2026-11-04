import { describe, expect, it } from 'vitest';
import { aggregate, callApi, createEngine, DEMO_TOKEN, mailBody, mailSubject, runBatch, userHourTotal } from '../src/projects/home-energy-tracker/demo/logic';

const seeded = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

describe('Home Energy Tracker mocked platform', () => {
  it('sends 1 000 readings per simulator run, on devices 1 to 199, between 0 and 2 kWh (rounded, so 2.0 is possible)', () => {
    const e = createEngine('fr');
    runBatch(e, Date.now(), seeded());
    expect(e.counts.sim).toBe(1000);
    expect(e.readings).toHaveLength(1000);
    expect(e.readings.every(r => r.deviceId >= 1 && r.deviceId <= 199 && r.energy >= 0 && r.energy <= 2)).toBe(true);
  });

  it('alerts once per aggregation while the hour total is above the threshold, like UsageService', () => {
    const e = createEngine('fr');
    e.user.energyAlertingThreshold = 1;
    runBatch(e, Date.now(), seeded(7));
    expect(aggregate(e)?.outcome).toBe('alert');
    expect(aggregate(e)?.outcome).toBe('alert');
    expect(e.mails).toHaveLength(2);
  });

  it('does not alert when alerting is off or the total is under the threshold', () => {
    const e = createEngine('fr');
    runBatch(e, Date.now(), seeded(3));
    e.user.energyAlertingThreshold = 1e6;
    expect(aggregate(e)?.outcome).toBe('below');
    e.user.energyAlertingThreshold = 0; e.user.alerting = false;
    expect(aggregate(e)?.outcome).toBe('disabled');
    expect(e.mails).toHaveLength(0);
  });

  it('only counts the last hour', () => {
    const e = createEngine('fr');
    const now = Date.now();
    e.readings.push({ deviceId: 1, energy: 5, t: now - 2 * 3_600_000 }, { deviceId: 2, energy: 1.5, t: now });
    expect(userHourTotal(e, now)).toBe(1.5);
  });

  it('writes the e-mail exactly like AlertService', () => {
    const ev = { userId: 1, message: 'Energy consumption threshold exceeded', threshold: 120, energyConsumed: 131.42, email: 'x@y' };
    expect(mailSubject(ev)).toBe('Energy Usage Alert for User 1');
    expect(mailBody(ev)).toBe('Alert: Energy consumption threshold exceeded\nThreshold: 120.0\nEnergy Consumed: 131.42');
  });

  it('answers 401 without a token, then serves the route once authorized', () => {
    const e = createEngine('fr');
    expect(callApi(e, 0, { id: '1' }, undefined).status).toBe(401);
    e.token = DEMO_TOKEN;
    const res = callApi(e, 0, { id: '1' }, undefined);
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).energyAlertingThreshold).toBe(120);
  });

  it('updates the threshold through PUT /api/v1/user/{id}', () => {
    const e = createEngine('fr');
    e.token = DEMO_TOKEN;
    const res = callApi(e, 1, { id: '1' }, JSON.stringify({ alerting: true, energyAlertingThreshold: 300 }));
    expect(res.body).toBe('User Updated successfully');
    expect(e.user.energyAlertingThreshold).toBe(300);
  });

  it('ingests a reading sent by hand and counts it for its owner', () => {
    const e = createEngine('fr');
    e.token = DEMO_TOKEN;
    expect(callApi(e, 5, {}, JSON.stringify({ deviceId: 3, energyConsumed: 25.5 })).status).toBe(201);
    expect(userHourTotal(e)).toBe(25.5);
  });
});
