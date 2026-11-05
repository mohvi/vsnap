import { describe, expect, it } from 'vitest';
import { computeStanding, computeWinner, newCampaignPayload, viaBreakdown } from './invites';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 5, 12).getTime();
const campaign = { goal: 3, minimum: 2, status: 'active', startsAt: NOW - 10 * DAY, endsAt: NOW + 20 * DAY };

const attr = (inviterUid, at, via = 'phone') => ({ inviterUid, at, via });

describe('classificação dos convites', () => {
  it('ordena por quem chegou primeiro à meta, mesmo com menos convites no total', () => {
    const attributions = {
      a1: attr('ana', 1), a2: attr('ana', 2), a3: attr('ana', 10), a4: attr('ana', 11),
      b1: attr('rui', 3), b2: attr('rui', 4), b3: attr('rui', 5),
      c1: attr('eva', 6, 'link'),
    };
    const standing = computeStanding(campaign, attributions);
    expect(standing.map((r) => [r.uid, r.count, r.goalReachedAt])).toEqual([
      ['rui', 3, 5], ['ana', 4, 10], ['eva', 1, null],
    ]);
    expect(computeWinner(campaign, standing, NOW)).toEqual({ uid: 'rui', reason: 'goal' });
  });

  it('sem meta atingida, só há vencedor depois do prazo e com o mínimo', () => {
    const standing = computeStanding(campaign, { x: attr('ana', 1), y: attr('ana', 2), z: attr('rui', 3) });
    expect(computeWinner(campaign, standing, NOW)).toBeNull();
    expect(computeWinner(campaign, standing, NOW + 30 * DAY)).toEqual({ uid: 'ana', reason: 'most' });
    const weak = computeStanding(campaign, { z: attr('rui', 3) });
    expect(computeWinner(campaign, weak, NOW + 30 * DAY)).toBeNull();
  });

  it('em empate de contagem, ganha quem lá chegou primeiro', () => {
    const standing = computeStanding(campaign, { a: attr('ana', 5), b: attr('ana', 9), c: attr('rui', 2), d: attr('rui', 7) });
    expect(standing.map((r) => r.uid)).toEqual(['rui', 'ana']);
  });

  it('conta as vias de entrada e cria edições de 30 dias', () => {
    expect(viaBreakdown({ a: attr('x', 1, 'phone'), b: attr('x', 2, 'clipboard'), c: attr('x', 3, 'phone') }))
      .toEqual({ phone: 2, link: 0, referrer: 0, clipboard: 1 });
    const p = newCampaignPayload({ title: ' Convida ', prize: ' Telemóvel ', goal: '100', minimum: '30' }, NOW);
    expect(p).toMatchObject({ title: 'Convida', prize: 'Telemóvel', goal: 100, minimum: 30, status: 'active', endsAt: NOW + 30 * DAY });
  });
});
