// ==============================================================================
// 🛵 Motoboy Commission Service - Gestão de Corridas, Taxas e Acertos
// ==============================================================================

import { printMotoboyCommissionDirect } from './printerService';
import { addCashMovement, getActiveCashierShift } from './cashierService';

export const SDG_MOTOBOY_SETTINGS = 'sdg_motoboy_settings';
export const SDG_MOTOBOY_PAYOUTS = 'sdg_motoboy_payouts';
export const MOTOBOY_COMMISSION_EVENT = 'sdg_motoboy_commission_changed';

export const DEFAULT_MOTOBOY_SETTINGS = {
  rateModel: 'delivery_fee', // 'delivery_fee' | 'fixed' | 'percentage' | 'fixed_plus_fee'
  fixedRate: 5.00,
  percentageRate: 100,
  dailyAllowance: 0.00,
  autoCashierSangria: true
};

/**
 * Notifica que houve alteração nos acertos de motoboys
 */
function dispatchCommissionChange(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MOTOBOY_COMMISSION_EVENT, { detail }));
  }
}

/**
 * Obtém as configurações de comissão de motoboys
 */
export function getMotoboySettings() {
  try {
    const raw = localStorage.getItem(SDG_MOTOBOY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_MOTOBOY_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações de motoboy:', e);
  }
  return { ...DEFAULT_MOTOBOY_SETTINGS };
}

/**
 * Salva as configurações de comissão de motoboys
 */
export function saveMotoboySettings(settings) {
  try {
    const current = getMotoboySettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SDG_MOTOBOY_SETTINGS, JSON.stringify(updated));
    dispatchCommissionChange({ type: 'settings_updated', settings: updated });
    return updated;
  } catch (e) {
    console.error('Erro ao salvar configurações de motoboy:', e);
    return settings;
  }
}

/**
 * Obtém o histórico de acertos/pagamentos de comissões aos motoboys
 */
