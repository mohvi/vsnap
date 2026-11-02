import { useEffect, useId } from 'react';
import { X } from 'lucide-react';

// Em mobile abre como bottom-sheet; a partir de `sm` fica centrado.
export default function Modal({ title, onClose, children, footer, size = 'sm' }) {
  const titleId = useId();
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-slate-900 border border-white/10 w-full ${widths[size]} rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <h3 id={titleId} className="text-white font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col-reverse sm:flex-row gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ModalButton({ variant = 'secondary', className = '', ...props }) {
  const variants = {
    secondary: 'bg-white/5 hover:bg-white/10 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };
  return (
    <button
      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
