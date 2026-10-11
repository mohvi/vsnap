import React, { useEffect, useState } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../fb';

export default function AdminGate({ children }) {
  const [access, setAccess] = useState('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState(null);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async user => {
      const current = ++generation;
      setAccount(user ? { uid: user.uid, email: user.email } : null);
      setAccess('loading');
      try {
        const token = user ? await user.getIdTokenResult() : null;
        if (active && current === generation) setAccess(!user ? 'login' : token.claims.admin === true ? 'admin' : 'denied');
      } catch { if (active && current === generation) setAccess('error'); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  const refreshAccess = async () => {
    const user = auth.currentUser;
    if (!user) { setAccess('login'); return; }
    setBusy(true);
    try {
      const token = await user.getIdTokenResult(true);
      if (auth.currentUser?.uid === user.uid) setAccess(token.claims.admin === true ? 'admin' : 'denied');
    } catch { setAccess('error'); }
    finally { setBusy(false); }
  };
  if (access === 'admin') return children;
  return <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
    <div className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl">Administração VotaSnap</h1>
      {access === 'loading' ? <p>A verificar acesso...</p> : access === 'denied' || access === 'error' ? <>
        <p>{access === 'error' ? 'Não foi possível verificar o acesso. Verifica a ligação e tenta novamente.' : 'Esta conta ainda não tem autorização administrativa.'}</p>
        {account && <div className="text-sm text-gray-400 break-all">
          {account.email && <p>{account.email}</p>}
          <p>UID: {account.uid}</p>
        </div>}
        <button disabled={busy} className="block" onClick={refreshAccess}>{busy ? 'A verificar...' : 'Atualizar acesso'}</button>
        <button onClick={() => signOut(auth)}>Sair</button>
      </> : <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setError('');
        try { await signInWithEmailAndPassword(auth, email.trim(), password); setPassword(''); }
        catch { setError('Não foi possível entrar. Verifica as credenciais.'); }
        finally { setBusy(false); }
      }}>
        <label className="block">Email<input className="block w-full bg-gray-800 p-3" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block">Palavra-passe<input className="block w-full bg-gray-800 p-3" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} type="submit">{busy ? 'A entrar...' : 'Entrar'}</button>
        {error && <p role="alert">{error}</p>}
      </form>}
    </div>
  </main>;
}
