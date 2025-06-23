import React, { useState, useEffect } from 'react';
import { ref, onValue, update, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ParticipationsPage = ({ challengeId }) => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const participationsRef = challengeId 
      ? query(ref(db, 'participations'), orderByChild('challengeId'), equalTo(challengeId))
      : ref(db, 'participations');

    const unsubscribe = onValue(participationsRef, (snapshot) => {
      const data = snapshot.val();
      const formattedData = data ? Object.entries(data).map(([id, item]) => ({
        id,
        ...item,
        liked: item.likesBy?.[currentUser?.uid] || false
      })).reverse() : [];
      
      setParticipations(formattedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [challengeId, currentUser?.uid]);

  const handleLike = async (id, currentLikes, isLiked) => {
    if (!currentUser) return;
    
    try {
      await update(ref(db, `participations/${id}`), {
        likes: isLiked ? currentLikes - 1 : currentLikes + 1,
        [`likesBy/${currentUser.uid}`]: !isLiked
      });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4">
      {participations.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          {participations.map((participation) => (
            <ExplorePostCard
              key={participation.id}
              data={participation}
              onLike={handleLike}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts yet</p>
        </div>
      )}
    </div>
  );
};

const ExplorePostCard = ({ data, onLike, navigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(data.liked);
  const [likes, setLikes] = useState(data.likes || 0);

  const toggleLike = () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes(newLikedState ? likes + 1 : likes - 1);
    onLike(data.id, likes, isLiked);
  };

  return (
    <div 
      className="relative aspect-square cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/p/${data.id}`)}
    >
      {/* Media */}
      {data.imageUrl?.match(/\.(mp4|mov)$/i) ? (
        <video 
          className="w-full h-full object-cover"
          poster={data.thumbnailUrl}
        >
          <source src={data.imageUrl} type="video/mp4" />
        </video>
      ) : (
        <img
          src={data.imageUrl}
          alt={data.caption}
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay on hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center space-x-4">
          <div className="flex items-center text-white font-bold">
            <Heart 
              size={24} 
              fill={isLiked ? 'currentColor' : 'none'} 
              className={`mr-1 ${isLiked ? 'text-red-500' : 'text-white'}`}
            />
            <span>{likes.toLocaleString()}</span>
          </div>
          <div className="flex items-center text-white font-bold">
            <Inbox size={24} className="mr-1" />
            <span>{data.comments ? Object.keys(data.comments).length.toLocaleString() : 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipationsPage;