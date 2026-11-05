import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, UserPlus } from 'lucide-react';
import { APP_DOWNLOAD_URL } from '../config';

const CLIPBOARD_PREFIX = 'VOTASNAP-CONVITE:';
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

// Na Play Store o código segue no `referrer` e a app lê-o na primeira abertura.
function downloadUrl(code) {
  if (!APP_DOWNLOAD_URL.includes('play.google.com')) return APP_DOWNLOAD_URL;
  const sep = APP_DOWNLOAD_URL.includes('?') ? '&' : '?';
  return `${APP_DOWNLOAD_URL}${sep}referrer=${encodeURIComponent(`invite=${code}`)}`;
}

async function copyCode(code) {
  const text = `${CLIPBOARD_PREFIX}${code}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Navegadores antigos: textarea temporária.
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch { /* sem área de transferência */ }
    el.remove();
  }
}

// /invite/{username}: abre a app se estiver instalada; senão, ao descarregar,
// deixa o código na área de transferência (APK e iPhone) e no referrer da
// Play Store, para a app atribuir o convite sozinha na primeira abertura.
export default function InviteLanding() {
  const { code: raw = '' } = useParams();
  const code = raw.toLowerCase();
  const valid = USERNAME_RE.test(code);
  const [showFallback, setShowFallback] = useState(false);
  const deepLink = `votasnap://invite/${encodeURIComponent(code)}`;

  useEffect(() => {
    if (!valid) { setShowFallback(true); return undefined; }
    window.location.href = deepLink;
    const timer = setTimeout(() => setShowFallback(true), 1800);
    return () => clearTimeout(timer);
  }, [deepLink, valid]);

  const download = async () => {
    if (valid) await copyCode(code);
    window.location.href = downloadUrl(code);
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-600/25">
        <UserPlus className="w-8 h-8 text-white" />
      </div>
      {valid ? (
        <>
          <h1 className="text-white text-xl font-bold">@{code} convidou-te para o VotaSnap</h1>
          <p className="text-gray-400 text-sm max-w-xs">Publica fotos em desafios, vota nas melhores e ganha prémios.</p>
        </>
      ) : (
        <h1 className="text-white text-xl font-bold">Junta-te ao VotaSnap</h1>
      )}

      {showFallback && (
        <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={download}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold"
          >
            <Download className="w-4 h-4" />
            Descarregar a app
          </button>
          <p className="text-gray-500 text-xs">
            O convite fica guardado: quando abrires a app e criares a conta, conta automaticamente para @{valid ? code : '…'}.
          </p>
          {valid && <a href={deepLink} className="text-gray-500 text-sm hover:text-gray-300">Já tenho a app — abrir</a>}
        </div>
      )}
    </div>
  );
}
