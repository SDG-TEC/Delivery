import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ShoppingBag, DollarSign, TrendingUp, Smartphone,
  Monitor, ChefHat, ExternalLink, Copy, Check, Search, Phone,
  MapPin, Utensils, Award, ShieldCheck, CheckCircle2, MessageCircle,
  Plus, Edit3, Trash2, Eye, EyeOff, Printer, Clock, Filter, Sparkles, Palette,
  Bike, Navigation, KeyRound, Lock, ShieldAlert
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import {
  fetchCustomersFromDb,
  updateCustomerInDb,
  deleteCustomerInDb,
  saveCustomerProfile
} from '../../services/orderService';
import { formatCurrency, formatDateTime, STATUS_MAP, PAYMENT_METHODS } from '../../utils/formatters';
import { ProductModalAdmin } from './ProductModalAdmin';
import { CustomerModalAdmin } from './CustomerModalAdmin';
import { OrderEditModal } from '../common/OrderEditModal';
import { StoreCustomizationAdmin } from './StoreCustomizationAdmin';
import { PrinterSettingsAdmin } from './PrinterSettingsAdmin';
import { StaffUsersAdmin } from './StaffUsersAdmin';
import { SecurityAuditAdmin } from './SecurityAuditAdmin';
import { FinancialReportsAdmin } from './FinancialReportsAdmin';
import { MotoboyTrackingModal } from '../counter/MotoboyTrackingModal';

