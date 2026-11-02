import { describe, expect, it } from 'vitest';
import {
  computeChallengeAnalytics, computeDashboardMetrics, computeRecentActivity,
  getTiedTopEntries, getUserEntries, getUserVotesGiven,
} from './metrics';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

const data = {
  users: {
    u1: { username: 'ana', banned: false },
    u2: { username: 'carlos', banned: true },
    u3: { username: 'rosa' },
  },
  challenges: {
    c1: { title: 'Praia', status: 'active', endsAt: NOW + 2 * HOUR, createdAt: NOW - 10 * HOUR, createdBy: 'admin' },
    c2: { title: 'Dança', status: 'active', endsAt: NOW + 48 * HOUR, createdAt: NOW - 20 * HOUR, createdBy: 'admin' },
    c3: { title: 'Comida', status: 'pending_confirmation', createdAt: NOW - 30 * HOUR, createdBy: 'u1' },
    c4: { title: 'Moda', status: 'completed', winnerId: 'u3', confirmedAt: NOW - HOUR, createdAt: NOW - 40 * HOUR, createdBy: 'admin' },
  },
  entries: {
    c1: {
      e1: { userId: 'u1', votes: 3, createdAt: NOW - 5 * HOUR },
      e2: { userId: 'u3', votes: 1, createdAt: NOW - 4 * HOUR },
    },
  },
  votes: {
    c1: {
      u2: { entryId: 'e1', votedAt: NOW - 30 * HOUR },
      u3: { entryId: 'e1', votedAt: NOW - 2 * HOUR },
    },
    c2: { u1: { entryId: 'x', votedAt: NOW - 3 * HOUR } },
  },
  snapsHistory: {
    u1: { t1: { amount: 5 }, t2: { amount: 50 } },
    u3: { t3: { amount: 5 } },
  },
  reports: {
    r1: { status: 'pending' },
    r2: { status: 'dismissed' },
    r3: { status: 'pending' },
  },
};

describe('computeDashboardMetrics', () => {
  const m = computeDashboardMetrics(data, NOW);

  it('conta utilizadores e activos (não banidos)', () => {
    expect(m.totalUsers).toBe(3);
    expect(m.activeUsers).toBe(2);
  });

  it('conta desafios activos e a terminar em menos de 24h', () => {
    expect(m.activeChallengesCount).toBe(2);
    expect(m.endingSoonCount).toBe(1);
  });

  it('conta votos a partir do nó votes/', () => {
    expect(m.totalVotes).toBe(3);
  });

  it('soma os snaps distribuídos', () => {
    expect(m.totalSnapsDistributed).toBe(60);
  });

  it('conta vencedores por confirmar e denúncias pendentes', () => {
    expect(m.winnersPendingCount).toBe(1);
    expect(m.pendingReportsCount).toBe(2);
  });

  it('lida com base de dados vazia', () => {
    const empty = computeDashboardMetrics({}, NOW);
    expect(empty.totalUsers).toBe(0);
    expect(empty.totalVotes).toBe(0);
    expect(empty.recentActivity).toEqual([]);
  });
});

describe('computeRecentActivity', () => {
  it('ordena do mais recente para o mais antigo e respeita o limite', () => {
    const activity = computeRecentActivity(data, 3);
    expect(activity).toHaveLength(3);
    expect(activity[0]).toMatchObject({ type: 'win', username: 'rosa' });
    expect(activity.map((a) => a.timestamp)).toEqual([...activity.map((a) => a.timestamp)].sort((a, b) => b - a));
  });
});

describe('computeChallengeAnalytics', () => {
  it('calcula ranking, conversão e votos das últimas 24h', () => {
    const a = computeChallengeAnalytics({ voteGoal: 4 }, data.entries.c1, data.votes.c1, NOW);
    expect(a.leaderboard.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(a.totalParticipants).toBe(2);
    expect(a.totalVotesReal).toBe(2);
    expect(a.conversionRate).toBe(100);
    expect(a.votesLast24h).toBe(1);
    expect(a.goalProgress).toBe(50);
  });
});

describe('getTiedTopEntries', () => {
  it('devolve todas as entradas com o máximo de votos', () => {
    const entries = [{ id: 'a', votes: 5 }, { id: 'b', votes: 5 }, { id: 'c', votes: 2 }];
    expect(getTiedTopEntries(entries).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('trata votos em falta como 0', () => {
    expect(getTiedTopEntries([{ id: 'a' }, { id: 'b', votes: 0 }])).toHaveLength(2);
    expect(getTiedTopEntries([])).toEqual([]);
  });
});

describe('getUserEntries / getUserVotesGiven', () => {
  it('junta entradas e votos de um utilizador com o título do desafio', () => {
    expect(getUserEntries('u1', data.entries, data.challenges)).toEqual([
      expect.objectContaining({ entryId: 'e1', challengeId: 'c1', challengeTitle: 'Praia' }),
    ]);
    expect(getUserVotesGiven('u3', data.votes, data.challenges)).toEqual([
      expect.objectContaining({ challengeId: 'c1', challengeTitle: 'Praia', votedEntryId: 'e1' }),
    ]);
  });
});
