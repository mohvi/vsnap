import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db, auth } from '../fb';
import { Heart, Share2, Bookmark, X, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const currentUser = auth.currentUser;

  const formatarData = (timestamp) => {
    const agora = new Date();
    const dataPost = new Date(timestamp);
    const segundos = Math.floor((agora - dataPost) / 1000);
    
    if (segundos < 60) return 'Agora mesmo';
    if (segundos < 3600) return `${Math.floor(segundos/60)} min`;
    if (segundos < 86400) return `${Math.floor(segundos/3600)} h`;
    return `${Math.floor(segundos/86400)} d`;
  };

  useEffect(() => {
    const postRef = ref(db, `participations/${id}`);
    const unsubscribe = onValue(postRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPost({
          id,
          ...data
        });
        setIsLiked(data.likesBy?.[currentUser?.uid] || false);
        setLikes(data.likes || 0);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id, currentUser?.uid]);

  const handleLike = async () => {
    if (!currentUser) return;
    
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikes(newLikedState ? likes + 1 : likes - 1);
      
      await update(ref(db, `participations/${id}`), {
        likes: newLikedState ? likes + 1 : likes - 1,
        [`likesBy/${currentUser.uid}`]: newLikedState
      });
    } catch (error) {
      console.error('Erro ao curtir:', error);
    }
  };

  const compartilharPost = async () => {
    try {
      const shareData = {
        title: `Post de ${post.userName}`,
        text: post.caption || 'Confira este post incrível!',
        url: `${window.location.origin}/p/${post.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copiado!');
      }
    } catch (err) {
      console.log('Erro ao compartilhar:', err);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (!post) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-center p-6 max-w-sm">
        <h2 className="text-xl font-semibold mb-2">Post não encontrado</h2>
        <p className="text-gray-500 mb-4">A publicação que você está procurando não existe ou foi removida</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Publicação</h1>
        <div className="w-6"></div> {/* Espaçamento para alinhar */}
      </div>

      <div className="flex flex-col h-full">
        {/* Seção do usuário */}
        <div className="flex items-center p-4">
          <div className="flex-1">
            <h2 className="font-semibold">@{post.userName}</h2>
            <p className="text-gray-500 text-sm">{formatarData(post.createdAt)}</p>
          </div>
          <button onClick={compartilharPost} className="p-2 text-gray-700">
            <Share2 size={20} />
          </button>
        </div>

        {/* Legenda */}
        {post.caption && (
          <div className="px-4 pb-3 -mt-2">
            <p className="text-gray-800">{post.caption}</p>
          </div>
        )}

        {/* Mídia */}
        <div className="bg-gray-100 flex items-center justify-center">
          {post.imageUrl?.match(/\.(mp4|mov)$/i) ? (
            <video 
              controls 
              autoPlay
              className="w-full max-h-[70vh] object-contain bg-black"
              poster={post.thumbnailUrl}
            >
              <source src={post.imageUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={post.imageUrl}
              alt={post.caption}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
          )}
        </div>

        {/* Ações */}
        <div className="p-4 border-t">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button 
                onClick={handleLike}
                className={`p-1 rounded-full ${isLiked ? 'text-red-500' : 'text-gray-700'}`}
              >
                <Heart 
                  size={28} 
                  fill={isLiked ? 'currentColor' : 'none'}
                />
              </button>
              <button className="p-1 text-gray-700">
                <Bookmark size={28} />
              </button>
            </div>
            
            <div className="font-semibold text-sm bg-gray-100 px-3 py-1 rounded-full">
              {likes.toLocaleString()} Like{likes !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Espaço para sugestões ou conteúdo relacionado */}
        <div className="flex-1 p-4 border-t">
          <h3 className="font-semibold text-gray-700 mb-3">Veja tambem</h3>
          <div className="grid grid-cols-3 gap-1">
            {/* Aqui você pode adicionar miniaturas de posts relacionados */}
            <div className="aspect-square bg-gray-200"></div>
            <div className="aspect-square bg-gray-200"></div>
            <div className="aspect-square bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;