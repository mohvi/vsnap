import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './fb';
import { ref, get, onValue, set } from 'firebase/database';
import logo from './img/logo.png';
import Auth from './components/Auth';
import Profile from './components/Profile';
import Header from './components/Header';
import BottomMenu from './components/Bottom';
import CompleteProfileModal from './components/CompleteProfileModal';
import HomePage from './components/HomePage';
import CreateChallengeForm from './components/CreateChallengeForm';
import ChallengesList from './components/ChallengesList';
import UsersList from './components/UsersList';
import ModerationPanel from './components/ModerationPanel';


function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showSetContact, setShowSetContact] = useState(false);

  // Check auth state and user profile completion
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('Fetched user data:', userData);
            setUserData(userData);
            
            if(!userData.contacto){
              setShowSetContact(true);
            }

            // Show modal if profile is not marked as complete
            setShowCompleteProfile(userData.isComplete !== true);
          } else {
            // New user - show complete profile modal
            setShowCompleteProfile(true);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setShowCompleteProfile(false);
        }
      } else {
        // No user logged in
        setUserData(null);
        setShowCompleteProfile(false);
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time user data updates
  useEffect(() => {
    if (!user) return;

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserData(userData);
        
        // Update modal visibility based on isComplete
        setShowCompleteProfile(userData.isComplete !== true);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleProfileComplete = async (profileData) => {
    try {
      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        ...profileData,
        isComplete: true,  // Mark profile as complete
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        points: 0,
        level: 1,
        ageVerified: profileData.isOver13
      });
      setShowCompleteProfile(false);
    } catch (error) {
      console.error('Error completing profile:', error);
    }
  };

  // Route protection components
  const ProtectedRoute = ({ children, requireAgeVerification = false }) => {
    const location = useLocation();

    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (requireAgeVerification && (!userData || !userData.ageVerified)) {
      return <Navigate to="/not-allowed" replace />;
    }

    return children;
  };

  const AuthRoute = ({ children }) => {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // App layout wrapper
  const Layout = ({ children }) => {
    const location = useLocation();
    const isAuthPage = location.pathname === '/auth';

    return (
      <>
        {!isAuthPage && <Header user={user} userData={userData} />}
        <div className="App" style={{ 
          paddingBottom: !isAuthPage && user ? '80px' : '0',
          minHeight: '100vh',
          backgroundColor: '#000000'
        }}>
          {children}
        </div>
        {!isAuthPage && user && <BottomMenu />}
      </>
    );
  };

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden">
        {/* Animated background elements - TikTok style */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 10 + 2}px`,
                height: `${Math.random() * 10 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `linear-gradient(135deg, #ff286a ${Math.random() * 100}%, #ff8c5a)`,
                opacity: 0.15,
                animation: `floatTikTok ${Math.random() * 20 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Loading content - TikTok style */}
        <div className="relative z-10 text-center px-4 max-w-md">
          {/* Logo animado */}
          <div className="mx-auto mb-8 w-24 h-24 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff286a] to-[#ff8c5a] rounded-2xl rotate-3 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff286a] to-[#ff8c5a] rounded-2xl -rotate-3 animate-pulse animation-delay-150"></div>
            <div className="absolute inset-2 bg-black rounded-xl flex items-center justify-center">
              <span className="text-3xl font-bold bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] bg-clip-text text-transparent">
                <img src={logo} alt="Votansap Logo" className="w-12 h-12" />
              </span>
            </div>
          </div>
          
          {/* Loading text */}
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] bg-clip-text text-transparent animate-pulse">
              Votansap
            </span>
          </h1>
          
          {/* Progress bar - TikTok style */}
          <div className="w-full bg-[#2a2a2a] h-2 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full rounded-full animate-progressTikTok"
              style={{
                background: 'linear-gradient(90deg, #ff286a, #ff8c5a)',
                animation: 'progressTikTok 1.5s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Status message */}
          <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-[#ff286a] rounded-full animate-pulse"></span>
            A carregar...
            <span className="w-2 h-2 bg-[#ff8c5a] rounded-full animate-pulse"></span>
          </p>
        </div>

        {/* Animation styles */}
        <style jsx>{`
          @keyframes floatTikTok {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            33% { transform: translateY(-20px) translateX(10px) rotate(120deg); }
            66% { transform: translateY(10px) translateX(-10px) rotate(240deg); }
          }
          @keyframes progressTikTok {
            0% { width: 20%; opacity: 0.5; }
            50% { width: 80%; opacity: 1; }
            100% { width: 20%; opacity: 0.5; }
          }
          .animation-delay-150 {
            animation-delay: 150ms;
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      {/* Show complete profile modal if needed */}
      {showCompleteProfile && user && (
        <CompleteProfileModal 
          user={user}
          onComplete={handleProfileComplete}
          onCancel={() => {
            setShowCompleteProfile(false);
            auth.signOut();
          }}
        />
      )}
      
      {/* Main app layout */}
      <Layout>
        <Routes>
          {/* Authentication */}
          <Route path="/auth" element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          } />

          <Route path="/not-allowed" element={
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
              <h1 className="text-4xl font-bold mb-4">Acesso Negado</h1>
              <p className="text-lg mb-6">Desculpe, você não tem permissão para acessar esta página.</p>
              <button 
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
              >
                Voltar
              </button>
            </div>
          } />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage user={user} userData={userData} />
            </ProtectedRoute>
          } />

          <Route path="/cc" element={
              <CreateChallengeForm/>
          } />
           <Route path="/cl" element={
              <ChallengesList/>
          } />
          <Route path="/ul" element={
              <UsersList/>
          } />
           <Route path="/mc" element={
              <ModerationPanel/>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;