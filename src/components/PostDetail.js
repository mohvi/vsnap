import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, off, push } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, MessageSquare, User, ChevronLeft, Send, MoreVertical, Bookmark, Flag, Smile, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { RxHeartFilled } from 'react-icons/rx';

const PostDetails = () => {
  const { id, challengeId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const currentUser = auth.currentUser;
    const [showShareOptions, setShowShareOptions] = useState(false);
  const navigate = useNavigate();


  console.log("PostDetails component mounted with postId:", id, "and challengeId:", challengeId);

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

const fetchPostAndComments = useCallback(() => {
  setLoading(true);
  setError(null);
  
  try {
    // Buscar os dados do post
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

      // Verificar se o usuário atual curtiu o post
      if (currentUser && postData.likesBy && postData.likesBy[currentUser.uid]) {
        setIsLiked(true);
      } else {
        setIsLiked(false);
      }

      setLikesCount(postData.likes || 0);
      setLoading(false); // Adicionado aqui para garantir que o loading pare quando o post for carregado
    }, (error) => {
      console.error("Database error:", error);
      setError("Falha ao carregar o post");
      setLoading(false);
    });

    // Buscar os comentários do post
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
}, [id, currentUser]);

  useEffect(() => {
    const unsubscribe = fetchPostAndComments();
    return unsubscribe;
  }, [fetchPostAndComments]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: 'like' } });
      return;
    }
    
    try {
      const updates = {
        [`posts/${id}/likes`]: isLiked ? Math.max(0, likesCount - 1) : likesCount + 1,
        [`posts/${id}/likesBy/${currentUser.uid}`]: !isLiked
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
        userName: currentUser.displayName || 'Anônimo',
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

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <span className="sr-only">Carregando...</span>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{error}</p>
      <button 
        onClick={fetchPostAndComments}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );

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

  const isVideo = post.imageUrl?.match(/\.(mp4|mov|webm)$/i);


  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-gray-100 flex items-center bg-gradient-to-r from-purple-500 to-blue-500 text-white">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/20 mr-2 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Publicação</h1>
      </div>

      <div className="md:flex">
        {/* Conteúdo do post */}
        <div className="md:w-2/3 bg-black flex items-center justify-center">
          {isVideo ? (
            <video 
              className="w-full max-h-[70vh] object-contain"
              poster={post.thumbnailUrl}
              controls
              muted
              playsInline
            >
              <source src={post.imageUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={post.imageUrl}
              alt={post.caption || `Post de ${post.userName}`}
              className="w-full max-h-[70vh] object-contain"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
                e.target.alt = 'Imagem não disponível';
              }}
            />
          )}
        </div>

        {/* Seção de informações */}
        <div className="md:w-1/3 border-l border-gray-100 flex flex-col h-[70vh]">
          {/* Cabeçalho do usuário */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center">
              <img 
                src={post.userAvatar || '/default-avatar.jpg'} 
                alt={post.userName}
                className="w-10 h-10 rounded-full mr-3 border-2 border-purple-300 object-cover shadow-sm"
                onError={(e) => {
                  e.target.src = '/default-avatar.jpg';
                }}
              />
              <div>
                <p className="font-bold text-purple-700">{post.userName}</p>
                <p className="text-xs text-gray-500">{post.createdAtFormatted}</p>
              </div>
            </div>
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Comentários */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {post.caption && (
              <div className="flex items-start space-x-3 bg-white p-3 rounded-lg shadow-sm">
                <img 
                  src={post.userAvatar || '/default-avatar.jpg'} 
                  alt={post.userName}
                  className="w-8 h-8 rounded-full border border-purple-200 object-cover flex-shrink-0"
                  onError={(e) => {
                    e.target.src = '/default-avatar.jpg';
                  }}
                />
                <div>
                  <p className="font-semibold text-sm text-purple-600">{post.userName}</p>
                  <p className="text-sm text-gray-700">{post.caption}</p>
                  <p className="text-xs text-gray-400 mt-1">{post.createdAtFormatted}</p>
                </div>
              </div>
            )}

            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex items-start space-x-3 bg-white p-3 rounded-lg shadow-sm">
                  <img 
                    src={comment.userAvatar || '/default-avatar.jpg'} 
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full border border-purple-200 object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.src = '/default-avatar.jpg';
                    }}
                  />
                  <div>
                    <p className="font-semibold text-sm text-purple-600">{comment.userName}</p>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{comment.createdAtFormatted}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm">
                <Smile className="w-10 h-10 mx-auto text-purple-300 mb-2" />
                <p className="font-medium">Nenhum comentário ainda</p>
                <p className="text-sm mt-1">Seja o primeiro a comentar!</p>
              </div>
            )}
          </div>

          {/* Ações e campo de comentário */}
          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="flex justify-between mb-4">
              <div className="flex space-x-4">
                <button 
                  onClick={handleLike}
                  className="focus:outline-none transform hover:scale-110 transition-transform"
                  aria-label={isLiked ? 'Remover curtida' : 'Curtir'}
                >
                  {isLiked ? (
                    <RxHeartFilled size={28} className="text-red-500" />
                  ) : (
                    <Heart size={28} className="text-gray-600 hover:text-red-400" />
                  )}
                </button>
                <button 
                  className="focus:outline-none transform hover:scale-110 transition-transform text-gray-600 hover:text-blue-400"
                  aria-label="Comentar"
                >
                  <MessageSquare size={28} />
                </button>
                <button 
                  onClick={handleShare}
                  className="focus:outline-none transform hover:scale-110 transition-transform text-gray-600 hover:text-green-400 relative"
                  aria-label="Compartilhar"
                >
                  <Share2 size={28} />
                  {showShareOptions && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white shadow-lg rounded-lg p-2 w-40 z-10">
                      <button 
                        onClick={copyToClipboard}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm flex items-center"
                      >
                        <Send size={16} className="mr-2" /> Copiar link
                      </button>
                    </div>
                  )}
                </button>
              </div>
              <button 
                className="focus:outline-none transform hover:scale-110 transition-transform text-gray-600 hover:text-yellow-400"
                aria-label="Salvar"
              >
                <Bookmark size={28} />
              </button>
            </div>

            <p className="font-bold text-sm mb-2 text-purple-700">{likesCount.toLocaleString()} curtidas</p>

            <form onSubmit={handleCommentSubmit} className="flex items-center bg-gray-100 rounded-full px-4 py-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 border-none bg-transparent focus:ring-0 text-sm py-1 px-2 placeholder-gray-400"
                aria-label="Escrever comentário"
              />
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                className={`font-bold text-sm ml-2 ${newComment.trim() ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400'}`}
              >
                Publicar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetails;