// Prémios por posição e entrega. Um desafio pode ter vários prémios
// (1.º, 2.º, 3.º lugar…). `challenge.prize` continua a ser o do 1.º lugar,
// para a app antiga e para a API; `challenge.prizes` tem a lista completa.

export const MAX_PLACES = 10;

export const PLACE_LABELS = ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º', '8.º', '9.º', '10.º'];
export const placeLabel = (place) => PLACE_LABELS[place - 1] || `${place}.º`;

// Textos dos prémios a partir do formulário (dinheiro ganha " MZN").
export function buildPrizeList(prizeType, rawPrizes) {
  return rawPrizes
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_PLACES)
    .map((p) => (prizeType === 'cash' ? `${p} MZN` : p));
}

export function challengePrizes(challenge) {
  if (Array.isArray(challenge?.prizes) && challenge.prizes.length) return challenge.prizes.filter(Boolean);
  return challenge?.prize ? [challenge.prize] : [];
}

// Quem recebe cada prémio: o vencedor oficial em 1.º e depois os mais
// votados, uma pessoa por prémio (quem tem várias publicações conta uma vez).
// Empates de votos: ganha quem publicou primeiro.
export function rankPlaces(entries, { winnerId, winnerEntryId } = {}, count = 1, exclude = []) {
  const ranked = Object.entries(entries || {})
    .map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.userId)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0) || (a.createdAt || 0) - (b.createdAt || 0));
  const taken = new Set(exclude);
  const places = [];
  if (winnerId && !taken.has(winnerId)) {
    const entry = ranked.find((e) => e.id === winnerEntryId) || ranked.find((e) => e.userId === winnerId);
    places.push({ uid: winnerId, entryId: entry?.id || winnerEntryId || null, votes: entry?.votes || 0 });
    taken.add(winnerId);
  }
  for (const e of ranked) {
    if (places.length >= count) break;
    if (taken.has(e.userId)) continue;
    places.push({ uid: e.userId, entryId: e.id, votes: e.votes || 0 });
    taken.add(e.userId);
  }
  return places.slice(0, count);
}

// Próximo classificado para um prémio que ficou sem dono (idade, não levantou…).
export function nextEligible(entries, takenUids) {
  return rankPlaces(entries, {}, 1, takenUids)[0] || null;
}

export const DELIVERY_STATUS = {
  pending: { label: 'Por entregar', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  delivered: { label: 'Entregue', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  forfeited: { label: 'Passou ao seguinte', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
};

export function deliveriesSummary(deliveries) {
  const list = Object.values(deliveries || {});
  return {
    total: list.length,
    delivered: list.filter((d) => d.status === 'delivered').length,
    pending: list.filter((d) => d.status === 'pending').length,
  };
}

// Todas as entregas pendentes do painel (badge na navegação).
export function pendingDeliveriesCount(allDeliveries) {
  return Object.values(allDeliveries || {})
    .reduce((n, byPlace) => n + Object.values(byPlace || {}).filter((d) => d?.status === 'pending').length, 0);
}
