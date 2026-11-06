// Regras e textos das notificações automáticas (sem I/O, testadas em src/data/events.test.js).

const HOUR_MS = 60 * 60 * 1000;
const VOTE_DIGEST_MS = HOUR_MS; // no máximo uma notificação de votos por hora e por pessoa
const REMINDER_WINDOW_MS = 26 * HOUR_MS; // o cron corre uma vez por dia

const clip = (s, max) => {
  const t = String(s ?? '').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};
const message = (title, body, url = null) => ({ title: clip(title, 65), body: clip(body, 180), url });

// Junta votos: o primeiro voto depois de uma hora sem notificação é enviado
// logo; os seguintes acumulam e saem no próximo envio (voto ou cron).
function addVote(state, challengeId, now) {
  const pending = (state?.pending || 0) + 1;
  const due = now - (state?.lastSentAt || 0) >= VOTE_DIGEST_MS;
  return due
    ? { next: { pending: 0, lastSentAt: now, challengeId }, sendCount: pending }
    : { next: { ...state, pending, challengeId }, sendCount: 0 };
}

function flushDue(state, now) {
  return !!state && state.pending > 0 && now - (state.lastSentAt || 0) >= VOTE_DIGEST_MS;
}

function voteMessage(count, challengeId, challengeTitle) {
  const title = count === 1 ? '🗳️ Recebeste um voto!' : `🗳️ Recebeste ${count} votos!`;
  return message(title, `A tua publicação em "${challengeTitle || 'VotaSnap'}" está a ganhar votos. Partilha para teres mais!`, `/challenge/${challengeId}`);
}

function inviteMessage(username, count, goal) {
  const who = username ? `@${username}` : 'Um amigo';
  const progress = goal ? `Já tens ${count} de ${goal}.` : `Já tens ${count}.`;
  return message(`🎉 ${who} entrou com o teu convite`, `${progress} Continua a convidar para ganhar o prémio!`, '/invite-friends');
}

function challengesToRemind(challenges, reminded, now) {
  return Object.entries(challenges || {})
    .filter(([id, c]) => c?.status === 'active' && typeof c.endsAt === 'number'
      && c.endsAt > now && c.endsAt - now <= REMINDER_WINDOW_MS && !reminded?.[id])
    .map(([id, c]) => ({ id, ...c }));
}

// Idade a partir de 'AAAA-MM-DD' (igual a src/data/audience.js).
function ageFrom(birthDate, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const today = new Date(now);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d)) age -= 1;
  return age;
}

// Desafios 18+ (ou de álcool) só para quem declarou idade suficiente.
function meetsChallengeAge(challenge, demographics, now) {
  const minAge = challenge?.alcohol ? 18 : Number(challenge?.minAge) || 0;
  if (!minAge) return true;
  const age = ageFrom(demographics?.birthDate, now);
  return age !== null && age >= minAge;
}

function reminderMessage(challenge) {
  return message(`⏳ Último dia: ${challenge.title}`, 'O desafio termina amanhã. Ainda vais a tempo de participar!', `/challenge/${challenge.id}`);
}

function inviteCampaignReminderMessage(campaign) {
  return message('⏳ Último dia do desafio de convites', `"${campaign.title}" termina amanhã. Convida mais amigos e sobe no ranking!`, '/invite-friends');
}

module.exports = {
  VOTE_DIGEST_MS, REMINDER_WINDOW_MS, addVote, flushDue, voteMessage, inviteMessage,
  challengesToRemind, reminderMessage, inviteCampaignReminderMessage, ageFrom, meetsChallengeAge,
};
