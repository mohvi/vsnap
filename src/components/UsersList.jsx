import { useMemo, useState } from 'react';
import {
  Search, ShieldOff, Coins, Trophy, Vote, Phone, Calendar, MapPin, CheckCircle2,
  Ban, AlertTriangle, Image as ImageIcon, ExternalLink, Smartphone, BadgeCheck, Users,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { banUser, unbanUser } from '../data/actions';
import { getUserEntries, getUserVotesGiven } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { formatDate } from '../utils/format';
import { DAY_MS } from '../config';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import Modal, { ModalButton } from './ui/Modal';
import Avatar from './ui/Avatar';

const PAGE_SIZE = 50;
const selectClass = 'bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 w-full sm:w-auto min-w-0';

function StatusBadges({ user }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {user.banned ? (
        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">Banido</span>
      ) : (
        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Activo</span>
      )}
      {user.riskFlags?.sharedPushToken && (
        <span title="Aparelho partilhado com outra conta" className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Risco
        </span>
      )}
    </div>
  );
}

function BanToggle({ user, onBan }) {
  if (user.banned) {
    return (
      <button
        onClick={() => runAction(() => unbanUser(user.uid), { success: `@${user.username || user.uid} desbanido` })}
        aria-label="Desbanir"
        title="Desbanir"
        className="p-2.5 sm:p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
      >
        <ShieldOff className="w-4 h-4" />
      </button>
    );
  }
  return (
    <button
      onClick={() => onBan(user)}
      aria-label="Banir"
      title="Banir"
      className="p-2.5 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
    >
      <Ban className="w-4 h-4" />
    </button>
  );
}

