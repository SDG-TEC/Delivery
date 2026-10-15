import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Calendar,
  Download,
  Printer,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  QrCode,
  Coins,
  Bike,
  Utensils,
  History,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Settings,
  UserCheck,
  Check,
  Plus,
  Clock,
  User,
  X,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getCashierHistory, printCashierReport } from '../../services/cashierService';
import {
  getMotoboySettings,
  saveMotoboySettings,
  getMotoboyPayouts,
  calculateMotoboyCommissions,
  payoutMotoboyCommission,
  printMotoboyStatement,
  MOTOBOY_COMMISSION_EVENT
} from '../../services/motoboyCommissionService';
import { fetchStaffUsers } from '../../services/staffAuthService';
import { useOrder } from '../../context/OrderContext';

export const FinancialReportsAdmin = () => {
  const { orders, printerSettings, showPrinterToast, editOrder, motoboyLocations, staffUser } = useOrder();

  // Sub-abas do Módulo Financeiro
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'motoboys' | 'cashier' | 'ledger'

  // Filtros de período
  const [periodPreset, setPeriodPreset] = useState('hoje'); // 'hoje' | 'ontem' | '7dias' | 'mes_atual' | 'mes_anterior' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Filtros do extrato de pedidos
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Histórico de fechamentos de caixa
  const [cashierHistory, setCashierHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Estados de Comissões de Motoboys
  const [motoboySettings, setMotoboySettings] = useState(getMotoboySettings());
  const [isEditingMotoboyRates, setIsEditingMotoboyRates] = useState(false);
  const [motoboyPayouts, setMotoboyPayouts] = useState(getMotoboyPayouts());
  const [registeredMotoboys, setRegisteredMotoboys] = useState([]);
  const [selectedMotoboyDetail, setSelectedMotoboyDetail] = useState(null);

  // Modal de Acerto / Pagamento de Motoboy
  const [payoutModalData, setPayoutModalData] = useState(null);
  const [payoutPaymentMethod, setPayoutPaymentMethod] = useState('dinheiro');
  const [payoutCreateSangria, setPayoutCreateSangria] = useState(true);
  const [payoutPrintReceipt, setPayoutPrintReceipt] = useState(true);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Carregar dados de fechamento de caixa e motoboys cadastrados
  const loadFinancialData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getCashierHistory(50);
      setCashierHistory(history);

      const staffRes = await fetchStaffUsers();
      const motoboys = (staffRes?.users || [])
        .filter(u => u.role === 'motoboy' && u.is_active !== false)
        .map(u => u.name || u.username);
      setRegisteredMotoboys(motoboys);

      setMotoboyPayouts(getMotoboyPayouts());
      setMotoboySettings(getMotoboySettings());
    } catch (e) {
      console.error('Erro ao carregar dados financeiros:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Ouvir eventos de acerto de comissão
  useEffect(() => {
    const handleCommissionEvent = () => {
      setMotoboyPayouts(getMotoboyPayouts());
      setMotoboySettings(getMotoboySettings());
    };
    window.addEventListener(MOTOBOY_COMMISSION_EVENT, handleCommissionEvent);
    return () => window.removeEventListener(MOTOBOY_COMMISSION_EVENT, handleCommissionEvent);
  }, []);

  // Calcular limites de data do filtro selecionado
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (periodPreset === 'hoje') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (periodPreset === 'ontem') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (periodPreset === '7dias') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (periodPreset === 'mes_atual') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'mes_anterior') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (periodPreset === 'custom') {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }

    return { start, end };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filtrar pedidos pelo período
  const periodOrders = useMemo(() => {
    const startTime = dateRange.start.getTime();
    const endTime = dateRange.end.getTime();

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.created_at).getTime();
      if (isNaN(orderDate)) return true;
      return orderDate >= startTime && orderDate <= endTime;
    });
  }, [orders, dateRange]);

  // Pedidos válidos (excluindo cancelados)
  const validOrders = useMemo(() => {
    return periodOrders.filter(o => o.status !== 'cancelado');
  }, [periodOrders]);

  // Pedidos cancelados
  const cancelledOrders = useMemo(() => {
    return periodOrders.filter(o => o.status === 'cancelado');
  }, [periodOrders]);

  // Métricas Principais (DRE / KPIs)
  const kpis = useMemo(() => {
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const ordersCount = validOrders.length;
    const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;
    const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    let totalDeliveryFee = 0;
    validOrders.forEach(o => {
      if (o.deliveryFee || o.delivery_fee) {
        totalDeliveryFee += Number(o.deliveryFee || o.delivery_fee) || 0;
      }
    });

    return {
      totalRevenue,
      ordersCount,
      averageTicket,
      cancelledCount: cancelledOrders.length,
      cancelledTotal,
      totalDeliveryFee
    };
  }, [validOrders, cancelledOrders]);

  // Distribuição por Meio de Pagamento
  const paymentStats = useMemo(() => {
    const stats = {
      pix: { label: 'Pix Online / QR', total: 0, count: 0, color: 'text-teal-400', bg: 'bg-teal-500' },
      dinheiro: { label: 'Dinheiro', total: 0, count: 0, color: 'text-emerald-400', bg: 'bg-emerald-500' },
      credito: { label: 'Cartão de Crédito', total: 0, count: 0, color: 'text-purple-400', bg: 'bg-purple-500' },
      debito: { label: 'Cartão de Débito', total: 0, count: 0, color: 'text-blue-400', bg: 'bg-blue-500' },
      outro: { label: 'Outros Meios', total: 0, count: 0, color: 'text-amber-400', bg: 'bg-amber-500' }
    };

    validOrders.forEach(order => {
      const val = Number(order.total) || 0;
      const m = String(order.paymentMethod || order.payment_method || '').toLowerCase();

      if (m.includes('dinheiro') || m === 'cash') {
        stats.dinheiro.total += val;
        stats.dinheiro.count += 1;
      } else if (m.includes('pix')) {
        stats.pix.total += val;
        stats.pix.count += 1;
      } else if (m.includes('debito') || m === 'debit_card') {
        stats.debito.total += val;
        stats.debito.count += 1;
      } else if (m.includes('credito') || m === 'credit_card' || m === 'card') {
        stats.credito.total += val;
        stats.credito.count += 1;
      } else {
        stats.outro.total += val;
        stats.outro.count += 1;
      }
    });

    return Object.entries(stats).map(([key, data]) => ({
      key,
      ...data,
      percent: kpis.totalRevenue > 0 ? (data.total / kpis.totalRevenue) * 100 : 0
    }));
  }, [validOrders, kpis.totalRevenue]);

  // Distribuição por Canal de Venda
  const channelStats = useMemo(() => {
    const channels = {
      delivery: { label: 'Delivery (Entrega)', icon: Bike, total: 0, count: 0, color: 'text-amber-400', bg: 'bg-amber-500' },
      takeout: { label: 'Retirada no Balcão', icon: ShoppingBag, total: 0, count: 0, color: 'text-emerald-400', bg: 'bg-emerald-500' },
      dine_in: { label: 'Salão & Mesas', icon: Utensils, total: 0, count: 0, color: 'text-blue-400', bg: 'bg-blue-500' }
    };

    validOrders.forEach(order => {
      const val = Number(order.total) || 0;
      const ch = String(order.deliveryType || order.delivery_type || 'takeout').toLowerCase();

      if (ch === 'delivery') {
        channels.delivery.total += val;
        channels.delivery.count += 1;
      } else if (ch === 'dine_in' || ch === 'mesa') {
        channels.dine_in.total += val;
        channels.dine_in.count += 1;
      } else {
        channels.takeout.total += val;
        channels.takeout.count += 1;
      }
    });

    return Object.entries(channels).map(([key, data]) => ({
      key,
      ...data,
      percent: kpis.totalRevenue > 0 ? (data.total / kpis.totalRevenue) * 100 : 0
    }));
  }, [validOrders, kpis.totalRevenue]);

  // Ranking de Produtos Mais Vendidos
  const topProducts = useMemo(() => {
    const map = new Map();

    validOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const name = item.name || item.title || 'Produto sem nome';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemTotal = price * qty;

        if (!map.has(name)) {
          map.set(name, {
            name,
            quantity: 0,
            revenue: 0
          });
        }
        const prod = map.get(name);
        prod.quantity += qty;
        prod.revenue += itemTotal;
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [validOrders]);

  // =========================================================================
  // SISTEMA DE COMISSÕES POR MOTOBOY
  // =========================================================================
  const motoboyCommissions = useMemo(() => {
    return calculateMotoboyCommissions(periodOrders, motoboySettings, motoboyPayouts);
  }, [periodOrders, motoboySettings, motoboyPayouts]);

  // Salvar configurações de taxa de comissão
  const handleSaveMotoboyRates = (e) => {
    e.preventDefault();
    saveMotoboySettings(motoboySettings);
    setIsEditingMotoboyRates(false);
    if (showPrinterToast) {
      showPrinterToast('⚙️ Modelo de comissão dos motoboys atualizado com sucesso!', 'success');
    }
  };

  // Abrir Modal de Acerto / Pagamento
  const handleOpenPayoutModal = (motoboy) => {
    const pendingOrders = motoboy.orders.filter(o => !o.isPaid);
    const amountToPay = pendingOrders.reduce((sum, o) => sum + o.commission, 0) + (motoboy.paidCommission === 0 ? motoboy.dailyAllowance : 0);

    setPayoutModalData({
      motoboyName: motoboy.motoboyName,
      amount: amountToPay > 0 ? amountToPay : motoboy.totalCommission,
      pendingOrders,
      allOrders: motoboy.orders
    });
    setPayoutPaymentMethod('dinheiro');
    setPayoutCreateSangria(true);
    setPayoutPrintReceipt(true);
    setPayoutNotes('');
  };

  // Confirmar Acerto / Pagamento
  const handleConfirmPayout = async () => {
    if (!payoutModalData || isSubmittingPayout) return;
    setIsSubmittingPayout(true);

    try {
      const orderIds = payoutModalData.pendingOrders.map(o => o.id);
      const res = await payoutMotoboyCommission({
        motoboyName: payoutModalData.motoboyName,
        orderIds,
        amount: payoutModalData.amount,
        deliveries: payoutModalData.pendingOrders,
        paymentMethod: payoutPaymentMethod,
        operatorName: staffUser?.name || 'Balcão',
        notes: payoutNotes,
        createSangria: payoutCreateSangria,
        printReceipt: payoutPrintReceipt,
        printerSettings
      });

      if (showPrinterToast) {
        showPrinterToast(
          `✅ Acerto de ${formatCurrency(payoutModalData.amount)} com ${payoutModalData.motoboyName} concluído!${res.sangria ? ' (Sangria lançada no Caixa)' : ''}`,
          'success'
        );
      }

      setPayoutModalData(null);
      setMotoboyPayouts(getMotoboyPayouts());
    } catch (err) {
      alert('Erro ao registrar acerto: ' + err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Imprimir extrato de corridas na Elgin i8
  const handlePrintMotoboyTicket = async (motoboy) => {
    try {
      const res = await printMotoboyStatement({
        motoboyName: motoboy.motoboyName,
        deliveries: motoboy.orders,
        totalCommission: motoboy.totalCommission,
        dailyAllowance: motoboy.dailyAllowance,
        status: motoboy.status,
        operatorName: staffUser?.name || 'Balcão',
        printerSettings
      });

      if (res?.success) {
        if (showPrinterToast) {
          showPrinterToast(`🖨️ Extrato do motoboy ${motoboy.motoboyName} impresso na Elgin i8!`, 'success');
        }
      } else {
        alert('Impressora não respondeu: ' + (res?.error || 'verifique a conexão de rede da Elgin i8'));
      }
    } catch (err) {
      alert('Erro ao imprimir extrato do motoboy: ' + err.message);
    }
  };

  // Atribuir motoboy a um pedido que estava sem entregador
  const handleQuickAssignMotoboy = (orderId, newMotoboyName) => {
    if (!newMotoboyName) return;
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const updated = {
      ...target,
      motoboyName: newMotoboyName,
      driverName: newMotoboyName,
      deliveryGps: {
        ...(target.deliveryGps || {}),
        driverName: newMotoboyName
      }
    };

    editOrder(updated);
    if (showPrinterToast) {
      showPrinterToast(`🛵 Pedido #${orderId} atribuído ao entregador ${newMotoboyName}!`, 'info');
    }
  };

  // Extrato de Pedidos com Filtros Locais
  const filteredOrders = useMemo(() => {
    return periodOrders.filter(order => {
      // Busca por ID, nome ou telefone
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const idMatch = (order.id || '').toLowerCase().includes(q);
        const nameMatch = (order.customerName || order.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (order.customerPhone || order.customer_phone || '').includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }

      // Filtro de Pagamento
      if (filterPayment !== 'all') {
        const m = String(order.paymentMethod || order.payment_method || '').toLowerCase();
        if (filterPayment === 'pix' && !m.includes('pix')) return false;
        if (filterPayment === 'dinheiro' && (!m.includes('dinheiro') && m !== 'cash')) return false;
        if (filterPayment === 'credito' && (!m.includes('credito') && m !== 'credit_card')) return false;
        if (filterPayment === 'debito' && (!m.includes('debito') && m !== 'debit_card')) return false;
      }

      // Filtro de Canal
      if (filterChannel !== 'all') {
        const ch = String(order.deliveryType || order.delivery_type || 'takeout').toLowerCase();
        if (filterChannel !== ch) return false;
      }

      // Filtro de Status
      if (filterStatus !== 'all') {
        if (order.status !== filterStatus) return false;
      }

      return true;
    });
  }, [periodOrders, searchQuery, filterPayment, filterChannel, filterStatus]);

  // Exportar Relatório em CSV
  const handleExportCSV = () => {
    if (periodOrders.length === 0) {
      alert('Nenhum pedido encontrado no período selecionado para exportar.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Data e Hora',
      'Cliente',
      'Telefone',
      'Canal',
      'Motoboy',
      'Forma Pagamento',
      'Status',
      'Valor Total (R$)',
      'Taxa Entrega (R$)'
    ];

    const rows = periodOrders.map(o => {
      const mbName = o.motoboyName || o.driverName || (o.deliveryGps?.driverName) || '';
      return [
        `#${o.id}`,
        `"${formatDateTime(o.createdAt || o.created_at)}"`,
        `"${(o.customerName || o.customer_name || 'Cliente').replace(/"/g, '""')}"`,
        `"${o.customerPhone || o.customer_phone || ''}"`,
        `"${o.deliveryType || o.delivery_type || 'balcao'}"`,
        `"${mbName.replace(/"/g, '""')}"`,
        `"${o.paymentMethod || o.payment_method || ''}"`,
        `"${o.status || ''}"`,
        (Number(o.total) || 0).toFixed(2).replace('.', ','),
        (Number(o.deliveryFee || o.delivery_fee || 0)).toFixed(2).replace('.', ',')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-financeiro-sdg-${periodPreset}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showPrinterToast) {
      showPrinterToast('📥 Relatório financeiro CSV exportado com sucesso!', 'success');
    }
  };

  // Reimprimir comprovante de fechamento de caixa
  const handleReprintShift = async (shift) => {
    try {
      const shiftDataToPrint = {
        ...shift,
        closing: shift.closingData || {}
      };
      const res = await printCashierReport({
        shiftData: shiftDataToPrint,
        isPartial: false,
        settings: printerSettings
      });
      if (res?.success) {
        if (showPrinterToast) {
          showPrinterToast(`🖨️ Fechamento #${shift.id} reimpresso na Elgin i8!`, 'success');
        }
      } else {
        alert('Falha na impressão: ' + (res?.error || 'verifique a rede'));
      }
    } catch (e) {
      alert('Erro ao reimprimir: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* SEÇÃO SUPERIOR: TÍTULO, SELETOR DE PERÍODO E BOTÕES DE AÇÃO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Controle Financeiro, Fechamento & DRE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Relatórios Financeiros & Comissões</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Faturamento líquido, fechamento de gaveta, acerto de comissões de motoboys e extrato de transações.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              title="Baixar planilha compatível com Excel e Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              title="Imprimir relatório da tela"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* SELETOR DE PERÍODOS RÁPIDOS */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Período:</span>
          </span>

          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'ontem', label: 'Ontem' },
            { id: '7dias', label: 'Últimos 7 dias' },
            { id: 'mes_atual', label: 'Este Mês' },
            { id: 'mes_anterior', label: 'Mês Anterior' },
            { id: 'custom', label: 'Personalizado' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === p.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Date Pickers para intervalo customizado */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2 ml-auto mt-2 sm:mt-0">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS FINANCEIRAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Visão Geral & DRE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('motoboys')}
          className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'motoboys'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-amber-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Bike className="w-4 h-4 shrink-0" />
          <span>Comissões Motoboy ({motoboyCommissions.totals.totalDeliveries})</span>
          {motoboyCommissions.totals.totalPending > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cashier')}
          className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'cashier'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Fechamentos de Caixa ({cashierHistory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Extrato de Pedidos ({filteredOrders.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: VISÃO GERAL & DRE */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* KPIS PRINCIPAIS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Faturamento Bruto */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Faturamento Líquido</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatCurrency(kpis.totalRevenue)}
              </div>
              <p className="text-[11px] text-slate-500">Vendas confirmadas no período</p>
            </div>

            {/* Total de Pedidos */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Pedidos Concluídos</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                {kpis.ordersCount}
              </div>
              <p className="text-[11px] text-slate-500">Excluídos os cancelados</p>
            </div>

            {/* Ticket Médio */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-400">
                {formatCurrency(kpis.averageTicket)}
              </div>
              <p className="text-[11px] text-slate-500">Média gasta por cliente</p>
            </div>

            {/* Taxas de Entrega / Cancelados */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Taxas de Entrega</span>
                <Bike className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-400">
                {formatCurrency(kpis.totalDeliveryFee)}
              </div>
              <p className="text-[11px] text-slate-500">
                Cancelados: {kpis.cancelledCount} ({formatCurrency(kpis.cancelledTotal)})
              </p>
            </div>
          </div>

          {/* DUAS COLUNAS: MEIOS DE PAGAMENTO & CANAIS DE VENDA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: MEIOS DE PAGAMENTO */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-teal-400" />
                  <span>Recebimentos por Forma de Pagamento</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {validOrders.length} transações
                </span>
              </div>

              <div className="space-y-4">
                {paymentStats.map(item => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-300 flex items-center space-x-1.5">
                        <span className={item.color}>●</span>
                        <span>{item.label}</span>
                        <span className="text-[11px] text-slate-500 font-normal">({item.count}x)</span>
                      </span>
                      <div className="space-x-2">
                        <span className="font-black text-white">{formatCurrency(item.total)}</span>
                        <span className="text-slate-400 font-bold">({item.percent.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${item.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 2: CANAIS DE VENDA */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Distribuição por Canal de Venda</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  Onde seus clientes compram
                </span>
              </div>

              <div className="space-y-4">
                {channelStats.map(ch => {
                  const Icon = ch.icon;
                  return (
                    <div key={ch.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-300 flex items-center space-x-1.5">
                          <Icon className="w-4 h-4 text-amber-400" />
                          <span>{ch.label}</span>
                          <span className="text-[11px] text-slate-500 font-normal">({ch.count} pedidos)</span>
                        </span>
                        <div className="space-x-2">
                          <span className="font-black text-white">{formatCurrency(ch.total)}</span>
                          <span className="text-slate-400 font-bold">({ch.percent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${ch.bg} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, ch.percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RANKING DOS TOP PRODUTOS MAIS VENDIDOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-amber-400" />
                <span>Top 10 Produtos Mais Vendidos no Período</span>
              </h3>
              <span className="text-xs text-slate-400">Ordenado por receita gerada</span>
            </div>

            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhum produto registrado nos pedidos deste período.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topProducts.map((prod, idx) => (
                  <div
                    key={prod.name}
                    className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}º
                      </div>
                      <div>
                        <div className="font-extrabold text-white">{prod.name}</div>
                        <div className="text-[11px] text-slate-400">{prod.quantity} unidades vendidas</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400 text-sm">{formatCurrency(prod.revenue)}</div>
                      <div className="text-[10px] text-slate-500">
                        {kpis.totalRevenue > 0 ? ((prod.revenue / kpis.totalRevenue) * 100).toFixed(1) : 0}% da receita
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: SISTEMA DE COMISSÕES POR MOTOBOY */}
      {/* ========================================================================= */}
      {activeSubTab === 'motoboys' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* HEADER DA ABA DE MOTOBOYS & CONFIGURAÇÃO DE TAXAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center space-x-2">
                  <Bike className="w-5 h-5 text-amber-400" />
                  <span>Acerto de Comissões & Taxas de Entrega</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Apure o total a pagar para cada entregador, faça a baixa com lançamento automático no Caixa e imprima vales térmicos na Elgin i8.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingMotoboyRates(!isEditingMotoboyRates)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isEditingMotoboyRates ? 'Fechar Regras' : 'Configurar Regra de Comissão'}</span>
              </button>
            </div>

            {/* FORMULÁRIO EXPANSÍVEL DE REGRAS DE COMISSÃO */}
            {isEditingMotoboyRates && (
              <form onSubmit={handleSaveMotoboyRates} className="bg-slate-950 border border-amber-500/30 p-5 rounded-2xl space-y-4 mt-4 animate-in fade-in">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Settings className="w-4 h-4" />
                  <span>Modelo de Remuneração dos Entregadores</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Modelo */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Regra de Pagamento</label>
                    <select
                      value={motoboySettings.rateModel}
                      onChange={e => setMotoboySettings(prev => ({ ...prev, rateModel: e.target.value }))}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                    >
                      <option value="delivery_fee">Repassar Taxa Integral de Entrega (100%)</option>
                      <option value="fixed">Valor Fixo por Corrida Realizada</option>
                      <option value="percentage">Porcentagem (%) sobre a Taxa de Entrega</option>
                      <option value="fixed_plus_fee">Diária Fixa + Taxa de Entrega Integral</option>
                    </select>
                  </div>

                  {/* Valor Fixo por Corrida */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Valor Fixo por Corrida (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={motoboySettings.fixedRate}
                      onChange={e => setMotoboySettings(prev => ({ ...prev, fixedRate: parseFloat(e.target.value) || 0 }))}
                      disabled={motoboySettings.rateModel === 'delivery_fee' || motoboySettings.rateModel === 'percentage'}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                    />
                  </div>

                  {/* Diária Fixa Adicional */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Diária Fixa por Dia Trabalhado (R$)</label>
                    <input
                      type="number"
                      step="5.00"
                      min="0"
                      value={motoboySettings.dailyAllowance}
                      onChange={e => setMotoboySettings(prev => ({ ...prev, dailyAllowance: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400">
                    O valor é recalculado em tempo real sobre os pedidos do período selecionado.
                  </p>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Salvar Regras
                  </button>
                </div>
              </form>
            )}

            {/* KPIS DE MOTOBOYS NO PERÍODO */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Corridas Entregues</span>
                <div className="text-xl font-black text-white">
                  {motoboyCommissions.totals.totalDeliveries}
                </div>
                <p className="text-[10px] text-slate-500">{motoboyCommissions.totals.motoboysCount} entregadores</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase">Total Taxas Cobradas</span>
                <div className="text-xl font-black text-blue-400">
                  {formatCurrency(motoboyCommissions.totals.totalDeliveryFees)}
                </div>
                <p className="text-[10px] text-slate-500">Pagas pelos clientes</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">Comissão Calculada</span>
                <div className="text-xl font-black text-purple-400">
                  {formatCurrency(motoboyCommissions.totals.totalCommission)}
                </div>
                <p className="text-[10px] text-slate-500">Total apurado no período</p>
              </div>

              <div className="bg-slate-950 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Já Quitado / Pago</span>
                <div className="text-xl font-black text-emerald-400">
                  {formatCurrency(motoboyCommissions.totals.totalPaid)}
                </div>
                <p className="text-[10px] text-slate-500">Acertos realizados</p>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-500/10 to-slate-950 border-2 border-amber-500/40 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-amber-400 uppercase">Pendente de Acerto</span>
                <div className="text-xl font-black text-amber-400">
                  {formatCurrency(motoboyCommissions.totals.totalPending)}
                </div>
                <p className="text-[10px] text-amber-300 font-bold">A acertar no caixa</p>
              </div>
            </div>
          </div>

          {/* LISTA DE MOTOBOYS & ACERTO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>Extrato Consolidado por Entregador</span>
              </h4>
              <span className="text-xs text-slate-400">
                {motoboyCommissions.list.length} motoboy(s) encontrados
              </span>
            </div>

            {motoboyCommissions.list.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-3xl space-y-2">
                <Bike className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-bold text-sm">Nenhuma entrega de motoboy registrada no período</p>
                <p className="text-xs text-slate-500">
                  Quando houver pedidos na modalidade Delivery, o cálculo das comissões aparecerá aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {motoboyCommissions.list.map(mb => {
                  const isUnassigned = mb.motoboyName === 'Não Atribuído';

                  return (
                    <div
                      key={mb.motoboyName}
                      className={`bg-slate-950 border p-5 rounded-2xl transition-all space-y-3 ${
                        isUnassigned ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2.5 rounded-2xl ${
                            isUnassigned ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            <Bike className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-black text-white text-base">{mb.motoboyName}</h5>
                              {mb.status === 'pago' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  ✓ Quitado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {mb.deliveriesCount} corrida(s) realizada(s) • Taxas coletadas: {formatCurrency(mb.totalDeliveryFees)}
                            </p>
                          </div>
                        </div>

                        {/* Botões de Ação do Motoboy */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedMotoboyDetail(selectedMotoboyDetail === mb.motoboyName ? null : mb.motoboyName)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                          >
                            {selectedMotoboyDetail === mb.motoboyName ? 'Ocultar Corridas' : 'Ver Corridas'}
                          </button>

                          {!isUnassigned && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrintMotoboyTicket(mb)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition-all cursor-pointer"
                                title="Imprimir extrato térmico na Elgin i8"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Extrato Elgin</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPayoutModal(mb)}
                                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Pagar / Fazer Acerto</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cards de Métricas do Motoboy */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Total Comissão</span>
                          <div className="font-extrabold text-white">
                            {formatCurrency(mb.totalCommission)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Já Pago / Baixado</span>
                          <div className="font-extrabold text-emerald-400">
                            {formatCurrency(mb.paidCommission)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">A Pagar (Pendente)</span>
                          <div className="font-black text-amber-400">
                            {formatCurrency(mb.pendingCommission)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Média por Corrida</span>
                          <div className="font-extrabold text-slate-300">
                            {formatCurrency(mb.deliveriesCount > 0 ? mb.totalCommission / mb.deliveriesCount : 0)}
                          </div>
                        </div>
                      </div>

                      {/* DETALHE EXPANDIDO DAS CORRIDAS DO MOTOBOY */}
                      {selectedMotoboyDetail === mb.motoboyName && (
                        <div className="pt-3 border-t border-slate-900 space-y-2 animate-in fade-in">
                          <h6 className="text-[11px] font-bold text-slate-400 uppercase">
                            Corridas Registradas ({mb.orders.length})
                          </h6>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {mb.orders.map(order => (
                              <div
                                key={order.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs gap-2"
                              >
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-amber-400">#{order.id}</span>
                                    <span className="text-white font-bold">{order.customerName}</span>
                                    <span className="text-[10px] text-slate-400">• {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {order.isPaid ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-400 font-bold">Pago</span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-400 font-bold">Pendente</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate max-w-md">{order.address}</p>
                                </div>

                                <div className="flex items-center space-x-3 self-end sm:self-auto">
                                  <div className="text-right">
                                    <div className="text-[10px] text-slate-500">Taxa: {formatCurrency(order.deliveryFee)}</div>
                                    <div className="font-black text-amber-400">Comissão: {formatCurrency(order.commission)}</div>
                                  </div>

                                  {/* Seletor rápido para trocar o motoboy deste pedido */}
                                  <select
                                    onChange={e => handleQuickAssignMotoboy(order.id, e.target.value)}
                                    defaultValue=""
                                    className="p-1 bg-slate-950 border border-slate-700 rounded-lg text-[10px] text-slate-300 font-bold focus:outline-none"
                                    title="Trocar motoboy deste pedido"
                                  >
                                    <option value="" disabled>Trocar Motoboy...</option>
                                    {registeredMotoboys.map(mName => (
                                      <option key={mName} value={mName}>{mName}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE ACERTOS / PAGAMENTOS EFETUADOS AOS MOTOBOYS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Histórico de Acertos Realizados ({motoboyPayouts.length})</span>
              </h4>
            </div>

            {motoboyPayouts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhum pagamento registrado no histórico até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3">Entregador</th>
                      <th className="py-2.5 px-3">Corridas</th>
                      <th className="py-2.5 px-3">Forma Pagto</th>
                      <th className="py-2.5 px-3">Sangria no Caixa?</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3 text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {motoboyPayouts.slice(0, 20).map(payout => (
                      <tr key={payout.id} className="hover:bg-slate-950/40 transition-all">
                        <td className="py-2.5 px-3 text-slate-400">
                          {formatDateTime(payout.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-white">
                          {payout.motoboyName}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-300">
                          {payout.deliveryCount} entregas
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-400">
                          {payout.paymentMethod}
                        </td>
                        <td className="py-2.5 px-3">
                          {payout.sangriaRecorded ? (
                            <span className="text-emerald-400 font-bold text-[11px]">✓ Sim (Sangria)</span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Não</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {payout.operatorName}
                        </td>
                        <td className="py-2.5 px-3 font-black text-right text-emerald-400">
                          {formatCurrency(payout.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: FECHAMENTOS DE CAIXA (HISTÓRICO & LEITURAS Z) */}
      {/* ========================================================================= */}
      {activeSubTab === 'cashier' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Fechamentos de Caixa Realizados ({cashierHistory.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Turnos encerrados com conferência física e divergência apurada.
              </p>
            </div>
            <button
              type="button"
              onClick={loadFinancialData}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
            >
              <span>Atualizar lista</span>
            </button>
          </div>

          {cashierHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nenhum fechamento de caixa registrado no sistema ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Turno #</th>
                    <th className="py-3 px-3">Operador</th>
                    <th className="py-3 px-3">Abertura / Fechamento</th>
                    <th className="py-3 px-3">Faturamento</th>
                    <th className="py-3 px-3">Esperado Gaveta</th>
                    <th className="py-3 px-3">Contado</th>
                    <th className="py-3 px-3">Diferença</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cashierHistory.map(shift => {
                    const cData = shift.closingData || {};
                    const diff = cData.difference !== undefined ? Number(cData.difference) : 0;
                    const isExact = Math.abs(diff) < 0.01;
                    const isSurplus = diff > 0.01;

                    return (
                      <tr key={shift.id} className="hover:bg-slate-950/40 transition-all">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          #{shift.id}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">
                          {shift.operatorName}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          <div>{formatDateTime(shift.openedAt)}</div>
                          <div className="text-[10px] text-slate-500">
                            {shift.closedAt ? formatDateTime(shift.closedAt) : 'Ainda Aberto'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-black text-white">
                          {formatCurrency(cData.totalSales || 0)}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {formatCurrency(cData.expectedCash || 0)}
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-400">
                          {formatCurrency(cData.countedCash || 0)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isExact ? 'bg-emerald-500/10 text-emerald-400' : isSurplus ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isExact ? '✅ Bateu (R$ 0)' : isSurplus ? `+${formatCurrency(diff)} (Sobra)` : `${formatCurrency(diff)} (Falta)`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReprintShift(shift)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white font-bold text-[11px] transition-all cursor-pointer"
                            title="Reimprimir cupom do fechamento na Elgin i8"
                          >
                            🖨️ Elgin
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 4: EXTRATO DETALHADO DE PEDIDOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span>Extrato Detalhado de Transações ({filteredOrders.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Todos os pedidos registrados no período selecionado.
              </p>
            </div>

            {/* Barra de Busca */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar pedido, cliente..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Filtros em Linha: Pagamento, Canal, Status */}
          <div className="flex flex-wrap gap-2 pt-2">
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas Formas de Pagamento</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Cartão de Crédito</option>
              <option value="debito">Cartão de Débito</option>
            </select>

            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos os Canais</option>
              <option value="delivery">Delivery</option>
              <option value="takeout">Retirada Balcão</option>
              <option value="dine_in">Salão / Mesas</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos os Status</option>
              <option value="concluido">Concluídos</option>
              <option value="em_rota">Em Rota</option>
              <option value="em_producao">Em Produção</option>
              <option value="pagamento_confirmado">Pagamento Confirmado</option>
              <option value="aguardando_pagamento">Aguardando Pagamento</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          {/* TABELA DE PEDIDOS */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Nenhum pedido atende aos filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Pedido #</th>
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Canal</th>
                    <th className="py-3 px-3">Motoboy</th>
                    <th className="py-3 px-3">Pagamento</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map(order => {
                    const mbName = order.motoboyName || order.driverName || order.deliveryGps?.driverName || (order.deliveryType === 'delivery' ? 'Sem Entregador' : '-');

                    return (
                      <tr key={order.id} className="hover:bg-slate-950/40 transition-all">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          #{order.id}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {formatDateTime(order.createdAt || order.created_at)}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          <div>{order.customerName || order.customer_name || 'Cliente'}</div>
                          <div className="text-[10px] text-slate-500">{order.customerPhone || order.customer_phone || ''}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className="capitalize">{order.deliveryType || order.delivery_type || 'balcao'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className={`text-[11px] font-bold ${
                            mbName === 'Sem Entregador' ? 'text-rose-400' : 'text-slate-300'
                          }`}>
                            {mbName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-medium text-slate-300">
                            {order.paymentMethod || order.payment_method || 'pix'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'cancelado'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : order.status === 'concluido'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {order.status || 'novo'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-right text-emerald-400">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ACERTO / PAGAMENTO DE COMISSÃO AO MOTOBOY */}
      {/* ========================================================================= */}
      {payoutModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Acerto de Comissão de Entregador</h3>
                  <p className="text-xs text-slate-400">Entregador: <strong className="text-amber-400">{payoutModalData.motoboyName}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalData(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo do Pagamento */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Corridas a Quitar:</span>
                <span className="text-white font-extrabold">{payoutModalData.pendingOrders.length} entregas</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Valor Total a Pagar:</span>
                <span className="text-emerald-400 font-black text-xl">{formatCurrency(payoutModalData.amount)}</span>
              </div>
            </div>

            {/* Opções de Pagamento */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutPaymentMethod('dinheiro')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      payoutPaymentMethod === 'dinheiro'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Dinheiro (Gaveta)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutPaymentMethod('pix')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      payoutPaymentMethod === 'pix'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pix / Transferência</span>
                  </button>
                </div>
              </div>

              {/* Checkbox Sangria no Caixa */}
              <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="payoutSangria"
                  checked={payoutCreateSangria}
                  onChange={e => setPayoutCreateSangria(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="payoutSangria" className="text-xs font-bold text-white cursor-pointer select-none">
                  Lançar como <b>Sangria (Retirada)</b> no Caixa Aberto
                  <span className="block text-[10px] text-slate-400 font-normal">
                    Deduzirá automaticamente do dinheiro físico esperado na gaveta para bater o fechamento.
                  </span>
                </label>
              </div>

              {/* Checkbox Imprimir na Elgin i8 */}
              <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="payoutPrint"
                  checked={payoutPrintReceipt}
                  onChange={e => setPayoutPrintReceipt(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="payoutPrint" className="text-xs font-bold text-white cursor-pointer select-none">
                  🖨️ Imprimir <b>Vale Térmico</b> na impressora Elgin i8 (Bobina 80mm)
                </label>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="Ex: Diária da sexta-feira, acerto final da noite..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPayoutModalData(null)}
                disabled={isSubmittingPayout}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                disabled={isSubmittingPayout}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmittingPayout ? 'Registrando...' : 'Confirmar Pagamento & Baixa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
