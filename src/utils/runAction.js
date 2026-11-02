import { toast } from 'sonner';

const FIREBASE_MESSAGES = {
  PERMISSION_DENIED: 'Sem permissão para esta operação. Confirma que a tua conta é admin.',
  'permission-denied': 'Sem permissão para esta operação. Confirma que a tua conta é admin.',
  'storage/unauthorized': 'Sem permissão para escrever no Storage.',
  'storage/canceled': 'Upload cancelado.',
};

export function errorMessage(err) {
  return FIREBASE_MESSAGES[err?.code] || err?.message || 'Ocorreu um erro inesperado.';
}

// Executa uma escrita no Firebase com feedback ao utilizador.
// Devolve true/false em vez de lançar, para os handlers ficarem simples.
export async function runAction(fn, { success, error = 'Não foi possível concluir a operação' } = {}) {
  try {
    await fn();
    if (success) toast.success(success);
    return true;
  } catch (err) {
    console.error(err);
    toast.error(error, { description: errorMessage(err) });
    return false;
  }
}
