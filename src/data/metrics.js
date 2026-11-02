import { DAY_MS } from '../config';
import { toCsv } from '../utils/csv';
import { countExpiredBans } from './users';

// Funções puras que derivam métricas a partir dos nós do Realtime Database.
// Ficam separadas do provider para poderem ser testadas sem Firebase.

export const toList = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

export function computeDashboardMetrics({
  users = {}, challenges = {}, entries = {}, votes = {}, snapsHistory = {}, reports = {}, sponsors = {}, challengeDeals = {},
}, now = Date.now()) {
  const usersList = Object.values(users);
  const challengesList = Object.values(challenges);
  const activeChallenges = challengesList.filter((c) => c.status === 'active');

  // Contamos o nó votes/ (fonte da verdade), não o contador denormalizado totalVotes.
  const totalVotes = Object.values(votes).reduce(
    (sum, challengeVotes) => sum + Object.keys(challengeVotes || {}).length,
    0,
  );

  // Snaps são moeda interna da app, não MZN.
  const totalSnapsDistributed = Object.values(snapsHistory).reduce(
    (sum, userTx) => sum + Object.values(userTx || {}).reduce((s, tx) => s + (tx?.amount || 0), 0),
    0,
  );

  return {
    totalUsers: usersList.length,
    activeUsers: usersList.filter((u) => !u.banned).length,
    activeChallengesCount: activeChallenges.length,
    totalVotes,
    totalSnapsDistributed,
    endingSoonCount: activeChallenges.filter(
      (c) => c.endsAt && c.endsAt - now > 0 && c.endsAt - now < DAY_MS,
    ).length,
    // O ecrã de vencedores lista exactamente os desafios neste estado.
    winnersPendingCount: challengesList.filter((c) => c.status === 'pending_confirmation').length,
    pendingReportsCount: Object.values(reports).filter((r) => r.status === 'pending').length,
    expiredBansCount: countExpiredBans(users, now),
    activeSponsorsCount: Object.values(sponsors).filter((s) => s.active !== false).length,
    activeSponsoredCount: activeChallenges.filter((c) => c.type === 'sponsored').length,
    ...computeDealTotals(challengeDeals),
    recentActivity: computeRecentActivity({ users, challenges, entries, votes }),
  };
}

// Valores acordados com marcas, em MZN (receita real, ao contrário dos Snaps).
export function computeDealTotals(challengeDeals = {}) {
  const deals = Object.values(challengeDeals).filter((d) => d && Number(d.amountMzn) > 0);
  const sum = (list) => list.reduce((s, d) => s + Number(d.amountMzn), 0);
  const unpaid = deals.filter((d) => d.paymentStatus !== 'paid');
  return {
    dealsReceivedMzn: sum(deals.filter((d) => d.paymentStatus === 'paid')),
    dealsPendingMzn: sum(unpaid),
    dealsPendingCount: unpaid.length,
  };
}

// Resumo por marca para a página de marcas.
export function computeSponsorSummary(sponsorId, challenges = {}, challengeDeals = {}) {
  const list = toList(challenges).filter((c) => c.sponsorId === sponsorId);
  const deals = Object.fromEntries(list.map((c) => [c.id, challengeDeals[c.id]]).filter(([, d]) => d));
  return {
    challengesCount: list.length,
    activeCount: list.filter((c) => c.status === 'active').length,
    participants: list.reduce((s, c) => s + (c.totalParticipants || 0), 0),
    votes: list.reduce((s, c) => s + (c.totalVotes || 0), 0),
    ...computeDealTotals(deals),
  };
}

