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
  const navigate = useNavigate();

  const COINS_PER_FRIEND = 2;
  const MAX_COINS = 100; // 100 moedas = 50 amigos
  const MAX_PARTICIPANTS = 10;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      


      if (currentUser) {
        setLoading(true);
        try {
          // First check if user already has coins saved
          const dbRef = ref(getDatabase());
          const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));
          
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
      const snapshot = await get(child(dbRef, `users`));
      if (snapshot.exists()) {
        let count = 0;
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().referrer === uid) {
            count++;
          }
        });
        setInvitedFriendsCount(count);
        const coins = count * COINS_PER_FRIEND;
        setTotalCoins(coins);
        
        // Update user's coins in their profile
        await updateUserCoins(user.uid, coins);
        
        // Check if reached max coins
        if (coins >= MAX_COINS && !challengeCompleted) {
          await markChallengeAsCompleted(uid, count);
        }
      }
    } catch (error) {
      console.error("Erro ao contar amigos convidados:", error);
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
    const challengeRef = ref(db, `challenges/${uid}`);
    
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
    return coins; // 1 moeda = 1MT
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg rounded-2xl p-6 w-full max-w-sm mx-auto relative overflow-hidden flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6 mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg rounded-2xl p-6 w-full max-w-sm mx-auto relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded-xl shadow-2xl text-center animate-bounce">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-green-600">Parabéns!</h3>
            <p className="text-gray-700">Você resgatou sua recompensa de {rewardAmount}MT!</p>
          </div>
        </div>
      )}

      {challengeCompleted && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center z-10">
          <FaCheckCircle className="mr-1" />
          <span className="text-xs font-bold">Concluído!</span>
        </div>
      )}

      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mr-6 -mt-6"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-100 rounded-full -ml-4 -mb-4"></div>

      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={24} />
      </button>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2 flex items-center justify-center">
          <FaCoins className="mr-2 text-yellow-500" /> Desafio de Moedas
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Cada amigo vale 2 moedas! Junte {MAX_COINS} moedas (50 amigos) e troque por dinheiro.
          <br />
          <span className="text-sm text-yellow-600 font-medium">
            {availableSlots > 0 ? (
              `${availableSlots} vagas restantes para os ${MAX_PARTICIPANTS} primeiros!`
            ) : (
              "Todas as vagas já foram preenchidas!"
            )}
          </span>
        </p>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{totalCoins} de {MAX_COINS} moedas</span>
            <span>{Math.floor(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-blue-500 mb-1">
              <FaUsers size={20} />
            </div>
            <span className="block text-xl font-bold text-gray-700">{invitedFriendsCount}</span>
            <span className="block text-xs text-gray-500">Amigos Convidados</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-yellow-500 mb-1">
              <FaCoins size={20} />
            </div>
            <span className="block text-xl font-bold text-gray-700">{totalCoins}</span>
            <span className="block text-xs text-gray-500">Moedas</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm flex-1 text-center">
            <div className="flex items-center justify-center text-green-500 mb-1">
              <FaMoneyBillWave size={20} />
            </div>
            <span className="block text-xl font-bold text-gray-700">
              {rewardStatus === "completed" ? rewardAmount : 0}MT
            </span>
            <span className="block text-xs text-gray-500">Recompensa</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShareClick}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition duration-300 shadow-md flex items-center justify-center"
          >
            <FaUsers className="mr-2" />
            Convidar Amigos
          </button>
          
          <button
            onClick={handleViewFriends}
            className="w-full bg-white text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition duration-300 border border-gray-200 shadow-sm flex items-center justify-center"
          >
            <FaLink className="mr-2" />
            Ver Amigos Convidados
          </button>
          
          {rewardStatus === "pending" ? (
            <div className="text-center py-2 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100">
              ⏳ Sua recompensa está pendente. Aguarde!
            </div>
          ) : rewardStatus === "completed" ? (
            <div className="text-center py-2 bg-green-50 text-green-700 rounded-xl border border-green-100">
              ✅ Recompensa de {rewardAmount}MT recebida com sucesso!
            </div>
          ) : canRequestReward() ? (
            <button
              onClick={handleRequestReward}
              className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-3 rounded-xl hover:from-green-500 hover:to-green-700 transition duration-300 shadow-md flex items-center justify-center animate-pulse"
            >
              <FaGift className="mr-2" />
              Solicitar Recompensa ({totalCoins}MT)
            </button>
          ) : totalCoins >= MAX_COINS && availableSlots <= 0 ? (
            <div className="text-center py-2 bg-red-50 text-red-700 rounded-xl border border-red-100">
              😔 Todas as vagas já foram preenchidas
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Compartilhar Convite</h3>
            <p className="text-center text-gray-600 mb-6">
              Cada amigo que se cadastrar vale 2 moedas para você!
            </p>
            
            <div className="space-y-4">
              <ShareButton 
                icon={<FaWhatsapp size={24} className="text-green-500" />}
                text="WhatsApp"
                onClick={() => window.open(`https://wa.me/?text=Participe%20do%20Desafio%20VotaSnap!%20Cada%20cadastro%20vale%202%20moedas!%20Use%20meu%20link:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaFacebook size={24} className="text-blue-600" />}
                text="Facebook"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaEnvelope size={24} className="text-red-500" />}
                text="Email"
                onClick={() => window.open(`mailto:?subject=Participe%20do%20Desafio%20VotaSnap!&body=Olá!%20Cadastre-se%20usando%20meu%20link%20e%20me%20ajude%20a%20ganhar%20moedas:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaSms size={24} className="text-blue-400" />}
                text="SMS"
                onClick={() => window.open(`sms:?&body=Participe%20do%20Desafio%20VotaSnap!%20Cadastre-se%20com%20meu%20link:%20${inviteLink}`, '_blank')}
              />
              
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-200"
              >
                <FaLink size={24} className="text-gray-700" />
                <span className="text-gray-700 font-medium">
                  {copied ? "Link Copiado!" : "Copiar Link"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Recompensa */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Solicitar Recompensa de {totalCoins}MT
            </h3>
            
            <div className="mb-4">
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-center">
                <FaCrown className="inline-block mr-2" />
                <strong>Você está entre os {MAX_PARTICIPANTS} primeiros!</strong>
              </div>
              
              <p className="text-gray-600 mb-4">
                Parabéns! Você juntou {totalCoins} moedas (convites de {invitedFriendsCount} amigos) e pode receber {totalCoins}MT.
              </p>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Como deseja receber o valor?
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Nº M-Pesa, conta bancária, etc."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe os detalhes para recebimento
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitRewardRequest}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Confirmar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center flex items-center justify-center">
              <FaInfoCircle className="mr-2 text-blue-500" /> Desafio de Moedas
            </h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <FaUsers className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Como funciona?</h4>
                  <p className="text-sm">Cada amigo que se cadastrar usando seu link exclusivo vale 2 moedas para você.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <FaCoins className="text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Meta de Moedas</h4>
                  <p className="text-sm">Junte {MAX_COINS} moedas (50 amigos convidados) para poder trocar por dinheiro.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <FaCrown className="text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Premiação Limitada</h4>
                  <p className="text-sm">Apenas os {MAX_PARTICIPANTS} primeiros usuários que atingirem {MAX_COINS} moedas podem resgatar.</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {availableSlots > 0 ? 
                      `${availableSlots} vagas ainda disponíveis!` : 
                      "Todas as vagas já foram preenchidas!"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <FaMoneyBillWave className="text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Conversão</h4>
                  <p className="text-sm">1 moeda = 1MT. Ao atingir {MAX_COINS} moedas, você pode trocar por {MAX_COINS}MT.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="mt-6 w-full bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition duration-300 shadow-md"
            >
              Entendi, vamos lá!
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
    className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition duration-200 border border-gray-200"
  >
    {icon}
    <span className="text-gray-700 font-medium">{text}</span>
  </button>
);

export default InviteFriendCard;