import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaEnvelope, FaSms, FaLink } from "react-icons/fa";
import { auth } from "../fb"; 
import { getDatabase, ref, get, child, update } from "firebase/database";
import { useNavigate } from "react-router-dom"; 

const InviteFriendCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
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

    setIsSharing(true);

    if (navigator.share) {
      navigator
        .share({
          title: "Convide seus amigos",
          text: "Cadastre-se no aplicativo usando este link:",
          url: inviteLink,
        })
        .then(() => {
          setIsSharing(false);
        })
        .catch((error) => {
          console.error("Erro ao compartilhar:", error);
          alert("Não foi possível compartilhar o link.");
          setIsSharing(false);
        });
    } else {
      setIsModalOpen(true);
      setIsSharing(false);
    }
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
    <div className="bg-white shadow-lg rounded-lg p-6 w-full mx-auto">
      <h2 className="text-xl font-bold text-gray-800 text-center mb-4">Convide Amigos</h2>
      <div className="flex items-center justify-between mb-6">
        <div className="text-gray-600 text-center">
          <span className="block font-bold text-blue-500">{invitedFriendsCount}</span>
          <span className="block font-bold text-sm">Amigos</span>
        </div>
        <div className="bg-blue-100 rounded-full p-4 flex items-center justify-center shadow-md">
          <svg
            className="w-12 h-12 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 8h10M7 12h8m-8 4h6m1-6h.01M3 5h18v14H3V5z"
            ></path>
          </svg>
        </div>
        <div className="text-gray-600 text-center">
          <span className="block font-bold text-blue-500">1GB</span>
          <span className="block font-bold text-sm">Vodacom</span>
        </div>
      </div>
   <div className="flex flex-col sm:flex-row justify-between gap-4">
        <button
          onClick={handleShareClick}
          className={`w-full sm:w-auto flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300 transform hover:scale-105 ${
            isSharing ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isSharing}>
          {isSharing ? "Compartilhando..." : "Convidar Amigos"}
        </button>
        <button
          onClick={handleViewFriends}
          className="w-full sm:w-auto flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition duration-300 transform hover:scale-105">
          Ver Amigos Convidados
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Compartilhar Convite</h3>
            <div className="flex flex-col space-y-4">
              <a
                href={`https://wa.me/?text=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-start space-x-2 text-green-500 hover:underline hover:text-green-600">
                <FaWhatsapp size={24} />
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${inviteLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-start space-x-2 text-blue-600 hover:underline hover:text-blue-700"
              >
                <FaFacebook size={24} />
                <span>Facebook</span>
              </a>
              <a
                href={`mailto:?subject=Convite%20para%20se%20cadastrar%20no%20app&body=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                className="flex items-center justify-start space-x-2 text-red-500 hover:underline hover:text-red-600"
              >
                <FaEnvelope size={24} />
                <span>Email</span>
              </a>
              <a
                href={`sms:?&body=Cadastre-se%20no%20app%20usando%20este%20link:%20${inviteLink}`}
                className="flex items-center justify-start space-x-2 text-blue-500 hover:underline hover:text-blue-600"
              >
                <FaSms size={24} />
                <span>SMS</span>
              </a>
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-start space-x-2 text-gray-700 hover:underline hover:text-gray-800"
              >
                <FaLink size={24} />
                <span>Copiar Link</span>
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteFriendCard;
