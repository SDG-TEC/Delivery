// ==============================================================================
// 💵 Cashier Service - Gestão de Turnos de Caixa, Movimentações e Fechamento
// ==============================================================================

import { getSupabaseClient } from './supabase';
import { printCashierReportDirect } from './printerService';

export const SDG_ACTIVE_CASHIER_SHIFT = 'sdg_active_cashier_shift';
export const SDG_CASHIER_HISTORY = 'sdg_cashier_history';
export const CASHIER_EVENT_NAME = 'sdg_cashier_changed';

/**
 * Notifica ouvintes de que houve alteração no estado do caixa
 */
function dispatchCashierChange(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CASHIER_EVENT_NAME, { detail }));
  }
}

/**
 * Mapeia registro do Postgres (snake_case) para objeto JavaScript (camelCase)
 */
export function mapShiftRowToFrontend(row) {
  if (!row) return null;

  let movements = [];
  if (Array.isArray(row.movements)) {
    movements = row.movements;
  } else if (typeof row.movements === 'string') {
    try { movements = JSON.parse(row.movements); } catch (e) { movements = []; }
  }

  let closingData = null;
  if (row.closing_data && typeof row.closing_data === 'object') {
    closingData = row.closing_data;
  } else if (typeof row.closing_data === 'string') {
    try { closingData = JSON.parse(row.closing_data); } catch (e) { closingData = null; }
  }

  return {
    id: row.id,
    operatorName: row.operator_name || 'Operador',
    openedAt: row.opened_at || new Date().toISOString(),
    closedAt: row.closed_at || null,
    status: row.status || 'open',
    initialCash: Number(row.initial_cash) || 0,
    movements: movements || [],
    closingData: closingData || null,
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

/**
 * Mapeia objeto frontend para formato de linha do banco Supabase
 */
export function mapShiftFrontendToRow(shift) {
  return {
    id: shift.id,
    operator_name: shift.operatorName || 'Operador',
    opened_at: shift.openedAt || new Date().toISOString(),
    closed_at: shift.closedAt || null,
    status: shift.status || 'open',
    initial_cash: Number(shift.initialCash) || 0,
    movements: shift.movements || [],
    closing_data: shift.closingData || null,
    notes: shift.notes || '',
    updated_at: new Date().toISOString()
  };
}

/**
 * Obtém o turno de caixa atualmente aberto (tenta Supabase, fallback para localStorage)
 */
export async function getActiveCashierShift() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cashier_shifts')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const active = mapShiftRowToFrontend(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(active));
        }
        return active;
      }
    } catch (err) {
      console.warn('Falha ao consultar turno ativo no Supabase, usando cache local:', err);
    }
  }

  // Fallback para localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(SDG_ACTIVE_CASHIER_SHIFT);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.status === 'open') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler cache local do caixa:', e);
    }
  }

  return null;
}

/**
 * Abre um novo turno de caixa com fundo de troco inicial
 */
export async function openCashierShift({ operatorName, initialCash = 0, notes = '' }) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const shiftId = `CX-${dateStr}-${randStr}`;

  const shift = {
    id: shiftId,
    operatorName: (operatorName && operatorName.trim()) || 'Operador de Balcão',
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: 'open',
    initialCash: Math.max(0, Number(initialCash) || 0),
    movements: [],
    closingData: null,
    notes: (notes && notes.trim()) || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Salva no localStorage imediatamente
  if (typeof window !== 'undefined') {
    localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(shift));
  }

  // Persiste no Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const row = mapShiftFrontendToRow(shift);
      await supabase.from('cashier_shifts').insert([row]);
    } catch (err) {
      console.warn('Erro ao inserir novo turno no Supabase (funcionando em modo local):', err);
    }
  }

  dispatchCashierChange({ type: 'opened', shift });
  return shift;
}

/**
 * Registra uma movimentação de caixa (sangria / retirada ou suprimento / entrada)
 */
