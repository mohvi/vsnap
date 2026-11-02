import { useEffect, useMemo, useRef, useState } from 'react';
import { ref as dbRef, push, update, increment } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  FlaskConical, Upload, X, CheckCircle2, AlertCircle,
  Loader2, Video, RefreshCw, Trash2, ChevronDown,
} from 'lucide-react';
import { db, storage } from '../fb';
import { useAdminData } from '../data/AdminDataProvider';
import { toList } from '../data/metrics';
import { errorMessage } from '../utils/runAction';
import PROVINCES from '../utils/provinces';

// ── Bancos de dados para gerar utilizadores fake realistas (Moçambique) ──
const NOMES = [
  'Ana Machava', 'Carlos Tembe', 'Fátima Nhantumbo', 'João Macuácua',
  'Lucia Sitoi', 'Manuel Cossa', 'Rosa Chaúque', 'Pedro Muianga',
  'Inês Bila', 'Tomás Mazive', 'Celeste Nguenha', 'Augusto Duvane',
  'Sónia Mulungo', 'Hélder Timana', 'Graça Matsinha', 'Rui Pondja',
  'Beatriz Zunguze', 'Felício Chiconela', 'Mariana Manhiça', 'Osvaldo Nhamule',
];

const USERNAMES = [
  'ana_moz', 'carlos_t', 'fatima_nhant', 'joao_mac', 'lu_sitoi',
  'manu_cossa', 'rosa_ch', 'pedro_mu', 'ines_bila', 'tomas_mz',
  'celes_ng', 'augus_d', 'sonia_ml', 'helder_tim', 'graca_mat',
  'rui_pondja', 'bea_zunguze', 'felicio_ch', 'mari_mnh', 'osvaldo_nh',
];

const BIOS = [
  'Adoro desafios! 🔥', 'Sempre a participar 💪', 'Vote em mim! 🎯',
  'Pemba represent 🌊', 'Maputo city 🏙️', 'Beira gang ⚡',
  'Nampula sempre 🌟', 'MZ 🇲🇿', 'Gamer & criativo', 'Fotografia é vida 📸',
];

const CAPTIONS = [
  '🔥 Vai ser difícil ganhar contra mim!', '💪 Dá uma força e vota aqui!',
  '🎯 A minha melhor entrada', '✨ Vote aqui se achas que mereço!',
  '🚀 Vamos lá!', '👀 Olha o que fiz!', '🏆 Quero ganhar!',
  '😎 Aqui está a minha participação', '🙏 Preciso dos vossos votos!',
  '🎬 O que achais?',
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid8 = () => Math.random().toString(36).slice(2, 10);

// Mesmos códigos de província que a app usa (src/utils/provinces.js);
// a cidade é sempre uma das cidades dessa província.
const generateFakeUser = (index) => {
  const province = randomFrom(PROVINCES);
  return {
    _uid: `fake_${uid8()}`, // só usado internamente — o uid é a chave do nó, não um campo
    name: NOMES[index % NOMES.length],
    username: `${USERNAMES[index % USERNAMES.length]}_${uid8().slice(0, 3)}`,
    bio: randomFrom(BIOS),
    province: province.code,
    city: randomFrom(province.cities),
    phone: `+2588${Math.floor(10000000 + Math.random() * 89999999)}`,
    snaps: Math.floor(Math.random() * 50),
    wins: 0,
    loginCount: Math.floor(1 + Math.random() * 10),
    lastLogin: Date.now(),
    verified: true,
    isOver13: true,
    profileComplete: true,
    isFake: true, // para identificar e limpar depois
    createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now(),
  };
};

const ITEM_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  DONE: 'done',
  ERROR: 'error',
};

const MEDIA_LABELS = { photo: 'Só fotos', video: 'Só vídeos', both: 'Foto ou vídeo' };

