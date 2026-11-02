export default function Avatar({ user, size = 'w-9 h-9', textSize = 'text-sm' }) {
  const label = user?.name || user?.username || 'Utilizador';
  if (user?.avatar) {
    return <img src={user.avatar} alt={label} loading="lazy" className={`${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div
      aria-label={label}
      className={`${size} ${textSize} rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}
