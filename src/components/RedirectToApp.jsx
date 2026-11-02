import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Download } from 'lucide-react';
import { APP_DOWNLOAD_URL } from '../config';

// Recebe links partilhados (/entry/:c/:e, /challenge/:c), tenta abrir a app
// pelo deep link e, se nada acontecer em 2s, mostra o botão de download.
export default function RedirectToApp() {
  const { pathname } = useLocation();
  const [showFallback, setShowFallback] = useState(false);
  const deepLink = `votasnap://${pathname.slice(1)}`;

  useEffect(() => {
    window.location.href = deepLink;
    const timer = setTimeout(() => setShowFallback(true), 2000);
    return () => clearTimeout(timer);
  }, [deepLink]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <p className="text-gray-400 text-sm">A abrir o VotaSnap...</p>

      {showFallback && (
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-white text-base">Não tens o VotaSnap instalado?</p>
          <a
            href={APP_DOWNLOAD_URL}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] text-white font-bold"
          >
            <Download className="w-4 h-4" />
            Descarregar a app
          </a>
          <a href={deepLink} className="text-gray-500 text-sm hover:text-gray-300">Tentar abrir novamente</a>
        </div>
      )}
    </div>
  );
}