export function getMotoboyPayouts() {
  try {
    const raw = localStorage.getItem(SDG_MOTOBOY_PAYOUTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao carregar histórico de pagamentos de motoboy:', e);
  }
  return [];
}

/**
 * Detecta o nome do motoboy responsável pelo pedido
 */
export function extractMotoboyName(order) {
  if (!order) return 'Não Atribuído';
  if (order.motoboyName && order.motoboyName.trim()) return order.motoboyName.trim();
  if (order.motoboy_name && order.motoboy_name.trim()) return order.motoboy_name.trim();
  if (order.driverName && order.driverName.trim()) return order.driverName.trim();
  if (order.driver_name && order.driver_name.trim()) return order.driver_name.trim();
  if (order.deliveryGps?.driverName && order.deliveryGps.driverName.trim()) {
    return order.deliveryGps.driverName.trim();
  }

  // Tenta extrair da observação (ex: "Motoboy: Carlos")
  const obs = order.observation || '';
  if (typeof obs === 'string') {
    const match = obs.match(/Motoboy:\s*([^|,]+)/i);
    if (match && match[1]) return match[1].trim();
  }

  return 'Não Atribuído';
}

/**
 * Calcula o valor da comissão de uma corrida individual
 */
export function calculateOrderCommission(order, settings = null) {
  const cfg = settings || getMotoboySettings();
  const deliveryFee = Number(order.deliveryFee || order.delivery_fee || 5.00) || 5.00;

  switch (cfg.rateModel) {
    case 'fixed':
      return Number(cfg.fixedRate) || 5.00;
    case 'percentage':
      return deliveryFee * ((Number(cfg.percentageRate) || 100) / 100);
    case 'fixed_plus_fee':
      return (Number(cfg.fixedRate) || 0) + deliveryFee;
    case 'delivery_fee':
    default:
      return deliveryFee;
  }
}

/**
 * Calcula todas as comissões consolidadas por motoboy no período selecionado
 */
export function calculateMotoboyCommissions(orders = [], customSettings = null, payouts = null) {
  const cfg = customSettings || getMotoboySettings();
  const payoutList = payouts || getMotoboyPayouts();

  // Mapeia conjunto de IDs de pedidos já pagos
  const paidOrderIds = new Set();
  payoutList.forEach(p => {
    (p.orderIds || []).forEach(id => paidOrderIds.add(id));
  });

  // Filtra apenas pedidos de delivery válidos (não cancelados)
  const deliveryOrders = (orders || []).filter(o => {
    if (!o) return false;
    const type = String(o.deliveryType || o.delivery_type || '').toLowerCase();
    const status = String(o.status || '').toLowerCase();
    return type === 'delivery' && status !== 'cancelado';
  });

  const motoboyMap = new Map();

  deliveryOrders.forEach(order => {
    const name = extractMotoboyName(order);
    const fee = Number(order.deliveryFee || order.delivery_fee || 5.00) || 5.00;
    const commission = calculateOrderCommission(order, cfg);
    const isPaid = paidOrderIds.has(order.id) || order.motoboyCommissionPaid === true;

    if (!motoboyMap.has(name)) {
      motoboyMap.set(name, {
        motoboyName: name,
        deliveriesCount: 0,
        totalDeliveryFees: 0,
        totalCommission: Number(cfg.dailyAllowance) || 0,
        dailyAllowance: Number(cfg.dailyAllowance) || 0,
        paidCommission: 0,
        pendingCommission: 0,
        orders: []
      });
    }

    const mb = motoboyMap.get(name);
    mb.deliveriesCount += 1;
    mb.totalDeliveryFees += fee;
    mb.totalCommission += commission;

    if (isPaid) {
      mb.paidCommission += commission;
    } else {
      mb.pendingCommission += commission;
    }

    mb.orders.push({
      id: order.id,
      createdAt: order.createdAt || order.created_at,
      customerName: order.customerName || order.customer_name || 'Cliente',
      customerPhone: order.customerPhone || order.customer_phone || '',
      address: order.address || '',
      total: Number(order.total) || 0,
      deliveryFee: fee,
      commission,
      status: order.status,
      isPaid
    });
  });

  // Converte em array e ordena por maior quantidade de entregas
  const list = Array.from(motoboyMap.values()).map(mb => {
    // Se a comissão calculada estiver 100% paga
    const isSettled = mb.pendingCommission <= 0.01;
    return {
      ...mb,
      status: isSettled ? 'pago' : 'pendente'
    };
  });

  list.sort((a, b) => b.deliveriesCount - a.deliveriesCount);

  // Totais Gerais
  const totals = {
    totalDeliveries: list.reduce((acc, m) => acc + m.deliveriesCount, 0),
    totalDeliveryFees: list.reduce((acc, m) => acc + m.totalDeliveryFees, 0),
    totalCommission: list.reduce((acc, m) => acc + m.totalCommission, 0),
    totalPaid: list.reduce((acc, m) => acc + m.paidCommission, 0),
    totalPending: list.reduce((acc, m) => acc + m.pendingCommission, 0),
    motoboysCount: list.length
  };

  return { list, totals };
}

/**
 * Realiza a quitação / baixa de comissões com um motoboy
 * Opcionalmente cria uma Sangria no caixa aberto e imprime comprovante na Elgin i8
 */
export async function payoutMotoboyCommission({
  motoboyName,
  orderIds = [],
  amount,
  deliveries = [],
  paymentMethod = 'dinheiro',
  operatorName = 'Balcão',
  notes = '',
  createSangria = true,
  printReceipt = true,
  printerSettings = null
}) {
  const payoutAmount = Math.max(0, Number(amount) || 0);
  if (payoutAmount <= 0) {
    throw new Error('Valor de acerto deve ser maior que zero.');
  }

  const payoutId = `PAY-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  // 1. Registrar Sangria no Caixa Aberto se solicitado
  let sangriaResult = null;
  if (createSangria) {
    try {
      const activeShift = await getActiveCashierShift();
      if (activeShift) {
        sangriaResult = await addCashMovement({
          shiftId: activeShift.id,
          type: 'sangria',
          amount: payoutAmount,
          reason: `Acerto Comissão Motoboy: ${motoboyName} (${orderIds.length} corridas)`,
          operatorName
        });
      }
    } catch (err) {
      console.warn('Não foi possível registrar sangria automática no caixa:', err);
    }
  }

  // 2. Salvar no histórico de pagamentos de motoboys
  const payoutRecord = {
    id: payoutId,
    motoboyName,
    orderIds,
    amount: payoutAmount,
    deliveryCount: orderIds.length,
    paymentMethod,
    operatorName,
    notes: notes || '',
    sangriaRecorded: Boolean(sangriaResult),
    createdAt: now
  };

  try {
    const existing = getMotoboyPayouts();
    existing.unshift(payoutRecord);
    localStorage.setItem(SDG_MOTOBOY_PAYOUTS, JSON.stringify(existing.slice(0, 200)));
  } catch (e) {
    console.error('Erro ao gravar payout no localStorage:', e);
  }

  // 3. Imprimir comprovante térmico na Elgin i8 se solicitado
  let printResult = null;
  if (printReceipt) {
    try {
      const ticketData = {
        motoboyName,
        totalDeliveries: orderIds.length,
        totalCommission: payoutAmount,
        status: 'pago',
        paymentMethod,
        operatorName,
        notes,
        deliveries: deliveries.map(d => ({
          id: d.id,
          time: d.createdAt,
          address: d.address,
          commission: d.commission
        }))
      };

      printResult = await printMotoboyCommissionDirect({
        data: ticketData,
        settings: printerSettings
      });
    } catch (err) {
      console.warn('Erro ao emitir comprovante na Elgin i8:', err);
    }
  }

  dispatchCommissionChange({ type: 'payout_completed', payout: payoutRecord });
  return { payout: payoutRecord, sangria: sangriaResult, print: printResult };
}

/**
 * Emite extrato de conferência do motoboy na Elgin i8 sem dar baixa
 */
export async function printMotoboyStatement({
  motoboyName,
  motoboyPhone = '',
  deliveries = [],
  totalCommission = 0,
  dailyAllowance = 0,
  status = 'pendente',
  operatorName = 'Balcão',
  printerSettings = null
}) {
  const ticketData = {
    motoboyName,
    motoboyPhone,
    totalDeliveries: deliveries.length,
    totalCommission,
    dailyAllowance,
    status,
    operatorName,
    deliveries: deliveries.map(d => ({
      id: d.id,
      time: d.createdAt,
      address: d.address,
      commission: d.commission
    }))
  };

  return printMotoboyCommissionDirect({
    data: ticketData,
    settings: printerSettings
  });
}
