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

describe('verificação antes de participar/votar', () => {
  const { gateChallengeAction } = events;
  const adult = { birthDate: '2000-01-01' };
  const minor = { birthDate: '2010-01-01' };
  const open = { status: 'active', startsAt: NOW - HOUR, endsAt: NOW + 24 * HOUR };

  it('desafios sem idade mínima passam para todos', () => {
    expect(gateChallengeAction('submit', {}, open, null, NOW)).toBeNull();
    expect(gateChallengeAction('vote', {}, open, minor, NOW)).toBeNull();
  });

  it('18+ recusa menores e quem não indicou idade', () => {
    const alcohol = { ...open, alcohol: true };
    expect(gateChallengeAction('submit', {}, alcohol, adult, NOW)).toBeNull();
    expect(gateChallengeAction('submit', {}, alcohol, minor, NOW)).toMatch(/maiores de 18/);
    expect(gateChallengeAction('vote', {}, { ...open, minAge: 16 }, null, NOW)).toMatch(/data de nascimento/);
  });

  it('retirar um voto é sempre permitido', () => {
    expect(gateChallengeAction('vote', { remove: true }, { ...open, alcohol: true }, minor, NOW)).toBeNull();
  });

  it('desafios agendados e inexistentes são recusados', () => {
    expect(gateChallengeAction('submit', {}, { ...open, startsAt: NOW + HOUR }, adult, NOW)).toMatch(/ainda não abriu/);
    expect(gateChallengeAction('vote', {}, null, adult, NOW)).toMatch(/não existe/);
  });
});

describe('desafios regionais', () => {
  const { gateChallengeAction, inChallengeRegion } = events;
  const beira = { status: 'active', startsAt: NOW - HOUR, endsAt: NOW + 24 * HOUR, provinces: ['SF'] };

  it('só participa quem tem a província no perfil', () => {
    expect(gateChallengeAction('submit', {}, beira, null, NOW, 'SF')).toBeNull();
    expect(gateChallengeAction('submit', {}, beira, null, NOW, 'MP')).toMatch(/região/);
    expect(gateChallengeAction('submit', {}, beira, null, NOW, null)).toMatch(/província/);
  });

  it('votar continua aberto a todos', () => {
    expect(gateChallengeAction('vote', {}, beira, null, NOW, 'MP')).toBeNull();
  });

  it('desafios nacionais aceitam todas as províncias', () => {
    expect(inChallengeRegion({}, 'NI')).toBe(true);
    expect(inChallengeRegion({ provinces: ['MP', 'MC'] }, 'MC')).toBe(true);
    expect(inChallengeRegion({ provinces: ['MP', 'MC'] }, 'GZ')).toBe(false);
  });
});
