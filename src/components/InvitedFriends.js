import React, { useEffect, useState } from "react";
import { auth, db } from "../fb"; // Certifique-se de importar o auth e db corretamente
import { getDatabase, ref, get, child } from "firebase/database";
import { useNavigate } from "react-router-dom";

const InvitedFriends = () => {
  const [user, setUser] = useState(null);
  const [invitedFriends, setInvitedFriends] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        fetchInvitedFriends(currentUser.uid);
      } else {
        navigate("/auth"); // Redireciona para login se não estiver autenticado
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchInvitedFriends = async (uid) => {
    const dbRef = ref(getDatabase());
    try {
      const snapshot = await get(child(dbRef, `users`));
      if (snapshot.exists()) {
        const invited = [];
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.referrer === uid) {
            invited.push(userData);
          }
        });
        setInvitedFriends(invited);
      }
    } catch (error) {
      console.error("Erro ao buscar amigos convidados:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Amigos Convidados</h1>

      {invitedFriends.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {invitedFriends.map((friend, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={friend.profilepic || "https://via.placeholder.com/80"}
                  alt={friend.displayName}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{friend.displayName}</h2>
                  <p className="text-gray-600">{friend.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center text-lg">Você ainda não convidou nenhum amigo.</p>
      )}
    </div>
  );
};

export default InvitedFriends;