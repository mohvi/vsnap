import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';

// ============================================================
// Util — formata um timestamp em "5 min", "1 hora", "2 dias"
// ============================================================
export function timeAgo(timestamp) {
  if (!timestamp) return '—';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hora${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? 's' : ''}`;
}

// ============================================================
// Hook principal — liga em tempo real a 5 nós do Firebase e
// deriva todas as métricas do dashboard a partir deles.
//
// NOTA: 'Receita' e 'entradas para moderar' dependem de campos
// que ainda não existem no schema (ver comentários abaixo).
// ============================================================
export function useDashboardData() {
  const [users, setUsers] = useState({});
  const [challenges, setChallenges] = useState({});
  const [entries, setEntries] = useState({});
  const [votes, setVotes] = useState({});
  const [snapsHistory, setSnapsHistory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), snap => setUsers(snap.val() || {}));
    const unsubChallenges = onValue(ref(db, 'challenges'), snap => setChallenges(snap.val() || {}));
    const unsubEntries = onValue(ref(db, 'entries'), snap => setEntries(snap.val() || {}));
    const unsubVotes = onValue(ref(db, 'votes'), snap => setVotes(snap.val() || {}));
    const unsubSnaps = onValue(ref(db, 'snaps_history'), snap => {
      setSnapsHistory(snap.val() || {});
      setLoading(false); // último a chegar — assume-se carregado
    });

    return () => {
      unsubUsers();
      unsubChallenges();
      unsubEntries();
      unsubVotes();
      unsubSnaps();
    };
  }, []);

  // ── Utilizadores activos ──
  // "Activo" aqui = não banido. Não há campo de "last seen" recente
  // separado de lastLogin, por isso usamos loginCount > 0 como proxy.
  const totalUsers = Object.keys(users).length;
  const activeUsers = Object.values(users).filter(u => !u.banned).length;

  // ── Desafios em curso ──
  const challengesList = Object.values(challenges);
  const activeChallenges = challengesList.filter(c => c.status === 'active');
  const completedChallenges = challengesList.filter(c => c.status === 'completed');

  // ── Votos totais ──
  // Contamos directamente o nó votes/ (fonte da verdade), não o
  // contador denormalizado entries/{}/votes — ver análise anterior
  // sobre risco de dessincronização desse contador.
  const totalVotes = Object.values(votes).reduce(
    (sum, challengeVotes) => sum + Object.keys(challengeVotes || {}).length,
    0
  );

  // ── Receita ──
  // ⚠️ Não existe nó de transações/pagamentos de patrocinadores no
  // schema actual. O que dá para somar com os dados que existem é
  // apenas o que já circulou em 'snaps' (moeda interna da app), que
  // NÃO é dinheiro real (MZN). Por agora mostramos isto como placeholder
  // explícito em vez de inventar um valor em MZN.
  const totalSnapsDistributed = Object.values(snapsHistory).reduce((sum, userTx) => {
    return sum + Object.values(userTx || {}).reduce((s, tx) => s + (tx.amount || 0), 0);
  }, 0);

  // ── Desafios a terminar em <24h ──
  const now = Date.now();
  const endingSoonCount = activeChallenges.filter(
    c => c.endsAt && c.endsAt - now > 0 && c.endsAt - now < 24 * 60 * 60 * 1000
  ).length;

  // ── Vencedores a premiar ──
  // Não existe campo 'prizePaid' em challenges 'completed' — por agora
  // contamos todos os completed com winnerId como "potencialmente
  // pendentes". Recomenda-se adicionar challenges/{id}.prizePaid: boolean
  // para esta métrica ficar fiável.
  const winnersPendingCount = completedChallenges.filter(c => c.winnerId).length;

  // ── Entradas para moderar ──
  // ⚠️ Não existe campo 'reported'/'flagged' em entries/. Esta métrica
  // fica a 0 até esse campo existir — não inventamos um número aqui.
  const entriesToModerateCount = Object.values(entries).reduce((sum, challengeEntries) => {
    return sum + Object.values(challengeEntries || {}).filter(e => e.reported === true).length;
  }, 0);

  // ── Actividade recente (mistura votos + submissões + criação + vitórias) ──
  const activity = [];

  Object.entries(votes).forEach(([challengeId, challengeVotes]) => {
    Object.entries(challengeVotes || {}).forEach(([userId, v]) => {
      activity.push({
        type: 'vote',
        username: users[userId]?.username || userId,
        action: `votou em "${challenges[challengeId]?.title || challengeId}"`,
        timestamp: v.votedAt,
      });
    });
  });

  Object.entries(entries).forEach(([challengeId, challengeEntries]) => {
    Object.entries(challengeEntries || {}).forEach(([entryId, e]) => {
      activity.push({
        type: 'entry',
        username: users[e.userId]?.username || e.userId,
        action: `submeteu entrada em "${challenges[challengeId]?.title || challengeId}"`,
        timestamp: e.createdAt,
      });
    });
  });

  challengesList.forEach(c => {
    activity.push({
      type: 'create',
      username: c.createdBy === 'admin' ? 'admin' : (users[c.createdBy]?.username || c.createdBy),
      action: `criou o desafio "${c.title}"`,
      timestamp: c.createdAt,
    });
    if (c.status === 'completed' && c.winnerId) {
      activity.push({
        type: 'win',
        username: users[c.winnerId]?.username || c.winnerId,
        action: `ganhou o desafio "${c.title}"`,
        timestamp: c.processedAt || c.confirmedAt,
      });
    }
  });

  const recentActivity = activity
    .filter(a => a.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return {
    loading,
    totalUsers,
    activeUsers,
    activeChallengesCount: activeChallenges.length,
    totalVotes,
    totalSnapsDistributed, // moeda interna, não MZN — ver nota acima
    endingSoonCount,
    winnersPendingCount,
    entriesToModerateCount,
    recentActivity,
  };
}