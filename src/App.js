import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
            setUserData(snapshot.val());
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

  // ProtectedRoute component to handle authentication
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    return children;
  };

  // Layout component to conditionally render header and footer
  const Layout = ({ children }) => {
    const location = useLocation();
    const isAuthPage = location.pathname === '/auth';

    return (
      <>
        {!isAuthPage && <Header user={user} />}
        <div className="App flex flex-col min-h-screen" style={{ marginBottom: !isAuthPage ? '5%' : '0' }}>
          {children}
        </div>
        {!isAuthPage && user && <BottomMenu />}
      </>
    );
  };

  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
            <Route 
              path="/perfil" 
              element={
                <ProtectedRoute>
                  <Profile user={userData} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/camp" 
              element={
                <ProtectedRoute>
                  <NotAllowed />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rewards" 
              element={
                <ProtectedRoute>
                  <Rewards user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/campaign" 
              element={
                <ProtectedRoute>
                  <Campaign />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cc" 
              element={
                <ProtectedRoute>
                  <CreateChallenge />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/explore" 
              element={
                <ProtectedRoute>
                  <ExploreChallenges challenges={challenges} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/campaign/:id" 
              element={
                <ProtectedRoute>
                  <CampaignDetails user={userData} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/campaign/:campaignId/post/:postId" 
              element={
                <ProtectedRoute>
                  <PostDetails user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;