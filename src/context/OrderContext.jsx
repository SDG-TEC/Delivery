import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_ORDERS, PRODUCTS, CATEGORIES } from '../data/mockData';
import {
  isSupabaseConfigured,
  getSupabaseConfig
} from '../services/supabase';
import {
  fetchOrdersFromDb,
  insertOrderInDb,
  updateOrderStatusInDb,
  updateOrderInDb,
  subscribeToOrdersRealtime,
  subscribeToStoreSettingsRealtime,
  subscribeToProductsRealtime,
  saveCustomerProfile,
  loginCustomerByPin,
  fetchCustomerOrdersFromDb,
  fetchProductsFromDb,
  saveProductInDb,
  deleteProductInDb,
  toggleProductActiveInDb,
  updateCustomerInDb,
  deleteOrderInDb,
  deleteOrdersBatchInDb,
  fetchStoreSettingsFromDb,
  saveStoreSettingsToDb,
  updateMotoboyLocationInDb,
  updateOrderDeliveryGpsInDb,
  fetchMotoboyLocationsFromDb,
  subscribeToMotoboyLocationsRealtime,
  broadcastMotoboyLocation,
  subscribeToMotoboyBroadcast
} from '../services/orderService';
import { applyThemeToDocument } from '../utils/theme';
import {
  getPrinterSettings,
  savePrinterSettings,
  testPrinterStatus,
  printDirectToNetworkPrinter,
  printTestTicketDirect
} from '../services/printerService';
import {
  getStaffSession,
  loginStaff,
  logoutStaff,
  registerStaff,
  getActiveStaffUser,
  onStaffAuthStateChange
} from '../services/staffAuthService';
import {
  DEFAULT_TABLES,
  TABLES_STORAGE_KEY,
  TABLES_BROADCAST_CHANNEL,
  getLocalTables,
  saveLocalTables,
  fetchTablesFromDb,
  saveTableInDb,
  addTableInDb,
  deleteTableInDb,
  subscribeToTablesRealtime
} from '../services/tableService';
import {
  checkViewAuthorization,
  validateOrderStatusTransition,
  isActionAuthorized,
  verifySessionIntegrity
} from '../services/securityService';
import { checkRateLimit, recordRateLimitAttempt } from '../services/securityRateLimiter';
import { logSecurityEvent, SECURITY_EVENT_TYPES, getDeviceFingerprint } from '../services/securityLogger';
import { sanitizeOrderPayload, sanitizeSafeString } from '../utils/securitySanitizer';

const OrderContext = createContext();

const BROADCAST_CHANNEL_NAME = 'sdg_delivery_sync_channel';
const LOCAL_STORAGE_KEY = 'sdg_delivery_orders_v1';
const PRODUCTS_STORAGE_KEY = 'sdg_delivery_products_v1';
const SETTINGS_STORAGE_KEY = 'sdg_delivery_settings_v1';
const MOTOBOY_LOCATIONS_STORAGE_KEY = 'sdg_delivery_motoboy_locations_v1';

export const DEFAULT_STORE_SETTINGS = {
  restaurantName: 'SDG Burger & Pizza',
  slogan: 'Artesanais, Pizzas & Delivery no WhatsApp',
  logoUrl: '',
  coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  themePreset: 'amber', // 'amber' | 'rose' | 'orange' | 'emerald' | 'purple' | 'blue' | 'pink' | 'dark' | 'custom'
  primaryColor: '#f59e0b',
  secondaryColor: '#ea580c',
  isOpen: true,
  closedMessage: 'No momento estamos fechados. Nosso horário de atendimento é de Terça a Domingo das 18h às 23h30.',
  deliveryTime: '30 - 45 min',
  deliveryFee: 5.00,
  freeDeliveryThreshold: 80.00,
  bannerNotice: '🔥 PROMOÇÃO: Frete Grátis em pedidos acima de R$ 80!',
  showBannerNotice: true,
  phoneSupport: '(33) 99999-8888',
  whatsapp: '(33) 99999-8888',
  whatsappMessage: 'Olá! Vim pelo cardápio digital e gostaria de tirar uma dúvida.',
  showFloatingWhatsApp: true,
  instagram: '@sdgdelivery',
  address: 'Centro, Almenara - MG',
  latitude: -16.1834,
  longitude: -40.6936,
  openingHours: 'Terça a Domingo: 18:00 às 23:30',
  // Configuração Oficial de Pagamento PIX (Banco Central / BRCode)
  pixKey: '(33) 99999-8888',
  pixKeyType: 'phone', // 'phone' | 'cpf' | 'cnpj' | 'email' | 'random'
  pixBeneficiaryName: 'SDG Delivery Almenara',
  pixCity: 'Almenara',
  pixEnabled: true
};

// Web Audio API ding-dong notification sound generator (Anota AI style)
const playAlertSound = (type = 'new_order') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'new_order') {
      // Ding-dong chord (E5 then A5)
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(659.25, 0, 0.4);      // E5
      playTone(880.00, 0.25, 0.6);    // A5
    } else {
      // Quick confirmation blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Audio playback failed', e);
  }
};

const getViewFromUrl = () => {
  if (typeof window === 'undefined') return 'client';
  const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
  const query = new URLSearchParams(window.location.search).get('view');
  
  const target = (query || hash || path).toLowerCase();
  if (target.includes('motoboy') || target.includes('entrega') || target.includes('driver') || target.includes('courier')) return 'motoboy';
  if (target.includes('balcao') || target.includes('caixa') || target.includes('counter') || target.includes('gestor')) return 'counter';
  if (target.includes('cozinha') || target.includes('kds') || target.includes('kitchen')) return 'kitchen';
  if (target.includes('admin') || target.includes('painel') || target.includes('links')) return 'admin';
  return 'client';
};

