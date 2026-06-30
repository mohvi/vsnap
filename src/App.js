import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  PlusCircle, ListChecks, Users, Flag, Trophy, LayoutDashboard,
  Sparkles, ChevronLeft, ChevronRight, LogOut, Settings,
  Bell, Zap, Crown, TrendingUp, Activity, Shield,
  ArrowUpRight, ArrowDownRight, MoreVertical, Star,
  Award, Clock, Eye, DollarSign, AlertCircle
} from 'lucide-react';
import CreateChallengeForm from './components/CreateChallengeForm';
import ChallengesList from './components/ChallengesList';
import UsersList from './components/UsersList';
import ModerationPanel from './components/ModerationPanel';
import WinnersConfirmation from './components/WinnersConfirmation';
import RedirectToApp from './components/RedirectToApp';
import { useDashboardData, timeAgo } from './components/useDashboardData';

// ============================================================
// 1. CONFIGURAÇÃO DOS ITENS DE NAVEGAÇÃO
// ============================================================
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cc', label: 'Criar Desafio', icon: PlusCircle },
  { path: '/cl', label: 'Desafios', icon: ListChecks },
  { path: '/wc', label: 'Vencedores', icon: Trophy },
  { path: '/mc', label: 'Moderação', icon: Flag },
  { path: '/ul', label: 'Utilizadores', icon: Users },
];