export async function addCashMovement({ shiftId, type, amount, reason = '', operatorName = '' }) {
  const numericAmount = Math.max(0, Number(amount) || 0);
  if (numericAmount <= 0) {
    throw new Error('O valor da movimentação deve ser maior que zero.');
  }
  if (type !== 'sangria' && type !== 'suprimento') {
    throw new Error('Tipo de movimentação inválido. Use sangria ou suprimento.');
  }

  let activeShift = await getActiveCashierShift();
  if (!activeShift || (shiftId && activeShift.id !== shiftId)) {
    throw new Error('Nenhum turno de caixa aberto encontrado.');
  }

  const movement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    amount: numericAmount,
    reason: (reason && reason.trim()) || (type === 'sangria' ? 'Sangria de caixa' : 'Reforço de troco'),
    operatorName: operatorName || activeShift.operatorName || 'Operador',
    timestamp: new Date().toISOString()
  };

  const updatedMovements = [...(activeShift.movements || []), movement];
  activeShift = {
    ...activeShift,
    movements: updatedMovements,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(activeShift));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cashier_shifts')
        .update({
          movements: updatedMovements,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeShift.id);
    } catch (err) {
      console.warn('Erro ao atualizar movimentação no Supabase:', err);
    }
  }

  dispatchCashierChange({ type: 'movement_added', shift: activeShift, movement });
  return { shift: activeShift, movement };
}

/**
 * Edita uma movimentação existente de caixa (suprimento ou sangria)
 */
export async function updateCashMovement({ shiftId, movementId, type, amount, reason = '', operatorName = '' }) {
  const numericAmount = Math.max(0, Number(amount) || 0);
  if (numericAmount <= 0) {
    throw new Error('O valor da movimentação deve ser maior que zero.');
  }
  if (type !== 'sangria' && type !== 'suprimento') {
    throw new Error('Tipo de movimentação inválido. Use sangria ou suprimento.');
  }

  let activeShift = await getActiveCashierShift();
  if (!activeShift || (shiftId && activeShift.id !== shiftId)) {
    throw new Error('Nenhum turno de caixa aberto encontrado.');
  }

  const movements = activeShift.movements || [];
  const index = movements.findIndex(m => m.id === movementId);
  if (index === -1) {
    throw new Error('Movimentação não encontrada no turno ativo.');
  }

  const updatedMovement = {
    ...movements[index],
    type,
    amount: numericAmount,
    reason: (reason && reason.trim()) || movements[index].reason || (type === 'sangria' ? 'Sangria de caixa' : 'Reforço de troco'),
    operatorName: operatorName || movements[index].operatorName || activeShift.operatorName || 'Operador',
    updatedAt: new Date().toISOString()
  };

  const updatedMovements = [...movements];
  updatedMovements[index] = updatedMovement;

  activeShift = {
    ...activeShift,
    movements: updatedMovements,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(activeShift));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cashier_shifts')
        .update({
          movements: updatedMovements,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeShift.id);
    } catch (err) {
      console.warn('Erro ao atualizar movimentação no Supabase:', err);
    }
  }

  dispatchCashierChange({ type: 'movement_updated', shift: activeShift, movement: updatedMovement });
  return { shift: activeShift, movement: updatedMovement };
}

/**
 * Exclui uma movimentação de caixa (sangria ou suprimento)
 */
export async function deleteCashMovement({ shiftId, movementId }) {
  let activeShift = await getActiveCashierShift();
  if (!activeShift || (shiftId && activeShift.id !== shiftId)) {
    throw new Error('Nenhum turno de caixa aberto encontrado.');
  }

  const movements = activeShift.movements || [];
  const updatedMovements = movements.filter(m => m.id !== movementId);

  activeShift = {
    ...activeShift,
    movements: updatedMovements,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(activeShift));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cashier_shifts')
        .update({
          movements: updatedMovements,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeShift.id);
    } catch (err) {
      console.warn('Erro ao excluir movimentação no Supabase:', err);
    }
  }

  dispatchCashierChange({ type: 'movement_deleted', shift: activeShift, movementId });
  return { shift: activeShift };
}

/**
 * Altera o fundo de troco inicial da gaveta caso tenha sido aberto com valor incorreto
 */
