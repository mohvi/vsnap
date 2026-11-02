import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAdmin from './RequireAdmin';

const authState = { status: 'loading', user: null, logout: vi.fn() };
vi.mock('./AuthProvider', () => ({ useAuth: () => authState }));

function renderAt(status, user = null) {
  Object.assign(authState, { status, user });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<RequireAdmin><p>painel</p></RequireAdmin>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAdmin', () => {
  it('mostra loader enquanto verifica a sessão', () => {
    renderAt('loading');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('painel')).not.toBeInTheDocument();
  });

  it('redirecciona para /login sem sessão', () => {
    renderAt('signedOut');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('bloqueia contas sem claim admin', () => {
    renderAt('forbidden', { email: 'x@y.com' });
    expect(screen.getByText('Sem permissão')).toBeInTheDocument();
    expect(screen.queryByText('painel')).not.toBeInTheDocument();
  });

  it('mostra o painel a admins', () => {
    renderAt('admin', { email: 'admin@y.com' });
    expect(screen.getByText('painel')).toBeInTheDocument();
  });
});
