import { Link } from 'react-router-dom';
import { formatNumber } from '../../utils/format';

const TONES = {
  brand: 'from-brand-600 to-accent-600',
  blue: 'from-blue-600 to-cyan-500',
  yellow: 'from-yellow-500 to-orange-500',
  green: 'from-green-500 to-emerald-500',
};

// Indicador numérico. `to` torna o cartão um link; `hint` aparece por baixo do valor.
export default function StatCard({ title, value, total, suffix, hint, icon: Icon, tone = 'brand', to }) {
  const body = (
    <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <p className="text-gray-400 text-xs sm:text-sm">{title}</p>
        <p className="text-white text-xl sm:text-2xl font-bold mt-1 break-words tabular-nums">
          {typeof value === 'number' ? formatNumber(value) : value}
          {suffix && <span className="text-gray-400 text-base font-semibold">{suffix}</span>}
          {total != null && <span className="text-gray-500 text-sm font-normal"> / {formatNumber(total)}</span>}
        </p>
        {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
      </div>
      {Icon && (
        <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${TONES[tone]} self-start`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}
    </div>
  );
  const className = 'block bg-ink-900 border border-white/5 rounded-2xl p-4 sm:p-5 transition-colors';
  return to
    ? <Link to={to} className={`${className} hover:border-brand-500/30`}>{body}</Link>
    : <div className={className}>{body}</div>;
}
