import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update, serverTimestamp } from 'firebase/database';

const Rewards = ({ user }) => {
  const [rewards, setRewards] = useState([]);
  const db = getDatabase();

  useEffect(() => {
    const rewardsRef = ref(db, `users/${user.uid}/rewards/`);
    onValue(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRewards(Object.entries(snapshot.val()));
        console.log(snapshot.val())
      } else {
        setRewards([]);
      }
    });
  }, [db, user.uid]);

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

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg mt-4">
      <h2 className="text-2xl font-bold text-gray-800 my-4">Minhas Recompensas</h2>
      {rewards.length > 0 ? (
        <ul className="space-y-4">
          {rewards.map(([rewardId, reward]) => (
            <li
              key={rewardId}
              className={`p-4 rounded-md ${
                reward.status === 'resgatada' ? 'bg-gray-200' : 'bg-green-100'
              }`}
            >
              <h3 className="text-lg font-semibold">{reward.nome}</h3>
              <p className="text-gray-600">{reward.descricao}</p>
              <p className="text-gray-500">
                {reward.status === 'resgatada'
                  ? `Resgatada em: ${new Date(reward.redeemedAt).toLocaleDateString()}`
                  : 'Disponível para resgatar'}
              </p>
              {reward.status !== 'resgatada' && (
                <button
                  onClick={() => handleRedeemReward(rewardId)}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
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
  );
};

export default Rewards;
