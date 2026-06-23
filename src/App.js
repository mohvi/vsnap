import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  PlusCircle, ListChecks, Users, Flag, Trophy, LayoutDashboard,
} from 'lucide-react';
import CreateChallengeForm from './components/CreateChallengeForm';
import ChallengesList from './components/ChallengesList';
import UsersList from './components/UsersList';
import ModerationPanel from './components/ModerationPanel';
import WinnersConfirmation from './components/WinnersConfirmation';

const NAV_ITEMS = [
  { path: '/cc', label: 'Criar Desafio', icon: PlusCircle },
  { path: '/cl', label: 'Desafios', icon: ListChecks },
  { path: '/wc', label: 'Vencedores', icon: Trophy },
  { path: '/mc', label: 'Moderação', icon: Flag },
  { path: '/ul', label: 'Utilizadores', icon: Users },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-slate-950 border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-purple-500" />
          <span className="text-white font-bold text-lg">VotaSnap Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 text-gray-600 text-xs">
        VotaSnap Admin · 2026
      </div>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="flex bg-black min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/cl" replace />} />
            <Route path="/cc" element={<CreateChallengeForm />} />
            <Route path="/cl" element={<ChallengesList />} />
            <Route path="/ul" element={<UsersList />} />
            <Route path="/wc" element={<WinnersConfirmation />} />
            <Route path="/mc" element={<ModerationPanel />} />
            <Route path="*" element={<Navigate to="/cl" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;