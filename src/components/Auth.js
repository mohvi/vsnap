import React, { useState, useEffect } from 'react';
import { Google, Facebook } from '@mui/icons-material';
import { auth, googleProvider, facebookProvider } from '../fb';
import { signInWithPopup, fetchSignInMethodsForEmail, linkWithCredential } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../img/logo.png';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
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
    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) return;

    const userData = {
      displayName: user.displayName,
      uid: user.uid,
      email: user.email,
      profilepic: user.photoURL,
      provider: user.providerData[0]?.providerId,
      country: 'Unknown',
      ip: 'Unknown',
      loginDate: new Date().toISOString(),
      referrer: referrerUid || null,
    };

    await set(userRef, userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleSignIn = async (provider, providerName) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserData(result.user);
      navigate('/');
    } catch (error) {
      console.error(`Erro ao fazer login com ${providerName}:`, error);
  
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        let credential;
  
        // Verifica qual o provedor para chamar a função correta
        if (providerName === 'Google') {
          credential = googleProvider.credentialFromError?.(error);
        } else if (providerName === 'Facebook') {
          credential = facebookProvider.credentialFromError?.(error);
        }
  
        if (email && credential) {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          if (signInMethods.length > 0) {
            alert(`Conta já existente! Faça login usando ${signInMethods[0]} e tente novamente.`);
          } else {
            await linkWithCredential(auth.currentUser, credential);
            alert('Conta vinculada com sucesso! Agora você pode entrar usando qualquer método.');
          }
        }
      } else {
        alert(`Erro ao fazer login com ${providerName}. Tente novamente.`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <img src={logo} alt="logo" className="w-24 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Bem-vindo ao VotaSnap</h2>

        <div className="space-y-4">
          <button
            onClick={() => handleSignIn(googleProvider, 'Google')}
            disabled={isLoading}
            className={`flex items-center justify-center w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-300 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="Continuar com Google"
          >
            {isLoading && <span className="loader mr-2"></span>}
            <Google className="mr-2" />
            {isLoading ? 'Carregando...' : 'Continuar com Google'}
          </button>

          <button
            onClick={() => handleSignIn(facebookProvider, 'Facebook')}
            disabled={isLoading}
            className={`flex items-center justify-center w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="Continuar com Facebook"
          >
            {isLoading && <span className="loader mr-2"></span>}
            <Facebook className="mr-2" />
            {isLoading ? 'Carregando...' : 'Continuar com Facebook'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
