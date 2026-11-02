import { auth } from '../fb';

// Pedidos autenticados à API (Cloud Function votasnapApi) com o token do admin.
export async function adminRequest(path, body) {
  const base = import.meta.env.REACT_APP_BACKEND_URL?.replace(/\/$/, '');
  if (!base || (import.meta.env.PROD && !base.startsWith('https://'))) {
    throw new Error('Configura REACT_APP_BACKEND_URL com o endereço HTTPS da API.');
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada.');
  const token = await user.getIdToken();
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro no servidor.');
  return data;
}
