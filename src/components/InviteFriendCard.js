import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaSms, FaLink, FaInfoCircle } from "react-icons/fa";
import { auth } from "../fb";
import { getDatabase, ref, get, child, update } from "firebase/database";
import { useNavigate } from "react-router-dom";

const InviteFriendCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [invitedFriendsCount, setInvitedFriendsCount] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);
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
        alert("Recompensa resgatada com sucesso!");
        setRewardClaimed(true);
      } catch (error) {
        console.error("Erro ao resgatar a recompensa:", error);
        alert("Houve um erro ao resgatar sua recompensa.");
      }
    } else if (rewardClaimed) {
      alert("Você já resgatou sua recompensa.");
    } else {
      alert("Você precisa convidar pelo menos 20 amigos para resgatar a recompensa.");
    }
  };

  const inviteLink = user ? `https://votsnap.vercel.app/auth?ref=${user.uid}` : "#";

  const handleShareClick = () => {
    if (!user) {
      alert("Por favor, faça login para compartilhar seu link de convite.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCopyLink = () => {
    if (user) {
      navigator.clipboard.writeText(inviteLink);
      alert("Link copiado para a área de transferência!");
    } else {
      alert("Por favor, faça login para copiar o link.");
    }
  };

  const handleViewFriends = () => {
    navigate("/invited-friends");
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm mx-auto relative">
      {/* Info icon button */}
      <button 
        onClick={() => setIsInfoModalOpen(true)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        aria-label="Informações sobre o desafio"
      >
        <FaInfoCircle size={20} />
      </button>

      <h2 className="text-lg font-semibold text-gray-800 text-center mb-4">Convide 20 Amigos</h2>
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-700">{invitedFriendsCount}</span>
          <span className="block text-sm text-gray-500">Amigos Convidados</span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-700">50MT</span>
          <span className="block text-sm text-gray-500">Dinheiro</span>
        </div>
      </div>
      <div className="space-y-4">
        <button
          onClick={handleShareClick}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
        >
          Convidar Amigos
        </button>
        <button
          onClick={handleViewFriends}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-300"
        >
          Ver Amigos Convidados
        </button>
        {!rewardClaimed && invitedFriendsCount >= 20 && (
          <button
            onClick={handleClaimReward}
            className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
          >
            Resgatar Recompensa
          </button>
        )}
      </div>

      {/* Share Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xs">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Compartilhar Convite</h3>
            <div className="space-y-3">
              <a
                href={`https://wa.me/?text=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-green-500 hover:text-green-600"
              >
                <FaWhatsapp size={20} />
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
              >
                <FaFacebook size={20} />
                <span>Facebook</span>
              </a>
              <a
                href={`mailto:?subject=Convite%20para%20se%20cadastrar%20no%20app&body=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                className="flex items-center space-x-2 text-red-500 hover:text-red-600"
              >
                <FaEnvelope size={20} />
                <span>Email</span>
              </a>
              <a
                href={`sms:?&body=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
              >
                <FaSms size={20} />
                <span>SMS</span>
              </a>
              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-800"
              >
                <FaLink size={20} />
                <span>Copiar Link</span>
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xs">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Sobre o Desafio</h3>
            <div className="text-gray-600 space-y-3">
              <p>
                <strong>Duração:</strong> Este desafio tem duração de 1 semana.
              </p>
              <p>
                <strong>Premiação:</strong> Serão premiados os primeiros 10 usuários que atingirem a marca de 20 amigos convidados.
              </p>
              <p>
                <strong>Recompensa:</strong> Cada um dos 10 primeiros receberá 50MT em dinheiro.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                O prêmio será creditado automaticamente na sua conta assim que você atingir a marca e clicar em "Resgatar Recompensa".
              </p>
            </div>
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteFriendCard;