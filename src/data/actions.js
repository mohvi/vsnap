import { ref, update, increment, runTransaction, push, serverTimestamp } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../fb';
import { DAY_MS, PARTICIPATION_SNAPS, WINNER_SNAPS } from '../config';
import { adminRequest } from '../services/adminApi';

// Todas as escritas do painel ficam aqui. Regras seguidas:
//  - contadores usam increment() (sem ler-modificar-escrever → sem corridas);
//  - operações que tocam vários nós usam um único update() multi-path (atómico);
//  - mudanças de estado de um desafio usam runTransaction com guarda de estado,
//    para que dois cliques/admins não apliquem a mesma acção duas vezes.

class StaleStateError extends Error {
  constructor(message) {
    super(message);
    this.code = 'stale-state';
  }
}

async function transitionChallenge(challengeId, guard, apply, staleMessage) {
  const result = await runTransaction(ref(db, `challenges/${challengeId}`), (c) => {
    // Primeira execução pode vir com cache local vazia: devolver o mesmo
    // valor faz o SDK repetir com o valor real do servidor.
    if (c === null) return c;
    if (!guard(c)) return undefined; // aborta
    return { ...c, ...apply(c) };
  });
  if (!result.committed) throw new StaleStateError(staleMessage);
  return result.snapshot.val();
}

// ── Desafios ──

// O desafio e o acordo comercial (só admin) são gravados juntos: não fica
// um desafio patrocinado publicado sem o registo do que a marca vai pagar.
export async function createChallenge(challengeId, payload, deal = null) {
  await update(ref(db), {
    [`challenges/${challengeId}`]: payload,
    [`challengeDeals/${challengeId}`]: deal,
  });
  await logAudit('challenge.create', { type: 'challenge', id: challengeId }, { title: payload.title, type: payload.type });
}

export function newChallengeId() {
  return push(ref(db, 'challenges')).key;
}

export async function updateChallenge(challengeId, fields) {
  await update(ref(db, `challenges/${challengeId}`), { ...fields, updatedAt: Date.now() });
}

// O fecho é feito pela API para que os resultados sejam processados uma só vez no servidor.
export async function endChallenge(challengeId) {
  await adminRequest('/api/challenges/close', { challengeId, endNow: true });
  await logAudit('challenge.end', { type: 'challenge', id: challengeId });
}

export async function reactivateChallenge(challengeId, days = 7) {
  await transitionChallenge(
    challengeId,
    (c) => c.status !== 'active' && !c.processedAt,
    () => ({ status: 'active', endsAt: Date.now() + days * DAY_MS }),
    'O desafio já está activo ou já foi processado.',
  );
  await logAudit('challenge.reactivate', { type: 'challenge', id: challengeId }, { days });
}

// Apaga desafio + entradas + votos numa única escrita atómica.
export async function deleteChallenge(challengeId) {
  await update(ref(db), {
    [`challenges/${challengeId}`]: null,
    [`challengeDeals/${challengeId}`]: null,
    [`entries/${challengeId}`]: null,
    [`votes/${challengeId}`]: null,
  });
  await logAudit('challenge.delete', { type: 'challenge', id: challengeId });
}

// ── Marcas ──
//  sponsors/{id}        → público (nome, logótipo, site), lido pela app;
//  sponsorPrivate/{id}  → só admin (contactos e notas);
//  challengeDeals/{cid} → só admin (valor acordado, estado do pagamento, prémio).

export function newSponsorId() {
  return push(ref(db, 'sponsors')).key;
}

// Grava a marca e propaga nome/logótipo aos desafios que a usam, numa só
// escrita: a app lê `sponsor` e `sponsorLogo` directamente do desafio.
export async function saveSponsor(sponsorId, publicFields, privateFields, challenges = {}) {
  const updates = { [`sponsors/${sponsorId}/updatedAt`]: Date.now() };
  Object.entries(publicFields).forEach(([k, v]) => { updates[`sponsors/${sponsorId}/${k}`] = v; });
  Object.entries(privateFields).forEach(([k, v]) => { updates[`sponsorPrivate/${sponsorId}/${k}`] = v; });
  Object.entries(challenges).forEach(([cid, c]) => {
    if (c?.sponsorId !== sponsorId) return;
    updates[`challenges/${cid}/sponsor`] = publicFields.name;
    updates[`challenges/${cid}/sponsorLogo`] = publicFields.logoUrl || null;
  });
  addAudit(updates, 'sponsor.save', { type: 'sponsor', id: sponsorId }, { name: publicFields.name });
  await update(ref(db), updates);
}

