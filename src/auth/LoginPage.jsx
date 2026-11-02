import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { PageLoader } from '../components/ui/Spinner';

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'Email ou palavra-passe incorrectos.',
  'auth/invalid-email': 'Email inválido.',
  'auth/too-many-requests': 'Demasiadas tentativas. Tenta novamente mais tarde.',
  'auth/popup-closed-by-user': 'Janela de login fechada antes de terminar.',
  'auth/network-request-failed': 'Sem ligação à internet.',
};

export default function LoginPage() {
  const { status, signInWithEmail, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') return <PageLoader fullScreen />;
  if (status !== 'signedOut') {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  const run = async (fn) => {
    setError('');
    setSubmitting(true);
    try {
      await fn();
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível entrar. Tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run(() => signInWithEmail(email.trim(), password));
  };

  return (
    <div className="min-h-screen bg-[#0A0A12] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Vota<span className="text-purple-400">Snap</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Painel de administração</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#14141F] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm text-gray-400">Email</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 focus-within:border-purple-500">
              <Mail className="w-4 h-4 text-gray-500" />
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full bg-transparent py-3 text-white outline-none text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-400">Palavra-passe</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 focus-within:border-purple-500">
              <Lock className="w-4 h-4 text-gray-500" />
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-transparent py-3 text-white outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>

          <div className="flex items-center gap-3 text-gray-600 text-xs">
            <span className="flex-1 h-px bg-white/10" /> ou <span className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => run(signInWithGoogle)}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm disabled:opacity-50"
          >
            Entrar com Google
          </button>
        </form>
      </div>
    </div>
  );
}
