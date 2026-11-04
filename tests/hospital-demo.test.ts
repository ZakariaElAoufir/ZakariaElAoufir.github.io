import { describe, expect, it } from 'vitest';
import {
  ACCOUNTS, addSlot, adminAdd, adminDelete, availableSlots, book, createEngine, deleteSlot, doctorAppointments, frDate, login, markRead,
  patientAppointments, register, sendReminder, setStatus, unreadCount, type Utilisateur
} from '../src/projects/rendez-vous-hospitaliers/demo/logic';

const NOW = new Date(2026, 10, 4, 10, 0).getTime();
const engine = () => createEngine(() => NOW);
const as = (e: ReturnType<typeof engine>, who: keyof typeof ACCOUNTS) => login(e, ACCOUNTS[who].email, ACCOUNTS[who].password) as Utilisateur;

describe('MEDIGOO demo, rules copied from the Android code', () => {
  it('signs in by e-mail and password, and the role decides the account', () => {
    const e = engine();
    expect(as(e, 'doctor').role).toBe('Medecin');
    expect(login(e, ACCOUNTS.patient.email, 'wrong')).toBeNull();
    expect(login(e, '', '')).toBe('empty');
  });

  it('registering creates a Patient; a second account with the same e-mail stops the app', () => {
    const e = engine();
    const f = { prenom: 'Lina', nom: 'Berrada', telephone: '0600000000', email: 'lina@medigoo.ma', password: 'x' };
    expect(register(e, f)).toBe('ok');
    expect(e.db.Utilisateur.at(-1)).toMatchObject({ email: 'lina@medigoo.ma', role: 'Patient' });
    expect(register(e, f)).toBe('crash');
  });

  it('booking writes a confirmed appointment and takes the slot, once', () => {
    const e = engine();
    const sara = as(e, 'patient');
    const offers = availableSlots(e);
    expect(offers.every(o => o.creneau.disponible)).toBe(true);
    const id = offers[0].creneau.id;
    expect(book(e, sara, id, ' Toux ')).toBe('ok');
    expect(e.db.RendezVous.at(-1)).toMatchObject({ patient_id: sara.id, creneau_id: id, statut: 'confirmé', motif: 'Toux' });
    expect(e.db.Creneau.find(c => c.id === id)?.disponible).toBe(false);
    expect(book(e, sara, id, '')).toBe('taken');
    expect(availableSlots(e).some(o => o.creneau.id === id)).toBe(false);
  });

  it('lists appointments newest slot first, for the patient and for the doctor', () => {
    const e = engine();
    const sara = as(e, 'patient');
    book(e, sara, 5, '');
    expect(patientAppointments(e, sara.id).map(v => v.rdv.creneau_id)).toEqual([5, 1]);
    expect(doctorAppointments(e, 2).map(v => v.other?.prenom)).toEqual(['Sara', 'Omar']);
  });

  it('a reminder is an unread notification row; reading it clears the badge', () => {
    const e = engine();
    const doctor = as(e, 'doctor');
    const [v] = doctorAppointments(e, doctor.id);
    const n = sendReminder(e, v.other!, doctor, v.creneau!);
    expect(n.message).toContain('Dr. Benali est prévu le');
    expect(unreadCount(e, v.other!.id)).toBe(1);
    markRead(e, n.id);
    expect(unreadCount(e, v.other!.id)).toBe(0);
  });

  it('changes the status of an appointment', () => {
    const e = engine();
    setStatus(e, 2, 'terminé');
    expect(e.db.RendezVous.find(r => r.id === 2)?.statut).toBe('terminé');
  });

  it('adds a slot only when every field is filled, and deleting one cascades to its appointment', () => {
    const e = engine();
    expect(addSlot(e, 2, '', '10:00', '10:30')).toBe(false);
    expect(addSlot(e, 2, '2026-11-12', '11:00', '11:30')).toBe(true);
    deleteSlot(e, 3);
    expect(e.db.RendezVous.some(r => r.creneau_id === 3)).toBe(false);
  });

  it('the admin adds a user with a role; deleting a doctor removes their slots and appointments', () => {
    const e = engine();
    expect(adminAdd(e, { prenom: 'Y', nom: 'Amrani', telephone: '06', email: 'y@m.ma', password: 'p', role: 'Medecin', antecedents: '', specialite: 'Dermatologie' })).toBe('ok');
    adminDelete(e, 2);
    expect(e.db.Creneau.some(c => c.medecin_id === 2)).toBe(false);
    expect(e.db.RendezVous.some(r => r.medecin_id === 2)).toBe(false);
  });

  it('formats dates like the adapters (Locale.FRENCH)', () => {
    expect(frDate('2026-11-05', 'long')).toBe('jeudi 5 novembre 2026');
    expect(frDate('2026-11-05', 'week')).toBe('jeu. 5 nov. 2026');
    expect(frDate('2026-11-05', 'short')).toBe('05/11/2026');
    expect(frDate('demain', 'short')).toBe('demain');
  });
});
