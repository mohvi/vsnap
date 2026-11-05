import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, BellOff, Send, Smartphone, Users } from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { sendPushNotification } from '../data/actions';
import {
  AUDIENCES, BODY_MAX, TITLE_MAX, audienceUids, auditTargetFor, canReceivePush, destinationUrl, reachable,
} from '../data/push';
import { runAction } from '../utils/runAction';
import { formatNumber } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import Card from './ui/Card';
import ConfirmDialog from './ui/ConfirmDialog';
import { inputClass, selectClass } from './ui/fields';

const TEMPLATES = [
  { label: 'Novo desafio', title: '📸 Novo desafio no VotaSnap!', body: 'Já podes participar. Publica a tua foto e concorre ao prémio.', destination: 'challenge' },
  { label: 'Últimas horas', title: '⏳ Últimas horas para participar', body: 'O desafio está quase a terminar. Ainda vais a tempo!', destination: 'challenge' },
  { label: 'Convites', title: '🎁 Convida amigos e ganha', body: 'O desafio de convites está a decorrer. Convida e sobe no ranking!', destination: 'invite' },
  { label: 'Saudades', title: 'Temos novidades para ti 👀', body: 'Há novas fotos para votar. Entra e vê quem está a ganhar.', destination: 'none' },
];

function Label({ children, hint }) {
  return (
    <span className="flex items-baseline justify-between text-sm text-gray-300 mb-1.5">
      {children}
      {hint && <span className="text-xs text-gray-500 tabular-nums">{hint}</span>}
    </span>
  );
}

