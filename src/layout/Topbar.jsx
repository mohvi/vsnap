import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { findNavItem } from './navItems';

// Rótulo do segundo nível do caminho (ficha de utilizador, relatório de marca).
function detailLabel(pathname, { users, sponsors }) {
  const [, section, id] = pathname.split('/');
  if (!id) return null;
  if (section === 'ul') return users[id]?.username ? `@${users[id].username}` : users[id]?.name || 'Utilizador';
  if (section === 'marcas') return sponsors[id]?.name || 'Marca';
  return null;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const data = useAdminData();
  const item = findNavItem(pathname);
  const detail = detailLabel(pathname, data);
  if (!item) return null;

  return (
    <nav aria-label="Caminho" className="flex items-center gap-1.5 text-sm min-w-0">
      <span className="text-gray-500 hidden sm:inline">Painel</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 hidden sm:block flex-shrink-0" />
      {detail ? (
        <>
          <Link to={item.path} className="text-gray-400 hover:text-white truncate">{item.label}</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <span className="text-white font-medium truncate" aria-current="page">{detail}</span>
        </>
      ) : (
        <span className="text-white font-medium truncate" aria-current="page">{item.label}</span>
      )}
    </nav>
  );
}

export function SearchButton({ onOpen, compact = false }) {
  if (compact) {
    return (
      <button onClick={onOpen} aria-label="Pesquisar" className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5">
        <Search className="w-5 h-5" />
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 w-64 max-w-full px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 text-gray-500 text-sm transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="flex-1 text-left">Pesquisar...</span>
      <kbd className="text-[10px] border border-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
    </button>
  );
}
