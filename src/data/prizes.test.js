import { describe, expect, it } from 'vitest';
import { buildPrizeList, challengePrizes, nextEligible, pendingDeliveriesCount, rankPlaces } from './prizes';

const entries = {
  e1: { userId: 'ana', votes: 10, createdAt: 1 },
  e2: { userId: 'rui', votes: 8, createdAt: 2 },
  e3: { userId: 'ana', votes: 7, createdAt: 3 },
  e4: { userId: 'eva', votes: 8, createdAt: 1 },
  e5: { userId: 'joao', votes: 2, createdAt: 1 },
};

describe('prizes', () => {
  it('builds prize texts and drops empty places', () => {
    expect(buildPrizeList('cash', ['500', '', '200'])).toEqual(['500 MZN', '200 MZN']);
    expect(buildPrizeList('physical', [' 2 grades 2M ', 'T-shirt'])).toEqual(['2 grades 2M', 'T-shirt']);
  });

  it('falls back to the single prize on old challenges', () => {
    expect(challengePrizes({ prize: '1000 MZN' })).toEqual(['1000 MZN']);
    expect(challengePrizes({ prize: 'x', prizes: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('ranks one prize per person with the official winner first and ties to the earliest post', () => {
    const places = rankPlaces(entries, { winnerId: 'ana', winnerEntryId: 'e1' }, 3);
    expect(places.map((p) => p.uid)).toEqual(['ana', 'eva', 'rui']);
  });

  it('respects a winner chosen in a tie even with fewer votes', () => {
    expect(rankPlaces(entries, { winnerId: 'rui', winnerEntryId: 'e2' }, 2).map((p) => p.uid)).toEqual(['rui', 'ana']);
  });

  it('finds the next person when a prize passes on', () => {
    expect(nextEligible(entries, ['ana', 'eva', 'rui']).uid).toBe('joao');
    expect(nextEligible(entries, ['ana', 'eva', 'rui', 'joao'])).toBeNull();
  });

  it('counts pending deliveries across challenges', () => {
    expect(pendingDeliveriesCount({ c1: { 1: { status: 'pending' }, 2: { status: 'delivered' } }, c2: { 1: { status: 'pending' } } })).toBe(2);
  });
});
