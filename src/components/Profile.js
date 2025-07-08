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
  Close
} from "@mui/icons-material";
import { auth, db, storage } from '../fb';
import { onValue, ref, remove, update, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { FaTiktok } from 'react-icons/fa';

const Profile = ({ user }) => {
    const [activeTab, setActiveTab] = useState('participations');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participations, setParticipations] = useState([]);
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
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const navigate = useNavigate();

    // Load user data and participations
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
                    
                    const participationsData = data?.participations || {};
                    const participationsArray = Object.keys(participationsData).map(key => ({
                        id: key,
                        ...participationsData[key]
                    }));
                    
                    setParticipations(participationsArray);
                    
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
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, user]);
    
    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/auth');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'VotaSnap',
                text: `Check out ${userData?.displayName}'s profile on VotaSnap!`,
                url: window.location.href,
            });
        } catch (err) {
            console.error('Share error:', err);
            navigator.clipboard.writeText(window.location.href);
            alert('Profile link copied to clipboard!');
        }
    };

    const handleDeleteParticipation = async (participation) => {
        try {
            if (!user || !participation?.id) return;
            
            if (!window.confirm('Are you sure you want to delete this participation?')) {
                return;
            }
            
            const participationRef = ref(db, `users/${user.uid}/participations/${participation.id}`);
            await remove(participationRef);
            alert('Participation deleted successfully');
            
        } catch (error) {
            console.error('Error deleting participation:', error);
            alert('Failed to delete participation');
        }
    };

    const handleProfileEdit = () => {
        setIsEditingProfile(true);
    };

    const handleProfileFormChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const saveProfileChanges = async () => {
        try {
            const updates = {
                displayName: profileForm.displayName,
                username: profileForm.username,
                bio: profileForm.bio,
                social: {
                    instagram: profileForm.instagram,
                    tiktok: profileForm.tiktok,
                    facebook: profileForm.facebook,
                    twitter: profileForm.twitter
                }
            };

            await update(ref(db, `users/${user.uid}`), updates);
            setIsEditingProfile(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        }
    };

    const uploadFile = async (file, path) => {
        const fileRef = storageRef(storage, `${path}/${user.uid}/${uuidv4()}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(prev => ({ ...prev, profilePic: true }));
            const url = await uploadFile(file, 'profilePics');
            
            await update(ref(db, `users/${user.uid}`), {
                profilepic: url
            });
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error updating profile picture.');
        } finally {
            setUploading(prev => ({ ...prev, profilePic: false }));
        }
    };

    const handleCoverPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(prev => ({ ...prev, coverPhoto: true }));
            const url = await uploadFile(file, 'coverPhotos');
            
            await update(ref(db, `users/${user.uid}`), {
                coverPhoto: url
            });
        } catch (error) {
            console.error('Error uploading cover:', error);
            alert('Error updating cover photo.');
        } finally {
            setUploading(prev => ({ ...prev, coverPhoto: false }));
        }
    };

    const triggerFileInput = (type) => {
        if (type === 'profile') {
            fileInputRef.current.click();
        } else {
            coverInputRef.current.click();
        }
    };

    const renderSocialIcon = (platform, username) => {
        if (!username) return null;

        const icons = {
            instagram: <Instagram className="text-pink-600" />,
            facebook: <Facebook className="text-blue-600" />,
            twitter: <Twitter className="text-blue-400" />,
            tiktok: <FaTiktok className="text-black" />
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
            >
                {icons[platform]}
            </a>
        );
    };

    const renderParticipationStatus = (status) => {
        const statusStyles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            winner: 'bg-purple-100 text-purple-800'
        };

        const statusText = {
            pending: 'Under Review',
            approved: 'Approved',
            rejected: 'Rejected',
            winner: 'Winner'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusText[status] || status}
            </span>
        );
    };

    const renderParticipations = () => {
        if (loading) {
            return (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            );
        }

        if (participations.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">Sem participações</div>
                    <button 
                        onClick={() => navigate('/challenges')}
                        className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition">
                       Procurar desafios
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participations.map(participation => (
                    <div key={participation.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition">
                        <div className="relative h-48 bg-gray-100">
                            {participation.imageUrl && (
                                <img
                                    src={participation.imageUrl}
                                    alt={participation.caption || 'Participation'}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            )}
                            <div className="absolute top-2 right-2">
                                {participation.status && renderParticipationStatus(participation.status)}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg line-clamp-1">{participation.challengeTitle}</h3>
                                <button 
                                    onClick={() => handleDeleteParticipation(participation)}
                                    className="text-gray-400 hover:text-red-500 transition"
                                    title="Delete"
                                >
                                    <Delete fontSize="small" />
                                </button>
                            </div>
                            
                            {participation.caption && (
                                <p className="text-gray-600 mt-2 line-clamp-2">{participation.caption}</p>
                            )}
                            
                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm text-gray-500">
                                    {new Date(participation.createdAt).toLocaleDateString()}
                                </span>
                                {participation.brandName && (
                                    <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                        {participation.brandName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderVideos = () => {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">My Videos</h2>
                {userData?.videos ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(userData.videos).map(([videoId, video]) => (
                            <div key={videoId} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                                <div className="relative pt-[56.25%] bg-black">
                                    <video
                                        src={video.videoUrl}
                                        controls
                                        className="absolute top-0 left-0 w-full h-full object-contain"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold line-clamp-2">{video.title}</h3>
                                    <div className="flex justify-between mt-3 text-sm text-gray-500">
                                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                        <div className="flex space-x-4">
                                            <span>{video.views || 0} views</span>
                                            <span>{video.likes || 0} likes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">No videos uploaded yet.</div>
                        <button 
                            onClick={() => navigate('/upload')}
                            className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition"
                        >
                            Upload Your First Video
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderRewards = () => {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Minhas recompensas</h2>
                {userData?.rewards ? (
                    <div className="space-y-4">
                        {Object.entries(userData.rewards).map(([rewardId, reward]) => (
                            <div key={rewardId} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                                <div className="flex items-start space-x-4">
                                    {reward.badgeImage && (
                                        <img 
                                            src={reward.badgeImage} 
                                            alt="Reward badge" 
                                            className="w-16 h-16 object-contain"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold">{reward.title}</h3>
                                                <p className="text-gray-600">{reward.description}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                reward.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                reward.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {reward.status === 'pending' ? 'Pending' : 
                                                 reward.status === 'delivered' ? 'Delivered' : reward.status}
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-sm text-gray-500">Earned on: {new Date(reward.earnedDate).toLocaleDateString()}</p>
                                            {reward.challengeTitle && (
                                                <p className="text-sm mt-1">
                                                    From challenge: <span className="font-medium">{reward.challengeTitle}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">Sem recompensas</div>
                    </div>
                )}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'participations':
                return renderParticipations();
            case 'videos':
                return renderVideos();
            case 'rewards':
                return renderRewards();
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-8">
            {/* Hidden file inputs */}
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleProfilePicUpload}
                accept="image/*"
                className="hidden"
            />
            <input 
                type="file" 
                ref={coverInputRef}
                onChange={handleCoverPhotoUpload}
                accept="image/*"
                className="hidden"
            />

            {/* Cover Photo */}
            <div className="relative">
                <div 
                    className="h-48 w-full bg-gradient-to-r from-purple-500 to-blue-500 relative"
                    style={{ 
                        backgroundImage: userData?.coverPhoto ? `url(${userData.coverPhoto})` : '',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {isEditingProfile && (
                        <button
                            onClick={() => triggerFileInput('cover')}
                            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                            disabled={uploading.coverPhoto}
                        >
                            {uploading.coverPhoto ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                <CameraAlt />
                            )}
                        </button>
                    )}
                </div>
                
                {/* Profile Picture */}
                <div className="absolute top-32 left-4 md:left-8">
                    <div className="relative">
                        <div className="relative">
                            <img
                                src={userData?.profilepic || "https://via.placeholder.com/150"}
                                alt="Profile"
                                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md"
                            />
                            {isEditingProfile && (
                                <button
                                    onClick={() => triggerFileInput('profile')}
                                    className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                                    disabled={uploading.profilePic}
                                >
                                    {uploading.profilePic ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    ) : (
                                        <CameraAlt fontSize="small" />
                                    )}
                                </button>
                            )}
                        </div>
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
                    >
                        <Share fontSize="small" />
                        <span className="hidden sm:inline text-sm">Partilhar</span>
                    </button>
                    {!isEditingProfile ? (
                        <button 
                            onClick={handleProfileEdit}
                            className="bg-white text-purple-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
                        >
                            <Edit fontSize="small" />
                            <span className="hidden sm:inline text-sm">Editar</span>
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsEditingProfile(false)}
                            className="bg-white text-red-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
                        >
                            <Close fontSize="small" />
                            <span className="hidden sm:inline text-sm">Fechar</span>
                        </button>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="bg-white text-red-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
                    >
                        <Logout fontSize="small" />
                        <span className="hidden sm:inline text-sm">Sair</span>
                    </button>
                </div>
            </div>

            {/* Profile Info Section */}
            <div className="mt-16 px-4 md:px-8">
                {isEditingProfile ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                        <h2 className="text-xl font-bold mb-4">Editar</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input
                                type="text"
                                name="displayName"
                                value={profileForm.displayName}
                                onChange={handleProfileFormChange}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={profileForm.username}
                                onChange={handleProfileFormChange}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea
                                name="bio"
                                value={profileForm.bio}
                                onChange={handleProfileFormChange}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows="3"
                                maxLength="150"
                                placeholder="Tell us about yourself..."
                            />
                            <p className="text-xs text-gray-500 mt-1">{profileForm.bio.length}/150 Caracteres</p>
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={() => setShowSocialInputs(!showSocialInputs)}
                                className="text-purple-600 text-sm font-medium flex items-center space-x-1"
                            >
                                <span>{showSocialInputs ? 'Fechar' : 'Add redes sociais'}</span>
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
                                <div className="mt-3 space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Instagram className="text-pink-600" />
                                        <input
                                            type="text"
                                            name="instagram"
                                            placeholder="ex: yourusername"
                                            value={profileForm.instagram}
                                            onChange={handleProfileFormChange}
                                            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <FaTiktok className="text-black" />
                                        <input
                                            type="text"
                                            name="tiktok"
                                            placeholder="ex: yourusername"
                                            value={profileForm.tiktok}
                                            onChange={handleProfileFormChange}
                                            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Facebook className="text-blue-600" />
                                        <input
                                            type="text"
                                            name="facebook"
                                            placeholder="Facebook username"
                                            value={profileForm.facebook}
                                            onChange={handleProfileFormChange}
                                            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Twitter className="text-blue-400" />
                                        <input
                                            type="text"
                                            name="twitter"
                                            placeholder="Twitter/X username"
                                            value={profileForm.twitter}
                                            onChange={handleProfileFormChange}
                                            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => setIsEditingProfile(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveProfileChanges}
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
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
                                    {userData?.displayName || 'User'}
                                    {userData?.verified && (
                                        <VerifiedRounded style={{ color: 'green', fontSize: '20px', marginLeft: '4px' }} />
                                    )}
                                </h1>
                                <p className="text-gray-600">@{userData?.username || 'user'}</p>
                            </div>
                            <button className="text-gray-500 hover:text-gray-700">
                                <MoreHoriz />
                            </button>
                        </div>
                        
                        {userData?.bio && (
                            <p className="mt-3 text-gray-600">{userData.bio}</p>
                        )}
                        
                        {(profileForm.instagram || profileForm.tiktok || profileForm.facebook || profileForm.twitter) && (
                            <div className="flex space-x-4 mt-4">
                                {renderSocialIcon('instagram', profileForm.instagram)}
                                {renderSocialIcon('tiktok', profileForm.tiktok)}
                                {renderSocialIcon('facebook', profileForm.facebook)}
                                {renderSocialIcon('twitter', profileForm.twitter)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation tabs */}
            <div className="mt-6 px-4 md:px-8">
                <div className="border-b">
                    <div className="flex justify-around">
                        {['participations','rewards'].map((tab) => (
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
                                {tab === 'rewards' && 'Rewards'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-4 md:px-8 py-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default Profile;