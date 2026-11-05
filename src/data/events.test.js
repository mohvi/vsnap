import { describe, expect, it } from 'vitest';
import events from '../../api/_lib/events.js';

const {
  VOTE_DIGEST_MS, addVote, flushDue, voteMessage, inviteMessage, challengesToRemind, reminderMessage,
} = events;

const HOUR = 60 * 60 * 1000;
const NOW = new Date(2026, 10, 5, 12).getTime();

describe('votos agrupados', () => {
  it('o primeiro voto avisa logo; os seguintes na mesma hora acumulam', () => {
    let step = addVote(null, 'c1', NOW);
    expect(step.sendCount).toBe(1);
    step = addVote(step.next, 'c1', NOW + 10 * 60 * 1000);
    expect(step.sendCount).toBe(0);
    step = addVote(step.next, 'c1', NOW + 20 * 60 * 1000);
    expect(step.next.pending).toBe(2);
    expect(flushDue(step.next, NOW + 30 * 60 * 1000)).toBe(false);
    expect(flushDue(step.next, NOW + VOTE_DIGEST_MS)).toBe(true);
    // passada a hora, o voto seguinte leva os acumulados consigo
    const later = addVote(step.next, 'c2', NOW + 2 * HOUR);
    expect(later).toEqual({ sendCount: 3, next: { pending: 0, lastSentAt: NOW + 2 * HOUR, challengeId: 'c2' } });
  });

  it('textos no singular e no plural, dentro dos limites', () => {
    expect(voteMessage(1, 'c1', 'Praia').title).toBe('🗳️ Recebeste um voto!');
    expect(voteMessage(5, 'c1', 'Praia')).toMatchObject({ title: '🗳️ Recebeste 5 votos!', url: '/challenge/c1' });
    expect(inviteMessage('rui', 3, 10).body).toContain('3 de 10');
    expect(inviteMessage(null, 1, null).title).toContain('Um amigo');
    expect(voteMessage(2, 'c', 'x'.repeat(400)).body.length).toBeLessThanOrEqual(180);
  });
});

describe('lembretes do último dia', () => {
  it('só desafios activos que terminam nas próximas 26 horas e ainda não lembrados', () => {
    const challenges = {
      soon: { status: 'active', endsAt: NOW + 20 * HOUR, title: 'A' },
      later: { status: 'active', endsAt: NOW + 3 * 24 * HOUR },
      done: { status: 'pending_confirmation', endsAt: NOW + HOUR },
      past: { status: 'active', endsAt: NOW - HOUR },
      sent: { status: 'active', endsAt: NOW + 2 * HOUR },
    };
    const list = challengesToRemind(challenges, { sent: NOW - HOUR }, NOW);
    expect(list.map((c) => c.id)).toEqual(['soon']);
    expect(reminderMessage(list[0])).toMatchObject({ title: '⏳ Último dia: A', url: '/challenge/soon' });
  });
});