export async function setSponsorActive(sponsorId, active) {
  await update(ref(db, `sponsors/${sponsorId}`), { active, updatedAt: Date.now() });
  await logAudit(active ? 'sponsor.activate' : 'sponsor.deactivate', { type: 'sponsor', id: sponsorId });
}

export async function updateChallengeDeal(challengeId, fields) {
  await update(ref(db, `challengeDeals/${challengeId}`), { ...fields, updatedAt: Date.now() });
  await logAudit('deal.update', { type: 'challenge', id: challengeId }, fields);
}

// ── Vencedores ──

export async function confirmWinner(challengeId) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'pending_confirmation' && !c.isTie && !!c.winnerId,
    () => ({ status: 'completed', confirmedAt: Date.now(), prizePaid: true }),
    'Este desafio já foi confirmado ou alterado por outro admin.',
  );
  await logAudit('winner.confirm', { type: 'challenge', id: challengeId });
}

// Resolve um empate numa única escrita: vencedor, Snaps e registo entram juntos
// ou não entra nada. A regra de `tieResolvedAt` só aceita a primeira resolução
// de um desafio empatado, por isso um segundo clique (ou admin) é recusado.
export async function resolveTie(challengeId, entry) {
  const updates = {
    [`challenges/${challengeId}/winnerId`]: entry.userId,
    [`challenges/${challengeId}/winnerEntryId`]: entry.id,
    [`challenges/${challengeId}/winnerVotes`]: entry.votes || 0,
    [`challenges/${challengeId}/isTie`]: false,
    [`challenges/${challengeId}/tieResolvedAt`]: serverTimestamp(),
    // O vencedor já tinha recebido os Snaps de participação: recebe a diferença.
    [`users/${entry.userId}/snaps`]: increment(WINNER_SNAPS - PARTICIPATION_SNAPS),
    [`users/${entry.userId}/wins`]: increment(1),
  };
  addAudit(updates, 'winner.tie', { type: 'challenge', id: challengeId }, { winnerId: entry.userId, entryId: entry.id });
  try {
    await update(ref(db), updates);
  } catch (err) {
    if (/permission/i.test(err?.code || err?.message || '')) throw new StaleStateError('O empate já foi resolvido.');
    throw err;
  }
}

// Volta a abrir o desafio por mais `days` dias. Os Snaps já distribuídos
// são mantidos; `revertCount` permite às Cloud Functions não voltar a pagar
// a participação quando o desafio for reprocessado.
export async function revertChallenge(challengeId, days = 3) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'pending_confirmation' && !c.processedAt,
    (c) => ({
      status: 'active',
      endsAt: Date.now() + days * DAY_MS,
      winnerId: null,
      winnerEntryId: null,
      winnerVotes: null,
      isTie: false,
      // Um novo resultado pode voltar a ser confirmado ou desempatado.
      tieResolvedAt: null,
      confirmedAt: null,
      revertedAt: Date.now(),
      revertCount: (c.revertCount || 0) + 1,
    }),
    'O desafio já não está a aguardar confirmação ou já foi processado.',
  );
  await logAudit('winner.revert', { type: 'challenge', id: challengeId }, { days });
}

// ── Utilizadores ──
// Cada acção sobre contas grava a alteração e o registo de auditoria na mesma escrita.

// `uids` aceita um ou vários utilizadores (acções em massa). `until` null = permanente.
export async function banUsers(uids, reason, until = null) {
  const now = Date.now();
  const banReason = reason?.trim() || 'Violação dos termos de uso';
  const updates = {};
  uids.forEach((uid) => {
    Object.assign(updates, {
      [`users/${uid}/banned`]: true,
      [`users/${uid}/bannedAt`]: now,
      [`users/${uid}/bannedUntil`]: until,
      [`users/${uid}/banReason`]: banReason,
    });
    addAudit(updates, 'user.ban', { type: 'user', id: uid }, { reason: banReason, until });
  });
  await update(ref(db), updates);
}

