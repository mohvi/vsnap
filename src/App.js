import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Campaign from './components/Campaign';
import Header from './components/Header';
import { ThemeProvider } from './context/ThemeContext';
import Profile from './components/Profile';
import { auth, db } from './fb'; 
import BottomMenu from './components/Bottom';
import Rewards from './components/Rewards';
import PostDetails from './components/PostDetails';
import CampaignDetails from './components/Campaign';
import NotAllowed from './components/NotAllowed';
import ExploreChallenges from './components/ExploreChallenges';
import { ref, get } from 'firebase/database';
import CreateChallenge from './components/CreateChallenge';
import HomePage from './components/Home';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);  
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const userRef = ref(db, 'users/' + user.uid);  
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const data = snapshot.val();  
            console.log(data)

            console.log('Dados do usuário:', data);
            setUserData(data);  
          } else {
            console.log('Usuário não encontrado no Realtime Database');
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      };

      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const challengesRef = ref(db, 'challenges');
        const snapshot = await get(challengesRef);

        if (snapshot.exists()) {
          const challengesData = snapshot.val();
          const formattedChallenges = Object.entries(challengesData).map(([id, challenge]) => ({
            id,
            ...challenge,
          }));

          console.log('Challenges:', formattedChallenges);
          setChallenges(formattedChallenges);
        } else {
          console.log('Nenhum desafio encontrado.');
        }
      } catch (error) {
        console.error('Erro ao buscar desafios:', error);
      }
    };

    fetchChallenges();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <Header />
        <div className="App flex flex-col min-h-screen" style={{ marginBottom: '5%' }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/perfil" element={<Profile user={userData} />} />
            <Route path="/camp" element={<NotAllowed user={userData} />} />
            <Route path="/rewards" element={<Rewards user={user} />} />
            <Route path="/campaign" element={<Campaign />} />
            <Route path="/cc" element={<CreateChallenge />} />
            <Route path="/explore" element={<ExploreChallenges challenges={challenges} />} />            
            <Route path="/campaign/:id" element={<CampaignDetails user={userData} />} />
            <Route path="/campaign/:campaignId/post/:postId" element={<PostDetails user={user} />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
        <BottomMenu />
      </Router>
    </ThemeProvider>
  );
}

export default App;
