import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Trophy, Clock, Users, Vote, Edit2, XCircle, Trash2, Search, CheckCircle2,
  BarChart3, Target, Camera, Video, Film, Zap, ListChecks,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { deleteChallenge, endChallenge, reactivateChallenge, updateChallenge } from '../data/actions';
import { computeChallengeAnalytics, toList } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { timeLeft } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import ConfirmDialog from './ui/ConfirmDialog';
import Modal, { ModalButton } from './ui/Modal';

const STATUS_STYLES = {
  active: { label: 'Activo', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  pending_confirmation: { label: 'A confirmar', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  completed: { label: 'Concluído', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

// 'paid' já não se cria; fica só para identificar desafios antigos.
const TYPE_STYLES = {
  free: { label: '🌍 Comunidade', color: 'text-teal-400' },
  sponsored: { label: '🏢 Patrocinado', color: 'text-accent-400' },
  paid: { label: '💳 Pago (antigo)', color: 'text-gray-400' },
};

const MEDIA_TYPE_STYLES = {
  photo: { label: 'Só fotos', icon: Camera },
  video: { label: 'Só vídeos', icon: Video },
  both: { label: 'Foto ou vídeo', icon: Film },
};

const selectClass = 'bg-ink-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-500 w-full sm:w-auto';

function IconButton({ label, className, children, ...props }) {
  return (
    <button aria-label={label} title={label} className={`p-2.5 sm:p-2 rounded-lg transition-colors ${className}`} {...props}>
      {children}
    </button>
  );
}

export default function ChallengesList() {
  const { loading, challenges, entries, votes } = useAdminData();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [search, setSearch] = useState(queryParam);
  // A pesquisa global abre esta página com ?q=título.
  useEffect(() => setSearch(queryParam), [queryParam]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const list = useMemo(
    () => toList(challenges).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [challenges],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      const matchesSearch = !q || c.title?.toLowerCase().includes(q) || c.sponsor?.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [list, search, filterStatus, filterType]);

  if (loading) return <PageLoader />;

  const askEnd = (c) => setDialog({
    title: 'Encerrar desafio?',
    message: `"${c.title}" fecha agora. Os participantes deixam de poder votar e submeter.`,
    confirmLabel: 'Encerrar',
    variant: 'danger',
    onConfirm: () => runAction(() => endChallenge(c.id), { success: 'Desafio encerrado' }),
  });

  const askDelete = (c) => setDialog({
    title: 'Apagar desafio?',
    message: `Esta acção é irreversível. Todas as entradas e votos de "${c.title}" serão apagados.`,
    confirmLabel: 'Apagar',
    variant: 'danger',
    onConfirm: () => runAction(() => deleteChallenge(c.id), { success: 'Desafio apagado' }),
  });

  const handleReactivate = (c) =>
    runAction(() => reactivateChallenge(c.id), { success: 'Desafio reactivado por 7 dias' });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <PageHeader icon={ListChecks} title="Desafios" subtitle={`${list.length} desafios no total`} />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        <label className="flex items-center gap-2 bg-ink-800 border border-white/5 rounded-xl px-3 sm:flex-1 sm:min-w-[240px] focus-within:border-brand-500">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="sr-only">Pesquisar</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-white outline-none text-sm"
            placeholder="Pesquisar por título ou patrocinador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 sm:flex gap-3">
          <select aria-label="Filtrar por estado" className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Todos os estados</option>
            <option value="active">Activos</option>
            <option value="pending_confirmation">A confirmar</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <select aria-label="Filtrar por tipo" className={selectClass} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="free">Comunidade</option>
            <option value="sponsored">Patrocinados</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Nenhum desafio encontrado</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((challenge) => {
            const statusStyle = STATUS_STYLES[challenge.status] || STATUS_STYLES.active;
            const typeStyle = TYPE_STYLES[challenge.type] || TYPE_STYLES.free;
            const mediaStyle = MEDIA_TYPE_STYLES[challenge.allowedMediaType] || MEDIA_TYPE_STYLES.both;
            const MediaIcon = mediaStyle.icon;
            const remaining = challenge.status === 'active' ? timeLeft(challenge.endsAt) : null;
            const isOpen = expanded === challenge.id;
            const analytics = isOpen
              ? computeChallengeAnalytics(challenge, entries[challenge.id], votes[challenge.id])
              : null;
            const goalPct = challenge.voteGoal
              ? Math.min(100, Math.round(((challenge.totalVotes || 0) / challenge.voteGoal) * 100))
              : 0;

            return (
              <article key={challenge.id} className="bg-ink-900 border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    {challenge.coverImage && (
                      <img
                        src={challenge.coverImage}
                        alt=""
                        loading="lazy"
                        className="hidden sm:block w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-white/10"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusStyle.color}`}>{statusStyle.label}</span>
                        <span className={`text-xs font-medium ${typeStyle.color}`}>{typeStyle.label}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 flex items-center gap-1">
                          <MediaIcon className="w-3 h-3" />
                          {mediaStyle.label}
                        </span>
                        {challenge.sponsor && (challenge.sponsorId ? (
                          <Link
                            to={`/marcas/${challenge.sponsorId}`}
                            className="text-xs px-2 py-1 rounded-full bg-accent-500/10 text-accent-300 hover:bg-accent-500/20 truncate max-w-full inline-flex items-center gap-1"
                          >
                            {challenge.sponsorLogo && <img src={challenge.sponsorLogo} alt="" className="w-4 h-4 rounded object-contain bg-white" />}
                            {challenge.sponsor} · relatório
                          </Link>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 truncate max-w-full">📢 {challenge.sponsor}</span>
                        ))}
                      </div>

                      <h2 className="text-white font-semibold text-base sm:text-lg mb-1 break-words">{challenge.title}</h2>
                      <p className="text-gray-500 text-sm line-clamp-2 sm:line-clamp-1 mb-3">{challenge.description}</p>

                      <div className="flex items-center gap-x-5 gap-y-2 text-sm text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-yellow-500" />{challenge.prize}</span>
                        <span className="flex items-center gap-1.5" title="Participantes"><Users className="w-3.5 h-3.5" />{challenge.totalParticipants || 0}</span>
                        <span className="flex items-center gap-1.5" title="Votos"><Vote className="w-3.5 h-3.5" />{challenge.totalVotes || 0}</span>
                        {remaining && (
                          <span className="flex items-center gap-1.5 text-brand-400"><Clock className="w-3.5 h-3.5" />{remaining}</span>
                        )}
                      </div>

                      {challenge.voteGoal && (
                        <div className="mt-3 max-w-xs">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span className="flex items-center gap-1"><Target className="w-3 h-3 text-brand-400" />Meta: {challenge.voteGoal} votos</span>
                            <span>{goalPct}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${goalPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 border-t border-white/5 pt-3 md:border-0 md:pt-0">
                    <IconButton
                      label="Ver análise"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : challenge.id)}
                      className={isOpen ? 'bg-brand-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </IconButton>
                    <IconButton label="Editar" onClick={() => setEditing(challenge)} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                      <Edit2 className="w-4 h-4" />
                    </IconButton>
                    {challenge.status === 'active' ? (
                      <IconButton label="Encerrar" onClick={() => askEnd(challenge)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400">
                        <XCircle className="w-4 h-4" />
                      </IconButton>
                    ) : !challenge.processedAt && (
                      <IconButton label="Reactivar (+7 dias)" onClick={() => handleReactivate(challenge)} className="bg-green-500/10 hover:bg-green-500/20 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </IconButton>
                    )}
                    <IconButton label="Apagar" onClick={() => askDelete(challenge)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-auto md:ml-0">
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>

                {analytics && (
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[
                        ['Participantes', analytics.totalParticipants],
                        ['Votos reais', analytics.totalVotesReal],
                        ['Votos / participante', `${analytics.conversionRate}%`],
                        ['Votos nas últimas 24h', analytics.votesLast24h, true],
                      ].map(([label, value, zap]) => (
                        <div key={label} className="bg-white/5 rounded-xl p-3">
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            {zap && <Zap className="w-3 h-3 text-yellow-400" />}{label}
                          </p>
                          <p className="text-white text-lg font-bold">{value}</p>
                        </div>
                      ))}
                    </div>

                    {(challenge.totalVotes || 0) !== analytics.totalVotesReal && (
                      <div className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                        ⚠️ O contador &quot;totalVotes&quot; ({challenge.totalVotes || 0}) está dessincronizado do número real de votos ({analytics.totalVotesReal}).
                      </div>
                    )}

                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Ranking de entradas</p>
                    {analytics.leaderboard.length === 0 ? (
                      <p className="text-gray-600 text-sm">Ainda sem entradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.leaderboard.map((entry, i) => (
                          <div key={entry.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                            <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{i + 1}</span>
                            <span className="flex-1 text-sm text-gray-300 truncate">{entry.caption || entry.id}</span>
                            <span className="text-xs text-brand-400 font-medium flex items-center gap-1"><Vote className="w-3 h-3" /> {entry.votes || 0}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && <EditModal challenge={editing} onClose={() => setEditing(null)} />}
      {dialog && <ConfirmDialog {...dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function EditModal({ challenge, onClose }) {
  const [title, setTitle] = useState(challenge.title || '');
  const [description, setDescription] = useState(challenge.description || '');
  const [prize, setPrize] = useState(challenge.prize || '');
  const [saving, setSaving] = useState(false);
  const valid = title.trim() && description.trim() && prize.trim();

  const handleSave = async () => {
    setSaving(true);
    const ok = await runAction(
      () => updateChallenge(challenge.id, { title: title.trim(), description: description.trim(), prize: prize.trim() }),
      { success: 'Desafio actualizado' },
    );
    setSaving(false);
    if (ok) onClose();
  };

  const inputClass = 'w-full bg-ink-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500';

  return (
    <Modal
      title="Editar desafio"
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose}>Cancelar</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'A guardar...' : 'Guardar'}
          </ModalButton>
        </>
      )}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Título</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Descrição</span>
          <textarea className={`${inputClass} min-h-[100px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Prémio</span>
          <input className={inputClass} value={prize} onChange={(e) => setPrize(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
