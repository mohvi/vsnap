// Públicos e destinos das notificações push enviadas pelo painel.
// O envio em si é feito pela função /api/push (ver api/push.js).

import { DAY_MS } from '../config';

export const INACTIVE_DAYS = 7;
export const TITLE_MAX = 65;
export const BODY_MAX = 180;

export const AUDIENCES = {
  all: 'Todos os utilizadores',
  challenge: 'Participantes de um desafio',
  inactive: `Inactivos há ${INACTIVE_DAYS}+ dias`,
  user: 'Um utilizador',
};

const isBlocked = (u, now) =>
  !u || !!u.deletionRequestedAt || (u.banned === true && !(typeof u.bannedUntil === 'number' && u.bannedUntil <= now));

export const canReceivePush = (u, now = Date.now()) => !isBlocked(u, now) && typeof u.pushToken === 'string' && u.pushToken.length > 0;

// uids do público escolhido (antes de filtrar quem tem notificações activas).
export function audienceUids({ audience, challengeId, uid }, { users = {}, entries = {} }, now = Date.now()) {
  if (audience === 'user') return uid && users[uid] ? [uid] : [];
  if (audience === 'challenge') {
    return [...new Set(Object.values(entries[challengeId] || {}).map((e) => e?.userId).filter((id) => id && users[id]))];
  }
  if (audience === 'inactive') {
    const cutoff = now - INACTIVE_DAYS * DAY_MS;
    return Object.entries(users)
      .filter(([, u]) => (u.lastLogin || u.createdAt || 0) < cutoff)
      .map(([id]) => id);
  }
  return Object.keys(users);
}

export function reachable(uids, users, now = Date.now()) {
  return uids.filter((id) => canReceivePush(users[id], now));
}

// Ecrã da app que abre ao tocar na notificação (rotas do expo-router).
export function destinationUrl({ destination, destinationChallengeId }) {
  if (destination === 'challenge' && destinationChallengeId) return `/challenge/${destinationChallengeId}`;
  if (destination === 'invite') return '/invite-friends';
  return null;
}

export function auditTargetFor({ audience, challengeId, uid }) {
  if (audience === 'user') return { type: 'user', id: uid };
  if (audience === 'challenge') return { type: 'challenge', id: challengeId };
  return { type: 'push', id: audience };
}

// ── Notificações automáticas (enviadas pelo painel no mesmo clique da acção) ──

const clip = (s, max) => {
  const text = String(s ?? '').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};
const message = (uids, title, body, url = null) => ({ uids, title: clip(title, TITLE_MAX), body: clip(body, BODY_MAX), url });

// Vencedor confirmado: uma mensagem para o vencedor e outra para os restantes participantes.
export function winnerMessages(challengeId, challenge, entries = {}) {
  const url = `/challenge/${challengeId}`;
  const winner = challenge?.winnerId;
  const others = [...new Set(Object.values(entries).map((e) => e?.userId).filter((id) => id && id !== winner))];
  const prize = challenge?.prize ? ` e o prémio: ${challenge.prize}` : '';
  return [
    winner && message([winner], '🏆 Ganhaste o desafio!', `Parabéns! Ganhaste "${challenge.title}"${prize}. Vamos contactar-te em breve.`, url),
    others.length && message(others, '🏁 Desafio terminado', `Já há vencedor em "${challenge?.title || 'VotaSnap'}". Vê os resultados!`, url),
  ].filter(Boolean);
}

export function newChallengeMessage(uids, challengeId, challenge) {
  const prize = challenge.prize ? ` Prémio: ${challenge.prize}.` : '';
  // Agendado: anuncia o lançamento e convida a pedir aviso.
  if (Number(challenge.startsAt) > Date.now() + 60000) {
    const when = new Date(challenge.startsAt).toLocaleString('pt-MZ', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo',
    });
    return message(uids, `🗓️ Em breve: ${challenge.title}`, `Abre ${when}.${prize} Toca em "Avisa-me" para não perderes.`, `/challenge/${challengeId}`);
  }
  return message(uids, `📸 Novo desafio: ${challenge.title}`, `Já podes participar! Publica a tua foto e concorre.${prize}`, `/challenge/${challengeId}`);
}

export function newInviteCampaignMessage(uids, campaign) {
  return message(uids, '🎁 Convida amigos e ganha', `Começou "${campaign.title}". Prémio: ${campaign.prize}. Convida e sobe no ranking!`, '/invite-friends');
}

export function inviteWinnerMessage(uid, campaign) {
  return message([uid], '🏆 Ganhaste o desafio de convites!', `Parabéns! Ganhaste "${campaign?.title || 'Convida os teus amigos'}"${campaign?.prize ? `: ${campaign.prize}` : ''}. Vamos contactar-te em breve.`, '/invite-friends');
}

export function warningMessage(uids, reason) {
  return message(uids, '⚠️ Recebeste um aviso', `Motivo: ${reason}. Repetir pode levar à suspensão da conta.`);
}
