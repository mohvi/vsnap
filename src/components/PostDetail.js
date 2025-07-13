import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, update, off, push, remove, get } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, MessageSquare, ChevronLeft, Send, MoreVertical, Edit2, Trash2, X, Share2, Smile, User, Bookmark, Flag, Trophy, Target, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RxHeartFilled } from 'react-icons/rx';
import ReactPlayer from 'react-player';
import InstagramStyleVideoPlayer from './InstagramStyleVideoPlayer';

const VideoPlayer = ({ url, thumbnailUrl }) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);
  const controlsTimeout = useRef(null);

  useEffect(() => {
    if (playing) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(controlsTimeout.current);
  }, [playing, showControls]);

  const togglePlay = () => {
    setPlaying(!playing);
    setShowControls(true);
    if (!hasPlayed) setHasPlayed(true);
  };

  const toggleMute = () => {
    setMuted(!muted);
    setShowControls(true);
  };

  const handleProgress = (state) => {
    setProgress(state.played);
    setShowControls(true);
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    playerRef.current.seekTo(pos);
    setProgress(pos);
    setShowControls(true);
  };

  return (
    <div 
      className="relative w-full h-full bg-black"
      onClick={togglePlay}
      onMouseMove={() => setShowControls(true)}
    >
      <video
        ref={playerRef}
        url={url}
        playing={playing}
        muted={muted}
        width="100%"
        height="100%"
        playsinline
        loop
        onProgress={handleProgress}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        light={!hasPlayed && thumbnailUrl}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
          <div 
            className="w-full h-1.5 bg-gray-600/50 rounded-full cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="h-full bg-white rounded-full relative"
              style={{ width: `${progress * 100}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="absolute -right-1.5 -top-1 w-3 h-3 bg-white rounded-full"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onClick={handleSeek}
            />
          </div>
          
          <div 
            className="flex justify-between items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={togglePlay}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {playing ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
        </div>
      )}

      {!playing && !hasPlayed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button 
            onClick={togglePlay}
            className="p-4 bg-black/50 rounded-full text-white animate-pulse"
          >
            <Play size={48} />
          </button>
        </div>
      )}
    </div>
  );
};

const PostDetails = ({ userData }) => {
  const { id, challengeId } = useParams();
  const [post, setPost] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likesList, setLikesList] = useState([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [showCommentOptions, setShowCommentOptions] = useState(null);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
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

  const fetchChallengeData = async () => {
    try {
      const challengeRef = ref(db, `challenges/${challengeId}`);
      const snapshot = await get(challengeRef);
      if (snapshot.exists()) {
        const challengeData = snapshot.val();
        setChallenge(challengeData);
        
        if (post && challengeData.likeGoal) {
          const percentage = Math.min(Math.floor((likesCount / challengeData.likeGoal) * 100), 100);
          setProgressPercentage(percentage);
        }
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
    }
  };

  const checkIfWinner = useCallback(() => {
    if (!challenge || !post) return;

    if (post.isWinner) {
      setIsWinner(true);
      return;
    }

    const hasReachedGoal = likesCount >= challenge.likeGoal;
    const isChallengeActive = !challenge.winner && new Date(challenge.deadline) > new Date();

    if (hasReachedGoal && isChallengeActive) {
      declareWinner();
    }
  }, [challenge, post, likesCount]);

  const declareWinner = async () => {
    if (!challenge || !post) return;

    try {
      const updates = {
        [`challenges/${challengeId}/winner`]: {
          postId: id,
          userId: post.userId,
          userName: post.userName,
          userAvatar: post.userAvatar,
          declaredAt: new Date().toISOString()
        },
        [`participations/${challengeId}/${id}/isWinner`]: true,
        [`users/${post.userId}/achievements/${challengeId}`]: {
          challengeTitle: challenge.title,
          prize: challenge.prize,
          wonAt: new Date().toISOString()
        },
        [`winners/${challengeId}/${post.userId}`]: {
          challengeId: challengeId,
          challengeTitle: challenge.title,
          prize: challenge.prize,
          postId: id,
          userId: post.userId,
          userName: post.userName,
          userAvatar: post.userAvatar,
          wonAt: new Date().toISOString()
        }
      };

      await update(ref(db), updates);
      setIsWinner(true);
      setPost(prev => ({ ...prev, isWinner: true }));
    } catch (error) {
      console.error('Error declaring winner:', error);
      alert('Erro ao declarar vencedor. Por favor, tente novamente.');
    }
  };

  const fetchPostAndComments = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const postRef = ref(db, `participations/${challengeId}/${id}`);
      const unsubscribePost = onValue(postRef, (snapshot) => {
        const postData = snapshot.val();

        if (!postData) {
          setError("Post não encontrado");
          setLoading(false);
          return;
        }

        setPost({
          ...postData,
          id: id,
          createdAtFormatted: formatDatePtBr(postData.createdAt)
        });

        if (currentUser && postData.likesBy && postData.likesBy[currentUser.uid]) {
          setIsLiked(true);
        } else {
          setIsLiked(false);
        }

        setLikesCount(postData.likes || 0);
        
        if (postData.likesBy) {
          const likesArray = Object.keys(postData.likesBy)
            .filter(uid => postData.likesBy[uid])
            .map(uid => ({
              userId: uid,
              userName: postData.likesBy[uid].userName || 'Usuário',
              userAvatar: postData.likesBy[uid].userAvatar || ''
            }));
          setLikesList(likesArray);
        } else {
          setLikesList([]);
        }

        setLoading(false);
        fetchChallengeData();
      }, (error) => {
        console.error("Database error:", error);
        setError("Falha ao carregar o post");
        setLoading(false);
      });

      const commentsRef = ref(db, `comments/${id}`);
      const unsubscribeComments = onValue(commentsRef, (snapshot) => {
        const commentsData = snapshot.val();
        
        if (!commentsData) {
          setComments([]);
          return;
        }

        const formattedComments = Object.keys(commentsData).map(commentId => ({
          ...commentsData[commentId],
          id: commentId,
          createdAtFormatted: formatDatePtBr(commentsData[commentId].createdAt)
        }));

        setComments(formattedComments);
      }, (error) => {
        console.error("Database error:", error);
        setError("Falha ao carregar comentários");
      });

      return () => {
        off(postRef, 'value', unsubscribePost);
        off(commentsRef, 'value', unsubscribeComments);
      };
    } catch (err) {
      console.error("Error setting up listeners:", err);
      setError("Erro de conexão");
      setLoading(false);
      return () => {};
    }
  }, [id, challengeId, currentUser]);

  useEffect(() => {
    const unsubscribe = fetchPostAndComments();
    return unsubscribe;
  }, [fetchPostAndComments]);

  useEffect(() => {
    checkIfWinner();
  }, [checkIfWinner]);

  useEffect(() => {
    if (challenge?.likeGoal && likesCount) {
      const percentage = Math.min(Math.floor((likesCount / challenge.likeGoal) * 100), 100);
      setProgressPercentage(percentage);
    }
  }, [likesCount, challenge]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: 'like' } });
      return;
    }
    
    try {
      const updates = {
        [`participations/${challengeId}/${id}/likes`]: isLiked ? likesCount - 1 : likesCount + 1,
        [`participations/${challengeId}/${id}/likesBy/${currentUser.uid}`]: isLiked ? null : {
          userName: userData.username || 'Usuário',
          userId: currentUser.uid,
          userAvatar: currentUser.photoURL || '',
          timestamp: new Date().toISOString()
        }
      };
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Like error:', error);
      alert("Erro ao processar seu like. Por favor, tente novamente.");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    try {
      const commentData = {
        text: newComment,
        userId: currentUser.uid,
        userName: userData.username || 'Anônimo',
        userAvatar: currentUser.photoURL || '',
        createdAt: new Date().toISOString()
      };

      await push(ref(db, `comments/${id}`), commentData);
      setNewComment('');
    } catch (error) {
      console.error('Comment error:', error);
      alert("Erro ao enviar comentário. Por favor, tente novamente.");
    }
  };

  const handleEditComment = (commentId, currentText) => {
    setEditingCommentId(commentId);
    setEditedCommentText(currentText);
    setShowCommentOptions(null);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editedCommentText.trim()) return;

    try {
      await update(ref(db, `comments/${id}/${commentId}`), {
        text: editedCommentText,
        editedAt: new Date().toISOString()
      });
      setEditingCommentId(null);
      setEditedCommentText('');
    } catch (error) {
      console.error('Update comment error:', error);
      alert("Erro ao atualizar o comentário. Por favor, tente novamente.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Tem certeza que deseja excluir este comentário?")) {
      try {
        await remove(ref(db, `comments/${id}/${commentId}`));
        setShowCommentOptions(null);
      } catch (error) {
        console.error('Delete comment error:', error);
        alert("Erro ao excluir o comentário. Por favor, tente novamente.");
      }
    }
  };

  const handleRemoveParticipation = async () => {
    if (!currentUser || !post) return;
    
    if (window.confirm("Tem certeza que deseja remover esta participação do desafio?")) {
      try {
        await update(ref(db, `participations/${challengeId}/${id}`), {
          challengeId: null,
          removedAt: new Date().toISOString()
        });
        
        alert("Participação removida do desafio com sucesso!");
        navigate(`/challenges/${challengeId}`);
      } catch (error) {
        console.error('Remove participation error:', error);
        alert("Erro ao remover participação. Por favor, tente novamente.");
      }
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post de ${post.userName}`,
          text: post.caption || 'Confira este post incrível!',
          url: window.location.href,
        });
      } else {
        setShowShareOptions(!showShareOptions);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado para a área de transferência!');
    setShowShareOptions(false);
  };

  const reportPost = () => {
    alert('Post reportado. Nossa equipe irá analisar o conteúdo.');
    setShowPostOptions(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen flex flex-col justify-center">
      <p className="text-red-500 mb-4 text-lg">{error}</p>
      <button 
        onClick={fetchPostAndComments}
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full hover:opacity-90 transition-all shadow-lg mx-auto"
      >
        Tentar novamente
      </button>
    </div>
  );

  if (!post) return (
    <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen flex flex-col justify-center">
      <p className="text-gray-600 text-lg">Post não encontrado</p>
      <button 
        onClick={() => navigate(-1)}
        className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full hover:opacity-90 transition-all shadow-lg mx-auto"
      >
        Voltar
      </button>
    </div>
  );

  const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov');
  const isPostOwner = currentUser && currentUser.uid === post.userId;
  const remainingLikes = challenge ? Math.max(0, challenge.likeGoal - likesCount) : 0;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {showLikesModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              <h3 className="text-lg font-bold">Curtidas</h3>
              <button 
                onClick={() => setShowLikesModal(false)} 
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              {likesList.length > 0 ? (
                likesList.map((like) => (
                  <div key={like.userId} className="p-3 hover:bg-gray-50 transition-colors flex items-center">
                    <img 
                      src={like.userAvatar || '/default-avatar.jpg'} 
                      alt={like.userName}
                      className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-purple-100"
                    />
                    <div>
                      <p className="font-medium text-gray-800">{like.userName}</p>
                      <p className="text-xs text-gray-500">@{like.userName.replace(/\s+/g, '').toLowerCase()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Smile className="w-12 h-12 mx-auto text-purple-300 mb-4" />
                  <p className="text-gray-600 font-medium">Nenhuma curtida ainda</p>
                  <p className="text-sm text-gray-400 mt-1">Seja o primeiro a curtir!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-gray-100 flex items-center bg-gradient-to-r from-purple-500 to-blue-500 text-white sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-1 rounded-full hover:bg-white/20 mr-2 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Publicação</h1>
        {isWinner && (
          <div className="ml-auto flex items-center bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
            <Trophy className="w-4 h-4 mr-1" /> Vencedor
          </div>
        )}
      </div>

      <div className="md:flex">
        <div className="md:w-3/5 bg-gray-900 flex items-center justify-center min-h-[60vh]">
          {isVideo ? (
             <InstagramStyleVideoPlayer 
              url={post.mediaUrl} 
              thumbnailUrl={post.thumbnailUrl} 
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || `Post de ${post.userName}`}
              className="w-full max-h-[80vh] object-contain"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
                e.target.alt = 'Imagem não disponível';
              }}
            />
          )}
        </div>

        <div className="md:w-2/5 border-l border-gray-100 flex flex-col h-[80vh]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center">
              <img 
                src={post.userAvatar || '/default-avatar.jpg'} 
                alt={post.userName}
                className="w-10 h-10 rounded-full mr-3 border-2 border-purple-300 object-cover shadow-sm"
              />
              <div>
                <p className="font-bold text-gray-800">{post.userName}</p>
                <p className="text-xs text-gray-500">{post.createdAtFormatted}</p>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowPostOptions(!showPostOptions)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showPostOptions && (
                <div className="absolute right-0 top-10 bg-white shadow-lg rounded-lg z-20 w-48 overflow-hidden border border-gray-100">
                  {isPostOwner && (
                    <>
                      <button
                        onClick={handleRemoveParticipation}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center text-sm text-gray-700 transition-colors border-b border-gray-100"
                      >
                        <Trash2 size={16} className="mr-2" /> Remover do desafio
                      </button>
                    </>
                  )}
                  <button
                    onClick={reportPost}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center text-sm text-red-500 transition-colors"
                      >
                    <Flag size={16} className="mr-2" /> Denunciar
                  </button>
                </div>
              )}
            </div>
          </div>

          {challenge && (
            <div className="border-t border-b border-gray-100 p-4 bg-purple-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <img 
                    src={challenge.brand?.logo || '/default-brand.jpg'} 
                    alt={challenge.brand?.name || 'Marca'} 
                    className="w-8 h-8 rounded-full mr-2 border border-purple-200"
                  />
                  <span className="font-semibold text-purple-700">{challenge.title}</span>
                </div>
                {!isWinner && challenge.likeGoal && (
                  <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    Meta: {challenge.likeGoal} likes
                  </span>
                )}
              </div>
              
              {!isWinner && challenge.likeGoal && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-purple-700 mb-1">
                    <span>{likesCount} likes</span>
                    <span>Faltam {remainingLikes} likes</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  {progressPercentage >= 100 && (
                    <div className="mt-2 text-center text-sm text-purple-700 font-medium flex items-center justify-center">
                      <Target className="w-4 h-4 mr-1" /> Meta alcançada!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {post.caption && (
              <div className="flex items-start space-x-3 bg-white p-4 rounded-xl shadow-sm">
                <Link to={`/profile/${post.userId}`} className="block hover:underline">
                  <img 
                    src={post.userAvatar || '/default-avatar.jpg'} 
                    alt={post.userName}
                    className="w-9 h-9 rounded-full border border-purple-200 object-cover flex-shrink-0"
                  />
                </Link>
                <div className="flex-1">
                  <Link to={`/profile/${post.userId}`} className="block hover:underline">
                    <div className="flex items-baseline space-x-2">
                      <p className="font-semibold text-purple-600">{post.userName}</p>
                      <p className="text-xs text-gray-400">{post.createdAtFormatted}</p>
                    </div>
                  </Link>
                  <p className="text-gray-700 mt-1">{post.caption}</p>
                </div>
              </div>
            )}

            {comments.length > 0 ? (
              comments.map(comment => (
                <div 
                  key={comment.id} 
                  className="flex items-start space-x-3 bg-white p-4 rounded-xl shadow-sm relative hover:shadow-md transition-shadow"
                >
                  <img 
                    src={comment.userAvatar || '/default-avatar.jpg'} 
                    alt={comment.userName}
                    className="w-9 h-9 rounded-full border border-purple-200 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-baseline space-x-2">
                        <p className="font-semibold text-purple-600">{comment.userName}</p>
                        <p className="text-xs text-gray-400">
                          {comment.createdAtFormatted}
                        </p>
                      </div>
                      {currentUser?.uid === comment.userId && (
                        <button 
                          onClick={() => setShowCommentOptions(showCommentOptions === comment.id ? null : comment.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editedCommentText}
                          onChange={(e) => setEditedCommentText(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                          rows="3"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button 
                            onClick={() => setEditingCommentId(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleUpdateComment(comment.id)}
                            className="text-sm bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors"
                          >
                            Atualizar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 mt-1 break-words">{comment.text}</p>
                    )}

                    {showCommentOptions === comment.id && (
                      <div className="absolute right-4 top-12 bg-white shadow-lg rounded-lg z-10 w-40 overflow-hidden border border-gray-100">
                        <button
                          onClick={() => handleEditComment(comment.id, comment.text)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700 transition-colors"
                        >
                          <Edit2 size={14} className="mr-2" /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-red-500 transition-colors"
                        >
                          <Trash2 size={14} className="mr-2" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <MessageSquare className="w-12 h-12 text-purple-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">Nenhum comentário ainda</h3>
                <p className="text-gray-500 mt-1">Seja o primeiro a comentar!</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0">
            <div className="flex justify-between items-center mb-3">
              <div className="flex space-x-4">
                <button 
                  onClick={handleLike}
                  className="group focus:outline-none"
                  aria-label={isLiked ? 'Remover curtida' : 'Curtir'}
                >
                  {isLiked ? (
                    <RxHeartFilled size={26} className="text-red-500 animate-pulse" />
                  ) : (
                    <div className="relative">
                      <Heart size={26} className="text-gray-600 group-hover:text-red-400 transition-colors" />
                      <div className="absolute inset-0 scale-0 group-hover:scale-100 transition-transform">
                        <Heart size={26} className="text-red-400 opacity-30" />
                      </div>
                    </div>
                  )}
                </button>
                <button 
                  className="group focus:outline-none text-gray-600 hover:text-blue-400 transition-colors"
                  aria-label="Comentar"
                >
                  <MessageSquare size={26} />
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={handleShare}
                  className="group focus:outline-none text-gray-600 hover:text-green-500 transition-colors"
                  aria-label="Compartilhar"
                >
                  <Share2 size={26} />
                </button>
                {showShareOptions && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white shadow-lg rounded-xl p-2 w-48 z-10 border border-gray-100">
                    <button 
                      onClick={copyToClipboard}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg text-sm flex items-center transition-colors"
                    >
                      <Send size={16} className="mr-2" /> Copiar link
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setShowLikesModal(true)}
              className={`font-bold text-sm mb-3 ${likesCount > 0 ? 'text-purple-600 hover:underline' : 'text-gray-400'}`}
            >
              {likesCount.toLocaleString()} curtidas
            </button>

            <form onSubmit={handleCommentSubmit} className="flex items-center bg-gray-100 rounded-full px-4 transition-all focus-within:ring-2 focus-within:ring-purple-300 focus-within:bg-white focus-within:shadow-sm">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 border-none bg-transparent focus:ring-0 text-sm py-3 px-2 placeholder-gray-400"
                aria-label="Escrever comentário"
              />
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                className={`font-bold text-sm ml-2 ${newComment.trim() ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400'}`}
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetails;