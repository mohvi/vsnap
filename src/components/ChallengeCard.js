import React, { useState, useEffect, useMemo } from 'react';
import { Share2, Zap, Award, Heart, Users, Image, Video, Check, Trophy, Crown, Clock } from 'lucide-react';
import { db } from '../fb';
import { ref, get } from 'firebase/database';
import { Link } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const ChallengeCard = ({ 
  challenge, 
  user, 
  onParticipateClick, 
  onShareClick, 
  hideCompleted = false,
  isCompletedTab = false
}) => {
  const [participationStatus, setParticipationStatus] = useState('loading');
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate time remaining for the challenge
  useEffect(() => {
    if (!challenge?.deadline || challenge?.winner) return;

    const calculateTimeLeft = () => {
      try {
        // Parse the deadline - handles both timestamp (number) and ISO string
        const endDate = typeof challenge.deadline === 'number' 
          ? new Date(challenge.deadline)
          : new Date(challenge.deadline);
        
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) {
          setTimeLeft('Encerrado');
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } catch (error) {
        console.error("Error calculating time left:", error);
        setTimeLeft('Data inválida');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [challenge?.deadline, challenge?.winner]);

  // Fetch challenge data and participation status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengeSnapshot, participationSnapshot] = await Promise.all([
          get(ref(db, `challenges/${challenge.id}`)),
          user ? get(ref(db, `users/${user.uid}/participations/${challenge.id}`)) : null
        ]);

        if (challengeSnapshot.exists()) {
          const challengeData = challengeSnapshot.val();
          if (challengeData.winner) {
            setWinnerInfo({
              username: challengeData.winner.userName,
              userId: challengeData.winner.userId
            });
          }
        }

        setParticipationStatus(participationSnapshot?.exists() ? 'participated' : 'can_participate');
      } catch (error) {
        console.error("Error fetching data:", error);
        setParticipationStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, challenge.id]);

  // Format interaction count
  const formattedInteractionCount = useMemo(() => {
    if (!challenge.interaction) return '0';
    
    const count = typeof challenge.interaction === 'string' 
      ? parseInt(challenge.interaction.split(' ')[0])
      : challenge.interaction;
    
    return count > 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
  }, [challenge.interaction]);

  // Don't render if loading and no skeleton needed
  if (isLoading && !challenge.id) return null;

  // Don't render completed challenges if hideCompleted is true
  if ((winnerInfo || isCompletedTab) && hideCompleted) return null;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition max-w-full sm:max-w-md mx-auto">
        <Skeleton height={192} className="block w-full" />
        <div className="p-4 sm:p-5">
          <Skeleton count={3} />
          <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
            <Skeleton width={100} height={30} />
            <Skeleton width={100} height={30} />
          </div>
        </div>
      </div>
    );
  }

  // Render participate button based on status
  const renderParticipateButton = () => {
    if (winnerInfo || isCompletedTab) {
      return (
        <button 
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg flex-1 cursor-default flex items-center justify-center text-sm"
          disabled
        >
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-600" /> 
          {winnerInfo ? 'Desafio encerrado' : 'Concluído'}
        </button>
      );
    }

    if (participationStatus === 'participated') {
      return (
        <button 
          className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex-1 cursor-default flex items-center justify-center border border-green-100 text-sm"
        >
          <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Participando
        </button>
      );
    }
    
    return (
      <button 
        onClick={() => onParticipateClick(challenge)}
        className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 rounded-lg flex-1 hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
      >
        Participar Agora
      </button>
    );
  };

  return (
    <div className={`border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition max-w-full sm:max-w-md mx-auto ${winnerInfo ? 'border-yellow-400 border-2' : ''}`}>
      {/* Winner badge */}
      {winnerInfo && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center z-10 shadow-sm">
          <Crown className="w-3 h-3 mr-1" /> VENCEDOR
        </div>
      )}
      
      {/* Challenge cover image */}
      <div className="relative h-48 sm:h-56 bg-gradient-to-br from-pink-50 to-blue-50">
        {challenge.coverImage ? (
          <img 
            src={challenge.coverImage} 
            alt={challenge.title}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ aspectRatio: '16/9' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center">
            <Image className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
          </div>
        )}
        
        {/* Brand info */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center">
          <img 
            src={challenge.brand?.logo || '/default-brand.png'} 
            alt={challenge.brand?.name || 'Marca'} 
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-white shadow-sm"
          />
          <span className="ml-2 font-medium text-white bg-black/60 px-2 py-1 rounded-full text-xs sm:text-sm flex items-center backdrop-blur-sm max-w-[150px] truncate">
            {challenge.brand?.name || 'Marca'}
          </span>
        </div>
        
        {/* Challenge type badge */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/90 rounded-full px-2 py-1 text-xs sm:text-sm font-medium flex items-center shadow-sm">
          {challenge.type === 'photo' ? (
            <>
              <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-pink-500" /> Foto
            </>
          ) : (
            <>
              <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" /> Vídeo
            </>
          )}
        </div>
      </div>
      
      {/* Challenge content */}
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-2">
            {challenge.title}
          </h3>
          {(winnerInfo || isCompletedTab) && (
            <span className="ml-2 bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded-full flex items-center shrink-0">
              <Trophy className="w-3 h-3 mr-1" /> Encerrado
            </span>
          )}
        </div>
        
        {/* Winner info */}
        {winnerInfo && (
          <div className="mb-3 bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-r text-sm">
            <div className="flex items-center">
              <Crown className="w-4 h-4 text-yellow-600 mr-2 shrink-0" />
              <span className="truncate">
                Vencedor: <Link to={`/user/${winnerInfo.userId}`} className="text-blue-600 hover:underline">@{winnerInfo.username}</Link>
              </span>
            </div>
          </div>
        )}
        
        <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-3">
          {challenge.description || 'Descrição não disponível'}
        </p>
        
        {/* Prize and deadline */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 text-xs sm:text-sm gap-2">
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
            <Award className="w-4 h-4 mr-1" /> 
            <span className="truncate max-w-[120px] sm:max-w-[150px]">
              {challenge.prize || 'Prêmio surpresa'}
            </span>
          </div>
          <div className="text-gray-500 flex items-center">
            {winnerInfo || isCompletedTab ? (
              <Clock className="w-4 h-4 mr-1 text-gray-400" />
            ) : (
              <Zap className="w-4 h-4 mr-1 text-blue-500" />
            )}
            {winnerInfo || isCompletedTab ? 'Encerrado' : timeLeft || 'Calculando...'}
          </div>
        </div>
        
        {/* Participants and likes */}
        <div className="flex justify-between items-center mb-4 text-xs sm:text-sm text-gray-500">
          <div className="flex items-center">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> 
            {challenge.participants || 0} participantes
          </div>
          <div className="flex items-center">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-pink-500" /> 
            {challenge.likeGoal} Meta de Likes
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
          {renderParticipateButton()}
          <button 
            onClick={() => onShareClick(challenge)}
            className="border border-gray-200 bg-white text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center shadow-sm active:bg-gray-100 sm:w-12"
            aria-label="Compartilhar desafio"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* View participations link */}
        <Link
          to={`/challenges/${challenge.id}`}
          className={`w-full py-2 text-center text-sm ${
            winnerInfo || isCompletedTab 
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
              : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
          } rounded-lg transition flex items-center justify-center`}
        >
          <Users className="w-4 h-4 mr-2" /> Ver participações
        </Link>
      </div>
    </div>
  );
};

ChallengeCard.defaultProps = {
  hideCompleted: false,
  isCompletedTab: false
};

export default ChallengeCard;