// Notificações de eventos dos utilizadores, chamada pela app logo a seguir a:
//   { type: 'vote', challengeId, entryId }  → avisa o dono da publicação (agrupado por hora)
//   { type: 'invite', campaignId }          → avisa quem convidou
// A função não confia no pedido: confirma o voto/convite na base de dados e
// regista cada evento uma só vez (pushState/*, só legível pelo servidor), por
// isso repetir a chamada não gera notificações a mais.
const { firebaseAdmin } = require('./_lib/admin');
const { sendToUsers } = require('./_lib/expo');
const { addVote, voteMessage, inviteMessage } = require('./_lib/events');

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

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

// true só na primeira vez que o caminho é marcado.
async function firstTime(db, path) {
  const result = await db.ref(path).transaction((cur) => (cur ? undefined : Date.now()));
  return result.committed;
}

async function onVote(db, voterUid, { challengeId, entryId }) {
  if (!SAFE_ID.test(challengeId || '') || !SAFE_ID.test(entryId || '')) return 'invalid';
  const [vote, entry] = await Promise.all([
    db.ref(`votes/${challengeId}/${voterUid}`).get(),
    db.ref(`entries/${challengeId}/${entryId}`).get(),
  ]);
  if (vote.val()?.entryId !== entryId) return 'no-vote';
  const ownerUid = entry.val()?.userId;
  if (!ownerUid || ownerUid === voterUid) return 'skip';
  if (!(await firstTime(db, `pushState/voteSeen/${challengeId}/${entryId}/${voterUid}`))) return 'duplicate';

  let sendCount = 0;
  const now = Date.now();
  await db.ref(`pushState/voteDigest/${ownerUid}`).transaction((cur) => {
    const step = addVote(cur, challengeId, now);
    sendCount = step.sendCount;
    return step.next;
  });
  if (!sendCount) return 'queued';
  const title = (await db.ref(`challenges/${challengeId}/title`).get()).val();
  await sendToUsers(db, [ownerUid], voteMessage(sendCount, challengeId, title));
  return 'sent';
}

async function onInvite(db, inviteeUid, { campaignId }) {
  if (!SAFE_ID.test(campaignId || '')) return 'invalid';
  const attribution = (await db.ref(`inviteAttributions/${campaignId}/${inviteeUid}`).get()).val();
  const inviterUid = attribution?.inviterUid;
  if (!inviterUid) return 'no-invite';
  if (!(await firstTime(db, `pushState/inviteSeen/${campaignId}/${inviteeUid}`))) return 'duplicate';
  const [username, count, goal] = await Promise.all([
    db.ref(`publicProfiles/${inviteeUid}/username`).get(),
    db.ref(`inviteProgress/${campaignId}/${inviterUid}/count`).get(),
    db.ref(`inviteCampaigns/${campaignId}/goal`).get(),
  ]);
  await sendToUsers(db, [inviterUid], inviteMessage(username.val(), count.val() || 1, goal.val()));
  return 'sent';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  let firebase;
  try {
    firebase = firebaseAdmin();
  } catch (err) {
    console.error(err.message);
    return json(res, 503, { error: 'Notificações não configuradas.' });
  }

  const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let uid;
  try {
    uid = (await firebase.auth.verifyIdToken(idToken)).uid;
  } catch {
    return json(res, 401, { error: 'Sessão inválida.' });
  }

  const body = readBody(req);
  try {
    if (body.type === 'vote') return json(res, 200, { result: await onVote(firebase.db, uid, body) });
    if (body.type === 'invite') return json(res, 200, { result: await onInvite(firebase.db, uid, body) });
    return json(res, 400, { error: 'Tipo de evento desconhecido.' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Erro ao processar o evento.' });
  }
};
