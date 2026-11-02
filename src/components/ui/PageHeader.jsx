export default function PageHeader({ icon: Icon, iconClass = 'text-brand-400', title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          {Icon && <Icon className={`w-6 h-6 flex-shrink-0 ${iconClass}`} />}
          {title}
        </h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
