import React, { useEffect, useState } from 'react';
import { FaTrophy, FaCheckCircle, FaClock, FaGift, FaCoins, FaHistory } from 'react-icons/fa';
import { getDatabase, ref, onValue, update, serverTimestamp } from 'firebase/database';

const RewardsAndChallenges = ({ user }) => {
  const [activeTab, setActiveTab] = useState('challenges');
  const [rewards, setRewards] = useState([]);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [redeemedRewards, setRedeemedRewards] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getDatabase();

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    
    // Fetch rewards
    const rewardsRef = ref(db, `users/${user.uid}/rewards`);
    const rewardsUnsubscribe = onValue(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allRewards = Object.entries(snapshot.val());
        setRewards(allRewards);
        setAvailableRewards(allRewards.filter(([_, reward]) => reward.status !== 'resgatada'));
        setRedeemedRewards(allRewards.filter(([_, reward]) => reward.status === 'resgatada'));
      } else {
        setRewards([]);
        setAvailableRewards([]);
        setRedeemedRewards([]);
      }
    });

    // Fetch challenges
    const challengesRef = ref(db, `users/${user.uid}/challenges`);
    const challengesUnsubscribe = onValue(challengesRef, (snapshot) => {
      if (snapshot.exists()) {
        const allChallenges = Object.entries(snapshot.val());
        setChallenges(allChallenges);
        setCompletedChallenges(allChallenges.filter(([_, challenge]) => challenge.status === 'completed'));
      } else {
        setChallenges([]);
        setCompletedChallenges([]);
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
      alert('Ocorreu um erro ao resgatar a recompensa. Tente novamente.');
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'challenges':
        return (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaTrophy className="mr-2 text-yellow-500" />
                Desafios Ativos
              </h3>
              {challenges.length > 0 ? (
                <ul className="space-y-4">
                  {challenges.filter(([_, challenge]) => challenge.status !== 'completed').map(([challengeId, challenge]) => (
                    <ChallengeCard 
                      key={challengeId} 
                      challenge={challenge} 
                      getChallengeStatusIcon={getChallengeStatusIcon} 
                    />
                  ))}
                </ul>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-gray-600">Você não possui desafios ativos no momento.</p>
                </div>
              )}
            </div>

            {completedChallenges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <FaCheckCircle className="mr-2 text-green-500" />
                  Desafios Concluídos
                </h3>
                <ul className="space-y-4">
                  {completedChallenges.map(([challengeId, challenge]) => (
                    <ChallengeCard 
                      key={challengeId} 
                      challenge={challenge} 
                      getChallengeStatusIcon={getChallengeStatusIcon} 
                      isCompleted 
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      
      case 'rewards':
        return (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaGift className="mr-2 text-purple-500" />
                Recompensas Disponíveis
              </h3>
              {availableRewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRewards.map(([rewardId, reward]) => (
                    <RewardCard 
                      key={rewardId} 
                      reward={reward} 
                      onRedeem={() => handleRedeemReward(rewardId)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-gray-600">Você não possui recompensas disponíveis no momento.</p>
                </div>
              )}
            </div>

            {redeemedRewards.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <FaHistory className="mr-2 text-gray-500" />
                  Histórico de Recompensas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {redeemedRewards.map(([rewardId, reward]) => (
                    <RewardCard 
                      key={rewardId} 
                      reward={reward} 
                      isRedeemed 
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg mt-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
        <p className="text-center mt-4 text-gray-600">Carregando seus desafios e recompensas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
            activeTab === 'challenges'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaTrophy className="mr-2" />
          Desafios
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
            activeTab === 'rewards'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaGift className="mr-2" />
          Recompensas
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Componente de Card de Desafio
const ChallengeCard = ({ challenge, getChallengeStatusIcon, isCompleted = false }) => {
  const progressPercentage = Math.min(100, ((challenge.progress || 0) / (challenge.target || 1)) * 100);

  return (
    <div className={`p-5 rounded-lg border ${isCompleted ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start">
        {getChallengeStatusIcon(challenge.status)}
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{challenge.name || 'Desafio'}</h3>
          <p className="text-gray-600 mt-1">{challenge.description || 'Complete este desafio para ganhar recompensas'}</p>
          
          {!isCompleted && (
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progresso: {challenge.progress || 0}/{challenge.target || 1}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {isCompleted && (
            <>
              <div className="mt-2 flex items-center text-sm text-green-600">
                <FaCheckCircle className="mr-1" />
                <span>Concluído!</span>
              </div>
              {challenge.reward && (
                <div className="mt-2 flex items-center text-sm text-purple-600">
                  <FaCoins className="mr-1" />
                  <span>Recompensa: {challenge.reward}</span>
                </div>
              )}
              {challenge.completedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Concluído em: {new Date(challenge.completedAt).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de Card de Recompensa
const RewardCard = ({ reward, onRedeem, isRedeemed = false }) => {
  return (
    <div className={`p-5 rounded-lg border ${isRedeemed ? 'border-gray-200 bg-gray-50' : 'border-purple-200 bg-purple-50'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{reward.nome || 'Recompensa'}</h3>
          <p className="text-gray-600 mt-1">{reward.descricao || 'Recompensa por completar desafios'}</p>
          
          {reward.valor && (
            <div className="mt-2 flex items-center">
              <FaCoins className="text-yellow-500 mr-1" />
              <span className="font-medium">{reward.valor} MT</span>
            </div>
          )}
          
          {isRedeemed ? (
            <div className="mt-3 text-sm text-gray-500">
              <p>Resgatada em: {new Date(reward.redeemedAt).toLocaleDateString()}</p>
            </div>
          ) : (
            <button
              onClick={onRedeem}
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center"
            >
              <FaGift className="mr-2" />
              Resgatar Agora
            </button>
          )}
        </div>
        
        {reward.icone && (
          <div className="bg-white p-3 rounded-full shadow-sm">
            {reward.icone === 'moeda' ? (
              <FaCoins className="text-yellow-500 text-xl" />
            ) : (
              <FaGift className="text-purple-500 text-xl" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsAndChallenges;