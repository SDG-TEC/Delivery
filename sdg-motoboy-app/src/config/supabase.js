import { createClient } from '@supabase/supabase-js';
import { getStoredSupabaseConfig, DEFAULT_CONFIG } from '../utils/storage';

let supabaseInstance = null;
let currentUrl = '';
let currentKey = '';

export const getSupabaseClient = async () => {
  const config = await getStoredSupabaseConfig();
  const targetUrl = config.url || DEFAULT_CONFIG.SUPABASE_URL;
  const targetKey = config.anonKey || DEFAULT_CONFIG.SUPABASE_KEY;

  if (supabaseInstance && currentUrl === targetUrl && currentKey === targetKey) {
    return supabaseInstance;
  }

  currentUrl = targetUrl;
  currentKey = targetKey;

  supabaseInstance = createClient(targetUrl, targetKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
  currentUrl = '';
  currentKey = '';
};

export const testConnection = async () => {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Conectado com sucesso ao Supabase!' };
  } catch (err) {
    return { success: false, message: err?.message || 'Falha na conexão de rede' };
  }
};
