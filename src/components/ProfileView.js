import React, { useEffect, useState, useRef } from 'react';
import { 
  VerifiedRounded, 
  Share, 
  MoreHoriz, 
  CameraAlt, 
  Close,
  Instagram, 
  Facebook, 
  Twitter,
} from '@mui/icons-material';
import { auth, db, storage } from '../fb';
import { onValue, ref } from 'firebase/database';
import { useNavigate, useParams } from 'react-router-dom';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { FaTiktok } from 'react-icons/fa';
import { Trophy } from 'lucide-react';

const ProfileView = () => {
  const { uid } = useParams();
  const [activeTab, setActiveTab] = useState('participations');
  const [userData, setUserData] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isOwner = auth.currentUser?.uid === uid;

  // Load user data, participations, and achievements
  useEffect(() => {
    if (!uid) {
      navigate('/auth');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const userRef = ref(db, `users/${uid}`);
        const unsubscribeUser = onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          setUserData(data);

          // Set participations
          const participationsData = data?.participations || {};
          const participationsArray = Object.entries(participationsData).map(([id, participation]) => ({
            id,
            ...participation
          }));
          setParticipations(participationsArray);

          // Set achievements
          const achievementsData = data?.achievements || {};
          const achievementsArray = Object.entries(achievementsData).map(([id, achievement]) => ({
            id,
            ...achievement
          }));
          setAchievements(achievementsArray);
        });

        return () => unsubscribeUser();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, uid]);

  // Handle share profile
  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'VotaSnap',
        text: `Confira o perfil de ${userData?.displayName || 'Usuário'} no VotaSnap!`,
        url: window.location.href
      });
    } catch (err) {
      console.error('Share error:', err);
      navigator.clipboard.writeText(window.location.href);
      alert('Link do perfil copiado para a área de transferência!');
    }
  };

  const SocialIcon = ({ platform, username }) => {
    if (!username) return null;

    const icons = {
      instagram: <Instagram className="text-pink-600 w-6 h-6" />,
      facebook: <Facebook className="text-blue-600 w-6 h-6" />,
      twitter: <Twitter className="text-blue-400 w-6 h-6" />,
      tiktok: <FaTiktok className="text-black w-6 h-6" />
    };

    const links = {
      instagram: `https://instagram.com/${username}`,
      facebook: `https://facebook.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      tiktok: `https://tiktok.com/@${username}`
    };

    return (
      <a
        href={links[platform]}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition"
        title={platform}
        aria-label={`Visitar ${platform} de ${username}`}
      >
        {icons[platform]}
      </a>
    );
  };

  const ParticipationStatus = ({ status }) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      winner: 'bg-purple-100 text-purple-800'
    };

    const statusText = {
      pending: 'Em Revisão',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      winner: 'Vencedor'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusText[status] || status}
      </span>
    );
  };

  const ProfileHeader = () => (
    <div className="relative">
      <div
        className="h-48 w-full bg-gradient-to-r from-purple-500 to-blue-500"
        style={{
          backgroundImage: userData?.coverPhoto ? `url(${userData.coverPhoto})` : '',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute top-32 left-4 md:left-8">
        <div className="relative">
          <img
            src={userData?.profilepic || 'https://via.placeholder.com/150'}
            alt={userData?.displayName || 'Profile'}
            className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md"
          />
          {userData?.verified && (
            <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full">
              <VerifiedRounded style={{ color: 'green', fontSize: '20px' }} />
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-36 right-4 md:right-8">
        <button
          onClick={handleShare}
          className="bg-white text-blue-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
          aria-label="Compartilhar perfil"
        >
          <Share fontSize="small" />
          <span className="hidden sm:inline text-sm">Compartilhar</span>
        </button>
      </div>
    </div>
  );

  const ProfileInfo = () => (
    <div className="mt-16 px-4 md:px-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {userData?.displayName || 'Usuário'}
              {userData?.verified && (
                <VerifiedRounded style={{ color: 'green', fontSize: '20px', marginLeft: '4px' }} />
              )}
            </h1>
            <p className="text-gray-600">@{userData?.username || 'user'}</p>
          </div>
        </div>
        {userData?.bio && (
          <p className="mt-3 text-gray-600">{userData.bio}</p>
        )}
        <div className="mt-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-5 w-5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Localização</p>
              <p className="text-sm text-gray-500">
                {userData?.city || 'Cidade não informada'}, {userData?.province || 'Província não informada'}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 h-5 w-5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Data de Inscrição</p>
              <p className="text-sm text-gray-500">
                {userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                }) : 'Data não informada'}
              </p>
            </div>
          </div>
        </div>
        {(userData?.social?.instagram || userData?.social?.tiktok || userData?.social?.facebook || userData?.social?.twitter) && (
          <div className="flex space-x-4 mt-4">
            <SocialIcon platform="instagram" username={userData?.social?.instagram} />
            <SocialIcon platform="tiktok" username={userData?.social?.tiktok} />
            <SocialIcon platform="facebook" username={userData?.social?.facebook} />
            <SocialIcon platform="twitter" username={userData?.social?.twitter} />
          </div>
        )}
      </div>
    </div>
  );

  const ParticipationsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {participations.map(participation => (
        <div key={participation.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition">
          <div className="relative h-48 bg-gray-100">
            {participation.imageUrl && (
              <img
                src={participation.imageUrl}
                alt={participation.caption || 'Participação'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
              />
            )}
            <div className="absolute top-2 right-2">
              {participation.status && <ParticipationStatus status={participation.status} />}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg line-clamp-1">{participation.challengeTitle}</h3>
            {participation.caption && (
              <p className="text-gray-600 mt-2 line-clamp-2">{participation.caption}</p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {new Date(participation.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {participation.brandName && (
                <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                  {participation.brandName}
                </span>
              )}
            </div>
            <a
              href={`/challenges/${participation.id}/${participation.participationId}`}
              className="mt-2 inline-block text-purple-600 hover:underline text-sm"
            >
              Ver Participação
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  const AchievementsTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Vitórias</h2>
      {achievements.length > 0 ? (
        <div className="space-y-4">
          {achievements.map(achievement => (
            <div key={achievement.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <div className="flex items-start space-x-4">
                {userData?.profilepic && (
                  <img
                    src={userData.profilepic}
                    alt="Avatar do usuário"
                    className="w-16 h-16 rounded-full object-cover border border-purple-200"
                  />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center">
                        <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                        {achievement.challengeTitle}
                      </h3>
                      <p className="text-gray-600">Prêmio: {achievement.prize}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      achievement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      achievement.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {achievement.status === 'pending' ? 'Pendente' :
                       achievement.status === 'delivered' ? 'Entregue' : 'Não Resgatado'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Vencido em: {new Date(achievement.wonAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500 text-lg">Nenhuma vitória ainda</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-8">
      <ProfileHeader />
      <ProfileInfo />

      <div className="mt-6 px-4 md:px-8">
        <div className="border-b">
          <div className="flex justify-around">
            {['participations', 'achievements'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-sm font-medium relative ${
                  activeTab === tab
                    ? 'text-purple-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-purple-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'participations' && 'Participações'}
                {tab === 'achievements' && 'Vitórias'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'participations' && participations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">Sem participações</div>
              </div>
            ) : (
              activeTab === 'participations' && <ParticipationsTab />
            )}
            {activeTab === 'achievements' && <AchievementsTab />}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileView;