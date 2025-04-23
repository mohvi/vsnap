import React, { useState, useEffect } from 'react';
import { Google, Facebook, ErrorOutline } from '@mui/icons-material';
import { auth, googleProvider, facebookProvider } from '../fb';
import { signInWithPopup, fetchSignInMethodsForEmail, linkWithCredential } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../img/logo.png';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [error, setError] = useState(null);
  const [referrerUid, setReferrerUid] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const db = getDatabase();

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
        // Update last login date if user exists
        await set(ref(db, `users/${user.uid}/loginDate`), new Date().toISOString());
        return;
      }

      const userData = {
        displayName: user.displayName,
        uid: user.uid,
        email: user.email,
        profilepic: user.photoURL,
        provider: user.providerData[0]?.providerId,
        country: 'Unknown',
        ip: 'Unknown',
        joinDate: new Date().toISOString(),
        loginDate: new Date().toISOString(),
        referrer: referrerUid || null,
      };

      await set(userRef, userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Track referral if applicable
      if (referrerUid) {
        const referralRef = ref(db, `referrals/${referrerUid}/${user.uid}`);
        await set(referralRef, {
          date: new Date().toISOString(),
          newUserEmail: user.email
        });
      }
    } catch (error) {
      console.error('Error saving user data:', error);
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
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        let credential;
        
        if (providerName === 'Google') {
          credential = googleProvider.credentialFromError?.(error);
        } else if (providerName === 'Facebook') {
          credential = facebookProvider.credentialFromError?.(error);
        }

        if (email && credential) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            setError({
              title: 'Conta já existente',
              message: `Você já possui uma conta registrada com ${methods[0]}. Por favor, faça login usando esse método.`
            });
          } catch (e) {
            setError({
              title: 'Erro de vinculação',
              message: 'Ocorreu um erro ao verificar sua conta. Tente novamente mais tarde.'
            });
          }
        }
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError({
          title: 'Login cancelado',
          message: 'A janela de login foi fechada antes de concluir o processo.'
        });
      } else {
        setError({
          title: 'Erro no login',
          message: `Ocorreu um erro ao tentar entrar com ${providerName}. Por favor, tente novamente.`
        });
      }
    } finally {
      setIsLoading(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center transition-all duration-300 hover:shadow-xl">
        <img 
          src={logo} 
          alt="VotaSnap Logo" 
          className="w-32 mx-auto mb-6 hover:scale-105 transition-transform duration-300" 
        />
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo ao VotaSnap</h1>
        <p className="text-gray-600 mb-8">Entre para participar de desafios e ganhar recompensas!</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <div className="flex items-center">
              <ErrorOutline className="mr-2" />
              <div>
                <h3 className="font-medium">{error.title}</h3>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {referrerUid && (
          <div className="mb-6 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Você está aceitando um convite de amigo! Ambos ganharão recompensas quando você se cadastrar.
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleSignIn(googleProvider, 'Google')}
            disabled={isLoading}
            className={`flex items-center justify-center w-full py-3 px-4 rounded-xl transition-all duration-300 ${
              isLoading && activeProvider === 'Google' 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading && activeProvider === 'Google' ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Carregando...
              </div>
            ) : (
              <>
                <Google className="mr-3 text-white" />
                <span className="text-white font-medium">Continuar com Google</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleSignIn(facebookProvider, 'Facebook')}
            disabled={isLoading}
            className={`flex items-center justify-center w-full py-3 px-4 rounded-xl transition-all duration-300 ${
              isLoading && activeProvider === 'Facebook' 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading && activeProvider === 'Facebook' ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Carregando...
              </div>
            ) : (
              <>
                <Facebook className="mr-3 text-white" />
                <span className="text-white font-medium">Continuar com Facebook</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-blue-500 hover:underline">Termos de Serviço</a> e{' '}
          <a href="#" className="text-blue-500 hover:underline">Política de Privacidade</a>.
        </div>
      </div>
    </div>
  );
};

export default Auth;