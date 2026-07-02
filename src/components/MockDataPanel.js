import React, { useEffect, useRef, useState } from 'react';
import { ref as dbRef, onValue, push, set, update } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import {
  FlaskConical, Upload, X, CheckCircle2, AlertCircle,
  Loader2, Users, Image as ImageIcon, Video, RefreshCw,
  Trash2, ChevronDown, UserPlus,
} from 'lucide-react';

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

// Províncias com os mesmos códigos usados no schema real (users.province = "CD", etc.)
// Cada entrada tem o código + a cidade capital mais comum para manter coerência province/city
const PROVINCIAS = [
  { code: 'MP', city: 'Maputo' },
  { code: 'GZ', city: 'Xai-Xai' },
  { code: 'IN', city: 'Inhambane' },
  { code: 'SF', city: 'Beira' },
  { code: 'MN', city: 'Chimoio' },
  { code: 'TE', city: 'Tete' },
  { code: 'ZB', city: 'Quelimane' },
  { code: 'NP', city: 'Nampula' },
  { code: 'CD', city: 'Pemba' },
  { code: 'NS', city: 'Lichinga' },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid8 = () => Math.random().toString(36).slice(2, 10);

const generateFakeUser = (index) => {
  const nome = NOMES[index % NOMES.length];
  const username = USERNAMES[index % USERNAMES.length] + '_' + uid8().slice(0, 3);
  // province e city derivados do mesmo objecto — garante coerência entre os dois campos
  const prov = randomFrom(PROVINCIAS);
  const fakeUid = 'fake_' + uid8();

  // O objecto gravado em users/{uid} NÃO inclui o campo uid —
  // no schema real o uid é a chave do nó, não um campo dentro do objecto
  // (confirmar: nenhum dos utilizadores reais tem campo "uid" no seu objecto)
  return {
    _uid: fakeUid,                // só usado internamente no componente, NÃO gravado no Firebase
    name: nome,
    username,
    bio: randomFrom(BIOS),
    province: prov.code,          // "CD", "MP", etc. — igual ao schema real
    city: prov.city,              // cidade coerente com a província
    phone: '+2588' + Math.floor(10000000 + Math.random() * 89999999),
    snaps: Math.floor(Math.random() * 50),
    wins: 0,
    loginCount: Math.floor(1 + Math.random() * 10),
    lastLogin: Date.now(),
    verified: true,
    isOver13: true,
    profileComplete: true,
    isFake: true,                 // flag para identificar e limpar depois se necessário
    createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now(),
  };
};

// Estado por ficheiro individual
const ITEM_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  DONE: 'done',
  ERROR: 'error',
};

