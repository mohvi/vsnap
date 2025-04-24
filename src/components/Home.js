import React, { useEffect, useState } from 'react';
import { Share2, Trophy, Award, ArrowRight, Heart, MessageSquare, Repeat, Bookmark, MoreHorizontal, Flag, BarChart2 } from 'lucide-react';
import { db, storage, auth } from '../fb';
import { ref as dbRef, set, push, onValue, query, orderByChild, equalTo, limitToLast, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import InviteFriendCard from './InviteFriendCard';

export default function HomePage() {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({});
  const [isParticipating, setIsParticipating] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [challengePosts, setChallengePosts] = useState([]);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [ranking, setRanking] = useState([]);
  const [showRanking, setShowRanking] = useState(false);
  const [userLikes, setUserLikes] = useState({});

  // Observar autenticação do usuário
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadUserPosts(currentUser.uid);
        loadUserLikes(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  const loadUserPosts = (userId) => {
    const userPostsRef = query(
      dbRef(db, 'posts'),
      orderByChild('userId'),
      equalTo(userId)
    );
    onValue(userPostsRef, (snapshot) => {
      const posts = [];
      snapshot.forEach((childSnapshot) => {
        posts.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      setUserPosts(posts);
    });
  };

  const loadUserLikes = (userId) => {
    const likesRef = query(
      dbRef(db, 'userLikes'),
      orderByChild('userId'),
      equalTo(userId)
    );
    onValue(likesRef, (snapshot) => {
      const likes = {};
      snapshot.forEach((childSnapshot) => {
        const likeData = childSnapshot.val();
        likes[likeData.postId] = true;
      });
      setUserLikes(likes);
    });
  };

  // Buscar desafio ativo mais recente
  useEffect(() => {
    const challengesRef = dbRef(db, 'challenges');
    const activeChallengeQuery = query(
      challengesRef,
      orderByChild('status'),
      equalTo('active'),
      limitToLast(1)
    );
    
    const unsubscribe = onValue(activeChallengeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const challengesData = snapshot.val();
        const [challengeId, challengeData] = Object.entries(challengesData)[0];
        const challenge = {
          id: challengeId,
          ...challengeData,
          startTime: new Date(challengeData.startTime),
          endTime: new Date(challengeData.endTime)
        };
        
        setActiveChallenge(challenge);
        loadChallengePosts(challengeId);
        loadRanking(challengeId);
        
        if (user) {
          checkUserParticipation(challengeId, user.uid);
        }
      } else {
        setActiveChallenge(null);
        setChallengePosts([]);
        setRanking([]);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const checkUserParticipation = (challengeId, userId) => {
    const userPostsRef = query(
      dbRef(db, 'posts'),
      orderByChild('userId'),
      equalTo(userId)
    );
    
    get(userPostsRef).then((snapshot) => {
      let hasParticipated = false;
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().challengeId === challengeId) {
          hasParticipated = true;
        }
      });
      setIsParticipating(hasParticipated);
      setHasPosted(hasParticipated);
    });
  };

  // Carregar posts do desafio e ordenar por likes
  const loadChallengePosts = (challengeId) => {
    const postsRef = query(
      dbRef(db, 'posts'),
      orderByChild('challengeId'),
      equalTo(challengeId)
    );
    
    onValue(postsRef, (snapshot) => {
      const posts = [];
      snapshot.forEach((childSnapshot) => {
        posts.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      // Ordenar por likes (mais curtidos primeiro)
      const sortedPosts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setChallengePosts(sortedPosts);
    });
  };

  // Carregar ranking de participantes baseado em likes totais
  const loadRanking = (challengeId) => {
    const postsRef = query(
      dbRef(db, 'posts'),
      orderByChild('challengeId'),
      equalTo(challengeId)
    );
    
    onValue(postsRef, (snapshot) => {
      const participants = {};
      snapshot.forEach((childSnapshot) => {
        const post = childSnapshot.val();
        if (!participants[post.userId]) {
          participants[post.userId] = {
            userId: post.userId,
            username: post.username,
            avatar: post.avatar,
            totalLikes: 0,
            postsCount: 0,
            bestPost: null
          };
        }
        
        participants[post.userId].totalLikes += post.likes || 0;
        participants[post.userId].postsCount += 1;
        
        // Manter registro do post mais curtido do usuário
        if (!participants[post.userId].bestPost || (post.likes || 0) > (participants[post.userId].bestPost.likes || 0)) {
          participants[post.userId].bestPost = {
            id: childSnapshot.key,
            ...post
          };
        }
      });
      
      // Converter para array e ordenar por total de likes (decrescente)
      const rankingArray = Object.values(participants).sort((a, b) => b.totalLikes - a.totalLikes);
      
      // Adicionar posição no ranking
      rankingArray.forEach((participant, index) => {
        participant.position = index + 1;
      });
      
      setRanking(rankingArray);
    });
  };

  // Atualizar contador regressivo
  useEffect(() => {
    if (!activeChallenge) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = activeChallenge.endTime - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24))),
          hours: Math.max(0, Math.floor((difference / (1000 * 60 * 60)) % 24)),
          minutes: Math.max(0, Math.floor((difference / 1000 / 60) % 60)),
          seconds: Math.max(0, Math.floor((difference / 1000) % 60))
        });
      } else {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        
        // Atualizar status para expirado
        const challengeRef = dbRef(db, `challenges/${activeChallenge.id}`);
        update(challengeRef, { status: 'expired' });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeChallenge]);

  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPostImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleLikePost = async (postId, currentLikes) => {
    if (!user) {
      alert('Por favor, faça login para curtir postagens.');
      return;
    }
    
    try {
      // Verificar se o usuário já curtiu este post
      const likeRef = dbRef(db, `userLikes/${user.uid}_${postId}`);
      
      if (userLikes[postId]) {
        // Se já curtiu, remover o like
        await set(likeRef, null);
        await update(dbRef(db, `posts/${postId}`), {
          likes: (currentLikes || 0) - 1
        });
        setUserLikes(prev => {
          const newLikes = {...prev};
          delete newLikes[postId];
          return newLikes;
        });
      } else {
        // Se não curtiu, adicionar o like
        await set(likeRef, {
          userId: user.uid,
          postId: postId,
          timestamp: Date.now()
        });
        await update(dbRef(db, `posts/${postId}`), {
          likes: (currentLikes || 0) + 1
        });
        setUserLikes(prev => ({...prev, [postId]: true}));
      }
      
      // Recarregar ranking após atualização de likes
      if (activeChallenge) {
        loadRanking(activeChallenge.id);
      }
    } catch (error) {
      console.error('Erro ao curtir postagem:', error);
    }
  };

  const handleSharePost = (post) => {
    const shareText = `Confira esta postagem no desafio "${post.challengeTitle}" por ${post.username}: ${post.content}`;
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.challengeTitle,
        text: shareText,
        url: shareUrl
      }).catch(err => console.log('Erro ao compartilhar:', err));
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handleReportPost = (postId) => {
    if (!user) {
      alert('Por favor, faça login para reportar postagens.');
      return;
    }
    
    if (window.confirm('Tem certeza que deseja reportar esta postagem?')) {
      const reportRef = push(dbRef(db, 'reports'));
      set(reportRef, {
        postId,
        reporterId: user.uid,
        timestamp: Date.now(),
        status: 'pending'
      });
      alert('Postagem reportada com sucesso. Nossa equipe irá analisar.');
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('Por favor, faça login para participar do desafio.');
      return;
    }

    if (!newPostContent.trim() && !newPostImage) {
      alert('Por favor, insira uma descrição ou selecione uma imagem.');
      return;
    }

    if (hasPosted) {
      alert('Você já publicou uma entrada para este desafio.');
      return;
    }

    try {
      const postsRef = dbRef(db, 'posts');
      const newPostRef = push(postsRef);

      let imageUrl = null;
      if (newPostImage) {
        const imageRef = storageRef(storage, `postImages/${user.uid}/${newPostRef.key}/${newPostImage.name}`);
        await uploadBytes(imageRef, newPostImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const newPost = {
        userId: user.uid,
        username: user.displayName || 'Usuário',
        handle: `@${user.email?.split('@')[0] || 'usuario'}`,
        avatar: user.photoURL || '',
        content: newPostContent,
        image: imageUrl,
        likes: 0,
        comments: 0,
        shares: 0,
        timePosted: new Date().toISOString(),
        challengeId: activeChallenge.id,
        challengeTitle: activeChallenge.title,
        timestamp: Date.now()
      };

      await set(newPostRef, newPost);
      
      setIsParticipating(true);
      setHasPosted(true);
      setNewPostContent('');
      setNewPostImage(null);
      setPreviewImage(null);
      
      // Atualizar ranking após nova postagem
      loadRanking(activeChallenge.id);
      
      alert('Postagem criada com sucesso! Boa sorte no desafio!');
    } catch (error) {
      console.error('Erro ao criar postagem:', error);
      alert('Ocorreu um erro ao criar sua postagem. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!activeChallenge) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="mb-8">
          <InviteFriendCard />
        </div>
        <div className="text-center p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum Desafio Ativo</h2>
          <p className="text-gray-600">Não há desafios ativos no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white min-h-screen">
      <InviteFriendCard/>

      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Desafio Ativo</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowRanking(!showRanking)}
              className="flex items-center bg-indigo-100 px-3 py-1 rounded-full"
            >
              <BarChart2 className="w-4 h-4 text-indigo-600 mr-1" />
              <span className="text-sm font-medium text-indigo-700">
                {showRanking ? 'Ver Postagens' : 'Ver Ranking'}
              </span>
            </button>
            <div className="flex items-center bg-indigo-100 px-3 py-1 rounded-full">
              <Award className="w-4 h-4 text-indigo-600 mr-1" />
              <span className="text-sm font-medium text-indigo-700">
                Prêmio: {activeChallenge.prizeAmount} MZN
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Card do Desafio Ativo */}
      <div className="border-b border-gray-200 p-4 bg-indigo-50">
        <div className="flex items-start space-x-3">
          <div className="bg-indigo-100 p-2 rounded-full">
            <Trophy className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">{activeChallenge.title}</h2>
            <p className="text-gray-600 mt-1">{activeChallenge.description}</p>
            
            {activeChallenge.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden">
                <img
                  src={activeChallenge.imageUrl}
                  alt={activeChallenge.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            
            <div className="mt-3 flex items-center space-x-4">
              <div className="bg-white px-3 py-1 rounded-lg shadow-sm">
                <span className="font-mono font-bold text-indigo-600">
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
                  {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                </span>
                <span className="text-xs text-gray-500 ml-1">restante</span>
              </div>
              <div className="text-sm text-gray-600">
                Termina em: {activeChallenge.endTime.toLocaleDateString()} às {activeChallenge.endTime.toLocaleTimeString()}
              </div>
            </div>
            
            {hasPosted ? (
              <div className="mt-4 p-2 bg-green-100 text-green-800 rounded-lg text-center">
                Você já publicou sua entrada para este desafio!
              </div>
            ) : (
              <button
                onClick={() => setIsParticipating(true)}
                className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Participar do Desafio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulário de Postagem */}
      {isParticipating && !hasPosted && (
        <div className="border-b border-gray-200 p-4">
          <form onSubmit={handleSubmitPost}>
            <div className="flex space-x-3">
              <img
                src={user?.photoURL || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"}
                alt="User"
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <textarea
                  placeholder={`Compartilhe sua entrada para o desafio "${activeChallenge.title}"...`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
                  rows={2}
                  required
                />
                {previewImage && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex space-x-2 text-indigo-500">
                    <label className="p-1 rounded-full hover:bg-indigo-50 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange} 
                        accept="image/*" 
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-indigo-700"
                  >
                    Publicar Entrada
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Seção de Ranking */}
      {showRanking && (
        <div className="p-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
            Ranking do Desafio
          </h2>
          
          <div className="space-y-3">
            {ranking.slice(0, 10).map((participant) => (
              <div key={participant.userId} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mr-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold 
                    ${participant.position === 1 ? 'bg-yellow-500' : 
                      participant.position === 2 ? 'bg-gray-400' : 
                      participant.position === 3 ? 'bg-amber-600' : 'bg-indigo-500'}`}>
                    {participant.position}
                  </div>
                </div>
                <img
                  src={participant.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"}
                  alt={participant.username}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{participant.username}</h3>
                  <p className="text-sm text-gray-600">
                    {participant.totalLikes} curtidas • {participant.postsCount} {participant.postsCount === 1 ? 'post' : 'posts'}
                  </p>
                </div>
                {participant.bestPost && (
                  <button 
                    onClick={() => handleLikePost(participant.bestPost.id, participant.bestPost.likes)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full ${userLikes[participant.bestPost.id] ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500'}`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>{participant.bestPost.likes || 0}</span>
                  </button>
                )}
              </div>
            ))}
            
            {ranking.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                Ainda não há participantes no ranking
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção de Postagens */}
      {!showRanking && (
        <>
          {/* Controles de Visualização */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">
              {challengePosts.length} {challengePosts.length === 1 ? 'Entrada' : 'Entradas'}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Visualização em Grelha */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {challengePosts.map(post => (
                <div key={post.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {post.image && (
                    <div className="relative">
                      <img
                        src={post.image}
                        alt="Post"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="flex items-center">
                          <img
                            src={post.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"}
                            alt={post.username}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <span className="text-white font-medium">{post.username}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-gray-800 line-clamp-2">{post.content}</p>
                    <div className="flex justify-between items-center mt-3">
                      <button 
                        onClick={() => handleLikePost(post.id, post.likes)}
                        className={`flex items-center ${userLikes[post.id] ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                      >
                        <Heart className="w-5 h-5 mr-1" fill={userLikes[post.id] ? 'currentColor' : 'none'} />
                        <span>{post.likes || 0}</span>
                      </button>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleSharePost(post)}
                          className="text-gray-500 hover:text-blue-500"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleReportPost(post.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <Flag className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visualização em Lista */}
          {viewMode === 'list' && (
            <div className="divide-y divide-gray-200">
              {challengePosts.map(post => (
                <div key={post.id} className="p-4 hover:bg-gray-50">
                  <div className="flex space-x-3">
                    <img
                      src={post.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"}
                      alt={post.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-gray-900">{post.username}</span>
                        <span className="text-gray-500">{post.handle}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500">
                          {new Date(post.timePosted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-800 mt-1 mb-3">{post.content}</p>
                      {post.image && (
                        <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
                          <img
                            src={post.image}
                            alt="Post"
                            className="w-full h-64 object-cover"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-4">
                          <button 
                            onClick={() => handleLikePost(post.id, post.likes)}
                            className={`flex items-center space-x-1 ${userLikes[post.id] ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                          >
                            <Heart className="w-5 h-5" fill={userLikes[post.id] ? 'currentColor' : 'none'} />
                            <span>{post.likes || 0}</span>
                          </button>
                          <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
                            <MessageSquare className="w-5 h-5" />
                            <span>{post.comments || 0}</span>
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleSharePost(post)}
                            className="text-gray-500 hover:text-blue-500"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleReportPost(post.id)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <Flag className="w-5 h-5" />
                          </button>
                          <button className="text-gray-500 hover:text-gray-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mensagem quando não há postagens */}
          {challengePosts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nenhuma entrada publicada ainda para este desafio. Seja o primeiro a participar!
            </div>
          )}
        </>
      )}
    </div>
  );
}