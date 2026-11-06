import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import {
  PlusCircle, Image as ImageIcon, Trophy, Clock, Tag, Target, Camera, Video, Upload, X, Loader2, Handshake,
} from 'lucide-react';
import { storage } from '../fb';
import { createChallenge, newChallengeId } from '../data/actions';
import { useAdminData } from '../data/AdminDataProvider';
import { toList } from '../data/metrics';
import { errorMessage } from '../utils/runAction';
import { DAY_MS } from '../config';
import { challengeAudience, challengeMinAge } from '../data/audience';
import { buildPrizeList, MAX_PLACES, placeLabel } from '../data/prizes';

const CATEGORIES = [
  { value: 'fotografia', label: '📸 Fotografia' },
  { value: 'musica', label: '🎵 Música' },
  { value: 'danca', label: '💃 Dança' },
  { value: 'culinaria', label: '🍲 Culinária' },
  { value: 'moda', label: '👗 Moda' },
  { value: 'desporto', label: '⚽ Desporto' },
  { value: 'arte', label: '🎨 Arte' },
  { value: 'humor', label: '😂 Humor' },
  { value: 'beleza', label: '💄 Beleza' },
  { value: 'bebidas', label: '🍺 Bebidas' },
  { value: 'tecnologia', label: '📱 Tecnologia' },
  { value: 'viagens', label: '✈️ Viagens' },
];

const AGE_OPTIONS = [
  { value: 0, label: 'Livre' },
  { value: 16, label: '16+' },
  { value: 18, label: '18+' },
];

const NOTIFY_MODES = [
  { value: 'all', label: 'Todos (com idade)' },
  { value: 'interested', label: 'Só interessados' },
  { value: 'none', label: 'Ninguém' },
];

const START_MODES = [
  { value: 'now', label: 'Abrir já' },
  { value: 'scheduled', label: 'Agendar (Em breve)' },
];

const MEDIA_TYPES = [
  { value: 'photo', label: 'Foto', icon: Camera },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'both', label: 'Ambos', icon: ImageIcon },
];

// A participação é sempre gratuita. 'free' mantém o valor já gravado na base
// de dados; na interface chama-se "Comunidade" (organizado pela VotaSnap).
const CHALLENGE_TYPES = [
  { value: 'free', label: '🌍 Comunidade', color: 'border-teal-500' },
  { value: 'sponsored', label: '🏢 Patrocinado', color: 'border-accent-500' },
];

const PRIZE_PROVIDERS = [
  { value: 'sponsor', label: 'A marca entrega' },
  { value: 'votasnap', label: 'A VotaSnap entrega' },
];

const PRIZE_TYPES = [
  { value: 'physical', label: '🎁 Produto / físico' },
  { value: 'cash', label: '💰 Dinheiro' },
  { value: 'badge', label: '🏅 Badge' },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'fotografia',
  type: 'free', // free (comunidade) | sponsored
  // Um prémio por posição: [1.º, 2.º, 3.º…]. O 1.º é obrigatório.
  prizes: [''],
  prizeType: 'physical', // physical | cash | badge
  prizeValue: '', // valor estimado dos prémios (MZN), interno
  pickupInfo: '', // como e onde levantar — aparece na app e na notificação
  sponsorId: '',
  // Acordo com a marca — gravado em challengeDeals/, nunca no desafio público.
  dealAmount: '',
  prizeProvider: 'sponsor', // sponsor | votasnap
  prizeNotes: '',
  durationDays: 7,
  allowedMediaType: 'photo', // photo | video | both
  voteGoal: '', // opcional — vazio = só prazo
  startMode: 'now', // now | scheduled
  startsAtLocal: '', // datetime-local quando agendado
  minAge: 0, // 0 | 16 | 18
  alcohol: false, // bebidas alcoólicas → 18+ e aviso legal na app
};

const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const inputClass = 'w-full bg-ink-800 border border-white/5 rounded-xl p-3 text-white focus:border-brand-500 outline-none';

