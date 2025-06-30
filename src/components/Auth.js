import React, { useState, useEffect, useCallback } from 'react';
import { Google, Facebook, ErrorOutline, Devices, Celebration, EmojiEvents, Stars } from '@mui/icons-material';
import { auth, googleProvider, facebookProvider } from '../fb';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim'; 
import logo from '../img/logo.png';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [error, setError] = useState(null);
  const [referrerUid, setReferrerUid] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const db = getDatabase();

  // Particles initialization
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refUid = params.get('ref');
    if (refUid) {
      setReferrerUid(refUid);
    }
  }, [location]);

  const saveUserData = async (user) => {
    try {
      const userRef = ref(db, 'users/' + user.uid);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        // Atualiza apenas a data de login se o usuário já existir
        await set(ref(db, `users/${user.uid}/loginDate`), new Date().toISOString());
        return;
      }

      const userData = {
        uid: user.uid,
        email: user.email,
        profilepic: user.photoURL,
        joinDate: new Date().toISOString(),
        loginDate: new Date().toISOString(),
        referrer: referrerUid || null,
        isComplete: false,
        coins: 0 // Adicionado campo coins padrão
      };

      await set(userRef, userData);
      
      if (referrerUid) {
        const referralRef = ref(db, `referrals/${referrerUid}/${user.uid}`);
        await set(referralRef, {
          date: new Date().toISOString(),
          newUserEmail: user.email,
          status: 'pending' // Adicionado status para rastreamento
        });
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const handleSignIn = async (provider, providerName) => {
    setIsLoading(true);
    setActiveProvider(providerName);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserData(result.user);
      navigate('/');
    } catch (error) {
      console.error(`Error signing in with ${providerName}:`, error);
      
      let errorTitle = 'Erro no login';
      let errorMessage = `Ocorreu um erro ao tentar entrar com ${providerName}. Por favor, tente novamente.`;
      let errorIcon = <ErrorOutline className="mr-2" />;

      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorTitle = 'Conta já registrada';
          errorMessage = 'Este e-mail já está associado a outra conta com outro método.';
          break;
        case 'auth/popup-closed-by-user':
          errorTitle = 'Janela fechada';
          errorMessage = 'Você fechou a janela de login antes de concluir. Tente novamente.';
          break;
        case 'auth/user-disabled':
          errorTitle = 'Conta desativada';
          errorMessage = 'Sua conta foi desativada. Entre em contato com o suporte.';
          break;
        case 'auth/network-request-failed':
          errorTitle = 'Problema de conexão';
          errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
          break;
        case 'auth/too-many-requests':
          errorTitle = 'Acesso temporariamente bloqueado';
          errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
          break;
        default:
          if (error.message === 'multi_device') {
            errorTitle = 'Sessão ativa';
            errorMessage = 'Você já está logado em outro dispositivo.';
            errorIcon = <Devices className="mr-2" />;
          }
      }

      setError({
        title: errorTitle,
        message: errorMessage,
        icon: errorIcon
      });
    } finally {
      setIsLoading(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 px-4 relative overflow-hidden">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fpsLimit: 60,
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: "repulse",
                },
                onClick: {
                  enable: true,
                  mode: "push",
                },
              },
              modes: {
                repulse: {
                  distance: 100,
                  duration: 0.4,
                },
                push: {
                  quantity: 4,
                },
              },
            },
            particles: {
              color: {
                value: ["#4F46E5", "#EC4899", "#10B981"],
              },
              links: {
                color: "#9CA3AF",
                distance: 150,
                enable: true,
                opacity: 0.3,
                width: 1,
              },
              collisions: {
                enable: true,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 60,
              },
              opacity: {
                value: 0.5,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 5 },
              },
            },
            detectRetina: true,
          }}
        />
      </div>

      <div 
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center transition-all duration-500 hover:shadow-2xl relative z-10 border-4 border-transparent hover:border-purple-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Effects */}
        {isHovered && (
          <>
            <Celebration className="absolute -top-4 -left-4 text-yellow-400 animate-bounce" />
            <Stars className="absolute -top-4 -right-4 text-pink-400 animate-pulse" />
            <EmojiEvents className="absolute -bottom-4 -left-4 text-blue-400 animate-spin-slow" />
          </>
        )}

        <img 
          src={logo} 
          alt="VotaSnap Logo" 
          className="w-40 mx-auto mb-6 hover:scale-110 transition-transform duration-500 transform hover:rotate-6" 
        />
        
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-3">
          Bem-vindo ao VotaSnap!
        </h1>
        <p className="text-lg text-gray-600 mb-8 font-medium">
          Entre agora e comece a ganhar recompensas incríveis! 🎉
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg animate-shake">
            <div className="flex items-center">
              {error.icon}
              <div>
                <h3 className="font-bold">{error.title}</h3>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {referrerUid && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-lg text-sm font-medium border-2 border-blue-200 animate-pulse">
            🎁 Bônus especial! Você e seu amigo ganharão recompensas extras ao se cadastrar!
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleSignIn(googleProvider, 'Google')}
            disabled={isLoading}
            className={`flex items-center justify-center w-full py-4 px-6 rounded-xl transition-all duration-300 transform hover:-translate-y-1 ${
              isLoading && activeProvider === 'Google' 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl text-white'
            }`}
          >
            {isLoading && activeProvider === 'Google' ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Carregando...
              </div>
            ) : (
              <>
                <Google className="mr-3 text-white text-2xl" />
                <span className="font-bold text-lg">Continuar com Google</span>
              </>
            )}
          </button>

        </div>

        <div className="text-center text-sm text-gray-500 font-medium">
          Ao continuar, você concorda com nossos{' '}
          <a href="/terms" className="text-blue-500 hover:underline font-bold">Termos</a> e{' '}
          <a href="/privacy" className="text-blue-500 hover:underline font-bold">Privacidade</a>.
          <div className="mt-2 text-xs text-gray-400">
            ✨ Diversão garantida! 🚀
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;