export default function UsersList() {
  const { loading, users, challenges, entries, votes } = useAdminData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvince, setFilterProvince] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [selectedUid, setSelectedUid] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const list = useMemo(
    () => Object.entries(users).map(([uid, u]) => ({ ...u, uid })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [users],
  );

  const provinces = useMemo(() => [...new Set(list.map((u) => u.province).filter(Boolean))].sort(), [list]);

  const cities = useMemo(() => {
    const source = filterProvince === 'all' ? list : list.filter((u) => u.province === filterProvince);
    return [...new Set(source.map((u) => u.city).filter(Boolean))].sort();
  }, [list, filterProvince]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      const matchesSearch = !q
        || u.name?.toLowerCase().includes(q)
        || u.username?.toLowerCase().includes(q)
        || u.phone?.includes(q);
      const matchesStatus = filterStatus === 'all'
        || (filterStatus === 'banned' && u.banned)
        || (filterStatus === 'active' && !u.banned)
        || (filterStatus === 'flagged' && u.riskFlags?.sharedPushToken)
        || (filterStatus === 'fake' && u.isFake);
      const matchesProvince = filterProvince === 'all' || u.province === filterProvince;
      const matchesCity = filterCity === 'all' || u.city === filterCity;
      return matchesSearch && matchesStatus && matchesProvince && matchesCity;
    });
  }, [list, search, filterStatus, filterProvince, filterCity]);

  const bannedCount = useMemo(() => list.filter((u) => u.banned).length, [list]);
  const flaggedCount = useMemo(() => list.filter((u) => u.riskFlags?.sharedPushToken).length, [list]);

  if (loading) return <PageLoader />;

  // Lê sempre a versão mais recente do utilizador (ex.: depois de banir no modal).
  const selectedUser = selectedUid ? { ...users[selectedUid], uid: selectedUid } : null;
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <PageHeader
        icon={Users}
        title="Utilizadores"
        subtitle={`${list.length} utilizadores · ${bannedCount} banidos · ${flaggedCount} sinalizados`}
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        <label className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 sm:flex-1 sm:min-w-[240px] focus-within:border-purple-500">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="sr-only">Pesquisar</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-white outline-none text-sm"
            placeholder="Nome, username ou telefone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
          />
        </label>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 sm:flex gap-3">
          <select aria-label="Filtrar por estado" className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Todos os estados</option>
            <option value="active">Activos</option>
            <option value="banned">Banidos</option>
            <option value="flagged">Sinalizados (risco)</option>
            <option value="fake">Fake (mock)</option>
          </select>
          <select
            aria-label="Filtrar por província"
            className={selectClass}
            value={filterProvince}
            onChange={(e) => { setFilterProvince(e.target.value); setFilterCity('all'); }}
          >
            <option value="all">Todas as províncias</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label="Filtrar por cidade" className={selectClass} value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="all">Todas as cidades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile: cartões */}
      <div className="md:hidden space-y-3">
        {visible.map((user) => (
          <div key={user.uid} className="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setSelectedUid(user.uid)}>
                <Avatar user={user} size="w-11 h-11" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium flex items-center gap-1 truncate">
                    <span className="truncate">{user.name || 'Sem nome'}</span>
                    {user.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                  </p>
                  <p className="text-gray-500 text-xs truncate">@{user.username || 'sem-username'}</p>
                </div>
              </button>
              <BanToggle user={user} onBan={setBanTarget} />
            </div>
            <div className="mt-3 flex items-center gap-x-4 gap-y-2 flex-wrap text-xs text-gray-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{user.city || '—'}{user.province ? `, ${user.province}` : ''}</span>
              <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3 h-3" />{user.snaps || 0}</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="mt-3"><StatusBadges user={user} /></div>
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-slate-900 border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {['Utilizador', 'Localização', 'Telefone', 'Snaps', 'Registado em', 'Estado', ''].map((h) => (
                <th key={h} scope="col" className="p-4 text-xs text-gray-500 font-medium uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.uid} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedUid(user.uid)}>
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
                <td className="p-4 text-gray-400 text-sm">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.city || '—'}{user.province ? `, ${user.province}` : ''}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{user.phone || '—'}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
                    <Coins className="w-3.5 h-3.5" />
                    {user.snaps || 0}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{formatDate(user.createdAt)}</td>
                <td className="p-4"><StatusBadges user={user} /></td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <BanToggle user={user} onBan={setBanTarget} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <div className="text-center py-16 text-gray-500">Nenhum utilizador encontrado</div>}

      {filtered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium"
        >
          Mostrar mais ({filtered.length - visibleCount} restantes)
        </button>
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          entries={getUserEntries(selectedUser.uid, entries, challenges)}
          votesGiven={getUserVotesGiven(selectedUser.uid, votes, challenges)}
          onClose={() => setSelectedUid(null)}
        />
      )}

      {banTarget && <BanModal user={banTarget} onClose={() => setBanTarget(null)} />}
    </div>
  );
}

function UserDetailModal({ user, entries, votesGiven, onClose }) {
  const [tab, setTab] = useState('entries');
  const ageDays = user.createdAt ? Math.floor((Date.now() - user.createdAt) / DAY_MS) : null;

  return (
    <Modal title="Perfil do utilizador" size="lg" onClose={onClose}>
      <div className="flex items-center gap-4 mb-5">
        <Avatar user={user} size="w-14 h-14 sm:w-16 sm:h-16" textSize="text-2xl" />
        <div className="min-w-0">
          <p className="text-white font-bold text-lg flex items-center gap-1.5">
            <span className="truncate">{user.name || 'Sem nome'}</span>
            {user.verified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
          </p>
          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
          {(user.city || user.province) && (
            <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {[user.city, user.province].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {user.bio && <p className="text-gray-400 text-sm mb-4 p-3 bg-white/5 rounded-xl break-words">{user.bio}</p>}

      {user.riskFlags?.sharedPushToken && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-amber-400 text-sm font-medium">Aparelho partilhado com outra conta</p>
            {Array.isArray(user.riskFlags.sharedWithUids) && (
              <p className="text-amber-400/70 text-xs mt-0.5 break-all">Mesmo push token que: {user.riskFlags.sharedWithUids.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {[
          [Coins, 'text-yellow-400', user.snaps || 0, 'Snaps'],
          [Trophy, 'text-purple-400', user.wins || 0, 'Vitórias'],
          [Vote, 'text-pink-400', votesGiven.length, 'Votos dados'],
        ].map(([Icon, color, value, label]) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className="text-white font-bold">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm mb-5">
        <div className="flex items-center gap-2 text-gray-400">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          {user.phone || 'Não disponível'}
        </div>
        <div className="flex items-start gap-2 text-gray-400 flex-wrap">
          <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Registado em {formatDate(user.createdAt)}</span>
          {ageDays !== null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${ageDays < 7 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-gray-500'}`}>
              {ageDays} dia{ageDays !== 1 ? 's' : ''} de conta
              {ageDays < 7 ? ' — ainda não pode votar em desafios pagos' : ''}
            </span>
          )}
        </div>
        {user.phoneVerifiedAt && (
          <div className="flex items-center gap-2 text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            Telefone verificado em {formatDate(user.phoneVerifiedAt)}
          </div>
        )}
      </div>

      <div role="tablist" className="flex gap-2 mb-3 border-b border-white/10">
        {[['entries', `Entradas (${entries.length})`], ['votes', `Votos dados (${votesGiven.length})`]].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'entries' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entries.length === 0 && <p className="text-gray-600 text-sm py-4 text-center">Sem entradas submetidas.</p>}
          {entries.map((e) => (
            <div key={e.entryId} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
              {e.mediaType === 'photo' ? (
                <img src={e.mediaUrl} alt={e.caption || 'Entrada'} loading="lazy" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{e.challengeTitle}</p>
                <p className="text-gray-500 text-xs truncate">{e.caption}</p>
              </div>
              <span className="text-xs text-purple-400 font-medium flex items-center gap-1 flex-shrink-0">
                <Vote className="w-3 h-3" /> {e.votes || 0}
              </span>
              {e.mediaUrl && (
                <a href={e.mediaUrl} target="_blank" rel="noreferrer" aria-label="Abrir ficheiro" className="p-1 text-gray-500 hover:text-white flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'votes' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {votesGiven.length === 0 && <p className="text-gray-600 text-sm py-4 text-center">Ainda não votou em nada.</p>}
          {votesGiven.map((v) => (
            <div key={v.challengeId} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg p-2.5">
              <span className="text-white text-sm truncate">{v.challengeTitle}</span>
              <span className="text-gray-500 text-xs flex-shrink-0">{formatDate(v.votedAt)}</span>
            </div>
          ))}
        </div>
      )}

      {user.banned && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm font-medium">Conta banida</p>
          <p className="text-red-400/70 text-xs mt-1 break-words">{user.banReason}</p>
        </div>
      )}
    </Modal>
  );
}

function BanModal({ user, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleBan = async () => {
    setBusy(true);
    const ok = await runAction(() => banUser(user.uid, reason), { success: `@${user.username || user.uid} banido` });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Banir utilizador?"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose} disabled={busy}>Cancelar</ModalButton>
          <ModalButton variant="danger" onClick={handleBan} disabled={busy}>{busy ? 'A banir...' : 'Banir'}</ModalButton>
        </>
      )}
    >
      <p className="text-gray-400 text-sm mb-4">
        {user.name} (@{user.username}) não poderá mais aceder à conta.
      </p>
      <label className="block">
        <span className="sr-only">Motivo do banimento</span>
        <textarea
          className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-red-500 text-sm"
          placeholder="Motivo do banimento..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </Modal>
  );
}
