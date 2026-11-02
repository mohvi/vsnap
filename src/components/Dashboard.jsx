import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, Users, Clock, Eye, Activity, Bell, AlertCircle, Shield, Award, Zap, Crown, ChevronRight,
  Building2, Wallet, UserCheck, MapPin, Trophy, Ban, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { PERIODS, computeGrowth } from '../data/growth';
import { formatNumber, timeAgo } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import Card from './ui/Card';
import BarChart from './ui/BarChart';
import EmptyState from './ui/EmptyState';

const PERIOD_KEY = 'votasnap.dashboardPeriod';

const ACTIVITY_ICONS = {
  vote: <Eye className="w-4 h-4 text-sky-400" />,
  entry: <PlusCircle className="w-4 h-4 text-green-400" />,
  create: <Zap className="w-4 h-4 text-yellow-400" />,
  win: <Crown className="w-4 h-4 text-brand-400" />,
};

function readPeriod() {
  try {
    const v = Number(localStorage.getItem(PERIOD_KEY));
    return PERIODS.includes(v) ? v : 30;
  } catch {
    return 30;
  }
}

const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
};

const toBars = (series) => series.map((p) => ({ key: p.day, label: dayLabel(p.day), value: p.count }));

function Change({ value }) {
  if (value == null) return <span className="text-gray-500">sem comparação</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-green-400' : 'text-red-400'}`}>
      <Icon className="w-3 h-3" />{up ? '+' : ''}{value}%
    </span>
  );
}

