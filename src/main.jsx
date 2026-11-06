import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Depois de um deploy, um separador aberto pede ficheiros de páginas que já
// não existem. Recarrega uma vez para ir buscar a versão nova (o intervalo
// evita ciclos se o problema for outro).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'vsnap.reloadedForUpdate';
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* sem storage */ }
  if (Date.now() - last < 30000) return;
  event.preventDefault();
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* sem storage */ }
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
