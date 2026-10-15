import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, Key, MapPin, Award, ShoppingBag, RotateCcw,
  Sparkles, CheckCircle2, AlertCircle, LogOut, Edit3, ArrowRight,
  Gift, Heart, Star, Check, Camera, Upload, Loader2, Crosshair, Navigation
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { fetchCustomerOrdersFromDb } from '../../services/orderService';
import { formatCurrency, formatDateTime, STATUS_MAP } from '../../utils/formatters';
import { uploadMediaToSupabase } from '../../services/storageService';
import { MotoboyTrackingModal } from '../counter/MotoboyTrackingModal';

export const CustomerAuthModal = ({ isOpen, onClose, onOpenCart, onTrackOrder }) => {
  const {
    customer,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    updateCustomerAddress,
    updateCustomerAvatar,
    reorder,
    orders
  } = useOrder();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Login form fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Register form fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');

  // Avatar upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingRegAvatar, setUploadingRegAvatar] = useState(false);

  // Address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState('');

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  const handleGetGpsAddress = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setRegAddress(prev => prev ? `${prev} (GPS: ${lat}, ${lng})` : `Centro, Almenara - MG (GPS: ${lat}, ${lng})`);
      },
      () => {
        setIsGettingGps(false);
        alert('Não foi possível obter sua localização via GPS. Verifique a permissão do navegador.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg('');
    const res = await uploadMediaToSupabase(file, { folder: 'avatars', maxDim: 500 });
    setUploadingAvatar(false);

    if (res.url) {
      await updateCustomerAvatar(res.url);
      setSuccessMsg('Foto de perfil atualizada no Supabase com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg('Falha ao enviar foto: ' + (res.error || 'Erro no upload'));
    }
  };

  const handleRegAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRegAvatar(true);
    setErrorMsg('');
    const res = await uploadMediaToSupabase(file, { folder: 'avatars', maxDim: 500 });
    setUploadingRegAvatar(false);

    if (res.url) {
      setRegAvatarUrl(res.url);
      setSuccessMsg('Foto carregada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } else {
      setErrorMsg('Falha ao enviar foto: ' + (res.error || 'Erro no upload'));
    }
  };

  // Customer order history
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load customer order history when customer is logged in
  useEffect(() => {
    if (!customer?.phone) {
      setCustomerOrders([]);
      return;
    }

    const loadOrders = async () => {
      setLoadingHistory(true);
      // Fetch from Supabase
      const res = await fetchCustomerOrdersFromDb(customer.phone);
      if (res.data && res.data.length > 0) {
        setCustomerOrders(res.data);
      } else {
        // Fallback to filtering local orders
        const local = orders.filter(o => o.customerPhone === customer.phone);
        setCustomerOrders(local);
      }
      setLoadingHistory(false);
    };

    loadOrders();
    setNewAddressInput(customer.address || '');
  }, [customer, orders]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginPhone.trim() || !loginPin.trim()) {
      setErrorMsg('Informe seu telefone e a senha de 6 dígitos.');
      return;
    }

    if (loginPin.trim().length !== 6) {
      setErrorMsg('A senha deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setLoading(true);
    const res = await loginCustomer(loginPhone, loginPin);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Telefone ou senha incorretos.');
    } else {
      setSuccessMsg('Bem-vindo de volta!');
      setTimeout(() => setSuccessMsg(''), 2000);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim() || !regPhone.trim() || !regPin.trim() || !regAddress.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (regPin.trim().length !== 6) {
      setErrorMsg('Crie uma senha PIN de exatamente 6 dígitos numéricos.');
      return;
    }

    setLoading(true);
    const res = await registerCustomer({
      name: regName.trim(),
      phone: regPhone.trim(),
      pin: regPin.trim(),
      address: regAddress.trim(),
      avatar_url: regAvatarUrl
    });
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao cadastrar. Tente novamente.');
    } else {
      setSuccessMsg('Cadastro realizado com sucesso! Você já ganhou pontos.');
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddressInput.trim()) return;
    await updateCustomerAddress(newAddressInput.trim());
    setIsEditingAddress(false);
  };

  const handleReorderClick = (order) => {
    reorder(order);
    onClose();
    if (onOpenCart) onOpenCart();
  };

  // Loyalty calculations
  const totalOrders = Number(customer?.total_orders) || 0;
  const loyaltyGoal = 5; // Reward every 5 orders
  const currentProgress = totalOrders % loyaltyGoal;
  const isRewardUnlocked = totalOrders > 0 && currentProgress === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {customer ? 'Minha Conta & Fidelidade' : 'Clube de Vantagens & Prêmios'}
              </h2>
              <p className="text-xs text-slate-400">
                {customer ? 'Histórico de pedidos e vantagens exclusivas' : 'Cadastre-se com 6 dígitos e ganhe prêmios'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================================== */}
        {/* SE O CLIENTE JÁ ESTÁ LOGADO */}
        {/* ============================================================================== */}
        {customer ? (
          <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* VIP Loyalty Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-slate-950 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  {/* Customer Avatar with photo upload badge */}
                  <div className="relative group shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950/20 border-2 border-slate-950/30 overflow-hidden flex items-center justify-center shadow-inner">
                      {customer.avatar_url ? (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-slate-950/70" />
                      )}
                    </div>
                    <label
                      title="Alterar foto de perfil"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 text-amber-400 border border-amber-400/50 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-md"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950/20 px-2 py-0.5 rounded-md text-slate-950">
                      Membro VIP Delivery
                    </span>
                    <h3 className="text-xl font-black mt-1 leading-tight">Olá, {customer.name}!</h3>
                    <p className="text-xs font-semibold opacity-90">{customer.phone}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-950/15 flex items-center justify-center font-black text-sm shrink-0">
                  ⭐ {totalOrders}
                </div>
              </div>

              {/* Progress Bar / Loyalty Stamps */}
              <div className="mt-4 pt-3 border-t border-slate-950/15 space-y-2">
                <div className="flex justify-between text-xs font-black">
                  <span>Plano de Fidelidade</span>
                  <span>{currentProgress} de {loyaltyGoal} pedidos</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((step) => {
                    const filled = step <= currentProgress || isRewardUnlocked;
                    return (
                      <div
                        key={step}
                        className={`h-2.5 rounded-full transition-all ${
                          filled ? 'bg-slate-950' : 'bg-slate-950/20'
                        }`}
                      />
                    );
                  })}
                </div>

                <p className="text-[11px] font-bold mt-1 text-slate-950/80">
                  {isRewardUnlocked
                    ? '🎉 Parabéns! Você completou a meta e tem R$ 25 de desconto no próximo pedido!'
                    : `Faltam apenas ${loyaltyGoal - currentProgress} pedidos para você ganhar um super prêmio!`
                  }
                </p>
              </div>
            </div>

            {/* Saved Address Section */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Endereço de Entrega Padrão</span>
                </div>
                {!isEditingAddress ? (
                  <button
                    onClick={() => setIsEditingAddress(true)}
                    className="text-amber-400 hover:underline text-xs font-bold flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Alterar</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveNewAddress}
                    className="text-emerald-400 text-xs font-bold flex items-center space-x-1 hover:underline"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                )}
              </div>

              {!isEditingAddress ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">
                    {customer.address || 'Nenhum endereço cadastrado ainda.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>🗺️ Ver Localização da Minha Conta no Mapa de Almenara</span>
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  placeholder="Novo endereço com número e bairro..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              )}
            </div>

            {/* Order History with "Pedir Novamente" */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Meus Pedidos Anteriores</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {customerOrders.length} {customerOrders.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Carregando seus pedidos...
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Você ainda não fez nenhum pedido.</p>
                  <p className="text-[11px] text-slate-500">Monte seu primeiro lanche no cardápio!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerOrders.slice(0, 5).map(order => {
                    const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.aguardando_pagamento;
                    const isActive = order.status !== 'entregue' && order.status !== 'cancelado';

                    return (
                      <div
                        key={order.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold text-amber-400 font-mono">
                              #{order.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusInfo.color}`}>
                              {statusInfo.shortLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-1">
                          {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                          <span className="text-xs font-black text-white">
                            {formatCurrency(order.total)}
                          </span>

                          <div className="flex items-center space-x-2">
                            {isActive && onTrackOrder && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onTrackOrder(order);
                                }}
                                className="py-1.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-black transition-all flex items-center space-x-1"
                              >
                                <span>Acompanhar Ao Vivo</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleReorderClick(order)}
                              className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-[11px] font-black transition-all flex items-center space-x-1.5"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Pedir Novamente</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                Seu endereço fica salvo para o próximo pedido.
              </span>
              <button
                onClick={logoutCustomer}
                className="text-xs font-bold text-rose-400 hover:underline flex items-center space-x-1 py-1 px-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>

          </div>
        ) : (
          /* ============================================================================== */
          /* SE O CLIENTE NÃO ESTÁ LOGADO (CADASTRO / LOGIN) */
          /* ============================================================================== */
          <div className="p-5 sm:p-6 space-y-6">
            
            {/* Benefits Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Vantagens do Clube de Fidelidade</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                <li>Acumule pedidos e ganhe prêmios e lanches grátis</li>
                <li>Repita seus lanches favoritos com apenas 1 clique</li>
                <li>Endereço salvo: nunca mais digite na hora da fome</li>
              </ul>
            </div>

            {/* Tabs: Entrar vs Cadastrar */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                  authMode === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Já tenho cadastro (Entrar)
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                  authMode === 'register'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Cadastro Rápido
              </button>
            </div>

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM 1: LOGIN */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Seu Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Senha de 6 Dígitos (PIN)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none tracking-widest font-mono text-center text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Entrando...' : 'Acessar Meus Pedidos & Prêmios'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* FORM 2: REGISTER */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Optional Avatar Upload */}
                <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="relative w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {regAvatarUrl ? (
                      <img src={regAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-500" />
                    )}
                    {uploadingRegAvatar && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">Foto de Perfil (Opcional)</p>
                    <p className="text-[11px] text-slate-400 mb-1">Carregue sua foto para o perfil VIP</p>
                    <label className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingRegAvatar ? 'Enviando...' : regAvatarUrl ? 'Trocar Foto' : 'Escolher Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRegAvatarUpload}
                        disabled={uploadingRegAvatar}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primeiro Nome *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Ex: Carlos ou Fernanda"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Telefone / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Crie uma Senha de 6 Dígitos (PIN) *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Ex: 123456"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none tracking-widest font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Endereço Completo de Entrega *
                    </label>
                    <button
                      type="button"
                      onClick={handleGetGpsAddress}
                      disabled={isGettingGps}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Crosshair className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                      <span>{isGettingGps ? 'Localizando...' : 'Usar Meu GPS'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <textarea
                      rows={2}
                      placeholder="Rua, Número, Bairro e Complemento em Almenara - MG..."
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Gift className="w-4 h-4" />
                  <span>{loading ? 'Cadastrando...' : 'Cadastrar & Entrar no Clube'}</span>
                </button>
              </form>
            )}

          </div>
        )}

      </div>

      {showMapModal && (
        <MotoboyTrackingModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
};
