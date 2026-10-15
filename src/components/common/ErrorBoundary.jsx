import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isTranslationError =
        this.state.error?.message?.includes('removeChild') ||
        this.state.error?.message?.includes('insertBefore');

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black text-white">
              {isTranslationError ? 'Aviso de Tradutor do Navegador' : 'Opa! Algo inesperado aconteceu'}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isTranslationError ? (
                <>
                  O <b>Tradutor automático do Google Chrome</b> ou uma extensão modificou o texto da tela e causou um conflito no React (<code className="text-amber-400 font-mono text-[11px]">removeChild</code>).
                  <br /><br />
                  💡 <b>Como resolver:</b> Desative a opção <i>"Traduzir esta página"</i> no ícone ao lado da barra de endereço do Chrome e clique no botão abaixo.
                </>
              ) : (
                this.state.error?.message || 'Ocorreu um erro temporário na renderização da página.'
              )}
            </p>

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