// `auto` marca no registo os banimentos temporários levantados por terem expirado.
export async function unbanUsers(uids, { auto = false } = {}) {
  const updates = {};
  uids.forEach((uid) => {
    Object.assign(updates, {
      [`users/${uid}/banned`]: false,
      [`users/${uid}/bannedAt`]: null,
      [`users/${uid}/bannedUntil`]: null,
      [`users/${uid}/banReason`]: null,
    });
    addAudit(updates, 'user.unban', { type: 'user', id: uid }, auto ? { reason: 'Prazo do banimento terminou' } : null);
  });
  await update(ref(db), updates);
}

// O aviso fica em users/{uid}/warnings, que o próprio utilizador pode ler.
export async function warnUsers(uids, reason) {
  const text = reason.trim();
  const updates = {};
  uids.forEach((uid) => {
    const id = push(ref(db, `users/${uid}/warnings`)).key;
    updates[`users/${uid}/warnings/${id}`] = { reason: text, createdAt: Date.now(), by: adminLabel() };
    updates[`users/${uid}/warningsCount`] = increment(1);
    addAudit(updates, 'user.warn', { type: 'user', id: uid }, { reason: text });
  });
  await update(ref(db), updates);
}

// Acerto manual de Snaps: saldo e histórico na mesma escrita, sempre com motivo.
export async function adjustSnaps(uid, amount, reason) {
  const id = push(ref(db, `snaps_history/${uid}`)).key;
  const updates = {
    [`users/${uid}/snaps`]: increment(amount),
    [`snaps_history/${uid}/${id}`]: {
      amount, type: 'admin_adjustment', reason: reason.trim(), createdAt: Date.now(), by: adminLabel(),
    },
  };
  addAudit(updates, 'user.snaps', { type: 'user', id: uid }, { amount, reason: reason.trim() });
  await update(ref(db), updates);
}

// Notas internas: adminNotes/{uid} só é legível por admins.
export async function addAdminNote(uid, text) {
  const id = push(ref(db, `adminNotes/${uid}`)).key;
  const updates = { [`adminNotes/${uid}/${id}`]: { text: text.trim(), createdAt: Date.now(), by: adminLabel() } };
  addAudit(updates, 'user.note', { type: 'user', id: uid });
  await update(ref(db), updates);
}

export async function deleteAdminNote(uid, noteId) {
  const updates = { [`adminNotes/${uid}/${noteId}`]: null };
  addAudit(updates, 'user.note_delete', { type: 'user', id: uid });
  await update(ref(db), updates);
}

// ── Auditoria ──
//  adminAudit/{id} → { action, target: {type, id}, details, by: {uid, email}, at }
// Só admin (regra da raiz). Acções de utilizador gravam-no atomicamente;
// as restantes registam depois de concluídas (melhor esforço).

function currentAdmin() {
  const u = auth.currentUser;
  return { uid: u?.uid || null, email: u?.email || null };
}

// Nome guardado em avisos, notas e movimentos de Snaps (a regra exige texto).
const adminLabel = () => currentAdmin().email || currentAdmin().uid || 'admin';

// `at` usa a hora do servidor: a regra de adminAudit exige-a e recusa registos
// com autor diferente da sessão, por isso não é possível forjar quem fez o quê.
function auditRecord(action, target, details) {
  return { action, target, details: details || null, by: currentAdmin(), at: serverTimestamp() };
}

function addAudit(updates, action, target, details) {
  const id = push(ref(db, 'adminAudit')).key;
  updates[`adminAudit/${id}`] = auditRecord(action, target, details);
}

async function logAudit(action, target, details) {
  try {
    await push(ref(db, 'adminAudit'), auditRecord(action, target, details));
  } catch (err) {
    console.warn('Não foi possível registar a auditoria:', err);
  }
}

