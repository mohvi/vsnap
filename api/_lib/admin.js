// Firebase Admin para as funções da Vercel. A chave da conta de serviço fica
// na variável de ambiente FIREBASE_SERVICE_ACCOUNT (o JSON inteiro), nunca no git.
// O firebase-admin só é carregado quando é preciso, para que uma falha ao
// carregar (ou uma chave mal colada) dê um erro tratável e não derrube a função.
const DB_URL = (process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://votasnap-default-rtdb.firebaseio.com').replace(/\/$/, '');

let cached = null;

function firebaseAdmin() {
  if (cached) return cached;
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getDatabase } = require('firebase-admin/database');
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT não está configurada na Vercel.');
    initializeApp({ credential: cert(JSON.parse(raw)), databaseURL: DB_URL });
  }
  cached = { auth: getAuth(), db: getDatabase() };
  return cached;
}

// Diagnóstico sem revelar a chave: diz só em que passo falha.
function adminHealth() {
  const out = { node: process.version, env: !!process.env.FIREBASE_SERVICE_ACCOUNT };
  try {
    require('firebase-admin/app');
    out.load = 'ok';
  } catch (err) {
    out.load = `falhou (${err.code || err.name})`;
    return out;
  }
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
    out.json = parsed && parsed.private_key && parsed.client_email ? 'ok' : 'faltam campos';
  } catch {
    out.json = 'inválido';
    return out;
  }
  try {
    firebaseAdmin();
    out.init = 'ok';
  } catch (err) {
    out.init = `falhou (${err.code || err.name})`;
  }
  return out;
}

module.exports = { firebaseAdmin, adminHealth };
