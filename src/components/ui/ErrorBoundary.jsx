import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Sem isto, um erro em qualquer ecrã deixava o painel inteiro em branco.
// `resetKey` (ex.: o caminho actual) limpa o erro ao mudar de página.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro no painel:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const outdated = /dynamically imported module|Importing a module script|preload/i.test(error?.message || '');
    return (
      <div role="alert" className="max-w-lg mx-auto my-16 p-6 text-center bg-ink-900 border border-white/10 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="text-white font-semibold">
          {outdated ? 'Há uma versão nova do painel' : 'Esta página não abriu'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {outdated ? 'Recarrega para continuar.' : (error?.message || 'Ocorreu um erro inesperado.')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white text-sm font-semibold"
        >
          <RotateCw className="w-4 h-4" /> Recarregar
        </button>
      </div>
    );
  }
}
