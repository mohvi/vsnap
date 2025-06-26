import React from 'react';
import ChallengeCard from './ChallengeCard';

const ChallengeList = ({ loading, error, challenges, user, onParticipateClick, onShareClick }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Nenhum desafio disponível no momento</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {challenges.map(challenge => (
        <ChallengeCard 
          key={challenge.id} 
          challenge={challenge}
          user={user}
          onParticipateClick={onParticipateClick}
          onShareClick={onShareClick}
        />
      ))}
    </div>
  );
};

export default ChallengeList;