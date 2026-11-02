// Atribui (ou remove) o custom claim `admin` a uma conta Firebase Auth.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run set-admin -- email@exemplo.com
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run set-admin -- email@exemplo.com --remove
//
// A chave de service account obtém-se em Firebase Console → Definições do
// projecto → Contas de serviço → Gerar nova chave privada. NUNCA a commits.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('Uso: npm run set-admin -- <email> [--remove]');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();

const user = await auth.getUserByEmail(email);
const isAdmin = flag !== '--remove';
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: isAdmin });

console.log(`${email} (${user.uid}) → admin: ${isAdmin}`);
console.log('O utilizador tem de terminar sessão e voltar a entrar (ou recarregar o painel) para o claim ter efeito.');
