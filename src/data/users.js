import { DAY_MS } from '../config';
import { toCsv } from '../utils/csv';

// Funções puras para a gestão de utilizadores (lista, ficha, exportação).

export const INACTIVE_DAYS = 30;

// Um banimento temporário cujo prazo já passou continua `banned: true` até um
// admin o levantar — a app só lê `banned`.
export const isBanExpired = (user, now = Date.now()) =>
  !!user?.banned && !!user.bannedUntil && user.bannedUntil <= now;

export function countExpiredBans(users = {}, now = Date.now()) {
  return Object.values(users).filter((u) => isBanExpired(u, now)).length;
}

// Uma única passagem por entries/votes/reports para obter, por utilizador,
// contagens e a última actividade conhecida.
export function buildUserIndex({ users = {}, entries = {}, votes = {}, reports = {} }) {
  const index = {};
  const get = (uid) => {
    if (!index[uid]) {
      index[uid] = { entriesCount: 0, votesCount: 0, reportsReceived: 0, reportsMade: 0, lastActiveAt: 0 };
    }
    return index[uid];
  };
  const touch = (row, ts) => { if (ts && ts > row.lastActiveAt) row.lastActiveAt = ts; };

  Object.entries(users).forEach(([uid, u]) => touch(get(uid), u.lastLogin || u.createdAt));

  Object.values(entries).forEach((challengeEntries) => {
    Object.values(challengeEntries || {}).forEach((e) => {
      if (!e?.userId) return;
      const row = get(e.userId);
      row.entriesCount += 1;
      touch(row, e.createdAt);
    });
  });

  Object.values(votes).forEach((challengeVotes) => {
    Object.entries(challengeVotes || {}).forEach(([uid, v]) => {
      const row = get(uid);
      row.votesCount += 1;
      touch(row, v?.votedAt);
    });
  });

  Object.values(reports).forEach((r) => {
    if (r?.reportedUserId) get(r.reportedUserId).reportsReceived += 1;
    if (r?.reportedBy) get(r.reportedBy).reportsMade += 1;
  });

  return index;
}

const EMPTY_ROW = { entriesCount: 0, votesCount: 0, reportsReceived: 0, reportsMade: 0, lastActiveAt: 0 };
export const indexRow = (index, uid) => index[uid] || EMPTY_ROW;

export const STATUS_FILTERS = {
  all: 'Todos os estados',
  active: 'Activos',
  banned: 'Banidos',
  expired: 'Banimento expirado',
  flagged: 'Sinalizados (risco)',
  fake: 'Fake (mock)',
};

export const ACTIVITY_FILTERS = {
  all: 'Toda a actividade',
  noEntries: 'Sem publicações',
  inactive: `Inactivos há ${INACTIVE_DAYS}+ dias`,
  reported: 'Com denúncias',
  warned: 'Com avisos',
};

export const SORTS = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  lastActive: 'Última actividade',
  snaps: 'Mais Snaps',
  entries: 'Mais publicações',
  votes: 'Mais votos dados',
  reports: 'Mais denunciados',
};

export function filterUsers(list, { search = '', status = 'all', activity = 'all', province = 'all', city = 'all' }, index, now = Date.now()) {
  const q = search.trim().toLowerCase();
  return list.filter((u) => {
    const row = indexRow(index, u.uid);
    const matchesSearch = !q
      || u.name?.toLowerCase().includes(q)
      || u.username?.toLowerCase().includes(q)
      || u.phone?.includes(q)
      || u.uid === search.trim();
    const matchesStatus = status === 'all'
      || (status === 'banned' && u.banned)
      || (status === 'active' && !u.banned)
      || (status === 'expired' && isBanExpired(u, now))
      || (status === 'flagged' && u.riskFlags?.sharedPushToken)
      || (status === 'fake' && u.isFake);
    const matchesActivity = activity === 'all'
      || (activity === 'noEntries' && row.entriesCount === 0)
      || (activity === 'inactive' && now - row.lastActiveAt > INACTIVE_DAYS * DAY_MS)
      || (activity === 'reported' && row.reportsReceived > 0)
      || (activity === 'warned' && (u.warningsCount || 0) > 0);
    const matchesProvince = province === 'all' || u.province === province;
    const matchesCity = city === 'all' || u.city === city;
    return matchesSearch && matchesStatus && matchesActivity && matchesProvince && matchesCity;
  });
}

