import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { searchAll } from './search';

export default function CommandPalette({ onClose }) {
  const data = useAdminData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const results = useMemo(() => searchAll(query, data), [query, data]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); open(results[active]); }
    if (e.key === 'Escape') onClose();
  };

  let lastGroup = null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-start justify-center p-4 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="Pesquisa global" className="w-full max-w-xl bg-ink-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <label className="flex items-center gap-3 px-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <span className="sr-only">Pesquisar</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Utilizadores, desafios, marcas ou páginas..."
            className="w-full bg-transparent py-4 text-white text-sm outline-none placeholder:text-gray-500"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
          />
          <kbd className="hidden sm:block text-[10px] text-gray-500 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </label>
        <ul id="command-results" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && <li className="px-4 py-8 text-center text-gray-500 text-sm">Sem resultados para “{query}”.</li>}
          {results.map((item, i) => {
            const Icon = item.icon;
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.key} role="presentation">
                {header && <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{header}</p>}
                <button
                  role="option"
                  aria-selected={i === active}
                  data-active={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => open(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-brand-500/10 text-white' : 'text-gray-300'}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${i === active ? 'text-brand-400' : 'text-gray-500'}`} />
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {item.detail && <span className="text-xs text-gray-500 truncate max-w-[40%]">{item.detail}</span>}
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
