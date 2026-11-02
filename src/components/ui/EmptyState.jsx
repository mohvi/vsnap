export default function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6 text-gray-500" />
        </div>
      )}
      <p className="text-gray-300 text-sm font-medium">{title}</p>
      {hint && <p className="text-gray-500 text-xs mt-1">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
