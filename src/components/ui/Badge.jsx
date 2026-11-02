const TONES = {
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  brand: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
  gray: 'bg-white/5 text-gray-400 border-white/10',
};

export default function Badge({ tone = 'gray', icon: Icon, title, children }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${TONES[tone]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
