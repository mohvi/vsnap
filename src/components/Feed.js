import React, { useState, useEffect } from 'react';
import { db } from '../fb';
import { ref, onValue } from 'firebase/database';
import { Heart, MessageCircle, Share2, Zap, Trophy, X, List, Grid, Crown, Award, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import InstagramStyleVideoPlayer from './InstagramStyleVideoPlayer';

const Feed = () => {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showRanking, setShowRanking] = useState(false);
  const [rankingData, setRankingData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = () => {
      const challengesRef = ref(db, 'challenges');
      const participationsRef = ref(db, 'participations');
      
      onValue(challengesRef, (challengesSnapshot) => {
        if (challengesSnapshot.exists()) {
          const challengesData = challengesSnapshot.val();
          const active = Object.keys(challengesData)
            .map(key => ({
              id: key,
              ...challengesData[key],
              deadlineDate: new Date(challengesData[key].deadline)
            }))
            .filter(challenge => challenge.deadlineDate > new Date())
            .sort((a, b) => b.deadlineDate - a.deadlineDate);
          
          setActiveChallenges(active);
        }
      });

      onValue(participationsRef, (participationsSnapshot) => {
        try {
          setLoading(true);
          const participationsData = participationsSnapshot.val();
          let posts = [];
          
          if (participationsData) {
            Object.keys(participationsData).forEach(challengeId => {
              Object.keys(participationsData[challengeId]).forEach(userId => {
                posts.push({
                  ...participationsData[challengeId][userId],
                  challengeId,
                  id: participationsData[challengeId][userId].id || userId
                });
              });
            });

            posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAllPosts(posts);
            setFilteredPosts(posts);
            calculateRanking(posts);
          } else {
            setAllPosts([]);
            setFilteredPosts([]);
            setRankingData([]);
          }
          setLoading(false);
        } catch (error) {
          console.error("Error fetching posts:", error);
          setLoading(false);
        }
      });
    };

    fetchData();
  }, []);

  const calculateRanking = (posts, challengeId = null) => {
    const userStats = {};
    
    posts
      .filter(post => challengeId ? post.challengeId === challengeId : true)
      .forEach(post => {
        if (!userStats[post.userId]) {
          userStats[post.userId] = {
            userId: post.userId,
            userName: post.userName,
            userAvatar: post.userAvatar,
            totalLikes: 0,
            postsCount: 0
          };
        }
        
        userStats[post.userId].totalLikes += post.likes || 0;
        userStats[post.userId].postsCount += 1;
      });
    
    const ranking = Object.values(userStats)
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 3)
      .map((user, index) => ({
        ...user,
        position: index + 1
      }));
    
    setRankingData(ranking);
  };

  const handleChallengeSelect = (challengeId) => {
    if (selectedChallenge === challengeId) {
      setSelectedChallenge(null);
      setFilteredPosts(allPosts);
      calculateRanking(allPosts);
    } else {
      setSelectedChallenge(challengeId);
      const filtered = allPosts.filter(post => post.challengeId === challengeId);
      setFilteredPosts(filtered);
      calculateRanking(allPosts, challengeId);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const toggleRanking = () => {
    setShowRanking(!showRanking);
  };

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        {/* Masonry Grid Skeleton - 2 colunas mobile, 3 colunas desktop */}
        <div className="columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {[...Array(12)].map((_, index) => (
            <div 
              key={index} 
              className="break-inside-avoid bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-3 md:mb-4"
            >
              <Skeleton height={200} className="w-full" />
              <div className="p-3 md:p-4">
                <div className="flex items-center mb-2 md:mb-3">
                  <Skeleton circle width={32} height={32} className="md:w-10 md:h-10" />
                  <div className="ml-2 md:ml-3 flex-1">
                    <Skeleton width="60%" height={14} className="md:h-4" />
                    <Skeleton width="40%" height={12} className="mt-1 md:h-3" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Skeleton width={50} height={12} className="md:h-3" />
                  <Skeleton width={50} height={12} className="md:h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      {/* Header Section */}
      <div className="mb-4 md:mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Desafios Criativos
        </h1>
        <p className="text-gray-600 text-xs md:text-sm">
          Descubra as melhores participações da comunidade
        </p>
      </div>

      {/* Seção de Desafios Ativos */}
      <div className="mb-4 md:mb-6 sticky top-0 bg-white/80 backdrop-blur-lg pt-3 md:pt-4 pb-2 md:pb-3 z-20 border-b border-gray-100">
        <div className="flex justify-between items-center mb-2 md:mb-3 px-1 md:px-2">
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-500 mr-2" />
            <h2 className="text-base md:text-lg font-bold text-gray-800">Desafios Ativos</h2>
          </div>
          <div className="flex space-x-1 md:space-x-2">
            <button 
              onClick={toggleViewMode}
              className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={viewMode === 'grid' ? 'Modo Lista' : 'Modo Grade'}
            >
              {viewMode === 'grid' ? <List className="w-3 h-3 md:w-4 md:h-4" /> : <Grid className="w-3 h-3 md:w-4 md:h-4" />}
            </button>
            <button 
              onClick={toggleRanking}
              className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all duration-200 ${
                showRanking 
                  ? 'bg-yellow-100 text-yellow-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Ver Ranking"
            >
              <Trophy className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
        <div className="flex space-x-2 md:space-x-4 overflow-x-auto pb-1 md:pb-2 px-1 md:px-2 scrollbar-hide">
          {activeChallenges.map(challenge => (
            <div 
              key={challenge.id}
              onClick={() => handleChallengeSelect(challenge.id)}
              className={`flex flex-col items-center flex-shrink-0 cursor-pointer transition-all duration-300 ${
                selectedChallenge === challenge.id 
                  ? 'scale-110 transform' 
                  : 'hover:scale-105'
              }`}
            >
              <div className="relative">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl p-0.5 md:p-1 transition-all duration-300 ${
                  selectedChallenge === challenge.id 
                    ? 'bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg shadow-purple-200' 
                    : 'bg-gradient-to-tr from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
                }`}>
                  <div className="bg-white rounded-lg md:rounded-xl p-0.5 md:p-1 w-full h-full">
                    <img
                      src={challenge.brand?.logo}
                      alt={challenge.brand?.name || 'Desafio'}
                      className="w-full h-full rounded-lg md:rounded-xl object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100';
                      }}
                    />
                  </div>
                </div>
                {selectedChallenge === challenge.id && (
                  <div className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 md:p-1 shadow-sm md:shadow-md">
                    <X className="w-2 h-2 text-gray-700" />
                  </div>
                )}
              </div>
              <span className={`text-xs mt-1 md:mt-2 text-center font-medium truncate w-12 md:w-16 transition-colors ${
                selectedChallenge === challenge.id 
                  ? 'font-bold text-purple-600' 
                  : 'text-gray-700'
              }`}>
                {challenge.title.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Horizontal (Top 3) */}
      {showRanking && rankingData.length > 0 && (
        <div className="mb-4 md:mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-yellow-100">
          <div className="p-3 md:p-4">
            <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 flex items-center justify-center">
              <Crown className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-500" />
              {selectedChallenge 
                ? `Top 3: ${activeChallenges.find(c => c.id === selectedChallenge)?.title}` 
                : 'Top 3 Geral'}
            </h3>
            
            <div className="flex justify-around items-end">
              {rankingData.map((user) => (
                <div 
                  key={user.userId} 
                  className="flex flex-col items-center px-2 md:px-3 cursor-pointer transform hover:scale-105 transition-transform duration-200"
                  onClick={() => navigate(`/user/${user.userId}`)}
                >
                  {user.position === 2 && (
                    <div className="relative mb-2 md:mb-3">
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <span className="text-lg md:text-xl">2</span>
                      </div>
                      <div className="absolute -bottom-1 md:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 md:p-1 shadow-lg border">
                        <Award className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                      </div>
                    </div>
                  )}
                  
                  {user.position === 1 && (
                    <div className="relative mb-2 md:mb-3">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg shadow-yellow-200">
                        <span className="text-xl md:text-2xl">1</span>
                      </div>
                      <div className="absolute -bottom-1 md:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 md:p-1 shadow-lg border">
                        <Crown className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                      </div>
                    </div>
                  )}
                  
                  {user.position === 3 && (
                    <div className="relative mb-2 md:mb-3">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold shadow-lg">
                        <span className="text-base md:text-lg">3</span>
                      </div>
                      <div className="absolute -bottom-1 md:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 md:p-1 shadow-lg border">
                        <Award className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center bg-white rounded-lg md:rounded-xl p-2 md:p-3 shadow-sm w-full max-w-[100px] md:max-w-[120px]">
                    <p className="font-semibold text-xs md:text-sm truncate">@{user.userName}</p>
                    <div className="flex items-center justify-center text-xs md:text-sm mt-0.5 md:mt-1">
                      <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 text-pink-500 fill-current" />
                      <span className="font-medium">{user.totalLikes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtro Ativo */}
      {selectedChallenge && (
        <div className="mb-4 md:mb-6 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm border border-purple-100 shadow-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 p-0.5 mr-2 md:mr-3">
              <img
                src={activeChallenges.find(c => c.id === selectedChallenge)?.brand?.logo}
                alt="Logo do desafio"
                className="w-full h-full rounded-lg md:rounded-xl object-cover bg-white"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/100';
                }}
              />
            </div>
            <div>
              <span className="font-semibold text-gray-800 block text-sm md:text-base">
                {activeChallenges.find(c => c.id === selectedChallenge)?.title}
              </span>
              <span className="text-gray-600 text-xs">
                {filteredPosts.length} participação{filteredPosts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedChallenge(null);
              setFilteredPosts(allPosts);
              calculateRanking(allPosts);
            }}
            className="bg-white text-purple-600 hover:text-purple-800 text-xs font-medium px-2 py-1.5 md:px-3 md:py-2 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Posts Header */}
      <div className="mb-3 md:mb-4 px-1 md:px-2">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center">
          {selectedChallenge 
            ? '🎯 Participações' 
            : showRanking 
              ? '🌟 Todas' 
              : '✨ Destaques'}
        </h2>
        <p className="text-gray-600 text-xs md:text-sm mt-0.5 md:mt-1">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'publicação' : 'publicações'}
        </p>
      </div>
      
      {/* Posts Grid - Masonry Layout (2 colunas mobile, 3 colunas desktop) */}
      {viewMode === 'grid' ? (
        <div className="columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              className="break-inside-avoid bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group relative"
              onClick={() => navigate(`/p/${post.challengeId}/${post.id}`)}
            >
              {/* Media Container */}
              <div className="relative overflow-hidden bg-gray-900">
                {post.mediaUrl?.includes('.mp4') ? (
                  <InstagramStyleVideoPlayer 
                    url={post.mediaUrl} 
                    thumbnailUrl={post.thumbnailUrl}
                    className="w-full object-cover"
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || 'Post do desafio'}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/500';
                    }}
                  />
                )}
                
                {/* Gradient Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-2 md:p-4">
                  <div className="transform translate-y-3 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="flex items-center text-white">
                        <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        <span className="text-xs md:text-sm font-semibold">{post.likes || 0}</span>
                      </div>
                      <div className="flex items-center text-white">
                        <MessageCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        <span className="text-xs md:text-sm font-semibold">{post.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="transform translate-y-3 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 md:p-2 hover:bg-white/30 transition-colors">
                      <Share2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* User info overlay */}
                <div className="absolute top-2 left-2 right-2 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150">
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 p-0.5">
                      <img
                        src={post.userAvatar}
                        alt={post.userName}
                        className="w-full h-full rounded-full object-cover bg-white"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs md:text-sm font-semibold truncate">
                        @{post.userName}
                      </p>
                      <p className="text-white/80 text-xs">
                        {formatTimeAgo(post.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content - Only shown if there's a caption */}
              {post.caption && (
                <div className="p-2 md:p-4">
                  <p className="text-gray-700 text-xs md:text-sm line-clamp-2 md:line-clamp-3 leading-relaxed">
                    {post.caption}
                  </p>
                  
                  {/* Challenge Badge */}
                  <div className="mt-2 md:mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 p-0.5">
                        <img
                          src={activeChallenges.find(c => c.id === post.challengeId)?.brand?.logo}
                          alt="Challenge"
                          className="w-full h-full rounded-md md:rounded-lg object-cover bg-white"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/100';
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[80px] md:max-w-[120px]">
                        {post.challengeTitle}
                      </span>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-2 md:space-x-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Heart className="w-3 h-3 mr-0.5 md:mr-1" />
                        {post.likes || 0}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-0.5 md:mr-1" />
                        {post.comments || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content without caption */}
              {!post.caption && (
                <div className="p-2 md:p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 p-0.5">
                        <img
                          src={activeChallenges.find(c => c.id === post.challengeId)?.brand?.logo}
                          alt="Challenge"
                          className="w-full h-full rounded-md md:rounded-lg object-cover bg-white"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/100';
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[70px] md:max-w-[100px]">
                        {post.challengeTitle}
                      </span>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-2 md:space-x-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Heart className="w-3 h-3 mr-0.5 md:mr-1" />
                        {post.likes || 0}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-0.5 md:mr-1" />
                        {post.comments || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View para modo lista */
        <div className="space-y-3 md:space-y-4">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/p/${post.challengeId}/${post.id}`)}
            >
              <div className="p-3 md:p-5">
                <div className="flex items-start">
                  {/* User Avatar */}
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-tr from-purple-400 to-pink-400 p-0.5 flex-shrink-0">
                    <img
                      src={post.userAvatar}
                      alt={post.userName}
                      className="w-full h-full rounded-xl md:rounded-2xl object-cover bg-white"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100';
                      }}
                    />
                  </div>
                  
                  <div className="flex-grow ml-2 md:ml-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2 md:mb-3">
                      <div>
                        <p className="font-bold text-gray-800 text-sm md:text-base">@{post.userName}</p>
                        <p className="text-gray-500 text-xs">{formatTimeAgo(post.createdAt)}</p>
                      </div>
                      <div className="flex items-center bg-gradient-to-r from-purple-100 to-blue-100 px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-semibold text-purple-700">
                        <Zap className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                        <span className="truncate max-w-[80px] md:max-w-[100px]">
                          {post.challengeTitle}
                        </span>
                      </div>
                    </div>
                    
                    {/* Caption */}
                    {post.caption && (
                      <p className="my-2 md:my-3 text-gray-700 text-sm leading-relaxed">{post.caption}</p>
                    )}
                    
                    {/* Media */}
                    {post.mediaUrl && (
                      <div className="my-2 md:my-3 rounded-lg md:rounded-xl overflow-hidden border border-gray-200 max-w-full">
                        {post.mediaUrl.includes('.mp4') ? (
                          <InstagramStyleVideoPlayer 
                            url={post.mediaUrl} 
                            thumbnailUrl={post.thumbnailUrl}
                            className="w-full h-auto object-cover"
                          />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt={post.caption || 'Post do desafio'}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/500';
                            }}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex justify-between items-center text-sm mt-2 md:mt-4">
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="flex items-center bg-pink-50 rounded-full px-2 py-1 md:px-3 md:py-2">
                          <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-pink-500" />
                          <span className="font-semibold text-pink-700 text-xs md:text-sm">{post.likes || 0}</span>
                        </div>
                        <div className="flex items-center bg-blue-50 rounded-full px-2 py-1 md:px-3 md:py-2">
                          <MessageCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-500" />
                          <span className="font-semibold text-blue-700 text-xs md:text-sm">{post.comments || 0}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.share) {
                            navigator.share({
                              title: post.caption,
                              text: `Confira esta participação no desafio ${post.challengeTitle}`,
                              url: window.location.href + `/post/${post.id}`,
                            }).catch(console.error);
                          } else {
                            navigator.clipboard.writeText(window.location.href + `/post/${post.id}`);
                            alert('Link copiado para a área de transferência!');
                          }
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors"
                      >
                        <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-8 md:py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl md:rounded-3xl border border-gray-200">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 bg-gradient-to-tr from-purple-200 to-pink-200 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 md:w-10 md:h-10 text-purple-500" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">
            {selectedChallenge 
              ? 'Nenhuma participação ainda' 
              : 'Nenhuma participação encontrada'
            }
          </h3>
          <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6 max-w-md mx-auto px-4">
            {selectedChallenge 
              ? 'Seja o primeiro a participar deste desafio!' 
              : 'Seja o primeiro a participar dos desafios!'
            }
          </p>
          <button 
            onClick={() => navigate('/challenges')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm md:text-base"
          >
            Explorar Desafios
          </button>
        </div>
      )}
    </div>
  );
};

export default Feed;