function AlertCard({ to, tone, icon: Icon, title, subtitle }) {
  const tones = {
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    brand: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
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

function PeriodPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Período" className="inline-flex p-1 rounded-xl bg-white/5 border border-white/5">
      {PERIODS.map((d) => (
        <button
          key={d}
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${value === d ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          {d} dias
        </button>
      ))}
    </div>
  );
}

function ChartCard({ title, total, change, children }) {
  return (
    <Card
      title={title}
      actions={total != null && (
        <div className="text-right text-xs">
          <p className="text-white text-base font-bold tabular-nums">{formatNumber(total)}</p>
          <Change value={change} />
        </div>
      )}
    >
      {children}
    </Card>
  );
}

function RankList({ items, empty }) {
  if (items.length === 0) return <p className="text-gray-500 text-sm py-4 text-center">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key}>
          <div className="flex items-center justify-between gap-3 text-sm mb-1">
            <span className="text-gray-300 truncate"><span className="text-gray-500 mr-2 tabular-nums">{i + 1}.</span>{item.label}</span>
            <span className="text-white font-medium tabular-nums flex-shrink-0">{formatNumber(item.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Dashboard() {
  const data = useAdminData();
  const { loading, metrics } = data;
  const [period, setPeriodState] = useState(readPeriod);

  const setPeriod = (d) => {
    setPeriodState(d);
    try { localStorage.setItem(PERIOD_KEY, String(d)); } catch { /* storage indisponível */ }
  };

  const growth = useMemo(
    () => computeGrowth(data, period),
    // Só os nós usados — `data` muda de referência com qualquer nó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.users, data.entries, data.votes, data.reports, data.challenges, data.challengeDeals, period],
  );

  if (loading) return <PageLoader label="A carregar dados do Firebase..." />;

  const alerts = [
    metrics.endingSoonCount > 0 && <AlertCard key="ending" to="/cl" tone="yellow" icon={AlertCircle} title={`${metrics.endingSoonCount} desafio(s) a terminar`} subtitle="Menos de 24h restantes" />,
    metrics.pendingReportsCount > 0 && <AlertCard key="reports" to="/mc" tone="red" icon={Shield} title={`${metrics.pendingReportsCount} denúncia(s) por moderar`} subtitle="Revisão necessária" />,
    metrics.winnersPendingCount > 0 && <AlertCard key="winners" to="/wc" tone="brand" icon={Award} title={`${metrics.winnersPendingCount} vencedor(es) por confirmar`} subtitle="Desafios a aguardar confirmação" />,
    metrics.dealsPendingCount > 0 && <AlertCard key="deals" to="/marcas" tone="yellow" icon={Building2} title={`${formatNumber(metrics.dealsPendingMzn)} MZN por receber`} subtitle={`${metrics.dealsPendingCount} acordo(s) com marcas por pagar`} />,
    metrics.expiredBansCount > 0 && <AlertCard key="bans" to="/ul" tone="red" icon={Ban} title={`${metrics.expiredBansCount} banimento(s) expirado(s)`} subtitle="Contas ainda bloqueadas na app" />,
  ].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumo da plataforma em tempo real."
        actions={(
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            <Link
              to="/cc"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 rounded-xl text-white font-medium text-sm shadow-lg shadow-brand-600/25"
            >
              <PlusCircle className="w-4 h-4" />
              Novo desafio
            </Link>
          </>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Utilizadores"
          value={metrics.totalUsers}
          icon={Users}
          tone="blue"
          to="/ul"
          hint={<>+{formatNumber(growth.totals.signups.current)} em {period} dias · <Change value={growth.totals.signups.change} /></>}
        />
        <StatCard
          title="Activos (30 dias)"
          value={growth.mau}
          icon={UserCheck}
          tone="green"
          hint={`${formatNumber(growth.dau)} hoje · ${formatNumber(growth.wau)} esta semana`}
        />
        <StatCard
          title="Desafios em curso"
          value={metrics.activeChallengesCount}
          icon={Clock}
          tone="yellow"
          to="/cl"
          hint={`${metrics.activeSponsoredCount} patrocinado(s)`}
        />
        <StatCard
          title="Recebido de marcas"
          value={metrics.dealsReceivedMzn}
          suffix=" MZN"
          icon={Wallet}
          tone="brand"
          to="/marcas"
          hint={`${metrics.activeSponsorsCount} marca(s) activa(s)`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card title="Envolvimento" icon={Activity} className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Retenção a 7 dias</p>
              <p className="text-white text-3xl font-bold mt-1 tabular-nums">{growth.retention7 == null ? '—' : `${growth.retention7}%`}</p>
              <p className="text-gray-500 text-xs mt-1">
                {growth.retentionCohort
                  ? `De ${formatNumber(growth.retentionCohort)} registados há 7+ dias, voltaram depois da primeira semana`
                  : 'Ainda sem registos com 7 dias neste período'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Utilizadores que publicam</p>
              <p className="text-white text-3xl font-bold mt-1 tabular-nums">{growth.postingRate}%</p>
              <p className="text-gray-500 text-xs mt-1">Têm pelo menos uma publicação</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Votos por publicação</p>
              <p className="text-white text-3xl font-bold mt-1 tabular-nums">
                {growth.totals.entries.current ? (growth.totals.votes.current / growth.totals.entries.current).toFixed(1) : '—'}
              </p>
              <p className="text-gray-500 text-xs mt-1">Nos últimos {period} dias</p>
            </div>
          </div>
        </Card>

        <Card title="Alertas" icon={Bell} iconClass="text-yellow-400">
          {alerts.length ? <div className="space-y-3">{alerts}</div> : (
            <EmptyState icon={Bell} title="Tudo em dia" hint="Sem acções pendentes." />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Novos utilizadores por dia" total={growth.totals.signups.current} change={growth.totals.signups.change}>
          <BarChart data={toBars(growth.series.signups)} valueLabel="Registos" xLabel="dia" />
        </ChartCard>
        <ChartCard title="Publicações por dia" total={growth.totals.entries.current} change={growth.totals.entries.change}>
          <BarChart data={toBars(growth.series.entries)} valueLabel="Publicações" xLabel="dia" />
        </ChartCard>
        <ChartCard title="Votos por dia" total={growth.totals.votes.current} change={growth.totals.votes.change}>
          <BarChart data={toBars(growth.series.votes)} valueLabel="Votos" xLabel="dia" />
        </ChartCard>
        <ChartCard title="Receita das marcas por mês (MZN)" total={growth.revenue.reduce((s, m) => s + m.amount, 0)}>
          <BarChart
            data={growth.revenue.map((m) => ({ key: m.month, label: m.label, value: m.amount, tooltip: m.month }))}
            valueLabel="MZN"
            xLabel="mês"
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card title="Províncias com mais utilizadores" icon={MapPin}>
          <RankList items={growth.topProvinces.map((p) => ({ key: p.code, label: p.name, value: p.count }))} empty="Sem províncias registadas." />
        </Card>
        <Card title="Desafios com mais participação" icon={Trophy}>
          <RankList
            items={growth.topChallenges.map((c) => ({ key: c.id, label: c.title, value: c.participants }))}
            empty={`Sem desafios nos últimos ${period} dias.`}
          />
        </Card>
        <Card title="Actividade recente" icon={Activity} actions={<span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Ao vivo</span>}>
          {metrics.recentActivity.length === 0 ? <p className="text-gray-500 text-sm text-center py-6">Sem actividade ainda.</p> : (
            <ul className="space-y-2">
              {metrics.recentActivity.map((item, i) => (
                <li key={`${item.type}-${item.timestamp}-${i}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {ACTIVITY_ICONS[item.type] || <Activity className="w-4 h-4 text-gray-400" />}
                  </div>
                  <p className="flex-1 min-w-0 text-white text-sm truncate">
                    <span className="font-medium">@{item.username}</span>
                    <span className="text-gray-400"> {item.action}</span>
                  </p>
                  <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
