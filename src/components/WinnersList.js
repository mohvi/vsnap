import React, { useEffect, useState } from "react";
import { FaTrophy, FaCrown, FaUser, FaUserPlus } from "react-icons/fa";
import { getDatabase, ref, get, set } from "firebase/database";
import { auth } from "../fb";
import confetti from "canvas-confetti";
import { v4 as uuidv4 } from "uuid";

const ActiveParticipantsRanking = () => {
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [winner, setWinner] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [challengeId] = useState('specialChallenge'); 

  useEffect(() => {
    const fetchActiveParticipants = async () => {
      try {
        const db = getDatabase();
        
        // Fetch referrals and users data
        const [referralsSnapshot, usersSnapshot] = await Promise.all([
          get(ref(db, 'referrals')),
          get(ref(db, 'users'))
        ]);
        
        const referralsData = referralsSnapshot.val() || {};
        const usersData = usersSnapshot.val() || {};

        // Create a map of users by username for quick lookup
        const usersByUsername = {};
        Object.entries(usersData).forEach(([uid, userData]) => {
          if (userData.username) {
            usersByUsername[userData.username] = { ...userData, uid };
          }
        });

        // Process participants and count referrals
        const participants = [];

        // Iterate through each referrer in referralsData
        for (const username in referralsData) {
          const referrals = referralsData[username];
          
          // Count all referrals for this user
          let referralCount = 0;
          if (referrals && typeof referrals === 'object') {
            referralCount = Object.keys(referrals).length;
          }

          if (referralCount > 0) {
            const user = usersByUsername[username];
            
            if (user) {
              participants.push({
                uid: user.uid,
                username,
                name: user.name || username,
                photoURL: user.profilepic || '',
                referralCount
              });
            } else {
              // If user not found, try to get UID from the first referral
              const firstReferral = Object.values(referrals)[0];
              const referralUid = firstReferral.referrerUid || null;
              
              participants.push({
                uid: referralUid || username, // Fallback to username if no UID found
                username,
                name: username,
                photoURL: '',
                referralCount
              });
            }
          }
        }

        // Sort by referral count (descending)
        participants.sort((a, b) => b.referralCount - a.referralCount);

        // Set winner if there are participants
        if (participants.length > 0) {
          const topParticipant = participants[0];
          setWinner(topParticipant);
          
          // Save winner to Firebase
         {/*
           await set(ref(db, `winners/${challengeId}`), {
            challengeId,
            uid: topParticipant.uid,
            username: topParticipant.username,
            name: topParticipant.name,
            referralCount: topParticipant.referralCount,
            timestamp: new Date().toISOString(),
            participantsCount: participants.length
          });
          */}

          // Check if current user is the winner
          if (auth.currentUser?.uid === topParticipant.uid) {
            setShowCelebration(true);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
            setTimeout(() => setShowCelebration(false), 5000);
          }
        }

        setActiveParticipants(participants);

      } catch (err) {
        console.error("Error fetching active participants:", err);
        setError("Não foi possível carregar o ranking");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveParticipants();
  }, [challengeId]);

  if (loading) {
    return (
      <div className="px-4 pb-4">
        <div className="mb-4 bg-gray-200 rounded-xl h-24 animate-pulse"></div>
        <div className="bg-gray-200 rounded-lg h-20 animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  if (activeParticipants.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FaUserPlus className="mx-auto mb-2 text-2xl" />
        <p>Nenhum participante com referências encontrado</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      {/* Celebration effect for winner */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 p-6 rounded-xl shadow-2xl text-center animate-bounce-in mx-4 border-2 border-yellow-300 max-w-md">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-2xl font-bold text-yellow-700 mb-2">PARABÉNS!</h3>
            <p className="text-lg text-yellow-800 mb-3">Você venceu o desafio com {winner?.referralCount} convites!</p>
          </div>
        </div>
      )}

      {/* Header for final result */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold flex items-center">
          <FaTrophy className="mr-2 text-yellow-500" /> Resultado Final
        </h2>
        <div className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
          {activeParticipants.length} participantes
        </div>
      </div>

      {/* Winner card */}
      <div className="mb-4 relative">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-4 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-600 text-white px-2 py-1 text-xs font-bold rounded-bl-lg">
            <FaCrown className="inline mr-1" /> VENCEDOR
          </div>
          
          <div className="flex items-center">
            <div className="relative mr-3">
              {winner.photoURL ? (
                <img 
                  src={winner.photoURL} 
                  alt={winner.username} 
                  className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.parentElement.innerHTML = (
                      <div className="w-14 h-14 rounded-full bg-yellow-200 border-2 border-white shadow-md flex items-center justify-center">
                        <FaUser className="text-yellow-600 text-xl" />
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-yellow-200 border-2 border-white shadow-md flex items-center justify-center">
                  <FaUser className="text-yellow-600 text-xl" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
                1º
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-white">{winner.name}</h3>
              <p className="text-yellow-100 text-sm">@{winner.username}</p>
              <div className="flex items-center mt-1">
                <FaUserPlus className="text-yellow-200 mr-1" />
                <span className="text-yellow-200 text-sm font-bold">
                  {winner.referralCount} convites
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveParticipantsRanking;