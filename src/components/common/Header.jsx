import React from 'react';
import { useOrder } from '../../context/OrderContext';
import { Monitor, ChefHat, ExternalLink, BarChart3, ShieldCheck, Bike, LogOut } from 'lucide-react';

export const Header = () => {
  const { currentView, setCurrentView, orders, dbStatus, storeSettings, staffUser, logoutStaffUser } = useOrder();

  const pendingBalcaoCount = orders.filter(o => o.status === 'aguardando_pagamento').length;
  const kitchenActiveCount = orders.filter(o => o.status === 'pagamento_confirmado' || o.status === 'em_preparo').length;
  const motoboyCount = orders.filter(o => o.deliveryType === 'delivery' && (o.status === 'pronto' || o.status === 'saiu_para_entrega')).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-md p-0.5">
              {storeSettings?.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-white line-clamp-1 max-w-[180px] sm:max-w-xs">
                  {storeSettings?.restaurantName || 'SDG Gestor'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase">
                  Gestão
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Painel interno do restaurante</div>
            </div>
          </div>

          {/* Navigation Tabs for Staff */}
          <nav className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            
            {/* View: Balcão / Caixa */}
            <button
              onClick={() => setCurrentView('counter')}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                currentView === 'counter'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Balcão</span>
              {pendingBalcaoCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                  {pendingBalcaoCount}
                </span>
              )}
            </button>

            {/* View: Cozinha / KDS (Acesso Balcão e Administrador) */}
            {(staffUser?.role === 'admin' || staffUser?.role === 'balcao') && (
              <button
                onClick={() => setCurrentView('kitchen')}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'kitchen'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Cozinha</span>
                {kitchenActiveCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black bg-blue-500 text-white rounded-full">
                    {kitchenActiveCount}
                  </span>
                )}
              </button>
            )}

            {/* View: Motoboy / Entregas (Apenas Administrador) */}
            {staffUser?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('motoboy')}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'motoboy'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Motoboy</span>
                {motoboyCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black bg-emerald-500 text-slate-950 rounded-full animate-pulse">
                    {motoboyCount}
                  </span>
                )}
              </button>
            )}

            {/* View: Painel do Gestor (Apenas Administrador Root) */}
            {staffUser?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </nav>

          {/* Right actions: Online Status & Customer Menu Link */}
          <div className="flex items-center space-x-2.5">
            {/* Clean Business Status Indicator */}
            {dbStatus === 'connected' && (
              <div
                className="hidden md:flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                title="Sistema conectado e sincronizando em tempo real"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sistema Online</span>
              </div>
            )}

            {dbStatus === 'connecting' && (
              <div
                className="hidden md:flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Conectando...</span>
              </div>
            )}

            {/* Open Customer Menu in New Tab */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 transition-all shadow-sm"
              title="Abrir o cardápio que os clientes veem no WhatsApp em outra aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cardápio do Cliente</span>
            </a>

            {/* Identificação do Root e Botão de Sair */}
            {staffUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-black text-white leading-tight truncate max-w-[120px]">
                    {staffUser.name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    staffUser.role === 'admin' ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {staffUser.role === 'admin' ? '👑 Root (Admin)' : '🖥️ Balcão / Caixa'}
                  </span>
                </div>

                <button
                  onClick={logoutStaffUser}
                  className="flex items-center space-x-1.5 text-xs font-bold px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all shadow-sm"
                  title="Sair e bloquear as telas de gestão"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
