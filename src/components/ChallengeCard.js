import React, { useState, useEffect } from 'react';
import { Share2, Zap, Award, Heart, Users, Image, Video, Check } from 'lucide-react';
import { db } from '../fb';
import { ref, get } from 'firebase/database';
import { Link } from 'react-router-dom';

const ChallengeCard = ({ challenge, user, onParticipateClick, onShareClick }) => {
  const [participationStatus, setParticipationStatus] = useState('loading');

  useEffect(() => {
    const checkParticipationStatus = async () => {
      if (user) {
        try {
          const userParticipationRef = ref(db, `users/${user.uid}/participations/${challenge.id}`);
          const snapshot = await get(userParticipationRef);
          setParticipationStatus(snapshot.exists() ? 'participated' : 'can_participate');
        } catch (error) {
          console.error("Erro ao verificar status:", error);
          setParticipationStatus('error');
        }
      } else {
        setParticipationStatus('can_participate');
      }
    };

    checkParticipationStatus();
  }, [user, challenge.id]);

  const renderParticipateButton = () => {
    if (participationStatus === 'participated') {
      return (
        <button 
          className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex-1 cursor-default flex items-center justify-center"
        >
          <Check className="w-5 h-5 mr-2" /> Participando
        </button>
      );
    }
    
    return (
      <button 
        onClick={() => onParticipateClick(challenge)}
        className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 rounded-lg flex-1 hover:from-pink-600 hover:to-blue-600 transition flex items-center justify-center shadow-md hover:shadow-lg"
      >
        Participar Agora
      </button>
    );
  };

  return (
    <div className="border pb-20 bg-gray-50 min-h-screen rounded-2xl overflow-hidden hover:shadow-lg transition duration-300 bg-white">
      <div className="relative h-48 bg-gradient-to-br from-pink-100 to-blue-100">
        <img 
          src={challenge.coverImage} 
          alt={challenge.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex items-center">
          <img 
            src={challenge.brand?.logo || 'https://via.placeholder.com/40'} 
            alt={challenge.brand.name} 
            className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-md"
          />
          <span className="ml-2 font-medium text-white bg-gradient-to-r from-pink-500 to-blue-500 px-3 py-1 rounded-full text-sm flex items-center">
            {challenge.brand.name}
            {challenge.brand.verified && (
              <svg className="w-4 h-4 inline ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.47 1.89-3.2 3.61-.82-.34-3.7L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
              </svg>
            )}
          </span>
        </div>
        <div className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1 text-sm font-medium flex items-center shadow-sm">
          {challenge.type === 'photo' ? (
            <>
              <Image className="w-4 h-4 mr-1 text-pink-500" /> Foto
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-1 text-blue-500" /> Vídeo
            </>
          )}
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-xl font-bold mb-2 text-gray-800">{challenge.title}</h3>
        <p className="text-gray-600 mb-4">{challenge.description}</p>
        
        <div className="flex justify-between items-center mb-4">
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <Award className="w-4 h-4 mr-1" /> {challenge.prize}
          </div>
          <div className="text-gray-500 text-sm flex items-center">
            <Zap className="w-4 h-4 mr-1" /> {challenge.deadlineDays} dias restantes
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="text-gray-500 flex items-center">
            <Users className="w-4 h-4 mr-1" /> {challenge.participants} participantes
          </div>
          <div className="flex space-x-3">
            <span className="flex items-center text-gray-500">
              <Heart className="w-4 h-4 mr-1 text-pink-500" /> {challenge.interaction.split(' ')[0]}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-3 mb-3">
          {renderParticipateButton()}
          <button 
            onClick={() => onShareClick(challenge)}
            className="border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center shadow-sm"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <Link
          to={`/challenges/${challenge.id}`}
          className="w-full py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition flex items-center justify-center"
        >
          <Users className="w-4 h-4 mr-2" /> Ver Participações
        </Link>
      </div>
    </div>
  );
};

export default ChallengeCard;