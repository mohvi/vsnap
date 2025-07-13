import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, off } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, MessageCircle, Share2, Zap, Trophy, X, List, Grid, Clock, ChevronUp, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import InstagramStyleVideoPlayer from './InstagramStyleVideoPlayer';

const ParticipationsPage = () => {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(12);
  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'AGORA';
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  const fetchChallengeAndParticipations = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch challenge details
      const challengeRef = ref(db, `challenges/${challengeId}`);
      const participationsRef = ref(db, `participations/${challengeId}`);

      const unsubscribeChallenge = onValue(challengeRef, (snapshot) => {
        if (snapshot.exists()) {
          const challengeData = snapshot.val();
          setChallenge({
            id: challengeId,
            ...challengeData,
            deadlineDate: new Date(challengeData.deadline)
          });
        }
      });

      const unsubscribeParticipations = onValue(participationsRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          setParticipations([]);
          setLoading(false);
          return;
        }

        const formattedData = Object.keys(data).map(userId => ({
          ...data[userId],
          id: data[userId].id || userId,
          createdAtFormatted: formatTimeAgo(data[userId].createdAt)
        }));

        setParticipations(formattedData);
        setLoading(false);
      }, (error) => {
        console.error("Database error:", error);
        setError("Falha ao carregar participações");
        setLoading(false);
      });

      return () => {
        off(challengeRef, 'value', unsubscribeChallenge);
        off(participationsRef, 'value', unsubscribeParticipations);
      };
    } catch (err) {
      console.error("Error setting up listeners:", err);
      setError("Erro de conexão");
      setLoading(false);
      return () => {};
    }
  }, [challengeId]);

  useEffect(() => {
    const unsubscribe = fetchChallengeAndParticipations();
    return unsubscribe;
  }, [fetchChallengeAndParticipations]);

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

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const getSortedParticipations = () => {
    if (activeFilter === 'recent') {
      return [...participations].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (activeFilter === 'top') {
      return [...participations].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    return participations;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <Skeleton height={150} />
              <div className="p-2">
                <Skeleton width={80} height={16} />
                <Skeleton width={120} height={14} className="mt-1" />
                <div className="flex justify-between mt-2">
                  <Skeleton width={40} height={14} />
                  <Skeleton width={40} height={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{error}</p>
      <button 
        onClick={fetchChallengeAndParticipations}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );

  const sortedParticipations = getSortedParticipations();
  const visibleParticipations = sortedParticipations.slice(0, visibleCount);

  return (
    <div className="max-w-2xl mx-auto p-2">
      {/* Challenge Header */}
      {challenge && (
        <div className="mb-3 bg-white rounded-lg shadow-sm p-3">
          <div className="flex items-center">
            <img 
              src={challenge.brand?.logo} 
              alt={challenge.brand?.name}
              className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100';
              }}
            />
            <div className="ml-3 flex-1">
              <h1 className="text-lg font-bold">{challenge.title}</h1>
              <p className="text-sm text-gray-600 line-clamp-2">{challenge.description}</p>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <span className="flex items-center mr-3">
                  <Zap className="w-3 h-3 mr-1" /> {challenge.prize || 'Sem prêmio'}
                </span>
                <span className="flex items-center">
                  <User className="w-3 h-3 mr-1" /> {participations.length} participações
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and View Options */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => handleFilterChange('recent')}
            className={`px-3 py-1 rounded-full text-sm flex items-center transition-colors ${
              activeFilter === 'recent' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="mr-1 w-3 h-3" /> Recentes
          </button>
          <button
            onClick={() => handleFilterChange('top')}
            className={`px-3 py-1 rounded-full text-sm flex items-center transition-colors ${
              activeFilter === 'top' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Trophy className="mr-1 w-3 h-3" /> Top
          </button>
        </div>
        <button 
          onClick={toggleViewMode}
          className="p-1 rounded-full hover:bg-gray-100"
          title={viewMode === 'grid' ? 'Modo Lista' : 'Modo Grade'}
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </button>
      </div>

      {/* Participations List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
          {visibleParticipations.map(participation => (
            <ParticipationCard
              key={participation.id}
              participation={participation}
              challenge={challenge}
              onLike={handleLike}
              currentUser={currentUser}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleParticipations.map(participation => (
            <ParticipationCard
              key={participation.id}
              participation={participation}
              challenge={challenge}
              onLike={handleLike}
              currentUser={currentUser}
              navigate={navigate}
              listView
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < sortedParticipations.length && (
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

      {/* Empty State */}
      {participations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <MessageCircle className="w-full h-full" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma participação ainda</h3>
          <p className="mt-1 text-gray-500">
            Seja o primeiro a participar deste desafio!
          </p>
          {currentUser && (
            <button 
              onClick={() => navigate(`/challenge/${challengeId}/participate`)}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all"
            >
              Participar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ParticipationCard = React.memo(({ participation, challenge, onLike, currentUser, navigate, listView = false }) => {
  const [isLiked, setIsLiked] = useState(
    currentUser && participation.likesBy && participation.likesBy[currentUser.uid]
  );
  const [likes, setLikes] = useState(participation.likes || 0);
  const commentsCount = participation.comments ? Object.keys(participation.comments).length : 0;

  const toggleLike = (e) => {
    e.stopPropagation();
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes(newLikedState ? likes + 1 : Math.max(0, likes - 1));
    onLike(participation.id, likes, isLiked);
  };

  const handleClick = () => {
    navigate(`/p/${challenge.id}/${participation.id}`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: participation.caption || `Participação de ${participation.userName}`,
        text: `Confira esta participação no desafio ${challenge.title}`,
        url: window.location.origin + `/p/${challenge.id}/${participation.id}`,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.origin + `/p/${challenge.id}/${participation.id}`);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (listView) {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
        onClick={handleClick}
      >
        <div className="p-3">
          <div className="flex items-start">
            <img
              src={participation.userAvatar}
              alt={participation.userName}
              className="w-10 h-10 rounded-full mr-2"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100';
              }}
            />
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">@{participation.userName}</p>
                  <p className="text-xs text-gray-500">{participation.createdAtFormatted}</p>
                </div>
                {participation.userId === currentUser?.uid && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Seu post
                  </span>
                )}
              </div>
              
              {participation.caption && (
                <p className="my-2 text-sm">{participation.caption}</p>
              )}
              
              {participation.mediaUrl && (
                <div className="my-2 rounded-lg overflow-hidden">
                  {participation.mediaUrl.includes('.mp4') ? (
                    <InstagramStyleVideoPlayer 
                      url={participation.mediaUrl} 
                      thumbnailUrl={participation.thumbnailUrl} 
                    />
                  ) : (
                    <img
                      src={participation.mediaUrl}
                      alt={participation.caption || 'Post do desafio'}
                      className="w-full h-auto max-h-60 object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/500';
                      }}
                    />
                  )}
                </div>
              )}
              <div className="flex justify-between items-center text-xs mt-2">
                <div className="flex items-center space-x-3">
                  <button 
                    className="flex items-center"
                    onClick={toggleLike}
                  >
                    <Heart 
                      className={`w-3 h-3 mr-1 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-gray-500'}`} 
                    />
                    <span>{likes}</span>
                  </button>
                  <div className="flex items-center">
                    <MessageCircle className="w-3 h-3 mr-1 text-gray-500" />
                    <span>{commentsCount}</span>
                  </div>
                </div>
                <button 
                  onClick={handleShare}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
      onClick={handleClick}
    >
      {participation.mediaUrl?.includes('.mp4') ? (
        <InstagramStyleVideoPlayer 
          url={participation.mediaUrl} 
          thumbnailUrl={participation.thumbnailUrl} 
        />
      ) : (
        <img
          src={participation.mediaUrl}
          alt={participation.caption || 'Post do desafio'}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/500';
          }}
        />
      )}

      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <img
              src={participation.userAvatar}
              alt={participation.userName}
              className="w-5 h-5 rounded-full mr-1"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100';
              }}
            />
            <span className="text-xs font-medium truncate max-w-[70px]">
              @{participation.userName}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {participation.createdAtFormatted}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-xs">
          <button 
            className="flex items-center"
            onClick={toggleLike}
          >
            <Heart 
              className={`w-3 h-3 mr-1 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-gray-500'}`} 
            />
            <span>{likes}</span>
          </button>
          <div className="flex items-center">
            <MessageCircle className="w-3 h-3 mr-1 text-gray-500" />
            <span>{commentsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ParticipationsPage;