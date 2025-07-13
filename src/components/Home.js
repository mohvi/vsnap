import React, { useState, useEffect } from 'react';
import { db, auth } from '../fb';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import ChallengeList from './ChallengeList';
import ParticipateModal from './ParticipateModal';
import ShareModal from './ShareModal';
import { Sparkles, Clock, Zap } from 'lucide-react';
import Feed from './Feed';

const HomePage = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [allChallenges, setAllChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [endedChallenges, setEndedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load all challenges from database
  useEffect(() => {
    const challengesRef = ref(db, 'challenges');
    
    const unsubscribe = onValue(challengesRef, (snapshot) => {
      try {
        setLoading(true);
        const challengesData = snapshot.val();
        
        if (challengesData) {
          const challengesArray = Object.keys(challengesData).map(key => ({
            id: key,
            ...challengesData[key],
            createdAt: new Date(challengesData[key].createdAt),
            deadline: new Date(challengesData[key].deadline)
          }));
          
          setAllChallenges(challengesArray);
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

  // Categorize challenges into active and ended (expired + completed)
  useEffect(() => {
    if (allChallenges.length === 0) return;

    const now = new Date();
    const active = [];
    const ended = [];

    allChallenges.forEach(challenge => {
      const hasWinner = challenge.winner || 
                       (challenge.id && challenge.participants && 
                        Object.values(challenge.participants).some(p => p.isWinner));

      if (challenge.deadline < now || challenge.status === false || hasWinner) {
        // Combine expired and completed challenges
        ended.push({
          ...challenge,
          isCompleted: hasWinner
        });
      } else {
        active.push(challenge);
      }
    });

    // Sort active by deadline (closest first)
    active.sort((a, b) => a.deadline - b.deadline);
    // Sort ended by most recent first
    ended.sort((a, b) => b.deadline - a.deadline);

    setActiveChallenges(active);
    setEndedChallenges(ended);
  }, [allChallenges]);

  // Handle challenge sharing
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

  // Handle participation click
  const handleParticipateClick = async (challenge) => {
    if (!user) {
      alert('Você precisa fazer login para participar de desafios!');
      return;
    }
    
    const now = new Date();
    if (now > challenge.deadline) {
      alert('Este desafio já expirou e não aceita mais participações.');
      return;
    }

    try {
      const userParticipationRef = ref(db, `participations/${challenge.id}/${user.uid}`);
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

  // Format prize value
  const formatPrize = (prize) => {
    if (!prize) return '';
    const numericValue = prize.replace(/\D/g, '');
    return numericValue ? `${numericValue} MT` : prize;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Enhanced Tabs Navigation */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex justify-center border-b border-gray-200">
          <div className="flex max-w-md w-full">
            {/* Feed Tab */}
            <button 
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'feed' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <Zap className={`w-5 h-5 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Feed</span>
              </div>
            </button>
            
            {/* Active Challenges Tab */}
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'active' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <Sparkles className={`w-5 h-5 ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Ativos</span>
              </div>
            </button>
            
            {/* Ended Challenges Tab (Expired + Completed) */}
            <button 
              onClick={() => setActiveTab('ended')}
              className={`flex-1 py-4 px-2 flex flex-col items-center justify-center transition-all ${activeTab === 'ended' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <div className={`flex items-center justify-center w-full ${activeTab === 'ended' ? 'border-b-2 border-blue-600 pb-3' : 'pb-4'}`}>
                <Clock className={`w-5 h-5 ${activeTab === 'ended' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="ml-2 text-sm font-medium">Encerrados</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pt-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        )}

        {/* Feed Tab Content */}
        {!loading && !error && activeTab === 'feed' && (
          <Feed 
            challenges={[...activeChallenges, ...endedChallenges]}
            user={user}
            onParticipateClick={handleParticipateClick}
            onShareClick={handleShareChallenge}
            formatPrize={formatPrize}
          />
        )}
        
        {/* Active Challenges Tab Content */}
        {!loading && !error && activeTab === 'active' && (
          <ChallengeList 
            challenges={activeChallenges}
            user={user}
            onParticipateClick={handleParticipateClick}
            onShareClick={handleShareChallenge}
            formatPrize={formatPrize}
            emptyMessage="Nenhum desafio ativo no momento"
          />
        )}
        
        {/* Ended Challenges Tab Content */}
        {!loading && !error && activeTab === 'ended' && (
          <ChallengeList 
            challenges={endedChallenges}
            user={user}
            onShareClick={handleShareChallenge}
            formatPrize={formatPrize}
            emptyMessage="Nenhum desafio encerrado"
            showEndedStatus={true}
          />
        )}
      </div>

      {/* Participation Modal */}
      {showParticipateModal && selectedChallenge && (
        <ParticipateModal 
          challenge={selectedChallenge}
          user={user}
          userData={userData}
          onClose={() => setShowParticipateModal(false)}
          formatPrize={formatPrize}
        />
      )}
      
      {/* Share Modal */}
      {showShareModal && currentChallenge && (
        <ShareModal 
          challenge={currentChallenge}
          onClose={() => setShowShareModal(false)}
          formatPrize={formatPrize}
        />
      )}
    </div>
  );
};

export default HomePage;