export async function updateShiftInitialCash({ shiftId, initialCash }) {
  const numericAmount = Math.max(0, Number(initialCash) || 0);

  let activeShift = await getActiveCashierShift();
  if (!activeShift || (shiftId && activeShift.id !== shiftId)) {
    throw new Error('Nenhum turno de caixa aberto encontrado.');
  }

  activeShift = {
    ...activeShift,
    initialCash: numericAmount,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SDG_ACTIVE_CASHIER_SHIFT, JSON.stringify(activeShift));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cashier_shifts')
        .update({
          initial_cash: numericAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeShift.id);
    } catch (err) {
      console.warn('Erro ao atualizar fundo inicial no Supabase:', err);
    }
  }

  dispatchCashierChange({ type: 'initial_cash_updated', shift: activeShift, initialCash: numericAmount });
  return { shift: activeShift };
}

/**
 * Calcula todas as métricas financeiras de um turno com base nos pedidos
 */
export function calculateShiftMetrics(shift, orders = []) {
  if (!shift) {
    return {
      initialCash: 0,
      totalCash: 0,
      totalPix: 0,
      totalCredit: 0,
      totalDebit: 0,
      totalOther: 0,
      countCash: 0,
      countPix: 0,
      countCredit: 0,
      countDebit: 0,
      countOther: 0,
      totalSales: 0,
      ordersCount: 0,
      averageTicket: 0,
      totalSuprimentos: 0,
      totalSangrias: 0,
      expectedCash: 0,
      byChannel: {
        delivery: { count: 0, total: 0 },
        takeout: { count: 0, total: 0 },
        dine_in: { count: 0, total: 0 }
      },
      cancelledCount: 0,
      cancelledTotal: 0,
      totalDeliveryFee: 0
    };
  }

  const initialCash = Number(shift.initialCash) || 0;
  const openTime = new Date(shift.openedAt).getTime();
  const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Infinity;

  // Filtrar pedidos realizados no intervalo do turno
  const shiftOrders = (orders || []).filter(order => {
    if (!order) return false;
    const t = new Date(order.createdAt || order.created_at).getTime();
    if (isNaN(t)) return true; // Se não tem data válida, considera do turno
    return t >= openTime && t <= closeTime;
  });

  let totalCash = 0;
  let totalPix = 0;
  let totalCredit = 0;
  let totalDebit = 0;
  let totalOther = 0;

  let countCash = 0;
  let countPix = 0;
  let countCredit = 0;
  let countDebit = 0;
  let countOther = 0;

  let totalSales = 0;
  let ordersCount = 0;
  let cancelledCount = 0;
  let cancelledTotal = 0;
  let totalDeliveryFee = 0;

  const byChannel = {
    delivery: { count: 0, total: 0 },
    takeout: { count: 0, total: 0 },
    dine_in: { count: 0, total: 0 }
  };

  shiftOrders.forEach(order => {
    const val = Number(order.total) || 0;
    const status = String(order.status || '').toLowerCase();

    if (status === 'cancelado') {
      cancelledCount += 1;
      cancelledTotal += val;
      return; // Cancelados NÃO entram no faturamento
    }

    ordersCount += 1;
    totalSales += val;

    // Métodos de Pagamento
    const method = String(order.paymentMethod || order.payment_method || '').toLowerCase();
    if (method.includes('dinheiro') || method === 'cash') {
      totalCash += val;
      countCash += 1;
    } else if (method.includes('pix')) {
      totalPix += val;
      countPix += 1;
    } else if (method.includes('debito') || method === 'debit_card') {
      totalDebit += val;
      countDebit += 1;
    } else if (method.includes('credito') || method === 'credit_card' || method === 'card') {
      totalCredit += val;
      countCredit += 1;
    } else {
      totalOther += val;
      countOther += 1;
    }

    // Canais de Venda
    const channel = String(order.deliveryType || order.delivery_type || 'takeout').toLowerCase();
    if (channel === 'delivery') {
      byChannel.delivery.count += 1;
      byChannel.delivery.total += val;
      if (order.deliveryFee || order.delivery_fee) {
        totalDeliveryFee += Number(order.deliveryFee || order.delivery_fee) || 0;
      }
    } else if (channel === 'dine_in' || channel === 'mesa') {
      byChannel.dine_in.count += 1;
      byChannel.dine_in.total += val;
    } else {
      byChannel.takeout.count += 1;
      byChannel.takeout.total += val;
    }
  });

  const averageTicket = ordersCount > 0 ? totalSales / ordersCount : 0;

  // Movimentações de Caixa
  const movs = shift.movements || [];
  const totalSuprimentos = movs
    .filter(m => m.type === 'suprimento')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const totalSangrias = movs
    .filter(m => m.type === 'sangria')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  // Dinheiro esperado na gaveta física
  const expectedCash = initialCash + totalCash + totalSuprimentos - totalSangrias;

  return {
    initialCash,
    totalCash,
    totalPix,
    totalCredit,
    totalDebit,
    totalOther,
    countCash,
    countPix,
    countCredit,
    countDebit,
    countOther,
    totalSales,
    ordersCount,
    averageTicket,
    totalSuprimentos,
    totalSangrias,
    expectedCash,
    byChannel,
    cancelledCount,
    cancelledTotal,
    totalDeliveryFee
  };
}

