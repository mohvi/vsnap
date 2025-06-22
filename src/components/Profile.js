import React, { useEffect, useState } from 'react';
import { VerifiedRounded, Share, Logout, MoreHoriz } from "@mui/icons-material";
import { auth, db } from '../fb';
import { onValue, ref } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const Profile = ({ user }) => {
    const [activeTab, setActiveTab] = useState('videos');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            setUserData(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate, user]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/auth');
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'VotaSnap',
                text: `Confira o perfil de ${userData?.displayName} no VotaSnap!`,
                url: window.location.href,
            });
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
            // Fallback para copiar link
            navigator.clipboard.writeText(window.location.href);
            alert('Link do perfil copiado para a área de transferência!');
        }
    };

    const renderPosts = () => {
        if (!userData?.posts) return <div className="text-center text-gray-500 mt-6">Nenhum post publicado ainda.</div>;
        
        return Object.entries(userData.posts).map(([postId, post]) => (
            <div key={postId} className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 border border-gray-100">
                <img
                    src={post.photoUrl}
                    alt={post.caption}
                    className="w-full h-64 object-cover"
                    loading="lazy"
                />
                <div className="p-4">
                    <h2 className="text-lg font-semibold line-clamp-2">{post.caption}</h2>
                    <div className="flex justify-between mt-3 text-sm text-gray-500">
                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                        <div className="flex space-x-4">
                            <span>{Object.keys(post.likes || {}).length} curtidas</span>
                            <span>{post.comments ? Object.keys(post.comments).length : 0} comentários</span>
                        </div>
                    </div>
                </div>
            </div>
        ));
    };

    const renderRewards = () => {
        if (!userData?.rewards) return <div className="text-center text-gray-500 mt-6">Nenhuma recompensa ganha ainda.</div>;
        
        return Object.entries(userData.rewards).map(([rewardId, reward]) => (
            <div key={rewardId} className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-semibold">{reward.campaignTitle}</h2>
                        <p className="text-gray-600 mt-1">{reward.premio}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reward.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        reward.status === 'entregue' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {reward.status}
                    </span>
                </div>
                {reward.post && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">Post relacionado:</p>
                        <p className="font-medium line-clamp-2">{reward.post.caption}</p>
                    </div>
                )}
            </div>
        ));
    };

    const renderContent = () => {
        if (loading) return <div className="text-center py-8">Carregando...</div>;

        switch (activeTab) {
            case 'videos':
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold mb-4">Meus Posts</h2>
                        {renderPosts()}
                    </div>
                );
            case 'liked':
                return <div className="text-center py-8 text-gray-500">Nenhum conteúdo curtido ainda.</div>;
            case 'private':
                return <div className="text-center py-8 text-gray-500">Nenhum conteúdo privado ainda.</div>;
            case 'rewards':
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold mb-4">Minhas Recompensas</h2>
                        {renderRewards()}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading && !userData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen pb-8">
            {/* Cabeçalho do perfil */}
            <div className="relative">
                <div className="h-48 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                
                <div className="absolute top-32 left-4">
                    <div className="relative">
                        <img
                            src={userData?.profilepic || "https://via.placeholder.com/150"}
                            alt="Profile"
                            className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md"
                        />
                        {userData?.verified && (
                            <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full">
                                <VerifiedRounded style={{ color: 'green', fontSize: '20px' }} />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="absolute top-36 right-4 flex space-x-2">
                    <button 
                        onClick={handleShare}
                        className="bg-white text-blue-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
                    >
                        <Share fontSize="small" />
                        <span className="text-sm">Partilhar</span>
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="bg-white text-red-500 px-4 py-2 rounded-full flex items-center space-x-2 shadow-md hover:bg-gray-50 transition"
                    >
                        <Logout fontSize="small" />
                        <span className="text-sm">Sair</span>
                    </button>
                </div>
            </div>
            <div className="mt-16 px-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center">
                            {userData?.verified && <VerifiedRounded style={{ color: 'green', marginLeft: '4px' }} />}
                        </h1>
                        <p className="text-gray-600">@{userData?.username || 'usuário'}</p>
                    </div>
                    <button className="text-gray-500">
                        <MoreHoriz />
                    </button>
                </div>
                <p className="mt-2 text-gray-600">{userData?.bio || 'Sem biografia'}</p>
            </div>
            {/* Abas de navegação */}
            <div className="border-b mt-6">
                <div className="flex justify-around">
                    {['videos', 'liked', 'private', 'rewards'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 text-sm font-medium relative ${
                                activeTab === tab 
                                    ? 'text-purple-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-purple-500' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab === 'videos' && 'Vídeos'}
                            {tab === 'liked' && 'Curtidos'}
                            {tab === 'private' && 'Privados'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-4 py-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default Profile;