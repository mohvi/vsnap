import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';

// ── Esquema de deep link da app ──
// Em produção, configura o Expo Router com o scheme "votasnap" em app.json:
//   "scheme": "votasnap"
// Assim este URL abre directamente o ecrã de votação na app instalada.
const APP_SCHEME = 'votasnap';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.votasnap';
const APP_STORE_URL = 'https://apps.apple.com/app/votasnap';

function buildDeepLink(challengeId, entryId) {
  return `${APP_SCHEME}://entry/${challengeId}/${entryId}`;
}

export default function RedirectToApp() {
  const { challengeId, entryId } = useParams();

  const [entry, setEntry] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [user, setUser] = useState(null);
  const [sponsor, setSponsor] = useState(null); // dados do patrocinador (se existir)
  const [loading, setLoading] = useState(true);
  const [appOpened, setAppOpened] = useState(false);

  useEffect(() => {
    if (!challengeId || !entryId) return;

    let loaded = 0;
    const checkDone = () => { loaded++; if (loaded >= 3) setLoading(false); };

    // 1. Entrada
    onValue(ref(db, `entries/${challengeId}/${entryId}`), snap => {
      setEntry(snap.val());
      checkDone();
    }, { onlyOnce: true });

    // 2. Desafio
    onValue(ref(db, `challenges/${challengeId}`), snap => {
      const ch = snap.val();
      setChallenge(ch);
      checkDone();

      // 3. Patrocinador — busca na colecção sponsors/ se existir sponsorId,
      //    ou usa o campo legado challenge.sponsor (string) como fallback.
      if (ch?.sponsorId) {
        onValue(ref(db, `sponsors/${ch.sponsorId}`), sSnap => {
          setSponsor(sSnap.val());
        }, { onlyOnce: true });
      }
    }, { onlyOnce: true });

    // 4. Utilizador da entrada (carregado depois de termos o userId)
    onValue(ref(db, `entries/${challengeId}/${entryId}`), snap => {
      const e = snap.val();
      if (e?.userId) {
        onValue(ref(db, `users/${e.userId}`), uSnap => {
          setUser(uSnap.val());
          checkDone();
        }, { onlyOnce: true });
      } else {
        checkDone();
      }
    }, { onlyOnce: true });
  }, [challengeId, entryId]);

  // Tenta abrir a app. Se não estiver instalada, o link não funciona e o
  // utilizador fica na página. Depois de 1.5s sem resposta, mostra os botões
  // de download. Não há forma 100% fiável de detectar se a app abriu.
  const handleOpenApp = () => {
    const deepLink = buildDeepLink(challengeId, entryId);
    window.location.href = deepLink;
    setAppOpened(true);
    // Fallback: se ainda estivermos na página após 1.5s, a app não abriu
    setTimeout(() => setAppOpened(false), 1500);
  };

  const shareText = [
    `👀 Vê este post no VotaSnap!`,
    `${user?.name || user?.username || 'Alguém'} está a participar em "${challenge?.title || 'desafio'}".`,
    `Prémio: ${challenge?.prize || '...'} 🎁`,
    `Vota aqui 👉 ${window.location.href}`,
  ].join('\n');

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ text: shareText, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('Texto copiado para a área de transferência!');
    }
  };

  // Nome do patrocinador a mostrar: dados completos da colecção, ou fallback para o campo legado
  const sponsorName = sponsor?.name || (challenge?.type === 'sponsored' ? challenge?.sponsor : null);
  const sponsorLogo = sponsor?.logoUrl || null;
  const sponsorLink = sponsor?.website || sponsor?.instagram ? `https://instagram.com/${sponsor?.instagram}` : null;

  if (loading) {
    return (
      <div style={s.root}>
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <p style={s.loadingText}>A carregar...</p>
        </div>
      </div>
    );
  }

  if (!entry || !challenge) {
    return (
      <div style={s.root}>
        <div style={s.errorWrap}>
          <div style={s.errorIcon}>🔍</div>
          <h2 style={s.errorTitle}>Participação não encontrada</h2>
          <p style={s.errorSub}>O link pode ter expirado ou o desafio pode ter terminado.</p>
          <a href="https://votasnap.vercel.app" style={s.homeLink}>Ir para o VotaSnap</a>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* Fundo com glow */}
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />

      <div style={s.container}>

        {/* ── HEADER: Logo VotaSnap ── */}
        <div style={s.header}>
          <div style={s.logoBox}>
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
              <circle cx="12" cy="8" r="3" fill="rgba(255,255,255,0.9)"/>
              <circle cx="18" cy="5" r="2.5" fill="rgba(255,255,255,0.9)"/>
              <circle cx="24" cy="6" r="2.5" fill="rgba(255,255,255,0.9)"/>
              <path d="M10 14 L18 28 L30 10" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span style={s.logoText}>Vota<span style={s.logoAccent}>Snap</span></span>
        </div>

        {/* ── CHALLENGE PILL ── */}
        <div style={s.challengePill}>
          <span style={s.challengePillEmoji}>🏆</span>
          <span style={s.challengePillText}>{challenge.title}</span>
          <span style={s.challengePillPrize}>{challenge.prize}</span>
        </div>

        {/* ── CARD DE ENTRADA ── */}
        <div style={s.card}>

          {/* Media preview */}
          <div style={s.mediaWrap}>
            {entry.mediaType === 'video' ? (
              <video
                src={entry.mediaUrl}
                style={s.media}
                autoPlay
                muted
                loop
                playsInline
                poster={entry.thumbnailUrl || undefined}
              />
            ) : (
              <img
                src={entry.mediaUrl}
                alt={entry.caption || 'Participação VotaSnap'}
                style={s.media}
              />
            )}
            {/* Overlay com votos */}
            <div style={s.mediaOverlay}>
              <div style={s.voteBadge}>
                <span style={{fontSize:16}}>❤️</span>
                <span style={s.voteCount}>{entry.votes || 0}</span>
              </div>
            </div>
          </div>

          {/* Info do utilizador */}
          <div style={s.userRow}>
            {user?.avatar ? (
              <img src={user.avatar} style={s.avatar} alt={user.name} />
            ) : (
              <div style={s.avatarPlaceholder}>
                <span style={s.avatarInitial}>
                  {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div style={s.userInfo}>
              <p style={s.userName}>{user?.name || 'Utilizador'}</p>
              <p style={s.userHandle}>@{user?.username || '...'}</p>
            </div>
            <div style={s.metaRight}>
              <p style={s.metaVotes}>{entry.votes || 0} votos</p>
            </div>
          </div>

          {/* Legenda */}
          {entry.caption && (
            <p style={s.caption}>{entry.caption}</p>
          )}

          {/* Patrocinador — só aparece se o desafio for sponsored */}
          {sponsorName && (
            <div style={s.sponsorRow}>
              {sponsorLogo && (
                <img src={sponsorLogo} alt={sponsorName} style={s.sponsorLogo} />
              )}
              <div style={s.sponsorInfo}>
                <p style={s.sponsorLabel}>Patrocinado por</p>
                {sponsorLink ? (
                  <a href={sponsorLink} target="_blank" rel="noopener noreferrer" style={s.sponsorName}>
                    {sponsorName} ↗
                  </a>
                ) : (
                  <p style={s.sponsorName}>{sponsorName}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CTA PRINCIPAL: Abrir app ── */}
        <button onClick={handleOpenApp} style={s.ctaBtn}>
          <span style={{fontSize:18}}>❤️</span>
          <span style={s.ctaBtnText}>Votar agora no VotaSnap</span>
        </button>

        {/* Mensagem de fallback depois de tentar abrir */}
        {appOpened && (
          <div style={s.fallbackBox}>
            <p style={s.fallbackTitle}>Não abriste o VotaSnap?</p>
            <p style={s.fallbackSub}>Descarrega a app para votar nesta participação.</p>
            <div style={s.storeRow}>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={s.storeBtn}>
                🤖 Google Play
              </a>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={s.storeBtn}>
                🍎 App Store
              </a>
            </div>
          </div>
        )}

        {/* ── PARTILHAR ── */}
        <button onClick={handleShare} style={s.shareBtn}>
          <span>📤</span>
          <span>Partilhar esta participação</span>
        </button>

        {/* Texto pré-formatado para copiar (WhatsApp style) */}
        <div style={s.sharePreview}>
          <p style={s.sharePreviewLabel}>Mensagem de partilha</p>
          <pre style={s.sharePreviewText}>{shareText}</pre>
        </div>

        {/* Footer */}
        <p style={s.footer}>
          VotaSnap · Pemba, Moçambique · Desafios com prémios reais
        </p>
      </div>
    </div>
  );
}

// ── Estilos inline (sem dependência de Tailwind — esta página é pública) ──
const s = {
  root: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #1a0e30 0%, #0d0b1e 50%, #070510 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  bgGlow1: {
    position: 'absolute', top: -100, left: -100,
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(123,79,255,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'absolute', bottom: -100, right: -100,
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(255,40,106,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: 16,
    position: 'relative', zIndex: 1,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  logoBox: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #ff286a, #ff8c5a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: {
    color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: -0.5,
  },
  logoAccent: { color: '#a78bfa' },
  challengePill: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'linear-gradient(90deg, #ff286a, #ff8c5a)',
    borderRadius: 14, padding: '10px 16px',
  },
  challengePillEmoji: { fontSize: 14 },
  challengePillText: { color: '#fff', fontSize: 13, fontWeight: 700, flex: 1 },
  challengePillPrize: { color: '#FFE066', fontSize: 13, fontWeight: 700 },
  card: {
    background: '#14141F',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  mediaWrap: { position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', background: '#0d0b1e' },
  media: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  mediaOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
    padding: '12px 14px 10px',
    display: 'flex', justifyContent: 'flex-end',
  },
  voteBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 20, padding: '4px 12px',
  },
  voteCount: { color: '#fff', fontSize: 14, fontWeight: 700 },
  userRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, objectFit: 'cover' },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    background: 'linear-gradient(135deg, #ff286a, #ff8c5a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: 700 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 },
  userHandle: { color: '#666', fontSize: 12, margin: 0, marginTop: 2 },
  metaRight: { textAlign: 'right' },
  metaVotes: { color: '#ff286a', fontSize: 12, fontWeight: 700, margin: 0 },
  caption: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13,
    padding: '0 16px 14px', margin: 0, lineHeight: 1.5,
  },
  sponsorRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '0 16px 14px',
    padding: '10px 12px',
    background: 'rgba(255,40,106,0.07)',
    border: '1px solid rgba(255,40,106,0.2)',
    borderRadius: 12,
  },
  sponsorLogo: {
    width: 36, height: 36, borderRadius: 8, objectFit: 'cover',
    background: '#1a1a2e', flexShrink: 0,
  },
  sponsorInfo: { flex: 1, minWidth: 0 },
  sponsorLabel: { color: 'rgba(255,40,106,0.7)', fontSize: 10, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 },
  sponsorName: { color: '#ff286a', fontSize: 13, fontWeight: 700, margin: 0, marginTop: 2, textDecoration: 'none' },
  ctaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: 'linear-gradient(90deg, #ff286a, #ff8c5a)',
    border: 'none', borderRadius: 16, padding: '18px',
    cursor: 'pointer', width: '100%', boxSizing: 'border-box',
    boxShadow: '0 8px 32px rgba(255,40,106,0.35)',
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 0.3 },
  fallbackBox: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 18, textAlign: 'center',
  },
  fallbackTitle: { color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 4px' },
  fallbackSub: { color: '#888', fontSize: 12, margin: '0 0 14px' },
  storeRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  storeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '10px 16px',
    color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
  },
  shareBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '14px',
    cursor: 'pointer', color: '#aaa', fontSize: 14, fontWeight: 500,
    width: '100%', boxSizing: 'border-box',
  },
  sharePreview: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: '14px 16px',
  },
  sharePreviewLabel: { color: '#555', fontSize: 10, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 },
  sharePreviewText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.7,
    margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit',
  },
  footer: { color: '#333', fontSize: 11, textAlign: 'center', margin: 0 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(255,40,106,0.2)',
    borderTopColor: '#ff286a',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: '#555', fontSize: 13 },
  errorWrap: { textAlign: 'center', maxWidth: 320 },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' },
  errorSub: { color: '#666', fontSize: 14, margin: '0 0 24px' },
  homeLink: {
    display: 'inline-block',
    background: 'linear-gradient(90deg, #ff286a, #ff8c5a)',
    color: '#fff', fontWeight: 700, fontSize: 14,
    padding: '12px 24px', borderRadius: 12, textDecoration: 'none',
  },
};