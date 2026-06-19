import React, { useState, useEffect } from 'react';
import { 
  Flame, Sparkles, Grid3x3, Heart, MessageCircle, 
  Share2, Bookmark, MoreHorizontal, Send, Smile,
  Camera, MapPin, Music, UserPlus, Plus, Clock, ChevronDown
} from "lucide-react";
import GridPostCard from './GridPostCard';

// ============ COMPONENTE STORIES ============
const Stories = () => {
  const stories = [
    { id: 1, user: "ana_silva", avatar: "https://images.unsplash.com/photo-1494790108777-2fd3b0a0f5c1?w=60&h=60&fit=crop", viewed: false },
    { id: 2, user: "carlos_s", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=60&h=60&fit=crop", viewed: false },
    { id: 3, user: "mariana_c", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&h=60&fit=crop", viewed: false },
    { id: 4, user: "joao_m", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop", viewed: true },
    { id: 5, user: "lucas_p", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop", viewed: false },
    { id: 6, user: "julia_r", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop", viewed: false },
  ];

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="text-xs sm:text-sm font-bold text-white">Top Votasnap</h2>
        <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
          Ver todos
        </button>
      </div>
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Meu story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-900 p-0.5">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop"
                  alt="Seu story"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-1 border-2 border-slate-900">
              <Plus className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
          </div>
          <span className="text-[8px] sm:text-[10px] text-gray-400">Seu story</span>
        </div>

        {/* Stories de outros usuários */}
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 ${story.viewed ? 'bg-gray-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
              <div className="w-full h-full rounded-full bg-slate-900 p-0.5">
                <img 
                  src={story.avatar}
                  alt={story.user}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
            <span className="text-[8px] sm:text-[10px] text-gray-400">{story.user}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ COMPONENTE CATEGORY TABS ============
const CategoryTabs = ({ activeTab, onTabChange }) => {
  const categories = [
    { id: 'forYou', label: 'Quem participou', icon: Sparkles },
  ];

  return (
    <div className="w-full py-2 sm:py-3 sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
      <div className="px-3 sm:px-4">
        {/* Header com título e filtros - escondido em mobile */}
        <div className="hidden sm:flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Explorar
            </h1>
            <span className="px-2 py-1 bg-purple-500/20 rounded-full text-[10px] font-bold text-purple-300 border border-purple-500/30">
              GALERIA
            </span>
          </div>
          
          {/* Filtros */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 border border-white/10">
              <Grid3x3 className="w-3 h-3" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 border border-white/10">
              <span className="hidden sm:inline">Recentes</span>
              <span className="sm:hidden">Filtros</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Tabs - scroll horizontal em mobile */}
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onTabChange(category.id)}
                className={`
                  flex-shrink-0 relative flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl
                  transition-all duration-300
                  ${isActive 
                    ? 'text-white bg-white/5' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{category.label}</span>
                
                {/* Indicador de ativo - apenas desktop */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hidden sm:block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ COMPONENTE POST CARD (GRID) ============


// ============ COMPONENTE PRINCIPAL FEED ============
const Feed = () => {
  const [activeTab, setActiveTab] = useState('forYou');
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Dados mockados para os posts
  const posts = [
    {
      id: 1,
      user: {
        name: "Ana Silva",
        username: "ana_silva",
        avatar: "https://images.unsplash.com/photo-1494790108777-2fd3b0a0f5c1?w=60&h=60&fit=crop",
        verified: true
      },
      location: "São Paulo, SP",
      time: "2h atrás",
      content: {
        text: "Momento incrível no parque hoje! 🌳 O pôr do sol estava simplesmente perfeito. #natureza #paz",
        images: [
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
        ]
      },
      stats: {
        likes: 1234,
        comments: 89,
        shares: 45
      }
    },
    {
      id: 2,
      user: {
        name: "Carlos Santos",
        username: "carlos_s",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=60&h=60&fit=crop",
        verified: false
      },
      location: "Rio de Janeiro, RJ",
      time: "5h atrás",
      content: {
        text: "Novo vídeo no canal! 🎥 Hoje vamos explorar os melhores lugares da cidade maravilhosa. Quem aí já conhece?",
        image: "https://images.unsplash.com/photo-1483729557573-4b7e6f115b9d?w=400&h=400&fit=crop"
      },
      stats: {
        likes: 892,
        comments: 134,
        shares: 23
      }
    },
    {
      id: 3,
      user: {
        name: "Mariana Costa",
        username: "mariana_c",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&h=60&fit=crop",
        verified: true
      },
      time: "8h atrás",
      content: {
        text: "Arte que fiz hoje! Espero que gostem 🎨",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop"
      },
      stats: {
        likes: 2341,
        comments: 267,
        shares: 89
      }
    },
    {
      id: 4,
      user: {
        name: "João Mendes",
        username: "joao_m",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop",
        verified: false
      },
      location: "Belo Horizonte, MG",
      time: "12h atrás",
      content: {
        text: "Receita de hoje: macarrão à carbonara tradicional! 🍝 Quem quer a receita?",
        images: [
          "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop"
        ]
      },
      stats: {
        likes: 567,
        comments: 78,
        shares: 234
      }
    },
    {
      id: 5,
      user: {
        name: "Lucas Mendes",
        username: "lucas_m",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop",
        verified: false
      },
      time: "1d atrás",
      content: {
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
      },
      stats: {
        likes: 345,
        comments: 23,
        shares: 12
      }
    },
    {
      id: 6,
      user: {
        name: "Julia Lima",
        username: "julia_l",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop",
        verified: true
      },
      time: "2d atrás",
      content: {
        image: "https://images.unsplash.com/photo-1483729557573-4b7e6f115b9d?w=400&h=400&fit=crop"
      },
      stats: {
        likes: 789,
        comments: 45,
        shares: 67
      }
    }
  ];

  // Filtrar posts baseado na tab ativa
  const getFilteredPosts = () => {
    switch(activeTab) {
      case 'following':
        return posts.filter(post => post.user.verified);
      case 'popular':
        return posts.filter(post => post.stats.likes > 1000);
      case 'recent':
        return posts.slice(0, 4);
      default:
        return posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header fixo */}
      <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Conteúdo principal */}
      <div className="px-2 sm:px-4 py-3 sm:py-6">
        {/* Stories - visível em todas as telas */}
        <Stories />
        
        {/* Grid de posts - sempre em grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-4">
          {filteredPosts.map((post) => (
            <GridPostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Load more */}
        {filteredPosts.length > 0 && (
          <div className="flex justify-center mt-4 sm:mt-8">
            <button className="w-full sm:w-auto px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">
              Carregar mais posts
            </button>
          </div>
        )}

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block p-2 sm:p-3 bg-white/5 rounded-full mb-2 sm:mb-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 animate-pulse" />
            </div>
            <h3 className="text-sm sm:text-base text-white font-bold mb-1">Nenhum post encontrado</h3>
            <p className="text-xs sm:text-sm text-gray-400">Tente mudar o filtro ou siga mais pessoas</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Feed;