export const OrderProvider = ({ children }) => {
  const [currentView, setCurrentViewState] = useState(getViewFromUrl);
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_ORDERS;
  });

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Garante que o cardápio em cache tenha as novas opções de acréscimos das pizzas
        const p3 = Array.isArray(parsed) ? parsed.find(p => p.id === 'p3') : null;
        const hasAcrescimos = p3?.options?.some(g => 
          g.name?.toLowerCase().includes('acréscimo') || g.name?.toLowerCase().includes('extra')
        );
        if (hasAcrescimos) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return PRODUCTS;
  });

  const [cart, setCart] = useState([]);
  const [printTicket, setPrintTicket] = useState(null);
  const [tables, setTables] = useState(() => getLocalTables());

  // Rastreamento GPS de Motoboys em Tempo Real
  const [motoboyLocations, setMotoboyLocations] = useState(() => {
    try {
      const saved = localStorage.getItem(MOTOBOY_LOCATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const sendMotoboyLocation = (locData) => {
    if (!locData || locData.latitude === undefined || locData.longitude === undefined) return;
    const driverId = locData.id || locData.driverName || 'driver-1';
    const cleanData = {
      ...locData,
      id: driverId,
      driverName: locData.driverName || 'Entregador',
      orderId: locData.orderId || '',
      latitude: Number(locData.latitude),
      longitude: Number(locData.longitude),
      speed: Number(locData.speed || 0),
      heading: Number(locData.heading || 0),
      accuracy: Number(locData.accuracy || 0),
      isOnline: locData.isOnline !== undefined ? locData.isOnline : true,
      updatedAt: new Date().toISOString()
    };

    setMotoboyLocations(prev => {
      const updated = { ...prev, [driverId]: cleanData };
      try {
        localStorage.setItem(MOTOBOY_LOCATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ type: 'SYNC_MOTOBOY_LOCATION', data: cleanData });
        channel.close();
      } catch (e) {}
    }

    if (isSupabaseConfigured()) {
      broadcastMotoboyLocation(cleanData);
      updateMotoboyLocationInDb(cleanData).catch(console.warn);

      // Se houver pedido ativo, sincroniza as coordenadas na coluna delivery_gps do pedido
      if (cleanData.orderId) {
        updateOrderDeliveryGpsInDb(cleanData.orderId, {
          latitude: cleanData.latitude,
          longitude: cleanData.longitude,
          speed: cleanData.speed,
          heading: cleanData.heading,
          accuracy: cleanData.accuracy,
          driverName: cleanData.driverName,
          updatedAt: cleanData.updatedAt
        }).catch(console.warn);
      }
    }
  };

  // Configurações e status da Impressora (Trava de checagem removida: sempre pronta)
  const [printerSettings, setPrinterSettings] = useState(() => getPrinterSettings());
  const [printerStatus, setPrinterStatus] = useState({ online: true, checking: false, message: 'Impressora Pronta' });
  const [printerToast, setPrinterToast] = useState(null);

  const showPrinterToast = (message, type = 'success', duration = 4000) => {
    setPrinterToast({ message, type });
    setTimeout(() => {
      setPrinterToast(null);
    }, duration);
  };

  const checkPrinterConnection = useCallback(async () => {
    setPrinterStatus({ online: true, checking: false, message: 'Impressora Pronta' });
    return { online: true, message: 'Impressora Pronta' };
  }, []);

  useEffect(() => {
    checkPrinterConnection();
  }, [checkPrinterConnection]);

  const updatePrinterConfig = (newCfg) => {
    const saved = savePrinterSettings(newCfg);
    setPrinterSettings(saved);
    checkPrinterConnection();
    showPrinterToast('Configurações da Elgin i8 salvas!', 'info', 2500);
  };

  // Configurações e Personalização da Loja / Cardápio
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Se a latitude ainda for o padrão antigo de São Paulo, migra para Almenara - MG
        if (!parsed.latitude || Math.abs(Number(parsed.latitude) - (-23.550520)) < 0.001) {
          parsed.latitude = -16.1834;
          parsed.longitude = -40.6936;
          if (!parsed.address || parsed.address.includes('Rua Principal do Delivery') || parsed.address.includes('Sao Paulo')) {
            parsed.address = 'Centro, Almenara - MG';
          }
          if (parsed.pixCity === 'Sao Paulo' || !parsed.pixCity) {
            parsed.pixCity = 'Almenara';
          }
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_STORE_SETTINGS, ...parsed }));
          } catch (e) {}
        }
        return { ...DEFAULT_STORE_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STORE_SETTINGS;
  });

  // Aplica cores do tema (CSS variables) dinamicamente no documento
  useEffect(() => {
    applyThemeToDocument(storeSettings?.primaryColor, storeSettings?.secondaryColor);
  }, [storeSettings?.primaryColor, storeSettings?.secondaryColor]);

  // Carrega configurações da loja do Supabase na inicialização
  useEffect(() => {
    fetchStoreSettingsFromDb().then(res => {
      if (res.data && typeof res.data === 'object') {
        setStoreSettings(prev => {
          const merged = { ...prev, ...res.data };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    }).catch(console.error);
  }, []);

  const updateStoreSettings = (newSettings) => {
    if (!isActionAuthorized(staffUser, 'UPDATE_SETTINGS')) {
      logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
        action: 'UPDATE_SETTINGS',
        userRole: staffUser?.role
      });
      if (showPrinterToast) {
        showPrinterToast('⛔ Apenas o Administrador Root pode alterar as configurações da loja.', 'error', 5000);
      }
      return;
    }

    setStoreSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

      if (window.BroadcastChannel) {
        try {
          const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          channel.postMessage({ type: 'SYNC_SETTINGS', data: updated });
          channel.close();
        } catch (e) {}
      }

      applyThemeToDocument(updated.primaryColor, updated.secondaryColor);
      saveStoreSettingsToDb(updated).catch(console.error);

      return updated;
    });
    playAlertSound('confirm');
  };

  // Sessão do Cliente (Login com 6 dígitos e Fidelidade)
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('sdg_customer_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const saveCustomerSession = (customerData) => {
    setCustomer(customerData);
    if (customerData) {
      localStorage.setItem('sdg_customer_session', JSON.stringify(customerData));
    } else {
      localStorage.removeItem('sdg_customer_session');
    }
  };

  const loginCustomer = async (phone, pin) => {
    const res = await loginCustomerByPin(phone, pin);
    if (res.customer) {
      saveCustomerSession(res.customer);
      return { success: true, customer: res.customer };
    }
    return { success: false, error: res.error?.message || 'Falha ao autenticar' };
  };

  const registerCustomer = async ({ name, phone, pin, address, avatar_url, avatarUrl }) => {
    const avatar = avatar_url || avatarUrl || '';
    const res = await saveCustomerProfile({ name, phone, address, pin, avatar_url: avatar });
    const newCustomer = {
      id: res.data?.id || `cust-${Date.now()}`,
      name,
      phone,
      address,
      pin,
      avatar_url: avatar,
      total_orders: 1
    };
    saveCustomerSession(newCustomer);
    return { success: true, customer: newCustomer };
  };

  const logoutCustomer = () => {
    saveCustomerSession(null);
  };

  const updateCustomerAddress = async (newAddress) => {
    if (!customer) return;
    const updated = { ...customer, address: newAddress };
    saveCustomerSession(updated);
    saveCustomerProfile({
      name: updated.name,
      phone: updated.phone,
      address: newAddress,
      pin: updated.pin,
      avatar_url: updated.avatar_url || ''
    }).catch(console.error);
  };

  const updateCustomerAvatar = async (newAvatarUrl) => {
    if (!customer) return;
    const updated = { ...customer, avatar_url: newAvatarUrl };
    saveCustomerSession(updated);
    saveCustomerProfile({
      name: updated.name,
      phone: updated.phone,
      address: updated.address || '',
      pin: updated.pin,
      avatar_url: newAvatarUrl
    }).catch(console.error);
    return updated;
  };

  // Pedir Novamente: Reinsere os itens do pedido anterior no carrinho
  const reorder = (order) => {
    if (!order || !order.items || order.items.length === 0) return false;
    setCart(prev => {
      const clonedItems = order.items.map(item => ({
        ...item,
        subtotal: (item.unitPriceWithExtras || item.price) * item.quantity
      }));
      return [...prev, ...clonedItems];
    });
    playAlertSound('confirm');
    return true;
  };

  // Database Connection State ('local' | 'connecting' | 'connected' | 'error')
  const [dbStatus, setDbStatus] = useState(() => isSupabaseConfigured() ? 'connecting' : 'local');
  const [dbVersion, setDbVersion] = useState(0);

  // Sessão da Equipe (Root / Balcão e Motoboy) vinculada ao Supabase Auth
  const [staffUser, setStaffUser] = useState(() => getStaffSession());

  const isRoot = Boolean(staffUser && (staffUser.role === 'admin' || staffUser.role === 'balcao'));
  const isMotoboy = Boolean(staffUser && staffUser.role === 'motoboy');
  const isStaff = Boolean(staffUser);

  // Sincronização em tempo real da sessão do Supabase Auth
  useEffect(() => {
    let isMounted = true;

    // 1. Validação inicial ao carregar a aplicação
    getActiveStaffUser().then((activeUser) => {
      if (isMounted) {
        setStaffUser(activeUser);
      }
    });

    // 2. Ouvinte reativo para eventos de auth (login, logout, refresh de token)
    const { data: authListener } = onStaffAuthStateChange((activeUser) => {
      if (isMounted) {
        setStaffUser(activeUser);
      }
    });

    return () => {
      isMounted = false;
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const loginStaffUser = async (credentials) => {
    const res = await loginStaff(credentials);
    if (res.success && res.user) {
      setStaffUser(res.user);
      playAlertSound('confirm');
    }
    return res;
  };

  const registerStaffUser = async (userData) => {
    const res = await registerStaff(userData);
    if (res.success && res.user) {
      setStaffUser(res.user);
      playAlertSound('confirm');
    }
    return res;
  };

  const logoutStaffUser = async () => {
    await logoutStaff();
    setStaffUser(null);
    setCurrentView('client');
  };

  const syncUrlWithPath = (view) => {
    if (typeof window !== 'undefined') {
      let newPath = '/';
      if (view === 'motoboy') newPath = '/motoboy';
      else if (view === 'counter') newPath = '/balcao';
      else if (view === 'kitchen') newPath = '/cozinha';
      else if (view === 'admin') newPath = '/admin';
      
      if (window.location.pathname !== newPath) {
        window.history.pushState({ view }, '', newPath);
      }
    }
  };

  // Sync state with URL com proteção estrita de RBAC e View Guards
  const setCurrentView = (view) => {
    const auth = checkViewAuthorization(staffUser, view);
    if (!auth.authorized) {
      console.warn(`🚨 [RBAC] Acesso negado à view '${view}':`, auth.reason);
      if (showPrinterToast) {
        showPrinterToast(`🔒 ${auth.reason}`, 'error', 5000);
      }
      setCurrentViewState(auth.redirectView);
      syncUrlWithPath(auth.redirectView);
      return;
    }

    setCurrentViewState(view);
    syncUrlWithPath(view);
  };

  // Listen to browser navigation (Back / Forward) com verificação de autorização
  useEffect(() => {
    const handlePopState = () => {
      const urlView = getViewFromUrl();
      const auth = checkViewAuthorization(staffUser, urlView);
      if (!auth.authorized) {
        setCurrentViewState(auth.redirectView);
        syncUrlWithPath(auth.redirectView);
      } else {
        setCurrentViewState(urlView);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [staffUser]);

  // Save to localStorage & Broadcast to other tabs on same machine
  const saveAndSyncOrders = (newOrders) => {
    setOrders(newOrders);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newOrders));
    
    if (window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ type: 'SYNC_ORDERS', data: newOrders });
        channel.close();
      } catch (e) {
        console.error('BroadcastChannel error', e);
      }
    }
  };

  // Listen to cross-tab updates via BroadcastChannel or storage event
  useEffect(() => {
    let channel;
    let tablesChannel;
    if (window.BroadcastChannel) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_ORDERS') {
          setOrders(event.data.data);
          playAlertSound('new_order');
        } else if (event.data && event.data.type === 'SYNC_SETTINGS') {
          setStoreSettings(event.data.data);
        } else if (event.data && event.data.type === 'SYNC_MOTOBOY_LOCATION') {
          const loc = event.data.data;
          if (loc && loc.id) {
            setMotoboyLocations(prev => ({ ...prev, [loc.id]: loc }));
          }
        } else if (event.data && event.data.type === 'SYNC_TABLES') {
          setTables(event.data.data);
        }
      };

      tablesChannel = new BroadcastChannel(TABLES_BROADCAST_CHANNEL);
      tablesChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_TABLES') {
          setTables(event.data.data);
        }
      };
    }

    const handleStorage = (e) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          setOrders(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      } else if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          setStoreSettings(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      } else if (e.key === MOTOBOY_LOCATIONS_STORAGE_KEY && e.newValue) {
        try {
          setMotoboyLocations(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      } else if (e.key === TABLES_STORAGE_KEY && e.newValue) {
        try {
          setTables(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      if (tablesChannel) tablesChannel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Fetch orders from Supabase on start or when dbVersion triggers reconnect
  const loadOrdersFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setDbStatus('local');
      return;
    }

    setDbStatus('connecting');
    const { data, error } = await fetchOrdersFromDb();

    if (!error && data) {
      setOrders(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      setDbStatus('connected');
    } else {
      console.warn('Aviso: Não foi possível sincronizar com o Supabase. Utilizando armazenamento local.', error);
      setDbStatus('error');
    }
  }, []);

  // Fetch products from Supabase
  const loadProductsFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await fetchProductsFromDb();
      if (!error && data && data.length > 0) {
        setProducts(data);
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Erro ao sincronizar produtos do Supabase:', err);
    }
  }, []);

  // Fetch tables from Supabase
  const loadTablesFromSupabase = useCallback(async () => {
    try {
      const res = await fetchTablesFromDb();
      if (res && res.tables) {
        setTables(res.tables);
      }
    } catch (err) {
      console.warn('Erro ao carregar mesas do Supabase:', err);
    }
  }, []);

  useEffect(() => {
    loadOrdersFromSupabase();
    loadProductsFromSupabase();
    loadTablesFromSupabase();
  }, [loadOrdersFromSupabase, loadProductsFromSupabase, loadTablesFromSupabase, dbVersion]);

  // Reconexão e sincronização automática quando a rede/Wi-Fi voltar a ficar online
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexão à internet restabelecida! Ressincronizando banco de dados...');
      loadOrdersFromSupabase();
      loadProductsFromSupabase();
      loadTablesFromSupabase();
      fetchStoreSettingsFromDb().then(res => {
        if (res.data) setStoreSettings(prev => ({ ...prev, ...res.data }));
      }).catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadOrdersFromSupabase, loadProductsFromSupabase, loadTablesFromSupabase]);

  // Polling contínuo de sincronização em segundo plano (a cada 5 segundos)
  // Garante que o Balcão e a Cozinha recebam novos pedidos mesmo se o Realtime WebSocket falhar ou a aba dormir
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await fetchOrdersFromDb();
        if (!error && data && data.length > 0) {
          setOrders(prev => {
            const prevIds = new Set(prev.map(o => o.id));
            const hasNew = data.some(o => !prevIds.has(o.id));
            const hasStatusChange = data.some(o => {
              const existing = prev.find(p => p.id === o.id);
              return existing && existing.status !== o.status;
            });

            if (hasNew || hasStatusChange || data.length !== prev.length) {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
              if (hasNew) {
                playAlertSound('new_order');
              }
              return data;
            }
            return prev;
          });
        }
      } catch (err) {
        // Silencioso no polling contínuo
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Subscribe to Supabase Realtime changes (Pedidos, Cardápio e Configurações da Loja)
  // Só abre os canais Realtime se o banco estiver efetivamente conectado!
  // Evita bombardear o Supabase com tentativas de WebSocket caso o projeto esteja pausado ou offline.
  useEffect(() => {
    if (!isSupabaseConfigured() || dbStatus !== 'connected') return;

    // 1. Canal Realtime para Pedidos (orders)
    const unsubscribeOrders = subscribeToOrdersRealtime({
      onInsert: (newOrder) => {
        setOrders(prev => {
          if (prev.some(o => o.id === newOrder.id)) return prev;
          const updated = [newOrder, ...prev];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        playAlertSound('new_order');
      },
      onUpdate: (updatedOrder) => {
        // Se o pedido trouxer coordenadas de entrega do motoboy, atualiza o mapa ao vivo
        if (updatedOrder.deliveryGps && updatedOrder.deliveryGps.latitude) {
          const gps = updatedOrder.deliveryGps;
          const motoId = gps.driverName || 'Entregador';
          setMotoboyLocations(prev => ({
            ...prev,
            [motoId]: {
              id: motoId,
              driverName: gps.driverName || 'Entregador',
              orderId: updatedOrder.id,
              latitude: Number(gps.latitude),
              longitude: Number(gps.longitude),
              speed: Number(gps.speed || 0),
              heading: Number(gps.heading || 0),
              accuracy: Number(gps.accuracy || 0),
              isOnline: true,
              updatedAt: gps.updatedAt || new Date().toISOString()
            }
          }));
        }

        setOrders(prev => {
          const existing = prev.find(o => o.id === updatedOrder.id);
          if (existing && existing.status !== updatedOrder.status) {
            if (updatedOrder.status === 'pagamento_confirmado') {
              playAlertSound('new_order');
            } else if (updatedOrder.status === 'pronto') {
              playAlertSound('confirm');
            }
          }
          const updated = prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      },
      onDelete: (deletedId) => {
        setOrders(prev => {
          const updated = prev.filter(o => o.id !== deletedId);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    });

    // 2. Canal Realtime para Configurações da Loja (store_settings)
    const unsubscribeSettings = subscribeToStoreSettingsRealtime({
      onUpdate: (newSettings) => {
        setStoreSettings(prev => {
          const merged = { ...prev, ...newSettings };
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          applyThemeToDocument(merged.primaryColor, merged.secondaryColor);
          return merged;
        });
      }
    });

    // 3. Canal Realtime para Cardápio de Produtos (products)
    const unsubscribeProducts = subscribeToProductsRealtime({
      onInsert: (newProduct) => {
        setProducts(prev => {
          if (prev.some(p => p.id === newProduct.id)) return prev;
          const updated = [newProduct, ...prev];
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      },
      onUpdate: (updatedProduct) => {
        setProducts(prev => {
          const updated = prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p);
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      },
      onDelete: (deletedId) => {
        setProducts(prev => {
          const updated = prev.filter(p => p.id !== deletedId);
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    });

    // 4. Canal Realtime para Rastreamento GPS de Motoboys (PostgreSQL + Broadcast WebSocket sem tabela)
    const unsubscribeMotoboyDb = subscribeToMotoboyLocationsRealtime((loc) => {
      if (loc && loc.id) {
        setMotoboyLocations(prev => ({ ...prev, [loc.id]: loc }));
      }
    });

    const unsubscribeMotoboyBroadcast = subscribeToMotoboyBroadcast((loc) => {
      if (loc && loc.id) {
        setMotoboyLocations(prev => ({ ...prev, [loc.id]: loc }));
      }
    });

    // 5. Canal Realtime para Mesas do Salão (restaurant_tables)
    const tablesRealtimeChannel = subscribeToTablesRealtime((updatedTable) => {
      setTables(prev => {
        const idx = prev.findIndex(t => t.id === updatedTable.id || t.tableNumber === updatedTable.tableNumber);
        let next;
        if (idx >= 0) {
          next = [...prev];
          next[idx] = { ...next[idx], ...updatedTable };
        } else {
          next = [...prev, updatedTable].sort((a, b) => a.tableNumber - b.tableNumber);
        }
        saveLocalTables(next);
        return next;
      });
    });

    fetchMotoboyLocationsFromDb().then(res => {
      if (res.data && res.data.length > 0) {
        const map = {};
        res.data.forEach(d => { map[d.id] = d; });
        setMotoboyLocations(prev => ({ ...prev, ...map }));
      }
    }).catch(console.warn);

    return () => {
      if (typeof unsubscribeOrders === 'function') unsubscribeOrders();
      if (typeof unsubscribeSettings === 'function') unsubscribeSettings();
      if (typeof unsubscribeProducts === 'function') unsubscribeProducts();
      if (typeof unsubscribeMotoboyDb === 'function') unsubscribeMotoboyDb();
      if (typeof unsubscribeMotoboyBroadcast === 'function') unsubscribeMotoboyBroadcast();
      if (tablesRealtimeChannel && typeof tablesRealtimeChannel.unsubscribe === 'function') {
        tablesRealtimeChannel.unsubscribe();
      }
    };
  }, [dbVersion, dbStatus]);

  // Cart operations
  const addToCart = (product, quantity = 1, selectedOptions = [], observation = '') => {
    const optionExtraTotal = selectedOptions.reduce((acc, opt) => acc + (opt.price || 0), 0);
    const unitPriceWithExtras = product.price + optionExtraTotal;

    const newItem = {
      id: product.id,
      name: product.name,
      quantity,
      price: product.price,
      selectedOptions: selectedOptions.map(o => {
        if (typeof o === 'string') return o;
        if (o.price && o.price > 0 && !o.name.includes('R$')) {
          return `${o.name} (+R$ ${o.price.toFixed(2).replace('.', ',')})`;
        }
        return o.name;
      }),
      unitPriceWithExtras,
      subtotal: unitPriceWithExtras * quantity,
      observation
    };

    setCart(prev => [...prev, newItem]);
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      item.quantity = newQty;
      item.subtotal = item.unitPriceWithExtras * newQty;
      return updated;
    });
  };

  const clearCart = () => setCart([]);

  // Create new order from client (saves to local state and Supabase DB)
  const createOrder = (customerDetails) => {
    // 1. Verificação Pre-Flight de Rate Limit Anti-Spam / Anti-Flooding (apenas para clientes públicos anônimos)
    if (!staffUser) {
      const deviceFp = getDeviceFingerprint();
      const rateCheck = checkRateLimit('ORDER_CREATE', deviceFp);
      if (!rateCheck.allowed) {
        logSecurityEvent(SECURITY_EVENT_TYPES.ORDER_SPAM_DETECTED, {
          deviceFingerprint: deviceFp,
          name: customerDetails?.name,
          phone: customerDetails?.phone
        });
        if (showPrinterToast) {
          showPrinterToast(`⚠️ ${rateCheck.error}`, 'error', 6000);
        }
        throw new Error(rateCheck.error || 'Muitas tentativas em sequência. Por favor, aguarde alguns instantes.');
      }
      recordRateLimitAttempt('ORDER_CREATE', deviceFp, false); // Registra consumo
    }

    // 2. Sanitização estrita contra XSS e injeções
    const sanitized = sanitizeOrderPayload(customerDetails);

    const itemsSubtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const isFree = storeSettings.freeDeliveryThreshold > 0 && itemsSubtotal >= storeSettings.freeDeliveryThreshold;
    const defaultFee = Number(storeSettings.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
    const deliveryFee = sanitized.deliveryType === 'delivery'
      ? (isFree ? 0 : (sanitized.deliveryFee !== undefined && sanitized.deliveryFee !== null ? Number(sanitized.deliveryFee) : defaultFee))
      : 0;
    const total = itemsSubtotal + deliveryFee;
    
    let orderNum = Math.floor(1000 + Math.random() * 9000);
    let orderId = `PED-${orderNum}`;
    while (orders.some(o => o.id === orderId)) {
      orderNum = Math.floor(1000 + Math.random() * 9000);
      orderId = `PED-${orderNum}`;
    }

    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: sanitized.name || 'Cliente',
      customerPhone: sanitized.phone || '',
      deliveryType: sanitized.deliveryType, // 'delivery' | 'takeout'
      deliveryFee,
      address: sanitized.address || 'Retirada no Balcão',
      paymentMethod: sanitized.paymentMethod,
      status: 'aguardando_pagamento',
      total,
      observation: sanitized.observation || '',
      items: [...cart],
      media: customerDetails.media || customerDetails.attachments || []
    };

    // 1. Immediate optimistic local state update
    const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
    saveAndSyncOrders(updatedOrders);
    clearCart();
    playAlertSound('confirm');

    // Se o cliente estiver logado, atualiza o contador de pedidos dele localmente
    if (customer) {
      const updatedCust = {
        ...customer,
        total_orders: (Number(customer.total_orders) || 0) + 1,
        address: customerDetails.deliveryType === 'delivery' ? (customerDetails.address || customer.address) : customer.address
      };
      saveCustomerSession(updatedCust);
    }

    // 2. Persist to Supabase Database if configured
    if (isSupabaseConfigured()) {
      insertOrderInDb(newOrder).then(res => {
        if (res.error) {
          console.error('❌ Erro retornado ao salvar pedido no Supabase:', res.error);
        } else {
          console.log('✅ Pedido sincronizado no Supabase:', newOrder.id);
        }
      }).catch(err => {
        console.warn('Aviso: Erro ao persistir pedido no Supabase, salvo localmente:', err);
      });
    }

    return newOrder;
  };

  // Lançamento de pedido diretamente pelo Balcão / Frente de Caixa (PDV)
  const createCounterOrder = (orderData) => {
    // 1. Autorização RBAC: Apenas Operadores de Balcão e Administradores
    if (!isActionAuthorized(staffUser, 'CREATE_COUNTER_ORDER')) {
      logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
        action: 'CREATE_COUNTER_ORDER',
        userRole: staffUser?.role,
        username: staffUser?.username
      });
      if (showPrinterToast) {
        showPrinterToast('⛔ Apenas operadores de Balcão e Administradores podem lançar pedidos no Caixa.', 'error', 5000);
      }
      return null;
    }

    let orderNum = Math.floor(1000 + Math.random() * 9000);
    let orderId = `PED-${orderNum}`;
    while (orders.some(o => o.id === orderId)) {
      orderNum = Math.floor(1000 + Math.random() * 9000);
      orderId = `PED-${orderNum}`;
    }

    const items = (orderData.items || []).map(item => {
      const unit = Number(item.unitPriceWithExtras || item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return {
        ...item,
        quantity: qty,
        unitPriceWithExtras: unit,
        subtotal: item.subtotal !== undefined ? Number(item.subtotal) : unit * qty
      };
    });

    const itemsSubtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
    const isDelivery = orderData.deliveryType === 'delivery';
    const isDineIn = orderData.deliveryType === 'dine_in';
    const isFree = storeSettings.freeDeliveryThreshold > 0 && itemsSubtotal >= storeSettings.freeDeliveryThreshold;
    const defaultFee = Number(storeSettings.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
    const deliveryFee = isDelivery
      ? (isFree ? 0 : (orderData.deliveryFee !== undefined && orderData.deliveryFee !== null && orderData.deliveryFee !== '' ? Number(orderData.deliveryFee) : defaultFee))
      : 0;
    const total = itemsSubtotal + deliveryFee;

    const targetStatus = orderData.status || (isDineIn ? 'pagamento_confirmado' : 'pagamento_confirmado');

    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: orderData.customerName?.trim() || (isDineIn ? `Mesa ${orderData.tableNumber || ''}` : 'Cliente Balcão'),
      customerPhone: orderData.customerPhone?.trim() || '',
      deliveryType: orderData.deliveryType || 'takeout',
      deliveryFee,
      address: isDelivery
        ? (orderData.address?.trim() || 'Endereço a confirmar')
        : (orderData.address?.trim() || (isDineIn ? `Mesa ${String(orderData.tableNumber || '').padStart(2, '0')} - Salão` : 'Retirada no Balcão')),
      tableId: orderData.tableId || (orderData.tableNumber ? `mesa-${orderData.tableNumber}` : null),
      tableNumber: orderData.tableNumber ? Number(orderData.tableNumber) : null,
      paymentMethod: orderData.paymentMethod || (isDineIn ? 'mesa' : 'cash'),
      status: targetStatus,
      total,
      observation: orderData.observation?.trim() || '',
      items,
      media: orderData.media || orderData.attachments || []
    };

    const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
    saveAndSyncOrders(updatedOrders);

    if (targetStatus === 'pagamento_confirmado') {
      playAlertSound('new_order');
    } else {
      playAlertSound('confirm');
    }

    if (isSupabaseConfigured()) {
      insertOrderInDb(newOrder).then(res => {
        if (res.error) {
          console.error('❌ Erro ao salvar pedido do balcão no Supabase:', res.error);
        } else {
          console.log('✅ Pedido do balcão sincronizado no Supabase:', newOrder.id);
        }
      }).catch(err => {
        console.warn('Aviso: Erro ao persistir pedido do balcão no Supabase:', err);
      });
    }

    return newOrder;
  };

  // Update order status (Com autorização estrita de papéis e auditoria)
  const updateOrderStatus = (orderId, newStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Validação estrita de transição de status (ex: Motoboy não pode confirmar pagamento ou cancelar)
    const validation = validateOrderStatusTransition(staffUser, targetOrder.status, newStatus, targetOrder);
    if (!validation.allowed) {
      console.warn(`🚨 [RBAC] Transição de status bloqueada para usuário '${staffUser?.username || 'anônimo'}':`, validation.reason);
      if (showPrinterToast) {
        showPrinterToast(`⛔ ${validation.reason}`, 'error', 5000);
      }
      return;
    }

    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    });

    saveAndSyncOrders(updatedOrders);

    // Audio cue
    if (newStatus === 'pagamento_confirmado') {
      playAlertSound('new_order'); // Notification for kitchen
    } else if (newStatus === 'pronto') {
      playAlertSound('confirm'); // High chime for ready order
    }

    // Persist status change to Supabase Database
    if (isSupabaseConfigured()) {
      updateOrderStatusInDb(orderId, newStatus).catch(err => {
        console.warn('Aviso: Erro ao atualizar status no Supabase:', err);
      });
    }
  };

  /**
   * Despacha ou altera o destino do pedido (Mandar para o Motoboy ou para o Balcão)
   * Usado pela Cozinha e pelo Balcão para decidir o destino antes, durante ou depois do preparo.
   */
  const dispatchOrder = (orderId, { deliveryType, status, address }) => {
    if (!isActionAuthorized(staffUser, 'CREATE_COUNTER_ORDER')) {
      logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
        action: 'DISPATCH_ORDER',
        userRole: staffUser?.role
      });
      if (showPrinterToast) {
        showPrinterToast('⛔ Apenas Balcão e Administradores podem despachar pedidos.', 'error', 5000);
      }
      return null;
    }

    let targetOrder = null;
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const nextDeliveryType = deliveryType || order.deliveryType;
        const nextStatus = status || order.status;
        const nextAddress = address !== undefined ? address : order.address;

        targetOrder = {
          ...order,
          deliveryType: nextDeliveryType,
          status: nextStatus,
          address: nextAddress,
          updatedAt: new Date().toISOString()
        };
        return targetOrder;
      }
      return order;
    });

    if (targetOrder) {
      saveAndSyncOrders(updatedOrders);
      playAlertSound('confirm');

      if (isSupabaseConfigured()) {
        updateOrderInDb(targetOrder.id, targetOrder).catch(err => {
          console.warn('Aviso: Erro ao persistir despacho no Supabase:', err);
        });
      }
    }
    return targetOrder;
  };

  // Editar Pedido completo (Balcão ou Admin: itens, cliente, pagamento, observações, etc.)
  const editOrder = (updatedOrder) => {
    if (!isActionAuthorized(staffUser, 'EDIT_ORDER')) {
      logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
        action: 'EDIT_ORDER',
        userRole: staffUser?.role
      });
      if (showPrinterToast) {
        showPrinterToast('⛔ Apenas Balcão e Administradores podem editar pedidos.', 'error', 5000);
      }
      return null;
    }
    // Recalcular totais com base nos itens
    const itemsTotal = (updatedOrder.items || []).reduce((acc, item) => {
      const unitPrice = Number(item.unitPriceWithExtras || item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const itemSubtotal = item.subtotal !== undefined ? Number(item.subtotal) : unitPrice * qty;
      return acc + itemSubtotal;
    }, 0);

    const defaultFee = Number(storeSettings.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
    const deliveryFee = updatedOrder.deliveryType === 'delivery'
      ? (updatedOrder.deliveryFee !== undefined && updatedOrder.deliveryFee !== null && updatedOrder.deliveryFee !== ''
          ? Number(updatedOrder.deliveryFee)
          : defaultFee)
      : 0;
    const recalculatedTotal = itemsTotal + deliveryFee;

    const orderToSave = {
      ...updatedOrder,
      deliveryFee,
      total: recalculatedTotal,
      media: updatedOrder.media || updatedOrder.attachments || [],
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => o.id === orderToSave.id ? orderToSave : o);
    saveAndSyncOrders(updatedOrders);
    playAlertSound('confirm');

    if (isSupabaseConfigured()) {
      updateOrderInDb(orderToSave.id, orderToSave).catch(err => {
        console.warn('Aviso: Erro ao persistir edição do pedido no Supabase:', err);
      });
    }

    return orderToSave;
  };

  /**
   * Adiciona uma mídia (Foto, Vídeo ou Áudio) a um pedido existente (Cliente, Balcão ou Motoboy)
   */
  const addOrderMedia = (orderId, mediaItem) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return null;

    const existingMedia = Array.isArray(targetOrder.media) ? targetOrder.media : [];
    const newMedia = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...mediaItem
    };

    const updatedOrder = {
      ...targetOrder,
      media: [...existingMedia, newMedia],
      updatedAt: new Date().toISOString()
    };

    return editOrder(updatedOrder);
  };

  /**
   * Remove uma mídia do pedido
   */
  const removeOrderMedia = (orderId, mediaId) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return null;

    const existingMedia = Array.isArray(targetOrder.media) ? targetOrder.media : [];
    const updatedMedia = existingMedia.filter(m => m.id !== mediaId);

    const updatedOrder = {
      ...targetOrder,
      media: updatedMedia,
      updatedAt: new Date().toISOString()
    };

    return editOrder(updatedOrder);
  };

  /**
   * Cancela um pedido com justificativa opcional
   */
  const cancelOrder = (orderId, reason = '') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return null;

    const cancelNote = reason && reason.trim() ? `[CANCELADO]: ${reason.trim()}` : '[CANCELADO]';
    const cleanObs = targetOrder.observation ? `${targetOrder.observation} • ${cancelNote}` : cancelNote;

    const updatedOrder = {
      ...targetOrder,
      status: 'cancelado',
      observation: cleanObs,
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => o.id === orderId ? updatedOrder : o);
    saveAndSyncOrders(updatedOrders);

    if (showPrinterToast) {
      showPrinterToast(`❌ Pedido #${orderId} cancelado.`, 'warning');
    }

    if (isSupabaseConfigured()) {
      updateOrderInDb(orderId, updatedOrder).catch(err => {
        console.warn('Erro ao atualizar cancelamento no Supabase:', err);
      });
    }

    return updatedOrder;
  };

  /**
   * Exclui permanentemente um pedido do balcão e do banco de dados
   */
  const deleteOrder = async (orderId) => {
    const updatedOrders = orders.filter(o => o.id !== orderId);
    saveAndSyncOrders(updatedOrders);

    if (showPrinterToast) {
      showPrinterToast(`🗑️ Pedido #${orderId} excluído do sistema.`, 'info');
    }

    if (isSupabaseConfigured()) {
      try {
        await deleteOrderInDb(orderId);
      } catch (err) {
        console.warn('Erro ao excluir pedido no Supabase:', err);
      }
    }
  };

  /**
   * Limpa ou arquiva lista de pedidos do balcão para iniciar o dia zerado
   * @param {'finished' | 'today' | 'all'} scope
   */
  const clearOrders = async ({ scope = 'finished' } = {}) => {
    let toRemove = [];
    const todayStr = new Date().toDateString();

    if (scope === 'finished') {
      // Remove apenas concluídos (entregue) e cancelados
      toRemove = orders.filter(o => o.status === 'entregue' || o.status === 'cancelado');
    } else if (scope === 'today') {
      // Remove todos os pedidos de hoje (para zerar o dia)
      toRemove = orders.filter(o => {
        const d = new Date(o.createdAt || o.created_at);
        return d.toDateString() === todayStr;
      });
    } else if (scope === 'all') {
      toRemove = [...orders];
    }

    if (toRemove.length === 0) {
      if (showPrinterToast) {
        showPrinterToast('Nenhum pedido encontrado para o critério selecionado.', 'info');
      }
      return 0;
    }

    const removeIds = toRemove.map(o => o.id);
    const updatedOrders = orders.filter(o => !removeIds.includes(o.id));
    saveAndSyncOrders(updatedOrders);

    if (isSupabaseConfigured()) {
      deleteOrdersBatchInDb(removeIds).catch(err => {
        console.warn('Erro ao excluir pedidos no Supabase:', err);
      });
    }

    if (showPrinterToast) {
      showPrinterToast(`🧹 ${removeIds.length} pedido(s) limpos do balcão!`, 'success');
    }

    return removeIds.length;
  };

  // ==============================================================================
  // 🍽️ CONTROLE DE MESAS E COMANDAS DO SALÃO (BALCÃO / PDV)
  // ==============================================================================

  /**
   * Abre uma mesa ocupada vinculando um novo pedido ou comanda
   */
  const openTable = async (tableIdOrNum, options = {}) => {
    const currentTables = tables && tables.length > 0 ? tables : getLocalTables();
    const targetTable = currentTables.find(t => t.id === tableIdOrNum || t.tableNumber === Number(tableIdOrNum));
    if (!targetTable) throw new Error('Mesa não encontrada');

    const orderData = options.orderData || options || {};
    const peopleCount = Number(options.peopleCount || orderData.peopleCount || targetTable.peopleCount) || 1;
    const notes = options.notes || orderData.notes || orderData.observation || '';
    const customerName = options.customerName || orderData.customerName || `Mesa ${String(targetTable.tableNumber).padStart(2, '0')}`;
    const sendToKitchen = options.sendToKitchen !== undefined ? options.sendToKitchen : true;

    // Cria o pedido da mesa
    const orderPayload = {
      customerName,
      customerPhone: orderData.customerPhone || '',
      deliveryType: 'dine_in',
      tableId: targetTable.id,
      tableNumber: targetTable.tableNumber,
      address: `Mesa ${String(targetTable.tableNumber).padStart(2, '0')} - Salão`,
      paymentMethod: 'mesa',
      status: sendToKitchen ? 'pagamento_confirmado' : 'aguardando_pagamento',
      items: orderData.items || [],
      observation: notes
    };

    const newOrder = createCounterOrder(orderPayload);

    // Atualiza os dados da mesa
    const updatedTable = {
      ...targetTable,
      status: 'ocupada',
      currentOrderId: newOrder.id,
      customerName,
      peopleCount,
      openedAt: new Date().toISOString(),
      notes
    };

    const nextTables = currentTables.map(t => t.id === updatedTable.id ? updatedTable : t);
    setTables(nextTables);
    saveLocalTables(nextTables);
    await saveTableInDb(updatedTable);

    if (sendToKitchen) {
      playAlertSound('new_order');
    }

    return { table: updatedTable, order: newOrder };
  };

  /**
   * Adiciona nova rodada de itens à comanda da mesa
   */
  const addItemsToTable = async (tableIdOrNum, newItems = [], options = {}) => {
    const currentTables = tables && tables.length > 0 ? tables : getLocalTables();
    const targetTable = currentTables.find(t => t.id === tableIdOrNum || t.tableNumber === Number(tableIdOrNum));
    if (!targetTable) throw new Error('Mesa não encontrada');

    const sendToKitchen = options.sendToKitchen !== undefined ? options.sendToKitchen : true;
    const notes = options.notes || '';

    // Procura o pedido ativo associado à mesa
    let activeOrder = null;
    if (targetTable.currentOrderId) {
      activeOrder = orders.find(o => o.id === targetTable.currentOrderId);
    }
    if (!activeOrder) {
      activeOrder = orders.find(o =>
        (o.tableNumber === targetTable.tableNumber || o.address?.includes(`Mesa ${String(targetTable.tableNumber).padStart(2, '0')}`)) &&
        o.status !== 'cancelado'
      );
    }

    const formattedNewItems = (newItems || []).map(item => {
      const unit = Number(item.unitPriceWithExtras || item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return {
        ...item,
        quantity: qty,
        unitPriceWithExtras: unit,
        subtotal: item.subtotal !== undefined ? Number(item.subtotal) : unit * qty
      };
    });

    if (!activeOrder) {
      return openTable(targetTable.id, {
        orderData: { items: formattedNewItems, observation: notes },
        sendToKitchen
      });
    }

    // Combina os itens anteriores com a nova rodada
    const combinedItems = [...activeOrder.items, ...formattedNewItems];
    const newTotal = combinedItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const updatedObs = notes
      ? (activeOrder.observation ? `${activeOrder.observation} | [Nova Rodada: ${notes}]` : `[Nova Rodada: ${notes}]`)
      : activeOrder.observation;

    const updatedOrder = {
      ...activeOrder,
      items: combinedItems,
      total: newTotal,
      observation: updatedObs,
      status: sendToKitchen ? 'pagamento_confirmado' : activeOrder.status,
      updatedAt: new Date().toISOString()
    };

    const nextOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    saveAndSyncOrders(nextOrders);

    if (isSupabaseConfigured()) {
      updateOrderInDb(updatedOrder.id, updatedOrder).catch(console.warn);
    }

    // Se a mesa estava com status 'fechando', reverte para 'ocupada'
    const updatedTable = {
      ...targetTable,
      status: 'ocupada'
    };
    const nextTables = currentTables.map(t => t.id === updatedTable.id ? updatedTable : t);
    setTables(nextTables);
    saveLocalTables(nextTables);
    saveTableInDb(updatedTable).catch(console.warn);

    if (sendToKitchen) {
      playAlertSound('new_order');
    }

    return { table: targetTable, order: updatedOrder };
  };

  /**
   * Fecha a mesa e finaliza a comanda com os dados de pagamento (e taxa de serviço opcional)
   */
  const closeTable = async (tableIdOrNum, checkoutData = {}) => {
    const currentTables = tables && tables.length > 0 ? tables : getLocalTables();
    const targetTable = currentTables.find(t => t.id === tableIdOrNum || t.tableNumber === Number(tableIdOrNum));
    if (!targetTable) throw new Error('Mesa não encontrada');

    const orderId = checkoutData.orderId || targetTable.currentOrderId;
    let activeOrder = null;
    if (orderId) {
      activeOrder = orders.find(o => o.id === orderId);
    }
    if (!activeOrder) {
      activeOrder = orders.find(o =>
        (o.tableNumber === targetTable.tableNumber || o.address?.includes(`Mesa ${String(targetTable.tableNumber).padStart(2, '0')}`)) &&
        o.status !== 'cancelado'
      );
    }

    if (activeOrder) {
      const grandTotal = Number(checkoutData.grandTotal) || activeOrder.total;
      const serviceFee = Number(checkoutData.serviceFeeValue) || 0;
      const finalOrder = {
        ...activeOrder,
        status: 'entregue',
        total: grandTotal,
        serviceFee,
        paymentMethod: checkoutData.paymentMethod || activeOrder.paymentMethod || 'cash',
        paymentDetails: {
          method: checkoutData.paymentMethod,
          cashReceived: checkoutData.cashReceived || null,
          changeAmount: checkoutData.changeAmount || null,
          includeServiceFee: !!checkoutData.includeServiceFee,
          serviceFeeValue: serviceFee,
          closedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };

      const nextOrders = orders.map(o => o.id === finalOrder.id ? finalOrder : o);
      saveAndSyncOrders(nextOrders);

      if (isSupabaseConfigured()) {
        updateOrderInDb(finalOrder.id, finalOrder).catch(console.warn);
      }
    }

    // Libera a mesa
    const freedTable = {
      ...targetTable,
      status: 'livre',
      currentOrderId: null,
      customerName: '',
      peopleCount: 1,
      openedAt: null,
      notes: ''
    };

    const nextTables = currentTables.map(t => t.id === freedTable.id ? freedTable : t);
    setTables(nextTables);
    saveLocalTables(nextTables);
    await saveTableInDb(freedTable);

    playAlertSound('confirm');
    return freedTable;
  };

  /**
   * Transfere comanda de uma mesa para outra mesa livre
   */
  const transferTable = async (fromTableIdOrNum, toTableIdOrNum) => {
    const currentTables = tables && tables.length > 0 ? tables : getLocalTables();
    const fromTable = currentTables.find(t => t.id === fromTableIdOrNum || t.tableNumber === Number(fromTableIdOrNum));
    const toTable = currentTables.find(t => t.id === toTableIdOrNum || t.tableNumber === Number(toTableIdOrNum));

    if (!fromTable) throw new Error('Mesa de origem não encontrada');
    if (!toTable) throw new Error('Mesa de destino não encontrada');
    if (toTable.status !== 'livre') throw new Error('Mesa de destino está ocupada');

    let activeOrder = null;
    if (fromTable.currentOrderId) {
      activeOrder = orders.find(o => o.id === fromTable.currentOrderId);
    }
    if (!activeOrder) {
      activeOrder = orders.find(o =>
        (o.tableNumber === fromTable.tableNumber || o.address?.includes(`Mesa ${String(fromTable.tableNumber).padStart(2, '0')}`)) &&
        o.status !== 'cancelado'
      );
    }

    if (activeOrder) {
      const updatedOrder = {
        ...activeOrder,
        tableId: toTable.id,
        tableNumber: toTable.tableNumber,
        address: `Mesa ${String(toTable.tableNumber).padStart(2, '0')} - Salão`,
        observation: activeOrder.observation
          ? `${activeOrder.observation} | [Transferido da Mesa ${fromTable.tableNumber} para Mesa ${toTable.tableNumber}]`
          : `[Transferido da Mesa ${fromTable.tableNumber} para Mesa ${toTable.tableNumber}]`,
        updatedAt: new Date().toISOString()
      };

      const nextOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      saveAndSyncOrders(nextOrders);

      if (isSupabaseConfigured()) {
        updateOrderInDb(updatedOrder.id, updatedOrder).catch(console.warn);
      }
    }

    const updatedToTable = {
      ...toTable,
      status: fromTable.status,
      currentOrderId: activeOrder ? activeOrder.id : fromTable.currentOrderId,
      customerName: fromTable.customerName,
      peopleCount: fromTable.peopleCount,
      openedAt: fromTable.openedAt,
      notes: fromTable.notes
    };

    const freedFromTable = {
      ...fromTable,
      status: 'livre',
      currentOrderId: null,
      customerName: '',
      peopleCount: 1,
      openedAt: null,
      notes: ''
    };

    const nextTables = currentTables.map(t => {
      if (t.id === updatedToTable.id) return updatedToTable;
      if (t.id === freedFromTable.id) return freedFromTable;
      return t;
    });

    setTables(nextTables);
    saveLocalTables(nextTables);
    await Promise.all([
      saveTableInDb(updatedToTable),
      saveTableInDb(freedFromTable)
    ]);

    playAlertSound('confirm');
    return { fromTable: freedFromTable, toTable: updatedToTable };
  };

  /**
   * Altera status da mesa (livre | ocupada | fechando)
   */
  const updateTableStatus = async (tableIdOrNum, newStatus) => {
    const currentTables = tables && tables.length > 0 ? tables : getLocalTables();
    const target = currentTables.find(t => t.id === tableIdOrNum || t.tableNumber === Number(tableIdOrNum));
    if (!target) return;

    const updated = { ...target, status: newStatus };
    const nextTables = currentTables.map(t => t.id === updated.id ? updated : t);
    setTables(nextTables);
    saveLocalTables(nextTables);
    await saveTableInDb(updated);
  };

  /**
   * Cria nova mesa no salão
   */
  const addTable = async (tableNumber, name = '') => {
    const updated = await addTableInDb(tableNumber, name);
    setTables(updated);
    return updated;
  };

  /**
   * Remove mesa do salão (quando estiver livre)
   */
  const deleteTable = async (tableId) => {
    const updated = await deleteTableInDb(tableId);
    setTables(updated);
    return updated;
  };

  // Gerenciamento de Produtos do Cardápio (Admin)
  const saveProduct = async (productData) => {
    const newProduct = {
      ...productData,
      id: productData.id || `p_${Date.now()}`
    };

    setProducts(prev => {
      const exists = prev.some(p => p.id === newProduct.id);
      const updated = exists
        ? prev.map(p => p.id === newProduct.id ? newProduct : p)
        : [newProduct, ...prev];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured()) {
      saveProductInDb(newProduct).catch(console.error);
    }
    playAlertSound('confirm');
    return newProduct;
  };

  const deleteProduct = async (productId) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== productId);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured()) {
      deleteProductInDb(productId).catch(console.error);
    }
    return true;
  };

  const toggleProductActive = async (productId) => {
    let nextActive = true;
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === productId) {
          nextActive = p.isActive === false ? true : false;
          return { ...p, isActive: nextActive };
        }
        return p;
      });
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured()) {
      toggleProductActiveInDb(productId, nextActive).catch(console.error);
    }
  };

  // Reconnect / force refresh helper
  const reconnectDb = () => {
    setDbVersion(v => v + 1);
  };

  const recentPrintsRef = useRef(new Map());

  // Thermal printing trigger helper (Network Elgin i8 ESC/POS with Browser fallback)
  const triggerPrintTicket = async (order, type = 'both', forceBrowser = false) => {
    if (!order || !order.id) return;

    // Proteção contra impressão tripla / disparos concorrentes de múltiplas abas (ex: Balcão + Cozinha)
    const printKey = `${order.id}_${type}`;
    const now = Date.now();
    const lastPrintTime = recentPrintsRef.current.get(printKey) || 0;
    if (now - lastPrintTime < 3500) {
      console.warn(`[Printer] Disparo duplicado de impressão ignorado para ${printKey} (${now - lastPrintTime}ms atrás)`);
      return;
    }
    recentPrintsRef.current.set(printKey, now);

    const isDelivery = order.deliveryType === 'delivery';
    const typeLabel = type === 'kitchen'
      ? 'Comanda Cozinha'
      : type === 'motoboy'
      ? 'Via Motoboy'
      : type === 'both'
      ? (isDelivery ? 'Balcão/Cozinha e Motoboy (2 Folhas)' : 'Balcão e Cozinha (2 Folhas)')
      : 'Cupom Balcão';

    if (printerSettings.enabled && printerSettings.mode !== 'browser' && !forceBrowser) {
      showPrinterToast(`Enviando ${typeLabel}...`, 'info', 1500);
      try {
        const res = await printDirectToNetworkPrinter({
          order,
          type,
          settings: printerSettings
        });
        if (res && res.success) {
          if (!res.fallbackToBrowser) {
            showPrinterToast(res.message || `✅ ${typeLabel} impresso com sucesso!`, 'success', 3000);
            setPrinterStatus({ online: true, checking: false, message: 'Impressora Pronta' });
            return;
          }
          // Driver de escritório A4, navegador ou virtual
          showPrinterToast(`Visualização para impressão aberta (${res.driverName || 'Navegador'})`, 'info', 2500);
          const effectivePaper = res.paperWidth || printerSettings.paperWidth || '80mm';
          setPrintTicket({ order, type, autoClose: true, paperWidth: effectivePaper });
          setTimeout(() => {
            window.print();
          }, 150);
          return;
        }
      } catch (e) {
        console.warn('[Printer] Impressão via backend local não respondeu, usando diálogo do navegador:', e.message);
      }
    }

    // Abre janela do navegador formatada
    const effectivePaper = printerSettings.paperWidth || '80mm';
    setPrintTicket({ order, type, autoClose: true, paperWidth: effectivePaper });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const printTestTicket = async () => {
    showPrinterToast('Enviando teste de impressão...', 'info', 1500);
    setPrinterStatus({ online: true, checking: false, message: 'Impressora Pronta' });
    try {
      const res = await printTestTicketDirect(printerSettings);
      if (res && res.success) {
        if (!res.fallbackToBrowser) {
          showPrinterToast(res.message || '✅ Teste impresso na impressora com sucesso!', 'success', 3000);
          return res;
        }
        // Se for driver de escritório A4 ou navegador
        showPrinterToast(`✅ Teste preparado para ${res.driverName || 'impressão'}!`, 'success', 3000);
        const paperWidth = res.paperWidth || (printerSettings.paperWidth === 'A4' ? 'A4' : '80mm');
        setPrintTicket({
          order: {
            id: 'TESTE-SISTEMA',
            createdAt: new Date().toISOString(),
            customerName: `Teste (${res.driverName || 'Impressora'})`,
            customerPhone: '(33) 99999-8888',
            deliveryType: 'takeout',
            address: 'Balcão / Loja',
            paymentMethod: 'pix',
            status: 'pagamento_confirmado',
            items: [
              { id: '1', name: '1x X-Burger Especial', quantity: 1, price: 30.00, subtotal: 30.00 },
              { id: '2', name: '1x Batata Frita', quantity: 1, price: 15.00, subtotal: 15.00 }
            ],
            subtotal: 45.00,
            deliveryFee: 0,
            total: 45.00
          },
          type: 'counter',
          paperWidth,
          autoClose: true
        });
        setTimeout(() => {
          window.print();
        }, 150);
        return res;
      }
    } catch (e) {}

    // Fallback padrão
    const fallbackPaper = printerSettings.paperWidth || '80mm';
    setPrintTicket({
      order: {
        id: 'TESTE-TERMICO',
        createdAt: new Date().toISOString(),
        customerName: 'Teste de Impressão',
        customerPhone: '(00) 00000-0000',
        items: [{ id: '1', name: 'Item Teste de Impressão', quantity: 1, price: 10.00, subtotal: 10.00 }],
        subtotal: 10.00,
        total: 10.00,
        paymentMethod: 'cash',
        deliveryType: 'takeout'
      },
      type: 'counter',
      paperWidth: fallbackPaper,
      autoClose: true
    });
    setTimeout(() => {
      window.print();
    }, 100);
    return { success: true };
  };

  const closePrintTicket = () => setPrintTicket(null);

  return (
    <OrderContext.Provider value={{
      currentView,
      setCurrentView,
      orders,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      createOrder,
      createCounterOrder,
      updateOrderStatus,
      cancelOrder,
      deleteOrder,
      clearOrders,
      dispatchOrder,
      editOrder,
      addOrderMedia,
      removeOrderMedia,
      printTicket,
      triggerPrintTicket,
      closePrintTicket,
      // Controle de Mesas do Salão (PDV / Balcão)
      tables,
      openTable,
      addItemsToTable,
      closeTable,
      transferTable,
      updateTableStatus,
      addTable,
      deleteTable,
      refreshTables: loadTablesFromSupabase,
      // Elgin i8 Printer Integration
      printerSettings,
      updatePrinterConfig,
      printerStatus,
      checkPrinterConnection,
      printTestTicket,
      printerToast,
      showPrinterToast,
      closePrinterToast: () => setPrinterToast(null),
      // Database state & triggers
      dbStatus,
      isDbConnected: dbStatus === 'connected',
      reconnectDb,
      refreshOrders: loadOrdersFromSupabase,
      // Products (Cardápio dinâmico)
      products,
      categories: CATEGORIES,
      saveProduct,
      deleteProduct,
      toggleProductActive,
      refreshProducts: loadProductsFromSupabase,
      // Customer & Loyalty features
      customer,
      loginCustomer,
      registerCustomer,
      logoutCustomer,
      updateCustomerAddress,
      updateCustomerAvatar,
      reorder,
      // Store Settings & Personalização do Cardápio
      storeSettings,
      updateStoreSettings,
      // Rastreamento GPS de Motoboys em Tempo Real
      motoboyLocations,
      motoboyList: Object.values(motoboyLocations),
      sendMotoboyLocation,
      // Autenticação & Permissões da Equipe (Root / Balcão e Motoboy)
      staffUser,
      loginStaffUser,
      registerStaffUser,
      logoutStaffUser,
      isRoot,
      isMotoboy,
      isStaff
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder deve ser usado dentro de um OrderProvider');
  }
  return context;
};
