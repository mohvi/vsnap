import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Gift, CheckCircle2, ShieldCheck, ShieldAlert, Phone, MapPin, Camera, ArrowRightLeft, Loader2,
} from 'lucide-react';
import { storage } from '../fb';
import { useAdminData } from '../data/AdminDataProvider';
import { forfeitPrize, markPrizeDelivered } from '../data/actions';
import { ageFrom, challengeMinAge } from '../data/audience';
import { DELIVERY_STATUS, placeLabel } from '../data/prizes';
import { runAction } from '../utils/runAction';
import { formatDateTime } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';

const FILTERS = [
  { value: 'pending', label: 'Por entregar' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'all', label: 'Todos' },
];

const FORFEIT_REASONS = [
  'Não tem a idade mínima (BI)',
  'Não levantou no prazo',
  'Não foi possível contactar',
  'Recusou o prémio',
  'Conta suspensa ou fraude',
];

const MAX_PHOTO = 8 * 1024 * 1024;

function DeliverModal({ target, onClose }) {
  const { challenge, delivery } = target;
  const minAge = challengeMinAge(challenge);
  const [idChecked, setIdChecked] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [photoPublic, setPhotoPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (minAge && !idChecked) { setError(`Desafio ${minAge}+: confirma que viste o BI e a idade.`); return; }
    setSaving(true);
    try {
      let photoUrl = null;
      if (file) {
        // Foto autorizada fica numa pasta pública (app e relatório); senão só o painel a vê.
        const folder = photoPublic ? `challenges/${challenge.id}` : `prizeDeliveries/${challenge.id}`;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileRef = storageRef(storage, `${folder}/delivery_${delivery.place}_${Date.now()}.${ext}`);
        await uploadBytes(fileRef, file, { contentType: file.type });
        photoUrl = await getDownloadURL(fileRef);
      }
      const ok = await runAction(
        () => markPrizeDelivered(challenge.id, delivery.place, { idChecked, notes, photoUrl, photoPublic }, challenge),
        { success: 'Prémio marcado como entregue' },
      );
      if (ok !== false) onClose();
    } catch (err) {
      setError(err?.message || 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Entregar ${placeLabel(delivery.place)} prémio`}
      onClose={onClose}
      size="md"
      footer={(
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
          <button type="button" disabled={saving} onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar entrega
          </button>
        </div>
      )}
    >
      <div className="space-y-4 text-sm">
        <p className="text-gray-300"><span className="text-yellow-400 font-medium">{delivery.prize}</span> · {challenge.title}</p>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-green-500" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
          <span className="text-gray-200">
            Vi o BI e confirmei a identidade{minAge ? ` e que tem ${minAge} anos ou mais` : ''}.
            {minAge > 0 && <span className="block text-xs text-amber-400 mt-0.5">Obrigatório: desafio {minAge}+{challenge.alcohol ? ' com álcool' : ''}.</span>}
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-gray-400">Notas (opcional)</span>
          <input className="w-full bg-ink-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500" placeholder="Ex: levantou na loja da Baixa, entregue por Carlos" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        </label>
        <div className="space-y-2">
          <span className="text-gray-400 flex items-center gap-1"><Camera className="w-4 h-4" /> Foto da entrega (opcional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white/10 file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > MAX_PHOTO) { setError('A foto não pode passar 8MB.'); return; }
              setFile(f || null);
            }}
          />
          {file && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-brand-500" checked={photoPublic} onChange={(e) => setPhotoPublic(e.target.checked)} />
              <span className="text-gray-300">O vencedor autorizou publicar esta foto (secção Vencedores da app e relatório da marca).</span>
            </label>
          )}
        </div>
        {error && <p className="text-red-400" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function ForfeitModal({ target, onClose }) {
  const { challenge, delivery, deliveries } = target;
  const [reason, setReason] = useState(FORFEIT_REASONS[0]);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const ok = await runAction(
      () => forfeitPrize(challenge.id, delivery.place, reason, challenge, deliveries),
      { success: 'Prémio passou ao classificado seguinte' },
    );
    setSaving(false);
    if (ok !== false) onClose();
  };
  return (
    <Modal
      title="Passar o prémio ao seguinte?"
      onClose={onClose}
      footer={(
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
          <button type="button" disabled={saving} onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50">
            Passar ao seguinte
          </button>
        </div>
      )}
    >
      <div className="space-y-3 text-sm">
        <p className="text-gray-300">
          O {placeLabel(delivery.place)} prémio ({delivery.prize}) passa ao participante mais votado que ainda não ganhou nada. Essa pessoa recebe uma notificação.
        </p>
        <label className="block space-y-1">
          <span className="text-gray-400">Motivo</span>
          <select className="w-full bg-ink-800 border border-white/5 rounded-xl p-3 text-white" value={reason} onChange={(e) => setReason(e.target.value)}>
            {FORFEIT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  );
}

export default function PrizeDeliveriesPage() {
  const { loading, challenges, prizeDeliveries, users, userDemographics } = useAdminData();
  const [filter, setFilter] = useState('pending');
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [forfeitTarget, setForfeitTarget] = useState(null);

  const groups = useMemo(() => Object.entries(prizeDeliveries || {})
    .map(([cid, byPlace]) => {
      const challenge = challenges[cid] ? { id: cid, ...challenges[cid] } : { id: cid, title: 'Desafio apagado' };
      const rows = Object.values(byPlace || {})
        .filter((d) => d && (filter === 'all' || d.status === filter))
        .sort((a, b) => a.place - b.place);
      return { challenge, rows, deliveries: byPlace, confirmedAt: challenge.confirmedAt || 0 };
    })
    .filter((g) => g.rows.length)
    .sort((a, b) => b.confirmedAt - a.confirmedAt), [prizeDeliveries, challenges, filter]);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <PageHeader
        icon={Gift}
        iconClass="text-yellow-400"
        title="Entrega de prémios"
        subtitle="Cada prémio fica por entregar até o marcares, com o BI verificado nos desafios 18+"
      />

      <div className="flex gap-2 mb-5" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${filter === f.value ? 'bg-brand-600 border-brand-600 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          {filter === 'pending' ? 'Nenhum prémio por entregar' : 'Nada para mostrar'}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ challenge, rows, deliveries }) => {
            const minAge = challengeMinAge(challenge);
            return (
              <article key={challenge.id} className="bg-ink-900 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-white font-semibold break-words">{challenge.title}</h2>
                  {challenge.sponsor && <span className="text-xs text-gray-400">· {challenge.sponsor}</span>}
                  {minAge > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-300 border-red-500/30">{minAge}+{challenge.alcohol ? ' · álcool' : ''}</span>
                  )}
                </div>
                {challenge.pickupInfo && (
                  <p className="text-xs text-gray-400 mb-3 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {challenge.pickupInfo}</p>
                )}

                <div className="space-y-2">
                  {rows.map((d) => {
                    const user = users[d.uid] || {};
                    const age = ageFrom(userDemographics?.[d.uid]?.birthDate);
                    const ageProblem = minAge > 0 && (age === null || age < minAge);
                    const status = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.pending;
                    return (
                      <div key={d.place} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-yellow-400 font-bold text-sm w-9 flex-shrink-0">{placeLabel(d.place)}</span>
                          <Avatar user={user} size="w-9 h-9" textSize="text-xs" />
                          <div className="min-w-0">
                            <Link to={`/ul/${d.uid}`} className="text-white text-sm font-medium hover:underline truncate block">
                              {user.name || 'Utilizador'} <span className="text-gray-500">@{user.username || '—'}</span>
                            </Link>
                            <p className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span className="text-yellow-300">{d.prize}</span>
                              {user.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</span>}
                              <span className={`inline-flex items-center gap-1 ${ageProblem ? 'text-red-400' : ''}`}>
                                {ageProblem ? <ShieldAlert className="w-3 h-3" /> : null}
                                {age === null ? 'idade não indicada' : `${age} anos`}
                              </span>
                            </p>
                            {d.history?.length > 0 && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Antes: {d.history.map((h) => `@${users[h.uid]?.username || h.uid} (${h.reason})`).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className={`text-xs px-2 py-1 rounded-full border ${status.color}`}>{status.label}</span>
                          {d.status === 'delivered' && (
                            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                              {d.idChecked && <ShieldCheck className="w-3.5 h-3.5 text-green-400" />}
                              {formatDateTime(d.deliveredAt)}
                            </span>
                          )}
                          {d.photoUrl && (
                            <a href={d.photoUrl} target="_blank" rel="noreferrer" title={d.photoPublic ? 'Foto pública' : 'Foto interna'}>
                              <img src={d.photoUrl} alt="Foto da entrega" className="w-9 h-9 rounded-md object-cover border border-white/10" />
                            </a>
                          )}
                          {d.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setForfeitTarget({ challenge, delivery: d, deliveries })}
                                className="px-3 py-1.5 rounded-lg text-xs text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 inline-flex items-center gap-1"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Passar ao seguinte
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeliverTarget({ challenge, delivery: d })}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white"
                              >
                                Marcar entregue
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {deliverTarget && <DeliverModal target={deliverTarget} onClose={() => setDeliverTarget(null)} />}
      {forfeitTarget && <ForfeitModal target={forfeitTarget} onClose={() => setForfeitTarget(null)} />}
    </div>
  );
}
