// Rótulos do registo de acções (adminAudit). Chave = `action` gravada em actions.js.
export const AUDIT_ACTIONS = {
  'user.ban': { label: 'Baniu', group: 'Utilizadores' },
  'user.unban': { label: 'Levantou banimento de', group: 'Utilizadores' },
  'user.warn': { label: 'Avisou', group: 'Utilizadores' },
  'user.snaps': { label: 'Acertou Snaps de', group: 'Utilizadores' },
  'user.note': { label: 'Adicionou nota a', group: 'Utilizadores' },
  'user.note_delete': { label: 'Apagou nota de', group: 'Utilizadores' },
  'challenge.create': { label: 'Criou o desafio', group: 'Desafios' },
  'challenge.end': { label: 'Encerrou o desafio', group: 'Desafios' },
  'challenge.reactivate': { label: 'Reactivou o desafio', group: 'Desafios' },
  'challenge.delete': { label: 'Apagou o desafio', group: 'Desafios' },
  'winner.confirm': { label: 'Confirmou o vencedor de', group: 'Vencedores' },
  'winner.tie': { label: 'Resolveu o empate de', group: 'Vencedores' },
  'winner.revert': { label: 'Reverteu o desafio', group: 'Vencedores' },
  'sponsor.save': { label: 'Guardou a marca', group: 'Marcas' },
  'sponsor.activate': { label: 'Activou a marca', group: 'Marcas' },
  'sponsor.deactivate': { label: 'Desactivou a marca', group: 'Marcas' },
  'deal.update': { label: 'Alterou o acordo de', group: 'Marcas' },
  'report.dismiss': { label: 'Arquivou a denúncia', group: 'Moderação' },
  'report.remove_entry': { label: 'Removeu publicação de', group: 'Moderação' },
};

export const AUDIT_GROUPS = [...new Set(Object.values(AUDIT_ACTIONS).map((a) => a.group))];

// Nome legível do alvo de um registo, a partir dos dados já carregados.
export function auditTargetLabel(target, { users = {}, challenges = {}, sponsors = {} }) {
  if (!target?.id) return '—';
  if (target.type === 'user') return users[target.id]?.username ? `@${users[target.id].username}` : target.id;
  if (target.type === 'challenge') return challenges[target.id]?.title ? `"${challenges[target.id].title}"` : target.id;
  if (target.type === 'sponsor') return sponsors[target.id]?.name || target.id;
  return target.id;
}

export function auditTargetLink(target, { challenges = {} } = {}) {
  if (!target?.id) return null;
  if (target.type === 'user') return `/ul/${target.id}`;
  if (target.type === 'sponsor') return `/marcas/${target.id}`;
  if (target.type === 'challenge' && challenges[target.id]) return `/cl?q=${encodeURIComponent(challenges[target.id].title || '')}`;
  return null;
}

// Resumo dos detalhes guardados (motivo, valor, prazo).
export function auditDetails(entry) {
  const d = entry.details || {};
  const parts = [];
  if (d.amount != null) parts.push(`${d.amount > 0 ? '+' : ''}${d.amount} Snaps`);
  if (d.reason) parts.push(d.reason);
  if (entry.action === 'user.ban') parts.push(d.until ? `até ${new Date(d.until).toLocaleDateString('pt-MZ')}` : 'permanente');
  if (d.amountMzn != null) parts.push(`${d.amountMzn} MZN`);
  if (d.paymentStatus) parts.push(d.paymentStatus === 'paid' ? 'pago' : 'por pagar');
  return parts.join(' · ');
}
