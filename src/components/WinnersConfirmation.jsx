import { useMemo, useState } from 'react';
import {
  Trophy, AlertTriangle, CheckCircle2, RotateCcw, Users, Vote, Clock, Crown,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { confirmWinner, resolveTie, revertChallenge } from '../data/actions';
import { getTiedTopEntries, toList } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { formatDateTime } from '../utils/format';
import { PARTICIPATION_SNAPS, WINNER_SNAPS } from '../config';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import ConfirmDialog from './ui/ConfirmDialog';
import Avatar from './ui/Avatar';

export default function WinnersConfirmation() {
  const { loading, challenges, entries, users } = useAdminData();
  const [dialog, setDialog] = useState(null);

  const pending = useMemo(
    () => toList(challenges)
      .filter((c) => c.status === 'pending_confirmation')
      .sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0)),
    [challenges],
  );

  if (loading) return <PageLoader />;

  const askConfirm = (challenge) => setDialog({
    title: 'Confirmar vencedor?',
    message: <>O prémio de <strong className="text-white">&quot;{challenge.title}&quot;</strong> será marcado como entregue.</>,
    confirmLabel: 'Confirmar',
    variant: 'success',
    onConfirm: () => runAction(() => confirmWinner(challenge.id), { success: 'Vencedor confirmado' }),
  });

  const askResolveTie = (challenge, entry) => setDialog({
    title: 'Escolher vencedor do empate?',
    message: (
      <>
        <strong className="text-white">{users[entry.userId]?.name || 'Este participante'}</strong> será o vencedor de
        &quot;{challenge.title}&quot; e recebe +{WINNER_SNAPS - PARTICIPATION_SNAPS} Snaps (além dos {PARTICIPATION_SNAPS} de participação).
      </>
    ),
    confirmLabel: 'Escolher vencedor',
    variant: 'primary',
    onConfirm: () => runAction(() => resolveTie(challenge.id, entry), { success: 'Empate resolvido' }),
  });

  const askRevert = (challenge) => setDialog({
    title: 'Reverter desafio?',
    message: <>&quot;{challenge.title}&quot; volta a ficar activo por mais 3 dias. Os Snaps já distribuídos são mantidos.</>,
    confirmLabel: 'Reverter',
    variant: 'danger',
    onConfirm: () => runAction(() => revertChallenge(challenge.id), { success: 'Desafio reaberto por 3 dias' }),
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <PageHeader
        icon={Trophy}
        iconClass="text-yellow-400"
        title="Confirmar vencedores"
        subtitle={`${pending.length} desafio(s) aguardam confirmação`}
      />

      {pending.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhum desafio aguarda confirmação
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((challenge) => {
            const ranked = toList(entries[challenge.id]).sort((a, b) => (b.votes || 0) - (a.votes || 0));
            const tiedIds = new Set(challenge.isTie ? getTiedTopEntries(ranked).map((e) => e.id) : []);
            // Num empate mostramos sempre todos os empatados, mesmo que sejam mais de 5.
            const visible = ranked.filter((e, i) => i < 5 || tiedIds.has(e.id));
            const winner = users[challenge.winnerId];

            return (
              <article key={challenge.id} className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-white font-semibold text-base sm:text-lg break-words">{challenge.title}</h2>
                      {challenge.isTie && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Empate — escolhe o vencedor
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Terminou em {formatDateTime(challenge.processedAt)}
                    </p>
                  </div>
                  <span className="text-yellow-400 font-medium text-sm flex-shrink-0">🎁 {challenge.prize}</span>
                </div>

                {!challenge.isTie && winner && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 mb-4 flex items-center gap-3">
                    <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{winner.name}</p>
                      <p className="text-gray-400 text-sm truncate">@{winner.username} · {challenge.winnerVotes || 0} votos</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {visible.map((entry, i) => {
                    const user = users[entry.userId];
                    const isWinner = entry.id === challenge.winnerEntryId;
                    const canPick = challenge.isTie && tiedIds.has(entry.id);
                    return (
                      <div
                        key={entry.id}
                        className={`flex flex-wrap items-center gap-3 p-3 rounded-xl ${
                          isWinner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'
                        }`}
                      >
                        <span className="text-gray-500 text-sm w-6">#{i + 1}</span>
                        <Avatar user={user} size="w-8 h-8" textSize="text-xs" />
                        <p className="flex-1 min-w-0 text-white text-sm font-medium truncate">{user?.name || 'Utilizador'}</p>
                        <span className="text-purple-400 text-sm font-medium flex items-center gap-1">
                          <Vote className="w-3.5 h-3.5" />
                          {entry.votes || 0}
                        </span>
                        {canPick && (
                          <button
                            onClick={() => askResolveTie(challenge, entry)}
                            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold transition-colors"
                          >
                            Escolher vencedor
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-white/5">
                  <span className="text-gray-500 text-xs flex items-center gap-1.5 sm:flex-1">
                    <Users className="w-3.5 h-3.5" />
                    {ranked.length} participantes
                  </span>
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    {!challenge.processedAt && (
                      <button
                        onClick={() => askRevert(challenge)}
                        className="px-4 py-2.5 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reverter (+3 dias)
                      </button>
                    )}
                    {!challenge.isTie && (
                      <button
                        onClick={() => askConfirm(challenge)}
                        className="px-4 py-2.5 sm:py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmar e entregar prémio
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dialog && <ConfirmDialog {...dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
