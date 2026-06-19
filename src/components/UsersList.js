import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import {
  Search, Shield, ShieldOff, Coins, Trophy, Vote,
  Phone, Calendar, MoreVertical, CheckCircle2, Ban,
} from 'lucide-react';
import { db } from '../fb';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmBan, setConfirmBan] = useState(null);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, snapshot => {
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
    return () => unsub();
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

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'banned' && u.banned) ||
      (filterStatus === 'active' && !u.banned);

    return matchesSearch && matchesStatus;
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
            {users.length} utilizadores · {users.filter(u => u.banned).length} banidos
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
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="banned">Banidos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-4 text-xs text-gray-500 font-medium uppercase">Utilizador</th>
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
                      <p className="text-white text-sm font-medium">{user.name || 'Sem nome'}</p>
                      <p className="text-gray-500 text-xs">@{user.username || 'sem-username'}</p>
                    </div>
                  </div>
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
                  {user.banned ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                      Banido
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                      Activo
                    </span>
                  )}
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

      {/* Modal perfil detalhado */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
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

function UserDetailModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">

        <div className="flex items-center gap-4 mb-6">
          {user.avatar ? (
            <img src={user.avatar} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h3 className="text-white font-bold text-lg">{user.name}</h3>
            <p className="text-gray-500 text-sm">@{user.username}</p>
          </div>
        </div>

        {user.bio && (
          <p className="text-gray-400 text-sm mb-4 p-3 bg-white/5 rounded-xl">{user.bio}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
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
            <p className="text-white font-bold">{user.votesGiven || 0}</p>
            <p className="text-gray-500 text-xs">Votos dados</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Phone className="w-3.5 h-3.5" />
            {user.phone || 'Não disponível'}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Registado em {new Date(user.createdAt).toLocaleDateString('pt-MZ')}
          </div>
        </div>

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