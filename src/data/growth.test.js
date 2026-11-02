import { describe, expect, it } from 'vitest';
import { computeGrowth, dailySeries, revenueByMonth } from './growth';
import { dayKey } from './metrics';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 2, 12).getTime();

describe('séries diárias', () => {
  it('cobre todos os dias do período, com zeros', () => {
    const s = dailySeries([NOW, NOW - 1000, NOW - 2 * DAY, NOW - 40 * DAY], 3, NOW);
    expect(s.map((p) => p.count)).toEqual([1, 0, 2]);
    expect(s[2].day).toBe(dayKey(NOW));
  });
});

describe('receita por mês', () => {
  it('soma acordos pagos pelo mês do pagamento', () => {
    const deals = {
      a: { amountMzn: 5000, paymentStatus: 'paid', paidAt: NOW },
      b: { amountMzn: 2000, paymentStatus: 'paid', paidAt: NOW - 35 * DAY },
      c: { amountMzn: 9000, paymentStatus: 'pending' },
    };
    const r = revenueByMonth(deals, 3, NOW);
    expect(r.map((m) => m.amount)).toEqual([2000, 0, 5000]); // setembro, outubro, novembro
    expect(r[2].month).toBe('2026-11');
  });
});

describe('crescimento', () => {
  const users = {
    a: { createdAt: NOW - 20 * DAY, province: 'MP' },
    b: { createdAt: NOW - 10 * DAY, province: 'MP' },
    c: { createdAt: NOW - 2 * DAY, province: 'GZ' },
    d: { createdAt: NOW - 50 * DAY },
  };
  const entries = { ch1: { e1: { userId: 'a', createdAt: NOW - 5 * DAY }, e2: { userId: 'c', createdAt: NOW - DAY } } };
  const votes = { ch1: { b: { votedAt: NOW - 1000 } } };
  const challenges = { ch1: { title: 'Praia', createdAt: NOW - 6 * DAY, status: 'active' } };
  const g = computeGrowth({ users, entries, votes, challenges }, 30, NOW);

  it('conta registos do período e compara com o anterior', () => {
    expect(g.totals.signups).toEqual({ current: 3, previous: 1, change: 200 });
    expect(g.series.signups).toHaveLength(30);
  });

  it('calcula activos, retenção e taxa de publicação', () => {
    expect(g.dau).toBe(1);
    expect(g.wau).toBe(3);
    expect(g.mau).toBe(3);
    // a (20 dias) e b (10 dias) têm 7+ dias e ambos voltaram depois da 1.ª semana.
    expect(g.retentionCohort).toBe(2);
    expect(g.retention7).toBe(100);
    expect(g.postingRate).toBe(50);
  });

  it('ordena províncias e desafios', () => {
    expect(g.topProvinces[0]).toMatchObject({ code: 'MP', name: 'Maputo', count: 2 });
    expect(g.topChallenges[0]).toMatchObject({ id: 'ch1', participants: 2 });
  });
});
