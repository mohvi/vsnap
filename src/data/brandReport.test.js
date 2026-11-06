import { describe, expect, it } from 'vitest';
import { buildBrandReport, executiveSummary, interestTier, leadsCsvRows, reportReference } from './brandReport';

const DAY = 24 * 60 * 60 * 1000;
const START = new Date(2026, 9, 1, 10).getTime();
const challenge = { id: 'c1', title: 'Selfie', createdAt: START, endsAt: START + 3 * DAY, winnerEntryId: 'e1' };
const users = {
  ana: { username: 'ana', name: 'Ana Muianga', phone: '258841111111', province: 'MP', city: 'Matola', createdAt: START + DAY },
  rui: { username: 'rui', name: 'Rui', phone: '258842222222', province: 'GZ', createdAt: START - 30 * DAY },
  eva: { username: 'eva', phone: '258843333333', province: 'MP', createdAt: START - 30 * DAY },
  zé: { username: 'ze', createdAt: START + 2 * DAY },
};
const entries = {
  e1: { userId: 'ana', votes: 3, createdAt: START + DAY, mediaUrl: 'a.jpg' },
  e2: { userId: 'rui', votes: 1, createdAt: START + DAY },
};
const votes = {
  rui: { entryId: 'e1', votedAt: START + DAY },
  eva: { entryId: 'e1', votedAt: START + 2 * DAY },
  zé: { entryId: 'e1', votedAt: START + 2 * DAY },
  ana: { entryId: 'e2', votedAt: START + 2 * DAY },
};
const consents = { ana: { at: START + DAY, sponsorId: 's1' } };

describe('relatório da marca', () => {
  const report = buildBrandReport({
    challenge, entries, votes, users, consents, deal: { amountMzn: 1000 }, now: START + 10 * DAY,
  });

  it('conta audiência, novos utilizadores e províncias sem repetir pessoas', () => {
    expect(report.kpis).toMatchObject({
      entries: 2, participants: 2, voters: 4, votes: 4, audience: 4, newUsers: 2, provinces: 2, leads: 1,
    });
    expect(report.provinces.map((p) => [p.name, p.participants, p.voters])).toEqual([
      ['Maputo', 1, 1], ['Gaza', 1, 0], ['Não indicada', 0, 1],
    ]);
    expect(report.period.days).toBe(3);
    expect(report.daily.map((d) => d.votes)).toEqual([0, 1, 3, 0]);
    expect(report.peakDay.votes).toBe(3);
    expect(report.winner).toMatchObject({ username: 'ana', votes: 3 });
  });

  it('só mostra contactos de quem deu consentimento', () => {
    expect(report.leads).toEqual([expect.objectContaining({ username: 'ana', phone: '258841111111', name: 'Ana Muianga', interest: 'Alto' })]);
    expect(report.participants.find((p) => p.username === 'rui')).not.toHaveProperty('phone');
    expect(leadsCsvRows(report)).toHaveLength(2);
  });

  it('calcula o custo por resultado a partir do investimento', () => {
    expect(report.investment).toEqual({ amount: 1000, perParticipant: 500, perAudience: 250, perVote: 250, perLead: 1000 });
    expect(buildBrandReport({ challenge, now: START }).investment).toBeNull();
  });

  it('gera resumo, referência e níveis de interesse', () => {
    const text = executiveSummary(report, challenge, 'Vodacom');
    expect(text).toContain('envolveu 4 pessoa(s)');
    expect(text).toContain('Maputo');
    expect(reportReference('-P5fLmA5KsDkM7Dg-dVx', START)).toBe('VS-202610-7DGDVX');
    expect([0, 1, 2].map((r) => interestTier(r, 3))).toEqual(['Alto', 'Médio', 'Baixo']);
  });
});
