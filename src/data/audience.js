// Idade, interesses e público-alvo dos desafios. Os dados vêm de
// userDemographics/{uid} = { birthDate: 'AAAA-MM-DD', interests: { moda: true } },
// preenchidos na app. As marcas só vêem números agregados (faixas etárias).

// Têm de coincidir com INTERESTS na app (services/demographics.ts).
export const INTEREST_OPTIONS = [
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'musica', label: 'Música' },
  { value: 'danca', label: 'Dança' },
  { value: 'moda', label: 'Moda' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'desporto', label: 'Desporto' },
  { value: 'culinaria', label: 'Comida' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'viagens', label: 'Viagens' },
  { value: 'arte', label: 'Arte' },
  { value: 'humor', label: 'Humor' },
];

export const AGE_BANDS = [
  { label: '13–17', min: 13, max: 17 },
  { label: '18–24', min: 18, max: 24 },
  { label: '25–34', min: 25, max: 34 },
  { label: '35–44', min: 35, max: 44 },
  { label: '45+', min: 45, max: 200 },
];

export function ageFrom(birthDate, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const today = new Date(now);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d)) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function ageBand(age) {
  if (age === null || age === undefined) return null;
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max)?.label ?? null;
}

// Bebidas alcoólicas são sempre 18+.
export function challengeMinAge(challenge) {
  if (!challenge) return 0;
  if (challenge.alcohol) return 18;
  return Number(challenge.minAge) > 0 ? Number(challenge.minAge) : 0;
}

export function userAge(demographics, uid, now = Date.now()) {
  return ageFrom(demographics?.[uid]?.birthDate, now);
}

// Quem pode ver/participar: sem restrição todos; com restrição só quem
// declarou idade suficiente.
export function meetsMinAge(minAge, age) {
  return !minAge || (age !== null && age >= minAge);
}

// Destinatários de uma notificação de novo desafio.
// mode: 'all' (todos os que têm idade) | 'interested' (só quem marcou a categoria).
// Províncias de um desafio regional (códigos como 'SF'); vazio = nacional.
export function challengeProvinces(challenge) {
  const p = challenge?.provinces;
  const list = Array.isArray(p) ? p : p && typeof p === 'object' ? Object.values(p) : [];
  return list.filter((x) => typeof x === 'string' && x);
}

export function inRegion(challenge, province) {
  const list = challengeProvinces(challenge);
  return list.length === 0 || (!!province && list.includes(province));
}

export function challengeAudience({ users = {}, demographics = {}, challenge, mode = 'all', now = Date.now() }) {
  const minAge = challengeMinAge(challenge);
  return Object.keys(users).filter((uid) => {
    if (!meetsMinAge(minAge, userAge(demographics, uid, now))) return false;
    if (!inRegion(challenge, users[uid]?.province)) return false;
    if (mode === 'interested') return demographics?.[uid]?.interests?.[challenge.category] === true;
    return true;
  });
}

// Contagem por faixa etária de uma lista de uids (para relatórios).
export function ageBreakdown(uids, demographics, now = Date.now()) {
  const counts = Object.fromEntries(AGE_BANDS.map((b) => [b.label, 0]));
  let unknown = 0;
  for (const uid of uids) {
    const band = ageBand(userAge(demographics, uid, now));
    if (band) counts[band] += 1;
    else unknown += 1;
  }
  const known = uids.length - unknown;
  return {
    bands: AGE_BANDS.map((b) => ({ label: b.label, count: counts[b.label], share: known ? counts[b.label] / known : 0 })),
    unknown,
    known,
  };
}
