import React, { useState, useEffect } from 'react';
import { db, auth } from '../fb';
import { ref, onValue, get, update, child } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import ChallengeList from './ChallengeList';
import ParticipateModal from './ParticipateModal';
import ShareModal from './ShareModal';
import { Sparkles, Star, Trophy, Zap, Clock, CheckCircle } from 'lucide-react';
import Feed from './Feed';

const HomePage = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [allChallenges, setAllChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [shouldDisplayInvite, setShouldDisplayInvite] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const checkChallengeCompletion = async () => {
      try {
        const dbRef = ref(db);
        const challengeSnapshot = await get(child(dbRef, `specialChallenges/${user.uid}`));
        
        if (challengeSnapshot.exists() && challengeSnapshot.val().completed) {
          setShouldDisplayInvite(true);
        } else {
          setShouldDisplayInvite(true);
        }
      } catch (err) {
        console.error("Erro ao verificar desafio especial:", err);
      }
    };

    checkChallengeCompletion();
  }, [user?.uid]);

  useEffect(() => {
    if (allChallenges.length === 0) return;

    const now = new Date();
    const active = [];
    const completed = [];

    allChallenges.forEach(challenge => {
      const challengeEndDate = new Date(challenge.createdAt);
      challengeEndDate.setDate(challengeEndDate.getDate() + (challenge.deadlineDays || 0));
      
      if (challengeEndDate < now || challenge.status === false) {
        completed.push(challenge);
      } else {
        active.push(challenge);
      }
    });

    setActiveChallenges(active);
    setCompletedChallenges(completed);
  }, [allChallenges]);

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
      url: `https://votasnap.online/challenge/${challenge.id}`,
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

  const handleParticipateClick = async (challenge) => {
    if (!user) {
      alert('Você precisa fazer login para participar de desafios!');
      return;
    }
    const now = new Date();
    const challengeEndDate = new Date(challenge.createdAt);
    challengeEndDate.setDate(challengeEndDate.getDate() + challenge.deadlineDays);
    
    if (now > challengeEndDate) {
      alert('Este desafio já expirou e não aceita mais participações.');
      return;
    }
    try {
      const userParticipationRef = ref(db, `users/${user.uid}/participations/${challenge.id}`);
      const snapshot = await get(userParticipationRef);

      if (snapshot.exists()) {
        alert('Você já participou deste desafio! Cada usuário pode participar apenas uma vez.');
        return;
      }
      setSelectedChallenge(challenge);
      setShowParticipateModal(true);
    } catch (error) {
      console.error("Erro ao verificar participação:", error);
      alert("Ocorreu um erro ao verificar suas participações. Por favor, tente novamente.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Tabs Aprimoradas */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex justify-center border-b border-gray-200">
          <div className="flex max-w-md w-full">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'feed' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <Zap className={`w-5 h-5 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Feed</span>
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'active' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <Sparkles className={`w-5 h-5 ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Ativos</span>
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'completed' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'completed' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <CheckCircle className={`w-5 h-5 ${activeTab === 'completed' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Encerrados</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="px-4 pt-4">
        {activeTab === 'feed' && (
          <Feed 
            loading={loading}
            error={error}
            challenges={activeChallenges}
            user={user}
            onParticipateClick={handleParticipateClick}
            onShareClick={handleShareChallenge}
          />
        )}
        
        {activeTab === 'active' && (
          <ChallengeList 
            loading={loading}
            error={error}
            challenges={activeChallenges}
            user={user}
            onParticipateClick={handleParticipateClick}
            onShareClick={handleShareChallenge}
          />
        )}
        
        {activeTab === 'completed' && (
          <ChallengeList 
            loading={loading}
            error={error}
            challenges={completedChallenges}
            user={user}
            onParticipateClick={handleParticipateClick}
            onShareClick={handleShareChallenge}
            hideCompleted={false}
          />
        )}
      </div>

      {/* Modais */}
      {showParticipateModal && selectedChallenge && (
        <ParticipateModal 
          challenge={selectedChallenge}
          user={user}
          userData={userData}
          onClose={() => setShowParticipateModal(false)}
        />
      )}
      
      {showShareModal && currentChallenge && (
        <ShareModal 
          challenge={currentChallenge}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default HomePage;