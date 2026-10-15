import React, { useState, useEffect } from 'react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, formatTime, formatDateTime } from '../../utils/formatters';
import { formatWhatsAppLink } from '../../utils/theme';
import { WhatsAppIcon } from '../common/BrandIcons';
import confetti from 'canvas-confetti';
import {
  Bike, Navigation, Phone, MapPin, CheckCircle2, Clock,
  DollarSign, Package, AlertTriangle, ExternalLink, ChevronDown,
  ChevronUp, User, Sparkles, RefreshCw, Send, Check, ShieldCheck, LogOut
} from 'lucide-react';

export const MotoboyView = () => {
  const { orders, updateOrderStatus, storeSettings, setCurrentView, sendMotoboyLocation, editOrder, staffUser, logoutStaffUser, isRoot } = useOrder();

  const [activeTab, setActiveTab] = useState('active'); // 'available' | 'active' | 'done'
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [driverName, setDriverName] = useState(() => {
    if (staffUser?.name) return staffUser.name;
    return localStorage.getItem('sdg_motoboy_name') || 'Entregador 1';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Rastreamento GPS
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'tracking' | 'denied' | 'simulating'
  const [currentCoords, setCurrentCoords] = useState(null);
  const [simulationActive, setSimulationActive] = useState(false);

  const saveDriverName = (name) => {
    const clean = name.trim() || 'Entregador';
    setDriverName(clean);
    localStorage.setItem('sdg_motoboy_name', clean);
    setIsEditingName(false);
  };

  // Filtragem de pedidos para entrega
  const deliveryOrders = orders.filter(o => o.deliveryType === 'delivery');

  // 1. Prontos para entrega (disponíveis para o motoboy coletar na cozinha)
  const availableOrders = deliveryOrders.filter(o => o.status === 'pronto');

  // 2. Em rota de entrega com o motoboy
  const inRouteOrders = deliveryOrders.filter(o => o.status === 'saiu_para_entrega');

  // 3. Entregues hoje
  const completedOrders = deliveryOrders.filter(o => o.status === 'entregue');

  // Notificação sonora e vibração ao surgir novo pedido pronto
  useEffect(() => {
    if (availableOrders.length > 0 && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }
  }, [availableOrders.length]);

  // Screen Wake Lock API (mantém a tela acesa enquanto houver entregas em andamento)
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isOnline && inRouteOrders.length > 0) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [isOnline, inRouteOrders.length]);

  // Rastreamento Geolocation nativo do navegador
  useEffect(() => {
    if (simulationActive) return; // Se estiver em teste simulado, não usa GPS real
    if (!gpsEnabled || !isOnline || typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('idle');
      return;
    }

    setGpsStatus('tracking');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed !== null && pos.coords.speed !== undefined ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy || 0),
          updatedAt: new Date().toISOString()
        };
        setCurrentCoords(coords);

        const currentActiveOrder = inRouteOrders[0];

        if (sendMotoboyLocation) {
          sendMotoboyLocation({
            id: driverName,
            driverName,
            orderId: currentActiveOrder?.id || '',
            latitude: coords.latitude,
            longitude: coords.longitude,
            speed: coords.speed,
            heading: coords.heading,
            accuracy: coords.accuracy,
            isOnline: true
          });
        }
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsEnabled, isOnline, simulationActive, driverName, inRouteOrders, sendMotoboyLocation, editOrder]);

  // Simulação de movimento para demonstração e testes no computador (Centro de Almenara - MG)
  useEffect(() => {
    if (!simulationActive) return;
    setGpsStatus('simulating');

    const isNearSP = storeSettings?.latitude && Math.abs(storeSettings.latitude - (-23.550520)) < 0.01;
    let lat = storeSettings?.latitude && !isNearSP ? storeSettings.latitude : -16.1834;
    let lng = storeSettings?.longitude && !isNearSP ? storeSettings.longitude : -40.6936;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      lat += (Math.sin(step / 2) * 0.0006);
      lng += (Math.cos(step / 2) * 0.0007);
      const simulatedSpeed = Math.round(28 + Math.random() * 12);

      const simCoords = {
        latitude: lat,
        longitude: lng,
        speed: simulatedSpeed,
        heading: (step * 35) % 360,
        accuracy: 5,
        updatedAt: new Date().toISOString()
      };

      setCurrentCoords(simCoords);

      const currentActiveOrder = inRouteOrders[0];

      if (sendMotoboyLocation) {
        sendMotoboyLocation({
          id: driverName,
          driverName,
          orderId: currentActiveOrder?.id || '',
          latitude: lat,
          longitude: lng,
          speed: simulatedSpeed,
          heading: (step * 35) % 360,
          accuracy: 5,
          isOnline: true
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [simulationActive, driverName, inRouteOrders, sendMotoboyLocation, storeSettings, editOrder]);

  // Total a acertar no caixa em dinheiro (pedidos entregues em dinheiro)
  const cashToReconcile = completedOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Total de taxas de entrega realizadas (estimativa de ganhos do motoboy)
  const defaultFee = Number(storeSettings?.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
  const estimatedEarnings = completedOrders.reduce((acc, o) => {
    const fee = o.deliveryFee !== undefined && o.deliveryFee !== null ? Number(o.deliveryFee) : defaultFee;
    return acc + fee;
  }, 0);

  // Ações do Motoboy
  const handleStartDelivery = (orderId) => {
    updateOrderStatus(orderId, 'saiu_para_entrega');
    setActiveTab('active');
    try {
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (e) {}
  };

  const handleCompleteDelivery = (order) => {
    updateOrderStatus(order.id, 'entregue');
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
    } catch (e) {}
  };

  // Helper para abrir Waze e Google Maps
  const getMapsUrl = (address) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const getWazeUrl = (address) => {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  };

  const getCustomerWhatsAppArrived = (order) => {
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const msg = `Olá, *${order.customerName}*! Sou o entregador do *${storeSettings?.restaurantName || 'Delivery'}* e já estou na sua porta/portão com o seu pedido *#${order.id}*! 🛵 Pode vir receber?`;
    return formatWhatsAppLink(cleanPhone, msg);
  };

  const storePhone = (storeSettings?.whatsapp || storeSettings?.phoneSupport || '').replace(/\D/g, '');
  const storeWhatsAppUrl = formatWhatsAppLink(storePhone, 'Olá! Sou o motoboy de entregas e gostaria de falar com o caixa.');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans">
      
      {/* Motoboy Top Bar (Mobile Optimized) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Loja */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 font-black">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-black text-white truncate max-w-[140px] sm:max-w-xs">
                  {storeSettings?.restaurantName || 'SDG Delivery'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  Motoboy
                </span>
              </div>
              
              {/* Driver name editable */}
              {isEditingName ? (
                <div className="flex items-center space-x-1 mt-0.5">
                  <input
                    type="text"
                    defaultValue={driverName}
                    autoFocus
                    onBlur={(e) => saveDriverName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveDriverName(e.target.value)}
                    className="bg-slate-950 border border-amber-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28"
                  />
                  <button onClick={() => setIsEditingName(false)} className="text-[10px] text-slate-400">Ok</button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 truncate"
                  title="Clique para mudar o nome do entregador"
                >
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="font-bold">{driverName}</span>
                  <span className="text-[9px] text-slate-600">(mudar)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions (WhatsApp da Loja & Status Online) */}
          <div className="flex items-center space-x-2 shrink-0">
            {storePhone && (
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white px-2.5 py-1.5 rounded-xl border border-[#25D366]/30 text-xs font-bold transition-all"
                title="Falar com a Cozinha / Caixa"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" colored={false} />
                <span className="hidden sm:inline">Loja</span>
              </a>
            )}

            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                isOnline
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{isOnline ? 'Online' : 'Pausa'}</span>
            </button>

            {/* Sair / Logout */}
            <button
              onClick={logoutStaffUser}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-rose-500/30 text-xs font-bold transition-all"
              title="Sair do App do Motoboy"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        
        {/* Banner de Rastreamento GPS ao Vivo */}
        <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all ${
          gpsStatus === 'tracking' || gpsStatus === 'simulating'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : gpsStatus === 'denied'
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-3 h-3 rounded-full ${
              gpsStatus === 'tracking' || gpsStatus === 'simulating'
                ? 'bg-emerald-400 animate-ping'
                : 'bg-slate-600'
            }`} />
            <div>
              <div className="flex items-center space-x-1.5 font-extrabold text-xs">
                <span>
                  {gpsStatus === 'tracking'
                    ? '🛰️ GPS Ativo (Transmitindo localização ao Balcão)'
                    : gpsStatus === 'simulating'
                    ? '🛰️ GPS Simulado Ativo (Modo de Teste / Demonstração)'
                    : gpsStatus === 'denied'
                    ? '⚠️ Permissão de Localização negada no navegador'
                    : '🛰️ Rastreamento GPS do Entregador'}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {currentCoords ? (
                  <span>
                    Lat: {currentCoords.latitude.toFixed(5)} | Lng: {currentCoords.longitude.toFixed(5)}
                    {currentCoords.speed > 0 && ` • Vel: ${currentCoords.speed} km/h`}
                    {currentCoords.accuracy > 0 && ` • Sinal: ±${currentCoords.accuracy}m`}
                  </span>
                ) : (
                  <span>Sua localização aparecerá no mapa do caixa em tempo real.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSimulationActive(!simulationActive)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                simulationActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Simula movimento da moto pelas ruas para você testar no mapa do computador"
            >
              {simulationActive ? 'Parar Teste GPS' : 'Simular Rota (Teste)'}
            </button>

            <button
              type="button"
              onClick={() => setGpsEnabled(!gpsEnabled)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                gpsEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {gpsEnabled ? 'GPS Ligado' : 'GPS Desligado'}
            </button>
          </div>
        </div>

        {/* Resumo do Turno do Motoboy */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-900 border border-slate-800 p-3.5 rounded-3xl shadow-lg">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Entregas</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">{completedOrders.length}</span>
            <span className="text-[9px] text-slate-500 block">hoje</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Acertar Dinheiro</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 truncate block">
              {formatCurrency(cashToReconcile)}
            </span>
            <span className="text-[9px] text-slate-500 block">no caixa</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Minhas Taxas</span>
            <span className="text-base sm:text-lg font-black text-white truncate block">
              {formatCurrency(estimatedEarnings)}
            </span>
            <span className="text-[9px] text-slate-500 block">estimadas</span>
          </div>
        </div>

        {/* Abas de Navegação das Entregas */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-3 px-2 rounded-xl font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1.5 ${
              activeTab === 'active'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🛵 Na Minha Rota</span>
            {inRouteOrders.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'active' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {inRouteOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('available')}
            className={`py-3 px-2 rounded-xl font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1.5 ${
              activeTab === 'available'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📦 Prontos na Cozinha</span>
            {availableOrders.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black animate-pulse ${
                activeTab === 'available' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950'
              }`}>
                {availableOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('done')}
            className={`py-3 px-2 rounded-xl font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1.5 ${
              activeTab === 'done'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✅ Entregues ({completedOrders.length})</span>
          </button>
        </div>

        {/* LISTAGEM DE PEDIDOS CONFORME A ABA SELECIONADA */}

        {/* 1. ABA: NA MINHA ROTA (EM ROTA COM O MOTOBOY) */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {inRouteOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-white">Nenhum pedido em rota no momento</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {availableOrders.length > 0
                    ? `Existem ${availableOrders.length} pedido(s) pronto(s) na cozinha esperando para serem coletados!`
                    : 'Aguarde a cozinha finalizar os próximos pedidos ou consulte a aba de Prontos.'}
                </p>
                {availableOrders.length > 0 && (
                  <button
                    onClick={() => setActiveTab('available')}
                    className="py-2.5 px-5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-lg hover:bg-emerald-400 transition-all active:scale-95"
                  >
                    Ver Pedidos Prontos na Cozinha ({availableOrders.length})
                  </button>
                )}
              </div>
            ) : (
              inRouteOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isCash = order.paymentMethod === 'cash';
                const isCard = order.paymentMethod === 'credit_card';
                const isPix = order.paymentMethod === 'pix';

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden"
                  >
                    {/* Top Order Badge & Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow">
                          #{order.id}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {formatTime(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/40">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>EM ROTA COM VOCÊ</span>
                      </div>
                    </div>

                    {/* Cliente e Endereço */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Cliente</span>
                        <div className="text-base font-black text-white">{order.customerName}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Endereço de Entrega</span>
                        <div className="text-sm font-extrabold text-amber-300 leading-snug flex items-start space-x-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{order.address}</span>
                        </div>
                      </div>

                      {order.observation && (
                        <div className="p-2.5 rounded-xl bg-slate-900 text-xs text-amber-200/90 font-medium border border-slate-800">
                          <b>Obs:</b> {order.observation}
                        </div>
                      )}
                    </div>

                    {/* ALERTA FINANCEIRO DE COBRANÇA */}
                    {isCash && (
                      <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-black space-y-1 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide">⚠️ Cobrança Obrigatória</span>
                          <span className="text-xl font-black">{formatCurrency(order.total)}</span>
                        </div>
                        <p className="text-xs text-slate-900 font-bold">
                          RECEBER EM DINHEIRO NA ENTREGA! (Confira o troco com atenção)
                        </p>
                      </div>
                    )}

                    {isCard && (
                      <div className="p-4 rounded-2xl bg-blue-600 text-white font-black space-y-1 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide">💳 Passar Maquininha</span>
                          <span className="text-xl font-black">{formatCurrency(order.total)}</span>
                        </div>
                        <p className="text-xs text-blue-100 font-bold">
                          COBRAR NO CARTÃO DE CRÉDITO/DÉBITO NA MAQUININHA!
                        </p>
                      </div>
                    )}

                    {isPix && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>PAGO VIA PIX (NÃO COBRAR NADA DO CLIENTE)</span>
                        </div>
                        <span className="font-black text-white">{formatCurrency(order.total)}</span>
                      </div>
                    )}

                    {/* ATALHOS DE GPS (GOOGLE MAPS & WAZE) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <a
                        href={getMapsUrl(order.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 active:scale-95"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Abrir no Maps</span>
                      </a>

                      <a
                        href={getWazeUrl(order.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 active:scale-95"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Abrir no Waze</span>
                      </a>
                    </div>

                    {/* ATALHOS DE COMUNICAÇÃO COM O CLIENTE */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <a
                        href={`tel:${order.customerPhone.replace(/\D/g, '')}`}
                        className="py-3 px-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                      >
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>Ligar p/ Cliente</span>
                      </a>

                      <a
                        href={getCustomerWhatsAppArrived(order)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 active:scale-95"
                      >
                        <WhatsAppIcon className="w-4 h-4" colored={false} />
                        <span>Avisar "Cheguei!"</span>
                      </a>
                    </div>

                    {/* Itens do Pedido (Sanfona rápida para conferência) */}
                    <div className="border-t border-slate-800/80 pt-2">
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1"
                      >
                        <span className="font-bold">
                          📦 Conferir Itens da Mochila ({order.items?.length || 0} produtos)
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start border-b border-slate-850 pb-1.5 last:border-0 last:pb-0">
                              <div>
                                <span className="font-bold text-white">
                                  {item.quantity}x {item.name}
                                </span>
                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                  <div className="text-[10px] text-amber-300/80 mt-0.5">
                                    {item.selectedOptions.map(o => typeof o === 'string' ? o : o.name).join(', ')}
                                  </div>
                                )}
                              </div>
                              <span className="text-slate-400 font-medium">
                                {formatCurrency(item.subtotal || item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BOTÃO GIGANTE: CONFIRMAR ENTREGA REALIZADA */}
                    <button
                      onClick={() => handleCompleteDelivery(order)}
                      className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      <span>Confirmar Entrega Concluída</span>
                    </button>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. ABA: PRONTOS NA COZINHA (DISPONÍVEIS PARA O MOTOBOY COLETAR) */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {availableOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-white">Nenhum pedido pronto para coleta agora</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  A cozinha está preparando os pedidos. Assim que ficarem prontos e embalados, eles aparecerão aqui com aviso sonoro!
                </p>
              </div>
            ) : (
              availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm">
                        #{order.id}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Pronto às {formatTime(order.updatedAt || order.createdAt)}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black border border-emerald-500/30">
                      EMBALADO
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <div className="text-xs font-black text-white">{order.customerName}</div>
                    <div className="text-xs text-amber-300 font-semibold flex items-start space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{order.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400 font-bold">
                      Pagamento: <b className="text-white uppercase">{order.paymentMethod}</b>
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      {formatCurrency(order.total)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartDelivery(order.id)}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <Bike className="w-4 h-4 stroke-[2.5]" />
                    <span>Pegar Pedido e Iniciar Rota</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. ABA: HISTÓRICO DE ENTREGAS CONCLUÍDAS HOJE */}
        {activeTab === 'done' && (
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-xs shadow-xl">
                Você ainda não concluiu entregas hoje.
              </div>
            ) : (
              completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-white text-sm">#{order.id}</span>
                      <span className="text-xs text-slate-400">{order.customerName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{order.address}</p>
                    <span className="text-[10px] text-slate-400">
                      Forma: <b className="text-slate-300 uppercase">{order.paymentMethod}</b>
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-emerald-400">
                      {formatCurrency(order.total)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold block">
                      Entregue às {formatTime(order.updatedAt || order.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* Floating Bottom Link */}
      <div className="fixed bottom-3 left-0 right-0 max-w-sm mx-auto px-4 z-30">
        <div className="bg-slate-900/95 border border-slate-800 rounded-full py-2 px-4 shadow-xl backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">App Motoboy</span>
            <span className="text-[10px] text-slate-500">• {driverName}</span>
          </span>

          {isRoot ? (
            <button
              onClick={() => setCurrentView('counter')}
              className="text-amber-400 hover:underline font-bold text-[11px]"
            >
              👑 Voltar ao Balcão
            </button>
          ) : (
            <button
              onClick={logoutStaffUser}
              className="text-rose-400 hover:underline font-bold text-[11px]"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
