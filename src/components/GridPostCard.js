import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";

const GridPostCard = ({ post }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0);
  const [showModal, setShowModal] = useState(false);

  // Função para lidar com o like
  const handleLike = (e) => {
    e.stopPropagation(); // Previne que o clique no botão abra o modal
    setIsLiked(!isLiked);
    setLikesCount(prevCount => isLiked ? prevCount - 1 : prevCount + 1);
  };

  // Pega a primeira imagem do post (se tiver múltiplas)
  const imageUrl = post.content.image || (post.content.images && post.content.images[0]) || 
                  "https://images.unsplash.com/photo-1494790108777-2fd3b0a0f5c1?w=400&h=400&fit=crop";

  return (
    <>
      {/* Card Grid */}
      <div 
        className="group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden cursor-pointer bg-slate-800 border border-white/10 hover:border-purple-400/50 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
      >
        {/* Imagem */}
        <img 
          src={imageUrl}
          alt={`Post by ${post.user.name}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Overlay no hover - apenas desktop */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Informações do hover */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* User info */}
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={post.user.avatar}
                alt={post.user.name}
                className="w-6 h-6 rounded-full border border-white/30"
              />
              <span className="text-xs font-bold text-white truncate">{post.user.name}</span>
            </div>
            
            {/* Like button no hover */}
            <button 
              onClick={handleLike}
              className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5 border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
            
            {/* Stats */}
            <div className="flex items-center gap-3 text-white/80">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span className="text-[10px]">{likesCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span className="text-[10px]">{post.stats?.comments || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badge de múltiplas imagens */}
        {post.content.images && post.content.images.length > 1 && (
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black/60 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <span className="text-[8px] sm:text-[10px] text-white">+{post.content.images.length}</span>
          </div>
        )}

        {/* Badge de verified */}
        {post.user.verified && (
          <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-blue-500/90 backdrop-blur-sm rounded-full p-1">
            <span className="text-[8px] text-white">✓</span>
          </div>
        )}

        {/* Botão de like para mobile (sempre visível) */}
        <button 
          onClick={handleLike}
          className="sm:hidden absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2 border border-white/20 hover:bg-white/20 transition-colors z-10"
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>

        {/* Contador de likes para mobile */}
        <div className="sm:hidden absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 border border-white/20 z-10">
          <div className="flex items-center gap-1 text-white">
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span className="text-xs font-medium">{likesCount}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GridPostCard;