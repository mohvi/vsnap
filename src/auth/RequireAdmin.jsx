import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { PageLoader } from '../components/ui/Spinner';

export default function RequireAdmin({ children }) {
  const { status, user, logout } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader fullScreen />;

  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-ink-900 border border-white/10 rounded-2xl p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-white text-lg font-bold mb-1">Sem permissão</h1>
          <p className="text-gray-400 text-sm mb-6">
            A conta <span className="text-white break-all">{user?.email}</span> não tem acesso de administrador.
          </p>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Terminar sessão
          </button>
        </div>
      </div>
    );
  }

  return children;
}
