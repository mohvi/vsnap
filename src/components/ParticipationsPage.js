import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, off } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, Inbox, Loader2, MessageSquare, User, Award, Clock, ChevronUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ParticipationsPage = () => {
  const { challengeId } = useParams();
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [participations, setParticipations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('recent');
  const [visibleCount, setVisibleCount] = useState(12);
  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  const formatDatePtBr = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} d atrás`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} m atrás`;
    return `${Math.floor(diffInSeconds / 31536000)} a atrás`;
  };

  const fetchParticipations = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const participationsRef = ref(db, `participations/${challengeId}`);

      const unsubscribe = onValue(participationsRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          setParticipations({});
          setLoading(false);
          return;
        }

        // Format the data with additional fields
        const formattedData = Object.keys(data).reduce((acc, userId) => {
          acc[userId] = {
            ...data[userId],
            id: userId,
            createdAtFormatted: formatDatePtBr(data[userId].createdAt)
          };
          return acc;
        }, {});

        setParticipations(formattedData);
        setLoading(false);
      }, (error) => {
        console.error("Database error:", error);
        setError("Falha ao carregar participações");
        setLoading(false);
      });

      return () => off(participationsRef, 'value', unsubscribe);
    } catch (err) {
      console.error("Error setting up listener:", err);
      setError("Erro de conexão");
      setLoading(false);
      return () => {};
    }
  }, [challengeId]);

  useEffect(() => {
    const unsubscribe = fetchParticipations();
    return unsubscribe;
  }, [fetchParticipations]);

  const handleLike = async (participationId, currentLikes, isLiked) => {
    if (!currentUser) {
      navigate('/login', { state: { from: 'like' } });
      return;
    }
    
    try {
      const updates = {
        [`participations/${challengeId}/${participationId}/likes`]: 
          isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        [`participations/${challengeId}/${participationId}/likesBy/${currentUser.uid}`]: 
          !isLiked
      };
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Like error:', error);
      alert("Erro ao processar seu like. Por favor, tente novamente.");
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setVisibleCount(12);
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const getSortedParticipations = () => {
    const participationsArray = Object.values(participations);
    
    if (activeFilter === 'recent') {
      return participationsArray.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (activeFilter === 'top') {
      return participationsArray.sort((a, b) => b.likes - a.likes);
    }
    
    return participationsArray;
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      <span className="sr-only">Carregando...</span>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{error}</p>
      <button 
        onClick={fetchParticipations}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );

  const sortedParticipations = getSortedParticipations();
  const participationCount = sortedParticipations.length;

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4">
      {challengeDetails && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <img 
              src={challengeDetails.brand?.logo} 
              alt={challengeDetails.brand?.name}
              className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover"
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold">{challengeDetails.title}</h1>
              <p className="text-gray-600 line-clamp-2">{challengeDetails.description}</p>
              <div className="flex flex-wrap items-center mt-2 gap-x-4 gap-y-2 text-sm">
                {challengeDetails.prize && (
                  <span className="flex items-center text-gray-500">
                    <Award className="w-4 h-4 mr-1" /> {challengeDetails.prize}
                  </span>
                )}
                <span className="flex items-center text-gray-500">
                  <User className="w-4 h-4 mr-1" /> {participationCount} participações
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6 space-x-2">
        <button
          onClick={() => handleFilterChange('recent')}
          className={`px-4 py-2 rounded-full flex items-center transition-colors ${
            activeFilter === 'recent' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Clock className="mr-1 w-4 h-4" /> Recentes
        </button>
        <button
          onClick={() => handleFilterChange('top')}
          className={`px-4 py-2 rounded-full flex items-center transition-colors ${
            activeFilter === 'top' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Award className="mr-1 w-4 h-4" /> Mais curtidas
        </button>
      </div>

      {participationCount > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4">
            {sortedParticipations.slice(0, visibleCount).map((participation) => (
              <ExplorePostCard
              challengeId={challengeId}
                key={participation.id}
                data={participation}
                onLike={handleLike}
                navigate={navigate}
                currentUser={currentUser}
              />
            ))}
          </div>

          {visibleCount < participationCount && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                aria-label="Carregar mais"
              >
                <ChevronUp className="mr-1 w-5 h-5 rotate-90" />
                Carregar mais
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma participação ainda</h3>
          <p className="mt-1 text-gray-500">
            {challengeId ? 'Seja o primeiro a participar deste desafio!' : 'Nenhuma participação encontrada.'}
          </p>
        </div>
      )}
    </div>
  );
};

const ExplorePostCard = React.memo(({ challengeId,data, onLike, navigate, currentUser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(
    currentUser && data.likesBy && data.likesBy[currentUser.uid]
  );
  const [likes, setLikes] = useState(data.likes || 0);
  const [commentsCount] = useState(data.comments ? Object.keys(data.comments).length : 0);

  const toggleLike = (e) => {
    e.stopPropagation();
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes(newLikedState ? likes + 1 : Math.max(0, likes - 1));
    onLike(data.id, likes, isLiked);
  };

  const handleClick = () => {
    navigate(`/p/${challengeId}/${data.id}`, { state: { from: 'explore' } });
  };

  const isVideo = data.imageUrl?.match(/\.(mp4|mov|webm)$/i);

  return (
    <div 
      className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      aria-label={`Post de ${data.userName}`}
    >
      {isVideo ? (
        <video 
          className="w-full h-full object-cover"
          poster={data.thumbnailUrl}
          muted
          loop
          playsInline
        >
          <source src={data.imageUrl} type="video/mp4" />
        </video>
      ) : (
        <img
          src={data.imageUrl}
          alt={data.caption || `Post de ${data.userName}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = '/placeholder-image.jpg';
            e.target.alt = 'Imagem não disponível';
          }}
        />
      )}

      <div className={`absolute inset-0 transition-opacity duration-200 ${
        isHovered ? 'bg-black bg-opacity-30 opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          {data.caption && (
            <p className="text-white text-sm line-clamp-2">{data.caption}</p>
          )}
          <div className="flex justify-between items-center mt-2 text-white">
            <div className="flex items-center max-w-[60%]">
              <img 
                src={data.userAvatar || '/default-avatar.jpg'} 
                alt={data.userName}
                className="w-6 h-6 rounded-full mr-2 border border-white object-cover"
                onError={(e) => {
                  e.target.src = '/default-avatar.jpg';
                }}
              />
              <span className="text-sm font-medium truncate">{data.userName}</span>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={toggleLike}
                className="flex items-center hover:text-red-400 transition-colors"
                aria-label={isLiked ? 'Remover like' : 'Curtir'}
              >
                <Heart 
                  size={18} 
                  fill={isLiked ? 'currentColor' : 'none'} 
                  className={`mr-1 ${isLiked ? 'text-red-500' : 'text-white'}`}
                />
                <span className="text-sm">{likes.toLocaleString()}</span>
              </button>
              <div className="flex items-center">
                <MessageSquare size={18} className="mr-1" />
                <span className="text-sm">{commentsCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentUser?.uid === data.userId && (
        <div className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm">
          Seu post
        </div>
      )}

      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
        {data.createdAtFormatted}
      </div>
    </div>
  );
});

export default ParticipationsPage;