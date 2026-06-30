import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import {
  Trophy, Clock, Users, Vote, Edit2, XCircle, Trash2,
  Search, ExternalLink, CheckCircle2, BarChart3, ChevronDown, ChevronUp,
  Target, Camera, Video, Film, Zap,
} from 'lucide-react';
import { db } from '../fb';

// ⚠️ Corrigido: o schema real grava status 'completed' para desafios
// terminados (ver export do Realtime Database), não 'ended'. O valor
// antigo nunca batia certo e o card ficava preso no estilo 'active'.
const STATUS_STYLES = {
  active: { label: 'Activo', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  completed: { label: 'Concluído', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const TYPE_STYLES = {
  free: { label: '🆓 Gratuito', color: 'text-teal-400' },
  paid: { label: '💳 Pago', color: 'text-purple-400' },
  sponsored: { label: '🏢 Patrocinado', color: 'text-pink-400' },
};

const MEDIA_TYPE_STYLES = {
  photo: { label: 'Só fotos', icon: Camera },
  video: { label: 'Só vídeos', icon: Video },
  both: { label: 'Foto ou vídeo', icon: Film },
};

function ChallengesList() {
  const [challenges, setChallenges] = useState([]);
  const [entriesByChallenge, setEntriesByChallenge] = useState({});
  const [votesByChallenge, setVotesByChallenge] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedAnalytics, setExpandedAnalytics] = useState(null); // id do desafio com análise aberta

  useEffect(() => {
    const challengesRef = ref(db, 'challenges');
    const unsub = onValue(challengesRef, snapshot => {
      if (!snapshot.exists()) {
        setChallenges([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const list = Object.entries(data).map(([id, c]) => ({ id, ...c }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setChallenges(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Entradas e votos completos — usados só para a análise (não para a lista principal),
  // por isso ficam num state separado em vez de misturar com o objecto challenge.
  useEffect(() => {
    const unsubEntries = onValue(ref(db, 'entries'), snap => setEntriesByChallenge(snap.val() || {}));
    const unsubVotes = onValue(ref(db, 'votes'), snap => setVotesByChallenge(snap.val() || {}));
    return () => {
      unsubEntries();
      unsubVotes();
    };
  }, []);

  const handleEndChallenge = async (id) => {
    if (!window.confirm('Encerrar este desafio agora? Os participantes não poderão mais votar nem submeter.')) return;
    await update(ref(db, `challenges/${id}`), {
      status: 'completed',
      endsAt: Date.now(),
    });
  };

  const handleReactivate = async (id) => {
    const newEndsAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
    await update(ref(db, `challenges/${id}`), {
      status: 'active',
      endsAt: newEndsAt,
    });
  };

  const handleDelete = async (id) => {
    await remove(ref(db, `challenges/${id}`));
    await remove(ref(db, `entries/${id}`));
    await remove(ref(db, `votes/${id}`));
    setConfirmDelete(null);
  };

  const handleSaveEdit = async (id, updates) => {
    await update(ref(db, `challenges/${id}`), updates);
    setEditingChallenge(null);
  };

  const getTimeStatus = (challenge) => {
    const isEnded = challenge.endsAt < Date.now() || challenge.status !== 'active';
    if (isEnded) return null;
    const diff = challenge.endsAt - Date.now();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d restantes`;
    return `${hours}h restantes`;
  };

  // ── Análise por desafio ──
  // Deriva tudo a partir de entries/{id} e votes/{id} reais — ranking de
  // entradas, taxa de conversão (votos / participantes) e ritmo de votação
  // (votos nas últimas 24h vs total), em vez de qualquer número mockado.
  const getChallengeAnalytics = (challenge) => {
    const entries = Object.entries(entriesByChallenge[challenge.id] || {})
      .map(([entryId, e]) => ({ entryId, ...e }));
    const votes = Object.values(votesByChallenge[challenge.id] || {});

    const leaderboard = [...entries]
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 5);

    const totalParticipants = entries.length;
    const totalVotesReal = votes.length; // fonte da verdade: nó votes/, não o contador denormalizado
    const conversionRate = totalParticipants > 0
      ? ((totalVotesReal / totalParticipants) * 100).toFixed(0)
      : 0;

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const votesLast24h = votes.filter(v => v.votedAt && v.votedAt > last24h).length;

    const goalProgress = challenge.voteGoal
      ? Math.min(100, Math.round((totalVotesReal / challenge.voteGoal) * 100))
      : null;

    return { leaderboard, totalParticipants, totalVotesReal, conversionRate, votesLast24h, goalProgress };
  };

  const filtered = challenges.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase()) ||
                           c.sponsor?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Desafios</h1>
          <p className="text-gray-500 text-sm mt-1">{challenges.length} desafios no total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="w-full bg-transparent p-3 text-white outline-none text-sm"
            placeholder="Buscar por título ou patrocinador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos os estados</option>
          <option value="active">Activos</option>
          <option value="completed">Concluídos</option>
          <option value="cancelled">Cancelados</option>
        </select>

        <select
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          <option value="free">Gratuitos</option>
          <option value="paid">Pagos</option>
          <option value="sponsored">Patrocinados</option>
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Nenhum desafio encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(challenge => {
            const statusStyle = STATUS_STYLES[challenge.status] || STATUS_STYLES.active;
            const typeStyle = TYPE_STYLES[challenge.type] || TYPE_STYLES.free;
            const mediaStyle = MEDIA_TYPE_STYLES[challenge.allowedMediaType] || MEDIA_TYPE_STYLES.both;
            const MediaIcon = mediaStyle.icon;
            const timeLeft = getTimeStatus(challenge);
            const isAnalyticsOpen = expandedAnalytics === challenge.id;
            const analytics = isAnalyticsOpen ? getChallengeAnalytics(challenge) : null;

            return (
              <div
                key={challenge.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full border ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                      <span className={`text-xs font-medium ${typeStyle.color}`}>
                        {typeStyle.label}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 flex items-center gap-1">
                        <MediaIcon className="w-3 h-3" />
                        {mediaStyle.label}
                      </span>
                      {challenge.sponsor && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                          📢 {challenge.sponsor}
                        </span>
                      )}
                    </div>

                    <h3 className="text-white font-semibold text-lg mb-1">
                      {challenge.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-1 mb-3">
                      {challenge.description}
                    </p>

                    <div className="flex items-center gap-5 text-sm text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                        {challenge.prize}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {challenge.totalParticipants || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Vote className="w-3.5 h-3.5" />
                        {challenge.totalVotes || 0}
                      </span>
                      {timeLeft && (
                        <span className="flex items-center gap-1.5 text-purple-400">
                          <Clock className="w-3.5 h-3.5" />
                          {timeLeft}
                        </span>
                      )}
                    </div>

                    {/* Meta de votos — "o que vier primeiro" */}
                    {challenge.voteGoal && (
                      <div className="mt-3 max-w-xs">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3 text-purple-400" />
                            Meta: {challenge.voteGoal} votos
                          </span>
                          <span>{Math.min(100, Math.round(((challenge.totalVotes || 0) / challenge.voteGoal) * 100))}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${Math.min(100, Math.round(((challenge.totalVotes || 0) / challenge.voteGoal) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acções */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedAnalytics(isAnalyticsOpen ? null : challenge.id)}
                      className={`p-2 rounded-lg transition-all ${
                        isAnalyticsOpen ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                      }`}
                      title="Ver análise"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setEditingChallenge(challenge)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {challenge.status === 'active' ? (
                      <button
                        onClick={() => handleEndChallenge(challenge.id)}
                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all"
                        title="Encerrar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(challenge.id)}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-all"
                        title="Reactivar (+7 dias)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmDelete(challenge)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      title="Apagar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Painel de análise — dados reais de entries/ e votes/ */}
                {isAnalyticsOpen && analytics && (
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Participantes</p>
                        <p className="text-white text-lg font-bold">{analytics.totalParticipants}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Votos reais</p>
                        <p className="text-white text-lg font-bold">{analytics.totalVotesReal}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Conversão votos/participante</p>
                        <p className="text-white text-lg font-bold">{analytics.conversionRate}%</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400" /> Votos nas últimas 24h
                        </p>
                        <p className="text-white text-lg font-bold">{analytics.votesLast24h}</p>
                      </div>
                    </div>

                    {challenge.totalVotes !== analytics.totalVotesReal && (
                      <div className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                        ⚠️ O contador "totalVotes" do desafio ({challenge.totalVotes || 0}) está dessincronizado
                        do número real de votos ({analytics.totalVotesReal}). Vale corrigir manualmente ou rever a lógica que actualiza esse campo.
                      </div>
                    )}

                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Ranking de entradas</p>
                    {analytics.leaderboard.length === 0 ? (
                      <p className="text-gray-600 text-sm">Ainda sem entradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.leaderboard.map((entry, i) => (
                          <div key={entry.entryId} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                            <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                              #{i + 1}
                            </span>
                            <span className="flex-1 text-sm text-gray-300 truncate">{entry.caption || entry.entryId}</span>
                            <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                              <Vote className="w-3 h-3" /> {entry.votes || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal editar */}
      {editingChallenge && (
        <EditModal
          challenge={editingChallenge}
          onSave={handleSaveEdit}
          onClose={() => setEditingChallenge(null)}
        />
      )}

      {/* Modal confirmar apagar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">Apagar desafio?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Esta acção é irreversível. Todas as entradas e votos de "{confirmDelete.title}" serão apagados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ challenge, onSave, onClose }) {
  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description);
  const [prize, setPrize] = useState(challenge.prize);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full">
        <h3 className="text-white font-bold text-lg mb-4">Editar desafio</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Título</label>
            <input
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-purple-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Descrição</label>
            <textarea
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-purple-500 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Prémio</label>
            <input
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-purple-500"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(challenge.id, { title, description, prize })}
            className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChallengesList;