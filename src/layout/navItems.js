import {
  PlusCircle, ListChecks, Users, Flag, Trophy, LayoutDashboard, FlaskConical, Building2, ScrollText, UserPlus,
} from 'lucide-react';
import { ENABLE_MOCK } from '../config';

// `badge` indica que métrica do dashboard mostrar ao lado do item.
export const NAV_GROUPS = [
  {
    label: 'Visão geral',
    items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Conteúdo',
    items: [
      { path: '/cc', label: 'Criar desafio', icon: PlusCircle },
      { path: '/cl', label: 'Desafios', icon: ListChecks, badge: 'activeChallengesCount' },
      { path: '/wc', label: 'Vencedores', icon: Trophy, badge: 'winnersPendingCount', alert: true },
      { path: '/mc', label: 'Moderação', icon: Flag, badge: 'pendingReportsCount', alert: true },
      { path: '/convites', label: 'Convites', icon: UserPlus },
    ],
  },
  {
    label: 'Negócio',
    items: [{ path: '/marcas', label: 'Marcas', icon: Building2, badge: 'dealsPendingCount', alert: true }],
  },
  {
    label: 'Comunidade',
    items: [
      { path: '/ul', label: 'Utilizadores', icon: Users, badge: 'expiredBansCount', alert: true },
      { path: '/auditoria', label: 'Registo de acções', icon: ScrollText },
    ],
  },
  ...(ENABLE_MOCK ? [{ label: 'Desenvolvimento', items: [{ path: '/mock', label: 'Mock Data', icon: FlaskConical }] }] : []),
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Item de navegação a que pertence um caminho (ex.: /ul/abc → Utilizadores).
export function findNavItem(pathname) {
  return NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)) || null;
}
