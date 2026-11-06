import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../fb';
import { computeDashboardMetrics } from './metrics';
import { isBanExpired } from './users';
import { unbanUsers } from './actions';
import { errorMessage } from '../utils/runAction';

// Nós do Realtime Database partilhados por todo o painel. Antes cada ecrã
// (e a sidebar) abria os seus próprios listeners sobre os mesmos nós, o que
// descarregava a base de dados várias vezes. Agora há uma única subscrição
// por nó, montada apenas dentro da área autenticada.
const NODES = {
  users: 'users',
  challenges: 'challenges',
  entries: 'entries',
  votes: 'votes',
  snapsHistory: 'snaps_history',
  reports: 'reports',
  sponsors: 'sponsors',
  sponsorPrivate: 'sponsorPrivate',
  challengeDeals: 'challengeDeals',
  inviteCampaigns: 'inviteCampaigns',
  // Quem aceitou ser contactado pela marca de um desafio (relatórios PDF).
  sponsorConsents: 'sponsorConsents',
  company: 'adminSettings/company',
  // Idade e interesses declarados na app (público-alvo e faixas etárias).
  userDemographics: 'userDemographics',
  // Quem tocou em "Avisa-me" num desafio agendado.
  challengeReminders: 'challengeReminders',
  // Entrega dos prémios por desafio e posição (BI verificado, foto, notas).
  prizeDeliveries: 'prizeDeliveries',
};

const AdminDataContext = createContext(null);

const emptyData = Object.fromEntries(Object.keys(NODES).map((k) => [k, {}]));

export function AdminDataProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = Object.entries(NODES).map(([key, path]) =>
      onValue(
        ref(db, path),
        (snap) => {
          setData((prev) => ({ ...prev, [key]: snap.val() || {} }));
          setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
        },
        (err) => {
          console.error(`Erro ao ler ${path}:`, err);
          setError(errorMessage(err));
          setLoaded((prev) => ({ ...prev, [key]: true }));
        },
      ),
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  // Sem Cloud Functions para levantar banimentos temporários: o primeiro admin
  // a abrir o painel depois do prazo levanta-os (uma vez por sessão). A app e
  // as regras já tratam a conta como desbloqueada assim que o prazo passa.
  const autoUnbanDone = useRef(false);
  useEffect(() => {
    if (!loaded.users || autoUnbanDone.current) return;
    autoUnbanDone.current = true;
    const expired = Object.entries(data.users).filter(([, u]) => isBanExpired(u)).map(([uid]) => uid);
    if (expired.length) {
      unbanUsers(expired, { auto: true }).catch((err) => console.warn('Não foi possível levantar banimentos expirados:', err));
    }
  }, [loaded.users, data.users]);

  const loading = Object.keys(NODES).some((k) => !loaded[k]);
  const metrics = useMemo(() => computeDashboardMetrics(data), [data]);

  const value = useMemo(() => ({ ...data, loading, error, metrics }), [data, loading, error, metrics]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData tem de ser usado dentro de <AdminDataProvider>');
  return ctx;
}

