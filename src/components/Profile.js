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
} from '@mui/icons-material';
import { auth, db, storage } from '../fb';
import { onValue, ref, remove, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { FaTiktok } from 'react-icons/fa';
import { Trophy } from 'lucide-react';

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
  const [redeemForm, setRedeemForm] = useState({ achievementId: null, contact: '' });
  const [redeemLoading, setRedeemLoading] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const navigate = useNavigate();

  // Validate email or phone format
  const validateContact = (contact) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{9,15}$/;
    return emailRegex.test(contact) || phoneRegex.test(contact);
  };

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

  // Handle redeem achievement
  const handleRedeemAchievement = async (achievementId) => {
    if (!redeemForm.contact.trim()) {
      alert('Por favor, insira seu contato para resgatar a recompensa.');
      return;
    }

    if (!validateContact(redeemForm.contact)) {
      alert('Por favor, insira um e-mail ou número de telefone válido.');
      return;
    }

    try {
      setRedeemLoading(true);
      await update(ref(db, `users/${user.uid}/achievements/${achievementId}`), {
        redeemContact: redeemForm.contact,
        redeemRequestedAt: new Date().toISOString(),
        status: 'pending'
      });
      alert('Solicitação de resgate enviada com sucesso!');
      setRedeemForm({ achievementId: null, contact: '' });
    } catch (error) {
      console.error('Error redeeming achievement:', error);
      alert('Erro ao solicitar resgate. Tente novamente.');
    } finally {
      setRedeemLoading(false);
    }
  };

  // Components
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
          <div className="mt-3 text-sm text-gray-500">
            <p><strong>Cidade:</strong> {userData?.city || 'Não informado'}</p>
            <p><strong>Província:</strong> {userData?.province || 'Não informado'}</p>
            <p><strong>Data de Inscrição:</strong> {userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('pt-BR') : 'Não informado'}</p>
            <p><strong>Nível:</strong> {userData?.level || 1}</p>
            <p><strong>Pontos:</strong> {userData?.points || 0}</p>
            <p><strong>Moedas:</strong> {userData?.coins || 0}</p>
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

  const AchievementsTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Minhas Vitórias</h2>
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
                    {achievement.participationId && (
                      <p className="text-sm mt-1">
                        Post ID: <a
                          href={`/challenges/${achievement.id}/${achievement.participationId}`}
                          className="text-purple-600 hover:underline"
                          aria-label={`Ver post ${achievement.participationId}`}
                        >
                          {achievement.participationId}
                        </a>
                      </p>
                    )}
                  </div>
                  {achievement.status !== 'delivered' && (
                    <div className="mt-3">
                      {redeemForm.achievementId === achievement.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={redeemForm.contact}
                            onChange={(e) => setRedeemForm(prev => ({ ...prev, contact: e.target.value }))}
                            placeholder="Digite seu e-mail ou telefone"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            aria-label="Contato para resgate"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setRedeemForm({ achievementId: null, contact: '' })}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100 transition"
                              aria-label="Cancelar resgate"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleRedeemAchievement(achievement.id)}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50"
                              disabled={redeemLoading || !redeemForm.contact.trim()}
                              aria-label="Confirmar resgate"
                            >
                              {redeemLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                              ) : (
                                'Confirmar'
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRedeemForm({ achievementId: achievement.id, contact: userData?.email || '' })}
                          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                          aria-label={`Resgatar prêmio de ${achievement.challengeTitle}`}
                        >
                          Resgatar Prêmio
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500 text-lg mb-4">Nenhuma vitória ainda</div>
          <button
            onClick={() => navigate('/challenges')}
            className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition"
            aria-label="Procurar desafios"
          >
            Procurar Desafios
          </button>
        </div>
      )}
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
    </div>
  );
};

export default Profile;