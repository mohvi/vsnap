import React, { useEffect, useState } from "react";
import { FaTrophy, FaCrown, FaUser, FaChevronRight, FaStar, FaMedal, FaFire } from "react-icons/fa";
import { getDatabase, ref, get } from "firebase/database";
import { auth } from "../fb";
import confetti from "canvas-confetti";

const ActiveParticipantsRanking = () => {
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [winner, setWinner] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

 useEffect(() => {
  const fetchActiveParticipants = async () => {
    try {
      const db = getDatabase();
      
      // Buscar referências e usuários
      const [referralsSnapshot, usersSnapshot] = await Promise.all([
        get(ref(db, 'referrals')),
        get(ref(db, 'users'))
      ]);
      
      const referralsData = referralsSnapshot.val() || {};
      const usersData = usersSnapshot.val() || {};

      console.log("Dados completos de referrals:", referralsData);
      console.log("Dados completos de users:", usersData);

      // Processar participantes
      const participantsList = [];
      
      // Iterar sobre todos os usuários no nó referrals
      for (const username in referralsData) {
        const referrals = referralsData[username];
        
        // Verificar se há convites (considerando diferentes estruturas possíveis)
        let referralCount = 0;
        
        if (referrals) {
          // Se for um objeto (a estrutura esperada)
          if (typeof referrals === 'object' && !Array.isArray(referrals)) {
            referralCount = Object.keys(referrals).length;
          } 
          // Se for um array (estrutura alternativa)
          else if (Array.isArray(referrals)) {
            referralCount = referrals.length;
          }
          // Se for um número direto (estrutura simplificada)
          else if (typeof referrals === 'number') {
            referralCount = referrals;
          }
        }
        
        // Se tiver pelo menos 1 convite, adicionar à lista
        if (referralCount > 0) {
          // Encontrar o usuário correspondente
          const user = Object.values(usersData).find(u => u.username === username);
          
          if (user) {
            participantsList.push({
              uid: user.uid,
              username,
              name: user.name || 'Usuário',
              photoURL: user.photoURL || '',
              referralCount
            });
          } else {
            console.warn(`Usuário ${username} encontrado em referrals mas não em users`);
            // Adicionar mesmo sem dados completos do usuário
            participantsList.push({
              uid: `missing-${username}`,
              username,
              name: username,
              photoURL: '',
              referralCount
            });
          }
        }
      }

      console.log("Lista de participantes antes da ordenação:", participantsList);

      // Ordenar por referências
      participantsList.sort((a, b) => b.referralCount - a.referralCount);
      
      console.log("Participantes ativos ordenados:", participantsList);

      setActiveParticipants(participantsList);
      
      // Definir vencedor (1º lugar)
      if (participantsList.length > 0) {
        setWinner(participantsList[0]);
        // Mostrar confetti apenas se for o usuário atual
        if (auth.currentUser?.uid === participantsList[0].uid) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 5000);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
      
      // Verificar usuário atual
      if (auth.currentUser) {
        const current = participantsList.find(p => p.uid === auth.currentUser.uid);
        if (current) {
          setCurrentUser({
            ...current,
            position: participantsList.findIndex(p => p.uid === auth.currentUser.uid) + 1
          });
        } else {
          console.log("Usuário atual não encontrado na lista de participantes ativos");
        }
      }
      
    } catch (err) {
      console.error("Error fetching active participants:", err);
      setError("Não foi possível carregar o ranking");
    } finally {
      setLoading(false);
    }
  };

  fetchActiveParticipants();
}, []);

  if (loading) {
    return <LoadingSkeleton />;
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
      {/* Efeito de celebração para o vencedor */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 p-6 rounded-xl shadow-2xl text-center animate-bounce-in mx-4 border-2 border-yellow-300 max-w-md">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-2xl font-bold text-yellow-700 mb-2">PARABÉNS!</h3>
            <p className="text-lg text-yellow-800 mb-3">Você está em 1º lugar no ranking!</p>
            <p className="text-sm text-yellow-600">Continue convidando para manter sua posição!</p>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
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

      {/* Destaque do Vencedor */}
      {winner && (
        <div className="mb-4 relative">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-4 shadow-lg overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-600 text-white px-2 py-1 text-xs font-bold rounded-bl-lg">
              <FaCrown className="inline mr-1" /> LÍDER
            </div>
            
            <div className="flex items-center">
              <div className="relative mr-3">
                {winner.photoURL ? (
                  <img 
                    src={winner.photoURL} 
                    alt={winner.username} 
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-yellow-200 border-2 border-white shadow-md flex items-center justify-center">
                    <FaUser className="text-yellow-600 text-xl" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
                  1
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-white">{winner.name}</h3>
                <p className="text-yellow-100 text-sm">@{winner.username}</p>
                <div className="flex items-center mt-1">
                  <FaFire className="text-yellow-200 mr-1" />
                  <span className="text-yellow-200 text-xs font-bold">
                    {winner.referralCount} convites
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra de progresso do líder */}
          <div className="mt-2 bg-yellow-100 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (winner.referralCount / (winner.referralCount + 10)) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Ranking horizontal */}
      <div className="relative">
        <div className="flex space-x-3 overflow-x-auto pb-4 hide-scrollbar">
          {activeParticipants.map((participant, index) => (
            <ParticipantCard 
              key={participant.uid}
              position={index + 1}
              username={participant.username}
              photoURL={participant.photoURL}
              referralCount={participant.referralCount}
              isCurrentUser={currentUser?.uid === participant.uid}
              isWinner={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Seção do usuário atual (se não estiver visível no ranking) */}
      {currentUser && currentUser.position > 3 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center border border-blue-100">
          <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
            #{currentUser.position}
          </div>
          <div className="flex-1">
            <p className="font-medium">@{currentUser.username}</p>
            <p className="text-xs text-gray-600">{currentUser.referralCount} convites</p>
          </div>
          <FaChevronRight className="text-gray-400" />
        </div>
      )}
    </div>
  );
};

const ParticipantCard = ({ position, username, photoURL, referralCount, isCurrentUser, isWinner }) => {
  const getCardStyle = () => {
    if (isCurrentUser) return 'border-blue-400 bg-blue-50 shadow-md';
    if (isWinner) return 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg';
    
    switch(position) {
      case 2: return 'border-gray-300 bg-gray-50 shadow-sm';
      case 3: return 'border-yellow-600 bg-yellow-50 shadow-sm';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getPositionBadge = () => {
    if (isWinner) {
      return (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">
          <FaCrown size={10} />
        </div>
      );
    }
    
    switch(position) {
      case 2:
        return (
          <div className="absolute -top-2 -right-2 bg-gray-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">
            <FaMedal size={10} />
          </div>
        );
      case 3:
        return (
          <div className="absolute -top-2 -right-2 bg-yellow-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">
            <FaMedal size={10} />
          </div>
        );
      default:
        return (
          <div className="absolute -top-2 -right-2 bg-gray-200 text-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">
            {position}
          </div>
        );
    }
  };

  return (
    <div className={`flex-shrink-0 w-24 relative ${getCardStyle()} rounded-lg overflow-hidden border-2 transition-all transform hover:scale-105`}>
      {getPositionBadge()}
      
      <div className="h-16 flex items-center justify-center bg-white">
        {photoURL ? (
          <img 
            src={photoURL} 
            alt={username} 
            className="w-12 h-12 rounded-full object-cover border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <FaUser className="text-gray-500" />
          </div>
        )}
      </div>
      
      <div className="p-2 text-center">
        <p className="text-xs font-medium truncate">@{username}</p>
        <div className="flex items-center justify-center mt-1 space-x-1">
          <FaUser className="text-gray-400 text-xs" />
          <span className="text-xs text-gray-500">{referralCount}</span>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="px-4 pb-4">
    {/* Skeleton do vencedor */}
    <div className="mb-4 bg-gray-200 rounded-xl h-24 animate-pulse"></div>
    
    {/* Skeleton do ranking */}
    <div className="flex space-x-3 overflow-x-auto py-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-24 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
      ))}
    </div>
  </div>
);

export default ActiveParticipantsRanking;