export default function MockDataPanel() {
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [items, setItems] = useState([]); // [{ file, preview, mediaType, fakeUser, caption, status, progress, error }]
  const [publishing, setPublishing] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(dbRef(db, 'challenges'), snap => {
      if (!snap.exists()) return;
      const list = Object.entries(snap.val())
        .map(([id, c]) => ({ id, ...c }))
        .filter(c => c.status === 'active')
        .sort((a, b) => b.createdAt - a.createdAt);
      setChallenges(list);
      if (list.length > 0 && !selectedChallenge) setSelectedChallenge(list[0].id);
    });
    return () => unsub();
  }, []);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, i) => {
      const isVideo = file.type.startsWith('video/');
      return {
        id: uid8(),
        file,
        preview: URL.createObjectURL(file),
        mediaType: isVideo ? 'video' : 'photo',
        fakeUser: generateFakeUser(items.length + i),
        caption: randomFrom(CAPTIONS),
        status: ITEM_STATUS.IDLE,
        progress: 0,
        error: null,
      };
    });

    setItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const updateItem = (id, patch) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const removeItem = (id) =>
    setItems(prev => prev.filter(it => it.id !== id));

  const regenerateUser = (id) =>
    updateItem(id, { fakeUser: generateFakeUser(Math.floor(Math.random() * 20)) });

  // Faz upload de um ficheiro para Firebase Storage e escreve
  // o utilizador fake + a entrada no Realtime Database.
  const publishItem = (item) => {
    return new Promise(async (resolve) => {
      updateItem(item.id, { status: ITEM_STATUS.UPLOADING, progress: 0 });
      try {
        // 1. Gravar o utilizador fake em users/{_uid}
        // O objecto gravado não inclui _uid (campo interno do componente) —
        // espelha exactamente o schema real onde o uid é só a chave do nó
        const { _uid, ...userPayload } = item.fakeUser;
        await set(dbRef(db, `users/${_uid}`), userPayload);

        // 2. Upload do ficheiro para Storage
        // Path igual ao usado em submissões reais: entries/{challengeId}/{userId}/{timestamp}.ext
        const ext = item.mediaType === 'photo' ? 'jpg' : 'mp4';
        const path = `entries/${selectedChallenge}/${_uid}/${Date.now()}.${ext}`;
        const sRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(sRef, item.file, {
          contentType: item.file.type,
        });

        const mediaUrl = await new Promise((res, rej) => {
          uploadTask.on(
            'state_changed',
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              updateItem(item.id, { progress: pct });
            },
            rej,
            async () => res(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });

        // 3. Criar a entrada em entries/{challengeId}
        // Campos exactamente iguais ao schema real: userId, mediaUrl, mediaType,
        // caption, votes, createdAt, updatedAt (sem campos extra)
        const { _uid: entryUid } = item.fakeUser;
        const entryRef = push(dbRef(db, `entries/${selectedChallenge}`));
        await set(entryRef, {
          userId: entryUid,
          mediaUrl,
          mediaType: item.mediaType,
          caption: item.caption,
          votes: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 4. Incrementar totalParticipants no desafio
        const chalSnap = await new Promise(r => {
          const ref2 = dbRef(db, `challenges/${selectedChallenge}`);
          onValue(ref2, s => r(s.val()), { onlyOnce: true });
        });
        await update(dbRef(db, `challenges/${selectedChallenge}`), {
          totalParticipants: (chalSnap?.totalParticipants || 0) + 1,
        });

        updateItem(item.id, { status: ITEM_STATUS.DONE, progress: 100 });
        resolve(true);
      } catch (err) {
        console.error(err);
        updateItem(item.id, { status: ITEM_STATUS.ERROR, error: err.message });
        resolve(false);
      }
    });
  };

  // Publica todos em paralelo (Firebase suporta múltiplas escritas simultâneas)
  const handlePublishAll = async () => {
    if (!selectedChallenge || items.length === 0) return;
    const pending = items.filter(it => it.status === ITEM_STATUS.IDLE || it.status === ITEM_STATUS.ERROR);
    if (pending.length === 0) return;

    setPublishing(true);
    setDoneCount(0);

    const results = await Promise.all(pending.map(item =>
      publishItem(item).then(ok => { if (ok) setDoneCount(p => p + 1); return ok; })
    ));

    setPublishing(false);
  };

  const pendingCount = items.filter(it => it.status === ITEM_STATUS.IDLE || it.status === ITEM_STATUS.ERROR).length;
  const doneItems = items.filter(it => it.status === ITEM_STATUS.DONE);
  const selectedChallengeObj = challenges.find(c => c.id === selectedChallenge);

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <FlaskConical className="w-7 h-7 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Mock Data</h1>
        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
          Apenas para testes / demo
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Cria posts com utilizadores fake para popular um desafio com dados realistas.
        Todos os utilizadores criados aqui têm <code className="text-purple-400 text-xs bg-white/5 px-1 rounded">isFake: true</code> no Firebase para fácil limpeza.
      </p>

      {/* Seletor de desafio */}
      <div className="bg-[#14141F] border border-white/10 rounded-2xl p-5 mb-6">
        <label className="text-sm text-gray-400 mb-2 block">Desafio activo a popular</label>
        <div className="relative">
          <select
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none appearance-none focus:border-purple-500"
            value={selectedChallenge}
            onChange={e => setSelectedChallenge(e.target.value)}
          >
            {challenges.length === 0 && <option value="">Sem desafios activos</option>}
            {challenges.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.totalParticipants || 0} participantes)
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {selectedChallengeObj && (
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>🏆 {selectedChallengeObj.prize}</span>
            <span>👥 {selectedChallengeObj.totalParticipants || 0} participantes</span>
            <span>🗳️ {selectedChallengeObj.totalVotes || 0} votos</span>
            {selectedChallengeObj.allowedMediaType && (
              <span>📁 {selectedChallengeObj.allowedMediaType === 'photo' ? 'Só fotos' : selectedChallengeObj.allowedMediaType === 'video' ? 'Só vídeos' : 'Foto ou vídeo'}</span>
            )}
          </div>
        )}
      </div>

      {/* Zona de upload */}
      <div
        className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center mb-6 cursor-pointer hover:border-purple-500/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          const fakeEvent = { target: { files, value: '' } };
          handleFilesSelected(fakeEvent);
        }}
      >
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-white font-medium">Arrasta ficheiros ou clica para seleccionar</p>
        <p className="text-gray-500 text-sm mt-1">Imagens e vídeos — múltiplos ficheiros suportados</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {/* Lista de items */}
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">{items.length} post{items.length !== 1 ? 's' : ''} preparado{items.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setItems([])}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Limpar tudo
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-[#14141F] border rounded-2xl p-4 transition-all ${
                  item.status === ITEM_STATUS.DONE ? 'border-green-500/30' :
                  item.status === ITEM_STATUS.ERROR ? 'border-red-500/30' :
                  item.status === ITEM_STATUS.UPLOADING ? 'border-purple-500/30' :
                  'border-white/10'
                }`}
              >
                <div className="flex items-start gap-4">

                  {/* Preview */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black">
                    {item.mediaType === 'photo' ? (
                      <img src={item.preview} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Video className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info editável */}
                  <div className="flex-1 min-w-0 space-y-2">

                    {/* Utilizador fake */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {item.fakeUser.name.charAt(0)}
                      </div>
                      <span className="text-white text-sm font-medium truncate">{item.fakeUser.name}</span>
                      <span className="text-gray-500 text-xs truncate">@{item.fakeUser.username}</span>
                      <span className="text-gray-600 text-xs">· {item.fakeUser.city}</span>
                      <button
                        onClick={() => regenerateUser(item.id)}
                        title="Gerar outro utilizador"
                        disabled={item.status === ITEM_STATUS.UPLOADING || item.status === ITEM_STATUS.DONE}
                        className="ml-auto text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-30"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Legenda editável */}
                    <input
                      className="w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500 disabled:opacity-50"
                      value={item.caption}
                      onChange={e => updateItem(item.id, { caption: e.target.value })}
                      disabled={item.status === ITEM_STATUS.UPLOADING || item.status === ITEM_STATUS.DONE}
                      placeholder="Legenda..."
                    />

                    {/* Barra de progresso */}
                    {item.status === ITEM_STATUS.UPLOADING && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-purple-400 text-xs">{item.progress}% enviado...</p>
                      </div>
                    )}

                    {/* Estado */}
                    {item.status === ITEM_STATUS.DONE && (
                      <p className="text-green-400 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Publicado com sucesso
                      </p>
                    )}
                    {item.status === ITEM_STATUS.ERROR && (
                      <p className="text-red-400 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Erro: {item.error}
                      </p>
                    )}
                  </div>

                  {/* Remover */}
                  {item.status !== ITEM_STATUS.UPLOADING && item.status !== ITEM_STATUS.DONE && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === ITEM_STATUS.UPLOADING && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                  )}
                  {item.status === ITEM_STATUS.DONE && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botão publicar */}
          {pendingCount > 0 && (
            <button
              onClick={handlePublishAll}
              disabled={publishing || !selectedChallenge}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A publicar em paralelo... ({doneCount}/{pendingCount})
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publicar {pendingCount} post{pendingCount !== 1 ? 's' : ''} em simultâneo
                </>
              )}
            </button>
          )}

          {doneItems.length > 0 && pendingCount === 0 && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-semibold">Todos os posts foram publicados!</p>
              <p className="text-gray-500 text-sm mt-1">
                {doneItems.length} entradas criadas no desafio "{selectedChallengeObj?.title}"
              </p>
              <button
                onClick={() => setItems([])}
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