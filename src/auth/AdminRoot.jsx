import { Outlet } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import RequireAdmin from './RequireAdmin';
import { AdminDataProvider } from '../data/AdminDataProvider';
import AdminLayout from '../layout/AdminLayout';

// Raiz de tudo o que precisa de Firebase Auth (login + painel). Fica num
// chunk separado para que as páginas públicas não carreguem o SDK.
export function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function AdminShell() {
  return (
    <RequireAdmin>
      <AdminDataProvider>
        <AdminLayout />
      </AdminDataProvider>
    </RequireAdmin>
  );
}

// Páginas de admin sem menu nem barra de topo (relatórios para imprimir/PDF).
export function AdminBareShell() {
  return (
    <RequireAdmin>
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </RequireAdmin>
  );
}
