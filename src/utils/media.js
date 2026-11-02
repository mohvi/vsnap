const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'ogg', 'm4a'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];

// Determina o tipo de mídia ('image' | 'video' | 'audio' | 'unknown').
// Prefere o mediaType gravado na entrada; se não houver, infere pela URL.
// URLs do Firebase Storage têm o path codificado e query string, por isso
// a extensão é lida do path descodificado sem o "?alt=media&token=...".
export function getMediaType(url, declaredType) {
  if (declaredType === 'photo' || declaredType === 'image') return 'image';
  if (declaredType === 'video') return 'video';
  if (declaredType === 'audio') return 'audio';
  if (!url) return 'unknown';

  let path = url;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    path = url.split('?')[0];
  }
  const ext = path.split('.').pop()?.toLowerCase() || '';

  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  return 'unknown';
}