function OptionGroup({ label, options, value, onChange, activeClass = () => 'border-brand-500' }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-gray-400 mb-2">{label}</legend>
      <div className={`grid gap-2 sm:gap-3 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`p-2.5 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-medium transition-colors flex flex-col items-center justify-center gap-1 text-center leading-tight ${
                active ? `${activeClass(opt)} bg-white/5 text-white` : 'border-white/10 text-gray-500 hover:border-white/20'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function CreateChallengeForm() {
  const { sponsors, users, userDemographics } = useAdminData();
  const [notifyMode, setNotifyMode] = useState('all');
  const activeSponsors = useMemo(
    () => toList(sponsors).filter((s) => s.active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [sponsors],
  );
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Liberta o object URL da pré-visualização quando muda ou o componente sai.
  useEffect(() => () => bannerPreview && URL.revokeObjectURL(bannerPreview), [bannerPreview]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleBannerSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('O banner tem de ser uma imagem (jpg, png, webp).');
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
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

  const uploadBanner = (challengeId) => new Promise((resolve, reject) => {
    if (!bannerFile) {
      resolve('');
      return;
    }
    const ext = bannerFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const task = uploadBytesResumable(
      storageRef(storage, `challenges/${challengeId}/banner_${Date.now()}.${ext}`),
      bannerFile,
      { contentType: bannerFile.type },
    );
    task.on(
      'state_changed',
      (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });

  const validate = () => {
    const days = Number(formData.durationDays);
    if (!formData.title.trim() || !formData.description.trim() || !String(formData.prizes[0] ?? '').trim()) {
      return 'Preenche título, descrição e prémio.';
    }
    if (formData.type === 'sponsored' && !sponsors[formData.sponsorId]) return 'Escolhe a marca patrocinadora.';
    if (formData.type === 'sponsored' && formData.dealAmount !== '' && !(Number(formData.dealAmount) >= 0)) {
      return 'O valor acordado com a marca não pode ser negativo.';
    }
    if (!Number.isInteger(days) || days < 1 || days > 30) return 'A duração tem de ser entre 1 e 30 dias.';
    if (formData.prizeType === 'cash' && formData.prizes.some((p) => String(p).trim() !== '' && !(Number(p) > 0))) {
      return 'Os valores dos prémios em dinheiro têm de ser maiores que 0.';
    }
    if (formData.prizeValue !== '' && !(Number(formData.prizeValue) >= 0)) return 'O valor estimado dos prémios não pode ser negativo.';
    if (formData.prizeType === 'physical' && !formData.pickupInfo.trim()) {
      return 'Indica como e onde o vencedor levanta o prémio físico.';
    }
    if (formData.voteGoal !== '' && !(Number(formData.voteGoal) > 0)) return 'A meta de votos, se definida, tem de ser maior que 0.';
    if (formData.startMode === 'scheduled') {
      const start = new Date(formData.startsAtLocal).getTime();
      if (!Number.isFinite(start) || start <= Date.now() + 5 * 60000) return 'Escolhe uma data de início no futuro (pelo menos daqui a 5 minutos).';
      if (start > Date.now() + 60 * DAY_MS) return 'A data de início não pode passar 60 dias.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setLoading(true);
    setUploadProgress(0);
    try {
      const challengeId = newChallengeId();
      // Upload primeiro — se falhar, o desafio não é criado.
      const bannerUrl = await uploadBanner(challengeId);
      const now = Date.now();
      const startsAt = formData.startMode === 'scheduled' ? new Date(formData.startsAtLocal).getTime() : now;
      const minAge = formData.alcohol ? 18 : Number(formData.minAge) || 0;
      // Só avisa quem tem idade para o desafio (e, se escolhido, quem marcou a categoria).
      const audience = notifyMode === 'none' ? [] : challengeAudience({
        users, demographics: userDemographics, challenge: { category: formData.category, alcohol: formData.alcohol, minAge }, mode: notifyMode,
      });
      const hasVoteGoal = formData.voteGoal !== '';
      const prizes = buildPrizeList(formData.prizeType, formData.prizes);
      const isSponsored = formData.type === 'sponsored';
      const sponsor = isSponsored ? sponsors[formData.sponsorId] : null;

      await createChallenge(challengeId, {
        id: challengeId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        // `prize` = 1.º lugar (app antiga e API); `prizes` = todas as posições.
        prize: prizes[0],
        prizes,
        prizeType: formData.prizeType,
        pickupInfo: formData.pickupInfo.trim() || null,
        // Nome e logótipo copiados para o desafio: a app lê só o desafio.
        // Editar a marca volta a propagar estes campos (saveSponsor).
        sponsorId: sponsor ? formData.sponsorId : null,
        sponsor: sponsor ? sponsor.name : '',
        sponsorLogo: sponsor?.logoUrl || null,
        coverImage: bannerUrl,
        entryFee: 0,
        allowedMediaType: formData.allowedMediaType,
        status: 'active',
        createdBy: 'admin',
        createdAt: now,
        startsAt,
        endsAt: startsAt + Number(formData.durationDays) * DAY_MS,
        minAge,
        alcohol: !!formData.alcohol,
        // Fecha no prazo OU quando uma entrada atingir voteGoal (o que vier primeiro) —
        // a verificação da meta é feita pela Cloud Function de votos.
        voteGoal: hasVoteGoal ? Number(formData.voteGoal) : null,
        winCondition: hasVoteGoal ? 'firstToReachGoalOrDeadline' : 'mostVotesAtDeadline',
        totalVotes: 0,
        totalParticipants: 0,
      }, sponsor ? {
        sponsorId: formData.sponsorId,
        amountMzn: formData.dealAmount === '' ? 0 : Number(formData.dealAmount),
        paymentStatus: 'pending',
        prizeProvider: formData.prizeProvider,
        prizeNotes: formData.prizeNotes.trim() || null,
        // Valor estimado dos prémios (produto incluído) — entra no investimento do relatório.
        prizeValueMzn: formData.prizeValue === '' ? null : Number(formData.prizeValue),
        createdAt: now,
      } : null, audience);

      toast.success(audience.length ? `Desafio criado e ${audience.length} utilizadores avisados` : 'Desafio criado com sucesso!');
      setFormData(INITIAL_FORM);
      removeBanner();
    } catch (err) {
      console.error(err);
      setError(`Erro ao criar desafio: ${errorMessage(err)}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const effectiveMinAge = challengeMinAge({ alcohol: formData.alcohol, minAge: formData.minAge });
  const audiencePreview = useMemo(() => (notifyMode === 'none' ? 0 : challengeAudience({
    users, demographics: userDemographics, challenge: { category: formData.category, alcohol: formData.alcohol, minAge: formData.minAge }, mode: notifyMode,
  }).length), [users, userDemographics, formData.category, formData.alcohol, formData.minAge, notifyMode]);

  const typeLabel = formData.type === 'sponsored'
    ? `patrocinado por ${sponsors[formData.sponsorId]?.name || '...'}`
    : 'da comunidade, organizado pela VotaSnap';

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-ink-900 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <PlusCircle className="w-7 h-7 sm:w-8 sm:h-8 text-brand-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">Novo desafio</h1>
        </div>

        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <OptionGroup
            label="Tipo de desafio"
            options={CHALLENGE_TYPES}
            value={formData.type}
            onChange={(v) => handleChange('type', v)}
            activeClass={(opt) => opt.color}
          />

          {formData.type === 'sponsored' && (
            <div className="space-y-4 p-4 rounded-xl border border-accent-500/20 bg-accent-500/5">
              {activeSponsors.length === 0 ? (
                <p className="text-sm text-gray-300">
                  Ainda não há marcas activas. <Link to="/marcas" className="text-accent-300 underline">Cria a marca primeiro</Link>.
                </p>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3" /> Marca patrocinadora</span>
                  <select className={inputClass} value={formData.sponsorId} onChange={(e) => handleChange('sponsorId', e.target.value)}>
                    <option value="">Escolhe a marca...</option>
                    {activeSponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              )}

              <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Handshake className="w-3 h-3" /> Acordo (interno, não aparece na app)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm text-gray-400">Valor a pagar pela marca (MZN)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    className={inputClass}
                    placeholder="Ex: 5000"
                    value={formData.dealAmount}
                    onChange={(e) => handleChange('dealAmount', e.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-gray-400">Quem entrega o prémio</span>
                  <select className={inputClass} value={formData.prizeProvider} onChange={(e) => handleChange('prizeProvider', e.target.value)}>
                    {PRIZE_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Notas sobre a entrega do prémio (opcional)</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex: levantar na loja da Av. Julius Nyerere até 15 dias após o fim"
                  value={formData.prizeNotes}
                  onChange={(e) => handleChange('prizeNotes', e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm text-gray-400">Título do desafio</span>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: Melhor foto na Praia do Wimbi"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-gray-400">Categoria</span>
              <select className={inputClass} value={formData.category} onChange={(e) => handleChange('category', e.target.value)}>
                {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </label>
          </div>

          <div>
            <OptionGroup
              label="Mídia aceite nas submissões"
              options={MEDIA_TYPES}
              value={formData.allowedMediaType}
              onChange={(v) => handleChange('allowedMediaType', v)}
            />
            <p className="text-xs text-gray-500 mt-2">
              A app valida este campo antes de aceitar o upload do participante.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-gray-400 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Banner do desafio (opcional)</span>
            {!bannerPreview ? (
              <label className="flex flex-col items-center justify-center gap-2 bg-ink-800 border border-dashed border-white/15 rounded-xl p-6 cursor-pointer hover:border-brand-500 transition-colors text-center">
                <Upload className="w-6 h-6 text-gray-500" />
                <span className="text-sm text-gray-400">Escolher uma imagem (máx. 5MB)</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBannerSelect} />
              </label>
            ) : (
              <div className="relative">
                <img src={bannerPreview} alt="Pré-visualização do banner" className="w-full h-40 sm:h-48 object-cover rounded-xl border border-white/10" />
                <button
                  type="button"
                  onClick={removeBanner}
                  disabled={loading}
                  aria-label="Remover banner"
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black rounded-full p-1.5 text-white disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
                {loading && uploadProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl px-3 py-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-300">{Math.round(uploadProgress)}% enviado</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-gray-400">Descrição do desafio</span>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              placeholder="Explica as regras e objectivos do desafio..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </label>

          <OptionGroup
            label="Tipo de prémio"
            options={PRIZE_TYPES}
            value={formData.prizeType}
            onChange={(v) => handleChange('prizeType', v)}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm text-gray-400 flex items-center gap-1 mb-2">
              <Trophy className="w-3 h-3" />
              {formData.prizeType === 'cash' ? 'Prémios por posição (MZN)' : 'Prémios por posição'}
            </legend>
            {formData.prizes.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-10 text-sm text-gray-500 flex-shrink-0">{placeLabel(i + 1)}</span>
                <input
                  type={formData.prizeType === 'cash' ? 'number' : 'text'}
                  inputMode={formData.prizeType === 'cash' ? 'numeric' : undefined}
                  className={inputClass}
                  aria-label={`Prémio do ${placeLabel(i + 1)} lugar`}
                  placeholder={
                    formData.prizeType === 'cash' ? (i === 0 ? '500' : '200')
                      : formData.prizeType === 'physical' ? (i === 0 ? 'Ex: 2 grades de 2M + T-shirt' : 'Ex: 1 grade de 2M')
                        : 'Ex: Badge Chef MZ'
                  }
                  value={value}
                  onChange={(e) => handleChange('prizes', formData.prizes.map((p, j) => (j === i ? e.target.value : p)))}
                  min={formData.prizeType === 'cash' ? '1' : undefined}
                />
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Remover prémio do ${placeLabel(i + 1)} lugar`}
                    onClick={() => handleChange('prizes', formData.prizes.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {formData.prizes.length < MAX_PLACES && (
              <button
                type="button"
                onClick={() => handleChange('prizes', [...formData.prizes, ''])}
                className="text-sm text-brand-400 hover:text-brand-300"
              >
                + Prémio para o {placeLabel(formData.prizes.length + 1)} lugar
              </button>
            )}
            <p className="text-xs text-gray-500">Cada pessoa recebe no máximo um prémio, mesmo com várias publicações.</p>
          </fieldset>

          {formData.prizeType !== 'badge' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm text-gray-400">Como e onde se levanta o prémio {formData.prizeType === 'physical' ? '' : '(opcional)'}</span>
                <textarea
                  className={`${inputClass} min-h-[70px]`}
                  placeholder={formData.prizeType === 'cash'
                    ? 'Ex: pago por M-Pesa no número da conta, até 7 dias após o fim'
                    : 'Ex: levantar na loja da Av. Julius Nyerere, 2.ª a 6.ª, 9h–17h, até 15 dias após o fim. Trazer BI.'}
                  value={formData.pickupInfo}
                  onChange={(e) => handleChange('pickupInfo', e.target.value)}
                  maxLength={400}
                />
                <span className="block text-xs text-gray-500">Aparece no desafio na app e na notificação aos vencedores.</span>
              </label>
              {formData.type === 'sponsored' && (
                <label className="block space-y-2">
                  <span className="text-sm text-gray-400">Valor estimado dos prémios (MZN, interno)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    className={inputClass}
                    placeholder="Ex: 6000"
                    value={formData.prizeValue}
                    onChange={(e) => handleChange('prizeValue', e.target.value)}
                  />
                  <span className="block text-xs text-gray-500">Soma ao investimento da marca no relatório PDF.</span>
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Duração máx. (dias)</span>
              <input
                type="number"
                inputMode="numeric"
                className={inputClass}
                value={formData.durationDays}
                onChange={(e) => handleChange('durationDays', e.target.value)}
                min="1"
                max="30"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-gray-400 flex items-center gap-1"><Target className="w-3 h-3" /> Meta de votos (opcional)</span>
              <input
                type="number"
                inputMode="numeric"
                className={inputClass}
                placeholder="Ex: 200"
                value={formData.voteGoal}
                onChange={(e) => handleChange('voteGoal', e.target.value)}
                min="1"
              />
            </label>
          </div>

          <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <OptionGroup
              label="Início"
              options={START_MODES}
              value={formData.startMode}
              onChange={(v) => handleChange('startMode', v)}
            />
            {formData.startMode === 'scheduled' && (
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Data e hora de abertura</span>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={formData.startsAtLocal}
                  onChange={(e) => handleChange('startsAtLocal', e.target.value)}
                />
                <span className="block text-xs text-gray-500">
                  Até lá aparece na app em "Em breve", com o botão "Avisa-me". A duração conta a partir desta data.
                </span>
              </label>
            )}

            <OptionGroup
              label="Idade mínima"
              options={AGE_OPTIONS.map((o) => ({ ...o, value: String(o.value) }))}
              value={String(effectiveMinAge)}
              onChange={(v) => !formData.alcohol && handleChange('minAge', Number(v))}
            />
            <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-brand-500"
                checked={formData.alcohol}
                onChange={(e) => handleChange('alcohol', e.target.checked)}
              />
              <span>
                Envolve bebidas alcoólicas (marca de cerveja, prémio com álcool…). Fica 18+, menores e visitantes não o vêem,
                e a app mostra "Proibido a menores de 18 anos. Beba com moderação." Confirmar o BI na entrega do prémio.
              </span>
            </label>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1 text-sm text-gray-300 break-words">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Resumo</p>
            <p><span className="text-white font-medium">{formData.title || 'Sem título'}</span> — {typeLabel}</p>
            <p>
              Prémio: <span className="text-yellow-400 font-medium">
                {buildPrizeList(formData.prizeType, formData.prizes).map((p, i) => `${placeLabel(i + 1)} ${p}`).join(' · ') || '...'}
              </span>
            </p>
            <p>
              Termina quando: <span className="text-white">
                {formData.voteGoal
                  ? `atingir ${formData.voteGoal} votos OU passarem ${formData.durationDays} dias — o que vier primeiro`
                  : `passarem ${formData.durationDays} dias`}
              </span>
            </p>
            <p>Mídia aceite: <span className="text-white">{MEDIA_TYPES.find((m) => m.value === formData.allowedMediaType)?.label}</span></p>
            <p>
              Abre: <span className="text-white">
                {formData.startMode === 'scheduled' && formData.startsAtLocal
                  ? new Date(formData.startsAtLocal).toLocaleString('pt-MZ')
                  : 'imediatamente'}
              </span>
              {' · '}Idade: <span className="text-white">{effectiveMinAge ? `${effectiveMinAge}+` : 'livre'}</span>
            </p>
          </div>

          <div className="space-y-2">
            <OptionGroup
              label="Notificação push"
              options={NOTIFY_MODES}
              value={notifyMode}
              onChange={setNotifyMode}
            />
            <p className="text-xs text-gray-500">
              {notifyMode === 'none'
                ? 'Ninguém é avisado.'
                : `${audiencePreview} utilizadores vão ser avisados${effectiveMinAge ? ` (só quem declarou ${effectiveMinAge}+ anos)` : ''}${notifyMode === 'interested' ? ', só os que marcaram esta categoria nos interesses' : ''}.`}
              {formData.startMode === 'scheduled' && notifyMode !== 'none' && ' A notificação anuncia o desafio como "Em breve".'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? (uploadProgress > 0 ? `A enviar banner... ${Math.round(uploadProgress)}%` : 'A publicar...')
              : 'Publicar desafio'}
          </button>
        </form>
      </div>
    </div>
  );
}
