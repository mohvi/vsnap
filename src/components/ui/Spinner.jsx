export function Spinner({ className = 'w-8 h-8' }) {
  return (
    <div
      role="status"
      aria-label="A carregar"
      className={`${className} border-2 border-purple-500 border-t-transparent rounded-full animate-spin`}
    />
  );
}

export function PageLoader({ fullScreen = false, label }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? 'min-h-screen bg-[#0A0A12]' : 'h-96'}`}>
      <Spinner />
      {label && <p className="text-gray-400 text-sm">{label}</p>}
    </div>
  );
}
