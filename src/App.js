import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './fb';
import { ref, get, onValue, set } from 'firebase/database';

// Components
import Auth from './components/Auth';
import HomePage from './components/Home';
import Profile from './components/Profile';
import Rewards from './components/Rewards';
import NotAllowed from './components/NotAllowed';
import Header from './components/Header';
import BottomMenu from './components/Bottom';
import CompleteProfileModal from './components/CompleteProfileModal';
import logo from './img/logo.png';
import CreateChallengeForm from './components/CreateChallengeForm';
import ParticipationsPage from './components/ParticipationsPage';
import PostDetail from './components/PostDetail';
import InvitedFriends from './components/InvitedFriends';
import UserList from './components/InviteX';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  // Check auth state and user profile completion
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserData(userData);
            
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
          minHeight: '100vh'
        }}>
          {children}
        </div>
        {!isAuthPage && user && <BottomMenu />}
      </>
    );
  };

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#0f0c29] to-[#24243e] overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-white bg-opacity-10"
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 15 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>

        {/* Loading content */}
        <div className="relative z-10 text-center px-4 max-w-md">
          {/* Spinner */}
          <div className="mx-auto mb-8 w-20 h-20 border-4 border-white border-opacity-20 border-t-cyan-400 rounded-full animate-spin">
          </div>
          
          {/* Loading text */}
          <h1 className="text-3xl font-bold text-white mb-4">
            <span className="animate-pulse">A carregar</span>
          </h1>
          
          {/* Progress bar */}
          <div className="w-full bg-white bg-opacity-10 h-1.5 rounded-full overflow-hidden mb-6">
            <div 
              className="bg-cyan-400 h-full rounded-full animate-progress"
              style={{
                width: '65%',
                animation: 'progress 1.5s ease-in-out infinite alternate'
              }}
            />
          </div>
          
          {/* Status message */}
          <p className="text-white text-opacity-70 text-sm">
           Por favor aguarde...
          </p>
        </div>

        {/* Animation styles */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
            50% { transform: translateY(-15px) translateX(5px); opacity: 1; }
          }
          @keyframes progress {
            0% { width: 30%; }
            100% { width: 80%; }
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
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage user={user} userData={userData} />
            </ProtectedRoute>
          } />

          
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile user={user} userData={userData} />
            </ProtectedRoute>
          } />
          
          <Route path="/rewards" element={
            <ProtectedRoute requireAgeVerification>
              <Rewards user={user} userData={userData} />
            </ProtectedRoute>
          } />
          <Route path="/invites" element={
            <ProtectedRoute requireAgeVerification>
              <InvitedFriends user={user} userData={userData} />
            </ProtectedRoute>
          } />
          
          <Route path="/not-allowed" element={<NotAllowed />} />
          <Route path="/cc" element={<CreateChallengeForm />} />
          <Route path="/wex" element={<UserList />} />
          <Route path="/explore" element={<ParticipationsPage />} />
          <Route path="/p/:challengeId/:id" element={<PostDetail userData={userData}/>} />
          <Route path="/challenges/:challengeId" element={<ParticipationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/admin">
          <Route index element={<AdminDashboard />} />
        </Route>
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;