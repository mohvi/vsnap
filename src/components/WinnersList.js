import React, { useEffect, useState } from "react";
import { FaTrophy, FaCrown, FaUser, FaChevronRight } from "react-icons/fa";
import { getDatabase, ref, get } from "firebase/database";
import { auth } from "../fb";

const ActiveParticipantsRanking = () => {
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchActiveParticipants = async () => {
      try {
        const db = getDatabase();
        
        // 1. Buscar todas as referências (apenas usuários que convidaram alguém)
        const referralsSnapshot = await get(ref(db, 'referrals'));
        const referralsData = referralsSnapshot.val() || {};
        
        // 2. Buscar dados dos usuários que têm referências
        const usersSnapshot = await get(ref(db, 'users'));
        const usersData = usersSnapshot.val() || {};
        
        // 3. Filtrar apenas usuários com referências
        const participantsList = Object.keys(referralsData)
          .filter(username => {
            const referrals = referralsData[username];
            return Object.keys(referrals || {}).length > 0;
          })
          .map(username => {
            const user = Object.values(usersData).find(u => u.username === username);
            return {
              uid: user?.uid || '',
              username,
              referralCount: Object.keys(referralsData[username]).length
            };
          })
          .filter(p => p.uid); // Garantir que temos UID

        // 4. Ordenar por quem tem mais referências
        participantsList.sort((a, b) => b.referralCount - a.referralCount);
        
        setActiveParticipants(participantsList);
        
        // 5. Verificar usuário atual (se participante)
        if (auth.currentUser) {
          const current = participantsList.find(p => p.uid === auth.currentUser.uid);
          if (current) {
            setCurrentUser({
              ...current,
              position: participantsList.findIndex(p => p.uid === auth.currentUser.uid) + 1
            });
          }
        }
        
      } catch (err) {
        console.error("Error fetching active participants:", err);
        setError("Não foi possível carregar os participantes ativos");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveParticipants();
  }, []);

  if (loading) {
    return (
      <div className="px-4 pb-4">
        <div className="flex space-x-3 overflow-x-auto py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  if (activeParticipants.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FaUser className="mx-auto mb-2 text-2xl" />
        <p>Ainda não há participantes ativos no desafio</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold flex items-center">
          <FaTrophy className="mr-2 text-yellow-500" /> #AGANHAR
        </h2>
        {currentUser && (
          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Você: #{currentUser.position}
          </div>
        )}
      </div>

      {/* Ranking horizontal */}
      <div className="relative">
        <div className="flex space-x-3 overflow-x-auto pb-4 hide-scrollbar">
          {activeParticipants.map((participant, index) => (
            <ParticipantCard 
              key={participant.uid}
              position={index + 1}
              username={participant.username}
              isCurrentUser={currentUser?.uid === participant.uid}
            />
          ))}
        </div>
      </div>

      {/* Seção do usuário atual (se não estiver visível no ranking) */}
      {currentUser && currentUser.position > activeParticipants.length && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
          <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
            #{currentUser.position}
          </div>
          <div className="flex-1">
            <p className="font-medium">@{currentUser.username}</p>
            <p className="text-xs text-gray-600">Sua posição</p>
          </div>
          <FaChevronRight className="text-gray-400" />
        </div>
      )}
    </div>
  );
};

const ParticipantCard = ({ position, username, isCurrentUser }) => {
  const getCardStyle = () => {
    if (isCurrentUser) return 'border-yellow-400';
    
    switch(position) {
      case 1: return 'border-2 border-yellow-400';
      case 2: return 'border-2 border-gray-400';
      case 3: return 'border-2 border-yellow-600';
      default: return 'border border-gray-200';
    }
  };

  const getPositionColor = () => {
    switch(position) {
      case 1: return 'bg-yellow-400 text-white';
      case 2: return 'bg-gray-400 text-white';
      case 3: return 'bg-yellow-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`flex-shrink-0 w-20 ${getCardStyle()} rounded-lg overflow-hidden bg-white`}>
      <div className={`h-12 flex items-center justify-center ${getPositionColor()}`}>
        {position <= 3 ? (
          <FaTrophy size={position === 1 ? 18 : 14} />
        ) : (
          <span className="font-bold">{position}</span>
        )}
      </div>
      <div className="p-2 text-center">
        <p className="text-xs font-medium truncate">@{username}</p>
        <div className="flex justify-center mt-1">
          {position === 1 && <FaCrown className="text-yellow-400 text-xs" />}
        </div>
      </div>
    </div>
  );
};

export default ActiveParticipantsRanking;