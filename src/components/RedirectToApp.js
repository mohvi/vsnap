import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function RedirectToApp() {
  const params = useParams();

  useEffect(() => {
    // Constrói o deep link baseado na rota actual
    const path = window.location.pathname; // ex: /entry/abc/def
    const deepLink = `votasnap://${path.slice(1)}`; // remove a barra inicial

    // Tenta abrir a app
    window.location.href = deepLink;

    // Fallback — se a app não abrir em 2 segundos, mostra botão de download
    const timer = setTimeout(() => {
      document.getElementById('fallback')?.classList.remove('hidden');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.logo}>🗳️</div>
      <p style={styles.text}>A abrir o VotaSnap...</p>

      <div id="fallback" className="hidden" style={styles.fallback}>
        <p style={styles.fallbackText}>
          Não tens o VotaSnap instalado?
        </p> 
         <a href="https://drive.google.com/uc?export=download&id=O_TEU_FILE_ID"
          style={styles.btn}>
          Descarregar a app
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    fontFamily: 'sans-serif',
  },
  logo: { fontSize: 56 },
  text: { color: '#888', fontSize: 15 },
  fallback: {
    marginTop: 24,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fallbackText: { color: '#fff', fontSize: 16 },
  btn: {
    background: 'linear-gradient(135deg, #ff286a, #ff8c5a)',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 700,
  },
};