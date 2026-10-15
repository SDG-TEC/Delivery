import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, formatTime, formatDateTime, STATUS_MAP, PAYMENT_METHODS } from '../../utils/formatters';
import {
  Printer, CheckCircle2, AlertCircle, Clock, Search, Filter, Phone, MapPin, DollarSign,
  ChefHat, RefreshCw, Edit3, Bike, ShoppingBag, ArrowRightLeft, QrCode, X, Plus, Navigation,
  Utensils, Users, XCircle, Trash2, Calendar, Sparkles
} from 'lucide-react';
import { OrderEditModal } from '../common/OrderEditModal';
import { PixPaymentCard } from '../common/PixPaymentCard';
import { CounterNewOrderModal } from './CounterNewOrderModal';
import { MotoboyTrackingModal } from './MotoboyTrackingModal';
import { TableManagementView } from './TableManagementView';
import { StaffUsersAdmin } from '../admin/StaffUsersAdmin';
import { CashierManagementModal } from './CashierManagementModal';
import { getActiveCashierShift, CASHIER_EVENT_NAME } from '../../services/cashierService';

export const CounterView = () => {
  const {
    orders,
    tables,
    createCounterOrder,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
    clearOrders,
    triggerPrintTicket,
    editOrder,
    setCurrentView,
    dispatchOrder,
    printerSettings,
    printerStatus,
    checkPrinterConnection,
    printTestTicket,
    storeSettings,
    showPrinterToast,
    motoboyLocations,
    motoboyList,
    staffUser
  } = useOrder();
  const [counterTab, setCounterTab] = useState('orders'); // 'orders' | 'tables'
  const occupiedTablesCount = (tables || []).filter(t => t.status !== 'livre').length;
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [pixOrderModal, setPixOrderModal] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isTrackingMapOpen, setIsTrackingMapOpen] = useState(false);
  const [selectedTrackOrder, setSelectedTrackOrder] = useState(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [cashierActiveShift, setCashierActiveShift] = useState(null);

  // Filtros de Data e Limpeza
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'all'
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('Cliente desistiu');

  React.useEffect(() => {
    const loadShift = async () => {
      try {
        const shift = await getActiveCashierShift();
        setCashierActiveShift(shift);
      } catch (e) {
        console.error('Erro ao verificar turno de caixa:', e);
      }
    };
    loadShift();
    window.addEventListener(CASHIER_EVENT_NAME, loadShift);
    return () => window.removeEventListener(CASHIER_EVENT_NAME, loadShift);
  }, []);

  const handleLaunchCounterOrder = (orderPayload, targetStatus) => {
    const createdOrder = createCounterOrder(orderPayload);

    if (targetStatus === 'pagamento_confirmado') {
      if (autoPrintKitchen && autoPrintCounter) {
        triggerPrintTicket(createdOrder, 'both');
      } else if (autoPrintKitchen) {
        triggerPrintTicket(createdOrder, 'kitchen');
      } else if (autoPrintCounter) {
        triggerPrintTicket(createdOrder, 'counter');
      }

      if (showPrinterToast) {
        showPrinterToast(`🚀 Pedido #${createdOrder.id} lançado na Linha de Produção!`, 'success');
      }
    } else {
      if (showPrinterToast) {
        showPrinterToast(`⏳ Pedido #${createdOrder.id} registrado (Aguardando Pagamento)`, 'info');
      }
    }
  };

  // Verificação estrita da data de HOJE
  const todayStr = new Date().toDateString();
  const isToday = (isoDate) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    return !isNaN(d.getTime()) && d.toDateString() === todayStr;
  };

  // Pedidos estritamente de HOJE
  const todayOrders = orders.filter(o => isToday(o.createdAt || o.created_at));
  // Apenas pedidos válidos (não cancelados) entram no faturamento
  const todayValidOrders = todayOrders.filter(o => o.status !== 'cancelado');
  const todayTotalRevenue = todayValidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Pending payments (waiting counter confirmation)
  const pendingOrders = orders.filter(o => o.status === 'aguardando_pagamento');

  // Filtered orders list (respeitando se o usuário quer ver apenas Hoje ou Todos os Dias)
  const baseOrders = dateFilter === 'today' ? todayOrders : orders;
  const filteredOrders = baseOrders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.customerPhone || '').includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // Auto-print kitchen ticket setting (persisted in localStorage)
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(() => {
    const saved = localStorage.getItem('sdg_autoprint_kitchen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Auto-print counter/client ticket setting (persisted in localStorage)
  const [autoPrintCounter, setAutoPrintCounter] = useState(() => {
    const saved = localStorage.getItem('sdg_autoprint_counter');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleAutoPrintKitchen = () => {
    setAutoPrintKitchen(prev => {
      const next = !prev;
      localStorage.setItem('sdg_autoprint_kitchen', JSON.stringify(next));
      return next;
    });
  };

  const toggleAutoPrintCounter = () => {
    setAutoPrintCounter(prev => {
      const next = !prev;
      localStorage.setItem('sdg_autoprint_counter', JSON.stringify(next));
      return next;
    });
  };

  const handleConfirmPayment = (order) => {
    // 1. Confirm payment -> update status to 'pagamento_confirmado' (sends to kitchen)
    updateOrderStatus(order.id, 'pagamento_confirmado');

    // 2. Trigger print according to toggles:
    if (autoPrintKitchen && autoPrintCounter) {
      triggerPrintTicket(order, 'both');
    } else if (autoPrintKitchen) {
      triggerPrintTicket(order, 'kitchen');
    } else if (autoPrintCounter) {
      triggerPrintTicket(order, 'counter');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Balcão Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Painel do Caixa & Balcão</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Gestão de Pedidos & Pagamentos</h1>
            <p className="text-slate-400 text-sm mt-1">
              Lance novos pedidos no balcão ou confirme o pagamento para enviar comandas à linha de produção da cozinha.
            </p>
          </div>

          {/* Quick Metrics & Auto-Print Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Botão Principal: Lançar Novo Pedido Balcão -> Cozinha */}
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
              title="Lançar um novo pedido no balcão diretamente para a Linha de Produção da cozinha"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Lançar Pedido Balcão</span>
            </button>

            {/* Botão de Limpeza do Balcão / Iniciar Novo Dia */}
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black text-xs transition-all border border-slate-700 shadow-md active:scale-95 cursor-pointer"
              title="Limpar pedidos concluídos do balcão ou zerar para iniciar um novo dia"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>🧹 Limpar Balcão / Novo Dia</span>
            </button>

            {/* Botão de Gestão & Fechamento de Caixa */}
            <button
              type="button"
              onClick={() => setIsCashierModalOpen(true)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 cursor-pointer ${
                cashierActiveShift
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
              }`}
              title="Abrir gestão de caixa, sangrias, suprimentos e fechamento de turno"
            >
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
              <span>{cashierActiveShift ? '💵 Caixa Aberto' : '💵 Abrir Caixa'}</span>
              <span className={`w-2 h-2 rounded-full ${cashierActiveShift ? 'bg-emerald-950 animate-pulse' : 'bg-rose-500'}`}></span>
            </button>
            {/* Status da Impressora Padrão */}
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1 font-bold text-white text-[11px]">
                  <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Impressora Padrão ({printerSettings?.paperWidth || '80mm'})</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  🟢 Pronta para imprimir
                </span>
              </div>
              <button
                type="button"
                onClick={() => printTestTicket()}
                className="ml-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[10px] font-bold transition-all"
                title="Imprimir cupom de teste na impressora Elgin"
              >
                Testar
              </button>
            </div>

            {/* Auto-Print Kitchen Toggle */}
            <div
              onClick={toggleAutoPrintKitchen}
              className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl border cursor-pointer select-none transition-all ${
                autoPrintKitchen
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
              title="Ao marcar, o pagamento confirmado enviará a comanda da cozinha para a Elgin i8"
            >
              <input
                type="checkbox"
                checked={autoPrintKitchen}
                onChange={toggleAutoPrintKitchen}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <div className="text-xs font-bold">
                <div className="flex items-center space-x-1">
                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto Cozinha</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {autoPrintKitchen ? '🟢 Ativado' : '⚪ Desativado'}
                </div>
              </div>
            </div>

            {/* Auto-Print Counter Toggle */}
            <div
              onClick={toggleAutoPrintCounter}
              className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl border cursor-pointer select-none transition-all ${
                autoPrintCounter
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
              title="Ao marcar, o pagamento confirmado emitirá o cupom do balcão/cliente na Elgin i8"
            >
              <input
                type="checkbox"
                checked={autoPrintCounter}
                onChange={toggleAutoPrintCounter}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <div className="text-xs font-bold">
                <div className="flex items-center space-x-1">
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto Balcão</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {autoPrintCounter ? '🟢 Ativado' : '⚪ Desativado'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-xs text-slate-500 uppercase font-bold">Aguardando Pagto</div>
              <div className="text-2xl font-black text-amber-400">{pendingOrders.length}</div>
            </div>

            <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-xs text-slate-500 uppercase font-bold">Total Hoje</div>
              <div className="text-2xl font-black text-emerald-400">
                {formatCurrency(todayTotalRevenue)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">{todayValidOrders.length} pedido(s) faturados</div>
            </div>

            {staffUser?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('motoboy')}
                className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer"
                title="Abrir a tela de entregas dos motoboys"
              >
                <Bike className="w-4 h-4" />
                <span>Painel Motoboy</span>
              </button>
            )}

            {/* Botão Rastreamento GPS / Mapa ao Vivo */}
            <button
              type="button"
              onClick={() => {
                setSelectedTrackOrder(null);
                setIsTrackingMapOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-300 hover:bg-blue-500 hover:text-white font-bold text-xs transition-all shadow-md cursor-pointer relative"
              title="Abrir mapa de rastreamento de motoboys em tempo real"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Mapa GPS</span>
              {motoboyList && motoboyList.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2"></span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs: Pedidos vs Mesas */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCounterTab('orders')}
              className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                counterTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pedidos Caixa & Delivery</span>
              {pendingOrders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  counterTab === 'orders' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {pendingOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCounterTab('tables')}
              className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                counterTab === 'tables'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Controle de Mesas (Salão)</span>
              {occupiedTablesCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  counterTab === 'tables' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {occupiedTablesCount} {occupiedTablesCount === 1 ? 'ocupada' : 'ocupadas'}
                </span>
              )}
            </button>

            {staffUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setCounterTab('users')}
                className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  counterTab === 'users'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Gestão de Usuários</span>
              </button>
            )}
          </div>
        </div>

        {counterTab === 'tables' ? (
          <TableManagementView />
        ) : (counterTab === 'users' && staffUser?.role === 'admin') ? (
          <StaffUsersAdmin />
        ) : (
          <>
            {/* SECTION 1: URGENT PENDING PAYMENTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Solicitações Aguardando Caixa ({pendingOrders.length})</span>
            </h2>
            {pendingOrders.length > 0 && (
              <span className="text-xs font-bold text-amber-400 animate-pulse">
                • Novos pedidos aguardando ação no balcão
              </span>
            )}
          </div>

          {pendingOrders.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Nenhum pedido aguardando confirmação no balcão no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all relative overflow-hidden"
                >
                  {/* Top Badge */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-black text-amber-400">{order.id}</span>
                        <span className="text-xs text-slate-400 font-semibold">{formatTime(order.createdAt)}</span>
                      </div>
                      <h3 className="font-extrabold text-white text-base mt-0.5 flex items-center gap-1">
                        {order.customerName}
                        {order.isBot && <span title="Pedido automatizado via Robô/WhatsApp">🤖</span>}
                      </h3>
                      <p className="text-xs text-slate-400">{order.customerPhone}</p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-md uppercase">
                      Aguardando Pagamento
                    </span>
                  </div>

                  {/* Delivery Info */}
                  <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-slate-300">
                      TIPO: {order.deliveryType === 'delivery' ? '🛵 DELIVERY' : '🛍️ RETIRADA'}
                    </div>
                    {order.deliveryType === 'delivery' && (
                      <div className="text-slate-400 truncate">End: {order.address}</div>
                    )}
                    <div className="text-amber-400 font-bold">
                      FORMA PAGTO: {PAYMENT_METHODS[order.paymentMethod]?.label || order.paymentMethod}
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1.5 border-t border-b border-slate-800/80 py-3 text-xs">
                    <div className="font-bold text-slate-400 uppercase text-[10px]">Itens Solicitados:</div>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-200">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-bold">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    {order.observation && (
                      <p className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-lg mt-2">
                        Obs: {order.observation}
                      </p>
                    )}
                  </div>

                  {/* Total & Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-base font-black">
                      <span className="text-slate-300">Valor Total:</span>
                      <span className="text-amber-400 text-xl">{formatCurrency(order.total)}</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {/* Confirm Payment & Send to Kitchen */}
                      <button
                        onClick={() => handleConfirmPayment(order)}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                        title="Confirmar pagamento e enviar comanda imediatamente para a linha de produção da cozinha"
                      >
                        <ChefHat className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          Confirmar Pagto & Lançar na Produção
                          {autoPrintKitchen && autoPrintCounter
                            ? ' + Imprimir Cozinha & Balcão'
                            : autoPrintKitchen
                            ? ' + Imprimir Cozinha'
                            : autoPrintCounter
                            ? ' + Imprimir Balcão'
                            : ''}
                        </span>
                      </button>

                      <div className="space-y-1.5">
                        {/* Botão Principal: Imprimir Pedido Completo (2 Vias) */}
                        <button
                          onClick={() => triggerPrintTicket(order, 'both')}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                          title="Imprimir as 2 Vias (1ª Balcão & Cozinha + 2ª Motoboy)"
                        >
                          <Printer className="w-4 h-4 shrink-0" />
                          <span>Imprimir Pedido (2 Vias)</span>
                        </button>

                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Reimprimir apenas 1ª Via (Balcão) */}
                          <button
                            onClick={() => triggerPrintTicket(order, 'counter')}
                            className="py-1.5 px-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 font-semibold text-[11px] hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1"
                            title="Reimprimir apenas 1ª Via (Balcão & Cozinha)"
                          >
                            <span>1ª Via (Balcão)</span>
                          </button>

                          {/* Reimprimir apenas 2ª Via (Motoboy / Cozinha) */}
                          <button
                            onClick={() => triggerPrintTicket(order, order.deliveryType === 'delivery' ? 'motoboy' : 'kitchen')}
                            className="py-1.5 px-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 font-semibold text-[11px] hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1"
                            title={order.deliveryType === 'delivery' ? 'Reimprimir apenas 2ª Via (Motoboy)' : 'Reimprimir apenas 2ª Via (Cozinha)'}
                          >
                            <span>{order.deliveryType === 'delivery' ? '2ª Via (Motoboy)' : '2ª Via (Cozinha)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* PIX QR Code & Copia e Cola Button */}
                      {order.paymentMethod === 'pix' && (
                        <button
                          type="button"
                          onClick={() => setPixOrderModal(order)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                          title="Exibir QR Code e Código Pix deste pedido para o cliente no balcão"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Ver QR Code PIX ({formatCurrency(order.total)})</span>
                        </button>
                      )}

                      {/* Secondary actions: Edit & Cancel */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingOrder(order)}
                          className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-amber-300 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                          title="Adicionar ou editar itens, endereço e dados deste pedido"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelReasonText('Cliente desistiu');
                          }}
                          className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                          title="Cancelar este pedido (não entrará no faturamento)"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: ALL ORDERS & HISTORY */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {dateFilter === 'today' ? 'Pedidos de Hoje' : 'Histórico Completo de Pedidos'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {dateFilter === 'today'
                  ? 'Exibindo somente os pedidos registrados no dia de hoje.'
                  : 'Exibindo todos os pedidos já cadastrados no histórico.'}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Scope Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === 'today'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar apenas pedidos feitos hoje"
                >
                  📅 Apenas Hoje ({todayOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar todo o histórico de pedidos"
                >
                  📂 Todos ({orders.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar nº ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none w-48"
                />
              </div>

              {/* Status Select */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:border-amber-500 outline-none font-semibold"
              >
                <option value="all">Todos os Status</option>
                <option value="aguardando_pagamento">Aguardando Pagamento</option>
                <option value="pagamento_confirmado">Pagamento Confirmado (Cozinha)</option>
                <option value="em_preparo">Em Preparo</option>
                <option value="pronto">Pronto</option>
                <option value="saiu_para_entrega">Em Rota (Com Motoboy)</option>
                <option value="entregue">Concluído</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4">Pedido / Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Tipo & Endereço</th>
                    <th className="p-4">Pagamento</th>
                    <th className="p-4">Status Atual</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Nenhum pedido encontrado no histórico.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const st = STATUS_MAP[order.status] || STATUS_MAP.aguardando_pagamento;
                      return (
                        <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="font-extrabold text-amber-400 text-sm">{order.id}</div>
                            <div className="text-slate-500 text-[11px]">{formatDateTime(order.createdAt)}</div>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-1">
                              {order.customerName}
                              {order.isBot && <span title="Pedido automatizado via Robô/WhatsApp">🤖</span>}
                            </div>
                            <div className="text-slate-400 text-[11px]">{order.customerPhone}</div>
                          </td>

                          <td className="p-4 text-slate-300">
                            <div className="font-bold uppercase text-[11px]">
                              {order.deliveryType === 'delivery' ? '🛵 Delivery' : '🛍️ Retirada'}
                            </div>
                            <div className="text-slate-400 text-[11px] truncate max-w-xs">{order.address}</div>
                          </td>

                          <td className="p-4 text-slate-300">
                            <span className="font-semibold">{PAYMENT_METHODS[order.paymentMethod]?.label || order.paymentMethod}</span>
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.color}`}>
                              {st.label}
                            </span>
                          </td>

                          <td className="p-4 text-right font-extrabold text-white text-sm">
                            {formatCurrency(order.total)}
                          </td>

                          <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                            {/* Botão de Ação Rápida: Lançar na Linha de Produção */}
                            {order.status === 'aguardando_pagamento' && (
                              <button
                                onClick={() => handleConfirmPayment(order)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-black transition-all inline-flex items-center space-x-1 border border-emerald-500/30 cursor-pointer"
                                title="Confirmar pagamento e enviar pedido diretamente para a Linha de Produção da cozinha"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                                <span>Lançar Produção</span>
                              </button>
                            )}

                            {(order.status === 'pagamento_confirmado' || order.status === 'em_preparo') && (
                              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold inline-flex items-center space-x-1">
                                <ChefHat className="w-3 h-3" />
                                <span>Na Produção</span>
                              </span>
                            )}

                            {order.status === 'saiu_para_entrega' && (
                              <button
                                onClick={() => {
                                  setSelectedTrackOrder(order);
                                  setIsTrackingMapOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-black transition-all inline-flex items-center space-x-1 border border-emerald-500/30 cursor-pointer"
                                title="Rastrear localização do motoboy no mapa em tempo real"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Rastrear GPS</span>
                              </button>
                            )}

                            {/* Edit Order */}
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-all inline-flex items-center cursor-pointer"
                              title="Editar Itens ou Dados do Pedido"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Both Tickets - Botão Principal */}
                            <button
                              onClick={() => triggerPrintTicket(order, 'both')}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-all inline-flex items-center space-x-1 cursor-pointer shadow-sm"
                              title="Imprimir Pedido (2 Vias: Balcão & Cozinha + Motoboy)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimir (2 Vias)</span>
                            </button>

                            {/* Cancel Order */}
                            {order.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingOrder(order);
                                  setCancelReasonText('Cliente desistiu');
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center cursor-pointer"
                                title="Cancelar este pedido"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Order */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Deseja realmente EXCLUIR o pedido #${order.id} do sistema? Esta ação apagará permanentemente o pedido.`)) {
                                  deleteOrder(order.id);
                                }
                              }}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-all inline-flex items-center cursor-pointer"
                              title="Excluir pedido definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
      )}

      </div>

      {/* Modal de Edição de Pedido */}
      {editingOrder && (
        <OrderEditModal
          isOpen={Boolean(editingOrder)}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={editOrder}
          onPrint={triggerPrintTicket}
        />
      )}

      {/* Modal de Lançamento de Novo Pedido no Balcão -> Linha de Produção */}
      <CounterNewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onLaunchOrder={handleLaunchCounterOrder}
      />

      {/* Modal de Rastreamento GPS de Motoboys em Tempo Real */}
      <MotoboyTrackingModal
        isOpen={isTrackingMapOpen}
        onClose={() => {
          setIsTrackingMapOpen(false);
          setSelectedTrackOrder(null);
        }}
        targetOrderId={selectedTrackOrder?.id}
      />

      {/* Modal de Exibição do QR Code PIX no Balcão */}
      {pixOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-base">QR Code PIX - Pedido #{pixOrderModal.id}</h3>
              </div>
              <button
                onClick={() => setPixOrderModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PixPaymentCard
              amount={pixOrderModal.total}
              orderId={pixOrderModal.id}
              storeSettings={storeSettings}
              onPaymentConfirmed={() => {
                handleConfirmPayment(pixOrderModal);
                setPixOrderModal(null);
              }}
              showActionButtons={true}
            />
          </div>
        </div>
      )}

      {/* Modal de Gestão & Fechamento de Caixa */}
      <CashierManagementModal
        isOpen={isCashierModalOpen}
        onClose={() => setIsCashierModalOpen(false)}
      />

      {/* Modal de Cancelamento de Pedido */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">Cancelar Pedido #{cancellingOrder.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{cancellingOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor do Pedido:</span>
                <span className="font-black text-amber-400">{formatCurrency(cancellingOrder.total)}</span>
              </div>
              <p className="text-[11px] text-rose-300 pt-1 border-t border-slate-800/80">
                ⚠️ Ao cancelar, o pedido NÃO será contabilizado no caixa e não entrará no faturamento da pizzaria.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Motivo do Cancelamento
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[
                  'Cliente desistiu',
                  'Pedido de teste / duplicado',
                  'Troca de itens',
                  'Demora na entrega',
                  'Endereço fora de rota',
                  'Erro de pagamento'
                ].map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReasonText(reason)}
                    className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-left truncate cursor-pointer ${
                      cancelReasonText === reason
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={cancelReasonText}
                onChange={e => setCancelReasonText(e.target.value)}
                placeholder="Ou digite o motivo..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelOrder(cancellingOrder.id, cancelReasonText);
                  setCancellingOrder(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Limpeza do Balcão / Iniciar Novo Dia */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">Limpar Balcão & Iniciar Novo Dia</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Escolha como deseja limpar o balcão. Isso remove pedidos antigos ou de teste para você começar o dia com o painel organizado e sem entradas antigas:
            </p>

            <div className="space-y-3">
              {/* Opção 1: Limpar Concluídos e Cancelados */}
              <button
                type="button"
                onClick={async () => {
                  const count = orders.filter(o => o.status === 'entregue' || o.status === 'cancelado').length;
                  if (count === 0) {
                    alert('Não há pedidos concluídos ou cancelados para limpar no momento.');
                    return;
                  }
                  if (window.confirm(`Deseja limpar ${count} pedido(s) concluídos e cancelados do balcão? Os pedidos em aberto e em preparo serão mantidos.`)) {
                    await clearOrders({ scope: 'finished' });
                    setIsClearModalOpen(false);
                  }
                }}
                className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 transition-all space-y-1 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm group-hover:text-amber-400 flex items-center space-x-2">
                    <span>🧹 Limpar Apenas Concluídos e Cancelados</span>
                  </span>
                  <span className="text-[11px] font-black bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Mantém na tela os pedidos que ainda estão pendentes, em preparo ou em rota, e limpa apenas os finalizados.
                </p>
              </button>

              {/* Opção 2: Zerar Todos os Pedidos de Hoje */}
              <button
                type="button"
                onClick={async () => {
                  if (todayOrders.length === 0) {
                    alert('Não há pedidos registrados hoje para limpar.');
                    return;
                  }
                  if (window.confirm(`ATENÇÃO: Deseja apagar todos os ${todayOrders.length} pedido(s) de HOJE para iniciar o dia 100% zerado?`)) {
                    await clearOrders({ scope: 'today' });
                    setIsClearModalOpen(false);
                  }
                }}
                className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 transition-all space-y-1 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm group-hover:text-rose-400 flex items-center space-x-2">
                    <span>🌅 Zerar Todos os Pedidos de Hoje (Iniciar Novo Dia)</span>
                  </span>
                  <span className="text-[11px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                    {todayOrders.length} hoje
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Zera todos os pedidos criados na data de hoje. Ideal para limpar pedidos de teste antes de abrir o restaurante.
                </p>
              </button>

              {/* Opção 3: Limpeza Total do Histórico */}
              <button
                type="button"
                onClick={async () => {
                  if (orders.length === 0) {
                    alert('Não há nenhum pedido no sistema.');
                    return;
                  }
                  const promptCheck = window.prompt(`DIGITE "ZERAR" para confirmar a exclusão de TODOS os ${orders.length} pedidos do banco de dados:`);
                  if (promptCheck && promptCheck.toUpperCase() === 'ZERAR') {
                    await clearOrders({ scope: 'all' });
                    setIsClearModalOpen(false);
                  }
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-600/50 hover:bg-rose-950/20 transition-all space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 text-xs flex items-center space-x-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Zerar Todo o Histórico Antigo ({orders.length} pedidos)</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Exclui permanentemente todos os pedidos antigos de teste acumulados no sistema.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
