import { describe, expect, it } from 'vitest';
import {
  banUntil, buildUserIndex, buildUserTimeline, buildUsersCsv, countExpiredBans, filterUsers, indexRow,
  isBanExpired, sortUsers, userReports, userSnapsHistory,
} from './users';
import { auditDetails, auditTargetLabel, auditTargetLink } from './audit';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 2, 12).getTime();

const users = {
  ana: { name: 'Ana', username: 'ana', phone: '+258841', province: 'MPM', city: 'Maputo', snaps: 30, createdAt: NOW - 60 * DAY },
  rui: { name: 'Rui', username: 'rui', snaps: 5, createdAt: NOW - 2 * DAY, banned: true, bannedUntil: NOW - DAY, warningsCount: 1 },
  eva: { name: 'Eva', username: 'eva', snaps: 0, createdAt: NOW - 90 * DAY, lastLogin: NOW - 40 * DAY, banned: true },
};
const entries = { c1: { e1: { userId: 'ana', createdAt: NOW - DAY }, e2: { userId: 'ana', createdAt: NOW - 3 * DAY } } };
const votes = { c1: { rui: { entryId: 'e1', votedAt: NOW - 1000 } } };
const reports = {
  r1: { reportedUserId: 'ana', reportedBy: 'rui', status: 'pending', createdAt: NOW - 500 },
  r2: { reportedUserId: 'ana', reportedBy: 'eva', status: 'dismissed', createdAt: NOW - 900 },
};
const list = Object.entries(users).map(([uid, u]) => ({ ...u, uid }));
const index = buildUserIndex({ users, entries, votes, reports });

describe('índice de actividade', () => {
  it('conta publicações, votos e denúncias por utilizador', () => {
    expect(indexRow(index, 'ana')).toMatchObject({ entriesCount: 2, votesCount: 0, reportsReceived: 2, lastActiveAt: NOW - DAY });
    expect(indexRow(index, 'rui')).toMatchObject({ votesCount: 1, reportsMade: 1, lastActiveAt: NOW - 1000 });
    expect(indexRow(index, 'eva').lastActiveAt).toBe(NOW - 40 * DAY);
    expect(indexRow(index, 'ninguem').entriesCount).toBe(0);
  });
});

describe('banimentos temporários', () => {
  it('detecta prazos terminados', () => {
    expect(isBanExpired(users.rui, NOW)).toBe(true);
    expect(isBanExpired(users.eva, NOW)).toBe(false);
    expect(countExpiredBans(users, NOW)).toBe(1);
  });

  it('calcula o fim do banimento', () => {
    expect(banUntil('7', NOW)).toBe(NOW + 7 * DAY);
    expect(banUntil('permanent', NOW)).toBeNull();
  });
});

describe('filtros e ordenação', () => {
  const ids = (rows) => rows.map((u) => u.uid);

  it('filtra por estado e actividade', () => {
    expect(ids(filterUsers(list, { status: 'expired' }, index, NOW))).toEqual(['rui']);
    expect(ids(filterUsers(list, { activity: 'noEntries' }, index, NOW))).toEqual(['rui', 'eva']);
    expect(ids(filterUsers(list, { activity: 'inactive' }, index, NOW))).toEqual(['eva']);
    expect(ids(filterUsers(list, { activity: 'reported' }, index, NOW))).toEqual(['ana']);
    expect(ids(filterUsers(list, { activity: 'warned' }, index, NOW))).toEqual(['rui']);
  });

  it('pesquisa por telefone ou ID exacto', () => {
    expect(ids(filterUsers(list, { search: '84' }, index, NOW))).toEqual(['ana']);
    expect(ids(filterUsers(list, { search: 'eva' }, index, NOW))).toEqual(['eva']);
  });

  it('ordena por várias colunas', () => {
    expect(ids(sortUsers(list, 'snaps', index))).toEqual(['ana', 'rui', 'eva']);
    expect(ids(sortUsers(list, 'recent', index))).toEqual(['rui', 'ana', 'eva']);
    expect(ids(sortUsers(list, 'lastActive', index))).toEqual(['rui', 'ana', 'eva']);
  });

  it('exporta CSV com uma linha por utilizador', () => {
    const csv = buildUsersCsv(list, index);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('ana;Ana;ana;+258841;MPM;Maputo;30;0;2;0;2;0;Activo');
  });
});

describe('ficha do utilizador', () => {
  it('separa denúncias recebidas e feitas', () => {
    const r = userReports('ana', reports);
    expect(r.received.map((x) => x.id)).toEqual(['r1', 'r2']);
    expect(userReports('rui', reports).made.map((x) => x.id)).toEqual(['r1']);
  });

  it('ordena o histórico de Snaps e aceita timestamp antigo', () => {
    const h = userSnapsHistory({ a: { amount: 5, timestamp: 1 }, b: { amount: -2, createdAt: 3 } });
    expect(h.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('junta os eventos na linha do tempo', () => {
    const user = { ...users.rui, uid: 'rui', bannedAt: NOW - 2000, banReason: 'spam', warnings: { w: { reason: 'tema', createdAt: NOW - 3000 } } };
    const timeline = buildUserTimeline(user, {
      votesGiven: [{ challengeTitle: 'Praia', votedAt: NOW - 1000 }],
      snaps: [{ amount: 10, reason: 'bónus', at: NOW - 4000 }, { amount: 0, at: NOW }],
    });
    expect(timeline.map((e) => e.type)).toEqual(['vote', 'ban', 'warning', 'snaps', 'signup']);
    expect(timeline[3].text).toBe('+10 Snaps — bónus');
  });
});

describe('registo de acções', () => {
  const data = { users, challenges: { c1: { title: 'Praia' } }, sponsors: { s1: { name: 'Café' } } };

  it('mostra nomes legíveis e links', () => {
    expect(auditTargetLabel({ type: 'user', id: 'ana' }, data)).toBe('@ana');
    expect(auditTargetLabel({ type: 'challenge', id: 'c1' }, data)).toBe('"Praia"');
    expect(auditTargetLink({ type: 'sponsor', id: 's1' }, data)).toBe('/marcas/s1');
    expect(auditTargetLink({ type: 'challenge', id: 'apagado' }, data)).toBeNull();
  });

  it('resume os detalhes', () => {
    expect(auditDetails({ action: 'user.snaps', details: { amount: -5, reason: 'erro' } })).toBe('-5 Snaps · erro');
    expect(auditDetails({ action: 'user.ban', details: { reason: 'spam', until: null } })).toBe('spam · permanente');
  });
});
