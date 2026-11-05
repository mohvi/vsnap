import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import {
  UserPlus, Trophy, Users, Clock, Gift, ChevronDown, ChevronUp, Ban, Flag, PlayCircle, CheckCircle2,
} from 'lucide-react';
import { db } from '../fb';
import { useAdminData } from '../data/AdminDataProvider';
import { createInviteCampaign, endInviteCampaign, voidInviteAttribution } from '../data/actions';
import {
  INVITE_DURATION_DAYS, VIA_LABELS, activeCampaign, campaignList, computeStanding, computeWinner,
  isCampaignExpired, newCampaignPayload, viaBreakdown,
} from '../data/invites';
import { runAction } from '../utils/runAction';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import Card from './ui/Card';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import Avatar from './ui/Avatar';
import Modal, { ModalButton } from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import { inputClass } from './ui/fields';

function useAttributions(campaignId) {
  const [data, setData] = useState({});
  useEffect(() => {
    if (!campaignId) return undefined;
    return onValue(ref(db, `inviteAttributions/${campaignId}`), (snap) => setData(snap.val() || {}));
  }, [campaignId]);
  return campaignId ? data : {};
}

const userLabel = (users, uid) => (users[uid]?.username ? `@${users[uid].username}` : uid);

export default function InviteCampaignsPage() {
  const { loading, inviteCampaigns, users } = useAdminData();
  const current = activeCampaign(inviteCampaigns);
  const attributions = useAttributions(current?.id);
  const standing = useMemo(() => computeStanding(current, attributions), [current, attributions]);
  const winner = computeWinner(current, standing);
  const vias = viaBreakdown(attributions);
  const [expanded, setExpanded] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (loading) return <PageLoader />;

  const history = campaignList(inviteCampaigns).filter((c) => c.status === 'ended');
  const expired = isCampaignExpired(current);
  const daysLeft = current ? Math.max(0, Math.ceil((current.endsAt - Date.now()) / 86400000)) : 0;
  const total = Object.keys(attributions).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        icon={UserPlus}
        title="Desafio de convites"
        subtitle={`Cada edição dura ${INVITE_DURATION_DAYS} dias. Os convites são contados automaticamente pela app e validados pelas regras do Firebase.`}
      />

      {!current && <CreateCampaignCard users={users} />}

      {current && (
        <>
          {expired && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-amber-200 text-sm flex-1">
                O prazo terminou a {formatDateTime(current.endsAt)}. A app já não aceita novos convites.
                {winner ? ` Vencedor calculado: ${userLabel(users, winner.uid)}.` : ` Ninguém chegou ao mínimo de ${current.minimum}.`}
              </p>
              <button onClick={() => setConfirmEnd(true)} className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-sm font-medium">
                Encerrar edição
              </button>
            </div>
          )}

          <div className="bg-ink-900 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white text-xl font-bold">{current.title}</h2>
                {expired ? <Badge tone="amber">Prazo terminado</Badge> : <Badge tone="green" icon={PlayCircle}>A decorrer</Badge>}
              </div>
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5"><Gift className="w-4 h-4" />{current.prize}</p>
              <p className="text-gray-500 text-xs mt-1">
                {formatDate(current.startsAt)} → {formatDate(current.endsAt)} · meta {current.goal} · mínimo {current.minimum}
              </p>
            </div>
            {!expired && (
              <button onClick={() => setConfirmEnd(true)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium">
                Encerrar antes do prazo
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Convidados válidos" value={total} icon={Users} tone="blue" />
            <StatCard title="Pessoas a convidar" value={standing.length} icon={UserPlus} tone="green" />
            <StatCard title="Dias restantes" value={daysLeft} icon={Clock} tone="yellow" />
            <StatCard
              title={winner?.reason === 'goal' ? 'Chegou à meta primeiro' : 'Lidera'}
              value={standing[0] ? userLabel(users, standing[0].uid) : '—'}
              hint={standing[0] ? `${standing[0].count} convite(s)` : 'Ainda sem convites'}
              icon={Trophy}
              tone="brand"
            />
          </div>

          <Card title="Como chegaram os convidados" icon={Flag}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(vias).map(([key, n]) => (
                <div key={key} className="bg-white/5 rounded-xl p-3">
                  <p className="text-white text-lg font-bold tabular-nums">{formatNumber(n)}</p>
                  <p className="text-gray-500 text-xs">{VIA_LABELS[key]}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Classificação" icon={Trophy} bodyClass="p-0 sm:p-0 pt-3 sm:pt-3">
            {standing.length === 0 ? <EmptyState icon={UserPlus} title="Ainda sem convites válidos" /> : (
              <ul className="divide-y divide-white/5">
                {standing.map((row, i) => {
                  const user = users[row.uid] ? { ...users[row.uid], uid: row.uid } : { uid: row.uid };
                  const open = expanded === row.uid;
                  return (
                    <li key={row.uid}>
                      <button
                        onClick={() => setExpanded(open ? null : row.uid)}
                        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.02]"
                      >
                        <span className="w-6 text-right text-gray-500 text-sm tabular-nums">{i + 1}</span>
                        <Avatar user={user} />
                        <span className="flex-1 min-w-0">
                          <span className="text-white text-sm font-medium truncate block">{userLabel(users, row.uid)}</span>
                          <span className="text-gray-500 text-xs">
                            {row.goalReachedAt ? `Meta atingida a ${formatDateTime(row.goalReachedAt)}` : `Último convite ${formatDateTime(row.lastAt)}`}
                          </span>
                        </span>
                        {row.goalReachedAt && <Badge tone="green" icon={CheckCircle2}>Meta</Badge>}
                        <span className="text-white font-bold tabular-nums w-10 text-right">{row.count}</span>
                        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                      {open && (
                        <div className="px-4 sm:px-5 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <Link to={`/ul/${row.uid}`} className="text-brand-400 text-xs hover:underline">Abrir ficha de quem convidou</Link>
                          </div>
                          <ul className="space-y-1.5">
                            {row.invitees.map((inv) => (
                              <li key={inv.inviteeUid} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 text-sm">
                                <Link to={`/ul/${inv.inviteeUid}`} className="text-white hover:underline flex-1 min-w-0 truncate">
                                  {userLabel(users, inv.inviteeUid)}
                                </Link>
                                <Badge tone="gray">{VIA_LABELS[inv.via] || inv.via}</Badge>
                                <span className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(inv.at)}</span>
                                <button
                                  onClick={() => setVoidTarget({ inviteeUid: inv.inviteeUid, inviterUid: row.uid })}
                                  aria-label="Anular convite"
                                  title="Anular convite"
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {history.length > 0 && (
        <Card title="Edições anteriores" icon={Clock}>
          <ul className="divide-y divide-white/5">
            {history.map((c) => (
              <li key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                <span className="text-white font-medium flex-1">{c.title}</span>
                <span className="text-gray-500">{formatDate(c.startsAt)} → {formatDate(c.endedAt || c.endsAt)}</span>
                <span className="text-gray-300">
                  {c.winnerUid ? <>Vencedor: <Link className="text-brand-400 hover:underline" to={`/ul/${c.winnerUid}`}>{userLabel(users, c.winnerUid)}</Link></> : 'Sem vencedor'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {voidTarget && current && (
        <VoidModal
          users={users}
          target={voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={(reason) => runAction(
            () => voidInviteAttribution(current.id, voidTarget.inviteeUid, voidTarget.inviterUid, reason),
            { success: 'Convite anulado' },
          )}
        />
      )}

      {confirmEnd && current && (
        <ConfirmDialog
          title="Encerrar esta edição?"
          variant="primary"
          confirmLabel="Encerrar"
          message={winner
            ? `O vencedor registado será ${userLabel(users, winner.uid)} (${winner.reason === 'goal' ? 'primeiro a chegar à meta' : 'mais convites no fim do prazo'}) e recebe uma notificação. A app deixa de aceitar convites.`
            : 'Ainda não há vencedor (ninguém chegou à meta nem ao mínimo). A app deixa de aceitar convites.'}
          onConfirm={() => runAction(() => endInviteCampaign(current.id, winner?.uid || null, current), { success: 'Edição encerrada' })}
          onClose={() => setConfirmEnd(false)}
        />
      )}
    </div>
  );
}

function CreateCampaignCard({ users }) {
  const [notifyAll, setNotifyAll] = useState(true);
  const [form, setForm] = useState({ title: 'Convida os teus amigos', prize: '', goal: 100, minimum: 30 });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const goal = Number(form.goal);
  const minimum = Number(form.minimum);
  const valid = form.title.trim() && form.prize.trim() && goal >= 1 && minimum >= 1 && minimum <= goal;

  const start = async () => {
    setBusy(true);
    await runAction(() => createInviteCampaign(newCampaignPayload(form), notifyAll ? Object.keys(users) : []), { success: 'Desafio de convites iniciado' });
    setBusy(false);
  };

  return (
    <Card title="Iniciar uma edição" icon={PlayCircle}>
      <p className="text-gray-400 text-sm mb-4">
        Começa agora e termina daqui a {INVITE_DURATION_DAYS} dias. Só pode haver uma edição a decorrer. Contam apenas contas criadas depois do início.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-300 text-xs font-medium">Título</span>
          <input className={`${inputClass} mt-2`} value={form.title} onChange={set('title')} maxLength={60} />
        </label>
        <label className="block">
          <span className="text-gray-300 text-xs font-medium">Prémio</span>
          <input className={`${inputClass} mt-2`} value={form.prize} onChange={set('prize')} placeholder="Ex.: Smartphone + 1.000 MT de crédito" maxLength={80} />
        </label>
        <label className="block">
          <span className="text-gray-300 text-xs font-medium">Meta (amigos)</span>
          <input type="number" min="1" className={`${inputClass} mt-2`} value={form.goal} onChange={set('goal')} />
        </label>
        <label className="block">
          <span className="text-gray-300 text-xs font-medium">Mínimo para ganhar no fim do prazo</span>
          <input type="number" min="1" className={`${inputClass} mt-2`} value={form.minimum} onChange={set('minimum')} />
        </label>
      </div>
      {minimum > goal && <p className="text-red-400 text-xs mt-2">O mínimo não pode ser maior do que a meta.</p>}
      <div className="mt-4">
        <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer select-none">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-brand-500" checked={notifyAll} onChange={(e) => setNotifyAll(e.target.checked)} />
            <span>Avisar todos os utilizadores com uma notificação push</span>
          </label>
      </div>
      <button
        disabled={!valid || busy}
        onClick={start}
        className="mt-5 w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white text-sm font-semibold disabled:opacity-50"
      >
        {busy ? 'A iniciar…' : `Iniciar desafio de ${INVITE_DURATION_DAYS} dias`}
      </button>
    </Card>
  );
}

function VoidModal({ users, target, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const ok = await onConfirm(reason);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal
      title="Anular convite"
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton variant="danger" onClick={submit} disabled={busy || reason.trim().length < 3}>{busy ? 'A anular…' : 'Anular'}</ModalButton>
        </>
      )}
    >
      <p className="text-gray-400 text-sm mb-4">
        {userLabel(users, target.inviteeUid)} deixa de contar para {userLabel(users, target.inviterUid)}. O número fica marcado como usado e não volta a contar.
      </p>
      <label className="block">
        <span className="text-gray-300 text-xs font-medium">Motivo (fica no registo de acções)</span>
        <textarea rows={3} className={`${inputClass} mt-2`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: conta falsa, foto repetida" />
      </label>
    </Modal>
  );
}
