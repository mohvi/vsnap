import { User, ListChecks, Building2 } from 'lucide-react';
import { NAV_ITEMS } from './navItems';

const PER_GROUP = 6;

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Resultados agrupados para a pesquisa global (Ctrl+K).
export function searchAll(query, { users = {}, challenges = {}, sponsors = {} }) {
  const q = normalize(query.trim());
  const pages = NAV_ITEMS
    .filter((item) => !q || normalize(item.label).includes(q))
    .map((item) => ({ key: `page:${item.path}`, group: 'Páginas', icon: item.icon, label: item.label, to: item.path }));
  if (!q) return pages;

  const userResults = Object.entries(users)
    .filter(([, u]) => [u.name, u.username, u.phone].some((v) => normalize(v).includes(q)))
    .slice(0, PER_GROUP)
    .map(([uid, u]) => ({
      key: `user:${uid}`, group: 'Utilizadores', icon: User,
      label: u.name || u.username || uid, detail: u.username ? `@${u.username}` : u.phone, to: `/ul/${uid}`,
    }));

  const challengeResults = Object.entries(challenges)
    .filter(([, c]) => normalize(c.title).includes(q))
    .slice(0, PER_GROUP)
    .map(([id, c]) => ({
      key: `challenge:${id}`, group: 'Desafios', icon: ListChecks,
      label: c.title, detail: c.status === 'active' ? 'Activo' : 'Terminado', to: `/cl?q=${encodeURIComponent(c.title)}`,
    }));

  const sponsorResults = Object.entries(sponsors)
    .filter(([, s]) => normalize(s.name).includes(q))
    .slice(0, PER_GROUP)
    .map(([id, s]) => ({ key: `sponsor:${id}`, group: 'Marcas', icon: Building2, label: s.name, to: `/marcas/${id}` }));

  return [...pages, ...userResults, ...challengeResults, ...sponsorResults];
}
