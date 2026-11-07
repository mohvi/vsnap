// Porta de entrada para participar e votar: a app chama esta função, que
// verifica no servidor o que o backend (Cloud Functions) não verifica — idade
// mínima, província (desafios regionais) e abertura agendada — e só depois reencaminha o pedido,
// com o mesmo token, para o backend, que faz o resto (prazo, duplicados, contadores).
//   POST /api/challenge-action?action=submit  { challengeId, mediaUrl, mediaType, caption }
//   POST /api/challenge-action?action=vote    { challengeId, entryId, remove }
const { firebaseAdmin, adminHealth } = require('./_lib/admin');
const { gateChallengeAction } = require('./_lib/events');

const BACKEND_URL = (process.env.VOTASNAP_BACKEND_URL || 'https://us-central1-votasnap.cloudfunctions.net/votasnapApi').replace(/\/$/, '');
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const ACTIONS = new Set(['submit', 'vote']);

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
  // GET ?health=1 diz se a ligação ao Firebase funciona (sem mostrar a chave).
  if (req.method === 'GET' && req.query?.health) return json(res, 200, adminHealth());
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Método não permitido.' });
  const action = String(req.query?.action || '');
  if (!ACTIONS.has(action)) return json(res, 404, { success: false, error: 'Operação desconhecida.' });

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return json(res, 401, { success: false, error: 'Sessão expirada. Volta a fazer login.' });
  const body = readBody(req);
  if (!SAFE_ID.test(body.challengeId || '')) return json(res, 400, { success: false, error: 'Desafio inválido.' });

  let uid;
  let db;
  try {
    const admin = firebaseAdmin();
    db = admin.db;
    uid = (await admin.auth.verifyIdToken(header.slice(7))).uid;
  } catch {
    return json(res, 401, { success: false, error: 'Sessão expirada. Volta a fazer login.' });
  }

  try {
    const [challenge, demographics, province] = await Promise.all([
      db.ref(`challenges/${body.challengeId}`).get().then((s) => s.val()),
      db.ref(`userDemographics/${uid}`).get().then((s) => s.val()),
      db.ref(`users/${uid}/province`).get().then((s) => s.val()),
    ]);
    const blocked = gateChallengeAction(action, body, challenge, demographics, Date.now(), province);
    if (blocked) return json(res, 403, { success: false, error: blocked });
  } catch (err) {
    console.error('[challenge-action] verificação falhou', err);
    return json(res, 503, { success: false, error: 'Serviço indisponível. Tenta novamente.' });
  }

  // Reencaminha para o backend e devolve a resposta tal como veio.
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/challenges/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: header },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50000),
    });
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(await upstream.text());
  } catch (err) {
    console.error('[challenge-action] backend falhou', err);
    return json(res, 502, {
      success: false,
      error: 'Não foi possível confirmar a operação. Verifica o estado antes de tentar novamente.',
    });
  }
};
