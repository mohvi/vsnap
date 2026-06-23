import React, { useEffect, useState } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import {
  Trophy, AlertTriangle, CheckCircle2, RotateCcw,
  Users, Vote, Clock, Crown,
} from 'lucide-react';
import { db } from '../fb';

function WinnersConfirmation() {
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [entriesData, setEntriesData] = useState({});
  const [usersData, setUsersData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const challengesRef = ref(db, 'challenges');
    const unsub = onValue(challengesRef, async snapshot => {
      if (!snapshot.exists()) {
        setPendingChallenges([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const list = Object.entries(data)
        .map(([id, c]) => ({ id, ...c }))
        .filter(c => c.status === 'pending_confirmation');

      list.sort((a, b) => b.processedAt - a.processedAt);
      setPendingChallenges(list);

      // Carregar entradas e utilizadores de cada desafio
      const entriesMap = {};
      const usersMap = {};

      await Promise.all(list.map(async challenge => {
        const entriesSnap = await get(ref(db, `entries/${challenge.id}`));
        if (entriesSnap.exists()) {
          const entries = Object.entries(entriesSnap.val()).map(([eid, e]) => ({ id: eid, ...e }));
          entries.sort((a, b) => (b.votes || 0) - (a.votes || 0));
          entriesMap[challenge.id] = entries;

          // Carregar dados dos utilizadores das entradas
          await Promise.all(entries.map(async entry => {
            if (!usersMap[entry.userId]) {
              const userSnap = await get(ref(db, `users/${entry.userId}`));
              if (userSnap.exists()) usersMap[entry.userId] = userSnap.val();
            }
          }));
        }
      }));

      setEntriesData(entriesMap);
      setUsersData(usersMap);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleConfirm = async (challenge) => {
    if (!window.confirm(`Confirmar vencedor de "${challenge.title}"? O prémio será considerado entregue.`)) return;
    await update(ref(db, `challenges/${challenge.id}`), {
      status: 'completed',
      confirmedAt: Date.now(),
    });
  };

  const handleSelectWinner = async (challenge, entryId, userId) => {
    if (!window.confirm('Confirmar este participante como vencedor (resolve empate)?')) return;

    // Buscar dados actuais
    const userSnap = await get(ref(db, `users/${userId}`));
    const currentSnaps = userSnap.val()?.snaps || 0;
    const currentWins = userSnap.val()?.wins || 0;

    // Ajusta Snaps — remove os 5 de participação e dá os 50 de vencedor
    await update(ref(db, `users/${userId}`), {
      snaps: currentSnaps - 5 + 50,
      wins: currentWins + 1,
    });

    await update(ref(db, `challenges/${challenge.id}`), {
      status: 'pending_confirmation',
      winnerId: userId,
      winnerEntryId: entryId,
      isTie: false,
    });
  };

  const handleRevert = async (challenge) => {
    if (!window.confirm(`Reverter "${challenge.title}"? O desafio voltará a ficar activo por mais 3 dias e os Snaps distribuídos serão mantidos.`)) return;
    await update(ref(db, `challenges/${challenge.id}`), {
      status: 'active',
      endsAt: Date.now() + (3 * 24 * 60 * 60 * 1000),
      winnerId: null,
      winnerEntryId: null,
      isTie: false,
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-MZ', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Confirmar Vencedores
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingChallenges.length} desafios aguardam confirmação
          </p>
        </div>
      </div>

      {pendingChallenges.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhum desafio aguarda confirmação
        </div>
      ) : (
        <div className="space-y-4">
          {pendingChallenges.map(challenge => {
            const entries = entriesData[challenge.id] || [];
            const winner = usersData[challenge.winnerId];

            return (
              <div
                key={challenge.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-5"
              >

                {/* Header do desafio */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-lg">{challenge.title}</h3>
                      {challenge.isTie && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Empate — escolhe o vencedor
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Terminou em {formatDate(challenge.processedAt)}
                    </p>
                  </div>
                  <span className="text-yellow-400 font-medium text-sm flex items-center gap-1.5 flex-shrink-0">
                    🎁 {challenge.prize}
                  </span>
                </div>

                {/* Vencedor sugerido (se não houver empate) */}
                {!challenge.isTie && winner && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 flex items-center gap-3">
                    <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{winner.name}</p>
                      <p className="text-gray-400 text-sm">@{winner.username} · {challenge.winnerVotes} votos</p>
                    </div>
                  </div>
                )}

                {/* Ranking de participantes */}
                <div className="space-y-2 mb-4">
                  {entries.slice(0, 5).map((entry, i) => {
                    const user = usersData[entry.userId];
                    const isWinner = entry.id === challenge.winnerEntryId;
                    const isTiedTop = challenge.isTie && i === 0;

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isWinner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'
                        }`}
                      >
                        <span className="text-gray-500 text-sm w-6">#{i + 1}</span>
                        {user?.avatar ? (
                          <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{user?.name || 'Utilizador'}</p>
                        </div>
                        <span className="text-purple-400 text-sm font-medium flex items-center gap-1">
                          <Vote className="w-3.5 h-3.5" />
                          {entry.votes || 0}
                        </span>

                        {challenge.isTie && entries.filter(e => e.votes === entries[0].votes).some(e => e.id === entry.id) && (
                          <button
                            onClick={() => handleSelectWinner(challenge, entry.id, entry.userId)}
                            className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold transition-all"
                          >
                            Escolher vencedor
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Acções */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <span className="text-gray-500 text-xs flex items-center gap-1.5 flex-1">
                    <Users className="w-3.5 h-3.5" />
                    {entries.length} participantes
                  </span>

                  <button
                    onClick={() => handleRevert(challenge)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reverter (+3 dias)
                  </button>

                  {!challenge.isTie && (
                    <button
                      onClick={() => handleConfirm(challenge)}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmar e entregar prémio
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WinnersConfirmation;