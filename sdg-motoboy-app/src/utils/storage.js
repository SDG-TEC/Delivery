import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DRIVER_NAME: '@sdg_motoboy_driver_name',
  SUPABASE_URL: '@sdg_motoboy_supabase_url',
  SUPABASE_KEY: '@sdg_motoboy_supabase_key',
  IS_ONLINE: '@sdg_motoboy_is_online',
  ACTIVE_ORDER_ID: '@sdg_motoboy_active_order_id',
};

// Default fallback configuration from environment variables
export const DEFAULT_CONFIG = {
  SUPABASE_URL: (process.env && process.env.EXPO_PUBLIC_SUPABASE_URL) || '',
  SUPABASE_KEY: (process.env && process.env.EXPO_PUBLIC_SUPABASE_KEY) || '',
  DEFAULT_DRIVER_NAME: 'Entregador 1',
};

export const getStoredDriverName = async () => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_NAME);
    return val || DEFAULT_CONFIG.DEFAULT_DRIVER_NAME;
  } catch {
    return DEFAULT_CONFIG.DEFAULT_DRIVER_NAME;
  }
};

export const setStoredDriverName = async (name) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_NAME, name.trim());
  } catch (err) {
    console.error('Erro ao salvar nome do entregador:', err);
  }
};

export const getStoredSupabaseConfig = async () => {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const key = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_KEY);
    return {
      url: (url || DEFAULT_CONFIG.SUPABASE_URL).trim(),
      anonKey: (key || DEFAULT_CONFIG.SUPABASE_KEY).trim(),
    };
  } catch {
    return {
      url: DEFAULT_CONFIG.SUPABASE_URL,
      anonKey: DEFAULT_CONFIG.SUPABASE_KEY,
    };
  }
};

export const setStoredSupabaseConfig = async (url, anonKey) => {
  try {
    if (url) await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
    if (anonKey) await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, anonKey.trim());
  } catch (err) {
    console.error('Erro ao salvar configuração do Supabase:', err);
  }
};

export const getStoredOnlineStatus = async () => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.IS_ONLINE);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
};

export const setStoredOnlineStatus = async (isOnline) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_ONLINE, isOnline ? 'true' : 'false');
  } catch (err) {
    console.error('Erro ao salvar status online:', err);
  }
};

export const getStoredActiveOrderId = async () => {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_ORDER_ID)) || '';
  } catch {
    return '';
  }
};

export const setStoredActiveOrderId = async (orderId) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_ORDER_ID, orderId || '');
  } catch (err) {
    console.error('Erro ao salvar pedido ativo:', err);
  }
};
