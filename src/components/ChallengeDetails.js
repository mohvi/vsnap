import React, { useState, useEffect } from 'react';
import { Share2, Zap, Award, Heart, Users, Image, Video, Clock, ChevronLeft, Trophy, Crown, Lock, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../fb';
import { ref, get, onValue } from 'firebase/database';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import ParticipateModal from './ParticipateModal'; // Importe o modal de participação

const ChallengeDetails = ({ userData }) => {
  const user = userData || null;
  const { id } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [isParticipating, setIsParticipating] = useState(false);
  const navigate = useNavigate();

  // Fetch challenge data and participation status
  useEffect(() => {
    const fetchChallengeData = async () => {
      try {
        const challengeRef = ref(db, `challenges/${id}`);
        
        const unsubscribe = onValue(challengeRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setChallenge({
              id: snapshot.key,
              ...data
            });

            if (data.winner) {
              setWinnerInfo({
                username: data.winner.userName,
                userId: data.winner.userId
              });
            }
            
            if (data.participants) {
              setParticipantsCount(Object.keys(data.participants).length);
              // Check if user is already participating
              if (user && data.participants[user.uid]) {
                setIsParticipating(true);
              }
            }
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching challenge:", error);
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching challenge data:", error);
        setIsLoading(false);
      }
    };

    fetchChallengeData();
  }, [id, user]);

  // Calculate time remaining
  useEffect(() => {
    if (!challenge?.deadline) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(challenge.deadline);
      const now = new Date();
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeLeft('DESAFIO ENCERRADO');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days} DIAS ${hours} HORAS`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} HORAS ${minutes} MINUTOS`);
      } else {
        setTimeLeft(`${minutes} MINUTOS`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [challenge?.deadline]);

  const handleParticipate = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/desafio/${id}` } });
      return;
    }

    // Verificar se o desafio já expirou
    const now = new Date();
    const challengeEndDate = new Date(challenge.deadline);
    
    if (now > challengeEndDate) {
      alert('Este desafio já expirou e não aceita mais participações.');
      return;
    }

    // Verificar se o usuário já está participando
    try {
      const userParticipationRef = ref(db, `users/${user.uid}/participations/${id}`);
      const snapshot = await get(userParticipationRef);

      if (snapshot.exists()) {
        alert('Você já está participando deste desafio!');
        setIsParticipating(true);
        return;
      }

      // Se todas as verificações passarem, mostrar o modal de participação
      setShowParticipateModal(true);
    } catch (error) {
      console.error("Erro ao verificar participação:", error);
      alert("Ocorreu um erro ao verificar sua participação. Por favor, tente novamente.");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: challenge.title,
        text: `Participe deste desafio: ${challenge.description}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback para copiar o link
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handleParticipationComplete = () => {
    setIsParticipating(true);
    setShowParticipateModal(false);
  };

  if (isLoading || !challenge) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-6">
          <Skeleton height={40} width={150} />
        </div>
        <div className="grid gap-8">
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[16/9]">
            <Skeleton height="100%" />
          </div>
          <div className="space-y-4">
            <Skeleton height={30} width="70%" />
            <Skeleton count={4} />
            <div className="flex gap-4">
              <Skeleton height={40} width={120} />
              <Skeleton height={40} width={120} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header with back button */}
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 mr-2"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Detalhes do Desafio</h1>
      </div>

      {/* Challenge content */}
      <div className="grid gap-8">
        {/* Cover image */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50 aspect-[16/9] shadow-sm">
          {challenge.coverImage && (
            <img
              src={challenge.coverImage}
              alt={challenge.title}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Brand info */}
          <div className="absolute top-4 left-4 flex items-center">
            {challenge.brand?.logo && (
              <img 
                src={challenge.brand.logo} 
                alt={challenge.brand.name} 
                className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-md"
              />
            )}
            <span className="ml-2 font-medium text-white bg-black/70 px-3 py-1 rounded-full text-sm flex items-center backdrop-blur-sm">
              {challenge.brand?.name || 'Marca'}
            </span>
          </div>
          
          {/* Challenge type */}
          <div className="absolute top-4 right-4 bg-white/95 rounded-full px-3 py-1 text-sm font-medium flex items-center shadow-md">
            {challenge.type === 'photo' ? (
              <>
                <Image className="w-4 h-4 mr-1 text-pink-500" /> Desafio de Foto
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-1 text-blue-500" /> Desafio de Vídeo
              </>
            )}
          </div>
          
          {/* Time left or winner badge */}
          <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold flex items-center shadow-md ${
            winnerInfo ? 'bg-yellow-400 text-yellow-900' : 'bg-blue-600 text-white'
          }`}>
            {winnerInfo ? (
              <>
                <Crown className="w-4 h-4 mr-1" /> VENCEDOR: @{winnerInfo.username}
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-1" /> {timeLeft}
              </>
            )}
          </div>
        </div>

        {/* Challenge info */}
        <div className="space-y-6">
          {/* Title and prize */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{challenge.title}</h2>
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 px-4 py-2 rounded-lg flex items-center shadow-sm">
              <Award className="w-5 h-5 mr-2" />
              <span className="font-bold">{challenge.prize}</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Descrição do Desafio</h3>
            <p className="text-gray-700 whitespace-pre-line">{challenge.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <div className="text-gray-500 flex items-center justify-center">
                <Users className="w-5 h-5 mr-1" />
                <span>Participantes</span>
              </div>
              <div className="text-xl font-bold mt-1">{participantsCount}</div>
            </div>
            
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <div className="text-gray-500 flex items-center justify-center">
                <Heart className="w-5 h-5 mr-1 text-pink-500" />
                <span>Meta de Likes</span>
              </div>
              <div className="text-xl font-bold mt-1">{challenge.likeGoal}</div>
            </div>
            
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
              <div className="text-gray-500 flex items-center justify-center">
                <Zap className="w-5 h-5 mr-1 text-blue-500" />
                <span>Status</span>
              </div>
              <div className="text-xl font-bold mt-1">
                {winnerInfo ? 'Encerrado' : 'Ativo'}
              </div>
            </div>
          </div>

          {/* Terms */}
          {challenge.terms && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Termos e Condições</h3>
              <p className="text-gray-700 whitespace-pre-line">{challenge.terms}</p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {winnerInfo ? (
              <button 
                className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium flex-1"
                disabled
              >
                <Trophy className="w-5 h-5" /> DESAFIO ENCERRADO
              </button>
            ) : isParticipating ? (
              <button 
                className="bg-green-100 text-green-800 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium flex-1"
                disabled
              >
                <Check className="w-5 h-5" /> VOCÊ ESTÁ PARTICIPANDO
              </button>
            ) : user ? (
              <button
                onClick={handleParticipate}
                className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-3 rounded-lg hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg flex-1"
              >
                <Zap className="w-5 h-5" /> PARTICIPAR DO DESAFIO
              </button>
            ) : (
              <button
                onClick={handleParticipate}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-3 rounded-lg transition flex items-center justify-center gap-2 font-medium shadow-md flex-1"
              >
                <Lock className="w-5 h-5" /> FAÇA LOGIN PARA PARTICIPAR
              </button>
            )}
            
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <Share2 className="w-5 h-5" />
              Compartilhar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Participação */}
      {showParticipateModal && (
        <ParticipateModal 
          challenge={challenge}
          user={user}
          userData={userData}
          onClose={() => setShowParticipateModal(false)}
          onComplete={handleParticipationComplete}
        />
      )}
    </div>
  );
};

export default ChallengeDetails;