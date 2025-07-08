import React, { useEffect, useState } from "react";
import { FaTrophy, FaCrown, FaUser, FaUserPlus, FaMedal } from "react-icons/fa";
import { getDatabase, ref, get } from "firebase/database";
import { auth } from "../fb";
import confetti from "canvas-confetti";

const ActiveParticipantsRanking = () => {
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

        // Processar participantes e contar convites válidos
        const participantsMap = new Map();

        // Processar cada usuário que fez convites
        for (const username in referralsData) {
          const referrals = referralsData[username];
          
          // Contar convites válidos (com status pending ou sem status definido)
          let referralCount = 0;
          if (referrals && typeof referrals === 'object') {
            referralCount = Object.keys(referrals).filter(key => {
              const referral = referrals[key];
              return !referral.status || referral.status === 'pending';
            }).length;
          }

          if (referralCount > 0) {
            // Encontrar o usuário correspondente
            const user = Object.values(usersData).find(u => u.username === username);
            
            if (user) {
              participantsMap.set(user.uid, {
                uid: user.uid,
                username,
                name: user.name || username,
                photoURL: user.photoURL || '',
                referralCount
              });
            } else {
              // Adicionar mesmo sem dados completos do usuário
              participantsMap.set(`missing-${username}`, {
                uid: `missing-${username}`,
                username,
                name: username,
                photoURL: '',
                referralCount
              });
            }
          }
        }

        // Converter para array e ordenar por número de convites (decrescente)
        const participantsList = Array.from(participantsMap.values()).sort((a, b) => b.referralCount - a.referralCount);

        // Definir o vencedor (participante com mais convites)
        if (participantsList.length > 0) {
          const topParticipant = participantsList[0];
          setWinner(topParticipant);
          
          // Verificar se o usuário atual é o vencedor
          if (auth.currentUser?.uid === topParticipant.uid) {
            setShowCelebration(true);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
            setTimeout(() => setShowCelebration(false), 5000);
          }
        }

        setActiveParticipants(participantsList);

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

  if (!winner) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FaUserPlus className="mx-auto mb-2 text-2xl" />
        <p>O desafio foi encerrado sem participantes</p>
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
            <p className="text-lg text-yellow-800 mb-3">Você venceu o desafio com {winner?.referralCount} convites!</p>
            <p className="text-sm text-yellow-600">O desafio foi encerrado e você é o grande vencedor!</p>
          </div>
        </div>
      )}

      {/* Cabeçalho do resultado final */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold flex items-center">
          <FaTrophy className="mr-2 text-yellow-500" /> Resultado Final
        </h2>
        <div className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
          Desafio encerrado
        </div>
      </div>

      {/* Card do vencedor */}
      <div className="mb-4 relative">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-4 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-600 text-white px-2 py-1 text-xs font-bold rounded-bl-lg">
            <FaCrown className="inline mr-1" /> VENCEDOR
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
                1º
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-white">{winner.name}</h3>
              <p className="text-yellow-100 text-sm">@{winner.username}</p>
              <div className="flex items-center mt-1">
                <FaUserPlus className="text-yellow-200 mr-1" />
                <span className="text-yellow-200 text-sm font-bold">
                  {winner.referralCount} convites
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="px-4 pb-4">
    <div className="mb-4 bg-gray-200 rounded-xl h-24 animate-pulse"></div>
    <div className="bg-gray-200 rounded-lg h-20 animate-pulse"></div>
  </div>
);

export default ActiveParticipantsRanking;