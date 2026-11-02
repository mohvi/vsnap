import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShieldOff, Coins, MapPin, Ban, AlertTriangle, BadgeCheck, Users, Download,
  MessageSquareWarning, X, Image as ImageIcon, Vote, Flag,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { unbanUsers } from '../data/actions';
import {
  ACTIVITY_FILTERS, SORTS, STATUS_FILTERS, buildUserIndex, buildUsersCsv, filterUsers, indexRow, isBanExpired, sortUsers,
} from '../data/users';
import { runAction } from '../utils/runAction';
import { downloadCsv } from '../utils/csv';
import { provinceName } from '../utils/provinces';
import { formatDate, formatNumber, timeAgo } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import Avatar from './ui/Avatar';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import { selectClass } from './ui/fields';
import { BanModal, WarnModal } from './users/UserActionModals';

const PAGE_SIZE = 50;

function StatusBadges({ user }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {user.banned
        ? <Badge tone="red">{user.bannedUntil ? `Banido até ${formatDate(user.bannedUntil)}` : 'Banido'}</Badge>
        : <Badge tone="green">Activo</Badge>}
      {isBanExpired(user) && <Badge tone="amber">Prazo terminou</Badge>}
      {user.riskFlags?.sharedPushToken && (
        <Badge tone="amber" icon={AlertTriangle} title="Aparelho partilhado com outra conta">Risco</Badge>
      )}
      {(user.warningsCount || 0) > 0 && <Badge tone="amber" icon={MessageSquareWarning}>{user.warningsCount}</Badge>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <select aria-label={label} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export default function UsersList() {
  const navigate = useNavigate();
  const { loading, users, entries, votes, reports } = useAdminData();
  const [filters, setFilters] = useState({ search: '', status: 'all', activity: 'all', province: 'all', city: 'all' });
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(() => new Set());
  const [modal, setModal] = useState(null); // { type: 'ban' | 'warn', users: [] }
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'province' ? { city: 'all' } : {}) }));
    setVisibleCount(PAGE_SIZE);
  };

  const list = useMemo(() => Object.entries(users).map(([uid, u]) => ({ ...u, uid })), [users]);
  const index = useMemo(() => buildUserIndex({ users, entries, votes, reports }), [users, entries, votes, reports]);

  const provinces = useMemo(() => [...new Set(list.map((u) => u.province).filter(Boolean))].sort(), [list]);
  const cities = useMemo(() => {
    const source = filters.province === 'all' ? list : list.filter((u) => u.province === filters.province);
    return [...new Set(source.map((u) => u.city).filter(Boolean))].sort();
  }, [list, filters.province]);

  const filtered = useMemo(
    () => sortUsers(filterUsers(list, filters, index), sort, index),
    [list, filters, index, sort],
  );

  const counts = useMemo(() => ({
    banned: list.filter((u) => u.banned).length,
    flagged: list.filter((u) => u.riskFlags?.sharedPushToken).length,
    expired: list.filter((u) => isBanExpired(u)).length,
  }), [list]);

  if (loading) return <PageLoader />;

  const visible = filtered.slice(0, visibleCount);
  const selectedUsers = list.filter((u) => selected.has(u.uid));
  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.uid));

  const toggle = (uid) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    return next;
  });
  const toggleAllVisible = () => setSelected((prev) => {
    const next = new Set(prev);
    visible.forEach((u) => (allVisibleSelected ? next.delete(u.uid) : next.add(u.uid)));
    return next;
  });
  const clearSelection = () => setSelected(new Set());

  const exportCsv = (rows) => {
    downloadCsv(`utilizadores-${new Date().toISOString().slice(0, 10)}.csv`, buildUsersCsv(rows, index));
  };

  const liftExpired = () => runAction(
    () => unbanUsers(list.filter((u) => isBanExpired(u)).map((u) => u.uid)),
    { success: 'Banimentos expirados levantados' },
  );

  const openUser = (uid) => navigate(`/ul/${uid}`);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Users}
        title="Utilizadores"
        subtitle={`${formatNumber(list.length)} utilizadores · ${counts.banned} banidos · ${counts.flagged} sinalizados`}
        actions={(
          <button
            onClick={() => exportCsv(filtered)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Exportar CSV ({formatNumber(filtered.length)})
          </button>
        )}
      />

      {counts.expired > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-200 text-sm flex-1">
            {counts.expired} banimento(s) temporário(s) já terminaram, mas as contas continuam bloqueadas na app.
          </p>
          <button onClick={liftExpired} className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-medium">
            Levantar todos
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 mb-4">
        <label className="flex items-center gap-2 bg-ink-800 border border-white/5 rounded-xl px-3 lg:flex-1 lg:min-w-[260px] focus-within:border-brand-500">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="sr-only">Pesquisar</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-white outline-none text-sm"
            placeholder="Nome, username, telefone ou ID..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-3">
          <Select label="Filtrar por estado" value={filters.status} onChange={(v) => setFilter('status', v)} options={STATUS_FILTERS} />
          <Select label="Filtrar por actividade" value={filters.activity} onChange={(v) => setFilter('activity', v)} options={ACTIVITY_FILTERS} />
          <Select
            label="Filtrar por província"
            value={filters.province}
            onChange={(v) => setFilter('province', v)}
            options={{ all: 'Todas as províncias', ...Object.fromEntries(provinces.map((p) => [p, provinceName(p)])) }}
          />
          <Select
            label="Filtrar por cidade"
            value={filters.city}
            onChange={(v) => setFilter('city', v)}
            options={{ all: 'Todas as cidades', ...Object.fromEntries(cities.map((c) => [c, c])) }}
          />
          <Select label="Ordenar" value={sort} onChange={setSort} options={SORTS} />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-4 p-3 bg-ink-800 border border-brand-500/30 rounded-xl flex flex-wrap items-center gap-2 shadow-lg">
          <span className="text-white text-sm font-medium mr-2">{selected.size} seleccionado(s)</span>
          <button onClick={() => setModal({ type: 'warn', users: selectedUsers })} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-sm inline-flex items-center gap-1.5">
            <MessageSquareWarning className="w-4 h-4" /> Avisar
          </button>
          <button onClick={() => setModal({ type: 'ban', users: selectedUsers.filter((u) => !u.banned) })} className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm inline-flex items-center gap-1.5">
            <Ban className="w-4 h-4" /> Banir
          </button>
          <button
            onClick={async () => {
              const ok = await runAction(() => unbanUsers(selectedUsers.filter((u) => u.banned).map((u) => u.uid)), { success: 'Banimentos levantados' });
              if (ok) clearSelection();
            }}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm inline-flex items-center gap-1.5"
          >
            <ShieldOff className="w-4 h-4" /> Levantar banimento
          </button>
          <button onClick={() => exportCsv(selectedUsers)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-sm inline-flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={clearSelection} aria-label="Limpar selecção" className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile: cartões */}
      <div className="md:hidden space-y-3">
        {visible.map((user) => {
          const row = indexRow(index, user.uid);
          return (
            <div key={user.uid} className="bg-ink-900 border border-white/5 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${user.username || user.uid}`}
                  checked={selected.has(user.uid)}
                  onChange={() => toggle(user.uid)}
                  className="mt-3 accent-brand-600"
                />
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => openUser(user.uid)}>
                  <Avatar user={user} size="w-11 h-11" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium flex items-center gap-1 truncate">
                      <span className="truncate">{user.name || 'Sem nome'}</span>
                      {user.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    </p>
                    <p className="text-gray-500 text-xs truncate">@{user.username || 'sem-username'}</p>
                  </div>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-x-4 gap-y-2 flex-wrap text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{user.city || '—'}</span>
                <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3 h-3" />{user.snaps || 0}</span>
                <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" />{row.entriesCount}</span>
                <span className="flex items-center gap-1"><Vote className="w-3 h-3" />{row.votesCount}</span>
                {row.reportsReceived > 0 && <span className="flex items-center gap-1 text-red-400"><Flag className="w-3 h-3" />{row.reportsReceived}</span>}
              </div>
              <div className="mt-3"><StatusBadges user={user} /></div>
            </div>
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-ink-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th scope="col" className="p-4 w-10">
                <input type="checkbox" aria-label="Seleccionar todos os visíveis" checked={allVisibleSelected} onChange={toggleAllVisible} className="accent-brand-600" />
              </th>
              {['Utilizador', 'Localização', 'Snaps', 'Publicações', 'Votos', 'Última actividade', 'Registo', 'Estado'].map((h) => (
                <th key={h} scope="col" className="p-4 text-xs text-gray-500 font-medium uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => {
              const row = indexRow(index, user.uid);
              return (
                <tr
                  key={user.uid}
                  className={`border-b border-white/5 cursor-pointer ${selected.has(user.uid) ? 'bg-brand-500/5' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => openUser(user.uid)}
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${user.username || user.uid}`}
                      checked={selected.has(user.uid)}
                      onChange={() => toggle(user.uid)}
                      className="accent-brand-600"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium flex items-center gap-1">
                          {user.name || 'Sem nome'}
                          {user.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </p>
                        <p className="text-gray-500 text-xs">@{user.username || 'sem-username'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{[user.city, provinceName(user.province)].filter(Boolean).join(', ') || '—'}</td>
                  <td className="p-4 text-yellow-400 text-sm font-medium tabular-nums">{formatNumber(user.snaps || 0)}</td>
                  <td className="p-4 text-gray-300 text-sm tabular-nums">{row.entriesCount}</td>
                  <td className="p-4 text-gray-300 text-sm tabular-nums">{row.votesCount}</td>
                  <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{row.lastActiveAt ? `há ${timeAgo(row.lastActiveAt)}` : '—'}</td>
                  <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="p-4"><StatusBadges user={user} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <EmptyState icon={Users} title="Nenhum utilizador encontrado" hint="Experimenta mudar os filtros." />}

      {filtered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium"
        >
          Mostrar mais ({formatNumber(filtered.length - visibleCount)} restantes)
        </button>
      )}

      {modal?.type === 'ban' && modal.users.length > 0 && (
        <BanModal users={modal.users} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'warn' && (
        <WarnModal users={modal.users} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