export function sortUsers(list, sort, index) {
  const by = {
    recent: (u) => -(u.createdAt || 0),
    oldest: (u) => u.createdAt || 0,
    lastActive: (u) => -indexRow(index, u.uid).lastActiveAt,
    snaps: (u) => -(u.snaps || 0),
    entries: (u) => -indexRow(index, u.uid).entriesCount,
    votes: (u) => -indexRow(index, u.uid).votesCount,
    reports: (u) => -indexRow(index, u.uid).reportsReceived,
  }[sort] || ((u) => -(u.createdAt || 0));
  return [...list].sort((a, b) => by(a) - by(b));
}

const isoDate = (ts) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

export function buildUsersCsv(list, index) {
  return toCsv([
    ['ID', 'Nome', 'Username', 'Telefone', 'Província', 'Cidade', 'Snaps', 'Vitórias', 'Publicações', 'Votos dados',
      'Denúncias recebidas', 'Avisos', 'Estado', 'Banido até', 'Registado em', 'Última actividade'],
    ...list.map((u) => {
      const row = indexRow(index, u.uid);
      return [
        u.uid, u.name || '', u.username || '', u.phone || '', u.province || '', u.city || '',
        u.snaps || 0, u.wins || 0, row.entriesCount, row.votesCount, row.reportsReceived, u.warningsCount || 0,
        u.banned ? 'Banido' : 'Activo', isoDate(u.bannedUntil), isoDate(u.createdAt), isoDate(row.lastActiveAt),
      ];
    }),
  ]);
}

// Denúncias ligadas a um utilizador.
export function userReports(uid, reports = {}) {
  const list = Object.entries(reports).map(([id, r]) => ({ id, ...r }));
  const byDate = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
  return {
    received: list.filter((r) => r.reportedUserId === uid).sort(byDate),
    made: list.filter((r) => r.reportedBy === uid).sort(byDate),
  };
}

// Movimentos de Snaps (snaps_history/{uid}), do mais recente para o mais antigo.
export function userSnapsHistory(history = {}) {
  return Object.entries(history || {})
    .map(([id, tx]) => ({ id, ...tx, at: tx?.createdAt || tx?.timestamp || 0 }))
    .sort((a, b) => b.at - a.at);
}

// Linha do tempo da ficha: registo, publicações, votos, vitórias, avisos,
// banimento e movimentos de Snaps num só fluxo.
export function buildUserTimeline(user, { entries = [], votesGiven = [], snaps = [], challenges = {} }, limit = 100) {
  const events = [];
  if (user.createdAt) events.push({ type: 'signup', at: user.createdAt, text: 'Criou a conta' });
  entries.forEach((e) => events.push({ type: 'entry', at: e.createdAt, text: `Publicou em "${e.challengeTitle}"` }));
  votesGiven.forEach((v) => events.push({ type: 'vote', at: v.votedAt, text: `Votou em "${v.challengeTitle}"` }));
  Object.entries(challenges).forEach(([, c]) => {
    if (c.winnerId === user.uid && c.status === 'completed') {
      events.push({ type: 'win', at: c.confirmedAt || c.processedAt, text: `Ganhou "${c.title}"` });
    }
  });
  Object.values(user.warnings || {}).forEach((w) => events.push({ type: 'warning', at: w.createdAt, text: `Recebeu um aviso: ${w.reason}` }));
  if (user.bannedAt) events.push({ type: 'ban', at: user.bannedAt, text: `Foi banido: ${user.banReason || 'sem motivo'}` });
  snaps.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (!amount) return;
    events.push({
      type: 'snaps',
      at: tx.at,
      text: `${amount > 0 ? '+' : ''}${amount} Snaps${tx.reason ? ` — ${tx.reason}` : tx.type ? ` (${tx.type})` : ''}`,
    });
  });
  return events.filter((e) => e.at).sort((a, b) => b.at - a.at).slice(0, limit);
}

export const BAN_DURATIONS = [
  { value: '1', label: '1 dia', days: 1 },
  { value: '7', label: '7 dias', days: 7 },
  { value: '30', label: '30 dias', days: 30 },
  { value: 'permanent', label: 'Permanente', days: null },
];

export function banUntil(durationValue, now = Date.now()) {
  const d = BAN_DURATIONS.find((x) => x.value === durationValue);
  return d?.days ? now + d.days * DAY_MS : null;
}