// ============================================================
// 2. COMPONENTE SIDEBAR - DESIGN PREMIUM
// ============================================================
function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  // Stats reais para o mini-resumo do sidebar (em vez dos números fixos 1.2k / 12)
  const { totalUsers, activeChallengesCount } = useDashboardData();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div 
      className={`
        fixed left-0 top-0 h-screen 
        bg-[#0A0A12] border-r border-white/5
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        flex flex-col z-50
        ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}
      `}
    >
      {/* Efeito de brilho superior */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col h-full">
        {/* HEADER */}
        <div className={`
          flex items-center px-4 py-5 border-b border-white/5
          ${isCollapsed ? 'justify-center' : 'justify-between'}
        `}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-lg tracking-tight">
                  Vota<span className="text-purple-400">Snap</span>
                </span>
                <span className="block text-[10px] text-purple-400/60 font-medium uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}
          
          <button
            onClick={toggleSidebar}
            className={`
              text-gray-500 hover:text-white transition-all duration-200
              hover:bg-white/5 rounded-lg p-1.5
              ${isCollapsed ? 'absolute -right-3 top-6 bg-[#0A0A12] border border-white/5' : ''}
            `}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* STATS MINI (quando colapsado) */}
        {isCollapsed && (
          <div className="px-3 py-3 border-b border-white/5 flex flex-col gap-2">
            <div className="w-full h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="w-full h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        )}

        {/* STATS PREVIEW (expandido) — agora com dados reais do Firebase */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-white text-sm font-semibold">{totalUsers}</span>
                </div>
                <span className="text-[10px] text-gray-500">Utilizadores</span>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-white text-sm font-semibold">{activeChallengesCount}</span>
                </div>
                <span className="text-[10px] text-gray-500">Desafios</span>
              </div>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-200
                    relative
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/10 text-white border border-purple-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                    ${isCollapsed ? 'justify-center px-2' : ''}
                  `}
                >
                  {/* Indicador de ativo */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full" />
                  )}

                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'group-hover:text-white'}`} />
                    {item.path === '/mc' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.path === '/cl' && (
                        <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full font-semibold">
                          {activeChallengesCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* FOOTER - PERFIL ADMIN */}
        <div className={`
          border-t border-white/5 p-3
          ${isCollapsed ? 'flex justify-center' : ''}
        `}>
          <div className={`
            flex items-center gap-3 rounded-xl p-2
            hover:bg-white/5 transition-colors duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-600/25">
                AD
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A12]" />
            </div>
            
            {!isCollapsed && (
              <>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Administrador</p>
                  <p className="text-gray-500 text-xs">admin@votasnap.com</p>
                </div>
                <button className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 3. COMPONENTE DASHBOARD - PÁGINA INICIAL (dados reais do Firebase)
// ============================================================
function DashboardStats() {
  const {
    loading,
    totalUsers,
    activeUsers,
    activeChallengesCount,
    totalVotes,
    totalSnapsDistributed,
    endingSoonCount,
    winnersPendingCount,
    entriesToModerateCount,
    recentActivity,
  } = useDashboardData();

  // Cards de estatísticas — sem percentagens de variação por agora,
  // porque calcular "+12.5%" exige guardar um snapshot histórico
  // (ex: stats_daily/{date}) que ainda não existe no schema.
  // Mostramos o valor actual real e tiramos o "trend" inventado.
  const stats = [
    { title: 'Utilizadores Activos', value: activeUsers, total: totalUsers, icon: Users, color: 'blue' },
    { title: 'Desafios em Curso', value: activeChallengesCount, icon: Clock, color: 'yellow' },
    { title: 'Votos Totais', value: totalVotes, icon: Eye, color: 'green' },
    { title: 'Snaps distribuídos', value: totalSnapsDistributed, icon: DollarSign, color: 'purple', note: 'moeda interna — não é MZN' },
  ];

  const getIcon = (type) => {
    switch(type) {
      case 'vote': return <Eye className="w-4 h-4 text-blue-400" />;
      case 'entry': return <PlusCircle className="w-4 h-4 text-green-400" />;
      case 'create': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'win': return <Crown className="w-4 h-4 text-purple-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">A carregar dados do Firebase...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-400" />
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Bem-vindo de volta! Aqui está o resumo da sua plataforma.
          </p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Link
            to="/cc"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium text-sm shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-300 hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Desafio
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorMap = {
            blue: 'from-blue-600 to-cyan-500',
            yellow: 'from-yellow-500 to-orange-500',
            green: 'from-green-500 to-emerald-500',
            purple: 'from-purple-600 to-pink-600',
          };

          return (
            <div 
              key={index}
              className="bg-[#14141F] border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <p className="text-white text-2xl font-bold mt-1">
                    {stat.value}{stat.total ? <span className="text-gray-500 text-sm font-normal"> / {stat.total}</span> : ''}
                  </p>
                  {stat.note && (
                    <p className="text-[10px] text-gray-500 mt-1">{stat.note}</p>
                  )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} bg-opacity-10`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ATIVIDADE RECENTE + ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividade — derivada de votes/, entries/ e challenges/ reais */}
        <div className="lg:col-span-2 bg-[#14141F] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Actividade Recente
            </h3>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">
              Ao vivo
            </span>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">Sem actividade ainda.</p>
            )}
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/[0.07] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-medium">@{item.username}</span>
                    <span className="text-gray-400"> {item.action}</span>
                  </p>
                  <p className="text-gray-500 text-xs">{timeAgo(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas — desafios a terminar é real; moderação e prémios
            dependem de campos que ainda faltam no schema (ver hook) */}
        <div className="bg-[#14141F] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-yellow-400" />
            Alertas
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{endingSoonCount} desafio(s) a terminar</p>
                  <p className="text-gray-400 text-xs">Menos de 24h restantes</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-red-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{entriesToModerateCount} entrada(s) para moderar</p>
                  <p className="text-gray-400 text-xs">
                    {entriesToModerateCount === 0 ? "Campo 'reported' ainda não existe em entries/" : 'Revisão necessária'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{winnersPendingCount} vencedor(es) a confirmar prémio</p>
                  <p className="text-gray-400 text-xs">Baseado em completed sem campo prizePaid</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 4. COMPONENTE PRINCIPAL APP
// ============================================================
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0A0A12] text-white font-sans antialiased">
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT - com margem para o sidebar */}
        <div className="lg:ml-[280px] min-h-screen transition-all duration-300">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardStats />} />
            <Route path="/cc" element={<CreateChallengeForm />} />
            <Route path="/cl" element={<ChallengesList />} />
            <Route path="/ul" element={<UsersList />} />
            <Route path="/wc" element={<WinnersConfirmation />} />
            <Route path="/mc" element={<ModerationPanel />} />
            <Route path="/entry/:challengeId/:entryId" element={<RedirectToApp />} />
            <Route path="/challenge/:challengeId" element={<RedirectToApp />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;