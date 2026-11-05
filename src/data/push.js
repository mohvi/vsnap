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
