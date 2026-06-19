import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import {
  AlertTriangle, CheckCircle2, XCircle, Trash2,
  User, Flag, Clock, Image as ImageIcon,
  Video, Music, File, Play, Pause,
} from 'lucide-react';
import { db } from '../fb';

const REASON_LABELS = {
  conteudo_inapropriado: 'Conteúdo inapropriado',
  spam: 'Spam',
  fora_do_tema: 'Fora do tema',
};

// Tipo do conteúdo
type MediaType = 'image' | 'video' | 'audio' | 'unknown';

function ModerationPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [playingMedia, setPlayingMedia] = useState(null);

  useEffect(() => {
    const reportsRef = ref(db, 'reports');
    const unsub = onValue(reportsRef, snapshot => {
      if (!snapshot.exists()) {
        setReports([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const list = Object.entries(data).map(([id, r]) => ({ id, ...r }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReports(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDismiss = async (reportId) => {
    await update(ref(db, `reports/${reportId}`), {
      status: 'dismissed',
      resolvedAt: Date.now(),
    });
  };

  const handleRemoveContent = async (report) => {
    // Remove a entrada denunciada
    await remove(ref(db, `entries/${report.challengeId}/${report.entryId}`));
    // Marca o report como resolvido
    await update(ref(db, `reports/${report.id}`), {
      status: 'removed',
      resolvedAt: Date.now(),
    });
    setConfirmRemove(null);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-MZ', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  // Determina o tipo de mídia baseado na URL
  const getMediaType = (url: string): MediaType => {
    if (!url) return 'unknown';
    const ext = url.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'webm'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
    
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (imageExts.includes(ext)) return 'image';
    
    // Verifica se contém palavra-chave no URL
    if (url.includes('video') || url.includes('mp4') || url.includes('mov')) return 'video';
    if (url.includes('audio') || url.includes('mp3') || url.includes('wav')) return 'audio';
    
    return 'unknown';
  };

  // Renderiza o ícone correto para o tipo de mídia
  const renderMediaIcon = (mediaType: MediaType) => {
    switch(mediaType) {
      case 'video':
        return <Video className="w-6 h-6 text-purple-400" />;
      case 'audio':
        return <Music className="w-6 h-6 text-green-400" />;
      case 'image':
        return <ImageIcon className="w-6 h-6 text-blue-400" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  // Renderiza o player de mídia
  const renderMediaPlayer = (url: string, mediaType: MediaType) => {
    if (!url) return null;

    switch(mediaType) {
      case 'video':
        return (
          <video
            src={url}
            controls
            className="w-full h-full object-cover rounded-xl"
            poster={url.replace(/\.[^/.]+$/, '') + '-thumbnail.jpg'} // Se houver thumbnail
          >
            Seu navegador não suporta vídeos.
          </video>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-800/50 rounded-xl p-3">
            <Music className="w-8 h-8 text-green-400 mb-2" />
            <audio
              src={url}
              controls
              className="w-full max-w-[180px]"
            />
          </div>
        );
      case 'image':
        return (
          <img
            src={url}
            alt="Conteúdo denunciado"
            className="w-full h-full object-cover rounded-xl"
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-800/50 rounded-xl">
            <File className="w-8 h-8 text-gray-500" />
            <span className="text-xs text-gray-500 mt-1">Arquivo</span>
          </div>
        );
    }
  };

  // Miniatura para lista (clique para expandir)
  const renderThumbnail = (url: string, mediaType: MediaType, reportId: string) => {
    const isPlaying = playingMedia === reportId;
    
    if (mediaType === 'video') {
      return (
        <div 
          className="relative w-full h-full bg-slate-800 flex items-center justify-center cursor-pointer"
          onClick={() => setPlayingMedia(isPlaying ? null : reportId)}
        >
          {isPlaying ? (
            <video
              src={url}
              autoPlay
              className="w-full h-full object-cover rounded-xl"
              onEnded={() => setPlayingMedia(null)}
            />
          ) : (
            <>
              <Video className="w-6 h-6 text-purple-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white ml-1" />
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    if (mediaType === 'audio') {
      return (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <Music className="w-6 h-6 text-green-400" />
        </div>
      );
    }

    // Para imagens, mostra a imagem
    if (mediaType === 'image') {
      return (
        <img
          src={url}
          alt="Conteúdo denunciado"
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }

    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <File className="w-6 h-6 text-gray-500" />
      </div>
    );
  };

  const filtered = reports.filter(r =>
    filterStatus === 'all' || r.status === filterStatus
  );

  const pendingCount = reports.filter(r => r.status === 'pending').length;

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
            <Flag className="w-6 h-6 text-red-400" />
            Moderação
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingCount} denúncias pendentes de {reports.length} no total
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: 'pending', label: `Pendentes (${pendingCount})` },
          { value: 'removed', label: 'Removidos' },
          { value: 'dismissed', label: 'Ignorados' },
          { value: 'all', label: 'Todos' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === opt.value
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista de denúncias */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhuma denúncia {filterStatus === 'pending' ? 'pendente' : 'encontrada'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const mediaType = getMediaType(report.mediaUrl);
            
            return (
              <div
                key={report.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-5"
              >
                <div className="flex gap-4">

                  {/* Thumbnail com preview */}
                  <div className="w-24 h-24 rounded-xl bg-slate-800 flex-shrink-0 overflow-hidden">
                    {report.mediaUrl ? (
                      renderThumbnail(report.mediaUrl, mediaType, report.id)
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {renderMediaIcon(mediaType)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                        {REASON_LABELS[report.reason] || report.reason}
                      </span>
                      {/* Badge do tipo de mídia */}
                      {mediaType !== 'unknown' && (
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          mediaType === 'video' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                          mediaType === 'audio' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {mediaType === 'video' ? '🎬 Vídeo' :
                           mediaType === 'audio' ? '🎵 Áudio' :
                           '🖼️ Imagem'}
                        </span>
                      )}
                      {report.status === 'removed' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">
                          Removido
                        </span>
                      )}
                      {report.status === 'dismissed' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">
                          Ignorado
                        </span>
                      )}
                    </div>

                    <p className="text-white text-sm font-medium mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      {report.reportedUserName}
                    </p>

                    {report.caption && (
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        "{report.caption}"
                      </p>
                    )}

                    <p className="text-gray-500 text-xs flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Denunciado em {formatDate(report.createdAt)}
                    </p>
                  </div>

                  {/* Acções */}
                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDismiss(report.id)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Ignorar
                      </button>
                      <button
                        onClick={() => setConfirmRemove(report)}
                        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                {/* Player expandido para vídeo/áudio */}
                {report.mediaUrl && mediaType !== 'image' && playingMedia === report.id && (
                  <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
                    {renderMediaPlayer(report.mediaUrl, mediaType)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmar remoção */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-bold text-lg">Remover conteúdo?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Esta entrada de {confirmRemove.reportedUserName} será removida permanentemente do desafio.
              {getMediaType(confirmRemove.mediaUrl) === 'video' && ' O vídeo será excluído.'}
              {getMediaType(confirmRemove.mediaUrl) === 'audio' && ' O áudio será excluído.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveContent(confirmRemove)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModerationPanel;