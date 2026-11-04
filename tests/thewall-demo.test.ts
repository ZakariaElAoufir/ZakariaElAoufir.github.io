import { describe, expect, it } from 'vitest';
import {
  accept, createEngine, deleteMessage, editMessage, follow, like, loadAddFriends, loadConversations, loadProfile, loadRequests,
  markSeen, openChat, reject, relativeTime, sendMessage, signUp, userId
} from '../src/projects/the-wall/demo/logic';

const start = () => {
  const e = createEngine('fr', 'wall.jpg');
  return { e, nora: userId(e, 'nora'), samir: userId(e, 'samir'), karim: userId(e, 'karim'), ines: userId(e, 'ines') };
};

describe('The Wall replayed on a mock Supabase', () => {
  it('lists only people who are not friends yet, and sends one request at most', () => {
    const { e, nora, samir } = start();
    expect(loadAddFriends(e, samir).map(c => c.username).sort()).toEqual(['ines', 'nora']);
    expect(follow(e, samir, nora)).toBe(true);
    expect(follow(e, samir, nora)).toBe(false);
    expect(e.db.follow_requests.filter(r => r.sender_id === samir)).toHaveLength(1);
    expect(loadAddFriends(e, samir).find(c => c.id === nora)?.status).toBe('En attente');
  });

  it('shows sent and received requests, and accepting writes the friendship both ways', () => {
    const { e, nora, samir } = start();
    follow(e, samir, nora);
    const requests = loadRequests(e, nora);
    expect(requests.map(r => r.sender_id)).toContain(samir);
    accept(e, nora, requests.find(r => r.sender_id === samir)!.id);
    expect(e.db.friends.filter(f => (f.user_id === nora && f.friend_id === samir) || (f.user_id === samir && f.friend_id === nora))).toHaveLength(2);
    expect(e.db.follow_requests.some(r => r.sender_id === samir)).toBe(false);
    expect(loadConversations(e, samir).map(c => c.username)).toContain('nora');
    expect(loadProfile(e, nora).friends).toBe(3);
    expect(e.steps.has('request') && e.steps.has('accept')).toBe(true);
  });

  it('rejecting only deletes the request', () => {
    const { e, nora, karim } = start();
    const before = e.db.friends.length;
    reject(e, nora, loadRequests(e, nora).find(r => r.sender_id === karim)!.id);
    expect(e.db.follow_requests).toHaveLength(0);
    expect(e.db.friends).toHaveLength(before);
  });

  it('gives the last message and the unread count of each conversation', () => {
    const { e, nora } = start();
    const ines = loadConversations(e, nora).find(c => c.username === 'ines')!;
    expect(ines.unread).toBe(1);
    expect(ines.last?.by).toBe('ines');
  });

  it('marks received messages seen when the conversation opens, not the ones I sent', () => {
    const { e, nora, ines } = start();
    const list = openChat(e, nora, ines);
    expect(list.filter(m => m.sender_id === ines).every(m => m.seen)).toBe(true);
    expect(markSeen(e, nora, ines)).toBe(0);
    const leo = userId(e, 'leo');
    expect(e.db.messages.find(m => m.sender_id === nora && m.receiver_id === leo)?.seen).toBe(false);
  });

  it('uploads the picture to chat-pictures and keeps only its public URL in the message', () => {
    const { e, nora, ines } = start();
    const files = e.db['storage.chat-pictures'].length;
    const m = sendMessage(e, nora, ines, '  ', { name: 'ville.jpg', src: 'ville.svg' })!;
    expect(m.content).toBeNull();
    expect(m.image_url).toMatch(/\/storage\/v1\/object\/public\/chat-pictures\/msg_\d+\.jpg$/);
    expect(e.db['storage.chat-pictures']).toHaveLength(files + 1);
    expect(e.pictures.get(m.image_url!)).toBe('ville.svg');
    expect(sendMessage(e, nora, ines, '   ', null)).toBeNull();
  });

  it('edits and deletes a message; the picture stays in the bucket', () => {
    const { e, nora, ines } = start();
    const m = sendMessage(e, nora, ines, 'Salut', { name: 'wall.jpg', src: 'wall.jpg' })!;
    expect(editMessage(e, nora, m.id, '')).toBe(false);
    editMessage(e, nora, m.id, 'Salut Inès');
    expect(e.db.messages.find(x => x.id === m.id)?.content).toBe('Salut Inès');
    const files = e.db['storage.chat-pictures'].length;
    deleteMessage(e, nora, m.id);
    expect(e.db.messages.some(x => x.id === m.id)).toBe(false);
    expect(e.db['storage.chat-pictures']).toHaveLength(files);
  });

  it('counts one like per user', () => {
    const { e, samir } = start();
    const pub = e.db.publications.find(p => p.content?.startsWith('Révisions'))!;
    expect(like(e, samir, pub.id)).toBe(true);
    expect(like(e, samir, pub.id)).toBe(false);
    expect(pub.likes).toBe(3);
  });

  it('checks the sign-up form like the app', () => {
    const { e } = start();
    const f = { email: 'a@b.c', password: 'x', confirm: 'y', nom: 'A', prenom: 'B', username: 'ab' };
    expect(signUp(e, f)).toEqual({ error: 'Passwords do not match!' });
    expect(signUp(e, { ...f, confirm: 'x', nom: '' })).toEqual({ error: 'Please fill all fields!' });
    expect('id' in signUp(e, { ...f, confirm: 'x' })).toBe(true);
  });

  it('writes relative times in the app’s words', () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 20e3).toISOString(), now)).toBe("À l'instant");
    expect(relativeTime(new Date(now - 3 * 3600e3).toISOString(), now)).toBe('3 h');
    expect(relativeTime(new Date(now - 2 * 86400e3).toISOString(), now)).toBe('2 j');
  });
});
