import { getSupabaseClient } from '../config/supabase';
import { setStoredActiveOrderId } from '../utils/storage';

export const mapRowToOrder = (row) => {
  if (!row) return null;

  let parsedItems = [];
  if (Array.isArray(row.items)) {
    parsedItems = row.items;
  } else if (typeof row.items === 'string') {
    try {
      parsedItems = JSON.parse(row.items);
    } catch {
      parsedItems = [];
    }
  }

  return {
    id: row.id,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    customerName: row.customer_name || 'Cliente',
    customerPhone: row.customer_phone || '',
    deliveryType: row.delivery_type || 'delivery',
    address: row.address || '',
    paymentMethod: row.payment_method || 'dinheiro',
    status: row.status || 'pronto',
    total: Number(row.total) || 0,
    observation: row.observation || '',
    items: parsedItems,
    deliveryGps: row.delivery_gps || null,
  };
};

/**
 * Busca todos os pedidos para entrega cadastrados no Supabase
 */
export const fetchDeliveryOrders = async () => {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase não conectado' };

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_type', 'delivery')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) throw error;

    return {
      data: (data || []).map(mapRowToOrder),
      error: null,
    };
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    return { data: [], error: err.message || 'Falha ao buscar pedidos' };
  }
};

/**
 * Assina atualizações em tempo real da tabela 'orders'
 */
export const subscribeToOrdersRealtime = async (onUpdate) => {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('sdg-motoboy-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (onUpdate && payload) {
            onUpdate(payload);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('Erro ao assinar canal de pedidos:', err);
    return null;
  }
};

/**
 * Atualiza o status do pedido (ex: saiu_para_entrega, entregue)
 */
export const updateOrderStatus = async (orderId, newStatus, driverName = '') => {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não conectado');

    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'saiu_para_entrega') {
      await setStoredActiveOrderId(orderId);
      if (driverName) {
        updatePayload.delivery_gps = {
          driverName,
          status: 'saiu_para_entrega',
          updatedAt: new Date().toISOString(),
        };
      }
    } else if (newStatus === 'entregue') {
      await setStoredActiveOrderId('');
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapRowToOrder(data) };
  } catch (err) {
    console.error('Erro ao atualizar status do pedido:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Busca dados da loja (telefone, taxas, nome)
 */
export const fetchStoreSettings = async () => {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return null;
    return {
      name: data.name || 'SDG Delivery',
      ...(data.settings || {}),
    };
  } catch {
    return null;
  }
};
