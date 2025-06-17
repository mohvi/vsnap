import React, { useEffect, useState } from 'react';
import { FaTrophy, FaCheckCircle, FaClock, FaGift } from 'react-icons/fa';
import { getDatabase, ref, onValue, update, serverTimestamp } from 'firebase/database';

const RewardsAndChallenges = ({ user }) => {
  const [rewards, setRewards] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getDatabase();

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    
    // Fetch rewards
    const rewardsRef = ref(db, `users/${user.uid}/rewards`);
    const rewardsUnsubscribe = onValue(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRewards(Object.entries(snapshot.val()));
      } else {
        setRewards([]);
      }
    });

    // Fetch challenges
    const challengesRef = ref(db, `users/${user.uid}/challenges`);
    const challengesUnsubscribe = onValue(challengesRef, (snapshot) => {
      if (snapshot.exists()) {
        setChallenges(Object.entries(snapshot.val()));
      } else {
        setChallenges([]);
      }
      setLoading(false);
    });

    return () => {
      rewardsUnsubscribe();
      challengesUnsubscribe();
    };
  }, [db, user?.uid]);

  const handleRedeemReward = (rewardId) => {
    const rewardRef = ref(db, `users/${user.uid}/rewards/${rewardId}`);
    update(rewardRef, {
      status: 'resgatada',
      redeemedAt: serverTimestamp(),
    })
    .then(() => {
      alert('Recompensa resgatada com sucesso!');
    })
    .catch((error) => {
      console.error('Erro ao resgatar recompensa:', error);
    });
  };

  const getChallengeStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500 mr-2" />;
      case 'in_progress':
        return <FaClock className="text-yellow-500 mr-2" />;
      default:
        return <FaTrophy className="text-blue-500 mr-2" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white shadow-lg rounded-lg mt-4">
        <p className="text-center">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Challenges Section */}
      <div className="p-4 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 my-4 flex items-center">
          <FaTrophy className="mr-2 text-yellow-500" />
          Meus Desafios
        </h2>
        
        {challenges.length > 0 ? (
          <ul className="space-y-4">
            {challenges.map(([challengeId, challenge]) => (
              <li
                key={challengeId}
                className={`p-4 rounded-md ${
                  challenge.status === 'completed' ? 'bg-green-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  {getChallengeStatusIcon(challenge.status)}
                  <h3 className="text-lg font-semibold">{challenge.name || 'Desafio'}</h3>
                </div>
                <p className="text-gray-600 mt-2">{challenge.description || 'Complete este desafio para ganhar recompensas'}</p>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progresso: {challenge.progress || 0}/{challenge.target || 1}</span>
<span>{Math.round(((challenge.progress || 0) / (challenge.target || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, ((challenge.progress || 0) / (challenge.target || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {challenge.completedAt && (
                  <p className="text-sm text-gray-500 mt-2">
                    Concluído em: {new Date(challenge.completedAt).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-600">Você não possui desafios ativos.</p>
        )}
      </div>

      {/* Rewards Section */}
      <div className="p-4 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 my-4 flex items-center">
          <FaGift className="mr-2 text-purple-500" />
          Minhas Recompensas
        </h2>
        
        {rewards.length > 0 ? (
          <ul className="space-y-4">
            {rewards.map(([rewardId, reward]) => (
              <li
                key={rewardId}
                className={`p-4 rounded-md ${
                  reward.status === 'resgatada' ? 'bg-gray-100' : 'bg-purple-50'
                }`}
              >
                <h3 className="text-lg font-semibold">{reward.nome || 'Recompensa'}</h3>
                <p className="text-gray-600">{reward.descricao || 'Recompensa por completar desafios'}</p>
                <p className="text-gray-500 mt-1">
                  {reward.status === 'resgatada'
                    ? `Resgatada em: ${new Date(reward.redeemedAt).toLocaleDateString()}`
                    : 'Disponível para resgatar'}
                </p>
                {reward.status !== 'resgatada' && (
                  <button
                    onClick={() => handleRedeemReward(rewardId)}
                    className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition"
                  >
                    Resgatar
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-600">Você ainda não possui recompensas.</p>
        )}
      </div>
    </div>
  );
};

export default RewardsAndChallenges;