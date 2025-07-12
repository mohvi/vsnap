import React, { useState, useEffect, useMemo } from 'react';
import { Share2, Zap, Award, Heart, Users, Image, Video, Check, Trophy, Crown, Clock, MapPin, Info } from 'lucide-react';
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
  isCompletedTab = false,
}) => {
  const [participationStatus, setParticipationStatus] = useState('loading');
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Calculate time remaining for the challenge
  useEffect(() => {
    if (!challenge?.deadline || challenge?.winner) return;

    const calculateTimeLeft = () => {
      try {
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
        console.error('Error calculating time left:', error);
        setTimeLeft('Data inválida');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [challenge?.deadline, challenge?.winner]);

  // Fetch challenge data and participation status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengeSnapshot, participationSnapshot] = await Promise.all([
          get(ref(db, `challenges/${challenge.id}`)),
          user ? get(ref(db, `users/${user.uid}/participations/${challenge.id}`)) : null,
        ]);

        if (challengeSnapshot.exists()) {
          const challengeData = challengeSnapshot.val();
          if (challengeData.winner) {
            setWinnerInfo({
              username: challengeData.winner.userName,
              userId: challengeData.winner.userId,
            });
          }
        }

        setParticipationStatus(participationSnapshot?.exists() ? 'participated' : 'can_participate');
      } catch (error) {
        console.error('Error fetching data:', error);
        setParticipationStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, challenge.id]);

  // Format interaction count
  const formattedInteractionCount = useMemo(() => {
    const count = challenge.totalLikes || 0;
    return count > 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
  }, [challenge.totalLikes]);

  // Calculate like progress
  const likeProgress = useMemo(() => {
    if (!challenge.likeGoal || !challenge.totalLikes) return 0;
    return Math.min((challenge.totalLikes / challenge.likeGoal) * 100, 100);
  }, [challenge.likeGoal, challenge.totalLikes]);

  // Format createdAt date
  const formattedCreatedAt = useMemo(() => {
    if (!challenge.createdAt) return 'Data indisponível';
    const date = new Date(challenge.createdAt);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [challenge.createdAt]);

  // Format location
  const formattedLocation = useMemo(() => {
    return challenge.location?.isNational ? 'Nacional' : challenge.location?.province || 'Localização não especificada';
  }, [challenge.location]);

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

  // Render participate button
  const renderParticipateButton = () => {
    if (winnerInfo || isCompletedTab) {
      return (
        <button
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg flex-1 cursor-default flex items-center justify-center text-sm"
          disabled
          aria-label="Desafio encerrado"
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
          disabled
          aria-label="Você já está participando"
        >
          <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Participando
        </button>
      );
    }

    return (
      <button
        onClick={() => onParticipateClick(challenge)}
        className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 rounded-lg flex-1 hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center shadow-md hover:shadow-lg active:scale-[0.98] text-sm animate-pulse"
        aria-label="Participar do desafio"
      >
        Participar Agora
      </button>
    );
  };

  // Modal for full-size image
  const renderImageModal = () => (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-labelledby="image-modal-title"
      onClick={() => setShowImageModal(false)}
    >
      <div className="relative max-w-4xl w-full p-4">
        <button
          className="absolute top-2 right-2 bg-white/90 rounded-full p-2 hover:bg-white transition"
          onClick={() => setShowImageModal(false)}
          aria-label="Fechar imagem"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={challenge.coverImage}
          alt={challenge.title}
          className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
          style={{ animation: 'zoomIn 0.3s ease-in-out' }}
        />
      </div>
    </div>
  );

  // Modal for challenge details
  const renderDetailsModal = () => (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-labelledby="details-modal-title"
      onClick={() => setShowDetailsModal(false)}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-2xl p-6 sm:p-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition"
          onClick={() => setShowDetailsModal(false)}
          aria-label="Fechar detalhes"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 id="details-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          {challenge.title}
        </h2>
        <div className="space-y-4">
          {/* Brand */}
          <div className="flex items-center">
            <img
              src={challenge.brand?.logo || '/default-brand.png'}
              alt={challenge.brand?.name || 'Marca'}
              className="w-8 h-8 rounded-full border-2 border-gray-200 mr-2"
            />
            <span className="font-medium text-gray-700">{challenge.brand?.name || 'Marca'}</span>
          </div>
          {/* Cover Image */}
          {challenge.coverImage && (
            <img
              src={challenge.coverImage}
              alt={challenge.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Descrição</h3>
            <p className="text-gray-700 text-sm">{challenge.description || 'Descrição não disponível'}</p>
          </div>
          {/* Prize */}
          <div className="flex items-center">
            <Award className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-gray-700 text-sm">Prêmio: {challenge.prize || 'Prêmio surpresa'}</span>
          </div>
          {/* Location */}
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-gray-700 text-sm">Localização: {formattedLocation}</span>
          </div>
          {/* Created At */}
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-gray-700 text-sm">Criado em: {formattedCreatedAt}</span>
          </div>
          {/* Deadline */}
          <div className="flex items-center">
            <Clock className={`w-5 h-5 mr-2 ${timeLeft.includes('m') && !timeLeft.includes('h') ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
            <span className="text-gray-700 text-sm">Prazo: {timeLeft || 'Calculando...'}</span>
          </div>
          {/* Status */}
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 text-sm">Estado: {challenge.status === 'active' ? 'Ativo' : 'Encerrado'}</span>
          </div>
          {/* Type */}
          <div className="flex items-center">
            {challenge.type === 'photo' ? (
              <Image className="w-5 h-5 text-pink-500 mr-2 animate-spin-slow" />
            ) : (
              <Video className="w-5 h-5 text-blue-500 mr-2 animate-spin-slow" />
            )}
            <span className="text-gray-700 text-sm">Tipo: {challenge.type === 'photo' ? 'Foto' : 'Vídeo'}</span>
          </div>
          {/* Participants */}
          <div className="flex items-center">
            <Users className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-gray-700 text-sm">{challenge.participants || 0} participantes</span>
          </div>
          {/* Like Goal and Progress */}
          <div>
            <div className="flex items-center">
              <Heart className="w-5 h-5 text-pink-500 mr-2" />
              <span className="text-gray-700 text-sm">
               Meta de Likes {challenge.likeGoal} Likes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition max-w-full sm:max-w-md mx-auto ${
        winnerInfo ? 'border-yellow-400 border-2' : ''
      }`}
    >
      {/* Winner badge */}
      {winnerInfo && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center z-10 shadow-sm animate-bounce">
          <Crown className="w-3 h-3 mr-1" /> VENCEDOR
        </div>
      )}

      {/* Challenge cover image */}
      <div
        className="relative h-48 sm:h-56 bg-gradient-to-br from-pink-50 to-blue-50 cursor-pointer"
        onClick={() => challenge.coverImage && setShowImageModal(true)}
        role="button"
        aria-label={`Ver imagem do desafio ${challenge.title} em tamanho real`}
      >
        {challenge.coverImage ? (
          <img
            src={challenge.coverImage}
            alt={challenge.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
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

        {/* Challenge type badge with animation */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/90 rounded-full px-2 py-1 text-xs sm:text-sm font-medium flex items-center shadow-sm animate-pulse">
          {challenge.type === 'photo' ? (
            <>
              <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-pink-500 animate-spin-slow" /> Foto
            </>
          ) : (
            <>
              <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500 animate-spin-slow" /> Vídeo
            </>
          )}
        </div>

        {/* Popular badge */}
        {challenge.participants > 50 && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center z-10 shadow-sm">
            <Zap className="w-3 h-3 mr-1" /> POPULAR
          </div>
        )}
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
            {(winnerInfo || isCompletedTab) ? (
              <Clock className="w-4 h-4 mr-1 text-gray-400" />
            ) : (
              <Clock className={`w-4 h-4 mr-1 ${timeLeft.includes('m') && !timeLeft.includes('h') ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
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
           Meta de likes {challenge.likeGoal} Likes
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
          <button
            onClick={() => setShowDetailsModal(true)}
            className="border border-gray-200 bg-white text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center shadow-sm active:bg-gray-100 sm:w-12"
            aria-label="Ver detalhes do desafio"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
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

      {/* Render modals */}
      {showImageModal && renderImageModal()}
      {showDetailsModal && renderDetailsModal()}
    </div>
  );
};

ChallengeCard.defaultProps = {
  hideCompleted: false,
  isCompletedTab: false,
};

export default ChallengeCard;