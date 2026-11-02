import { useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, Trash2, User, Flag, Clock, Image as ImageIcon,
  Video, Music, File, Play,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { dismissReport, removeReportedEntry } from '../data/actions';
import { toList } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { formatDateTime } from '../utils/format';
import { getMediaType } from '../utils/media';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import ConfirmDialog from './ui/ConfirmDialog';

const REASON_LABELS = {
  conteudo_inapropriado: 'Conteúdo inapropriado',
  spam: 'Spam',
  fora_do_tema: 'Fora do tema',
};

const MEDIA_BADGES = {
  video: { label: '🎬 Vídeo', className: 'bg-brand-500/10 text-brand-400 border-brand-500/30' },
  audio: { label: '🎵 Áudio', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  image: { label: '🖼️ Imagem', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

const MEDIA_ICONS = {
  video: <Video className="w-6 h-6 text-brand-400" />,
  audio: <Music className="w-6 h-6 text-green-400" />,
  image: <ImageIcon className="w-6 h-6 text-blue-400" />,
  unknown: <File className="w-6 h-6 text-gray-500" />,
};

function Thumbnail({ url, mediaType, onPlay }) {
  if (!url) return <div className="w-full h-full flex items-center justify-center">{MEDIA_ICONS[mediaType]}</div>;
  if (mediaType === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir imagem">
        <img src={url} alt="Conteúdo denunciado" loading="lazy" className="w-full h-full object-cover" />
      </a>
    );
  }
  if (mediaType === 'video' || mediaType === 'audio') {
    return (
      <button onClick={onPlay} aria-label="Reproduzir" className="relative w-full h-full bg-ink-800 flex items-center justify-center">
        {MEDIA_ICONS[mediaType]}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-brand-500/30 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </span>
        </span>
      </button>
    );
  }
  return <div className="w-full h-full flex items-center justify-center">{MEDIA_ICONS.unknown}</div>;
}

export default function ModerationPanel() {
  const { loading, reports, entries, votes } = useAdminData();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [playing, setPlaying] = useState(null);

  const list = useMemo(
    () => toList(reports).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [reports],
  );

  if (loading) return <PageLoader />;

  const filtered = list.filter((r) => filterStatus === 'all' || r.status === filterStatus);
  const pendingCount = list.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <PageHeader
        icon={Flag}
        iconClass="text-red-400"
        title="Moderação"
        subtitle={`${pendingCount} denúncias pendentes de ${list.length} no total`}
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist">
        {[
          { value: 'pending', label: `Pendentes (${pendingCount})` },
          { value: 'removed', label: 'Removidos' },
          { value: 'dismissed', label: 'Ignorados' },
          { value: 'all', label: 'Todos' },
        ].map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={filterStatus === opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filterStatus === opt.value ? 'bg-brand-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhuma denúncia {filterStatus === 'pending' ? 'pendente' : 'encontrada'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const entry = entries[report.challengeId]?.[report.entryId];
            const mediaUrl = entry?.mediaUrl || report.mediaUrl;
            const mediaType = getMediaType(mediaUrl, entry?.mediaType || report.mediaType);
            const badge = MEDIA_BADGES[mediaType];
            const isPlaying = playing === report.id;

            return (
              <article key={report.id} className="bg-ink-900 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-ink-800 flex-shrink-0 overflow-hidden">
                      <Thumbnail url={mediaUrl} mediaType={mediaType} onPlay={() => setPlaying(isPlaying ? null : report.id)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                        {badge && <span className={`text-xs px-2 py-1 rounded-full border ${badge.className}`}>{badge.label}</span>}
                        {report.status === 'removed' && <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Removido</span>}
                        {report.status === 'dismissed' && <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Ignorado</span>}
                        {report.status === 'pending' && !entry && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Entrada já não existe</span>
                        )}
                      </div>

                      <p className="text-white text-sm font-medium mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{report.reportedUserName || 'Utilizador'}</span>
                      </p>

                      {report.caption && <p className="text-gray-400 text-sm mb-2 line-clamp-2 break-words">&quot;{report.caption}&quot;</p>}

                      <p className="text-gray-500 text-xs flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Denunciado em {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="grid grid-cols-2 sm:flex sm:flex-col lg:flex-row sm:items-stretch lg:items-start gap-2 flex-shrink-0">
                      <button
                        onClick={() => runAction(() => dismissReport(report.id), { success: 'Denúncia ignorada' })}
                        className="px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Ignorar
                      </button>
                      <button
                        onClick={() => setConfirmRemove(report)}
                        className="px-3 py-2.5 sm:py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                {isPlaying && mediaUrl && (
                  <div className="mt-4 p-3 bg-ink-800/50 rounded-xl">
                    {mediaType === 'video' ? (
                      <video src={mediaUrl} controls autoPlay playsInline className="w-full max-h-[60vh] rounded-xl bg-black" onEnded={() => setPlaying(null)} />
                    ) : (
                      <audio src={mediaUrl} controls autoPlay className="w-full" onEnded={() => setPlaying(null)} />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remover conteúdo?"
          message={(
            <>
              A entrada de <strong className="text-white">{confirmRemove.reportedUserName || 'este utilizador'}</strong> será
              removida permanentemente do desafio, juntamente com o ficheiro e os votos que recebeu.
            </>
          )}
          confirmLabel="Remover"
          onConfirm={() => runAction(
            () => removeReportedEntry(confirmRemove, { entries, votes, reports }),
            { success: 'Conteúdo removido' },
          )}
          onClose={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
