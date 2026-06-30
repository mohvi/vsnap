import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import {
  Search, Shield, ShieldOff, Coins, Trophy, Vote,
  Phone, Calendar, MapPin, CheckCircle2, Ban, AlertTriangle,
  Image as ImageIcon, ExternalLink, Smartphone, BadgeCheck,
} from 'lucide-react';
import { db } from '../fb';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [challenges, setChallenges] = useState({});
  const [entries, setEntries] = useState({}); // entries/{challengeId}/{entryId}
  const [votes, setVotes] = useState({}); // votes/{challengeId}/{userId}
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvince, setFilterProvince] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmBan, setConfirmBan] = useState(null);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), snapshot => {
      if (!snapshot.exists()) {
        setUsers([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const list = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUsers(list);
      setLoading(false);
    });
    const unsubChallenges = onValue(ref(db, 'challenges'), snap => setChallenges(snap.val() || {}));
    const unsubEntries = onValue(ref(db, 'entries'), snap => setEntries(snap.val() || {}));
    const unsubVotes = onValue(ref(db, 'votes'), snap => setVotes(snap.val() || {}));
    return () => {
      unsubUsers();
      unsubChallenges();
      unsubEntries();
      unsubVotes();
    };
  }, []);

  const handleBan = async (uid, reason) => {
    await update(ref(db, `users/${uid}`), {
      banned: true,
      bannedAt: Date.now(),
      banReason: reason || 'Violação dos termos de uso',
    });
    setConfirmBan(null);
  };

  const handleUnban = async (uid) => {
    await update(ref(db, `users/${uid}`), {
      banned: false,
      bannedAt: null,
      banReason: null,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('pt-MZ', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const accountAgeDays = (createdAt) => {
    if (!createdAt) return null;
    return Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  };

  // ── Listas de províncias/cidades disponíveis, geradas dos próprios dados ──
  // Em vez de hardcodar as 11 províncias, derivamos só as que têm pelo
  // menos um utilizador — evita filtros vazios e funciona com qualquer
  // conjunto real de dados.
  const provinces = useMemo(() => {
    const set = new Set(users.map(u => u.province).filter(Boolean));
    return Array.from(set).sort();
  }, [users]);

  const citiesForSelectedProvince = useMemo(() => {
    if (filterProvince === 'all') {
      const set = new Set(users.map(u => u.city).filter(Boolean));
      return Array.from(set).sort();
    }
    const set = new Set(
      users.filter(u => u.province === filterProvince).map(u => u.city).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [users, filterProvince]);

  // ── Entradas e votos de um utilizador específico — usados só no modal ──
  // Percorre entries/ e votes/ (que já têm o userId gravado) e junta com
  // o título do desafio correspondente, em vez de guardar isso duplicado
  // no próprio user.
  const getUserEntries = (uid) => {
    const result = [];
    Object.entries(entries).forEach(([challengeId, challengeEntries]) => {
      Object.entries(challengeEntries || {}).forEach(([entryId, e]) => {
        if (e.userId === uid) {
          result.push({
            entryId,
            challengeId,
            challengeTitle: challenges[challengeId]?.title || challengeId,
            ...e,
          });
        }
      });
    });
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  const getUserVotesGiven = (uid) => {
    const result = [];
    Object.entries(votes).forEach(([challengeId, challengeVotes]) => {
      const v = challengeVotes?.[uid];
      if (v) {
        result.push({
          challengeId,
          challengeTitle: challenges[challengeId]?.title || challengeId,
          votedEntryId: v.entryId,
          votedAt: v.votedAt,
        });
      }
    });
    return result.sort((a, b) => (b.votedAt || 0) - (a.votedAt || 0));
  };

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'banned' && u.banned) ||
      (filterStatus === 'active' && !u.banned) ||
      (filterStatus === 'flagged' && u.riskFlags?.sharedPushToken);

    const matchesProvince = filterProvince === 'all' || u.province === filterProvince;
    const matchesCity = filterCity === 'all' || u.city === filterCity;

    return matchesSearch && matchesStatus && matchesProvince && matchesCity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilizadores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} utilizadores · {users.filter(u => u.banned).length} banidos · {users.filter(u => u.riskFlags?.sharedPushToken).length} sinalizados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="w-full bg-transparent p-3 text-white outline-none text-sm"
            placeholder="Buscar por nome, username ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos os estados</option>
          <option value="active">Activos</option>
          <option value="banned">Banidos</option>
          <option value="flagged">Sinalizados (risco)</option>
        </select>

        <select
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
          value={filterProvince}
          onChange={(e) => { setFilterProvince(e.target.value); setFilterCity('all'); }}
        >
          <option value="all">Todas as províncias</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="all">Todas as cidades</option>
          {citiesForSelectedProvince.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Utilizador</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Localização</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Telefone</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Snaps</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Registado em</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Estado</th>
              <th className="p-4 text-xs text-gray-500 font-medium uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr
                key={user.uid}
                className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                onClick={() => setSelectedUser(user)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
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
                <td className="p-4 text-gray-400 text-sm">{user.phone || '—'}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
                    <Coins className="w-3.5 h-3.5" />
                    {user.snaps || 0}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {user.banned ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                        Banido
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                        Activo
                      </span>
                    )}
                    {user.riskFlags?.sharedPushToken && (
                      <span title="Aparelho partilhado com outra conta" className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Risco
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  {user.banned ? (
                    <button
                      onClick={() => handleUnban(user.uid)}
                      className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-all"
                      title="Desbanir"
                    >
                      <ShieldOff className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmBan(user)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      title="Banir"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            Nenhum utilizador encontrado
          </div>
        )}
      </div>

      {/* Modal perfil detalhado — agora com entradas, votos dados e sinais de risco reais */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          entries={getUserEntries(selectedUser.uid)}
          votesGiven={getUserVotesGiven(selectedUser.uid)}
          accountAgeDays={accountAgeDays(selectedUser.createdAt)}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Modal confirmar ban */}
      {confirmBan && (
        <BanModal
          user={confirmBan}
          onConfirm={handleBan}
          onClose={() => setConfirmBan(null)}
        />
      )}
    </div>
  );
}

function UserDetailModal({ user, entries, votesGiven, accountAgeDays, onClose }) {
  const [tab, setTab] = useState('overview'); // overview | entries | votes

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">

        <div className="flex items-center gap-4 mb-6">
          {user.avatar ? (
            <img src={user.avatar} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-1.5">
              {user.name}
              {user.verified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
            </h3>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {user.city}, {user.province}
            </p>
          </div>
        </div>

        {user.bio && (
          <p className="text-gray-400 text-sm mb-4 p-3 bg-white/5 rounded-xl">{user.bio}</p>
        )}

        {/* Alerta de risco — mesmo sinal de partilha de aparelho que já gravamos no registo */}
        {user.riskFlags?.sharedPushToken && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <p className="text-amber-400 text-sm font-medium">Aparelho partilhado com outra conta</p>
              {user.riskFlags.sharedWithUids && (
                <p className="text-amber-400/70 text-xs mt-0.5">
                  Mesmo push token que: {user.riskFlags.sharedWithUids.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <Coins className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-white font-bold">{user.snaps || 0}</p>
            <p className="text-gray-500 text-xs">Snaps</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <Trophy className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-white font-bold">{user.wins || 0}</p>
            <p className="text-gray-500 text-xs">Vitórias</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <Vote className="w-4 h-4 text-pink-400 mx-auto mb-1" />
            <p className="text-white font-bold">{votesGiven.length}</p>
            <p className="text-gray-500 text-xs">Votos dados</p>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-5">
          <div className="flex items-center gap-2 text-gray-400">
            <Phone className="w-3.5 h-3.5" />
            {user.phone || 'Não disponível'}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Registado em {new Date(user.createdAt).toLocaleDateString('pt-MZ')}
            {accountAgeDays !== null && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${accountAgeDays < 7 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-gray-500'}`}>
                {accountAgeDays} dia{accountAgeDays !== 1 ? 's' : ''} de conta
                {accountAgeDays < 7 ? ' — ainda não pode votar em desafios pagos' : ''}
              </span>
            )}
          </div>
          {user.phoneVerifiedAt && (
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              Telefone verificado em {new Date(user.phoneVerifiedAt).toLocaleDateString('pt-MZ')}
            </div>
          )}
        </div>

        {/* Abas: Entradas / Votos dados */}
        <div className="flex gap-2 mb-3 border-b border-white/10">
          <button
            onClick={() => setTab('entries')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'entries' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Entradas ({entries.length})
          </button>
          <button
            onClick={() => setTab('votes')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'votes' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Votos dados ({votesGiven.length})
          </button>
        </div>

        {tab === 'entries' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.length === 0 && <p className="text-gray-600 text-sm py-4 text-center">Sem entradas submetidas.</p>}
            {entries.map(e => (
              <div key={e.entryId} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                {e.mediaType === 'photo' ? (
                  <img src={e.mediaUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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
                <a
                  href={e.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-white flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === 'votes' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {votesGiven.length === 0 && <p className="text-gray-600 text-sm py-4 text-center">Ainda não votou em nada.</p>}
            {votesGiven.map((v, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-2.5">
                <span className="text-white text-sm truncate">{v.challengeTitle}</span>
                <span className="text-gray-500 text-xs flex-shrink-0">
                  {v.votedAt ? new Date(v.votedAt).toLocaleDateString('pt-MZ') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {user.banned && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm font-medium">Conta banida</p>
            <p className="text-red-400/70 text-xs mt-1">{user.banReason}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function BanModal({ user, onConfirm, onClose }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <h3 className="text-white font-bold text-lg mb-2">Banir utilizador?</h3>
        <p className="text-gray-400 text-sm mb-4">
          {user.name} (@{user.username}) não poderá mais aceder à conta.
        </p>

        <textarea
          className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-red-500 text-sm mb-4"
          placeholder="Motivo do banimento..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(user.uid, reason)}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
          >
            Banir
          </button>
        </div>
      </div>
    </div>
  );
}

export default UsersList;