import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get } from 'firebase/database';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaUserFriends } from 'react-icons/fa';

const MyInvitedFriends = ({ userData }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvitedFriends = async () => {
      try {
        const db = getDatabase();
        
        // 1. Buscar a lista de IDs dos amigos convidados
        const referralsRef = ref(db, `referrals/${userData.username}`);
        const referralsSnapshot = await get(referralsRef);
        
        if (!referralsSnapshot.exists()) {
          setFriends([]);
          setLoading(false);
          return;
        }

        const invitedFriendIds = Object.keys(referralsSnapshot.val());
        
        // 2. Buscar os detalhes de cada usuário convidado
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (!usersSnapshot.exists()) {
          setFriends([]);
          setLoading(false);
          return;
        }

        const allUsers = usersSnapshot.val();
        const friendsDetails = [];

        // 3. Mapear IDs para detalhes do usuário
        for (const friendId of invitedFriendIds) {
          if (allUsers[friendId]) {
            friendsDetails.push({
              id: friendId,
              username: allUsers[friendId].username || 'Anonimo',
              photoURL: allUsers[friendId].photoURL || '',
              joinDate: allUsers[friendId].joinDate 
                ? new Date(allUsers[friendId].joinDate).toLocaleDateString() 
                : 'Data desconhecida'
            });
          } else {
            // Se não encontrar no users, mostra pelo menos o ID
            friendsDetails.push({
              id: friendId,
              username: friendId,
              name: 'Usuário não encontrado',
              photoURL: '',
              joinDate: 'Data desconhecida'
            });
          }
        }

        // Ordenar por data de entrada (mais recente primeiro)
        friendsDetails.sort((a, b) => {
          const dateA = a.joinDate === 'Data desconhecida' ? 0 : new Date(a.joinDate).getTime();
          const dateB = b.joinDate === 'Data desconhecida' ? 0 : new Date(b.joinDate).getTime();
          return dateB - dateA;
        });

        setFriends(friendsDetails);
        setLoading(false);

      } catch (err) {
        console.error("Error fetching invited friends:", err);
        setError("Não foi possível carregar a lista de convites");
        setLoading(false);
      }
    };

    fetchInvitedFriends();
  }, [userData.username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seus convites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-4 text-white"
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Meus Amigos Convidados</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Resumo */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaUserFriends className="text-blue-500 mr-2" size={20} />
                <h2 className="text-lg font-semibold text-gray-800">Total de Convites</h2>
              </div>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {friends.length}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de amigos */}
        {friends.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FaUserFriends className="text-gray-400" size={40} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">Nenhum amigo convidado ainda</h3>
            <p className="text-gray-500 mt-2">Compartilhe seu link de convite para começar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                  {friend.photoURL ? (
                    <img 
                      src={friend.photoURL} 
                      alt={friend.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUser className="text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">@{friend.username}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <FaCalendarAlt className="mr-1" size={10} />
                    <span>Entrou em {friend.joinDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInvitedFriends;