import { PlusCircle, ListChecks, Users, Flag, Trophy, LayoutDashboard, FlaskConical, Building2 } from 'lucide-react';
import { ENABLE_MOCK } from '../config';

// `badge` indica que métrica do dashboard mostrar ao lado do item.
export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cc', label: 'Criar Desafio', icon: PlusCircle },
  { path: '/cl', label: 'Desafios', icon: ListChecks, badge: 'activeChallengesCount' },
  { path: '/marcas', label: 'Marcas', icon: Building2, badge: 'dealsPendingCount', alert: true },
  { path: '/wc', label: 'Vencedores', icon: Trophy, badge: 'winnersPendingCount', alert: true },
  { path: '/mc', label: 'Moderação', icon: Flag, badge: 'pendingReportsCount', alert: true },
  { path: '/ul', label: 'Utilizadores', icon: Users },
  ...(ENABLE_MOCK ? [{ path: '/mock', label: 'Mock Data', icon: FlaskConical }] : []),
];
