import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { ScrollText, Search } from 'lucide-react';
import { db } from '../fb';
import { useAdminData } from '../data/AdminDataProvider';
import { AUDIT_ACTIONS, AUDIT_GROUPS, auditDetails, auditTargetLabel, auditTargetLink } from '../data/audit';
import { errorMessage } from '../utils/runAction';
import { formatDateTime } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';
import { selectClass } from './ui/fields';

const LIMIT = 500;

const GROUP_TONES = { Utilizadores: 'blue', Desafios: 'brand', Vencedores: 'amber', Marcas: 'green', Moderação: 'red' };

export default function AuditLog() {
  const data = useAdminData();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');

  // Lido só nesta página (não no provider): pode crescer muito.
  useEffect(() => onValue(
    query(ref(db, 'adminAudit'), limitToLast(LIMIT)),
    (snap) => {
      const list = Object.entries(snap.val() || {}).map(([id, e]) => ({ id, ...e }));
      setEntries(list.sort((a, b) => (b.at || 0) - (a.at || 0)));
    },
    (err) => setError(errorMessage(err)),
  ), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (entries || []).filter((e) => {
      const meta = AUDIT_ACTIONS[e.action];
      if (group !== 'all' && meta?.group !== group) return false;
      if (!q) return true;
      const haystack = [e.by?.email, meta?.label, auditTargetLabel(e.target, data), auditDetails(e)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, group, search, data]);

  if (!entries && !error) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader icon={ScrollText} title="Registo de acções" subtitle={`Últimas ${LIMIT} acções feitas no painel, de todos os administradores.`} />

      {error && <p role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="flex items-center gap-2 bg-ink-800 border border-white/5 rounded-xl px-3 flex-1 focus-within:border-brand-500">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="sr-only">Pesquisar</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-white outline-none text-sm"
            placeholder="Administrador, utilizador, desafio ou motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select aria-label="Filtrar por área" className={selectClass} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">Todas as áreas</option>
          {AUDIT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-ink-900 border border-white/5 rounded-2xl divide-y divide-white/5">
        {filtered.length === 0 && (
          <EmptyState icon={ScrollText} title="Sem registos" hint="As acções feitas a partir de agora aparecem aqui." />
        )}
        {filtered.map((e) => {
          const meta = AUDIT_ACTIONS[e.action] || { label: e.action, group: 'Outros' };
          const link = auditTargetLink(e.target, data);
          const target = auditTargetLabel(e.target, data);
          const details = auditDetails(e);
          return (
            <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <div className="sm:w-28 flex-shrink-0"><Badge tone={GROUP_TONES[meta.group] || 'gray'}>{meta.group}</Badge></div>
              <div className="flex-1 min-w-0 text-sm">
                <p className="text-gray-300 break-words">
                  <span className="text-white font-medium">{e.by?.email || 'Admin'}</span>
                  {' '}{meta.label.toLowerCase()}{' '}
                  {link ? <Link to={link} className="text-brand-400 hover:underline">{target}</Link> : <span className="text-white">{target}</span>}
                </p>
                {details && <p className="text-gray-500 text-xs mt-1 break-words">{details}</p>}
              </div>
              <span className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(e.at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