export const AdminView = () => {
  const {
    setCurrentView,
    orders,
    products,
    categories,
    saveProduct,
    deleteProduct,
    toggleProductActive,
    editOrder,
    triggerPrintTicket
  } = useOrder();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'clients' | 'menu' | 'links'
  const [customers, setCustomers] = useState([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('todos');
  const [searchOrder, setSearchOrder] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [copiedKey, setCopiedKey] = useState(null);

  // Modais
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sdg-delivery.vercel.app';
  const clientUrl = `${originUrl}/`;
  const counterUrl = `${originUrl}/balcao`;
  const kitchenUrl = `${originUrl}/cozinha`;
  const motoboyUrl = `${originUrl}/motoboy`;

  // Carregar lista de clientes do banco de dados
  const loadCustomers = useCallback(async () => {
    const res = await fetchCustomersFromDb();
    if (res.data && res.data.length > 0) {
      setCustomers(res.data);
    } else {
      // Extrair clientes a partir dos pedidos existentes
      const map = new Map();
      orders.forEach(o => {
        if (!map.has(o.customerPhone)) {
          map.set(o.customerPhone, {
            id: o.customerPhone,
            name: o.customerName,
            phone: o.customerPhone,
            address: o.address,
            total_orders: 1,
            created_at: o.createdAt
          });
        } else {
          const existing = map.get(o.customerPhone);
          existing.total_orders += 1;
        }
      });
      setCustomers(Array.from(map.values()));
    }
  }, [orders]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // KPIs
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelado')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const totalOrdersCount = orders.length;
  const averageTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const totalCustomersCount = customers.length;

  // Filtragem de Clientes
  const filteredCustomers = customers.filter(c => {
    const query = searchCustomer.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(query) ||
      (c.phone || '').includes(query) ||
      (c.address || '').toLowerCase().includes(query)
    );
  });

  // Filtragem de Produtos do Cardápio
  const filteredProducts = (products || []).filter(p => {
    const matchesCat = menuCategoryFilter === 'todos' || p.categoryId === menuCategoryFilter;
    const query = searchProduct.toLowerCase();
    const matchesQuery = (p.name || '').toLowerCase().includes(query) ||
                         (p.description || '').toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  // Filtragem de Pedidos
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const query = searchOrder.toLowerCase();
    const matchesSearch = o.id.toLowerCase().includes(query) ||
                          o.customerName.toLowerCase().includes(query) ||
                          o.customerPhone.includes(query);
    return matchesStatus && matchesSearch;
  });

  // Ações de Produtos
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (productData) => {
    await saveProduct(productData);
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (productId) => {
    await deleteProduct(productId);
    setIsProductModalOpen(false);
  };

  // Ações de Clientes
  const handleOpenNewCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleEditCustomer = (cust) => {
    setEditingCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (custData) => {
    if (custData.id && custData.id.length > 10) {
      await updateCustomerInDb(custData.id, custData);
    } else {
      await saveCustomerProfile(custData);
    }
    await loadCustomers();
    setIsCustomerModalOpen(false);
  };

  const handleDeleteCustomer = async (customerId) => {
    await deleteCustomerInDb(customerId);
    await loadCustomers();
    setIsCustomerModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Painel Header do Gestor */}
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel do Gestor & Operações</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Administração Completa</h1>
            <p className="text-slate-400 text-sm mt-1">
              Cadastre novos lanches no cardápio, edite clientes e gerencie todos os pedidos em tempo real.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTrackingModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              title="Abrir mapa de rastreamento de motoboys e pedidos em Almenara"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>🗺️ Rastrear Motoboys & Pedidos</span>
            </button>

            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Banco Supabase Online</span>
            </div>
          </div>
        </div>

        {/* MÉTRICAS DO NEGÓCIO (KPIS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Faturamento</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-500">Vendas confirmadas</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total de Pedidos</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              {totalOrdersCount}
            </div>
            <p className="text-[11px] text-slate-500">Pedidos registrados</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Clientes</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">
              {totalCustomersCount}
            </div>
            <p className="text-[11px] text-slate-500">Cadastrados no banco</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">
              {formatCurrency(averageTicket)}
            </div>
            <p className="text-[11px] text-slate-500">Média por pedido</p>
          </div>

        </div>

        {/* NAVEGAÇÃO DE ABAS DE GESTÃO */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Pedidos ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'finance'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>Financeiro & DRE</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span>Cardápio ({products?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('customization')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'customization'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-amber-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span>Personalizar Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'clients'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Clientes ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('printer')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'printer'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Impressora Elgin</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-amber-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Equipe & Senhas</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'links'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Links & QR</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'security'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-rose-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Segurança & Logs</span>
          </button>
        </div>

        {/* ============================================================================== */}
        {/* ABA 1: GESTÃO DE PEDIDOS (EDITAR ITENS E DADOS) */}
        {/* ============================================================================== */}
        {activeTab === 'orders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <span>Gestão Geral de Pedidos</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Você pode editar itens, adicionar produtos, alterar endereços e imprimir comprovantes de qualquer pedido.
                </p>
              </div>

              {/* Controles de Busca e Filtro */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Nº ou cliente..."
                    value={searchOrder}
                    onChange={(e) => setSearchOrder(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none w-40"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:border-amber-500 outline-none font-bold"
                >
                  <option value="all">Todos os Status</option>
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pagamento_confirmado">Pagamento Confirmado</option>
                  <option value="em_preparo">Em Preparo</option>
                  <option value="pronto">Pronto</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Tabela de Pedidos */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">Pedido / Data</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Itens</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-medium">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        const st = STATUS_MAP[order.status] || STATUS_MAP.aguardando_pagamento;
                        return (
                          <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-4">
                              <div className="font-extrabold text-amber-400 text-sm">{order.id}</div>
                              <div className="text-slate-500 text-[11px]">{formatDateTime(order.createdAt)}</div>
                            </td>

                            <td className="p-4">
                              <div className="font-bold text-white">{order.customerName}</div>
                              <div className="text-slate-400 text-[11px]">{order.customerPhone}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">{order.address}</div>
                            </td>

                            <td className="p-4 text-slate-300">
                              <span className="font-bold text-white">{order.items?.length || 0} itens:</span>
                              <div className="text-[11px] text-slate-400 line-clamp-1">
                                {(order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                              </div>
                            </td>

                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.color}`}>
                                {st.label}
                              </span>
                            </td>

                            <td className="p-4 text-right font-extrabold text-emerald-400 text-sm">
                              {formatCurrency(order.total)}
                            </td>

                            <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                              {/* Botão de Editar Pedido */}
                              <button
                                onClick={() => setEditingOrder(order)}
                                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all inline-flex items-center space-x-1 font-bold text-xs shadow-sm"
                                title="Editar itens, adicionar produto, mudar endereço ou status"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              {/* Imprimir Comprovante */}
                              <button
                                onClick={() => triggerPrintTicket(order, 'both')}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all inline-flex items-center"
                                title="Imprimir Comprovante"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
        )}

        {/* ============================================================================== */}
        {/* ABA 2: CLIENTES & CADASTROS */}
        {/* ============================================================================== */}
        {activeTab === 'clients' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Base de Clientes Cadastrados</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gerencie cadastros, endereços padrão, carimbos de fidelidade e PIN de acesso.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Botão Novo Cliente */}
                <button
                  onClick={handleOpenNewCustomer}
                  className="py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Novo Cliente</span>
                </button>

                {/* Busca por cliente */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, tel ou rua..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Clientes */}
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-300">Nenhum cliente encontrado</p>
                <p className="text-xs text-slate-500">Clique em "+ Novo Cliente" para cadastrar manualmente ou aguarde os pedidos pelo cardápio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">WhatsApp / Telefone</th>
                      <th className="py-3 px-4">Endereço de Entrega</th>
                      <th className="py-3 px-4 text-center">Fidelidade</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCustomers.map((cust, idx) => {
                      const cleanPhone = (cust.phone || '').replace(/\D/g, '');
                      return (
                        <tr key={cust.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white flex items-center space-x-2.5">
                            {cust.avatar_url ? (
                              <img
                                src={cust.avatar_url}
                                alt={cust.name}
                                className="w-8 h-8 rounded-full object-cover border border-amber-500/40 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0">
                                {(cust.name || 'C').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">{cust.name}</span>
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-300">
                            {cust.phone}
                          </td>

                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={cust.address}>
                            {cust.address ? (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{cust.address}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">Retirada no Balcão</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {cust.total_orders > 1 ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-extrabold text-[10px] border border-amber-500/20">
                                <Award className="w-3 h-3 text-amber-400" />
                                <span>{cust.total_orders} pedidos (VIP)</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold text-[10px]">
                                {cust.total_orders || 1} pedido
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* Editar Cliente */}
                            <button
                              onClick={() => handleEditCustomer(cust)}
                              className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white font-bold text-[11px] transition-all border border-slate-700/80"
                              title="Editar cadastro do cliente"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>

                            {/* WhatsApp */}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/55${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold text-[11px] transition-all"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
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

        {/* ============================================================================== */}
        {/* ABA 3: GESTÃO DO CARDÁPIO DE PRODUTOS */}
        {/* ============================================================================== */}
        {activeTab === 'menu' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center space-x-2">
                  <Utensils className="w-5 h-5 text-amber-400" />
                  <span>Cardápio de Produtos do Restaurante</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cadastre novos itens, altere preços, fotos, e pause itens esgotados no dia.
                </p>
              </div>

              {/* Botão Novo Item */}
              <button
                onClick={handleOpenNewProduct}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-amber-500/20 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Novo Item no Cardápio</span>
              </button>
            </div>

            {/* Filtros de Categoria e Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {(categories || []).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMenuCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      menuCategoryFilter === cat.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const category = (categories || []).find(c => c.id === product.categoryId);
                const isPaused = product.isActive === false;

                return (
                  <div
                    key={product.id}
                    className={`bg-slate-950 border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isPaused
                        ? 'border-rose-900/40 opacity-75'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex space-x-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-800">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {isPaused && (
                          <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center text-[9px] font-black uppercase text-rose-300 text-center px-1">
                            Pausado
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] uppercase font-black text-amber-400 truncate">
                              {category?.name || 'Geral'}
                            </span>
                            {product.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white mt-0.5 truncate">{product.name}</h3>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{product.description}</p>
                        </div>
                        
                        <div className="text-sm font-black text-emerald-400 mt-1">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    </div>

                    {/* Ações do Card de Produto */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      {/* Pausar / Ativar */}
                      <button
                        onClick={() => toggleProductActive(product.id)}
                        className={`flex items-center space-x-1 py-1.5 px-2.5 rounded-xl font-bold transition-all ${
                          isPaused
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={isPaused ? 'Reativar produto no cardápio' : 'Pausar venda hoje'}
                      >
                        {isPaused ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isPaused ? 'Pausado' : 'Disponível'}</span>
                      </button>

                      {/* Editar Item */}
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-bold transition-all border border-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ABA 4: LINKS DE ATENDIMENTO E OPERAÇÃO */}
        {/* ============================================================================== */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-2">
              <h2 className="text-xl font-black text-white">Links de Acesso Rápido</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada área do restaurante possui seu próprio link. Você pode abrir o Balcão no computador do caixa, a Cozinha em um tablet ou Smart TV, e divulgar o link do cardápio para os clientes no WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* CARD 1: CLIENTE */}
              <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-emerald-400 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Público • Clientes
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">1. Cardápio do Cliente</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Envie para clientes no WhatsApp ou coloque na Bio do Instagram. O cliente vê apenas o cardápio e monta o pedido.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 truncate select-all">
                    {clientUrl}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleCopy(clientUrl, 'client')}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20"
                  >
                    {copiedKey === 'client' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'client' ? 'Link Copiado!' : 'Copiar Link WhatsApp'}</span>
                  </button>
                  
                  <a
                    href={clientUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Cardápio</span>
                  </a>
                </div>
              </div>

              {/* CARD 2: BALCÃO / CAIXA */}
              <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-amber-400 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      Operador • Caixa
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">2. Painel do Balcão</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Fica aberto no caixa. Recebe os pedidos com som, imprime cupons na impressora térmica e confirma pagamentos.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 truncate select-all">
                    {counterUrl}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleCopy(counterUrl, 'counter')}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20"
                  >
                    {copiedKey === 'counter' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'counter' ? 'Link Copiado!' : 'Copiar Link Balcão'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('counter')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Monitor className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ir para o Balcão</span>
                  </button>
                </div>
              </div>

              {/* CARD 3: COZINHA (KDS) */}
              <div className="bg-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-blue-400 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      Produção • Cozinha
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">3. Monitor da Cozinha</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Fica na TV ou tablet da cozinha. Os pedidos caem aqui em colunas Kanban assim que o pagamento é confirmado.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-blue-400 truncate select-all">
                    {kitchenUrl}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleCopy(kitchenUrl, 'kitchen')}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-500 text-slate-950 font-black text-xs hover:bg-blue-400 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20"
                  >
                    {copiedKey === 'kitchen' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'kitchen' ? 'Link Copiado!' : 'Copiar Link Cozinha'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('kitchen')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ir para a Cozinha</span>
                  </button>
                </div>
              </div>

              {/* CARD 4: MOTOBOY (ENTREGADOR) */}
              <div className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-orange-400 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                      Logística • Entregas
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">4. App do Motoboy</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      O entregador abre no próprio celular. Recebe pedidos prontos, abre rota no GPS (Waze/Maps) e conclui a entrega com 1 clique.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-orange-400 truncate select-all">
                    {motoboyUrl}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleCopy(motoboyUrl, 'motoboy')}
                    className="w-full py-2.5 px-3 rounded-xl bg-orange-500 text-slate-950 font-black text-xs hover:bg-orange-400 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-orange-500/20"
                  >
                    {copiedKey === 'motoboy' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'motoboy' ? 'Link Copiado!' : 'Copiar Link Motoboy'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('motoboy')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Bike className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ir para o Motoboy</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ABA: PERSONALIZAR CARDÁPIO E LOJA */}
        {/* ============================================================================== */}
        {activeTab === 'customization' && (
          <StoreCustomizationAdmin />
        )}

        {/* ============================================================================== */}
        {/* ABA: CONFIGURAÇÃO DA IMPRESSORA TÉRMICA ELGIN i8 */}
        {/* ============================================================================== */}
        {activeTab === 'printer' && (
          <PrinterSettingsAdmin />
        )}

        {/* ============================================================================== */}
        {/* ABA: CONTROLE DE ACESSO, EQUIPE E SENHAS */}
        {/* ============================================================================== */}
        {activeTab === 'users' && (
          <StaffUsersAdmin />
        )}

        {/* ============================================================================== */}
        {/* ABA: RELATÓRIOS FINANCEIROS, DRE & FECHAMENTOS */}
        {/* ============================================================================== */}
        {activeTab === 'finance' && (
          <FinancialReportsAdmin />
        )}

        {/* ============================================================================== */}
        {/* ABA: CYBER SECURITY & AUDITORIA */}
        {/* ============================================================================== */}
        {activeTab === 'security' && (
          <SecurityAuditAdmin />
        )}

      </div>

      {/* Modal de Cadastro / Edição de Produto no Cardápio */}
      <ProductModalAdmin
        isOpen={isProductModalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
      />

      {/* Modal de Cadastro / Edição de Cliente */}
      <CustomerModalAdmin
        isOpen={isCustomerModalOpen}
        customer={editingCustomer}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
      />

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

      {/* Modal de Rastreamento de Motoboys e Pedidos */}
      {isTrackingModalOpen && (
        <MotoboyTrackingModal
          isOpen={isTrackingModalOpen}
          onClose={() => setIsTrackingModalOpen(false)}
        />
      )}

    </div>
  );
};
