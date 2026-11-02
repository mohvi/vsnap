import { describe, expect, it } from 'vitest';
import {
  buildReportCsv, computeDashboardMetrics, computeDealTotals, computeSponsorReport, computeSponsorSummary, dayKey,
} from './metrics';

const DAY = 24 * 60 * 60 * 1000;
// Meio-dia local, para que dayKey não dependa do fuso de quem corre os testes.
const START = new Date(2026, 10, 1, 12).getTime();

const challenges = {
  c1: { title: 'Praia', type: 'sponsored', sponsorId: 's1', status: 'active', totalParticipants: 3, totalVotes: 7 },
  c2: { title: 'Comida', type: 'sponsored', sponsorId: 's1', status: 'completed', totalParticipants: 2, totalVotes: 1 },
  c3: { title: 'Livre', type: 'free', status: 'active' },
};
const challengeDeals = {
  c1: { sponsorId: 's1', amountMzn: 5000, paymentStatus: 'pending' },
  c2: { sponsorId: 's1', amountMzn: 2000, paymentStatus: 'paid' },
  cx: { amountMzn: 0, paymentStatus: 'pending' },
};

describe('acordos com marcas', () => {
  it('soma recebido e por receber, ignorando acordos sem valor', () => {
    expect(computeDealTotals(challengeDeals)).toEqual({ dealsReceivedMzn: 2000, dealsPendingMzn: 5000, dealsPendingCount: 1 });
  });

  it('resume os desafios de uma marca', () => {
    expect(computeSponsorSummary('s1', challenges, challengeDeals)).toEqual({
      challengesCount: 2, activeCount: 1, participants: 5, votes: 8,
      dealsReceivedMzn: 2000, dealsPendingMzn: 5000, dealsPendingCount: 1,
    });
  });

  it('entra nas métricas do dashboard', () => {
    const m = computeDashboardMetrics({
      challenges, challengeDeals, sponsors: { s1: { name: 'A' }, s2: { name: 'B', active: false } },
    });
    expect(m.activeSponsorsCount).toBe(1);
    expect(m.activeSponsoredCount).toBe(1);
    expect(m.dealsPendingMzn).toBe(5000);
  });
});

describe('relatório da marca', () => {
  const challenge = { title: 'Praia; "verão"', sponsor: 'Bar', createdAt: START, endsAt: START + 2 * DAY, winnerEntryId: 'e2' };
  const entries = {
    e1: { userId: 'u1', votes: 1, mediaUrl: 'a.jpg', caption: 'um' },
    e2: { userId: 'u2', votes: 3, mediaUrl: 'b.jpg', mediaType: 'photo' },
    e3: { userId: 'u1', votes: 0 },
  };
  const votes = {
    v1: { entryId: 'e2', votedAt: START },
    v2: { entryId: 'e2', votedAt: START + 1000 },
    v3: { entryId: 'e2', votedAt: START + 2 * DAY },
    v4: { entryId: 'e1', votedAt: START + 2 * DAY },
  };
  const users = { u1: { username: 'ana' }, u2: { username: 'rui' } };
  const report = computeSponsorReport(challenge, entries, votes, users, START + 10 * DAY);

  it('conta publicações, pessoas e votos', () => {
    expect(report).toMatchObject({ participants: 3, uniqueParticipants: 2, votes: 4, votesPerEntry: 1.3 });
  });

  it('gera série diária contínua com zeros e o dia de pico', () => {
    expect(report.votesByDay.map((d) => d.count)).toEqual([2, 0, 2]);
    expect(report.votesByDay[0].day).toBe(dayKey(START));
    expect(report.peakDay).toEqual({ day: dayKey(START), count: 2 });
  });

  it('ordena as publicações e identifica o vencedor', () => {
    expect(report.topEntries.map((e) => [e.position, e.username, e.votes])).toEqual([[1, 'rui', 3], [2, 'ana', 1], [3, 'ana', 0]]);
    expect(report.winner).toEqual({ username: 'rui', votes: 3, mediaUrl: 'b.jpg' });
  });

  it('exporta CSV com separador ; e células escapadas', () => {
    const csv = buildReportCsv(challenge, report);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).startsWith('Desafio;"Praia; ""verão"""')).toBe(true);
    expect(csv).toContain('1;@rui;3;;');
  });
});
