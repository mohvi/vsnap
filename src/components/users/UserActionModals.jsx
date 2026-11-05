import { useState } from 'react';
import { adjustSnaps, banUsers, warnUsers } from '../../data/actions';
import { BAN_DURATIONS, banUntil } from '../../data/users';
import { runAction } from '../../utils/runAction';
import { formatNumber } from '../../utils/format';
import Modal, { ModalButton } from '../ui/Modal';
import { inputClass } from '../ui/fields';

const who = (users) => (users.length === 1 ? `@${users[0].username || users[0].uid}` : `${users.length} utilizadores`);

function useSubmit(onClose) {
  const [busy, setBusy] = useState(false);
  const submit = async (fn, success) => {
    setBusy(true);
    const ok = await runAction(fn, { success });
    setBusy(false);
    if (ok) onClose();
  };
  return [busy, submit];
}

export function BanModal({ users, onClose }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7');
  const [busy, submit] = useSubmit(onClose);

  return (
    <Modal
      title={users.length === 1 ? 'Banir utilizador' : `Banir ${users.length} utilizadores`}
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton
            variant="danger"
            disabled={busy}
            onClick={() => submit(() => banUsers(users.map((u) => u.uid), reason, banUntil(duration)), `${who(users)} banido(s)`)}
          >
            {busy ? 'A banir...' : 'Banir'}
          </ModalButton>
        </>
      )}
    >
      <p className="text-gray-400 text-sm mb-4">{who(users)} deixa(m) de conseguir entrar na app.</p>
      <p className="text-gray-300 text-xs font-medium mb-2">Duração</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {BAN_DURATIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDuration(d.value)}
            className={`py-2 rounded-xl text-sm border transition-colors ${
              duration === d.value ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-gray-300 text-xs font-medium">Motivo</span>
        <textarea
          rows={3}
          className={`${inputClass} mt-2`}
          placeholder="Ex.: contas falsas para votar"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {duration !== 'permanent' && (
        <p className="text-gray-500 text-xs mt-2">
          Quando o prazo terminar, o painel avisa para levantares o banimento: a app só reconhece contas banidas ou não.
        </p>
      )}
    </Modal>
  );
}

export function WarnModal({ users, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, submit] = useSubmit(onClose);
  const valid = reason.trim().length >= 5;

  return (
    <Modal
      title={users.length === 1 ? 'Avisar utilizador' : `Avisar ${users.length} utilizadores`}
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton
            variant="primary"
            disabled={busy || !valid}
            onClick={() => submit(() => warnUsers(users.map((u) => u.uid), reason), `Aviso registado para ${who(users)}`)}
          >
            {busy ? 'A registar...' : 'Registar aviso'}
          </ModalButton>
        </>
      )}
    >
      <p className="text-gray-400 text-sm mb-4">
        O aviso fica na conta de {who(users)}, conta para o histórico e é enviado por notificação com o motivo. Usa-o antes de banir.
      </p>
      <label className="block">
        <span className="text-gray-300 text-xs font-medium">Motivo do aviso</span>
        <textarea
          rows={3}
          className={`${inputClass} mt-2`}
          placeholder="Ex.: publicação fora do tema do desafio"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </Modal>
  );
}

export function SnapsModal({ user, onClose }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, submit] = useSubmit(onClose);
  const value = Number(amount);
  const current = user.snaps || 0;
  const valid = Number.isInteger(value) && value !== 0 && current + value >= 0 && reason.trim().length >= 3;

  return (
    <Modal
      title="Acertar Snaps"
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton
            variant="primary"
            disabled={busy || !valid}
            onClick={() => submit(() => adjustSnaps(user.uid, value, reason), 'Snaps actualizados')}
          >
            {busy ? 'A guardar...' : 'Guardar'}
          </ModalButton>
        </>
      )}
    >
      <p className="text-gray-400 text-sm mb-4">
        Saldo actual de @{user.username || user.uid}: <span className="text-yellow-400 font-semibold">{formatNumber(current)} Snaps</span>
      </p>
      <label className="block mb-4">
        <span className="text-gray-300 text-xs font-medium">Quantidade (negativo para retirar)</span>
        <input
          type="number"
          step="1"
          className={`${inputClass} mt-2`}
          placeholder="Ex.: 20 ou -10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      {amount !== '' && Number.isInteger(value) && value !== 0 && (
        <p className={`text-xs mb-4 ${current + value < 0 ? 'text-red-400' : 'text-gray-500'}`}>
          {current + value < 0 ? 'O saldo não pode ficar negativo.' : `Novo saldo: ${formatNumber(current + value)} Snaps`}
        </p>
      )}
      <label className="block">
        <span className="text-gray-300 text-xs font-medium">Motivo (fica no histórico)</span>
        <input
          className={`${inputClass} mt-2`}
          placeholder="Ex.: compensação por erro na contagem"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </Modal>
  );
}
