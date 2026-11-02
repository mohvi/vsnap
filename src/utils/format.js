const LOCALE = 'pt-MZ';

export function timeAgo(timestamp, now = Date.now()) {
  if (!timestamp) return '—';
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hora${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? 's' : ''}`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatNumber(n) {
  return new Intl.NumberFormat(LOCALE).format(n || 0);
}

export function timeLeft(endsAt, now = Date.now()) {
  const diff = endsAt - now;
  if (!endsAt || diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days > 0 ? `${days}d restantes` : `${hours}h restantes`;
}
