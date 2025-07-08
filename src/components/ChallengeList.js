import React from 'react';
import ChallengeCard from './ChallengeCard';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const ChallengeList = ({ 
  loading, 
  error, 
  challenges, 
  user, 
  onParticipateClick, 
  onShareClick,
  isCompletedTab = false,
  emptyStateMessage = "Nenhum desafio disponível no momento"
}) => {
  // Enhanced loading state
  if (loading && challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-600">Carregando desafios...</p>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-red-50 rounded-lg">
        <FiAlertCircle className="text-red-500 text-4xl mb-3" />
        <p className="text-red-600 font-medium mb-4 text-center max-w-md px-4">
          {error.includes("conexão") ? (
            <>Problema de conexão. Verifique sua internet e tente novamente.</>
          ) : (
            error
          )}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FiRefreshCw className="mr-2" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Enhanced empty state
  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
        <div className="bg-white p-6 rounded-full shadow-inner mb-4">
          <FiAlertCircle className="text-gray-400 text-3xl" />
        </div>
        <p className="text-gray-600 mb-2 font-medium">{emptyStateMessage}</p>
        {!isCompletedTab && (
          <p className="text-gray-500 text-sm">Novos desafios em breve!</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {challenges.map(challenge => (
        <ChallengeCard 
          key={challenge.id} 
          challenge={challenge}
          user={user}
          onParticipateClick={onParticipateClick}
          onShareClick={onShareClick}
          isCompleted={isCompletedTab}
        />
      ))}
    </div>
  );
};

ChallengeList.defaultProps = {
  loading: false,
  error: null,
  challenges: [],
  isCompletedTab: false,
  emptyStateMessage: "Nenhum desafio disponível no momento"
};

export default ChallengeList;