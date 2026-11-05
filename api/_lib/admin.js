// Firebase Admin para as funções da Vercel. A chave da conta de serviço fica
// na variável de ambiente FIREBASE_SERVICE_ACCOUNT (o JSON inteiro), nunca no git.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

const DB_URL = (process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://votasnap-default-rtdb.firebaseio.com').replace(/\/$/, '');

function firebaseAdmin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT não está configurada na Vercel.');
    initializeApp({ credential: cert(JSON.parse(raw)), databaseURL: DB_URL });
  }
  return { auth: getAuth(), db: getDatabase() };
}

module.exports = { firebaseAdmin };
