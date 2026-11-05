// Pré-visualização dos links partilhados (WhatsApp, Facebook, X…).
// Os robôs dessas redes não correm JavaScript, por isso esta função devolve o
// index.html da SPA com as meta tags Open Graph da publicação, do desafio ou
// do convite. Lê só nós públicos da Realtime Database (sem credenciais).

const DB_URL = (process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://votasnap-default-rtdb.firebaseio.com').replace(/\/$/, '');
const SITE = 'https://votasnap.vercel.app';
const DEFAULT_IMAGE = `${SITE}/logo512.png`;
const SAFE_ID = /^[A-Za-z0-9_.-]{1,64}$/;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function fetchJson(path, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${DB_URL}/${path}`, { signal: controller.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function metaFor(query) {
  const { type } = query;

  if (type === 'entry' && SAFE_ID.test(query.c) && SAFE_ID.test(query.e)) {
    const [entry, challenge] = await Promise.all([
      fetchJson(`entries/${query.c}/${query.e}.json`),
      fetchJson(`challenges/${query.c}.json`),
    ]);
    if (!entry) return null;
    const profile = entry.userId && SAFE_ID.test(entry.userId) ? await fetchJson(`publicProfiles/${entry.userId}.json`) : null;
    const who = profile?.username ? `@${profile.username}` : 'Esta publicação';
    return {
      title: `${who} no desafio "${challenge?.title || 'VotaSnap'}"`,
      description: `${entry.votes || 0} voto(s). Vota e ajuda a ganhar${challenge?.prize ? `: ${challenge.prize}` : ''}!`,
      image: entry.mediaType === 'video' ? (challenge?.coverImage || DEFAULT_IMAGE) : (entry.mediaUrl || DEFAULT_IMAGE),
      url: `${SITE}/entry/${query.c}/${query.e}`,
    };
  }

  if (type === 'challenge' && SAFE_ID.test(query.c)) {
    const challenge = await fetchJson(`challenges/${query.c}.json`);
    if (!challenge) return null;
    return {
      title: `Desafio "${challenge.title}" no VotaSnap`,
      description: challenge.prize ? `Participa grátis e concorre a: ${challenge.prize}` : 'Participa grátis, publica a tua foto e vota.',
      image: challenge.coverImage || DEFAULT_IMAGE,
      url: `${SITE}/challenge/${query.c}`,
    };
  }

  if (type === 'invite' && /^[a-z0-9_.]{3,20}$/.test(String(query.code || '').toLowerCase())) {
    const code = String(query.code).toLowerCase();
    const found = await fetchJson(`publicProfiles.json?orderBy=${encodeURIComponent('"username"')}&equalTo=${encodeURIComponent(`"${code}"`)}`);
    const profile = found ? Object.values(found)[0] : null;
    return {
      title: `@${code} convidou-te para o VotaSnap`,
      description: 'Cria a tua conta, publica fotos em desafios e ganha prémios.',
      image: profile?.avatar || DEFAULT_IMAGE,
      url: `${SITE}/invite/${code}`,
    };
  }

  return null;
}

function injectMeta(html, meta) {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
  return html
    .replace(/\s*<meta (property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '')
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace('</head>', `    ${tags}\n  </head>`);
}

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  let html;
  try {
    html = await (await fetch(`${proto}://${host}/index.html`)).text();
  } catch {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
    return;
  }

  const meta = await metaFor(req.query || {});
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.end(meta ? injectMeta(html, meta) : html);
};
