import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Menu, X, AlertTriangle } from 'lucide-react';
import { NAV_GROUPS } from './navItems';
import { Breadcrumbs, SearchButton } from './Topbar';
import { useAuth } from '../auth/AuthProvider';
import { useAdminData } from '../data/AdminDataProvider';
import { PageLoader } from '../components/ui/Spinner';

const CommandPalette = lazy(() => import('./CommandPalette'));

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
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-600/25 flex-shrink-0">
        <span className="text-white font-bold text-lg leading-none">V</span>
      </div>
      {!compact && (
        <div className="min-w-0">
          <span className="text-white font-bold text-lg tracking-tight">
            Vota<span className="text-brand-400">Snap</span>
          </span>
          <span className="block text-[10px] text-gray-500 font-medium uppercase tracking-wider">
            Painel de gestão
          </span>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed, count }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `
        group relative flex items-center gap-3 py-2 rounded-xl text-sm font-medium transition-colors
        ${collapsed ? 'justify-center px-2' : 'px-3'}
        ${isActive ? 'bg-brand-600/15 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-brand-500 to-accent-500 rounded-r-full" />}
          <span className="relative">
            <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-400' : ''}`} />
            {item.alert && count > 0 && collapsed && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                  item.alert ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-300'
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
}

function SidebarContent({ collapsed, onToggleCollapse, onClose }) {
  const { user, logout } = useAuth();
  const { metrics } = useAdminData();
  const initials = (user?.displayName || user?.email || 'AD').slice(0, 2).toUpperCase();

  return (
    <div className="relative z-10 flex flex-col h-full">
      <div className={`flex items-center px-4 h-16 border-b border-white/5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Brand compact={collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`text-gray-500 hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition-colors ${
              collapsed ? 'absolute -right-3 top-5 bg-ink-950 border border-white/10' : ''
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

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed
              ? <div className="mx-3 mb-2 border-t border-white/5" />
              : <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-gray-600 font-semibold">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} count={item.badge ? metrics[item.badge] : 0} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-white/5 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center gap-3 rounded-xl p-2 ${collapsed ? 'flex-col' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Administrador'}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            aria-label="Terminar sessão"
            title="Terminar sessão"
            className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { error } = useAdminData();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Fecha o drawer e a pesquisa ao mudar de página.
  useEffect(() => {
    setDrawerOpen(false);
    setPaletteOpen(false);
  }, [location.pathname, location.search]);

  // Ctrl+K / ⌘K abre a pesquisa global.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="min-h-screen bg-ink-950 text-white font-sans antialiased">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-ink-950 border-r border-white/5 flex-col z-40 transition-[width] duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Drawer mobile */}
      <div className={`lg:hidden fixed inset-0 z-50 ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[85%] max-w-[300px] bg-ink-950 border-r border-white/5 transition-transform duration-300 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {drawerOpen && <SidebarContent collapsed={false} onClose={() => setDrawerOpen(false)} />}
        </aside>
      </div>

      {/* A margem acompanha a largura real da sidebar */}
      <div className={`min-h-screen transition-[margin] duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 lg:px-8 bg-ink-950/85 backdrop-blur border-b border-white/5 pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={drawerOpen}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0"><Breadcrumbs /></div>
          <div className="hidden md:block"><SearchButton onOpen={() => setPaletteOpen(true)} /></div>
          <div className="md:hidden"><SearchButton compact onOpen={() => setPaletteOpen(true)} /></div>
        </header>

        <main>
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

      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setPaletteOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
