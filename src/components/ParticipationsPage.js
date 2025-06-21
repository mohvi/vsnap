import React, { useState, useEffect } from 'react';
import { ref, onValue, update, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../fb';
import { ThumbsUp, MessageCircle, Share, Loader } from 'lucide-react';

const ParticipationsPage = ({ challengeId }) => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

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
    if (!currentUser) return alert('Login required to like');
    
    try {
      await update(ref(db, `participations/${id}`), {
        likes: isLiked ? currentLikes - 1 : currentLikes + 1,
        [`likesBy/${currentUser.uid}`]: !isLiked
      });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleShare = async (participation) => {
    try {
      const shareData = {
        title: `Check out ${participation.userName}'s post`,
        text: participation.caption,
        url: `${window.location.origin}/view/${participation.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="animate-spin h-8 w-8 text-blue-500" />
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        {challengeId ? 'Challenge Entries' : 'All Submissions'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {participations.length > 0 ? (
          participations.map(participation => (
            <ParticipationCard
              key={participation.id}
              data={participation}
              onLike={handleLike}
              onShare={handleShare}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No submissions yet</p>
          </div>
        )}
      </div>
    </main>
  );
};

const ParticipationCard = ({ data, onLike, onShare, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;
    
    // Implement comment submission logic here
    console.log('New comment:', comment);
    setComment('');
  };

  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
      {/* Header */}
      <header className="p-4 flex items-center border-b">
        <img
          src={data.userPhoto || '/default-avatar.png'}
          alt={data.userName}
          className="w-10 h-10 rounded-full object-cover mr-3"
        />
        <div>
          <h2 className="font-semibold">{data.userName}</h2>
          <p className="text-sm text-gray-500">{new Date(data.createdAt).toLocaleDateString()}</p>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {data.imageUrl?.match(/\.(mp4|mov)$/i) ? (
          <video 
            controls 
            className="w-full aspect-video bg-black rounded-lg mb-3"
            poster={data.thumbnailUrl}
          >
            <source src={data.imageUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={data.imageUrl}
            alt={data.caption}
            className="w-full h-64 object-cover rounded-lg mb-3"
          />
        )}

        <p className="mb-4 whitespace-pre-line">{data.caption}</p>

        {/* Engagement Bar */}
        <div className="flex justify-between border-t pt-3">
          <button
            onClick={() => onLike(data.id, data.likes || 0, data.liked)}
            className={`flex items-center ${data.liked ? 'text-red-500' : 'text-gray-500'}`}
            aria-label="Like"
          >
            <ThumbsUp className="mr-1" />
            <span>{data.likes || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center text-gray-500"
            aria-label="Comments"
          >
            <MessageCircle className="mr-1" />
            <span>Comment</span>
          </button>

          <button
            onClick={() => onShare(data)}
            className="flex items-center text-gray-500 hover:text-blue-500"
            aria-label="Share"
          >
            <Share className="mr-1" />
            <span>Share</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-3 border-t">
            <div className="mb-4 max-h-40 overflow-y-auto">
              {data.comments ? (
                Object.entries(data.comments).map(([id, comment]) => (
                  <div key={id} className="mb-3 pb-3 border-b last:border-0">
                    <div className="flex items-start">
                      <img 
                        src={comment.userPhoto || '/default-avatar.png'} 
                        className="w-6 h-6 rounded-full mr-2 mt-1" 
                        alt={comment.userName} 
                      />
                      <div>
                        <p className="font-medium text-sm">{comment.userName}</p>
                        <p className="text-gray-700">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No comments yet</p>
              )}
            </div>

            {currentUser && (
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 border rounded-full px-4 py-2 text-sm"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim()}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ParticipationsPage;