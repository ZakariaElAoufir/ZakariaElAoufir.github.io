import { describe, expect, it } from 'vitest';
import { ANSWERS, ask, conversationLabel, DISTANCE_THRESHOLD, initialConversations, SUGGESTIONS } from '../src/projects/agrigpt/demo/logic';

describe('AgriGPT mocked backend', () => {
  it('refuses a question without a farming keyword, like backend/rag.py', () => {
    const reply = ask('Quelle est la capitale du Maroc ?');
    expect(reply.kind).toBe('refusal');
  });

  it('answers every suggested farming question with its sources', () => {
    for (const q of SUGGESTIONS.slice(0, -1)) {
      const reply = ask(q);
      expect(reply.kind).toBe('answer');
      if (reply.kind === 'answer') expect(reply.exchange.sources.length).toBeGreaterThan(0);
    }
  });

  it('recognises a recorded question typed a little differently', () => {
    const reply = ask("a quel stade faut il arreter l'irrigation du blé");
    expect(reply.kind).toBe('answer');
  });

  it('says it does not know an unrecorded farming question instead of inventing one', () => {
    expect(ask('Comment fertiliser le maïs en serre ?').kind).toBe('unknown');
  });

  it('only shows excerpts the real threshold would keep', () => {
    for (const a of ANSWERS) for (const c of a.chunks) expect(c.distance).toBeLessThan(DISTANCE_THRESHOLD);
  });

  it('labels conversations like the Streamlit sidebar (35 characters)', () => {
    const [first] = initialConversations();
    expect(conversationLabel(first)).toBe('Qu’est-ce que le catalogue des usag...');
    expect(conversationLabel({ id: 'x', messages: [] })).toBe('Conversation vide');
  });
});
