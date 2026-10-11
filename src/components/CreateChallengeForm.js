import React, { useEffect, useState } from 'react';
import { ref as dbRef, push, set, onValue } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  PlusCircle, Image as ImageIcon, Trophy, Clock, Tag, Gift,
  DollarSign, Award, Target, Camera, Video, Upload, X,
  Building2, ChevronDown, Plus,
} from 'lucide-react';
import { db, storage } from '../fb';

const CATEGORIES = [
  { value: 'fotografia', label: '📸 Fotografia' },
  { value: 'musica', label: '🎵 Música' },
  { value: 'danca', label: '💃 Dança' },
  { value: 'culinaria', label: '🍲 Culinária' },
  { value: 'moda', label: '👗 Moda' },
  { value: 'desporto', label: '⚽ Desporto' },
  { value: 'arte', label: '🎨 Arte' },
  { value: 'humor', label: '😂 Humor' },
];

const MEDIA_TYPES = [
  { value: 'photo', label: 'Foto', icon: Camera },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'both', label: 'Ambos', icon: ImageIcon },
];

const CreateChallengeForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'fotografia',
    type: 'free',
    prize: '',
    prizeType: 'cash',
    sponsorId: '',   // ID da colecção sponsors/ — substitui o campo de texto livre
    durationDays: 7,
    entryFee: 0,
    allowedMediaType: 'photo',
    voteGoal: '',
  });

  const [sponsors, setSponsors] = useState([]);         // lista de patrocinadores do Firebase
  const [sponsorsLoading, setSponsorsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Carrega a colecção sponsors/ do Firebase quando o tipo muda para 'sponsored'.
  // Só carrega uma vez — usa o listener onValue mas cancela logo depois.
  useEffect(() => {
    if (formData.type !== 'sponsored') return;
    setSponsorsLoading(true);
    const unsub = onValue(dbRef(db, 'sponsors'), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSponsors(list);
      setSponsorsLoading(false);
    });
    return () => unsub();
  }, [formData.type]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBannerSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('O banner tem de ser uma imagem (jpg, png, webp).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem do banner não pode passar 5MB.');
      return;
    }
    setError('');
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setUploadProgress(0);
  };

  const uploadBanner = (challengeId) => {
    return new Promise((resolve, reject) => {
      if (!bannerFile) { resolve(''); return; }
      const path = `challenges/${challengeId}/banner_${Date.now()}.${bannerFile.name.split('.').pop()}`;
      const fileRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, bannerFile);
      uploadTask.on(
        'state_changed',
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (err) => reject(err),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.type === 'sponsored' && !formData.sponsorId) {
      setError('Selecciona um patrocinador para este desafio.');
      return;
    }
    if (formData.voteGoal !== '' && Number(formData.voteGoal) <= 0) {
      setError('A meta de votos, se definida, tem de ser maior que 0.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const challengesRef = dbRef(db, 'challenges');
      const newChallengeRef = push(challengesRef);
      const challengeId = newChallengeRef.key;

      const bannerUrl = await uploadBanner(challengeId);

      const startTime = Date.now();
      const endTime = startTime + (Number(formData.durationDays) * 24 * 60 * 60 * 1000);
      const hasVoteGoal = formData.voteGoal !== '';

      // Resolve o patrocinador seleccionado para guardar também o nome legível,
      // mantendo retrocompatibilidade com o campo 'sponsor' (string) que
      // o RedirectToApp e o feed já usam como fallback.
      const selectedSponsor = sponsors.find(s => s.id === formData.sponsorId);

      await set(newChallengeRef, {
        id: challengeId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        prize: formData.prizeType === 'cash'
          ? `${formData.prize} MZN`
          : formData.prize,
        prizeType: formData.prizeType,
        // ── Campos de patrocinador ──
        // sponsorId → referência à colecção sponsors/ (para logo, links, etc.)
        // sponsor   → nome em texto simples como fallback (retrocompatibilidade)
        sponsorId: formData.type === 'sponsored' ? formData.sponsorId : null,
        sponsor: formData.type === 'sponsored' ? (selectedSponsor?.name || '') : '',
        coverImage: bannerUrl,
        entryFee: Number(formData.entryFee),
        allowedMediaType: formData.allowedMediaType,
        status: 'active',
        createdBy: 'admin',
        createdAt: startTime,
        endsAt: endTime,
        voteGoal: hasVoteGoal ? Number(formData.voteGoal) : null,
        winCondition: hasVoteGoal ? 'firstToReachGoalOrDeadline' : 'mostVotesAtDeadline',
        totalVotes: 0,
        totalParticipants: 0,
      });

      setSuccess(true);
      setFormData({
        title: '', description: '', category: 'fotografia',
        type: 'free', prize: '', prizeType: 'cash',
        sponsorId: '', durationDays: 7, entryFee: 0,
        allowedMediaType: 'photo', voteGoal: '',
      });
      removeBanner();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Erro ao criar desafio: ' + err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Patrocinador actualmente seleccionado (para mostrar preview do logo)
  const selectedSponsor = sponsors.find(s => s.id === formData.sponsorId) || null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <PlusCircle className="w-8 h-8 text-purple-500" />
        <h2 className="text-2xl font-bold text-white">Novo Desafio</h2>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium">
          ✅ Desafio criado com sucesso!
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de desafio */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Tipo de desafio</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'free', label: '🆓 Gratuito', color: 'border-teal-500' },
              { value: 'paid', label: '💳 Pago', color: 'border-purple-500' },
              { value: 'sponsored', label: '🏢 Patrocinado', color: 'border-pink-500' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('type', opt.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.type === opt.value
                    ? `${opt.color} bg-white/5 text-white`
                    : 'border-white/10 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de patrocinador — só se sponsored */}
        {formData.type === 'sponsored' && (
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Patrocinador
            </label>

            {sponsorsLoading ? (
              <div className="bg-slate-800 border border-white/5 rounded-xl p-3 text-gray-500 text-sm">
                A carregar patrocinadores...
              </div>
            ) : sponsors.length === 0 ? (
              // Nenhum patrocinador na colecção — leva o admin a criar um primeiro
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-400 text-sm font-medium">Sem patrocinadores cadastrados</p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    Vai a <strong>Patrocinadores</strong> no menu lateral e adiciona o primeiro antes de criar um desafio patrocinado.
                  </p>
                  <a
                    href="/sponsors"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Adicionar patrocinador
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* Preview do patrocinador seleccionado */}
                {selectedSponsor && (
                  <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 mb-2">
                    {selectedSponsor.logoUrl ? (
                      <img src={selectedSponsor.logoUrl} alt={selectedSponsor.name}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {selectedSponsor.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{selectedSponsor.name}</p>
                      <p className="text-pink-400/70 text-xs">{selectedSponsor.city}</p>
                    </div>
                    {selectedSponsor.instagram && (
                      <a
                        href={`https://instagram.com/${selectedSponsor.instagram}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-pink-400 transition-colors"
                      >
                        @{selectedSponsor.instagram}
                      </a>
                    )}
                  </div>
                )}

                {/* Dropdown de patrocinadores */}
                <div className="relative">
                  <select
                    value={formData.sponsorId}
                    onChange={(e) => handleChange('sponsorId', e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none appearance-none focus:border-pink-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecciona um patrocinador...</option>
                    {sponsors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.city ? ` — ${s.city}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Para adicionar um novo patrocinador, vai a{' '}
                  <a href="/sponsors" className="text-pink-400 hover:text-pink-300">Patrocinadores</a>
                  {' '}no menu.
                </p>
              </>
            )}
          </div>
        )}

        {/* Título e Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Título do Desafio</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="Ex: Melhor foto na Praia do Wimbi"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Categoria</label>
            <select
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tipo de mídia aceite */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Mídia aceite nas submissões</label>
          <div className="grid grid-cols-3 gap-3">
            {MEDIA_TYPES.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange('allowedMediaType', opt.value)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    formData.allowedMediaType === opt.value
                      ? 'border-purple-500 bg-white/5 text-white'
                      : 'border-white/10 text-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload do Banner */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Banner do desafio (opcional)
          </label>
          {!bannerPreview ? (
            <label className="flex flex-col items-center justify-center gap-2 bg-slate-800 border border-dashed border-white/15 rounded-xl p-6 cursor-pointer hover:border-purple-500 transition-colors">
              <Upload className="w-6 h-6 text-gray-500" />
              <span className="text-sm text-gray-400">Clica para escolher uma imagem (máx. 5MB)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
            </label>
          ) : (
            <div className="relative">
              <img src={bannerPreview} alt="Pré-visualização do banner" className="w-full h-40 object-cover rounded-xl border border-white/10" />
              <button type="button" onClick={removeBanner}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black rounded-full p-1.5 text-white">
                <X className="w-4 h-4" />
              </button>
              {loading && uploadProgress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl px-3 py-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-300">{Math.round(uploadProgress)}% enviado</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Descrição do Desafio</label>
          <textarea
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none min-h-[100px]"
            placeholder="Explique as regras e objetivos do desafio..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
          />
        </div>

        {/* Tipo de prémio */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Tipo de prémio</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'cash', label: '💰 Dinheiro', icon: DollarSign },
              { value: 'physical', label: '🎁 Físico', icon: Gift },
              { value: 'badge', label: '🏅 Badge', icon: Award },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('prizeType', opt.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.prizeType === opt.value
                    ? 'border-purple-500 bg-white/5 text-white'
                    : 'border-white/10 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prémio */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {formData.prizeType === 'cash' ? 'Valor do prémio (MZN)' : 'Descrição do prémio'}
          </label>
          <input
            type={formData.prizeType === 'cash' ? 'number' : 'text'}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
            placeholder={
              formData.prizeType === 'cash' ? '500' :
              formData.prizeType === 'physical' ? 'Ex: 2 Cervejas no Bar Wimbi' :
              'Ex: Badge Chef MZ'
            }
            value={formData.prize}
            onChange={(e) => handleChange('prize', e.target.value)}
            required
            min={formData.prizeType === 'cash' ? '0' : undefined}
          />
        </div>

        {/* Duração, Meta de votos e Taxa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Duração máx. (Dias)
            </label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="7"
              value={formData.durationDays}
              onChange={(e) => handleChange('durationDays', e.target.value)}
              required min="1" max="30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Target className="w-3 h-3" /> Meta de votos (opcional)
            </label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="Ex: 200"
              value={formData.voteGoal}
              onChange={(e) => handleChange('voteGoal', e.target.value)}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Taxa de Entrada (MZN)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="0 (grátis)"
              value={formData.entryFee}
              onChange={(e) => handleChange('entryFee', e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Resumo</p>
          <p className="text-sm text-gray-300">
            <span className="text-white font-medium">{formData.title || 'Sem título'}</span>
            {' '}—{' '}
            {formData.type === 'sponsored'
              ? `patrocinado por ${selectedSponsor?.name || '...'}`
              : formData.type === 'paid'
              ? 'criado por utilizador'
              : 'gratuito da plataforma'}
          </p>
          <p className="text-sm text-gray-300">
            Prémio: <span className="text-yellow-400 font-medium">
              {formData.prizeType === 'cash' && formData.prize ? `${formData.prize} MZN` : formData.prize || '...'}
            </span>
          </p>
          <p className="text-sm text-gray-300">
            Termina quando:{' '}
            <span className="text-white">
              {formData.voteGoal
                ? `atingir ${formData.voteGoal} votos OU passarem ${formData.durationDays} dias — o que vier primeiro`
                : `passarem ${formData.durationDays} dias`}
            </span>
          </p>
          <p className="text-sm text-gray-300">
            Mídia aceite: <span className="text-white">
              {MEDIA_TYPES.find(m => m.value === formData.allowedMediaType)?.label}
            </span>
          </p>
          {selectedSponsor?.logoUrl && (
            <div className="flex items-center gap-2 pt-1">
              <img src={selectedSponsor.logoUrl} alt={selectedSponsor.name}
                className="w-5 h-5 rounded object-cover" />
              <span className="text-xs text-pink-400">Logo do patrocinador será mostrado na landing page e no feed</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (formData.type === 'sponsored' && !formData.sponsorId)}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          {loading
            ? (uploadProgress > 0 ? `A enviar banner... ${Math.round(uploadProgress)}%` : 'A publicar...')
            : 'Publicar Desafio no VotaSnap'}
        </button>
      </form>
    </div>
  );
};

export default CreateChallengeForm;