import React, { useEffect, useState } from 'react';
import { VerifiedRounded, Share, Logout, MoreHoriz } from "@mui/icons-material";
import { auth, db } from '../fb';
import { onValue, ref } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const Profile = ({user}) => {
    const [activeTab, setActiveTab] = useState('videos');
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            const userRef = ref(db, `users/${user.uid}`);
            onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                setUserData(data);
                console.log(data);
            });
        } else {
            navigate('/auth');
            console.log("Utilizador não autenticado");
        }
    }, [navigate, user]);

    const handleLogout = () => {
        auth.signOut().then(() => {
            navigate('/auth');
        }).catch((error) => {
            console.error("Erro ao sair:", error);
        });
    };

    const handleShare = () => {
        const shareData = {
            title: 'VotaSnap',
            text: 'Veja meu perfil no VotaSnap!',
            url: window.location.href,
        };
        try {
            navigator.share(shareData);
        } catch (err) {
            console.error('Erro ao partilhar', err);
        }
    };

    const renderPosts = () => {
        const posts = userData?.posts || {};
        return Object.keys(posts).map((postId) => {
            const post = posts[postId];
            return (
                <div key={postId} className="bg-white rounded-md shadow-md p-4 mb-4">
                    <img
                        src={post.photoUrl}
                        alt={post.caption}
                        className="w-full h-64 object-cover rounded-md"
                    />
                    <h2 className="mt-2 text-lg font-bold">{post.caption}</h2>
                    <p className="text-gray-500">Curtidas: {Object.keys(post.likes || {}).length}</p>
                    <p className="text-gray-500">Comentários: {post.comments ? Object.keys(post.comments).length : 0}</p>
                </div>
            );
        });
    };

    const renderRewards = () => {
        const rewards = userData?.rewards || {};
        return Object.keys(rewards).map((rewardId) => {
            const reward = rewards[rewardId];
            return (
                <div key={rewardId} className="bg-white rounded-md shadow-md p-4 mb-4">
                    <h2 className="text-lg font-bold">{reward.campaiTitle}</h2>
                    <p className="text-gray-500">Prémio: {reward.premio}</p>
                    <p className="text-gray-500">Status: {reward.status}</p>
                    <p className="text-gray-500">Post relacionado: {reward.post?.caption}</p>
                </div>
            );
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'videos':
                return (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Posts</h2>
                        {renderPosts()}
                    </div>
                );
            case 'liked':
                return <div className="text-center text-gray-500 mt-6">Nenhum vídeo curtido ainda.</div>;
            case 'private':
                return <div className="text-center text-gray-500 mt-6">Nenhum vídeo privado ainda.</div>;
            case 'rewards':
                return (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Recompensas</h2>
                        {renderRewards()}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="bg-white min-h-screen">
                <div className="relative">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="absolute top-32 left-4">
                        <img
                            src={userData?.profilepic || "https://via.placeholder.com/150"}
                            alt="Profile"
                            className="w-32 h-32 rounded-full border-4 border-white object-cover"
                        />
                    </div>
                    <div className="absolute top-36 right-4 flex space-x-2">
                        <button onClick={handleShare} className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                            <Share />
                            <span>Partilhar</span>
                        </button>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                            <Logout />
                            <span>Sair</span>
                        </button>
                        <button className="bg-gray-300 text-black px-4 py-2 rounded-full">
                            <MoreHoriz />
                        </button>
                    </div>
                </div>
                <div className="mt-16 px-4">
                    <h1 className="text-xl font-bold">
                        {userData?.displayName} <VerifiedRounded style={{color:'green'}}/>
                    </h1>
                    <p className="text-sm text-gray-600">{userData?.email}</p>
                    <div className="flex text-center space-x-4 mt-4">
                        <div>
                            <span className="font-bold">{Object.keys(userData?.rewards || {}).length}</span>
                            <p className="text-gray-600">Recompensas</p>
                        </div>
                        <div>
                            <span className="font-bold">{userData?.coinBalance || 0}</span>
                            <p className="text-gray-600">SnapCoins</p>
                        </div>
                        <div>
                            <span className="font-bold">{Object.keys(userData?.posts || {}).reduce((acc, postId) => acc + Object.keys(userData.posts[postId].likes || {}).length, 0)}</span>
                            <p className="text-gray-600">Curtidas</p>
                        </div>
                    </div>
                </div>
                <div className="border-t border-b mt-4">
                    <div className="flex justify-around">
                        <button
                            onClick={() => setActiveTab('videos')}
                            className={`py-2 px-4 ${activeTab === 'videos' ? 'border-b-2 border-black' : 'text-gray-500'}`}>
                            Vídeos
                        </button>
                        <button
                            onClick={() => setActiveTab('liked')}
                            className={`py-2 px-4 ${activeTab === 'liked' ? 'border-b-2 border-black' : 'text-gray-500'}`}>
                            Curtidos
                        </button>
                        <button
                            onClick={() => setActiveTab('private')}
                            className={`py-2 px-4 ${activeTab === 'private' ? 'border-b-2 border-black' : 'text-gray-500'}`}>
                            Privados
                        </button>
                        <button
                            onClick={() => setActiveTab('rewards')}
                            className={`py-2 px-4 ${activeTab === 'rewards' ? 'border-b-2 border-black' : 'text-gray-500'}`}>
                            Recompensas
                        </button>
                    </div>
                </div>
                <div className="px-4 py-4">
                    {renderContent()}
                </div>
            </div>
        </>
    );
};

export default Profile;
