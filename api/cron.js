// Corre uma vez por dia (vercel.json → crons). A Vercel envia
// "Authorization: Bearer $CRON_SECRET"; sem esse segredo a função recusa.
//  - envia os votos que ficaram acumulados;
//  - lembra o último dia dos desafios (a quem ainda não participou);
//  - lembra o último dia do desafio de convites.
const { firebaseAdmin } = require('./_lib/admin');
const { sendToUsers } = require('./_lib/expo');
const {
  flushDue, voteMessage, challengesToRemind, reminderMessage, inviteCampaignReminderMessage, REMINDER_WINDOW_MS,
  meetsChallengeAge,
} = require('./_lib/events');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    res.end('unauthorized');
    return;
  }

  try {
    const { db } = firebaseAdmin();
    const now = Date.now();
    const report = { votes: 0, challenges: [], invite: false };

    const [usersSnap, digestsSnap, challengesSnap, remindedSnap, campaignsSnap, demographicsSnap] = await Promise.all([
      db.ref('users').get(),
      db.ref('pushState/voteDigest').get(),
      db.ref('challenges').orderByChild('status').equalTo('active').get(),
      db.ref('pushState/reminded').get(),
      db.ref('inviteCampaigns').orderByChild('status').equalTo('active').get(),
      db.ref('userDemographics').get(),
    ]);
    const demographics = demographicsSnap.val() || {};
    const users = usersSnap.val() || {};
    const reminded = remindedSnap.val() || {};
    const challenges = challengesSnap.val() || {};

    // 1. Votos acumulados.
    for (const [uid, state] of Object.entries(digestsSnap.val() || {})) {
      if (!flushDue(state, now)) continue;
      const title = challenges[state.challengeId]?.title || (await db.ref(`challenges/${state.challengeId}/title`).get()).val();
      await db.ref(`pushState/voteDigest/${uid}`).update({ pending: 0, lastSentAt: now });
      await sendToUsers(db, [uid], voteMessage(state.pending, state.challengeId, title), users);
      report.votes += 1;
    }

    // 2. Último dia de cada desafio, só para quem ainda não participou.
    // Marca antes de enviar: se algo falhar a meio, não volta a enviar amanhã.
    for (const challenge of challengesToRemind(challenges, reminded, now)) {
      await db.ref(`pushState/reminded/${challenge.id}`).set(now);
      const entries = (await db.ref(`entries/${challenge.id}`).get()).val() || {};
      const participants = new Set(Object.values(entries).map((e) => e?.userId));
      // Desafios 18+ não são lembrados a menores nem a quem não indicou a idade.
      const targets = Object.keys(users).filter((uid) => !participants.has(uid) && meetsChallengeAge(challenge, demographics[uid], now));
      const result = await sendToUsers(db, targets, reminderMessage(challenge), users);
      report.challenges.push({ id: challenge.id, ...result });
    }

    // 3. Último dia do desafio de convites.
    for (const [id, campaign] of Object.entries(campaignsSnap.val() || {})) {
      const key = `invite_${id}`;
      if (reminded[key] || typeof campaign.endsAt !== 'number' || campaign.endsAt <= now || campaign.endsAt - now > REMINDER_WINDOW_MS) continue;
      await db.ref(`pushState/reminded/${key}`).set(now);
      await sendToUsers(db, Object.keys(users), inviteCampaignReminderMessage(campaign), users);
      report.invite = true;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(report));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('error');
  }
};
