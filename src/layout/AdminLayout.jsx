import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Sparkles, ChevronLeft, ChevronRight, LogOut, Menu, X, TrendingUp, Zap, AlertTriangle,
} from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { useAuth } from '../auth/AuthProvider';
import { useAdminData } from '../data/AdminDataProvider';
import { PageLoader } from '../components/ui/Spinner';

const COLLAPSE_KEY = 'votasnap.sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25 flex-shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <span className="text-white font-bold text-lg tracking-tight">
            Vota<span className="text-purple-400">Snap</span>
          </span>
          <span className="block text-[10px] text-purple-400/60 font-medium uppercase tracking-wider">
            Admin Panel
          </span>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onToggleCollapse, onClose }) {
  const { user, logout } = useAuth();
  const { metrics } = useAdminData();
  const initials = (user?.displayName || user?.email || 'AD').slice(0, 2).toUpperCase();

  return (
    <div className="relative z-10 flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Brand compact={collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`text-gray-500 hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition-colors ${
              collapsed ? 'absolute -right-3 top-6 bg-[#0A0A12] border border-white/10' : ''
            }`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} aria-label="Fechar menu" className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mini estatísticas */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/5 grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-white text-sm font-semibold">{metrics.totalUsers}</span>
            </div>
            <span className="text-[10px] text-gray-500">Utilizadores</span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-white text-sm font-semibold">{metrics.activeChallengesCount}</span>
            </div>
            <span className="text-[10px] text-gray-500">Desafios activos</span>
          </div>
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const count = item.badge ? metrics[item.badge] : 0;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `
                group relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${collapsed ? 'justify-center px-2' : 'px-3'}
                ${isActive
                  ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/10 text-white border border-purple-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full" />}
                  <span className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                    {item.alert && count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          item.alert ? 'bg-red-500/20 text-red-400' : 'bg-purple-600/20 text-purple-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Perfil + logout */}
      <div className={`border-t border-white/5 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center gap-3 rounded-xl p-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-600/25 flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Administrador'}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              aria-label="Terminar sessão"
              title="Terminar sessão"
              className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            aria-label="Terminar sessão"
            title="Terminar sessão"
            className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Glow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl" />
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { error } = useAdminData();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fecha o drawer ao mudar de página.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      try { localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1'); } catch { /* storage indisponível */ }
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A12] text-white font-sans antialiased">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-[#0A0A12] border-r border-white/5 flex-col z-40 transition-[width] duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        <Glow />
        <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Top bar mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-[#0A0A12]/90 backdrop-blur border-b border-white/5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Brand />
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Drawer mobile */}
      <div className={`lg:hidden fixed inset-0 z-50 ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[85%] max-w-[300px] bg-[#0A0A12] border-r border-white/5 transition-transform duration-300 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Glow />
          {drawerOpen && <SidebarContent collapsed={false} onClose={() => setDrawerOpen(false)} />}
        </aside>
      </div>

      {/* Conteúdo — a margem acompanha a largura real da sidebar */}
      <main className={`min-h-screen transition-[margin] duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'}`}>
        {error && (
          <div role="alert" className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Erro ao ler dados do Firebase: {error}</span>
          </div>
        )}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