export default function MockDataPanel() {
  const { challenges: challengesById } = useAdminData();
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [items, setItems] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [publishTotal, setPublishTotal] = useState(0);
  const fileInputRef = useRef(null);

  const challenges = useMemo(
    () => toList(challengesById)
      .filter((c) => c.status === 'active')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [challengesById],
  );

  // Selecciona o primeiro desafio activo por omissão (ou se o actual deixar de estar activo).
  useEffect(() => {
    if (challenges.length && !challenges.some((c) => c.id === selectedChallenge)) {
      setSelectedChallenge(challenges[0].id);
    }
  }, [challenges, selectedChallenge]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return;
    setItems((prev) => [
      ...prev,
      ...files.map((file, i) => ({
        id: uid8(),
        file,
        preview: URL.createObjectURL(file),
        mediaType: file.type.startsWith('video/') ? 'video' : 'photo',
        fakeUser: generateFakeUser(prev.length + i),
        caption: randomFrom(CAPTIONS),
        status: ITEM_STATUS.IDLE,
        progress: 0,
        error: null,
      })),
    ]);
  };

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id) => setItems((prev) => {
    const item = prev.find((it) => it.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    return prev.filter((it) => it.id !== id);
  });

  const clearAll = () => setItems((prev) => {
    prev.forEach((it) => URL.revokeObjectURL(it.preview));
    return [];
  });

  const regenerateUser = (id) =>
    updateItem(id, { fakeUser: generateFakeUser(Math.floor(Math.random() * NOMES.length)) });

  // Faz upload do ficheiro e depois grava utilizador fake + entrada +
  // contador do desafio numa única escrita multi-path (atómica).
  const publishItem = async (item) => {
    updateItem(item.id, { status: ITEM_STATUS.UPLOADING, progress: 0, error: null });
    try {
      const { _uid, ...userPayload } = item.fakeUser;

      // Mesmo path das submissões reais: entries/{challengeId}/{userId}/{timestamp}.ext
      const ext = item.mediaType === 'photo' ? 'jpg' : 'mp4';
      const uploadTask = uploadBytesResumable(
        storageRef(storage, `entries/${selectedChallenge}/${_uid}/${Date.now()}.${ext}`),
        item.file,
        { contentType: item.file.type },
      );
      const mediaUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => updateItem(item.id, { progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) }),
          reject,
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)),
        );
      });

      const entryId = push(dbRef(db, `entries/${selectedChallenge}`)).key;
      const now = Date.now();
      await update(dbRef(db), {
        [`users/${_uid}`]: userPayload,
        [`entries/${selectedChallenge}/${entryId}`]: {
          userId: _uid,
          mediaUrl,
          mediaType: item.mediaType,
          caption: item.caption,
          votes: 0,
          createdAt: now,
          updatedAt: now,
        },
        [`challenges/${selectedChallenge}/totalParticipants`]: increment(1),
      });

      updateItem(item.id, { status: ITEM_STATUS.DONE, progress: 100 });
      return true;
    } catch (err) {
      console.error(err);
      updateItem(item.id, { status: ITEM_STATUS.ERROR, error: errorMessage(err) });
      return false;
    }
  };

  const handlePublishAll = async () => {
    const pending = items.filter((it) => it.status === ITEM_STATUS.IDLE || it.status === ITEM_STATUS.ERROR);
    if (!selectedChallenge || pending.length === 0) return;

    setPublishing(true);
    setDoneCount(0);
    setPublishTotal(pending.length);
    await Promise.all(pending.map((item) =>
      publishItem(item).then((ok) => { if (ok) setDoneCount((n) => n + 1); })));
    setPublishing(false);
  };

  const pendingCount = items.filter((it) => it.status === ITEM_STATUS.IDLE || it.status === ITEM_STATUS.ERROR).length;
  const doneItems = items.filter((it) => it.status === ITEM_STATUS.DONE);
  const selectedChallengeObj = challenges.find((c) => c.id === selectedChallenge);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <FlaskConical className="w-7 h-7 text-brand-400" />
        <h1 className="text-xl sm:text-2xl font-bold text-white">Mock Data</h1>
        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
          Apenas para testes / demo
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Cria posts com utilizadores fake para popular um desafio. Os utilizadores criados aqui têm{' '}
        <code className="text-brand-400 text-xs bg-white/5 px-1 rounded">isFake: true</code> para fácil limpeza
        (filtro &quot;Fake&quot; em Utilizadores).
      </p>

      <div className="bg-ink-900 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
        <label htmlFor="mock-challenge" className="text-sm text-gray-400 mb-2 block">Desafio activo a popular</label>
        <div className="relative">
          <select
            id="mock-challenge"
            className="w-full bg-ink-800 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white text-sm outline-none appearance-none focus:border-brand-500"
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
          >
            {challenges.length === 0 && <option value="">Sem desafios activos</option>}
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.totalParticipants || 0} participantes)</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {selectedChallengeObj && (
          <div className="mt-3 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500">
            <span>🏆 {selectedChallengeObj.prize}</span>
            <span>👥 {selectedChallengeObj.totalParticipants || 0} participantes</span>
            <span>🗳️ {selectedChallengeObj.totalVotes || 0} votos</span>
            {selectedChallengeObj.allowedMediaType && <span>📁 {MEDIA_LABELS[selectedChallengeObj.allowedMediaType]}</span>}
          </div>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        className="border-2 border-dashed border-white/10 rounded-2xl p-6 sm:p-8 text-center mb-6 cursor-pointer hover:border-brand-500/50 focus:border-brand-500/50 outline-none transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-white font-medium">Arrasta ficheiros ou toca para seleccionar</p>
        <p className="text-gray-500 text-sm mt-1">Imagens e vídeos — múltiplos ficheiros suportados</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">
              {items.length} post{items.length !== 1 ? 's' : ''} preparado{items.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={clearAll}
              disabled={publishing}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" /> Limpar tudo
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item) => {
              const locked = item.status === ITEM_STATUS.UPLOADING || item.status === ITEM_STATUS.DONE;
              return (
                <div
                  key={item.id}
                  className={`bg-ink-900 border rounded-2xl p-3 sm:p-4 transition-colors ${
                    item.status === ITEM_STATUS.DONE ? 'border-green-500/30'
                      : item.status === ITEM_STATUS.ERROR ? 'border-red-500/30'
                        : item.status === ITEM_STATUS.UPLOADING ? 'border-brand-500/30'
                          : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black">
                      {item.mediaType === 'photo' ? (
                        <img src={item.preview} alt={item.caption || 'Pré-visualização'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-ink-800">
                          <Video className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {item.fakeUser.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm font-medium truncate">{item.fakeUser.name}</span>
                        <span className="text-gray-500 text-xs truncate">@{item.fakeUser.username}</span>
                        <span className="text-gray-600 text-xs">· {item.fakeUser.city}</span>
                        <button
                          onClick={() => regenerateUser(item.id)}
                          title="Gerar outro utilizador"
                          aria-label="Gerar outro utilizador"
                          disabled={locked}
                          className="ml-auto p-1 text-gray-500 hover:text-brand-400 transition-colors disabled:opacity-30"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        aria-label="Legenda"
                        className="w-full bg-ink-800 border border-white/5 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-500 disabled:opacity-50"
                        value={item.caption}
                        onChange={(e) => updateItem(item.id, { caption: e.target.value })}
                        disabled={locked}
                        placeholder="Legenda..."
                      />

                      {item.status === ITEM_STATUS.UPLOADING && (
                        <div className="space-y-1">
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${item.progress}%` }} />
                          </div>
                          <p className="text-brand-400 text-xs">{item.progress}% enviado...</p>
                        </div>
                      )}
                      {item.status === ITEM_STATUS.DONE && (
                        <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Publicado com sucesso</p>
                      )}
                      {item.status === ITEM_STATUS.ERROR && (
                        <p className="text-red-400 text-xs flex items-start gap-1 break-words"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> Erro: {item.error}</p>
                      )}
                    </div>

                    {!locked && (
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label="Remover ficheiro"
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === ITEM_STATUS.UPLOADING && <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />}
                    {item.status === ITEM_STATUS.DONE && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {pendingCount > 0 && (
            <button
              onClick={handlePublishAll}
              disabled={publishing || !selectedChallenge}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A publicar... ({doneCount}/{publishTotal})
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publicar {pendingCount} post{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}

          {doneItems.length > 0 && pendingCount === 0 && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-semibold">Todos os posts foram publicados!</p>
              <p className="text-gray-500 text-sm mt-1">
                {doneItems.length} entradas criadas em &quot;{selectedChallengeObj?.title}&quot;
              </p>
              <button
                onClick={clearAll}
                className="mt-4 px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                Limpar e começar de novo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
