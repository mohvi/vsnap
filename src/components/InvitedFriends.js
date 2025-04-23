import React, { useEffect, useState } from 'react';
import { auth } from '../fb';
import { getDatabase, ref, get, child } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaTrophy } from 'react-icons/fa';

const InvitedFriends = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/auth');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchInvitedFriends();
    }
  }, [user]);

  const fetchInvitedFriends = async () => {
    try {
      const dbRef = ref(getDatabase());
      const snapshot = await get(child(dbRef, 'users'));
      
      if (snapshot.exists()) {
        const allUsers = snapshot.val();
        const invitedFriends = [];
        
        Object.keys(allUsers).forEach((userId) => {
          if (allUsers[userId].referrer === user.uid) {
            invitedFriends.push({
              id: userId,
              ...allUsers[userId],
              joinDate: new Date(allUsers[userId].joinDate).toLocaleDateString()
            });
          }
        });

        // Sort by join date (newest first)
        invitedFriends.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
        setFriends(invitedFriends);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invited friends:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seus amigos convidados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-4 text-white"
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Amigos Convidados</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaTrophy className="text-yellow-500 mr-2" size={20} />
                <h2 className="text-lg font-semibold text-gray-800">Total de Amigos</h2>
              </div>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {friends.length}
              </span>
            </div>
          </div>
        </div>

        {friends.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FaUser className="text-gray-400" size={40} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">Nenhum amigo convidado ainda</h3>
            <p className="text-gray-500 mt-2">Compartilhe seu link de convite para começar a ganhar recompensas!</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
              Convidar Amigos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                  <FaUser className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">
                    {friend.name || friend.email || 'Usuário'}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <FaCalendarAlt className="mr-1" size={12} />
                    <span>Entrou em {friend.joinDate}</span>
                  </div>
                </div>
                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                  Ativo
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitedFriends;