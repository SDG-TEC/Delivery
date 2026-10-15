import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const TABLES_STORAGE_KEY = 'sdg_delivery_tables_v1';
export const TABLES_BROADCAST_CHANNEL = 'sdg_delivery_tables_channel';

/**
 * 12 Mesas padrão iniciais para o salão
 */
export const DEFAULT_TABLES = Array.from({ length: 12 }, (_, i) => ({
  id: `mesa-${i + 1}`,
  tableNumber: i + 1,
  name: `Mesa ${String(i + 1).padStart(2, '0')}`,
  status: 'livre', // 'livre' | 'ocupada' | 'fechando'
  currentOrderId: null,
  customerName: '',
  peopleCount: 1,
  openedAt: null,
  notes: ''
}));

/**
 * Lê mesas salvas no localStorage
 */
export const getLocalTables = () => {
  try {
    const raw = localStorage.getItem(TABLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler mesas locais:', e);
  }
  localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
  return DEFAULT_TABLES;
};

/**
 * Grava mesas no localStorage e propaga via BroadcastChannel
 */
export const saveLocalTables = (tables) => {
  try {
    localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables));
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel(TABLES_BROADCAST_CHANNEL);
      channel.postMessage({ type: 'SYNC_TABLES', data: tables });
      channel.close();
    }
  } catch (e) {
    console.error('Erro ao salvar mesas locais:', e);
  }
};

/**
 * Converte linha do banco (snake_case) para objeto de mesa (camelCase)
 */
export const mapRowToTable = (row) => ({
  id: row.id,
  tableNumber: Number(row.table_number),
  name: row.name || `Mesa ${String(row.table_number).padStart(2, '0')}`,
  status: row.status || 'livre',
  currentOrderId: row.current_order_id || null,
  customerName: row.customer_name || '',
  peopleCount: Number(row.people_count) || 1,
  openedAt: row.opened_at || null,
  notes: row.notes || ''
});

/**
 * Converte objeto de mesa (camelCase) para linha do banco (snake_case)
 */
export const mapTableToRow = (table) => ({
  id: table.id,
  table_number: table.tableNumber,
  name: table.name || `Mesa ${String(table.tableNumber).padStart(2, '0')}`,
  status: table.status || 'livre',
  current_order_id: table.currentOrderId || null,
  customer_name: table.customerName || '',
  people_count: table.peopleCount || 1,
  opened_at: table.openedAt || null,
  notes: table.notes || '',
  updated_at: new Date().toISOString()
});

/**
 * Busca todas as mesas no Supabase com fallback para o localStorage
 */
export const fetchTablesFromDb = async () => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { tables: getLocalTables(), source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (error) {
      // Se a tabela ainda não existir no Supabase, usa local
      if (error.code === '42P01') {
        console.warn('Tabela restaurant_tables não criada no Supabase. Usando local.');
        return { tables: getLocalTables(), source: 'local', tableMissing: true };
      }
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map(mapRowToTable);
      saveLocalTables(mapped);
      return { tables: mapped, source: 'supabase' };
    }

    // Se estiver vazia no banco, inicializa com as 12 mesas padrão
    const initialRows = DEFAULT_TABLES.map(mapTableToRow);
    const { data: inserted, error: insertErr } = await supabase
      .from('restaurant_tables')
      .insert(initialRows)
      .select();

    if (!insertErr && Array.isArray(inserted) && inserted.length > 0) {
      const mapped = inserted.map(mapRowToTable);
      saveLocalTables(mapped);
      return { tables: mapped, source: 'supabase' };
    }
  } catch (err) {
    console.warn('Falha ao buscar mesas no Supabase, usando local:', err);
  }

  return { tables: getLocalTables(), source: 'local' };
};

/**
 * Salva ou atualiza uma mesa no Supabase e no localStorage
 */
export const saveTableInDb = async (table) => {
  const localTables = getLocalTables();
  const idx = localTables.findIndex(t => t.id === table.id || t.tableNumber === table.tableNumber);
  let updated;
  if (idx >= 0) {
    updated = [...localTables];
    updated[idx] = { ...updated[idx], ...table };
  } else {
    updated = [...localTables, table].sort((a, b) => a.tableNumber - b.tableNumber);
  }
  saveLocalTables(updated);

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const row = mapTableToRow(table);
      await supabase
        .from('restaurant_tables')
        .upsert([row], { onConflict: 'table_number' });
    } catch (err) {
      console.warn('Aviso: Erro ao sincronizar mesa no Supabase:', err);
    }
  }

  return updated;
};

/**
 * Adiciona uma nova mesa
 */
export const addTableInDb = async (tableNumber, name = '') => {
  const newTable = {
    id: `mesa-${tableNumber}`,
    tableNumber: Number(tableNumber),
    name: name.trim() || `Mesa ${String(tableNumber).padStart(2, '0')}`,
    status: 'livre',
    currentOrderId: null,
    customerName: '',
    peopleCount: 1,
    openedAt: null,
    notes: ''
  };

  return saveTableInDb(newTable);
};

/**
 * Remove uma mesa (apenas se estiver livre)
 */
export const deleteTableInDb = async (tableId) => {
  const localTables = getLocalTables();
  const updated = localTables.filter(t => t.id !== tableId);
  saveLocalTables(updated);

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', tableId);
    } catch (err) {
      console.warn('Aviso ao deletar mesa no Supabase:', err);
    }
  }

  return updated;
};

/**
 * Escuta atualizações de mesas em tempo real via Supabase Realtime
 */
export const subscribeToTablesRealtime = (onUpdate) => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('restaurant_tables_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables' },
        (payload) => {
          if (payload.new) {
            onUpdate(mapRowToTable(payload.new));
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('Aviso ao conectar realtime de mesas:', err);
    return null;
  }
};
