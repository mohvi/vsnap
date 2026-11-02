import { Link } from 'react-router-dom';
import {
  PlusCircle, Users, Clock, Eye, Sparkles, Activity, Bell, AlertCircle,
  Shield, Award, Zap, Crown, ChevronRight, Building2, Wallet,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { PageLoader } from './ui/Spinner';
import { formatNumber, timeAgo } from '../utils/format';

const ACTIVITY_ICONS = {
  vote: <Eye className="w-4 h-4 text-blue-400" />,
  entry: <PlusCircle className="w-4 h-4 text-green-400" />,
  create: <Zap className="w-4 h-4 text-yellow-400" />,
  win: <Crown className="w-4 h-4 text-brand-400" />,
};

const GRADIENTS = {
  blue: 'from-blue-600 to-cyan-500',
  yellow: 'from-yellow-500 to-accent-500',
  green: 'from-green-500 to-emerald-500',
  purple: 'from-brand-600 to-accent-600',
};

function AlertCard({ to, tone, icon: Icon, title, subtitle }) {
  const tones = {
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
  };
  return (
    <Link to={to} className={`flex items-start gap-2 p-3 border rounded-xl hover:brightness-125 transition ${tones[tone]}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-gray-400 text-xs">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500 self-center" />
    </Link>
  );
}

export default function Dashboard() {
  const { loading, metrics } = useAdminData();

  if (loading) return <PageLoader label="A carregar dados do Firebase..." />;

  const stats = [
    { title: 'Utilizadores activos', value: metrics.activeUsers, total: metrics.totalUsers, icon: Users, color: 'blue' },
    {
      title: 'Desafios em curso',
      value: metrics.activeChallengesCount,
      icon: Clock,
      color: 'yellow',
      note: `${metrics.activeSponsoredCount} patrocinado(s)`,
    },
    { title: 'Votos totais', value: metrics.totalVotes, icon: Eye, color: 'green' },
    {
      title: 'Recebido de marcas (MZN)',
      value: metrics.dealsReceivedMzn,
      icon: Wallet,
      color: 'purple',
      note: `${metrics.activeSponsorsCount} marca(s) activa(s)`,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-brand-400" />
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Resumo da plataforma em tempo real.</p>
        </div>
        <Link
          to="/cc"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 rounded-xl text-white font-medium text-sm shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-shadow"
        >
          <PlusCircle className="w-4 h-4" />
          Novo desafio
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-ink-900 border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-brand-500/30 transition-colors">
              <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs sm:text-sm">{stat.title}</p>
                  <p className="text-white text-xl sm:text-2xl font-bold mt-1 break-words">
                    {formatNumber(stat.value)}
                    {stat.total != null && <span className="text-gray-500 text-sm font-normal"> / {formatNumber(stat.total)}</span>}
                  </p>
                  {stat.note && <p className="text-[10px] text-gray-500 mt-1">{stat.note}</p>}
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${GRADIENTS[stat.color]} self-start`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 bg-ink-900 border border-white/5 rounded-2xl p-4 sm:p-5 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              Actividade recente
            </h2>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Ao vivo</span>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {metrics.recentActivity.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">Sem actividade ainda.</p>
            )}
            {metrics.recentActivity.map((item, i) => (
              <div key={`${item.type}-${item.timestamp}-${i}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {ACTIVITY_ICONS[item.type] || <Activity className="w-4 h-4 text-gray-400" />}
                </div>
                <p className="flex-1 min-w-0 text-white text-sm break-words">
                  <span className="font-medium">@{item.username}</span>
                  <span className="text-gray-400"> {item.action}</span>
                </p>
                <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(item.timestamp)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink-900 border border-white/5 rounded-2xl p-4 sm:p-5 order-1 lg:order-2">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-yellow-400" />
            Alertas
          </h2>
          <div className="space-y-3">
            <AlertCard to="/cl" tone="yellow" icon={AlertCircle} title={`${metrics.endingSoonCount} desafio(s) a terminar`} subtitle="Menos de 24h restantes" />
            <AlertCard to="/mc" tone="red" icon={Shield} title={`${metrics.pendingReportsCount} denúncia(s) por moderar`} subtitle="Revisão necessária" />
            <AlertCard to="/wc" tone="purple" icon={Award} title={`${metrics.winnersPendingCount} vencedor(es) por confirmar`} subtitle="Desafios a aguardar confirmação" />
            <AlertCard
              to="/marcas"
              tone="yellow"
              icon={Building2}
              title={`${formatNumber(metrics.dealsPendingMzn)} MZN por receber`}
              subtitle={`${metrics.dealsPendingCount} acordo(s) com marcas por pagar`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
