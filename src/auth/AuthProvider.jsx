import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../fb';

const AuthContext = createContext(null);

// Estados: 'loading' → a verificar sessão; 'signedOut'; 'forbidden' (sessão
// válida mas sem custom claim admin); 'admin'.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setStatus('signedOut');
        return;
      }
      try {
        // forceRefresh garante que um claim acabado de atribuir é visto logo.
        const token = await u.getIdTokenResult(true);
        setUser(u);
        setStatus(token.claims.admin === true ? 'admin' : 'forbidden');
      } catch {
        setUser(u);
        setStatus('forbidden');
      }
    });
  }, []);

  const value = useMemo(() => ({
    user,
    status,
    signInWithEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signInWithGoogle: () => signInWithPopup(auth, googleProvider),
    logout: () => signOut(auth),
  }), [user, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}