// Dia local (AAAA-MM-DD) de um timestamp — os relatórios são lidos em Maputo.
export function dayKey(timestamp) {
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Relatório entregue à marca no fim de um desafio patrocinado.
export function computeSponsorReport(challenge, challengeEntries = {}, challengeVotes = {}, users = {}, now = Date.now()) {
  const username = (uid) => users[uid]?.username || uid;
  const entries = toList(challengeEntries).sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const votes = Object.values(challengeVotes).filter((v) => v?.votedAt);

  // Série diária contínua do início ao fim (ou até hoje), com zeros nos dias sem votos.
  const counts = {};
  votes.forEach((v) => { counts[dayKey(v.votedAt)] = (counts[dayKey(v.votedAt)] || 0) + 1; });
  const votesByDay = [];
  if (challenge.createdAt) {
    const end = Math.min(challenge.endsAt || now, now);
    for (let t = challenge.createdAt; dayKey(t) <= dayKey(end); t += DAY_MS) {
      votesByDay.push({ day: dayKey(t), count: counts[dayKey(t)] || 0 });
      if (votesByDay.length > 366) break;
    }
  }
  const peak = votesByDay.reduce((best, d) => (d.count > (best?.count || 0) ? d : best), null);

  const winnerEntry = challenge.winnerEntryId ? entries.find((e) => e.id === challenge.winnerEntryId) : null;

  return {
    participants: entries.length,
    uniqueParticipants: new Set(entries.map((e) => e.userId)).size,
    votes: votes.length,
    votesPerEntry: entries.length ? Math.round((votes.length / entries.length) * 10) / 10 : 0,
    votesByDay,
    peakDay: peak,
    topEntries: entries.slice(0, 10).map((e, i) => ({
      position: i + 1,
      id: e.id,
      username: username(e.userId),
      votes: e.votes || 0,
      caption: e.caption || '',
      mediaUrl: e.mediaUrl || '',
      mediaType: e.mediaType || 'photo',
      createdAt: e.createdAt || null,
    })),
    winner: winnerEntry
      ? { username: username(winnerEntry.userId), votes: winnerEntry.votes || 0, mediaUrl: winnerEntry.mediaUrl || '' }
      : null,
  };
}

export function buildReportCsv(challenge, report) {
  const rows = [
    ['Desafio', challenge.title],
    ['Marca', challenge.sponsor || ''],
    ['Participantes', report.participants],
    ['Votos', report.votes],
    [],
    ['Posição', 'Utilizador', 'Votos', 'Legenda', 'Publicado em', 'Ficheiro'],
    ...report.topEntries.map((e) => [
      e.position, `@${e.username}`, e.votes, e.caption, e.createdAt ? new Date(e.createdAt).toISOString() : '', e.mediaUrl,
    ]),
    [],
    ['Dia', 'Votos'],
    ...report.votesByDay.map((d) => [d.day, d.count]),
  ];
  return toCsv(rows);
}

export function computeRecentActivity({ users = {}, challenges = {}, entries = {}, votes = {} }, limit = 8) {
  const userName = (uid) => users[uid]?.username || uid;
  const title = (cid) => challenges[cid]?.title || cid;
  const activity = [];

  Object.entries(votes).forEach(([cid, challengeVotes]) => {
    Object.entries(challengeVotes || {}).forEach(([uid, v]) => {
      activity.push({ type: 'vote', username: userName(uid), action: `votou em "${title(cid)}"`, timestamp: v?.votedAt });
    });
  });

  Object.entries(entries).forEach(([cid, challengeEntries]) => {
    Object.values(challengeEntries || {}).forEach((e) => {
      activity.push({ type: 'entry', username: userName(e.userId), action: `submeteu entrada em "${title(cid)}"`, timestamp: e.createdAt });
    });
  });

  Object.values(challenges).forEach((c) => {
    activity.push({
      type: 'create',
      username: c.createdBy === 'admin' ? 'admin' : userName(c.createdBy),
      action: `criou o desafio "${c.title}"`,
      timestamp: c.createdAt,
    });
    if (c.status === 'completed' && c.winnerId) {
      activity.push({
        type: 'win',
        username: userName(c.winnerId),
        action: `ganhou o desafio "${c.title}"`,
        timestamp: c.confirmedAt || c.processedAt,
      });
    }
  });

  return activity
    .filter((a) => a.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function computeChallengeAnalytics(challenge, challengeEntries = {}, challengeVotes = {}, now = Date.now()) {
  const entries = toList(challengeEntries);
  const votes = Object.values(challengeVotes);
  const totalParticipants = entries.length;
  const totalVotesReal = votes.length;

  return {
    leaderboard: [...entries].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 5),
    totalParticipants,
    totalVotesReal,
    conversionRate: totalParticipants > 0 ? Math.round((totalVotesReal / totalParticipants) * 100) : 0,
    votesLast24h: votes.filter((v) => v?.votedAt && v.votedAt > now - DAY_MS).length,
    goalProgress: challenge.voteGoal
      ? Math.min(100, Math.round((totalVotesReal / challenge.voteGoal) * 100))
      : null,
  };
}

// Entradas empatadas no topo (todas as que têm o máximo de votos).
export function getTiedTopEntries(entries) {
  if (!entries.length) return [];
  const top = Math.max(...entries.map((e) => e.votes || 0));
  return entries.filter((e) => (e.votes || 0) === top);
}

export function getUserEntries(uid, entries = {}, challenges = {}) {
  const result = [];
  Object.entries(entries).forEach(([challengeId, challengeEntries]) => {
    Object.entries(challengeEntries || {}).forEach(([entryId, e]) => {
      if (e.userId === uid) {
        result.push({ ...e, entryId, challengeId, challengeTitle: challenges[challengeId]?.title || challengeId });
      }
    });
  });
  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getUserVotesGiven(uid, votes = {}, challenges = {}) {
  const result = [];
  Object.entries(votes).forEach(([challengeId, challengeVotes]) => {
    const v = challengeVotes?.[uid];
    if (v) {
      result.push({
        challengeId,
        challengeTitle: challenges[challengeId]?.title || challengeId,
        votedEntryId: v.entryId,
        votedAt: v.votedAt,
      });
    }
  });
  return result.sort((a, b) => (b.votedAt || 0) - (a.votedAt || 0));
}
