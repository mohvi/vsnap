import React, { useState, useEffect } from 'react';
import { db, auth } from '../fb';
import { ref, onValue, get, update, child } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import ChallengeList from './ChallengeList';
import ParticipateModal from './ParticipateModal';
import ShareModal from './ShareModal';
import InviteFriendCard from './InviteFriendCard';
import { Sparkles, Trophy } from 'lucide-react';
import WinnersList from './WinnersList';

const HomePage = ({ userData }) => {
  const [activeTab, setActiveTab] = useState('active');
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

  // Verificar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Verificar se o desafio especial foi completado
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

  // Classificar desafios em ativos e encerrados
  useEffect(() => {
    if (allChallenges.length === 0) return;

    const now = new Date();
    const active = [];
    const completed = [];

    allChallenges.forEach(challenge => {
      const challengeEndDate = new Date(challenge.createdAt);
      challengeEndDate.setDate(challengeEndDate.getDate() + (challenge.deadlineDays || 0));
      
      if (!challenge.status) {
        completed.push(challenge);
      } else {
        active.push(challenge);
      }
    });

    setActiveChallenges(active);
    setCompletedChallenges(completed);
  }, [allChallenges]);

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
      url: `https://votasnap.online/challenges/${challenge.id}`,
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
    <div className="p-4 bg-gray-50 min-h-screen">
      <WinnersList/>
      <div className="flex border-b mb-8 bg-white rounded-t-lg shadow-sm">
        <button 
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 flex items-center ${activeTab === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Sparkles className="mr-2" /> Desafios Ativos
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 flex items-center ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Trophy className="mr-2" /> Encerrados
        </button>
      </div>

      {activeTab === 'active' ? (
        <ChallengeList 
          loading={loading}
          error={error}
          challenges={activeChallenges}
          user={user}
          onParticipateClick={handleParticipateClick}
          onShareClick={handleShareChallenge}
        />
      ) : (
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