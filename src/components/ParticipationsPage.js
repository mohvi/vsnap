import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, query, orderByChild, equalTo, off } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, Inbox, Loader2, MessageSquare, User, Award, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ParticipationsPage = ({ challengeId, challengeDetails }) => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('recent');
  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  const fetchParticipations = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      let participationsRef;
      
      if (challengeId) {
        participationsRef = query(
          ref(db, 'participations'),
          orderByChild('challengeId'),
          equalTo(challengeId)
        );
      } else {
        participationsRef = ref(db, 'participations');
      }

      const unsubscribe = onValue(participationsRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          setParticipations([]);
          setLoading(false);
          return;
        }

        let formattedData = Object.entries(data).map(([id, item]) => ({
          id,
          ...item,
          liked: item.likesBy?.[currentUser?.uid] || false,
          createdAtFormatted: formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
            locale: ptBR
          })
        }));

        // Aplicar filtros
        switch (activeFilter) {
          case 'top':
            formattedData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
          case 'recent':
          default:
            formattedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        setParticipations(formattedData);
        setLoading(false);
      }, (error) => {
        console.error("Database error:", error);
        setError("Erro ao carregar participações");
        setLoading(false);
      });

      return () => {
        off(participationsRef, 'value', unsubscribe);
      };
    } catch (err) {
      console.error("Error setting up listener:", err);
      setError("Erro ao configurar conexão");
      setLoading(false);
      return () => {};
    }
  }, [challengeId, currentUser?.uid, activeFilter]);

  useEffect(() => {
    const unsubscribe = fetchParticipations();
    return unsubscribe;
  }, [fetchParticipations]);

  const handleLike = async (id, currentLikes, isLiked) => {
    if (!currentUser) {
      navigate('/login', { state: { from: 'like' } });
      return;
    }
    
    try {
      await update(ref(db, `participations/${id}`), {
        likes: isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        [`likesBy/${currentUser.uid}`]: !isLiked
      });
    } catch (error) {
      console.error('Like error:', error);
      alert("Ocorreu um erro ao processar seu like. Tente novamente.");
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{error}</p>
      <button 
        onClick={fetchParticipations}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4">
      {/* Header com informações do desafio (se challengeDetails existir) */}
      {challengeDetails && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <img 
              src={challengeDetails.brand?.logo} 
              alt={challengeDetails.brand?.name}
              className="w-16 h-16 rounded-full border-2 border-white shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold">{challengeDetails.title}</h1>
              <p className="text-gray-600">{challengeDetails.description}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm">
                <span className="flex items-center text-gray-500">
                  <Award className="w-4 h-4 mr-1" /> {challengeDetails.prize}
                </span>
                <span className="flex items-center text-gray-500">
                  <User className="w-4 h-4 mr-1" /> {participations.length} participações
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex justify-center mb-6 space-x-2">
        <button
          onClick={() => handleFilterChange('recent')}
          className={`px-4 py-2 rounded-full ${activeFilter === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Clock className="inline mr-1 w-4 h-4" /> Recentes
        </button>
        <button
          onClick={() => handleFilterChange('top')}
          className={`px-4 py-2 rounded-full ${activeFilter === 'top' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Award className="inline mr-1 w-4 h-4" /> Mais curtidas
        </button>
      </div>

      {/* Lista de participações */}
      {participations.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4">
            {participations.map((participation) => (
              <ExplorePostCard
                key={participation.id}
                data={participation}
                onLike={handleLike}
                navigate={navigate}
                currentUser={currentUser}
              />
            ))}
          </div>
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

const ExplorePostCard = ({ data, onLike, navigate, currentUser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(data.liked);
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
    navigate(`/p/${data.id}`, { state: { from: 'explore' } });
  };

  return (
    <div 
      className="relative aspect-square cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Media */}
      {data.imageUrl?.match(/\.(mp4|mov|webm)$/i) ? (
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
          alt={data.caption}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Overlay on hover */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${isHovered ? 'bg-black bg-opacity-30 opacity-100' : 'opacity-0'}`}>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm line-clamp-2">{data.caption}</p>
          <div className="flex justify-between items-center mt-2 text-white">
            <div className="flex items-center">
              <img 
                src={data.userAvatar || 'https://via.placeholder.com/30'} 
                alt={data.userName}
                className="w-6 h-6 rounded-full mr-2 border border-white"
              />
              <span className="text-sm font-medium">{data.userName}</span>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={toggleLike}
                className="flex items-center hover:text-red-400 transition-colors"
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

      {/* Badge para conteúdo do usuário atual */}
      {currentUser?.uid === data.userId && (
        <div className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm">
          Sua publicação
        </div>
      )}
    </div>
  );
};

export default ParticipationsPage;