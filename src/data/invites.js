import { DAY_MS } from '../config';

// Desafio "Convida amigos": a app grava atribuições e progresso (validados
// pelas regras); aqui só se lê, calcula a classificação e o vencedor.

export const INVITE_DURATION_DAYS = 30;

export const campaignList = (campaigns = {}) =>
  Object.entries(campaigns).map(([id, c]) => ({ id, ...c })).sort((a, b) => (b.startsAt || 0) - (a.startsAt || 0));

export const isCampaignRunning = (c, now = Date.now()) => c?.status === 'active' && c.endsAt > now;
export const isCampaignExpired = (c, now = Date.now()) => c?.status === 'active' && c.endsAt <= now;

export function activeCampaign(campaigns = {}) {
  return campaignList(campaigns).find((c) => c.status === 'active') || null;
}

export function newCampaignPayload({ title, prize, goal, minimum }, now = Date.now()) {
  return {
    title: title.trim(),
    prize: prize.trim(),
    goal: Number(goal),
    minimum: Number(minimum),
    status: 'active',
    startsAt: now,
    endsAt: now + INVITE_DURATION_DAYS * DAY_MS,
    createdAt: now,
  };
}

// Classificação a partir das atribuições (fonte da verdade, só admin lê).
// `goalReachedAt` é a hora da atribuição que levou o convidador à meta: é
// o que decide quem chegou primeiro, mesmo que depois continue a convidar.
export function computeStanding(campaign, attributions = {}) {
  const byInviter = {};
  Object.entries(attributions).forEach(([inviteeUid, a]) => {
    if (!a?.inviterUid) return;
    (byInviter[a.inviterUid] ||= []).push({ inviteeUid, at: a.at || 0, via: a.via || 'link' });
  });

  const rows = Object.entries(byInviter).map(([uid, list]) => {
    const sorted = [...list].sort((x, y) => x.at - y.at);
    return {
      uid,
      count: sorted.length,
      lastAt: sorted[sorted.length - 1]?.at || 0,
      goalReachedAt: campaign?.goal && sorted.length >= campaign.goal ? sorted[campaign.goal - 1].at : null,
      invitees: sorted,
    };
  });

  rows.sort((a, b) => {
    if (a.goalReachedAt && b.goalReachedAt) return a.goalReachedAt - b.goalReachedAt;
    if (a.goalReachedAt) return -1;
    if (b.goalReachedAt) return 1;
    return b.count - a.count || a.lastAt - b.lastAt;
  });
  return rows;
}

// Vencedor: o primeiro a chegar à meta; se ninguém chegou e o prazo acabou,
// quem tiver mais (com o mínimo), desempatando por quem lá chegou primeiro.
export function computeWinner(campaign, standing, now = Date.now()) {
  if (!campaign || !standing.length) return null;
  if (standing[0].goalReachedAt) return { uid: standing[0].uid, reason: 'goal' };
  const ended = campaign.endsAt <= now || campaign.status === 'ended';
  if (ended && standing[0].count >= (campaign.minimum || 0)) return { uid: standing[0].uid, reason: 'most' };
  return null;
}

export function viaBreakdown(attributions = {}) {
  const out = { phone: 0, link: 0, referrer: 0, clipboard: 0 };
  Object.values(attributions).forEach((a) => { if (a?.via in out) out[a.via] += 1; });
  return out;
}

export const VIA_LABELS = { phone: 'Por número', link: 'Link com app', referrer: 'Play Store', clipboard: 'Link sem app' };
