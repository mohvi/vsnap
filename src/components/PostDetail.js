import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, update, off, push, remove, get } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, MessageSquare, ChevronLeft, Send, MoreVertical, Edit2, Trash2, X, Share2, Smile, User, Bookmark, Flag, Trophy, Target, Play, Pause, Volume2, VolumeX, Crown, Award, Sparkles, Zap } from 'lucide-react';
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
      className="relative w-full h-full bg-black rounded-2xl overflow-hidden"
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
        <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="flex-1" onClick={(e) => e.stopPropagation()}></div>
          
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div 
              className="w-full h-1.5 bg-gray-600/70 rounded-full cursor-pointer relative group"
            >
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative transition-all duration-200"
                style={{ width: `${progress * 100}%` }}
              >
                <div className="absolute -right-1.5 -top-1 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
              </div>
              <div 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onClick={handleSeek}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <button 
                onClick={togglePlay}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl text-white transition-all duration-200 hover:scale-105"
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button 
                onClick={toggleMute}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl text-white transition-all duration-200 hover:scale-105"
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {!playing && !hasPlayed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <button 
            onClick={togglePlay}
            className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white hover:scale-110 transition-transform duration-300 shadow-2xl animate-pulse"
          >
            <Play size={32} className="ml-1" />
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando publicação...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-all shadow-lg"
          >
            Voltar
          </button>
          <button 
            onClick={fetchPostAndComments}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Publicação não encontrada</h3>
        <p className="text-gray-600 mb-6">Esta publicação pode ter sido removida ou não existe mais.</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg"
        >
          Voltar para o feed
        </button>
      </div>
    </div>
  );

  const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov');
  const isPostOwner = currentUser && currentUser.uid === post.userId;
  const remainingLikes = challenge ? Math.max(0, challenge.likeGoal - likesCount) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200/50"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Publicação
                </h1>
                <p className="text-xs text-gray-500">Detalhes da participação</p>
              </div>
            </div>
            
            {isWinner && (
              <div className="flex items-center bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                <Crown className="w-5 h-5 mr-2" />
                <span className="font-bold text-sm">VENCEDOR</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
          <div className="lg:flex">
            {/* Media Section */}
            <div className="lg:w-1/2 xl:w-3/5 bg-gray-900 flex items-center justify-center min-h-[70vh] lg:min-h-[80vh] p-4">
              {isVideo ? (
                <InstagramStyleVideoPlayer 
                  url={post.mediaUrl} 
                  thumbnailUrl={post.thumbnailUrl} 
                />
              ) : (
                <div className="relative w-full h-full max-w-4xl mx-auto">
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || `Post de ${post.userName}`}
                    className="w-full h-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                    onError={(e) => {
                      e.target.src = '/placeholder-image.jpg';
                      e.target.alt = 'Imagem não disponível';
                    }}
                  />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-black/10"></div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="lg:w-1/2 xl:w-2/5 border-l border-gray-200/50 flex flex-col h-[80vh]">
              {/* User Header */}
              <div className="p-6 border-b border-gray-200/50 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-400 to-pink-400 p-0.5">
                      <img 
                        src={post.userAvatar || '/default-avatar.jpg'} 
                        alt={post.userName}
                        className="w-full h-full rounded-2xl object-cover bg-white"
                      />
                    </div>
                    {isWinner && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-lg">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{post.userName}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <span>{post.createdAtFormatted}</span>
                      <span className="mx-2">•</span>
                      <Zap className="w-4 h-4 text-purple-500 mr-1" />
                      <span className="text-purple-600 font-medium">Participando</span>
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowPostOptions(!showPostOptions)}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-200 hover:scale-105"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {showPostOptions && (
                    <div className="absolute right-0 top-12 bg-white shadow-2xl rounded-2xl z-20 w-56 overflow-hidden border border-gray-200/50 backdrop-blur-lg">
                      {isPostOwner && (
                        <>
                          <button
                            onClick={handleRemoveParticipation}
                            className="w-full text-left px-4 py-4 hover:bg-red-50 flex items-center text-sm text-red-600 transition-all duration-200 border-b border-gray-200/50"
                          >
                            <Trash2 size={18} className="mr-3" /> 
                            <div>
                              <div className="font-medium">Remover do desafio</div>
                              <div className="text-xs text-red-400">Excluir esta participação</div>
                            </div>
                          </button>
                        </>
                      )}
                      <button
                        onClick={reportPost}
                        className="w-full text-left px-4 py-4 hover:bg-gray-50 flex items-center text-sm text-gray-700 transition-all duration-200"
                      >
                        <Flag size={18} className="mr-3" />
                        <div>
                          <div className="font-medium">Denunciar</div>
                          <div className="text-xs text-gray-400">Reportar conteúdo inadequado</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Challenge Info */}
              {challenge && (
                <div className="border-b border-gray-200/50 p-6 bg-gradient-to-r from-purple-50/80 to-blue-50/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-blue-500 p-0.5">
                        <img 
                          src={challenge.brand?.logo || '/default-brand.jpg'} 
                          alt={challenge.brand?.name || 'Marca'} 
                          className="w-full h-full rounded-2xl object-cover bg-white"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">{challenge.title}</span>
                        <span className="text-sm text-purple-600 font-medium">Desafio Ativo</span>
                      </div>
                    </div>
                    {!isWinner && challenge.likeGoal && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{likesCount}</div>
                        <div className="text-xs text-gray-500">de {challenge.likeGoal}</div>
                      </div>
                    )}
                  </div>
                  
                  {!isWinner && challenge.likeGoal && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-purple-700">
                        <span>Progresso para vencer</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 shadow-lg" 
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      {progressPercentage >= 100 ? (
                        <div className="text-center text-sm font-bold text-purple-700 bg-purple-100 py-2 rounded-xl animate-pulse">
                          🎉 Meta alcançada! Aguardando resultado...
                        </div>
                      ) : (
                        <div className="text-center text-sm text-purple-600">
                          Faltam <span className="font-bold">{remainingLikes}</span> likes para vencer!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50/30">
                {post.caption && (
                  <div className="flex items-start space-x-4 bg-white p-5 rounded-2xl shadow-lg border border-gray-200/50">
                    <Link to={`/profile/${post.userId}`} className="block hover:scale-105 transition-transform">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-400 to-pink-400 p-0.5">
                        <img 
                          src={post.userAvatar || '/default-avatar.jpg'} 
                          alt={post.userName}
                          className="w-full h-full rounded-2xl object-cover bg-white"
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${post.userId}`} className="block hover:underline">
                        <div className="flex items-baseline space-x-3">
                          <p className="font-bold text-purple-600 text-lg">{post.userName}</p>
                          <p className="text-xs text-gray-400">{post.createdAtFormatted}</p>
                        </div>
                      </Link>
                      <p className="text-gray-700 mt-2 text-lg leading-relaxed">{post.caption}</p>
                    </div>
                  </div>
                )}

                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className="flex items-start space-x-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-lg transition-all duration-300 relative group hover:scale-[1.02]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-400 to-cyan-400 p-0.5 flex-shrink-0">
                        <img 
                          src={comment.userAvatar || '/default-avatar.jpg'} 
                          alt={comment.userName}
                          className="w-full h-full rounded-xl object-cover bg-white"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-baseline space-x-3">
                            <p className="font-semibold text-gray-800">{comment.userName}</p>
                            <p className="text-xs text-gray-400">
                              {comment.createdAtFormatted}
                            </p>
                          </div>
                          {currentUser?.uid === comment.userId && (
                            <button 
                              onClick={() => setShowCommentOptions(showCommentOptions === comment.id ? null : comment.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical size={16} />
                            </button>
                          )}
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editedCommentText}
                              onChange={(e) => setEditedCommentText(e.target.value)}
                              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
                              rows="3"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-3">
                              <button 
                                onClick={() => setEditingCommentId(null)}
                                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={() => handleUpdateComment(comment.id)}
                                className="text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-lg"
                              >
                                Atualizar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 leading-relaxed break-words">{comment.text}</p>
                        )}

                        {showCommentOptions === comment.id && (
                          <div className="absolute right-5 top-16 bg-white shadow-2xl rounded-2xl z-10 w-48 overflow-hidden border border-gray-200/50 backdrop-blur-lg">
                            <button
                              onClick={() => handleEditComment(comment.id, comment.text)}
                              className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center text-sm text-gray-700 transition-all duration-200 border-b border-gray-200/50"
                            >
                              <Edit2 size={16} className="mr-3" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center text-sm text-red-500 transition-all duration-200"
                            >
                              <Trash2 size={16} className="mr-3" /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <MessageSquare className="w-12 h-12 text-purple-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700">Nenhum comentário ainda</h3>
                    <p className="text-gray-500 mt-1">Seja o primeiro a comentar!</p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="border-t border-gray-200/50 p-6 bg-white sticky bottom-0 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex space-x-5">
                    <button 
                      onClick={handleLike}
                      className="group focus:outline-none transition-all duration-300 hover:scale-110"
                      aria-label={isLiked ? 'Remover curtida' : 'Curtir'}
                    >
                      {isLiked ? (
                        <div className="relative">
                          <RxHeartFilled size={28} className="text-red-500 animate-ping" />
                          <RxHeartFilled size={28} className="text-red-500 absolute top-0 left-0" />
                        </div>
                      ) : (
                        <div className="relative">
                          <Heart size={28} className="text-gray-600 group-hover:text-red-400 transition-colors" />
                          <div className="absolute inset-0 scale-0 group-hover:scale-100 transition-transform">
                            <Heart size={28} className="text-red-400 opacity-30" />
                          </div>
                        </div>
                      )}
                    </button>
                    <button 
                      className="group focus:outline-none text-gray-600 hover:text-blue-400 transition-all duration-300 hover:scale-110"
                      aria-label="Comentar"
                    >
                      <MessageSquare size={28} />
                    </button>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={handleShare}
                      className="group focus:outline-none text-gray-600 hover:text-green-500 transition-all duration-300 hover:scale-110"
                      aria-label="Compartilhar"
                    >
                      <Share2 size={28} />
                    </button>
                    {showShareOptions && (
                      <div className="absolute bottom-full mb-3 right-0 bg-white shadow-2xl rounded-2xl p-3 w-56 z-10 border border-gray-200/50 backdrop-blur-lg">
                        <button 
                          onClick={copyToClipboard}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-xl text-sm flex items-center transition-all duration-200"
                        >
                          <Send size={18} className="mr-3 text-purple-500" /> 
                          <div>
                            <div className="font-medium">Copiar link</div>
                            <div className="text-xs text-gray-400">Compartilhar esta publicação</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setShowLikesModal(true)}
                  className={`font-bold text-lg mb-4 transition-all duration-300 ${
                    likesCount > 0 
                      ? 'text-purple-600 hover:text-purple-800 hover:scale-105' 
                      : 'text-gray-400'
                  }`}
                >
                  {likesCount.toLocaleString()} curtidas
                </button>

                <form onSubmit={handleCommentSubmit} className="flex items-center bg-gray-100 rounded-2xl px-5 py-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-300 focus-within:bg-white focus-within:shadow-lg">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicione um comentário..."
                    className="flex-1 border-none bg-transparent focus:ring-0 text-base py-2 px-2 placeholder-gray-400"
                    aria-label="Escrever comentário"
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      newComment.trim() 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 shadow-lg' 
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Likes Modal */}
      {showLikesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200/50">
            <div className="p-6 border-b border-gray-200/50 flex justify-between items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <h3 className="text-xl font-bold flex items-center">
                <RxHeartFilled className="w-6 h-6 mr-2" />
                Curtidas
              </h3>
              <button 
                onClick={() => setShowLikesModal(false)} 
                className="p-2 rounded-xl hover:bg-white/20 transition-all duration-200 hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {likesList.length > 0 ? (
                likesList.map((like) => (
                  <div 
                    key={like.userId} 
                    className="p-4 hover:bg-purple-50 transition-all duration-200 flex items-center border-b border-gray-200/50 last:border-b-0"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-400 to-pink-400 p-0.5 mr-4">
                      <img 
                        src={like.userAvatar || '/default-avatar.jpg'} 
                        alt={like.userName}
                        className="w-full h-full rounded-2xl object-cover bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-lg">{like.userName}</p>
                      <p className="text-sm text-gray-500">@{like.userName.replace(/\s+/g, '').toLowerCase()}</p>
                    </div>
                    <div className="flex items-center text-red-500">
                      <RxHeartFilled className="w-5 h-5" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                    <Smile className="w-10 h-10 text-purple-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">Nenhuma curtida ainda</h3>
                  <p className="text-gray-500">Seja o primeiro a curtir esta publicação!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetails;