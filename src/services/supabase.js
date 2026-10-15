import { createClient } from '@supabase/supabase-js';

// Keys in localStorage for browser-based configuration
const STORAGE_URL_KEY = 'sdg_supabase_url';
const STORAGE_ANON_KEY = 'sdg_supabase_anon_key';

// Default credentials loaded securely from environment (.env / .env.local)
export const DEFAULT_SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
export const DEFAULT_SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

/**
 * Retrieves the current Supabase URL and Anon Key.
 * Priority: localStorage (manual setup via Admin UI) > Vite import.meta.env > DEFAULT fallback
 */
export const getSupabaseConfig = () => {
  let envUrl = '';
  let envAnonKey = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = import.meta.env.VITE_SUPABASE_URL || '';
      envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch (e) {}
  if (!envUrl && typeof process !== 'undefined' && process.env) {
    envUrl = process.env.VITE_SUPABASE_URL || '';
    envAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  }

  const localUrl = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_URL_KEY) || '') : '';
  const localAnonKey = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_ANON_KEY) || '') : '';

  const url = (localUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (localAnonKey || envAnonKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    anonKey,
    source: localUrl ? 'browser_storage' : (envUrl ? 'env' : 'default'),
    isConfigured: Boolean(url && anonKey && url.startsWith('http'))
  };
};

// Singleton Supabase Client instance
let supabaseClient = null;
let currentConfigKey = '';

export const getSupabaseClient = () => {
  const config = getSupabaseConfig();
  const configKey = `${config.url}::${config.anonKey}`;

  if (!config.isConfigured) {
    return null;
  }

  if (!supabaseClient || currentConfigKey !== configKey) {
    currentConfigKey = configKey;
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: (url, options = {}) => {
          // Timeout de 8 segundos para evitar travamentos caso o projeto esteja pausado
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        timeout: 8000
      }
    });
  }

  return supabaseClient;
};

export const isSupabaseConfigured = () => {
  return getSupabaseConfig().isConfigured;
};

export const saveSupabaseConfig = (url, anonKey) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_URL_KEY, url.trim());
    else localStorage.removeItem(STORAGE_URL_KEY);

    if (anonKey) localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_ANON_KEY);

    // Reset client to reinitialize
    supabaseClient = null;
    currentConfigKey = '';
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
    supabaseClient = null;
    currentConfigKey = '';
  }
};

/**
 * Tests connection with Supabase and verifies the 'orders' table exists.
 */
export const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL ou Chave Anon não foram configuradas ainda.'
    };
  }

  try {
    const { data, error } = await client
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          code: 'TABLE_NOT_FOUND',
          message: 'Conectado ao Supabase, mas a tabela "orders" ainda não foi criada. Execute o script SQL no Supabase!'
        };
      }
      return {
        success: false,
        code: error.code,
        message: `Erro Supabase: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabela "orders" encontrada.'
    };
  } catch (err) {
    return {
      success: false,
      message: `Falha na conexão de rede: ${err.message}`
    };
  }
};
