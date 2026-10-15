import React, { useState, useMemo, useEffect } from 'react';
import {
  Utensils, Plus, Users, Clock, Receipt, CheckCircle2, AlertCircle,
  ArrowRightLeft, Printer, ChefHat, DollarSign, Search, Filter, Trash2, X, Sparkles
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, formatTime } from '../../utils/formatters';
import { TableOrderModal } from './TableOrderModal';
import { TableCheckoutModal } from './TableCheckoutModal';
import { TableTransferModal } from './TableTransferModal';

export const TableManagementView = () => {
  const {
    tables,
    orders,
    openTable,
    addItemsToTable,
    closeTable,
    transferTable,
    updateTableStatus,
    addTable,
    deleteTable,
    triggerPrintTicket,
    showPrinterToast
  } = useOrder();

  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'ocupada' | 'livre' | 'fechando'
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de Controle
  const [orderModalTable, setOrderModalTable] = useState(null);
  const [orderModalMode, setOrderModalMode] = useState('open'); // 'open' | 'add_items'

  const [checkoutModalTable, setCheckoutModalTable] = useState(null);
  const [transferModalTable, setTransferModalTable] = useState(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');

  // Timer para atualizar o tempo decorrido nas mesas a cada 30 segundos
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTimerTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Mapeia cada mesa para o seu pedido ativo correspondente
  const tablesWithOrders = useMemo(() => {
    return (tables || []).map(t => {
      let activeOrder = null;
      if (t.currentOrderId) {
        activeOrder = orders.find(o => o.id === t.currentOrderId);
      }
      // Se não achou por ID mas a mesa está ocupada, busca por número da mesa
      if (!activeOrder && t.status !== 'livre') {
        activeOrder = orders.find(o =>
          (o.tableNumber === t.tableNumber || o.address?.toLowerCase().includes(`mesa ${String(t.tableNumber).padStart(2, '0')}`)) &&
          o.status !== 'entregue' && o.status !== 'cancelado'
        );
      }

      const totalConsumption = activeOrder ? activeOrder.total : 0;
      const itemsCount = activeOrder?.items ? activeOrder.items.reduce((acc, it) => acc + it.quantity, 0) : 0;

      return {
        ...t,
        activeOrder,
        totalConsumption,
        itemsCount
      };
    });
  }, [tables, orders]);

  // Métricas do Salão
  const totalTablesCount = tablesWithOrders.length;
  const occupiedCount = tablesWithOrders.filter(t => t.status === 'ocupada').length;
  const closingCount = tablesWithOrders.filter(t => t.status === 'fechando').length;
  const freeCount = tablesWithOrders.filter(t => t.status === 'livre').length;
  const totalOpenRevenue = tablesWithOrders.reduce((acc, t) => acc + (t.totalConsumption || 0), 0);

  // Filtro das mesas exibidas
  const filteredTables = useMemo(() => {
    return tablesWithOrders.filter(t => {
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesSearch = !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.tableNumber).includes(searchTerm) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [tablesWithOrders, filterStatus, searchTerm]);

  // Calcula tempo decorrido desde a abertura da mesa
  const getElapsedTimeString = (openedAt) => {
    if (!openedAt) return '';
    const diffMs = Date.now() - new Date(openedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // 1. ABRIR MESA / LANÇAR PEDIDO
  const handleOpenTableClick = (table) => {
    setOrderModalTable(table);
    setOrderModalMode('open');
  };

  // 2. ADICIONAR RODADA / NOVOS ITENS
  const handleAddItemsClick = (table) => {
    setOrderModalTable(table);
    setOrderModalMode('add_items');
  };

  // Confirmar abertura ou adição de itens
  const handleConfirmOrder = async ({ items, customerName, peopleCount, notes, sendToKitchen }) => {
    if (orderModalMode === 'open') {
      await openTable(orderModalTable.id, {
        orderData: {
          items,
          customerName,
          observation: notes
        },
        peopleCount,
        notes,
        sendToKitchen
      });
      if (showPrinterToast) {
        showPrinterToast(`🍽️ ${orderModalTable.name} aberta com sucesso!`, 'success');
      }
    } else {
      await addItemsToTable(orderModalTable.id, items, {
        sendToKitchen,
        notes
      });
      if (showPrinterToast) {
        showPrinterToast(`🚀 Nova rodada lançada para ${orderModalTable.name}!`, 'success');
      }
    }
    setOrderModalTable(null);
  };

  // 3. PEDIR PRÉ-CONTA / CONFERÊNCIA
  const handlePrintConference = (order, table) => {
    triggerPrintTicket(order, 'counter');
    updateTableStatus(table.id, 'fechando');
    if (showPrinterToast) {
      showPrinterToast(`🧾 Pré-conta da ${table.name} enviada para a impressora!`, 'info');
    }
  };

  // 4. FECHAR MESA & PAGAR
  const handleCloseTableClick = (table) => {
    if (!table.activeOrder) {
      alert('Não há nenhum pedido ativo vinculado a esta mesa.');
      return;
    }
    setCheckoutModalTable(table);
  };

  const handleConfirmPayment = async (checkoutData) => {
    await closeTable(checkoutData.tableId, checkoutData);
    if (showPrinterToast) {
      showPrinterToast(`✅ ${checkoutModalTable.name} finalizada e liberada!`, 'success');
    }
  };

  // 5. TRANSFERIR MESA
  const handleTransferClick = (table) => {
    setTransferModalTable(table);
  };

  const handleConfirmTransfer = async (fromId, toId) => {
    await transferTable(fromId, toId);
    if (showPrinterToast) {
      showPrinterToast(`🔄 Mesa transferida com sucesso!`, 'success');
    }
  };

  // 6. ADICIONAR NOVA MESA
  const handleAddNewTable = async (e) => {
    e.preventDefault();
    const num = parseInt(newTableNum, 10);
    if (!num || num <= 0) {
      alert('Informe um número válido para a nova mesa.');
      return;
    }
    const exists = tables.some(t => t.tableNumber === num);
    if (exists) {
      alert(`A Mesa ${num} já existe no salão!`);
      return;
    }

    await addTable(num);
    setNewTableNum('');
    setIsAddTableOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner de Métricas do Salão */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-2">
            <Utensils className="w-3.5 h-3.5" />
            <span>Salão & Atendimento Presencial</span>
          </div>
          <h2 className="text-2xl font-black text-white">Controle de Mesas & Comandas</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Abra comandas por mesa, lance rodadas com impressão direta na cozinha e feche a conta com divisão por pessoa e taxa de serviço.
          </p>
        </div>

        {/* Métricas Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-center min-w-[80px]">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total</span>
            <span className="text-lg font-black text-white">{totalTablesCount}</span>
          </div>

          <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-center min-w-[80px]">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Livres</span>
            <span className="text-lg font-black text-emerald-400">{freeCount}</span>
          </div>

          <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-center min-w-[80px]">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Ocupadas</span>
            <span className="text-lg font-black text-amber-400">{occupiedCount}</span>
          </div>

          {closingCount > 0 && (
            <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-blue-500/30 text-center min-w-[80px] animate-pulse">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Fechando</span>
              <span className="text-lg font-black text-blue-400">{closingCount}</span>
            </div>
          )}

          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Consumo Aberto</span>
            <span className="text-lg font-black text-emerald-400">{formatCurrency(totalOpenRevenue)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddTableOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Mesa</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {[
            { id: 'all', label: `Todas (${totalTablesCount})` },
            { id: 'ocupada', label: `Ocupadas (${occupiedCount})` },
            { id: 'fechando', label: `Fechando (${closingCount})` },
            { id: 'livre', label: `Livres (${freeCount})` },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por mesa ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Grid de Mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map(t => {
          const isLivre = t.status === 'livre';
          const isFechando = t.status === 'fechando';
          const isOcupada = t.status === 'ocupada';

          return (
            <div
              key={t.id}
              className={`rounded-3xl p-5 border-2 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                isLivre
                  ? 'bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/40'
                  : isFechando
                  ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-900 border-amber-500/60 shadow-xl shadow-amber-500/10'
              }`}
            >
              {/* Luz sutil de destaque no topo */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                isLivre ? 'bg-emerald-500/40' : isFechando ? 'bg-blue-500' : 'bg-amber-500'
              }`} />

              {/* Card Header: Mesa + Status */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black text-white">{t.name}</span>
                    {t.peopleCount > 1 && !isLivre && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-bold">
                        <Users className="w-3 h-3" />
                        <span>{t.peopleCount}</span>
                      </span>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isLivre
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isFechando
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {isLivre ? 'Disponível' : isFechando ? 'Fechando Conta' : 'Em Atendimento'}
                  </span>
                </div>

                {/* Info da Mesa Ocupada */}
                {!isLivre ? (
                  <div className="space-y-2 mt-3">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-400 font-bold">
                        <span className="truncate">{t.customerName || 'Cliente Salão'}</span>
                        {t.openedAt && (
                          <span className="flex items-center space-x-1 text-[10px] text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>{getElapsedTimeString(t.openedAt)}</span>
                          </span>
                        )}
                      </div>
                      {t.notes && (
                        <p className="text-[10px] text-slate-500 italic truncate">
                          Obs: {t.notes}
                        </p>
                      )}
                    </div>

                    {/* Consumo Atual */}
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Consumo Atual</span>
                        <span className="text-[11px] text-slate-500">{t.itemsCount} item(ns)</span>
                      </div>
                      <span className="text-xl font-black text-emerald-400">
                        {formatCurrency(t.totalConsumption)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Mesa Livre */
                  <div className="py-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                      <Utensils className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <span className="text-xs text-slate-500 font-bold block">Mesa Livre & Pronta</span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-4 border-t border-slate-850 mt-4 space-y-2">
                {isLivre ? (
                  <button
                    type="button"
                    onClick={() => handleOpenTableClick(t)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Abrir Mesa & Pedido</span>
                  </button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Adicionar Rodada */}
                      <button
                        type="button"
                        onClick={() => handleAddItemsClick(t)}
                        className="py-2 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Lançar mais pratos ou bebidas para a cozinha"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Itens</span>
                      </button>

                      {/* Pré-Conta (Conferência) */}
                      <button
                        type="button"
                        onClick={() => t.activeOrder && handlePrintConference(t.activeOrder, t)}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Imprimir conferência de comanda para a mesa"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pré-Conta</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {/* Fechar Mesa & Receber */}
                      <button
                        type="button"
                        onClick={() => handleCloseTableClick(t)}
                        className="col-span-3 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                        title="Receber pagamento e fechar comanda da mesa"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Fechar & Pagar</span>
                      </button>

                      {/* Transferir */}
                      <button
                        type="button"
                        onClick={() => handleTransferClick(t)}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-400 font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
                        title="Transferir mesa para outra mesa livre"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal: Abertura e Adição de Itens na Mesa */}
      {orderModalTable && (
        <TableOrderModal
          isOpen={Boolean(orderModalTable)}
          onClose={() => setOrderModalTable(null)}
          table={orderModalTable}
          mode={orderModalMode}
          onConfirm={handleConfirmOrder}
        />
      )}

      {/* Modal: Fechamento de Conta / Pagamento */}
      {checkoutModalTable && checkoutModalTable.activeOrder && (
        <TableCheckoutModal
          isOpen={Boolean(checkoutModalTable)}
          onClose={() => setCheckoutModalTable(null)}
          table={checkoutModalTable}
          order={checkoutModalTable.activeOrder}
          onConfirmPayment={handleConfirmPayment}
          onPrintConference={handlePrintConference}
        />
      )}

      {/* Modal: Transferência de Mesa */}
      {transferModalTable && (
        <TableTransferModal
          isOpen={Boolean(transferModalTable)}
          onClose={() => setTransferModalTable(null)}
          sourceTable={transferModalTable}
          tables={tables}
          onConfirmTransfer={handleConfirmTransfer}
        />
      )}

      {/* Modal: Adicionar Nova Mesa */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Cadastrar Nova Mesa</h3>
              <button
                type="button"
                onClick={() => setIsAddTableOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewTable} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Número da Mesa</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  placeholder="Ex: 13"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-center text-lg outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
