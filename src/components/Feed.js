import React, { useState, useEffect } from 'react';
import { db } from '../fb';
import { ref, onValue } from 'firebase/database';
import { Heart, MessageCircle, Share2, Zap, Trophy, X, List, Grid } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <Skeleton height={150} />
              <div className="p-2">
                <Skeleton width={80} height={16} />
                <Skeleton width={120} height={14} className="mt-1" />
                <div className="flex justify-between mt-2">
                  <Skeleton width={40} height={14} />
                  <Skeleton width={40} height={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-2">
      {/* Seção de Desafios Ativos */}
      <div className="mb-3 sticky top-0 bg-white pt-3 pb-1 z-10">
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-md font-bold">Desafios Ativos</h2>
          <div className="flex space-x-1">
            <button 
              onClick={toggleViewMode}
              className="p-1 rounded-full hover:bg-gray-100"
              title={viewMode === 'grid' ? 'Modo Lista' : 'Modo Grade'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            <button 
              onClick={toggleRanking}
              className={`p-1 rounded-full hover:bg-gray-100 ${showRanking ? 'bg-blue-50 text-blue-600' : ''}`}
              title="Ver Ranking"
            >
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex space-x-3 overflow-x-auto pb-1 px-1">
          {activeChallenges.map(challenge => (
            <div 
              key={challenge.id}
              onClick={() => handleChallengeSelect(challenge.id)}
              className={`flex flex-col items-center flex-shrink-0 cursor-pointer transition-all ${selectedChallenge === challenge.id ? 'scale-105' : ''}`}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full p-0.5 ${selectedChallenge === challenge.id ? 'bg-gradient-to-tr from-pink-500 to-blue-500' : 'bg-gray-200'}`}>
                  <div className="bg-white rounded-full p-0.5">
                    <img
                      src={challenge.brand?.logo}
                      alt={challenge.brand?.name || 'Desafio'}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100';
                      }}
                    />
                  </div>
                </div>
                {selectedChallenge === challenge.id && (
                  <div className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5">
                    <X className="w-2 h-2 text-gray-700" />
                  </div>
                )}
              </div>
              <span className={`text-xs mt-1 text-center font-medium truncate w-12 ${selectedChallenge === challenge.id ? 'font-bold text-blue-600' : ''}`}>
                {challenge.title.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Horizontal (Top 3) */}
      {showRanking && rankingData.length > 0 && (
        <div className="mb-3 bg-white rounded-lg shadow-sm overflow-hidden p-3">
          <h3 className="font-bold text-sm mb-2 flex items-center">
            <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
            {selectedChallenge 
              ? `Top 3: ${activeChallenges.find(c => c.id === selectedChallenge)?.title}` 
              : 'Top 3 Geral'}
          </h3>
          
          <div className="flex justify-around">
            {rankingData.map((user) => (
              <div 
                key={user.userId} 
                className="flex flex-col items-center px-2"
                onClick={() => navigate(`/user/${user.userId}`)}
              >
                {user.position === 2 && (
                  <div className="relative mb-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                      <span className="text-lg">2</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 shadow">
                      <Trophy className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                )}
                
                {user.position === 1 && (
                  <div className="relative mb-1 -mt-2">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                      <span className="text-xl">1</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 shadow">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                    </div>
                  </div>
                )}
                
                {user.position === 3 && (
                  <div className="relative mb-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold">
                      <span className="text-md">3</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 shadow">
                      <Trophy className="w-3 h-3 text-amber-600" />
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="font-medium text-xs truncate w-16">@{user.userName}</p>
                  <div className="flex items-center justify-center text-xs">
                    <Heart className="w-3 h-3 mr-1 text-pink-500" />
                    <span>{user.totalLikes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro Ativo */}
      {selectedChallenge && (
        <div className="mb-3 flex items-center justify-between bg-blue-50 rounded-lg p-2 text-sm">
          <div className="flex items-center">
            <img
              src={activeChallenges.find(c => c.id === selectedChallenge)?.brand?.logo}
              alt="Logo do desafio"
              className="w-6 h-6 rounded-full mr-2"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100';
              }}
            />
            <span className="font-medium truncate max-w-[180px]">
              {activeChallenges.find(c => c.id === selectedChallenge)?.title}
            </span>
          </div>
          <button 
            onClick={() => {
              setSelectedChallenge(null);
              setFilteredPosts(allPosts);
              calculateRanking(allPosts);
            }}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Todos os Posts */}
      <h2 className="text-md font-bold mb-2 px-1">
        {selectedChallenge 
          ? 'Participações neste desafio' 
          : showRanking 
            ? 'Todas as participações' 
            : 'Destaques'}
      </h2>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
onClick={() => navigate(`/p/${post.challengeId}/${post.id}`)}            >
              {post.mediaUrl?.includes('.mp4') ? (
                  <InstagramStyleVideoPlayer 
              url={post.mediaUrl} 
              thumbnailUrl={post.thumbnailUrl} />
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.caption || 'Post do desafio'}
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/500';
                  }}
                />
              )}

              <div className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <img
                      src={post.userAvatar}
                      alt={post.userName}
                      className="w-5 h-5 rounded-full mr-1"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100';
                      }}
                    />
                    <span className="text-xs font-medium truncate max-w-[70px]">
                      @{post.userName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center">
                    <Heart className="w-3 h-3 mr-1 text-pink-500" />
                    <span>{post.likes || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="w-3 h-3 mr-1 text-blue-500" />
                    <span>{post.comments || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/p/${post.challengeId}/${post.id}`)}>
              <div className="p-3">
                <div className="flex items-start">
                  <img
                    src={post.userAvatar}
                    alt={post.userName}
                    className="w-10 h-10 rounded-full mr-2"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100';
                    }}
                  />
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">@{post.userName}</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                      </div>
                      <div className="flex items-center text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3 mr-1 text-blue-500" />
                        <span className="truncate max-w-[80px]">
                          {post.challengeTitle}
                        </span>
                      </div>
                    </div>
                    
                    {post.caption && (
                      <p className="my-2 text-sm">{post.caption}</p>
                    )}
                    
                    {post.mediaUrl && (
                      <div className="my-2 rounded-lg overflow-hidden">
                        {post.mediaUrl.includes('.mp4') ? (
                             <InstagramStyleVideoPlayer 
                                url={post.mediaUrl} 
                                thumbnailUrl={post.thumbnailUrl} />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt={post.caption || 'Post do desafio'}
                            className="w-full h-auto max-h-60 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/500';
                            }}
                          />
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs mt-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <Heart className="w-3 h-3 mr-1 text-pink-500" />
                          <span>{post.likes || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1 text-blue-500" />
                          <span>{post.comments || 0}</span>
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
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPosts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            {selectedChallenge 
              ? 'Nenhuma participação encontrada para este desafio.' 
              : 'Nenhuma participação encontrada. Seja o primeiro a participar!'
            }
          </p>
          <button 
            onClick={() => navigate('/challenges')}
            className="mt-3 bg-gradient-to-r from-pink-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            Ver Desafios
          </button>
        </div>
      )}
    </div>
  );
};

export default Feed;