export default function NotificationsPage() {
  const { loading, users, entries, challenges } = useAdminData();
  const [searchParams] = useSearchParams();
  const initialUid = searchParams.get('uid');
  const [form, setForm] = useState(() => ({
    audience: initialUid ? 'user' : 'all',
    uid: initialUid || '',
    challengeId: '',
    title: '',
    body: '',
    destination: 'none',
    destinationChallengeId: '',
  }));
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const challengeOptions = useMemo(() => Object.entries(challenges)
    .map(([id, c]) => ({ id, title: c.title || id, active: c.status === 'active', createdAt: c.createdAt || 0 }))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt), [challenges]);

  const withToken = useMemo(() => Object.values(users).filter((u) => canReceivePush(u)).length, [users]);
  const totalUsers = Object.keys(users).length;

  const uids = useMemo(() => audienceUids(form, { users, entries }), [form, users, entries]);
  const recipients = useMemo(() => reachable(uids, users), [uids, users]);
  const url = destinationUrl(form);

  if (loading) return <PageLoader />;

  const selectedUser = form.uid ? users[form.uid] : null;
  const valid = form.title.trim().length >= 3 && form.body.trim().length >= 3 && recipients.length > 0
    && (form.destination !== 'challenge' || form.destinationChallengeId)
    && (form.audience !== 'challenge' || form.challengeId);

  const applyTemplate = (t) => {
    const active = challengeOptions.find((c) => c.active);
    set({
      title: t.title,
      body: t.body,
      destination: t.destination,
      destinationChallengeId: t.destination === 'challenge' ? (form.destinationChallengeId || active?.id || '') : '',
    });
  };

  const send = () => runAction(async () => {
    const result = await sendPushNotification(
      { uids: recipients, title: form.title.trim(), body: form.body.trim(), url },
      auditTargetFor(form),
      form.audience,
    );
    setLastResult(result);
    if (!result.sent) throw new Error(result.failed ? 'A Expo recusou o envio. Confirma as credenciais FCM no EAS.' : 'Nenhum dispositivo recebeu.');
  }, { success: 'Notificação enviada', error: 'Falha no envio' });

  return (
    <div>
      <PageHeader
        icon={Bell}
        title="Notificações"
        subtitle="Envia notificações push para os telemóveis dos utilizadores."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard title="Com notificações activas" value={withToken} total={totalUsers} icon={Smartphone} tone="green" />
        <StatCard title="Sem notificações" value={Math.max(0, totalUsers - withToken)} icon={BellOff} tone="yellow"
          hint="Recusaram a permissão ou ainda não abriram a versão nova" />
        <StatCard title="Destinatários desta mensagem" value={recipients.length} icon={Users} tone="blue" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
        <Card title="Nova notificação" icon={Send}>
          <div className="space-y-4">
            <div>
              <Label>Modelos</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-200">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <Label>Para quem</Label>
              <select className={`${selectClass} sm:w-full`} value={form.audience} onChange={(e) => set({ audience: e.target.value })}>
                {Object.entries(AUDIENCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>

            {form.audience === 'challenge' && (
              <label className="block">
                <Label>Desafio</Label>
                <select className={`${selectClass} sm:w-full`} value={form.challengeId} onChange={(e) => set({ challengeId: e.target.value })}>
                  <option value="">Escolhe um desafio…</option>
                  {challengeOptions.map((c) => <option key={c.id} value={c.id}>{c.active ? '● ' : ''}{c.title}</option>)}
                </select>
              </label>
            )}

            {form.audience === 'user' && (
              <div className="text-sm">
                {selectedUser ? (
                  <p className="text-gray-300">
                    Para <Link className="text-brand-400 hover:underline" to={`/ul/${form.uid}`}>@{selectedUser.username || form.uid}</Link>
                    {!canReceivePush(selectedUser) && <span className="text-amber-400"> · sem notificações activas</span>}
                  </p>
                ) : (
                  <p className="text-gray-500">Abre o perfil do utilizador em <Link className="text-brand-400 hover:underline" to="/ul">Utilizadores</Link> e usa “Enviar notificação”.</p>
                )}
              </div>
            )}

            <label className="block">
              <Label hint={`${form.title.length}/${TITLE_MAX}`}>Título</Label>
              <input className={inputClass} maxLength={TITLE_MAX} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: 📸 Novo desafio no VotaSnap!" />
            </label>

            <label className="block">
              <Label hint={`${form.body.length}/${BODY_MAX}`}>Mensagem</Label>
              <textarea className={`${inputClass} min-h-[90px] resize-y`} maxLength={BODY_MAX} value={form.body} onChange={(e) => set({ body: e.target.value })} placeholder="O que queres dizer?" />
            </label>

            <label className="block">
              <Label>Ao tocar, abre</Label>
              <select className={`${selectClass} sm:w-full`} value={form.destination} onChange={(e) => set({ destination: e.target.value })}>
                <option value="none">A app (ecrã inicial)</option>
                <option value="challenge">Um desafio</option>
                <option value="invite">Convidar amigos</option>
              </select>
            </label>

            {form.destination === 'challenge' && (
              <select aria-label="Desafio a abrir" className={`${selectClass} sm:w-full`} value={form.destinationChallengeId} onChange={(e) => set({ destinationChallengeId: e.target.value })}>
                <option value="">Escolhe um desafio…</option>
                {challengeOptions.map((c) => <option key={c.id} value={c.id}>{c.active ? '● ' : ''}{c.title}</option>)}
              </select>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button type="button" disabled={!valid} onClick={() => setConfirming(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-accent-600 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" /> Enviar a {formatNumber(recipients.length)} utilizador(es)
              </button>
              {uids.length > recipients.length && (
                <p className="text-xs text-gray-500">{formatNumber(uids.length - recipients.length)} do público não têm notificações activas.</p>
              )}
            </div>

            {lastResult && (
              <p className="text-xs text-gray-400 bg-white/5 rounded-xl px-3 py-2">
                Último envio: {lastResult.sent} entregue(s) à Expo em {lastResult.devices} dispositivo(s)
                {lastResult.failed ? `, ${lastResult.failed} falhada(s)` : ''}
                {lastResult.removed ? ` · ${lastResult.removed} token(s) antigo(s) removido(s)` : ''}.
              </p>
            )}
          </div>
        </Card>

        <Card title="Pré-visualização" icon={Smartphone}>
          <div className="rounded-2xl bg-ink-800 border border-white/5 p-3 flex gap-3">
            <img src="/logo192.png" alt="" className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">VotaSnap · agora</p>
              <p className="text-white text-sm font-semibold break-words">{form.title || 'Título da notificação'}</p>
              <p className="text-gray-300 text-sm break-words">{form.body || 'A mensagem aparece aqui.'}</p>
            </div>
          </div>
          <ul className="text-xs text-gray-500 mt-4 space-y-1.5 list-disc pl-4">
            <li>Usa com moderação: notificações a mais levam as pessoas a desactivá-las.</li>
            <li>Utilizadores banidos ou com eliminação pedida nunca recebem.</li>
            <li>Cada envio fica no Registo de acções.</li>
          </ul>
        </Card>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Enviar notificação?"
          message={`"${form.title.trim()}" vai ser enviada a ${formatNumber(recipients.length)} utilizador(es). Não é possível anular.`}
          confirmLabel="Enviar"
          variant="primary"
          onConfirm={send}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
