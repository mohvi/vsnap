import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaSms, FaLink, FaInfoCircle, FaGift, FaUsers, FaMoneyBillWave, FaCrown, FaCheckCircle, FaCoins, FaClock } from "react-icons/fa";
import { auth } from "../fb";
import { getDatabase, ref, get, child, set, query, orderByChild, limitToFirst, equalTo, update } from "firebase/database";
import { useNavigate } from "react-router-dom";

const InviteFriendCard = ({ userData }) => {
  // Challenge configuration
  const CHALLENGE_DURATION_DAYS = 14; // 2 weeks
  const MIN_FRIENDS_REQUIRED = 50;
  const SPECIAL_REWARD_AMOUNT = 200; // 200MT

  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [invitedFriendsCount, setInvitedFriendsCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shouldDisplay, setShouldDisplay] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(CHALLENGE_DURATION_DAYS);
  const [challengeStartDate, setChallengeStartDate] = useState(null);
  const navigate = useNavigate();

  // Calculate days remaining
  useEffect(() => {
    if (challengeStartDate) {
      const interval = setInterval(() => {
        const now = new Date();
        const endDate = new Date(challengeStartDate);
        endDate.setDate(endDate.getDate() + CHALLENGE_DURATION_DAYS);
        
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysRemaining(diffDays > 0 ? diffDays : 0);
        
        if (diffTime <= 0) {
          setChallengeExpired(true);
          clearInterval(interval);
        }
      }, 1000 * 60 * 60); // Update every hour
      
      return () => clearInterval(interval);
    }
  }, [challengeStartDate]);

  // Count friends invited within challenge period
const countFriendsInPeriod = async (username) => {
  const dbRef = ref(getDatabase());
  const snapshot = await get(child(dbRef, `referrals/${username}`));
  
  if (snapshot.exists()) {
    const referrals = snapshot.val();
    const now = new Date();
    let earliestDate = now;
    
    const validReferrals = Object.values(referrals).filter(ref => {
      // Corrigido: usando 'date' em vez de 'timestamp'
      const refDate = new Date(ref.date);  // <-- Alteração principal aqui
      if (refDate < earliestDate) earliestDate = refDate;
      return (now - refDate) <= (CHALLENGE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    });
    
    if (validReferrals.length > 0 && !challengeStartDate) {
      setChallengeStartDate(earliestDate);
    }
    
    return validReferrals.length;
  }
  return 0;
};

  // Mark challenge as completed
  const markChallengeAsCompleted = async (uid, count) => {
    const db = getDatabase();
    const challengeRef = ref(db, `specialChallenges/${uid}`);
    
    try {
      await set(challengeRef, {
        completed: true,
        completedDate: new Date().toISOString(),
        invitedCount: count,
        rewardAmount: SPECIAL_REWARD_AMOUNT,
        type: "invite50Friends",
        userId: uid,
      });
      
      setChallengeCompleted(true);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      
      await update(ref(db, `users/${uid}`), {
        coins: SPECIAL_REWARD_AMOUNT,
        lastCoinUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking challenge as completed:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setLoading(true);
        try {
          const dbRef = ref(getDatabase());
          
          // Check if challenge was already completed
          const challengeSnapshot = await get(child(dbRef, `specialChallenges/${currentUser.uid}`));
          if (challengeSnapshot.exists() && challengeSnapshot.val().completed) {
            setShouldDisplay(false);
            return;
          }
          
          // Count friends invited in the period
          const friendsCount = await countFriendsInPeriod(userData.username);
          setInvitedFriendsCount(friendsCount);
          
          // Check if challenge is completed
          if (friendsCount >= MIN_FRIENDS_REQUIRED) {
            await markChallengeAsCompleted(currentUser.uid, friendsCount);
          }
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Share functionality
  const inviteLink = user ? `https://votasnap.online/auth?ref=${userData.username}` : "#";

  const handleShareClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCopyLink = () => {
    if (user) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      navigate("/auth");
    }
  };

  // Early returns for special cases
  if (challengeExpired) return null;
  if (!shouldDisplay) return null;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-md rounded-xl p-4 w-full mx-auto relative overflow-hidden">
      {/* Celebration modal */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-30">
          <div className="bg-white p-4 rounded-xl shadow-2xl text-center animate-bounce mx-4">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-lg font-bold text-green-600">Parabéns!</h3>
            <p className="text-sm text-gray-700">Você ganhou {SPECIAL_REWARD_AMOUNT}MT!</p>
          </div>
        </div>
      )}

      {/* Challenge completed badge */}
      {challengeCompleted && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 rounded-bl-lg rounded-tr-xl flex items-center z-10">
          <FaCheckCircle className="mr-1 text-xs" />
          <span className="text-xs font-bold">Concluído!</span>
        </div>
      )}

      {/* Info button */}
      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 transition-colors z-10"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={20} />
      </button>

      {/* Main content */}
      <div className="relative z-10">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-1 flex items-center justify-center">
          <FaGift className="mr-2 text-purple-500" /> Desafio Especial
        </h2>
        
        <p className="text-center text-sm text-gray-600 mb-3">
          Convide {MIN_FRIENDS_REQUIRED} amigos em {CHALLENGE_DURATION_DAYS} dias e ganhe {SPECIAL_REWARD_AMOUNT}MT!
        </p>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{invitedFriendsCount}/{MIN_FRIENDS_REQUIRED} amigos</span>
            <span>{Math.floor((invitedFriendsCount / MIN_FRIENDS_REQUIRED) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (invitedFriendsCount / MIN_FRIENDS_REQUIRED) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Desafio encerrado!"}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mb-4 gap-2">
          <div className="bg-white p-2 rounded-lg shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-blue-500 mb-1">
              <FaUsers size={16} />
            </div>
            <span className="block text-sm font-bold text-gray-700">{invitedFriendsCount}</span>
            <span className="block text-xs text-gray-500">Amigos</span>
          </div>
          
          <div className="bg-white p-2 rounded-lg shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-purple-500 mb-1">
              <FaGift size={16} />
            </div>
            <span className="block text-sm font-bold text-gray-700">
              {challengeCompleted ? SPECIAL_REWARD_AMOUNT : 0}MT
            </span>
            <span className="block text-xs text-gray-500">Prêmio</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {challengeCompleted ? (
            <div className="text-center py-2 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm font-medium">
              🎉 Você ganhou {SPECIAL_REWARD_AMOUNT}MT!
            </div>
          ) : (
            <>
              <button
                onClick={handleShareClick}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition shadow-md flex items-center justify-center text-sm"
              >
                <FaUsers className="mr-2" />
                Convidar Amigos
              </button>
              
              <button
                onClick={handleCopyLink}
                className="w-full bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition duration-300 border border-gray-200 shadow-sm flex items-center justify-center text-sm"
              >
                <FaLink className="mr-2" />
                {copied ? "Link Copiado!" : "Copiar Link"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Share modal */}
      {isModalOpen && (
        <ShareModal 
          inviteLink={inviteLink}
          onClose={() => setIsModalOpen(false)}
          onCopy={handleCopyLink}
        />
      )}

      {/* Info modal */}
      {isInfoModalOpen && (
        <InfoModal 
          onClose={() => setIsInfoModalOpen(false)}
          minFriends={MIN_FRIENDS_REQUIRED}
          rewardAmount={SPECIAL_REWARD_AMOUNT}
          daysRemaining={daysRemaining}
          challengeDuration={CHALLENGE_DURATION_DAYS}
        />
      )}
    </div>
  );
};

// Sub-components
const LoadingSkeleton = () => (
  <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg rounded-xl p-4 w-full mx-auto relative overflow-hidden flex items-center justify-center h-48">
    <div className="animate-pulse flex flex-col items-center w-full">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2 mb-4"></div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div className="bg-gray-300 h-2 rounded-full w-1/3"></div>
      </div>
      <div className="flex justify-between w-full mb-4">
        <div className="h-12 bg-gray-300 rounded-lg w-1/4"></div>
        <div className="h-12 bg-gray-300 rounded-lg w-1/4"></div>
      </div>
      <div className="h-10 bg-gray-300 rounded-lg w-full"></div>
    </div>
  </div>
);

const ShareModal = ({ inviteLink, onClose, onCopy }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-xs relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">✕</button>
      
      <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">Compartilhar Convite</h3>
      <p className="text-center text-gray-600 text-xs mb-4">
        Cada amigo que se cadastrar conta para o desafio!
      </p>
      
      <div className="space-y-2">
        <ShareButton 
          icon={<FaWhatsapp size={20} className="text-green-500" />}
          text="WhatsApp"
          onClick={() => window.open(`https://wa.me/?text=Participe%20do%20Desafio%20VotaSnap!%20Use%20meu%20link:%20${inviteLink}`, '_blank')}
        />
        
        <ShareButton 
          icon={<FaFacebook size={20} className="text-blue-600" />}
          text="Facebook"
          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`, '_blank')}
        />
        
        <ShareButton 
          icon={<FaEnvelope size={20} className="text-red-500" />}
          text="Email"
          onClick={() => window.open(`mailto:?subject=Participe%20do%20Desafio%20VotaSnap!&body=Olá!%20Cadastre-se%20usando%20meu%20link:%20${inviteLink}`, '_blank')}
        />
        
        <button
          onClick={onCopy}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200 text-sm"
        >
          <FaLink size={18} className="text-gray-700" />
          <span className="text-gray-700 font-medium">Copiar Link</span>
        </button>
      </div>
    </div>
  </div>
);

const InfoModal = ({ onClose, minFriends, rewardAmount, daysRemaining }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-xs">
      <h3 className="text-lg font-bold text-gray-800 mb-3 text-center flex items-center justify-center">
        <FaInfoCircle className="mr-2 text-blue-500" /> Como Funciona
      </h3>
      
      <div className="space-y-3 text-gray-700 text-xs">
        <div className="flex items-start">
          <div className="bg-blue-100 p-1 rounded-lg mr-2">
            <FaUsers className="text-blue-500 text-sm" />
          </div>
          <div>
            <h4 className="font-semibold">Desafio Especial</h4>
            <p>Convide {minFriends} amigos em 14 dias e ganhe {rewardAmount}MT.</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-purple-100 p-1 rounded-lg mr-2">
            <FaGift className="text-purple-500 text-sm" />
          </div>
          <div>
            <h4 className="font-semibold">Prêmio</h4>
            <p>Complete o desafio e receba {rewardAmount}MT diretamente na sua conta.</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-yellow-100 p-1 rounded-lg mr-2">
            <FaClock className="text-yellow-500 text-sm" />
          </div>
          <div>
            <h4 className="font-semibold">Tempo Restante</h4>
            <p>{daysRemaining} dias para completar o desafio.</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300 shadow-md text-sm"
      >
        Entendi
      </button>
    </div>
  </div>
);

const ShareButton = ({ icon, text, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition duration-200 border border-gray-200 text-sm"
  >
    {icon}
    <span className="text-gray-700 font-medium">{text}</span>
  </button>
);

export default InviteFriendCard;