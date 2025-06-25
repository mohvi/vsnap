import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaSms, FaLink, FaInfoCircle, FaGift, FaUsers, FaMoneyBillWave, FaCrown, FaCheckCircle, FaCoins } from "react-icons/fa";
import { auth } from "../fb";
import { getDatabase, ref, get, child, set, query, orderByChild, limitToFirst, equalTo, update } from "firebase/database";
import { useNavigate } from "react-router-dom";

const InviteFriendCard = ({userData}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [invitedFriendsCount, setInvitedFriendsCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactInfo, setContactInfo] = useState("");
  const [rewardStatus, setRewardStatus] = useState(null);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(10);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shouldDisplay, setShouldDisplay] = useState(true);
  const navigate = useNavigate();

  const COINS_PER_FRIEND = 2;
  const MAX_COINS = 100;
  const MAX_PARTICIPANTS = 10;

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
    setUser(currentUser);
    
    if (currentUser) {
      setLoading(true);
      try {
        const dbRef = ref(getDatabase());
        const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));
        
        // Verificar se o desafio já foi completado
        const challengeSnapshot = await get(child(dbRef, `specialChallenges/${currentUser.uid}`));
        if (challengeSnapshot.exists() && challengeSnapshot.val().completed) {
          setShouldDisplay(false);
          return;
        }
        
        if (userSnapshot.exists() && userSnapshot.val().coins) {
          setTotalCoins(userSnapshot.val().coins);
        }
        
        await Promise.all([
          fetchInvitedFriendsCount(userData.username),
          checkRewardStatus(currentUser.uid),
          checkAvailableSlots(),
          checkChallengeCompletion(currentUser.uid)
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
  });

  return () => unsubscribe();
}, []);

  const fetchInvitedFriendsCount = async (uid) => {
    const dbRef = ref(getDatabase());
    try {
      const snapshot = await get(child(dbRef, `referrals/${uid}`));
      
      if (snapshot.exists()) {
        const count = Object.keys(snapshot.val()).length;
        setInvitedFriendsCount(count);
        const coins = count * COINS_PER_FRIEND;
        setTotalCoins(coins);
        
        if (user?.uid) {
          await updateUserCoins(user.uid, coins);
        }
        
        if (coins >= MAX_COINS && !challengeCompleted) {
          await markChallengeAsCompleted(uid, count);
        }
      } else {
        setInvitedFriendsCount(0);
        setTotalCoins(0);
      }
    } catch (error) {
      console.error("Erro ao contar amigos convidados:", error);
      setInvitedFriendsCount(0);
      setTotalCoins(0);
    }
  };

  const updateUserCoins = async (uid, coins) => {
    const db = getDatabase();
    try {
      await update(ref(db, `users/${uid}`), {
        coins: coins,
        lastCoinUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao atualizar moedas do usuário:", error);
    }
  };

  const markChallengeAsCompleted = async (uid, count) => {
    const db = getDatabase();
    const challengeRef = ref(db, `specialChallenges/${uid}`);
    
    try {
      await set(challengeRef, {
        completed: true,
        completedDate: new Date().toISOString(),
        invitedCount: count,
        coinsEarned: count * COINS_PER_FRIEND,
        type: "inviteFriend",
        userId: uid,
      });
      setChallengeCompleted(true);
    } catch (error) {
      console.error("Erro ao marcar desafio como concluído:", error);
    }
  };

  const checkChallengeCompletion = async (uid) => {
    const dbRef = ref(getDatabase());
    try {
      const snapshot = await get(child(dbRef, `challenges/${uid}`));
      if (snapshot.exists()) {
        setChallengeCompleted(snapshot.val().completed || false);
      }
    } catch (error) {
      console.error("Erro ao verificar conclusão do desafio:", error);
    }
  };

  const checkRewardStatus = async (uid) => {
    const dbRef = ref(getDatabase());
    try {
      const rewardSnapshot = await get(child(dbRef, `rewards/${uid}`));
      if (rewardSnapshot.exists()) {
        const rewardData = rewardSnapshot.val();
        setRewardStatus(rewardData.status || null);
        setRewardAmount(rewardData.amount || 0);
        
        if (rewardData.status === "completed") {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status da recompensa:", error);
    }
  };

  const checkAvailableSlots = async () => {
    const db = getDatabase();
    const challengesRef = ref(db, 'challenges');
    const queryRef = query(challengesRef, orderByChild('completed'), equalTo(true));
    
    try {
      const snapshot = await get(queryRef);
      if (snapshot.exists()) {
        const completedCount = snapshot.size;
        setAvailableSlots(Math.max(0, MAX_PARTICIPANTS - completedCount));
        
        if (completedCount >= MAX_PARTICIPANTS) {
          setChallengeExpired(true);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar vagas disponíveis:", error);
    }
  };

  const handleRequestReward = async () => {
    if (totalCoins >= MAX_COINS && availableSlots > 0 && challengeCompleted) {
      setIsRequestModalOpen(true);
    }
  };

  const handleSubmitRewardRequest = async () => {
    if (!contactInfo) {
      alert("Por favor, insira suas informações de contacto");
      return;
    }

    try {
      const db = getDatabase();
      const rewardRef = ref(db, `rewards/${user.uid}`);
      
      const rewardData = {
        uid: user.uid,
        invitedCount: invitedFriendsCount,
        coins: totalCoins,
        amount: calculateRewardAmount(totalCoins),
        contactInfo: contactInfo,
        status: "pending",
        type: "inviteFriend",
        requestDate: new Date().toISOString(),
        displayName: user.displayName || user.email,
        position: MAX_PARTICIPANTS - availableSlots + 1,
        challengeCompletedDate: new Date().toISOString()
      };

      await set(rewardRef, rewardData);
      
      setRewardStatus("pending");
      setRewardAmount(rewardData.amount);
      setAvailableSlots(prev => prev - 1);
      setIsRequestModalOpen(false);
      setContactInfo("");
      alert("Sua solicitação de recompensa foi enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao solicitar recompensa:", error);
      alert("Ocorreu um erro ao solicitar sua recompensa. Tente novamente.");
    }
  };

  const calculateRewardAmount = (coins) => {
    return coins;
  };

  const inviteLink = user ? `https://votasnap.vercel.app/auth?ref=${userData.username}` : "#";

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

  const handleViewFriends = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/invited-friends");
  };

  const getProgressPercentage = () => {
    return Math.min(100, (totalCoins / MAX_COINS) * 100);
  };

  const canRequestReward = () => {
    return (
      totalCoins >= MAX_COINS && 
      availableSlots > 0 && 
      challengeCompleted && 
      !rewardStatus
    );
  };

  if (challengeExpired) {
    return null;
  }

  if (!shouldDisplay) {
  return null;
}

  if (loading) {
    return (
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
            <div className="h-12 bg-gray-300 rounded-lg w-1/4"></div>
          </div>
          <div className="h-10 bg-gray-300 rounded-lg w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-md rounded-xl p-4 w-full mx-auto relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-30">
          <div className="bg-white p-4 rounded-xl shadow-2xl text-center animate-bounce mx-4">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-lg font-bold text-green-600">Parabéns!</h3>
            <p className="text-sm text-gray-700">Você resgatou sua recompensa de {rewardAmount}MT!</p>
          </div>
        </div>
      )}

      {challengeCompleted && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 rounded-bl-lg rounded-tr-xl flex items-center z-10">
          <FaCheckCircle className="mr-1 text-xs" />
          <span className="text-xs font-bold">Concluído!</span>
        </div>
      )}

      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 transition-colors z-10"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={20} />
      </button>

      <div className="relative z-10">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-1 flex items-center justify-center">
          <FaCoins className="mr-2 text-yellow-500" /> Desafio Especial
        </h2>
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{totalCoins}/{MAX_COINS} moedas</span>
            <span>{Math.floor(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 gap-2">
          <div className="bg-white p-2 rounded-lg shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-blue-500 mb-1">
              <FaUsers size={16} />
            </div>
            <span className="block text-sm font-bold text-gray-700">{invitedFriendsCount}</span>
            <span className="block text-xs text-gray-500">Amigos</span>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-yellow-500 mb-1">
              <FaCoins size={16} />
            </div>
            <span className="block text-sm font-bold text-gray-700">{totalCoins}</span>
            <span className="block text-xs text-gray-500">Moedas</span>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-green-500 mb-1">
              <FaMoneyBillWave size={16} />
            </div>
            <span className="block text-sm font-bold text-gray-700">
              {rewardStatus === "completed" ? rewardAmount : 0}MT
            </span>
            <span className="block text-xs text-gray-500">Ganhos</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleShareClick}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-300 shadow-md flex items-center justify-center text-sm"
          >
            <FaUsers className="mr-2" />
            Convidar Amigos
          </button>
          
          <button
            onClick={handleViewFriends}
            className="w-full bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition duration-300 border border-gray-200 shadow-sm flex items-center justify-center text-sm"
          >
            <FaLink className="mr-2" />
            Ver Amigos
          </button>
          
          {rewardStatus === "pending" ? (
            <div className="text-center py-1 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-100 text-xs">
              ⏳ Recompensa pendente
            </div>
          ) : rewardStatus === "completed" ? (
            <div className="text-center py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 text-xs">
              ✅ {rewardAmount}MT recebidos!
            </div>
          ) : canRequestReward() ? (
            <button
              onClick={handleRequestReward}
              className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-2 rounded-lg hover:from-green-500 hover:to-green-700 transition duration-300 shadow-md flex items-center justify-center text-sm animate-pulse"
            >
              <FaGift className="mr-2" />
              Resgatar {totalCoins}MT
            </button>
          ) : totalCoins >= MAX_COINS && availableSlots <= 0 ? (
            <div className="text-center py-1 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs">
              😔 Vagas esgotadas
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-xs relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">Compartilhar Convite</h3>
            <p className="text-center text-gray-600 text-xs mb-4">
              Cada amigo que se cadastrar vale 2 moedas para você!
            </p>
            
            <div className="space-y-2">
              <ShareButton 
                icon={<FaWhatsapp size={20} className="text-green-500" />}
                text="WhatsApp"
                onClick={() => window.open(`https://wa.me/?text=Participe%20do%20Desafio%20VotaSnap!%20Cada%20cadastro%20vale%202%20moedas!%20Use%20meu%20link:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaFacebook size={20} className="text-blue-600" />}
                text="Facebook"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaEnvelope size={20} className="text-red-500" />}
                text="Email"
                onClick={() => window.open(`mailto:?subject=Participe%20do%20Desafio%20VotaSnap!&body=Olá!%20Cadastre-se%20usando%20meu%20link%20e%20me%20ajude%20a%20ganhar%20moedas:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaSms size={20} className="text-blue-400" />}
                text="SMS"
                onClick={() => window.open(`sms:?&body=Participe%20do%20Desafio%20VotaSnap!%20Cadastre-se%20com%20meu%20link:%20${inviteLink}`, '_blank')}
              />
              
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200 text-sm"
              >
                <FaLink size={18} className="text-gray-700" />
                <span className="text-gray-700 font-medium">
                  {copied ? "Copiado!" : "Copiar Link"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Recompensa */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-xs">
            <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
              Resgatar {totalCoins}MT
            </h3>
            
            <div className="mb-3">
              <div className="bg-yellow-50 text-yellow-700 p-2 rounded-lg mb-3 text-center text-xs">
                <FaCrown className="inline-block mr-1" />
                <strong>Você está entre os {MAX_PARTICIPANTS} primeiros!</strong>
              </div>
              
              <p className="text-gray-600 text-xs mb-3">
                Você convidou {invitedFriendsCount} amigos e pode receber {totalCoins}MT.
              </p>
              
              <div className="mb-3">
                <label className="block text-gray-700 text-xs font-medium mb-1">
                  Como deseja receber?
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Nº M-Pesa, E-mola"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe os detalhes para recebimento
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitRewardRequest}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações */}
      {isInfoModalOpen && (
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
                  <h4 className="font-semibold">Como funciona?</h4>
                  <p>Cadastre amigos usando seu link e ganhe 2 moedas por cada um.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-yellow-100 p-1 rounded-lg mr-2">
                  <FaCoins className="text-yellow-500 text-sm" />
                </div>
                <div>
                  <h4 className="font-semibold">Meta</h4>
                  <p>Junte {MAX_COINS} moedas (50 amigos) para trocar por dinheiro.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-purple-100 p-1 rounded-lg mr-2">
                  <FaCrown className="text-purple-500 text-sm" />
                </div>
                <div>
                  <h4 className="font-semibold">Vagas Limitadas</h4>
                  <p>Apenas os {MAX_PARTICIPANTS} primeiros podem resgatar.</p>
                  <p className="text-yellow-600 mt-1">
                    {availableSlots > 0 ? 
                      `${availableSlots} vagas restantes!` : 
                      "Todas as vagas preenchidas!"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 p-1 rounded-lg mr-2">
                  <FaMoneyBillWave className="text-green-500 text-sm" />
                </div>
                <div>
                  <h4 className="font-semibold">Conversão</h4>
                  <p>1 moeda = 1MT. {MAX_COINS} moedas = {MAX_COINS}MT.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300 shadow-md text-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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