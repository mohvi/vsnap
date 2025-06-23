import React, { useState, useEffect } from 'react';
import { Share2, Zap, Award, TrendingUp, Users, Sparkles, ChevronRight, Heart, MessageSquare, X, Check, Image, Video } from 'lucide-react';
import { db, auth, storage } from '../fb';
import { ref, onValue, set, get, update } from 'firebase/database';
import { getDownloadURL, uploadBytesResumable, ref as storageRef } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';
import InviteFriendCard from './InviteFriendCard';

const HomePage = ({userData}) => {
  const [activeTab, setActiveTab] = useState('destaques');
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submission, setSubmission] = useState({
    image: null,
    caption: '',
    termsAccepted: false,
    uploadProgress: 0
  });
  const [allChallenges, setAllChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);

  // Verificar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Buscar desafios do Firebase
  useEffect(() => {
    const challengesRef = ref(db, 'challenges');
    
    const unsubscribe = onValue(challengesRef, (snapshot) => {
      try {
        setLoading(true);
        const challengesData = snapshot.val();
        
        if (challengesData) {
          const challengesArray = Object.keys(challengesData).map(key => ({
            id: key,
            ...challengesData[key]
          }));
          
          const sortedChallenges = challengesArray.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          
          setAllChallenges(sortedChallenges);
        } else {
          setAllChallenges([]);
        }
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar desafios:", err);
        setError("Erro ao carregar desafios");
        setLoading(false);
      }
    }, (error) => {
      console.error("Erro na conexão:", error);
      setError("Erro na conexão com o banco de dados");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleShareChallenge = (challenge) => {
    const shareData = {
      title: challenge.title,
      text: challenge.description,
      url: `https://votasnap.vercel.app/challenges/${challenge.id}`,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((error) => console.log('Erro ao compartilhar:', error));
    } else {
      setShowShareModal(true);
      setCurrentChallenge(challenge);
    }
  };

  const handleParticipateClick = (challenge) => {
    if (!user) {
      alert('Você precisa fazer login para participar de desafios!');
      return;
    }
    setSelectedChallenge(challenge);
    setShowParticipateModal(true);
    setSubmission({ image: null, caption: '', termsAccepted: false, uploadProgress: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.uid) {
        alert('Você precisa estar logado para participar!');
        return;
      }

      const userId = user.uid;
      const challengeId = selectedChallenge.id;
      const participationId = `${userId}_${challengeId}_${Date.now()}`;
      
      const participationData = {
        id: participationId,
        userId: userId,
        userEmail: user.email,
        userName: user.displayName || 'Anônimo',
        challengeId: challengeId,
        imageUrl: submission.image,
        caption: submission.caption,
        termsAccepted: submission.termsAccepted,
        createdAt: new Date().toISOString(),
        status: 'pending',
        likes: 0,
        comments: 0,
        challengeTitle: selectedChallenge.title,
        brandName: selectedChallenge.brand.name,
        brandLogo: selectedChallenge.brand.logo
      };

      const participationRef = ref(db, `participations/${participationId}`);
      await set(participationRef, participationData);

      const challengeRef = ref(db, `challenges/${challengeId}`);
      const challengeSnapshot = await get(challengeRef);
      if (challengeSnapshot.exists()) {
        const currentParticipants = challengeSnapshot.val().participants || 0;
        await update(challengeRef, {
          participants: currentParticipants + 1
        });
      }

      const userParticipationsRef = ref(db, `users/${userId}/participations/${participationId}`);
      await set(userParticipationsRef, {
        challengeId: challengeId,
        participationId: participationId,
        createdAt: new Date().toISOString()
      });

      alert(`Participação enviada com sucesso para: ${selectedChallenge.title}`);
      setShowParticipateModal(false);
      setSubmission({ image: null, caption: '', termsAccepted: false, uploadProgress: 0 });
      
    } catch (error) {
      console.error("Erro ao enviar participação:", error);
      alert("Ocorreu um erro ao enviar sua participação. Por favor, tente novamente.");
    }
  };

  const handleImageChange = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const fileType = selectedChallenge.type === 'photo' ? 'images' : 'videos';
    const fileRef = storageRef(storage, `${fileType}/${user.uid}/${Date.now()}_${file.name}`);
    
    try {
      const maxSize = selectedChallenge.type === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`Arquivo muito grande. Tamanho máximo: ${selectedChallenge.type === 'photo' ? '10MB' : '50MB'}`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setSubmission({ ...submission, image: previewUrl, uploadProgress: 0 });
      
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setSubmission(prev => ({ ...prev, uploadProgress: progress }));
        },
        (error) => {
          console.error("Upload failed:", error);
          alert("Falha no upload da mídia. Por favor, tente novamente.");
          setSubmission(prev => ({ ...prev, image: null, uploadProgress: 0 }));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setSubmission(prev => ({ 
            ...prev, 
            image: downloadURL,
            uploadProgress: 100 
          }));
        }
      );
      
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Erro ao processar o arquivo. Por favor, tente novamente.");
      setSubmission(prev => ({ ...prev, image: null, uploadProgress: 0 }));
    }
  };

  const ChallengeCard = ({ challenge }) => {
    return (
      <div className="border pb-20 bg-gray-50 min-h-screen rounded-2xl overflow-hidden hover:shadow-lg transition duration-300 bg-white">
        <div className="relative h-48 bg-gradient-to-br from-pink-100 to-blue-100">
          <img 
            src={challenge.coverImage} 
            alt={challenge.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex items-center">
            <img 
              src={challenge.brand.logo} 
              alt={challenge.brand.name} 
              className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-md"
            />
            <span className="ml-2 font-medium text-white bg-gradient-to-r from-pink-500 to-blue-500 px-3 py-1 rounded-full text-sm flex items-center">
              {challenge.brand.name}
              {challenge.brand.verified && (
                <svg className="w-4 h-4 inline ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.47 1.89-3.2 3.61-.82-.34-3.7L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
                </svg>
              )}
            </span>
          </div>
          <div className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1 text-sm font-medium flex items-center shadow-sm">
            {challenge.type === 'photo' ? (
              <>
                <Image className="w-4 h-4 mr-1 text-pink-500" /> Foto
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-1 text-blue-500" /> Vídeo
              </>
            )}
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="text-xl font-bold mb-2 text-gray-800">{challenge.title}</h3>
          <p className="text-gray-600 mb-4">{challenge.description}</p>
          
          <div className="flex justify-between items-center mb-4">
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Award className="w-4 h-4 mr-1" /> {challenge.prize}
            </div>
            <div className="text-gray-500 text-sm flex items-center">
              <Zap className="w-4 h-4 mr-1" /> {challenge.deadlineDays} dias restantes
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4 text-sm">
            <div className="text-gray-500 flex items-center">
              <Users className="w-4 h-4 mr-1" /> {challenge.participants} participantes
            </div>
            <div className="flex space-x-3">
              <span className="flex items-center text-gray-500">
                <Heart className="w-4 h-4 mr-1 text-pink-500" /> {challenge.interaction.split(' ')[0]}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3 mb-3">
            <button 
              onClick={() => handleParticipateClick(challenge)}
              className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 rounded-lg flex-1 hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center shadow-md hover:shadow-lg"
            >
              Participar Agora
            </button>
            <button 
              onClick={() => handleShareChallenge(challenge)}
              className="border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center shadow-sm"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <Link
            to={`/challenges/${challenge.id}/participations`}
            className="w-full py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition flex items-center justify-center"
          >
            <Users className="w-4 h-4 mr-2" /> Ver Participações
          </Link>
        </div>
      </div>
    );
  };
const ParticipateModal = () => {
  
  if (!showParticipateModal || !selectedChallenge) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Participar no desafio</h3>
          <button 
            onClick={() => setShowParticipateModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">
                {selectedChallenge.type === 'photo' ? 'Envie sua foto' : 'Envie seu vídeo'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition bg-gray-50">
                {submission.image ? (
                  <div className="relative">
                    {selectedChallenge.type === 'photo' ? (
                      <img src={submission.image} alt="Preview" className="w-full h-48 object-contain mx-auto" />
                    ) : (
                      <video controls className="w-full h-48 object-contain mx-auto">
                        <source src={submission.image} type="video/mp4" />
                        Seu navegador não suporta vídeos.
                      </video>
                    )}
                    <button 
                      type="button"
                      onClick={() => setSubmission({...submission, image: null, uploadProgress: 0})}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                    {submission.uploadProgress > 0 && submission.uploadProgress < 100 && (
                      <div className="absolute bottom-2 left-2 right-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${submission.uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      {selectedChallenge.type === 'photo' ? (
                        <Image className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Video className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <p className="text-gray-500 mb-1">Clique para enviar ou arraste arquivos</p>
                    <p className="text-sm text-gray-400">
                      {selectedChallenge.type === 'photo' 
                        ? "Formatos: JPG, PNG (até 10MB)" 
                        : "Formatos: MP4 (15-60 segundos, até 50MB)"}
                    </p>
                    <input 
                      type="file" 
                      accept={selectedChallenge.type === 'photo' ? "image/*" : "video/*"}
                      onChange={handleImageChange}
                      className="hidden"
                      id="media-upload"
                      required
                    />
                    <label 
                      htmlFor="media-upload"
                      className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition cursor-pointer"
                    >
                      Selecionar arquivo
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Legenda</label>
              <textarea 
                value={submission.caption}
                onChange={(e) => setSubmission({...submission, caption: e.target.value})}
                placeholder={`Escreva uma legenda criativa para sua ${selectedChallenge.type === 'photo' ? 'foto' : 'vídeo'}...`}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="flex items-start">
                <input 
                  type="checkbox" 
                  checked={submission.termsAccepted}
                  onChange={(e) => setSubmission({...submission, termsAccepted: e.target.checked})}
                  className="mt-1 mr-2"
                  required
                />
                <span className="text-sm text-gray-600">
                Confirmo que este conteúdo é original e foi criado por mim.
                </span>
              </label>
            </div>
            
            <button 
              type="submit"
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${
                !submission.image || !submission.termsAccepted || submission.uploadProgress < 100 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-md'
              }`}
            >
              <Check className="w-5 h-5 mr-2" /> Enviar Participação
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
  const ShareModal = () => {
    if (!showShareModal || !currentChallenge) return null;

    const shareUrl = `https://votasnap.vercel.app/challenges/${currentChallenge.id}`;
    const shareText = `${currentChallenge.title} - ${currentChallenge.description}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    const shareOptions = [
      {
        name: 'WhatsApp',
        icon: <MessageSquare className="w-6 h-6 text-green-500" />,
        url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
      },
      {
        name: 'Facebook',
        icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      },
      {
        name: 'Twitter',
        icon: <Sparkles className="w-6 h-6 text-blue-400" />,
        url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
      },
      {
        name: 'Copiar Link',
        icon: <Link className="w-6 h-6 text-gray-500" />,
        action: () => {
          navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
          alert('Link copiado para a área de transferência!');
          setShowShareModal(false);
        }
      }
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Compartilhar desafio</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => option.url 
                    ? window.open(option.url, '_blank') 
                    : option.action?.()}
                  className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="mb-2">
                    {option.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <InviteFriendCard userData={userData}/>
      <div className="flex border-b mb-8 bg-white rounded-t-lg shadow-sm">
        <button 
          onClick={() => setActiveTab('destaques')}
          className={`px-6 py-3 flex items-center ${activeTab === 'destaques' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Sparkles className="mr-2" /> Desafios
        </button>
      </div>

      <div className="mb-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Tentar novamente
            </button>
          </div>
        ) : allChallenges.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhum desafio disponível no momento</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </div>

      <ParticipateModal />
      <ShareModal />
    </div>
  );
};

export default HomePage;