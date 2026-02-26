import React from 'react';
import ChallengeCard from './ChallengeCard';
import { FiAlertCircle, FiRefreshCw, FiClock, FiAward, FiTrendingUp } from 'react-icons/fi';
import { Sparkles, Target, Trophy, Zap, Calendar, Users, Award } from 'lucide-react';

const ChallengeList = ({ 
  loading, 
  error, 
  challenges, 
  user, 
  onParticipateClick, 
  onShareClick,
  isCompletedTab = false,
  emptyStateMessage = "Nenhum desafio disponível no momento",
  title = "Desafios Ativos",
  description = "Participe e mostre seu talento"
}) => {
  // Enhanced loading state
  if (loading && challenges.length === 0) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center space-y-6 py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-3 border-b-3 border-purple-500"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-t-3 border-b-3 border-purple-300 opacity-75"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-gray-700 font-medium text-lg">Carregando desafios</p>
          <p className="text-gray-500 text-sm">Preparando as melhores oportunidades para você</p>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl border border-red-100 shadow-sm">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center shadow-inner">
            <FiAlertCircle className="text-red-500 text-3xl" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">!</span>
          </div>
        </div>
        
        <div className="text-center max-w-md px-6 space-y-3">
          <h3 className="text-xl font-bold text-gray-800">
            {error.includes("conexão") ? "Problema de Conexão" : "Algo deu errado"}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {error.includes("conexão") 
              ? "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."
              : error
            }
          </p>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 flex items-center bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <FiRefreshCw className="mr-3 animate-spin" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Enhanced empty state
  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-3xl border border-gray-200/50 shadow-sm">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-tr from-purple-100 to-blue-100 rounded-full flex items-center justify-center shadow-inner">
            {isCompletedTab ? (
              <Trophy className="text-purple-400 text-4xl" />
            ) : (
              <Target className="text-blue-400 text-4xl" />
            )}
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="text-white text-lg" />
          </div>
        </div>
        
        <div className="text-center max-w-md px-6 space-y-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {isCompletedTab ? "Desafios Concluídos" : "Desafios Ativos"}
          </h3>
          
          <p className="text-gray-600 text-lg font-medium">
            {emptyStateMessage}
          </p>
          
          <p className="text-gray-500 leading-relaxed">
            {isCompletedTab 
              ? "Você ainda não completou nenhum desafio. Participe dos desafios ativos e mostre seu talento!"
              : "Novos desafios emocionantes estão a caminho. Fique ligado!"
            }
          </p>
        </div>
        {!isCompletedTab && (
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md px-6">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200/50">
              <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Em Breve</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200/50">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Comunidade</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200/50">
              <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Prêmios</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            {isCompletedTab ? (
              <Trophy className="text-white w-5 h-5" />
            ) : (
              <Target className="text-white w-5 h-5" />
            )}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {title}
          </h1>
        </div>
        
        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
        
        {/* Stats Bar */}
        <div className="flex justify-center items-center space-x-6 py-4">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200/50">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">
              {challenges.length} {challenges.length === 1 ? 'desafio' : 'desafios'}
            </span>
          </div>
          
          {!isCompletedTab && (
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200/50">
              <FiTrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                {challenges.filter(c => new Date(c.deadline) > new Date()).length} ativos
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {challenges.map((challenge, index) => (
          <div 
            key={challenge.id}
            className="transform hover:scale-[1.02] transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ChallengeCard 
              challenge={challenge}
              user={user}
              onParticipateClick={onParticipateClick}
              onShareClick={onShareClick}
              isCompleted={isCompletedTab}
            />
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="text-center pt-8 border-t border-gray-200/50">
        <p className="text-gray-500 text-sm">
          Mostrando {challenges.length} {challenges.length === 1 ? 'desafio' : 'desafios'}
          {!isCompletedTab && (
            <span className="text-purple-600 font-medium">
              {' • '}
              {challenges.filter(c => new Date(c.deadline) > new Date()).length} ativos
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

ChallengeList.defaultProps = {
  loading: false,
  error: null,
  challenges: [],
  isCompletedTab: false,
  emptyStateMessage: "Nenhum desafio disponível no momento",
  title: "Desafios Ativos",
  description: "Participe e mostre seu talento"
};

export default ChallengeList;