/**
 * Fecha o turno de caixa com conferência física (Leitura Z)
 */
export async function closeCashierShift({
  shiftId,
  countedCash = 0,
  notes = '',
  orders = [],
  operatorName = ''
}) {
  let activeShift = await getActiveCashierShift();
  if (!activeShift || (shiftId && activeShift.id !== shiftId)) {
    throw new Error('Nenhum turno de caixa aberto encontrado para fechar.');
  }

  const metrics = calculateShiftMetrics(activeShift, orders);
  const numericCounted = Math.max(0, Number(countedCash) || 0);
  const difference = numericCounted - metrics.expectedCash;

  const closingData = {
    ...metrics,
    countedCash: numericCounted,
    difference,
    notes: (notes && notes.trim()) || '',
    closedBy: operatorName || activeShift.operatorName || 'Operador',
    closedAt: new Date().toISOString()
  };

  const closedShift = {
    ...activeShift,
    status: 'closed',
    closedAt: new Date().toISOString(),
    closingData,
    notes: (notes && notes.trim()) || activeShift.notes || '',
    updatedAt: new Date().toISOString()
  };

  // Salvar no histórico local e limpar ativo
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SDG_ACTIVE_CASHIER_SHIFT);
      const rawHist = localStorage.getItem(SDG_CASHIER_HISTORY);
      const hist = rawHist ? JSON.parse(rawHist) : [];
      hist.unshift(closedShift);
      localStorage.setItem(SDG_CASHIER_HISTORY, JSON.stringify(hist.slice(0, 100)));
    } catch (e) {
      console.error('Erro ao atualizar histórico de caixa no localStorage:', e);
    }
  }

  // Atualizar no Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cashier_shifts')
        .update({
          status: 'closed',
          closed_at: closedShift.closedAt,
          closing_data: closingData,
          notes: closedShift.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', closedShift.id);
    } catch (err) {
      console.warn('Erro ao atualizar fechamento de caixa no Supabase:', err);
    }
  }

  dispatchCashierChange({ type: 'closed', shift: closedShift });
  return closedShift;
}

/**
 * Obtém a lista histórica de turnos de caixa fechados
 */
export async function getCashierHistory(limit = 50) {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cashier_shifts')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map(mapShiftRowToFrontend);
      }
    } catch (err) {
      console.warn('Falha ao obter histórico de caixa do Supabase, usando cache local:', err);
    }
  }

  // Fallback para localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SDG_CASHIER_HISTORY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Erro ao ler histórico de caixa do localStorage:', e);
    }
  }

  return [];
}

/**
 * Emite cupom impresso na Elgin i8 (Leitura X ou Z)
 */
export async function printCashierReport({ shiftData, isPartial = false, settings = null }) {
  return printCashierReportDirect({ shiftData, isPartial, settings });
}
