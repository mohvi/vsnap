import { describe, expect, it } from 'vitest';
import { ageBreakdown, ageFrom, challengeAudience, challengeMinAge } from './audience';

const NOW = Date.UTC(2026, 10, 6);

describe('audience', () => {
  it('computes age with birthdays not yet reached this year', () => {
    expect(ageFrom('2008-11-06', NOW)).toBe(18);
    expect(ageFrom('2008-11-07', NOW)).toBe(17);
    expect(ageFrom('bad', NOW)).toBeNull();
  });

  it('forces 18+ for alcohol', () => {
    expect(challengeMinAge({ alcohol: true, minAge: 0 })).toBe(18);
    expect(challengeMinAge({ minAge: 16 })).toBe(16);
    expect(challengeMinAge({})).toBe(0);
  });

  it('excludes minors and unknown ages from 18+ audiences, and filters by interest', () => {
    const users = { a: {}, b: {}, c: {}, d: {} };
    const demographics = {
      a: { birthDate: '2000-01-01', interests: { bebidas: true } },
      b: { birthDate: '2010-01-01', interests: { bebidas: true } },
      c: { birthDate: '1995-01-01' },
    };
    const beer = { alcohol: true, category: 'bebidas' };
    expect(challengeAudience({ users, demographics, challenge: beer, now: NOW })).toEqual(['a', 'c']);
    expect(challengeAudience({ users, demographics, challenge: beer, mode: 'interested', now: NOW })).toEqual(['a']);
    expect(challengeAudience({ users, demographics, challenge: { category: 'moda' }, now: NOW })).toEqual(['a', 'b', 'c', 'd']);
  });

  it('breaks participants down by age band', () => {
    const demographics = { a: { birthDate: '2000-01-01' }, b: { birthDate: '2004-06-01' }, c: { birthDate: '1980-01-01' } };
    const result = ageBreakdown(['a', 'b', 'c', 'x'], demographics, NOW);
    expect(result.unknown).toBe(1);
    expect(result.bands.find((b) => b.label === '25–34').count).toBe(1);
    expect(result.bands.find((b) => b.label === '18–24').count).toBe(1);
    expect(result.bands.find((b) => b.label === '45+').count).toBe(1);
  });
});
