import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaLink, FaInfoCircle, FaGift, FaUsers, FaCheckCircle, FaShareAlt, FaTimes, FaClock } from "react-icons/fa";
import { auth } from "../fb";
import { getDatabase, ref, get, child, set, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import logo from "../img/logo.png";
import confetti from "canvas-confetti";

const InviteFriendCard = ({ userData }) => {
  // Challenge configuration
  const CHALLENGE_DURATION_DAYS = 14;
  const MIN_FRIENDS_REQUIRED = 50; // Changed from 1000 to 50
  const SPECIAL_REWARD_AMOUNT = 200;

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
  const [isChallengeAvailable, setIsChallengeAvailable] = useState(true);
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
      }, 1000 * 60 * 60);
      
      return () => clearInterval(interval);
    }
  }, [challengeStartDate]);

  const countFriendsInPeriod = async (username) => {
    const dbRef = ref(getDatabase());
    const snapshot = await get(child(dbRef, `referrals/${username}`));
    
    if (snapshot.exists()) {
      const referrals = snapshot.val();
      const now = new Date();
      let earliestDate = now;
      
      const validReferrals = Object.values(referrals).filter(ref => {
        const refDate = new Date(ref.date);
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

  const markChallengeAsCompleted = async (uid, count) => {
    const db = getDatabase();
    const challengeRef = ref(db, `specialChallenges`);
    
    try {
      // Check if someone already completed the challenge
      const snapshot = await get(challengeRef);
      if (snapshot.exists()) {
        const challenges = snapshot.val();
        const completedChallenge = Object.values(challenges).find(c => c.completed);
        
        if (completedChallenge) {
          // Someone already completed before
          setIsChallengeAvailable(false);
          setShouldDisplay(false);
          return;
        }
      }
      
      // If no one completed yet, mark as completed for this user
      await set(ref(db, `specialChallenges/${uid}`), {
        completed: true,
        completedDate: new Date().toISOString(),
        invitedCount: count,
        rewardAmount: SPECIAL_REWARD_AMOUNT,
        type: "invite50First",
        userId: uid,
      });
      
      setChallengeCompleted(true);
      setShowCelebration(true);
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => setShowCelebration(false), 5000);
      
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
          
          // Check if challenge is still available
          const challengeSnapshot = await get(child(dbRef, `specialChallenges`));
          if (challengeSnapshot.exists()) {
            const challenges = challengeSnapshot.val();
            const completedChallenge = Object.values(challenges).find(c => c.completed);
            if (completedChallenge) {
              setIsChallengeAvailable(false);
              if (completedChallenge.userId === currentUser.uid) {
                setChallengeCompleted(true);
                setInvitedFriendsCount(completedChallenge.invitedCount);
              }
              setShouldDisplay(false);
              return;
            }
          }
          
          const friendsCount = await countFriendsInPeriod(userData.username);
          setInvitedFriendsCount(friendsCount);
          
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

  if (challengeExpired) return null;
  if (!shouldDisplay) return null;
  if (loading) return <LoadingSkeleton />;
  if (!isChallengeAvailable && !challengeCompleted) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 w-full mx-auto relative overflow-hidden shadow-lg">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 p-6 rounded-xl shadow-2xl text-center animate-pop-in mx-4 border-2 border-yellow-300">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-yellow-700 mb-2">Parabéns!</h3>
            <p className="text-lg text-yellow-800 mb-3">Você foi o primeiro a completar o desafio e ganhou {SPECIAL_REWARD_AMOUNT}MT!</p>
            <div className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm inline-block">
              Seu saldo foi atualizado
            </div>
          </div>
        </div>
      )}
      
      {challengeCompleted && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center z-10 shadow-md">
          <FaCheckCircle className="mr-1 text-sm" />
          <span className="text-xs font-bold">Concluído!</span>
        </div>
      )}
      
      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors z-10"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={22} />
      </button>
      
      <div className="relative z-10">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2 rounded-full shadow-lg">
            <FaGift size={24} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Desafio Especial
        </h2>
        
        <p className="text-center text-gray-600 mb-4">
          Seja o primeiro a convidar <span className="font-bold text-purple-600">50 amigos</span> e ganhe{" "}
          <span className="font-bold text-yellow-600">{SPECIAL_REWARD_AMOUNT}MT</span>!
        </p>
        
        <div className="mb-5">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">{invitedFriendsCount}/50 amigos</span>
            <span className="font-bold text-indigo-600">{Math.floor((invitedFriendsCount / MIN_FRIENDS_REQUIRED) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full shadow-md" 
              style={{ width: `${Math.min(100, (invitedFriendsCount / MIN_FRIENDS_REQUIRED) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">Início</span>
            <span className="text-xs font-medium text-indigo-600">
              {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Tempo esgotado!"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="flex items-center justify-center text-indigo-500 mb-2">
              <FaUsers size={20} />
            </div>
            <span className="block text-lg font-bold text-gray-800">{invitedFriendsCount}</span>
            <span className="block text-xs text-gray-500">Amigos convidados</span>
          </div>
          
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="flex items-center justify-center text-yellow-500 mb-2">
              <FaGift size={20} />
            </div>
            <span className="block text-lg font-bold text-gray-800">
              {challengeCompleted ? SPECIAL_REWARD_AMOUNT : 0}<span className="text-sm">MT</span>
            </span>
            <span className="block text-xs text-gray-500">Prêmio</span>
          </div>
        </div>

        {challengeCompleted ? (
          <div className="text-center py-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium shadow-inner">
            🎉 Desafio concluído! Você ganhou {SPECIAL_REWARD_AMOUNT}MT!
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleShareClick}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center text-sm font-bold transform hover:scale-[1.02]"
            >
              <FaUsers className="mr-2" />
              Convidar Amigos Agora
            </button>
            
            <button
              onClick={handleCopyLink}
              className="w-full bg-white text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition duration-300 border-2 border-gray-200 shadow-sm flex items-center justify-center text-sm font-medium group"
            >
              <FaLink className="mr-2 text-indigo-500 group-hover:text-indigo-600" />
              {copied ? "Link Copiado! ✅" : "Copiar Link de Convite"}
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ShareModal 
          inviteLink={inviteLink}
          onClose={() => setIsModalOpen(false)}
          onCopy={handleCopyLink}
          username={userData?.username}
          rewardAmount={SPECIAL_REWARD_AMOUNT}  // Add this line
        />
      )}

      {isInfoModalOpen && (
        <InfoModal 
          onClose={() => setIsInfoModalOpen(false)}
          minFriends={MIN_FRIENDS_REQUIRED}
          rewardAmount={SPECIAL_REWARD_AMOUNT}
          daysRemaining={daysRemaining}
          challengeDuration={CHALLENGE_DURATION_DAYS}
          isFirstToComplete={true}
        />
      )}
    </div>
  );
};

const ShareModal = ({ inviteLink, onClose, onCopy, username, SPECIAL_REWARD_AMOUNT }) => {
  const shareMessage = ` @${username} te convidou para o VotaSnap! \n\nCadastre-se usando meu link e seja um dos primeiros a ganhar os 200MT de bônus ao convidar 50 amigos:\n${inviteLink}\n\nVamos juntos nessa!`;
  const emailSubject = `@${username} te convidou para o VotaSnap - Ganhe 200MT sendo rápido!`;
  const emailBody = `Olá!\n\nVocê foi convidado(a) para participar do VotaSnap. Seja rápido e seja o primeiro a convidar 50 amigos para ganhar 200MT de bônus. Cadastrar usando meu link:\n\n${inviteLink}\n\nNão perca essa oportunidade! \n\nAtenciosamente,\n${username}`;

  const handleNativeShare = () => {
    const shareData = {
      title: "VotaSnap - Convite Especial",
      text: shareMessage,
      url: inviteLink,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((error) => console.log('Erro ao compartilhar:', error));
    } else {
      onCopy();
    }
  };

  const shareOptions = [
    {
      icon: <FaShareAlt size={20} className="text-indigo-500" />,
      text: "Compartilhar",
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-100",
      action: handleNativeShare
    },
    {
      icon: <FaWhatsapp size={20} className="text-green-500" />,
      text: "WhatsApp",
      color: "bg-green-50 hover:bg-green-100 border-green-100",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
    },
    {
      icon: <FaFacebook size={20} className="text-blue-600" />,
      text: "Facebook",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-100",
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`, '_blank')
    },
    {
      icon: <FaEnvelope size={20} className="text-red-500" />,
      text: "Email",
      color: "bg-red-50 hover:bg-red-100 border-red-100",
      action: () => window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank')
    },
    {
      icon: <FaLink size={18} className="text-purple-500" />,
      text: "Copiar Link",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-100",
      action: onCopy
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md relative overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes size={20} />
        </button>
        
        <div className="text-center mb-5">
          <div className="mx-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full w-16 h-16 flex items-center justify-center shadow-lg mb-3">
            <FaShareAlt size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Compartilhe e Ganhe</h3>
          <p className="text-gray-600 text-sm">
            Seja o primeiro a convidar 50 amigos e ganhe {SPECIAL_REWARD_AMOUNT}MT!
          </p>
        </div>
        
        <div className="space-y-3 mb-5">
          {shareOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className={`w-full flex items-center justify-start space-x-3 py-3 px-4 ${option.color} rounded-lg transition-all transform hover:scale-[1.02] border`}
            >
              <div className="p-2 rounded-lg bg-white shadow-sm">
                {option.icon}
              </div>
              <span className="font-medium text-gray-700">{option.text}</span>
            </button>
          ))}
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-700 font-medium">
            📢 Compartilhe rápido para ser o primeiro a completar o desafio!
          </p>
        </div>
      </div>
    </div>
  );
};

const InfoModal = ({ onClose, minFriends, rewardAmount, daysRemaining, isFirstToComplete }) => {
  const features = [
    {
      icon: <FaUsers className="text-blue-500 text-lg" />,
      title: "Como Participar",
      description: `Seja o primeiro a convidar ${minFriends} amigos para se cadastrarem no VotaSnap usando seu link exclusivo.`
    },
    {
      icon: <FaGift className="text-purple-500 text-lg" />,
      title: "Sua Recompensa",
      description: `O primeiro usuário que completar o desafio receberá ${rewardAmount}MT diretamente na sua conta.`
    },
    {
      icon: <FaCheckCircle className="text-green-500 text-lg" />,
      title: "Regras",
      description: "Apenas cadastros completos e verificados serão contabilizados. Prêmio único para o primeiro que completar."
    },
    {
      icon: <FaClock className="text-yellow-500 text-lg" />,
      title: "Prazo",
      description: `Você tem ${daysRemaining} dias para tentar ser o primeiro. Não perca tempo!`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes size={20} />
        </button>
        
        <div className="text-center mb-5">
          <div className="mx-auto bg-gradient-to-r from-purple-500 to-blue-600 text-white p-3 rounded-full w-16 h-16 flex items-center justify-center shadow-lg mb-3">
            <FaInfoCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Desafio Especial</h3>
          <p className="text-gray-600 text-sm">
            Seja o primeiro a completar e ganhe o prêmio!
          </p>
        </div>
        
        <div className="space-y-4 mb-5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <div className="bg-blue-50 p-2 rounded-lg mr-3 flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md font-bold"
        >
          Entendi, vamos lá!
        </button>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg rounded-xl p-5 w-full mx-auto relative overflow-hidden">
    <div className="animate-pulse flex flex-col items-center">
      <div className="h-10 w-10 bg-gray-300 rounded-full mb-4"></div>
      <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-5"></div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div className="bg-gray-300 h-3 rounded-full w-1/3"></div>
      </div>
      <div className="flex justify-between w-full mb-5">
        <div className="h-16 bg-gray-300 rounded-lg w-[48%]"></div>
        <div className="h-16 bg-gray-300 rounded-lg w-[48%]"></div>
      </div>
      <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
    </div>
  </div>
);

export default InviteFriendCard;