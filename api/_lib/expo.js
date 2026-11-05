// Envio pela API de push da Expo com o Firebase Admin (sem passar pelas regras).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]{10,200}\]$/;

const canReceive = (u, now = Date.now()) => !!u && !u.deletionRequestedAt
  && !(u.banned === true && !(typeof u.bannedUntil === 'number' && u.bannedUntil <= now))
  && EXPO_TOKEN.test(u.pushToken || '');

async function postToExpo(messages) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  try {
    const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
    const json = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(json.data)) return json.data;
  } catch {
    // tratado abaixo como falha de todo o lote
  }
  return messages.map(() => ({ status: 'error' }));
}

// `users` (opcional) evita reler a base de dados quando já foi lida inteira.
async function sendToUsers(db, uids, msg, users = null) {
  const list = [...new Set(uids)];
  if (!list.length) return { sent: 0, failed: 0 };
  const profiles = users
    ? list.map((uid) => users[uid])
    : await Promise.all(list.map(async (uid) => (await db.ref(`users/${uid}`).get()).val()));

  const byToken = new Map();
  profiles.forEach((u, i) => {
    if (canReceive(u)) byToken.set(u.pushToken, [...(byToken.get(u.pushToken) || []), list[i]]);
  });
  const tokens = [...byToken.keys()];
  const data = msg.url ? { url: msg.url } : {};
  let sent = 0;
  let failed = 0;
  const dead = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const tickets = await postToExpo(chunk.map((to) => ({
      to, title: msg.title, body: msg.body, data, sound: 'default', priority: 'high', channelId: 'default',
    })));
    tickets.forEach((t, j) => {
      if (t?.status === 'ok') sent += 1;
      else {
        failed += 1;
        if (t?.details?.error === 'DeviceNotRegistered') dead.push(...byToken.get(chunk[j]));
      }
    });
  }
  if (dead.length) {
    await db.ref('users').update(Object.fromEntries(dead.flatMap((uid) => [[`${uid}/pushToken`, null], [`${uid}/pushTokenUpdatedAt`, null]])));
  }
  return { sent, failed };
}

module.exports = { sendToUsers, canReceive };
