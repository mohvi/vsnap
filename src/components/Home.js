import React, { useEffect, useState } from 'react';
import { Share2, Trophy, Award, ArrowRight, Heart, MessageSquare, Repeat, Bookmark, MoreHorizontal } from 'lucide-react';
import { db, storage, auth } from '../fb';
import { ref as dbRef, set, push, onValue, query, orderByChild, equalTo, limitToLast, get } from 'firebase/database';
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

  // Observar autenticação do usuário
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Carregar posts do usuário
        const userPostsRef = query(
          dbRef(db, 'posts'),
          orderByChild('userId'),
          equalTo(currentUser.uid)
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
      }
    });
    return unsubscribe;
  }, []);

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
        
        // Carregar posts do desafio atual
        loadChallengePosts(challengeId);
        
        // Verificar se o usuário já participou deste desafio
        if (user) {
          const hasParticipated = userPosts.some(post => post.challengeId === challengeId);
          setIsParticipating(hasParticipated);
          setHasPosted(hasParticipated);
        }
      } else {
        setActiveChallenge(null);
        setChallengePosts([]);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, userPosts]);

  // Carregar posts do desafio de forma aleatória
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
      
      // Embaralhar os posts para exibição aleatória
      setChallengePosts(shuffleArray(posts));
    });
  };

  // Função para embaralhar array (Fisher-Yates algorithm)
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Atualizar contador regressivo
  useEffect(() => {
    if (!activeChallenge) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = activeChallenge.endTime - now;
      
      if (difference > 0) {
        setTimeLeft({
          hours: Math.max(0, Math.floor((difference / (1000 * 60 * 60)) % 24)),
          minutes: Math.max(0, Math.floor((difference / 1000 / 60) % 60)),
          seconds: Math.max(0, Math.floor((difference / 1000) % 60))
        });
      } else {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        
        // Atualizar status para expirado
        const challengeRef = dbRef(db, `challenges/${activeChallenge.id}`);
        set(challengeRef, { ...activeChallenge, status: 'expired' }, { merge: true });
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
        timestamp: Date.now() // Para ordenação
      };

      await set(newPostRef, newPost);
      
      // Atualizar estados
      setIsParticipating(true);
      setHasPosted(true);
      setNewPostContent('');
      setNewPostImage(null);
      setPreviewImage(null);
      
      // Recarregar posts do desafio para incluir o novo post
      loadChallengePosts(activeChallenge.id);
      
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
      {/* Card de Convite */}
      <div className="mb-8">
        <InviteFriendCard />
      </div>

      {/* Mensagem de Nenhum Desafio Ativo */}
      <div className="text-center p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum Desafio Ativo</h2>
        <p className="text-gray-600">Não há desafios ativos no momento.</p>
      </div>
    </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">

      <InviteFriendCard/>
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Desafio Ativo</h1>
          <div className="flex items-center bg-indigo-100 px-3 py-1 rounded-full">
            <Award className="w-4 h-4 text-indigo-600 mr-1" />
            <span className="text-sm font-medium text-indigo-700">
              Prêmio: {activeChallenge.prizeAmount} MZN
            </span>
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

      {/* Seção de Entradas no Desafio */}
      <div className="bg-indigo-50 p-3 border-b border-gray-200">
        <div className="flex items-center justify-center space-x-2">
          <Trophy className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">
            {challengePosts.length} {challengePosts.length === 1 ? 'Entrada' : 'Entradas'} no Desafio "{activeChallenge.title}"
          </span>
        </div>
      </div>

      {/* Feed de Postagens - Ordem Aleatória */}
      <div className="divide-y divide-gray-200">
        {/* Mostrar a própria postagem do usuário primeiro, se existir */}
        {userPosts
          .filter(post => post.challengeId === activeChallenge.id)
          .map(post => (
            <div key={post.id} className="p-4 bg-blue-50 border-l-4 border-blue-400">
              <div className="flex space-x-3">
                <img
                  src={post.avatar}
                  alt={post.username}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-900">{post.username}</span>
                    <span className="text-gray-500">{post.handle}</span>
                  </div>
                  <p className="text-gray-800 mt-1 mb-3">{post.content}</p>
                  {post.image && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
                      <img
                        src={post.image}
                        alt="Sua entrada no desafio"
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex space-x-4 text-gray-500">
                    <button className="flex items-center space-x-1">
                      <Heart className="w-5 h-5" />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1">
                      <MessageSquare className="w-5 h-5" />
                      <span>{post.comments}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        }

        {/* Mostrar outras postagens do desafio em ordem aleatória */}
        {challengePosts
          .filter(post => !user || post.userId !== user.uid) // Excluir a própria postagem do usuário
          .map(post => (
            <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
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
                    <span className="text-gray-500">{new Date(post.timePosted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-gray-800 mt-1 mb-3">{post.content}</p>
                  {post.image && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
                      <img
                        src={post.image}
                        alt="Entrada no desafio"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex space-x-4 text-gray-500">
                    <button className="flex items-center space-x-1 hover:text-red-500">
                      <Heart className="w-5 h-5" />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-500">
                      <MessageSquare className="w-5 h-5" />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-green-500">
                      <Repeat className="w-5 h-5" />
                      <span>{post.shares}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        }

        {/* Mensagem quando não há postagens */}
        {challengePosts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma entrada publicada ainda para este desafio. Seja o primeiro a participar!
          </div>
        )}
      </div>
    </div>
  );
}