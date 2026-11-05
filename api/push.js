// Envio de notificações push a partir do painel.
//
// O navegador não pode chamar a API de push da Expo directamente (CORS) e os
// tokens dos utilizadores só são legíveis por admins. Esta função recebe o
// ID token do admin, lê os tokens na Realtime Database pela API REST com esse
// mesmo token (as regras da base de dados decidem o acesso, não há
// credenciais de serviço aqui) e envia pela Expo em lotes de 100.
// Tokens que a Expo diz já não existirem (app desinstalada) são apagados.

const DB_URL = (process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://votasnap-default-rtdb.firebaseio.com').replace(/\/$/, '');
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]{10,200}\]$/;
// Só caminhos internos da app (expo-router), ex.: /challenge/abc, /invite-friends.
const SAFE_URL = /^\/[A-Za-z0-9_\-/()]{0,120}$/;
const MAX_UIDS = 20000;
const PER_UID_LIMIT = 30;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function db(path, idToken, { method = 'GET', query = '' } = {}) {
  const res = await fetch(`${DB_URL}/${path}.json?auth=${encodeURIComponent(idToken)}${query}`, { method });
  if (res.status === 401 || res.status === 403) throw new HttpError(403, 'Sem permissão: a conta não é admin.');
  if (!res.ok) throw new HttpError(502, 'Não foi possível ler a base de dados.');
  return res.json();
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

function validate(body) {
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  const uids = Array.isArray(body.uids) ? [...new Set(body.uids.filter((u) => typeof u === 'string' && SAFE_ID.test(u)))] : [];
  const url = body.url ? String(body.url) : null;
  if (title.length < 3 || title.length > 65) throw new HttpError(400, 'O título deve ter entre 3 e 65 caracteres.');
  if (text.length < 3 || text.length > 180) throw new HttpError(400, 'A mensagem deve ter entre 3 e 180 caracteres.');
  if (!uids.length) throw new HttpError(400, 'Nenhum destinatário.');
  if (uids.length > MAX_UIDS) throw new HttpError(400, 'Demasiados destinatários.');
  if (url && !SAFE_URL.test(url)) throw new HttpError(400, 'Destino inválido.');
  return { title, body: text, uids, url };
}

const blocked = (u) => !u || u.deletionRequestedAt || (u.banned === true && !(typeof u.bannedUntil === 'number' && u.bannedUntil <= Date.now()));

// uid → token, só para quem pode receber.
async function loadTokens(uids, idToken) {
  const tokens = new Map();
  if (uids.length <= PER_UID_LIMIT) {
    const users = await Promise.all(uids.map((uid) => db(`users/${uid}`, idToken)));
    users.forEach((u, i) => {
      if (!blocked(u) && EXPO_TOKEN.test(u.pushToken || '')) tokens.set(uids[i], u.pushToken);
    });
    return tokens;
  }
  const all = (await db('users', idToken)) || {};
  for (const uid of uids) {
    const u = all[uid];
    if (!blocked(u) && EXPO_TOKEN.test(u.pushToken || '')) tokens.set(uid, u.pushToken);
  }
  return tokens;
}

async function sendBatch(messages) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(json.data)) {
    const reason = json.errors?.[0]?.message || `HTTP ${res.status}`;
    return messages.map(() => ({ status: 'error', message: reason }));
  }
  return json.data;
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) throw new HttpError(401, 'Sessão em falta.');
    const payload = validate(readBody(req));

    // Confirma que é admin antes de qualquer outra coisa (adminAudit só é legível por admins).
    await db('adminAudit', idToken, { query: `&orderBy=${encodeURIComponent('"$key"')}&limitToLast=1` });

    const tokens = await loadTokens(payload.uids, idToken);

    // Vários utilizadores no mesmo telemóvel partilham o token: envia uma vez só.
    const byToken = new Map();
    for (const [uid, token] of tokens) byToken.set(token, [...(byToken.get(token) || []), uid]);
    const unique = [...byToken.keys()];

    const data = payload.url ? { url: payload.url } : {};
    let sent = 0;
    let failed = 0;
    const dead = [];
    for (let i = 0; i < unique.length; i += 100) {
      const chunk = unique.slice(i, i + 100);
      const tickets = await sendBatch(chunk.map((to) => ({
        to, title: payload.title, body: payload.body, data, sound: 'default', priority: 'high', channelId: 'default',
      })));
      tickets.forEach((t, j) => {
        if (t?.status === 'ok') sent += 1;
        else {
          failed += 1;
          if (t?.details?.error === 'DeviceNotRegistered') dead.push(...byToken.get(chunk[j]));
        }
      });
    }

    // Limpa tokens mortos (delete não passa pelas validações; admin pode escrever).
    if (dead.length) {
      const patch = Object.fromEntries(dead.flatMap((uid) => [[`${uid}/pushToken`, null], [`${uid}/pushTokenUpdatedAt`, null]]));
      await fetch(`${DB_URL}/users.json?auth=${encodeURIComponent(idToken)}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => {});
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      requested: payload.uids.length, withToken: tokens.size, devices: unique.length, sent, failed, removed: dead.length,
    }));
  } catch (err) {
    res.statusCode = err.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.status ? err.message : 'Erro ao enviar as notificações.' }));
    if (!err.status) console.error(err);
  }
}

module.exports = handler;
