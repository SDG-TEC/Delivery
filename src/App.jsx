import React from 'react';
import { OrderProvider, useOrder } from './context/OrderContext';
import { Header } from './components/common/Header';
import { PrintTicket } from './components/common/PrintTicket';
import { ClientView } from './components/client/ClientView';
import { CounterView } from './components/counter/CounterView';
import { KitchenView } from './components/kitchen/KitchenView';
import { AdminView } from './components/admin/AdminView';
import { MotoboyView } from './components/motoboy/MotoboyView';
import { StaffLoginView } from './components/auth/StaffLoginView';

import { Printer, X, ShieldAlert, Bike, LogOut, ArrowRight } from 'lucide-react';

const AppContent = () => {
  const {
    currentView,
    setCurrentView,
    staffUser,
    isRoot,
    isMotoboy,
    logoutStaffUser,
    printerToast,
    closePrinterToast
  } = useOrder();

  // Guarda de Rotas e Telas Restritas
  const renderCurrentView = () => {
    // 1. ÁREA PÚBLICA DO CLIENTE (Cardápio / Pedidos / Acompanhamento)
    if (currentView === 'client') {
      return <ClientView />;
    }

    // 2. TELAS DE GESTÃO / BALCÃO / COZINHA / ADMIN (Requer Acesso Root)
    if (currentView === 'counter' || currentView === 'kitchen' || currentView === 'admin') {
      // Se não estiver logado, exige login de Balcão ou Admin
      if (!staffUser) {
        return <StaffLoginView initialRole={currentView === 'admin' ? 'admin' : 'counter'} onCancel={() => setCurrentView('client')} />;
      }

      // Se estiver logado como Motoboy, bloqueio total de acesso ao Balcão/Cozinha/Admin
      if (isMotoboy || staffUser?.role === 'motoboy') {
        return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 ring-1 ring-rose-500/20">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 tracking-wider">
                  Bloqueio de Segurança (RBAC)
                </span>
                <h2 className="text-xl font-black text-white mt-2">Área Restrita ao Balcão / Caixa</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Você está autenticado como <b className="text-emerald-400">{staffUser.name}</b> com o perfil de <b>Entregador (Motoboy)</b>. 
                  Por conformidade de segurança e controle de caixa, entregadores não possuem autorização para acessar o Balcão, Cozinha, Caixa ou Usuários.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setCurrentView('motoboy')}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
                >
                  <Bike className="w-4 h-4" />
                  <span>Ir para meu Painel de Entregas</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>

                <button
                  onClick={logoutStaffUser}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Trocar de Conta / Sair</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Validação refinada de papéis por tela
      if (currentView === 'counter') return <CounterView />;

      if (currentView === 'kitchen') return <KitchenView />;

      if (currentView === 'admin') {
        if (staffUser?.role !== 'admin') {
          return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Acesso Restrito
                  </span>
                  <h2 className="text-xl font-black text-white mt-2">Painel de Configuração Avançada</h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Você está conectado como <b>{staffUser.name}</b> (Operador de Balcão). O painel de administração geral é restrito ao <b>Administrador</b>.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('counter')}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <span>Voltar para o Balcão</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          );
        }
        return <AdminView />;
      }
    }

    // 3. TELA DO MOTOBOY (Requer login de Motoboy ou Admin)
    if (currentView === 'motoboy') {
      if (!staffUser) {
        return <StaffLoginView initialRole="motoboy" onCancel={() => setCurrentView('client')} />;
      }
      if (staffUser?.role === 'balcao') {
        return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Acesso Restrito
                </span>
                <h2 className="text-xl font-black text-white mt-2">Painel de Entregas Motoboy</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Você está conectado como <b>{staffUser.name}</b> (Operador de Balcão). O acesso ao painel de entregas é exclusivo para Motoboys e Administradores.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('counter')}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <span>Voltar para o Balcão</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        );
      }
      return <MotoboyView />;
    }

    // Fallback padrão: Cardápio do Cliente
    return <ClientView />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* O menu de gestão/equipe só aparece para a equipe autenticada no computador (Balcão, Cozinha, Admin) */}
      {isRoot && currentView !== 'client' && currentView !== 'motoboy' && <Header />}

      <main className="flex-1">
        {renderCurrentView()}
      </main>

      <PrintTicket />

      {/* Notificação Toast Flutuante de Impressão Térmica Elgin i8 */}
      {printerToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border shadow-2xl max-w-md ${
            printerToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : printerToast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/95 border-amber-500/40 text-amber-200'
          }`}>
            <Printer className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-snug">{printerToast.message}</p>
            <button
              onClick={closePrinterToast}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <OrderProvider>
      <AppContent />
    </OrderProvider>
  );
}
