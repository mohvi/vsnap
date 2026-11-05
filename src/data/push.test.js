import { describe, expect, it } from 'vitest';
import { audienceUids, auditTargetFor, canReceivePush, destinationUrl, reachable } from './push';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 5, 12).getTime();
const T = 'ExponentPushToken[abc]';

const users = {
  ana: { pushToken: T, lastLogin: NOW - DAY },
  rui: { pushToken: T, lastLogin: NOW - 10 * DAY },
  eva: { lastLogin: NOW - 20 * DAY },
  ban: { pushToken: T, banned: true, lastLogin: NOW - 30 * DAY },
  old: { pushToken: T, banned: true, bannedUntil: NOW - DAY, createdAt: NOW - 40 * DAY },
  del: { pushToken: T, deletionRequestedAt: NOW - DAY, lastLogin: NOW },
};
const entries = { c1: { e1: { userId: 'ana' }, e2: { userId: 'ana' }, e3: { userId: 'rui' }, e4: { userId: 'gone' } } };

describe('públicos das notificações', () => {
  it('só envia a quem tem token e não está banido nem a eliminar a conta', () => {
    expect(canReceivePush(users.ana, NOW)).toBe(true);
    expect(canReceivePush(users.eva, NOW)).toBe(false);
    expect(canReceivePush(users.ban, NOW)).toBe(false);
    expect(canReceivePush(users.old, NOW)).toBe(true); // banimento expirado
    expect(canReceivePush(users.del, NOW)).toBe(false);
    expect(reachable(audienceUids({ audience: 'all' }, { users }, NOW), users, NOW)).toEqual(['ana', 'rui', 'old']);
  });

  it('participantes contam uma vez e ignoram contas que já não existem', () => {
    expect(audienceUids({ audience: 'challenge', challengeId: 'c1' }, { users, entries }, NOW)).toEqual(['ana', 'rui']);
    expect(audienceUids({ audience: 'challenge', challengeId: 'x' }, { users, entries }, NOW)).toEqual([]);
  });

  it('inactivos usam o último acesso ou, sem ele, a data de registo', () => {
    expect(audienceUids({ audience: 'inactive' }, { users }, NOW)).toEqual(['rui', 'eva', 'ban', 'old']);
  });

  it('um utilizador, destino e alvo da auditoria', () => {
    expect(audienceUids({ audience: 'user', uid: 'eva' }, { users }, NOW)).toEqual(['eva']);
    expect(audienceUids({ audience: 'user', uid: 'nope' }, { users }, NOW)).toEqual([]);
    expect(destinationUrl({ destination: 'challenge', destinationChallengeId: 'c1' })).toBe('/challenge/c1');
    expect(destinationUrl({ destination: 'invite' })).toBe('/invite-friends');
    expect(destinationUrl({ destination: 'challenge' })).toBeNull();
    expect(auditTargetFor({ audience: 'inactive' })).toEqual({ type: 'push', id: 'inactive' });
    expect(auditTargetFor({ audience: 'user', uid: 'ana' })).toEqual({ type: 'user', id: 'ana' });
  });
});

describe('notificações automáticas', () => {
  it('vencedor recebe uma mensagem e os outros participantes outra, sem repetidos', async () => {
    const { winnerMessages } = await import('./push');
    const msgs = winnerMessages('c1', { title: 'Pôr do sol', prize: '5000 MZN', winnerId: 'ana' }, {
      e1: { userId: 'ana' }, e2: { userId: 'rui' }, e3: { userId: 'rui' }, e4: { userId: 'eva' },
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ uids: ['ana'], url: '/challenge/c1' });
    expect(msgs[0].body).toContain('5000 MZN');
    expect(msgs[1].uids).toEqual(['rui', 'eva']);
    expect(winnerMessages('c1', { title: 'x', winnerId: 'ana' }, { e1: { userId: 'ana' } })).toHaveLength(1);
  });

  it('corta títulos e mensagens longos para os limites da API', async () => {
    const { newChallengeMessage, TITLE_MAX, BODY_MAX } = await import('./push');
    const m = newChallengeMessage(['a'], 'c', { title: 'T'.repeat(200), prize: 'P'.repeat(300) });
    expect(m.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(m.body.length).toBeLessThanOrEqual(BODY_MAX);
    expect(m.title.endsWith('…')).toBe(true);
  });
});
