import React, { useEffect, useState, useRef } from 'react';
import { 
  VerifiedRounded, 
  Share, 
  Logout, 
  MoreHoriz, 
  Delete, 
  Edit, 
  Instagram, 
  Facebook, 
  Twitter, 
  CameraAlt, 
  Close,
  CheckCircle,
  Payment,
  LocalAtm
} from '@mui/icons-material';
import { auth, db, storage } from '../fb';
import { onValue, ref, remove, update, push } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { FaTiktok } from 'react-icons/fa';
import { Trophy, Gift, CreditCard, Banknote } from 'lucide-react';

const Profile = ({ user }) => {
  const [activeTab, setActiveTab] = useState('participations');
  const [userData, setUserData] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    twitter: ''
  });
  const [uploading, setUploading] = useState({
    profilePic: false,
    coverPhoto: false
  });
  const [showSocialInputs, setShowSocialInputs] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    contact: '',
    accountNumber: '',
    mpesaName: ''
  });
  const [redeemLoading, setRedeemLoading] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const navigate = useNavigate();

  // Load user data, participations, and achievements
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const userRef = ref(db, `users/${user.uid}`);
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

          // Update profile form
          if (data) {
            setProfileForm({
              displayName: data.displayName || '',
              username: data.username || '',
              bio: data.bio || '',
              instagram: data.social?.instagram || '',
              tiktok: data.social?.tiktok || '',
              facebook: data.social?.facebook || '',
              twitter: data.social?.twitter || ''
            });
          }
        });

        return () => unsubscribeUser();
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Erro ao carregar dados do perfil. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, user]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Erro ao fazer logout. Tente novamente.');
    }
  };

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

  // Handle delete participation
  const handleDeleteParticipation = async (participation) => {
    if (!user || !participation?.id) return;

    if (!window.confirm('Tem certeza que deseja excluir esta participação?')) return;

    try {
      const participationRef = ref(db, `users/${user.uid}/participations/${participation.id}`);
      await remove(participationRef);
      alert('Participação excluída com sucesso.');
    } catch (error) {
      console.error('Error deleting participation:', error);
      alert('Erro ao excluir participação. Tente novamente.');
    }
  };

  // Handle profile edit
  const handleProfileEdit = () => {
    setIsEditingProfile(true);
  };

  // Handle profile form changes
  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: name === 'bio' ? value.slice(0, 150) : value
    }));
  };

  // Save profile changes
  const saveProfileChanges = async () => {
    try {
      if (!profileForm.displayName.trim() || !profileForm.username.trim()) {
        alert('Nome e username são obrigatórios.');
        return;
      }

      const updates = {
        displayName: profileForm.displayName.trim(),
        username: profileForm.username.trim(),
        bio: profileForm.bio.trim(),
        social: {
          instagram: profileForm.instagram.trim(),
          tiktok: profileForm.tiktok.trim(),
          facebook: profileForm.facebook.trim(),
          twitter: profileForm.twitter.trim()
        }
      };

      await update(ref(db, `users/${user.uid}`), updates);
      setIsEditingProfile(false);
      setShowSocialInputs(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Tente novamente.');
    }
  };

  // Handle file upload
  const uploadFile = async (file, path) => {
    const fileRef = storageRef(storage, `${path}/${user.uid}/${uuidv4()}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  // Handle profile picture upload
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, profilePic: true }));
      const url = await uploadFile(file, 'profilePics');
      await update(ref(db, `users/${user.uid}`), { profilepic: url });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Erro ao atualizar foto de perfil.');
    } finally {
      setUploading(prev => ({ ...prev, profilePic: false }));
    }
  };

  // Handle cover photo upload
  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, coverPhoto: true }));
      const url = await uploadFile(file, 'coverPhotos');
      await update(ref(db, `users/${user.uid}`), { coverPhoto: url });
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      alert('Erro ao atualizar foto de capa.');
    } finally {
      setUploading(prev => ({ ...prev, coverPhoto: false }));
    }
  };

  // Trigger file input
  const triggerFileInput = (type) => {
    if (type === 'profile') {
      fileInputRef.current.click();
    } else {
      coverInputRef.current.click();
    }
  };

  // Handle redeem prize
  const handleRedeemPrize = async () => {
    if (!selectedAchievement) return;
    
    // Basic validation
    if (!paymentMethod) {
      alert('Por favor, selecione um método de pagamento');
      return;
    }
    
    if (!paymentDetails.contact.trim()) {
      alert('Por favor, informe seu contato');
      return;
    }
    
    if (paymentMethod === 'bank' && !paymentDetails.accountNumber.trim()) {
      alert('Por favor, informe o número da conta bancária');
      return;
    }
    
    if (paymentMethod === 'mpesa' && !paymentDetails.mpesaName.trim()) {
      alert('Por favor, informe o nome associado ao M-Pesa');
      return;
    }

    try {
      setRedeemLoading(true);
      
      // Extract numeric value from prize
      const prizeValue = selectedAchievement.prize.match(/\d+/)?.[0] || '0';
      
      // Create payment record
      const paymentRef = push(ref(db, 'payments'));
      await update(paymentRef, {
        userId: user.uid,
        achievementId: selectedAchievement.id,
        amount: parseInt(prizeValue),
        method: paymentMethod,
        contact: paymentDetails.contact,
        accountNumber: paymentMethod === 'bank' ? paymentDetails.accountNumber : null,
        mpesaName: paymentMethod === 'mpesa' ? paymentDetails.mpesaName : null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      // Update achievement status
      await update(ref(db, `users/${user.uid}/achievements/${selectedAchievement.id}`), {
        redeemStatus: 'payment_pending',
        redeemRequestedAt: new Date().toISOString(),
        paymentId: paymentRef.key
      });
      
      alert('Solicitação de resgate enviada com sucesso! Aguarde o processamento.');
      setRedeemModalOpen(false);
      setSelectedAchievement(null);
      setPaymentMethod('');
      setPaymentDetails({
        contact: '',
        accountNumber: '',
        mpesaName: ''
      });
    } catch (error) {
      console.error('Erro ao solicitar resgate:', error);
      alert('Erro ao solicitar resgate. Tente novamente.');
    } finally {
      setRedeemLoading(false);
    }
  };

  // Social Icon Component
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

  // Participation Status Component
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

  // Achievement Card Component
  const AchievementCard = ({ achievement }) => {
    const getStatusInfo = () => {
      switch(achievement.redeemStatus || achievement.status) {
        case 'payment_pending':
          return {
            text: 'Pagamento Pendente',
            color: 'bg-blue-100 text-blue-800',
            icon: <Payment className="text-blue-500" />
          };
        case 'paid':
          return {
            text: 'Prêmio Pago',
            color: 'bg-green-100 text-green-800',
            icon: <CheckCircle className="text-green-500" />
          };
        case 'delivered':
          return {
            text: 'Entregue',
            color: 'bg-purple-100 text-purple-800',
            icon: <Gift className="text-purple-500" />
          };
        default:
          return {
            text: 'Não Resgatado',
            color: 'bg-gray-100 text-gray-800',
            icon: <Trophy className="text-gray-500" />
          };
      }
    };

    const statusInfo = getStatusInfo();

    return (
      <div key={achievement.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 p-3 bg-yellow-50 rounded-full">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {achievement.challengeTitle}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.text}</span>
              </span>
            </div>
            
            <div className="mt-2 flex items-center">
              <Banknote className="w-4 h-4 text-gray-400 mr-1" />
              <p className="text-sm font-medium text-gray-600">
                Prêmio: <span className="text-green-600">{achievement.prize}</span>
              </p>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Conquistado em:</span> {new Date(achievement.wonAt).toLocaleDateString('pt-BR')}
              </p>
              
              {achievement.redeemRequestedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">Solicitado em:</span> {new Date(achievement.redeemRequestedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            
            {achievement.redeemStatus !== 'paid' && achievement.redeemStatus !== 'delivered' && (
              <button
                onClick={() => {
                  setSelectedAchievement(achievement);
                  setRedeemModalOpen(true);
                }}
                className="mt-4 w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 px-4 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition flex items-center justify-center"
                disabled={achievement.redeemStatus === 'payment_pending'}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {achievement.redeemStatus === 'payment_pending' ? 'Pagamento em Processo' : 'Resgatar Prêmio'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Profile Header Component
  const ProfileHeader = () => (
    <div className="relative">
      <div
        className="h-48 w-full bg-gradient-to-r from-purple-500 to-blue-500"
        style={{
          backgroundImage: userData?.coverPhoto ? `url(${userData.coverPhoto})` : '',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {isEditingProfile && (
          <button
            onClick={() => triggerFileInput('cover')}
            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
            disabled={uploading.coverPhoto}
            aria-label="Alterar foto de capa"
          >
            {uploading.coverPhoto ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <CameraAlt fontSize="small" />
            )}
          </button>
        )}
      </div>
      <div className="absolute top-32 left-4 md:left-8">
        <div className="relative">
          <img
            src={userData?.profilepic || 'https://via.placeholder.com/150'}
            alt={userData?.displayName || 'Profile'}
            className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md"
          />
          {isEditingProfile && (
            <button
              onClick={() => triggerFileInput('profile')}
              className="absolute bottom-0 right-0 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
              disabled={uploading.profilePic}
              aria-label="Alterar foto de perfil"
            >
              {uploading.profilePic ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <CameraAlt fontSize="small" />
              )}
            </button>
          )}
          {userData?.verified && (
            <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full">
              <VerifiedRounded style={{ color: 'green', fontSize: '20px' }} />
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-36 right-4 md:right-8 flex space-x-2">
        <button
          onClick={handleShare}
          className="bg-white text-blue-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
          aria-label="Compartilhar perfil"
        >
          <Share fontSize="small" />
          <span className="hidden sm:inline text-sm">Compartilhar</span>
        </button>
        {!isEditingProfile ? (
          <button
            onClick={handleProfileEdit}
            className="bg-white text-purple-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
            aria-label="Editar perfil"
          >
            <Edit fontSize="small" />
            <span className="hidden sm:inline text-sm">Editar</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditingProfile(false)}
            className="bg-white text-red-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
            aria-label="Fechar edição"
          >
            <Close fontSize="small" />
            <span className="hidden sm:inline text-sm">Fechar</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="bg-white text-red-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
          aria-label="Sair"
        >
          <Logout fontSize="small" />
          <span className="hidden sm:inline text-sm">Sair</span>
        </button>
      </div>
    </div>
  );

  // Profile Info Component
  const ProfileInfo = () => (
    <div className="mt-16 px-4 md:px-8">
      {isEditingProfile ? (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold">Editar Perfil</h2>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              id="displayName"
              type="text"
              name="displayName"
              value={profileForm.displayName}
              onChange={handleProfileFormChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={profileForm.username}
              onChange={handleProfileFormChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={profileForm.bio}
              onChange={handleProfileFormChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="3"
              maxLength="150"
              placeholder="Conte sobre você..."
              aria-describedby="bio-length"
            />
            <p id="bio-length" className="text-xs text-gray-500 mt-1">{profileForm.bio.length}/150 Caracteres</p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setShowSocialInputs(!showSocialInputs)}
              className="text-purple-600 text-sm font-medium flex items-center space-x-1"
              aria-expanded={showSocialInputs}
              aria-controls="social-inputs"
            >
              <span>{showSocialInputs ? 'Fechar Redes Sociais' : 'Adicionar Redes Sociais'}</span>
              <svg
                className={`w-4 h-4 transform transition ${showSocialInputs ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSocialInputs && (
              <div id="social-inputs" className="mt-3 space-y-3">
                {[
                  { name: 'instagram', icon: <Instagram className="text-pink-600 w-6 h-6" />, placeholder: 'ex: seuusername' },
                  { name: 'tiktok', icon: <FaTiktok className="text-black w-6 h-6" />, placeholder: 'ex: seuusername' },
                  { name: 'facebook', icon: <Facebook className="text-blue-600 w-6 h-6" />, placeholder: 'ex: seuusername' },
                  { name: 'twitter', icon: <Twitter className="text-blue-400 w-6 h-6" />, placeholder: 'ex: seuusername' }
                ].map(({ name, icon, placeholder }) => (
                  <div key={name} className="flex items-center space-x-2">
                    {icon}
                    <input
                      type="text"
                      name={name}
                      placeholder={placeholder}
                      value={profileForm[name]}
                      onChange={handleProfileFormChange}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      aria-label={`Username do ${name}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setIsEditingProfile(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
              aria-label="Cancelar edição"
            >
              Cancelar
            </button>
            <button
              onClick={saveProfileChanges}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              aria-label="Salvar alterações"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
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
            <button className="text-gray-500 hover:text-gray-700" aria-label="Mais opções">
              <MoreHoriz />
            </button>
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
          {(profileForm.instagram || profileForm.tiktok || profileForm.facebook || profileForm.twitter) && (
            <div className="flex space-x-4 mt-4">
              <SocialIcon platform="instagram" username={profileForm.instagram} />
              <SocialIcon platform="tiktok" username={profileForm.tiktok} />
              <SocialIcon platform="facebook" username={profileForm.facebook} />
              <SocialIcon platform="twitter" username={profileForm.twitter} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Participations Tab Component
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
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg line-clamp-1">{participation.challengeTitle}</h3>
              <button
                onClick={() => handleDeleteParticipation(participation)}
                className="text-gray-400 hover:text-red-500 transition"
                title="Excluir participação"
                aria-label="Excluir participação"
              >
                <Delete fontSize="small" />
              </button>
            </div>
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
              aria-label={`Ver participação ${participation.challengeTitle}`}
            >
              Ver Participação
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  // Achievements Tab Component
  const AchievementsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
        <div className="flex items-center">
          <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Minhas Vitórias</h2>
            <p className="text-gray-600">Aqui estão todos os prêmios que você conquistou</p>
          </div>
        </div>
      </div>
      
      {achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma vitória ainda</h3>
          <p className="text-gray-500 mb-6">Participe de desafios e apareça aqui quando vencer!</p>
          <button
            onClick={() => navigate('/challenges')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-md"
          >
            Explorar Desafios
          </button>
        </div>
      )}
    </div>
  );

  // Redeem Modal Component
  const RedeemModal = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${redeemModalOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Resgatar Prêmio
            </h3>
            <button
              onClick={() => {
                setRedeemModalOpen(false);
                setSelectedAchievement(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <Close />
            </button>
          </div>
          
          {selectedAchievement && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                <h4 className="font-medium">{selectedAchievement.challengeTitle}</h4>
              </div>
              <div className="mt-2 flex items-center">
                <Banknote className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-semibold text-green-600">{selectedAchievement.prize}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`p-3 border rounded-lg flex flex-col items-center ${
                    paymentMethod === 'mpesa' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <LocalAtm className="w-6 h-6 text-green-500 mb-1" />
                  <span className="text-sm">M-Pesa</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`p-3 border rounded-lg flex flex-col items-center ${
                    paymentMethod === 'bank' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-blue-500 mb-1" />
                  <span className="text-sm">Transferência Bancária</span>
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                Contato (WhatsApp/Email)
              </label>
              <input
                id="contact"
                type="text"
                value={paymentDetails.contact}
                onChange={(e) => setPaymentDetails({...paymentDetails, contact: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="+258 84 123 4567 ou email@exemplo.com"
              />
            </div>
            
            {paymentMethod === 'bank' && (
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta Bancária
                </label>
                <input
                  id="accountNumber"
                  type="text"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => setPaymentDetails({...paymentDetails, accountNumber: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="123456789"
                />
              </div>
            )}
            
            {paymentMethod === 'mpesa' && (
              <div>
                <label htmlFor="mpesaName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome no M-Pesa
                </label>
                <input
                  id="mpesaName"
                  type="text"
                  value={paymentDetails.mpesaName}
                  onChange={(e) => setPaymentDetails({...paymentDetails, mpesaName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Seu Nome"
                />
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setRedeemModalOpen(false);
                setSelectedAchievement(null);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleRedeemPrize}
              disabled={redeemLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center disabled:opacity-50"
            >
              {redeemLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-1" />
                  Solicitar Resgate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-8">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProfilePicUpload}
        accept="image/*"
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverPhotoUpload}
        accept="image/*"
        className="hidden"
        aria-hidden="true"
      />

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
                aria-selected={activeTab === tab}
                role="tab"
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
                <div className="text-gray-500 text-lg mb-4">Sem participações</div>
                <button
                  onClick={() => navigate('/challenges')}
                  className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition"
                  aria-label="Procurar desafios"
                >
                  Procurar Desafios
                </button>
              </div>
            ) : (
              activeTab === 'participations' && <ParticipationsTab />
            )}
            {activeTab === 'achievements' && <AchievementsTab />}
          </>
        )}
      </div>

      <RedeemModal />
    </div>
  );
};

export default Profile;