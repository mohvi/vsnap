import { ref, update, increment, runTransaction, push } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../fb';
import { DAY_MS, PARTICIPATION_SNAPS, WINNER_SNAPS } from '../config';

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
}

export function newChallengeId() {
  return push(ref(db, 'challenges')).key;
}

export async function updateChallenge(challengeId, fields) {
  await update(ref(db, `challenges/${challengeId}`), { ...fields, updatedAt: Date.now() });
}

export async function endChallenge(challengeId) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'active',
    () => ({ status: 'completed', endsAt: Date.now() }),
    'O desafio já não está activo.',
  );
}

export async function reactivateChallenge(challengeId, days = 7) {
  await transitionChallenge(
    challengeId,
    (c) => c.status !== 'active',
    () => ({ status: 'active', endsAt: Date.now() + days * DAY_MS }),
    'O desafio já está activo.',
  );
}

// Apaga desafio + entradas + votos numa única escrita atómica.
export async function deleteChallenge(challengeId) {
  await update(ref(db), {
    [`challenges/${challengeId}`]: null,
    [`challengeDeals/${challengeId}`]: null,
    [`entries/${challengeId}`]: null,
    [`votes/${challengeId}`]: null,
  });
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
  await update(ref(db), updates);
}

export async function setSponsorActive(sponsorId, active) {
  await update(ref(db, `sponsors/${sponsorId}`), { active, updatedAt: Date.now() });
}

export async function updateChallengeDeal(challengeId, fields) {
  await update(ref(db, `challengeDeals/${challengeId}`), { ...fields, updatedAt: Date.now() });
}

// ── Vencedores ──

export async function confirmWinner(challengeId) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'pending_confirmation' && !c.isTie && !!c.winnerId,
    () => ({ status: 'completed', confirmedAt: Date.now(), prizePaid: true }),
    'Este desafio já foi confirmado ou alterado por outro admin.',
  );
}

// Resolve um empate. A transacção garante que só um admin/clique consegue
// escolher o vencedor; só depois disso os Snaps são creditados (increment).
export async function resolveTie(challengeId, entry) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'pending_confirmation' && c.isTie === true,
    () => ({
      winnerId: entry.userId,
      winnerEntryId: entry.id,
      winnerVotes: entry.votes || 0,
      isTie: false,
      tieResolvedAt: Date.now(),
    }),
    'O empate já foi resolvido.',
  );
  // O vencedor já tinha recebido os Snaps de participação: recebe a diferença.
  await update(ref(db), {
    [`users/${entry.userId}/snaps`]: increment(WINNER_SNAPS - PARTICIPATION_SNAPS),
    [`users/${entry.userId}/wins`]: increment(1),
  });
}

// Volta a abrir o desafio por mais `days` dias. Os Snaps já distribuídos
// são mantidos; `revertCount` permite às Cloud Functions não voltar a pagar
// a participação quando o desafio for reprocessado.
export async function revertChallenge(challengeId, days = 3) {
  await transitionChallenge(
    challengeId,
    (c) => c.status === 'pending_confirmation',
    (c) => ({
      status: 'active',
      endsAt: Date.now() + days * DAY_MS,
      winnerId: null,
      winnerEntryId: null,
      winnerVotes: null,
      isTie: false,
      revertedAt: Date.now(),
      revertCount: (c.revertCount || 0) + 1,
    }),
    'O desafio já não está a aguardar confirmação.',
  );
}

// ── Utilizadores ──

export async function banUser(uid, reason) {
  await update(ref(db, `users/${uid}`), {
    banned: true,
    bannedAt: Date.now(),
    banReason: reason?.trim() || 'Violação dos termos de uso',
  });
}

export async function unbanUser(uid) {
  await update(ref(db, `users/${uid}`), { banned: false, bannedAt: null, banReason: null });
}

// ── Moderação ──

export async function dismissReport(reportId) {
  await update(ref(db, `reports/${reportId}`), { status: 'dismissed', resolvedAt: Date.now() });
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