// ── Moderação ──

export async function dismissReport(reportId) {
  await update(ref(db, `reports/${reportId}`), { status: 'dismissed', resolvedAt: Date.now() });
  await logAudit('report.dismiss', { type: 'report', id: reportId });
}

// Remove a entrada denunciada e mantém os contadores coerentes, numa só escrita:
//  - apaga entries/{c}/{e} e os votos que apontavam para ela (os votantes
//    podem voltar a votar noutra entrada);
//  - decrementa totalParticipants/totalVotes do desafio;
//  - fecha todas as denúncias pendentes sobre a mesma entrada.
// O ficheiro no Storage é apagado a seguir (melhor esforço).
export async function removeReportedEntry(report, { entries, votes, reports }) {
  const { challengeId, entryId } = report;
  const now = Date.now();
  const updates = {};

  const entry = entries?.[challengeId]?.[entryId];
  if (entry) {
    updates[`entries/${challengeId}/${entryId}`] = null;
    updates[`challenges/${challengeId}/totalParticipants`] = increment(-1);

    const voters = Object.entries(votes?.[challengeId] || {})
      .filter(([, v]) => v?.entryId === entryId)
      .map(([uid]) => uid);
    voters.forEach((uid) => { updates[`votes/${challengeId}/${uid}`] = null; });
    if (voters.length) updates[`challenges/${challengeId}/totalVotes`] = increment(-voters.length);
  }

  Object.entries(reports || {}).forEach(([rid, r]) => {
    if (rid === report.id || (r.status === 'pending' && r.challengeId === challengeId && r.entryId === entryId)) {
      updates[`reports/${rid}/status`] = 'removed';
      updates[`reports/${rid}/resolvedAt`] = now;
    }
  });

  addAudit(updates, 'report.remove_entry', { type: 'user', id: entry?.userId || report.reportedUserId || null }, { challengeId, entryId });
  await update(ref(db), updates);

  const mediaUrl = entry?.mediaUrl || report.mediaUrl;
  if (mediaUrl) {
    try {
      await deleteObject(storageRef(storage, mediaUrl));
    } catch (err) {
      // Não bloqueia: a entrada já foi removida da base de dados.
      console.warn('Não foi possível apagar o ficheiro do Storage:', err);
    }
  }
}

// ── Desafio de convites ──
//  inviteCampaigns/{id} → público; a app só conta convites enquanto status
//  for 'active' e endsAt não tiver passado (regras).

export async function createInviteCampaign(payload) {
  const id = push(ref(db, 'inviteCampaigns')).key;
  const updates = { [`inviteCampaigns/${id}`]: { ...payload, createdBy: adminLabel() } };
  addAudit(updates, 'invite.create', { type: 'invite', id }, { title: payload.title });
  await update(ref(db), updates);
  return id;
}

export async function endInviteCampaign(campaignId, winnerUid = null) {
  const updates = {
    [`inviteCampaigns/${campaignId}/status`]: 'ended',
    [`inviteCampaigns/${campaignId}/endedAt`]: serverTimestamp(),
    [`inviteCampaigns/${campaignId}/winnerUid`]: winnerUid,
  };
  addAudit(updates, 'invite.end', { type: 'invite', id: campaignId }, winnerUid ? { winnerId: winnerUid } : null);
  await update(ref(db), updates);
}

// Anula um convite suspeito: o convidador perde 1; o número continua marcado
// como usado, por isso não volta a contar para ninguém.
export async function voidInviteAttribution(campaignId, inviteeUid, inviterUid, reason) {
  const updates = {
    [`inviteAttributions/${campaignId}/${inviteeUid}`]: null,
    [`inviteProgress/${campaignId}/${inviterUid}/count`]: increment(-1),
    [`inviteVoided/${campaignId}/${inviteeUid}`]: { inviterUid, reason: reason?.trim() || null, at: serverTimestamp(), by: adminLabel() },
  };
  addAudit(updates, 'invite.void', { type: 'user', id: inviterUid }, { reason: reason?.trim() || null, inviteeUid });
  await update(ref(db), updates);
}
