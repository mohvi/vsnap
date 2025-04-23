import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaSms, FaLink, FaInfoCircle, FaGift, FaUsers, FaTrophy } from "react-icons/fa";
import { auth } from "../fb";
import { getDatabase, ref, get, child, update } from "firebase/database";
import { useNavigate } from "react-router-dom";

const InviteFriendCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [invitedFriendsCount, setInvitedFriendsCount] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        fetchInvitedFriendsCount(currentUser.uid);
        checkRewardStatus(currentUser.uid);
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
      }
    } catch (error) {
      console.error("Erro ao contar amigos convidados:", error);
    }
  };

  const checkRewardStatus = async (uid) => {
    const dbRef = ref(getDatabase());
    try {
      const snapshot = await get(child(dbRef, `users/${uid}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setRewardClaimed(userData.rewardClaimed || false);
      }
    } catch (error) {
      console.error("Erro ao verificar status da recompensa:", error);
    }
  };

  const handleClaimReward = async () => {
    if (invitedFriendsCount >= 20 && !rewardClaimed) {
      try {
        const dbRef = ref(getDatabase(), `users/${user.uid}`);
        await update(dbRef, { rewardClaimed: true });
        setRewardClaimed(true);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      } catch (error) {
        console.error("Erro ao resgatar a recompensa:", error);
      }
    }
  };

  const inviteLink = user ? `https://votasnap.vercel.app/auth?ref=${user.uid}` : "#";

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
    return Math.min(100, (invitedFriendsCount / 20) * 100);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg rounded-2xl p-6 w-full max-w-sm mx-auto relative overflow-hidden">
      {/* Celebration effect */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded-xl shadow-2xl text-center animate-bounce">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-green-600">Parabéns!</h3>
            <p className="text-gray-700">Você resgatou sua recompensa de 50MT!</p>
          </div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mr-6 -mt-6"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-100 rounded-full -ml-4 -mb-4"></div>

      {/* Info icon button */}
      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={24} />
      </button>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2 flex items-center justify-center">
          <FaGift className="mr-2 text-yellow-500" /> Desafio de Convites
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Convide amigos e ganhe <span className="font-bold text-purple-600">50MT</span>!
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{invitedFriendsCount} de 20 amigos</span>
            <span>{Math.floor(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Stats cards */}
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
              <FaTrophy size={20} />
            </div>
            <span className="block text-xl font-bold text-gray-700">50MT</span>
            <span className="block text-xs text-gray-500">Sua Recompensa</span>
          </div>
        </div>

        {/* Buttons */}
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
          
          {!rewardClaimed && invitedFriendsCount >= 20 && (
            <button
              onClick={handleClaimReward}
              className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-3 rounded-xl hover:from-green-500 hover:to-green-700 transition duration-300 shadow-md flex items-center justify-center animate-pulse"
            >
              <FaGift className="mr-2" />
              Resgatar Recompensa!
            </button>
          )}

          {rewardClaimed && (
            <div className="text-center py-2 bg-green-50 text-green-700 rounded-xl border border-green-100">
              🎉 Recompensa resgatada com sucesso!
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
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
              Compartilhe seu link exclusivo e ganhe recompensas!
            </p>
            
            <div className="space-y-4">
              <ShareButton 
                icon={<FaWhatsapp size={24} className="text-green-500" />}
                text="WhatsApp"
                onClick={() => window.open(`https://wa.me/?text=Cadastre-se%20no%20VotSnap%20e%20ganhe%20recompensas!%20Use%20meu%20link:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaFacebook size={24} className="text-blue-600" />}
                text="Facebook"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaEnvelope size={24} className="text-red-500" />}
                text="Email"
                onClick={() => window.open(`mailto:?subject=Junte-se%20a%20mim%20no%20VotSnap!&body=Olá!%20Cadastre-se%20no%20VotSnap%20usando%20meu%20link%20e%20ganhe%20recompensas:%20${inviteLink}`, '_blank')}
              />
              
              <ShareButton 
                icon={<FaSms size={24} className="text-blue-400" />}
                text="SMS"
                onClick={() => window.open(`sms:?&body=Cadastre-se%20no%20VotSnap:%20${inviteLink}`, '_blank')}
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

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center flex items-center justify-center">
              <FaInfoCircle className="mr-2 text-blue-500" /> Sobre o Desafio
            </h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <FaUsers className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Como funciona?</h4>
                  <p className="text-sm">Convide amigos usando seu link exclusivo. Cada amigo que se cadastrar conta para seu total.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <FaTrophy className="text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Premiação</h4>
                  <p className="text-sm">Os primeiros 10 usuários que convidarem 20 amigos ganham 50MT cada!</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <FaGift className="text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold">Recompensa</h4>
                  <p className="text-sm">Quando atingir 20 convites, clique em "Resgatar Recompensa" para receber seu prêmio.</p>
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