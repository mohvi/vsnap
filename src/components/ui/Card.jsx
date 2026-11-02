// Bloco base das páginas: fundo, borda e, opcionalmente, um cabeçalho com título e acções.
export default function Card({ title, icon: Icon, iconClass = 'text-brand-400', actions, className = '', bodyClass = '', children }) {
  return (
    <section className={`bg-ink-900 border border-white/5 rounded-2xl ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5">
          {title && (
            <h2 className="text-white font-semibold flex items-center gap-2 min-w-0">
              {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />}
              <span className="truncate">{title}</span>
            </h2>
          )}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>
      )}
      <div className={`p-4 sm:p-5 ${bodyClass}`}>{children}</div>
    </section>
  );
}
