import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PageLoader } from './components/ui/Spinner';
import { ENABLE_MOCK } from './config';

// Tudo é carregado sob demanda: quem abre /policy ou um deep link não
// descarrega o painel nem o SDK do Firebase.
const AuthRoot = lazy(() => import('./auth/AdminRoot').then((m) => ({ default: m.AuthRoot })));
const AdminShell = lazy(() => import('./auth/AdminRoot').then((m) => ({ default: m.AdminShell })));
const LoginPage = lazy(() => import('./auth/LoginPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const CreateChallengeForm = lazy(() => import('./components/CreateChallengeForm'));
const ChallengesList = lazy(() => import('./components/ChallengesList'));
const UsersList = lazy(() => import('./components/UsersList'));
const ModerationPanel = lazy(() => import('./components/ModerationPanel'));
const WinnersConfirmation = lazy(() => import('./components/WinnersConfirmation'));
const MockDataPanel = lazy(() => import('./components/MockDataPanel'));
const PrivacyPolicy = lazy(() => import('./components/Privacypolicy'));
const AccountDeletion = lazy(() => import('./components/Accountdeletion'));
const RedirectToApp = lazy(() => import('./components/RedirectToApp'));
const SponsorsPage = lazy(() => import('./components/SponsorsPage'));
const SponsorReport = lazy(() => import('./components/SponsorReport'));
const UserDetailPage = lazy(() => import('./components/users/UserDetailPage'));
const AuditLog = lazy(() => import('./components/AuditLog'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          {/* Públicas */}
          <Route path="/policy" element={<PrivacyPolicy />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/eliminar-conta" element={<AccountDeletion />} />
          <Route path="/entry/:challengeId/:entryId" element={<RedirectToApp />} />
          <Route path="/challenge/:challengeId" element={<RedirectToApp />} />

          <Route element={<AuthRoot />}>
            <Route path="/login" element={<LoginPage />} />

            {/* Painel — exige sessão com custom claim admin */}
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cc" element={<CreateChallengeForm />} />
              <Route path="/cl" element={<ChallengesList />} />
              <Route path="/marcas" element={<SponsorsPage />} />
              <Route path="/marcas/:sponsorId" element={<SponsorReport />} />
              <Route path="/ul" element={<UsersList />} />
              <Route path="/ul/:uid" element={<UserDetailPage />} />
              <Route path="/auditoria" element={<AuditLog />} />
              <Route path="/wc" element={<WinnersConfirmation />} />
              <Route path="/mc" element={<ModerationPanel />} />
              {ENABLE_MOCK && <Route path="/mock" element={<MockDataPanel />} />}
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
