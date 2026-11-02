import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal, { ModalButton } from './Modal';

// Substitui window.confirm. `onConfirm` pode ser async — o botão fica
// desactivado enquanto corre, o que evita cliques duplos.
export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirmar', variant = 'danger', onConfirm, onClose,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      // Uma acção que devolve false falhou (o erro já foi mostrado em toast) — mantém o diálogo aberto.
      const ok = await onConfirm();
      if (ok !== false) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton variant={variant} onClick={handleConfirm} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </span>
          </ModalButton>
        </>
      )}
    >
      <div className="text-gray-400 text-sm">{message}</div>
    </Modal>
  );
}
