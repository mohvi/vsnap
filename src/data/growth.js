import { DAY_MS } from '../config';
import { provinceName } from '../utils/provinces';
import { dayKey } from './metrics';
import { buildUserIndex } from './users';

// Indicadores de crescimento do dashboard, calculados sobre um período de N dias.

export const PERIODS = [7, 30, 90];

const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Série diária contínua com os últimos `days` dias (hoje incluído).
export function dailySeries(timestamps, days, now = Date.now()) {
  const counts = {};
  timestamps.forEach((ts) => { if (ts) counts[dayKey(ts)] = (counts[dayKey(ts)] || 0) + 1; });
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    // Meio-dia evita saltos com mudanças de hora.
    const day = dayKey(today - (days - 1 - i) * DAY_MS + DAY_MS / 2);
    return { day, count: counts[day] || 0 };
  });
}

// Total do período e variação face ao período anterior com a mesma duração.
function periodDelta(timestamps, days, now) {
  const start = startOfDay(now) - (days - 1) * DAY_MS;
  const prevStart = start - days * DAY_MS;
  const current = timestamps.filter((t) => t >= start && t <= now).length;
  const previous = timestamps.filter((t) => t >= prevStart && t < start).length;
  return { current, previous, change: previous ? Math.round(((current - previous) / previous) * 100) : null };
}

const monthKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function revenueByMonth(challengeDeals = {}, months = 6, now = Date.now()) {
  const sums = {};
  Object.values(challengeDeals).forEach((d) => {
    const at = d?.paidAt || (d?.paymentStatus === 'paid' ? d.updatedAt : null);
    if (d?.paymentStatus !== 'paid' || !at || !(Number(d.amountMzn) > 0)) return;
    sums[monthKey(at)] = (sums[monthKey(at)] || 0) + Number(d.amountMzn);
  });
  const ref = new Date(now);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - (months - 1 - i), 1);
    const key = monthKey(d.getTime());
    return { month: key, label: d.toLocaleDateString('pt-MZ', { month: 'short' }), amount: sums[key] || 0 };
  });
}

export function computeGrowth({ users = {}, entries = {}, votes = {}, reports = {}, challenges = {}, challengeDeals = {} }, days = 30, now = Date.now()) {
  const userList = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));
  const signups = userList.map((u) => u.createdAt).filter(Boolean);
  const entryTimes = [];
  const entriesPerChallenge = {};
  Object.entries(entries).forEach(([cid, list]) => {
    Object.values(list || {}).forEach((e) => {
      if (e?.createdAt) entryTimes.push(e.createdAt);
      entriesPerChallenge[cid] = (entriesPerChallenge[cid] || 0) + 1;
    });
  });
  const voteTimes = [];
  Object.values(votes).forEach((list) => Object.values(list || {}).forEach((v) => v?.votedAt && voteTimes.push(v.votedAt)));

  const index = buildUserIndex({ users, entries, votes, reports });
  const activeWithin = (ms) => userList.filter((u) => now - (index[u.uid]?.lastActiveAt || 0) < ms).length;

  // Retenção a 7 dias: dos que se registaram no período há pelo menos 7 dias,
  // quantos tiveram actividade 7 ou mais dias depois do registo.
  const cohort = userList.filter((u) => u.createdAt && u.createdAt >= now - (days + 7) * DAY_MS && u.createdAt <= now - 7 * DAY_MS);
  const retained = cohort.filter((u) => (index[u.uid]?.lastActiveAt || 0) >= u.createdAt + 7 * DAY_MS).length;

  const posters = userList.filter((u) => (index[u.uid]?.entriesCount || 0) > 0).length;

  const provinceCounts = {};
  userList.forEach((u) => { if (u.province) provinceCounts[u.province] = (provinceCounts[u.province] || 0) + 1; });

  const periodStart = startOfDay(now) - (days - 1) * DAY_MS;
  const topChallenges = Object.entries(challenges)
    .map(([id, c]) => ({ id, title: c.title, type: c.type, status: c.status, createdAt: c.createdAt, participants: entriesPerChallenge[id] || 0 }))
    .filter((c) => (c.createdAt || 0) >= periodStart || c.status === 'active')
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 5);

  return {
    days,
    series: {
      signups: dailySeries(signups, days, now),
      entries: dailySeries(entryTimes, days, now),
      votes: dailySeries(voteTimes, days, now),
    },
    totals: {
      signups: periodDelta(signups, days, now),
      entries: periodDelta(entryTimes, days, now),
      votes: periodDelta(voteTimes, days, now),
    },
    dau: activeWithin(DAY_MS),
    wau: activeWithin(7 * DAY_MS),
    mau: activeWithin(30 * DAY_MS),
    retention7: cohort.length ? Math.round((retained / cohort.length) * 100) : null,
    retentionCohort: cohort.length,
    postingRate: userList.length ? Math.round((posters / userList.length) * 100) : 0,
    topProvinces: Object.entries(provinceCounts)
      .map(([code, count]) => ({ code, name: provinceName(code), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topChallenges,
    revenue: revenueByMonth(challengeDeals, 6, now),
  };
}
