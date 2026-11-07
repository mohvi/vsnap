// Relatório de campanha entregue à marca (PDF). Só cálculos, sem I/O.
//
// Privacidade: o telefone e o nome completo de um participante só entram na
// lista de potenciais clientes se ele tiver aceitado, ao participar, ser
// contactado por esta marca (sponsorConsents/{desafio}/{uid}). Dos restantes
// o relatório mostra apenas @username, província e números.

import { DAY_MS } from '../config';
import { provinceName } from '../utils/provinces';
import { dayKey } from './metrics';
import { ageBreakdown, challengeMinAge, challengeProvinces } from './audience';
import { challengePrizes } from './prizes';

const list = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

export function reportReference(challengeId, now = Date.now()) {
  const d = new Date(now);
  return `VS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(challengeId).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;
}

// Nível de interesse de um contacto, pela posição nos votos recebidos.
export function interestTier(rank, total) {
  if (total <= 0) return 'Baixo';
  const pos = rank / total;
  if (pos < 1 / 3) return 'Alto';
  if (pos < 2 / 3) return 'Médio';
  return 'Baixo';
}

export function buildBrandReport({
  challenge, entries = {}, votes = {}, users = {}, consents = {}, deal = null, now = Date.now(),
  demographics = {}, reminders = {}, deliveries = {},
}) {
  // Desafios agendados contam a partir da abertura.
  const start = challenge.startsAt || challenge.createdAt || now;
  const end = Math.min(challenge.endsAt || now, now);
  const entryList = list(entries).sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const voteList = Object.entries(votes || {})
    .map(([voterUid, v]) => ({ voterUid, ...v }))
    .filter((v) => v.entryId);

  const participantIds = new Set(entryList.map((e) => e.userId).filter(Boolean));
  const voterIds = new Set(voteList.map((v) => v.voterUid));
  const audienceIds = new Set([...participantIds, ...voterIds]);
  const isNewUser = (uid) => {
    const created = users[uid]?.createdAt;
    return typeof created === 'number' && created >= start && created <= end + DAY_MS;
  };

  // Séries diárias contínuas.
  const byDay = {};
  const bump = (t, key) => {
    if (!t) return;
    const k = dayKey(t);
    byDay[k] = byDay[k] || { votes: 0, entries: 0 };
    byDay[k][key] += 1;
  };
  voteList.forEach((v) => bump(v.votedAt, 'votes'));
  entryList.forEach((e) => bump(e.createdAt, 'entries'));
  const daily = [];
  for (let t = start; dayKey(t) <= dayKey(end) && daily.length <= 366; t += DAY_MS) {
    const k = dayKey(t);
    daily.push({ day: k, votes: byDay[k]?.votes || 0, entries: byDay[k]?.entries || 0 });
  }
  const peakDay = daily.reduce((best, d) => (d.votes > (best?.votes || 0) ? d : best), null);

  // Províncias da audiência (quem publicou e quem votou).
  const provinces = {};
  const addProvince = (uid, key) => {
    const code = users[uid]?.province || '—';
    provinces[code] = provinces[code] || { code, participants: 0, voters: 0 };
    provinces[code][key] += 1;
  };
  participantIds.forEach((uid) => addProvince(uid, 'participants'));
  voterIds.forEach((uid) => { if (!participantIds.has(uid)) addProvince(uid, 'voters'); });
  const provinceRows = Object.values(provinces)
    .map((p) => ({
      ...p,
      name: p.code === '—' ? 'Não indicada' : provinceName(p.code),
      total: p.participants + p.voters,
      share: audienceIds.size ? (p.participants + p.voters) / audienceIds.size : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Participantes (um por pessoa, somando as publicações).
  const perUser = {};
  entryList.forEach((e) => {
    if (!e.userId) return;
    const row = perUser[e.userId] || { uid: e.userId, entries: 0, votesReceived: 0, firstAt: e.createdAt || null };
    row.entries += 1;
    row.votesReceived += e.votes || 0;
    if (e.createdAt && (!row.firstAt || e.createdAt < row.firstAt)) row.firstAt = e.createdAt;
    perUser[e.userId] = row;
  });
  const participants = Object.values(perUser)
    .sort((a, b) => b.votesReceived - a.votesReceived)
    .map((row, i) => {
      const u = users[row.uid] || {};
      return {
        ...row,
        position: i + 1,
        username: u.username || row.uid,
        province: u.province ? provinceName(u.province) : '',
        city: u.city || '',
        isNewUser: isNewUser(row.uid),
        consented: !!consents[row.uid],
      };
    });

  const leads = participants
    .filter((p) => p.consented)
    .map((p) => {
      const u = users[p.uid] || {};
      return {
        uid: p.uid,
        name: u.name || '',
        username: p.username,
        phone: u.phone || '',
        city: p.city,
        province: p.province,
        votesReceived: p.votesReceived,
        consentAt: consents[p.uid]?.at || null,
        interest: interestTier(p.position - 1, participants.length),
      };
    });

  const winnerEntry = challenge.winnerEntryId ? entryList.find((e) => e.id === challenge.winnerEntryId) : null;
  // Investimento = valor pago à VotaSnap + valor estimado dos prémios (produto incluído).
  const fee = Number(deal?.amountMzn) || 0;
  const prizeValue = Number(deal?.prizeValueMzn) || 0;
  const amount = fee + prizeValue;
  const per = (n) => (amount > 0 && n > 0 ? Math.round((amount / n) * 100) / 100 : null);
  const prizeList = challengePrizes(challenge);
  const prizes = prizeList.map((prize, i) => {
    const place = i + 1;
    const d = deliveries?.[place];
    const podium = (challenge.podium || []).find((p) => p.place === place);
    const uid = d?.uid || podium?.uid || (place === 1 ? challenge.winnerId : null);
    return {
      place,
      prize,
      username: uid ? users[uid]?.username || uid : null,
      status: d?.status || (uid ? 'pending' : null),
      deliveredAt: d?.deliveredAt || null,
      idChecked: !!d?.idChecked,
      photoUrl: d?.photoPublic ? d.photoUrl : null,
    };
  });
  const newUsers = [...audienceIds].filter(isNewUser).length;

  return {
    period: { start, end, days: Math.max(1, Math.round((end - start) / DAY_MS)) },
    kpis: {
      entries: entryList.length,
      participants: participantIds.size,
      voters: voterIds.size,
      votes: voteList.length,
      audience: audienceIds.size,
      newUsers,
      provinces: provinceRows.filter((p) => p.code !== '—').length,
      leads: leads.length,
      consentRate: participantIds.size ? leads.length / participantIds.size : 0,
      votesPerEntry: entryList.length ? Math.round((voteList.length / entryList.length) * 10) / 10 : 0,
    },
    investment: amount > 0 ? {
      amount,
      fee,
      prizeValue,
      perParticipant: per(participantIds.size),
      perAudience: per(audienceIds.size),
      perVote: per(voteList.length),
      perLead: per(leads.length),
    } : null,
    daily,
    peakDay,
    provinces: provinceRows,
    topEntries: entryList.slice(0, 9).map((e, i) => ({
      position: i + 1,
      id: e.id,
      username: users[e.userId]?.username || e.userId,
      votes: e.votes || 0,
      caption: e.caption || '',
      mediaUrl: e.mediaUrl || '',
      mediaType: e.mediaType || 'photo',
    })),
    winner: winnerEntry ? {
      username: users[winnerEntry.userId]?.username || winnerEntry.userId,
      votes: winnerEntry.votes || 0,
      mediaUrl: winnerEntry.mediaUrl || '',
      mediaType: winnerEntry.mediaType || 'photo',
    } : null,
    participants,
    leads,
    // Faixas etárias (só números agregados) e pedidos de aviso antes do lançamento.
    ages: {
      audience: ageBreakdown([...audienceIds], demographics, now),
      participants: ageBreakdown([...participantIds], demographics, now),
    },
    minAge: challengeMinAge(challenge),
    region: challengeProvinces(challenge).map(provinceName),
    // Prémios por posição e o estado da entrega.
    prizes,
    reminders: Object.keys(reminders || {}).length,
  };
}

// Parágrafo de abertura do resumo executivo.
export function executiveSummary(report, challenge, sponsorName) {
  const k = report.kpis;
  const parts = [
    `Durante ${report.period.days} dia(s), o desafio "${challenge.title}" envolveu ${k.audience} pessoa(s) com a marca ${sponsorName}: ${k.participants} publicaram conteúdo e ${k.voters} votaram, num total de ${k.votes} voto(s).`,
  ];
  if (k.provinces > 0) parts.push(`A audiência chegou de ${k.provinces} província(s)${report.provinces[0]?.code !== '—' ? `, com destaque para ${report.provinces[0].name}` : ''}.`);
  if (k.newUsers > 0) parts.push(`${k.newUsers} pessoa(s) criaram conta na VotaSnap durante a campanha.`);
  if (k.leads > 0) parts.push(`${k.leads} participante(s) autorizaram ser contactados pela marca e constam da lista de potenciais clientes.`);
  if (report.peakDay?.votes) parts.push(`O pico de actividade foi a ${report.peakDay.day.split('-').reverse().join('/')}, com ${report.peakDay.votes} voto(s).`);
  return parts.join(' ');
}

export function leadsCsvRows(report) {
  return [
    ['Nome', 'Utilizador', 'Telefone', 'Cidade', 'Província', 'Votos recebidos', 'Interesse', 'Consentimento em'],
    ...report.leads.map((l) => [
      l.name, `@${l.username}`, l.phone, l.city, l.province, l.votesReceived, l.interest,
      l.consentAt ? new Date(l.consentAt).toISOString() : '',
    ]),
  ];
}
