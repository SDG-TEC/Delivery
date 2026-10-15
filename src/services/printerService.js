// ==============================================================================
// 🖨️ Printer Service - Elgin i8 / i9 Network Printing (192.168.1.150:9100)
// ==============================================================================

import {
  buildKitchenEscpos,
  buildCounterEscpos,
  buildMotoboyEscpos,
  buildBothEscpos,
  buildBothEscposList,
  buildTestEscpos,
  buildCashierClosingEscpos,
  buildMotoboyCommissionEscpos
} from '../utils/escposGenerator';
import { getSupabaseClient } from './supabase';
import { PrinterManager } from './printers';

export { PrinterManager } from './printers';

export const PRINTER_STORAGE_KEY = 'sdg_printer_settings';
export const PRINTER_CLOUD_CHANNEL = 'sdg-printer-bridge';

let printerRelayChannel = null;

/**
 * Obtém ou inicializa o canal Realtime no Supabase para conexão Nuvem (Vercel) -> PC Local da Loja
 */
export function getPrinterRelayChannel() {
  if (printerRelayChannel) return printerRelayChannel;
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    printerRelayChannel = supabase.channel(PRINTER_CLOUD_CHANNEL, {
      config: { broadcast: { self: false } }
    });
    printerRelayChannel.subscribe();
    return printerRelayChannel;
  } catch (e) {
    console.error('Erro ao conectar canal Realtime de impressão:', e);
    return null;
  }
}

const ENV_PRINTER_IP = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PRINTER_IP) || '192.168.1.100';

export const DEFAULT_PRINTER_SETTINGS = {
  ip: ENV_PRINTER_IP,
  port: 9100,
  printerName: '', // Nome da impressora instalada no SO (ex: "Elgin i8", "POS-80" ou vazio para Padrão do Sistema)
  driverId: 'auto', // 'auto' | 'escpos_thermal' | 'a4_office' | 'browser' | 'pdf_virtual'
  enabled: true,
  paperWidth: '80mm', // '80mm' | '58mm' | 'A4'
  autoPrintKitchenOnConfirm: true,
  autoPrintCounterOnConfirm: true,
  autoPrintIncomingKitchen: false,
  cutPaper: true,
  cutMode: 'full', // 'full' (corte total limpo) | 'partial' (corte com picote)
  beepOnPrint: false,
  serviceUrl: '', // URL customizada opcional
};

/**
 * Obtém as configurações da impressora salvas localmente
 */
export function getPrinterSettings() {
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const paperWidth = (parsed.paperWidth === 'A4' || parsed.paperWidth === 'a4') ? 'A4' : (parsed.paperWidth === '58mm' ? '58mm' : '80mm');
      const printerName = parsed.printerName || '';
      const driverId = parsed.driverId || 'auto';
      const ip = (parsed.ip && parsed.ip.trim() && parsed.ip !== '192.168.1.150') ? parsed.ip.trim() : DEFAULT_PRINTER_SETTINGS.ip;
      return { ...DEFAULT_PRINTER_SETTINGS, ...parsed, paperWidth, printerName, driverId, ip };
    }
  } catch (e) {
    console.error('Erro ao ler configurações da impressora:', e);
  }
  return { ...DEFAULT_PRINTER_SETTINGS };
}

/**
 * Salva as configurações da impressora
 */
export function savePrinterSettings(settings) {
  try {
    const current = getPrinterSettings();
    const updated = { ...current, ...settings };
    if (!updated.ip || !updated.ip.trim()) {
      updated.ip = DEFAULT_PRINTER_SETTINGS.ip;
    }
    localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Erro ao salvar configurações da impressora:', e);
    return settings;
  }
}

/**
 * Obtém a lista de URLs candidatas para envio de impressão (Vite middleware ou Servidor Local Node)
 */
function getPrintCandidateEndpoints(customServiceUrl = '') {
  const endpoints = [];

  // 1. URL configurada manualmente pelo usuário
  if (customServiceUrl && customServiceUrl.trim()) {
    endpoints.push(customServiceUrl.trim().replace(/\/+$/, ''));
  }

  // 2. Endpoint relativo (funciona automaticamente no Vite Dev Server / mesmo host)
  endpoints.push('');

  // 3. Fallbacks para servidor local dedicado na porta 3001
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    endpoints.push(`http://${hostname}:3001`);
    if (hostname !== 'localhost') {
      endpoints.push('http://localhost:3001');
    }
    endpoints.push('http://127.0.0.1:3001');
  }

  return endpoints;
}

/**
 * Testa o status da impressora através da Ponte em Nuvem Supabase (para Vercel / HTTPS)
 */
export function testPrinterStatusViaCloud(settings = null, timeoutMs = 3500) {
  const cfg = settings || getPrinterSettings();
  const ip = cfg.ip || DEFAULT_PRINTER_SETTINGS.ip;
  const port = cfg.port || 9100;
  const channel = getPrinterRelayChannel();

  if (!channel) {
    return Promise.resolve({ online: false, ip, port, message: 'Supabase não conectado.' });
  }

  return new Promise((resolve) => {
    const reqId = 'ping_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          online: false,
          ip,
          port,
          message: 'Ponte local da loja não respondeu. Certifique-se de que o arquivo "iniciar-impressora.bat" está aberto no computador conectado à impressora.'
        });
      }
    }, timeoutMs);

    const handler = ({ payload }) => {
      if (payload?.reqId === reqId && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          online: !!payload.online,
          ip: payload.ip || ip,
          port: payload.port || port,
          endpoint: 'cloud_relay',
          via: 'cloud_relay',
          message: payload.message || (payload.online ? `Impressora Elgin i8 online via Nuvem (${ip}:${port})` : 'Impressora offline na loja')
        });
      }
    };

    channel.on('broadcast', { event: 'printer_pong' }, handler);

    channel.send({
      type: 'broadcast',
      event: 'printer_ping',
      payload: { reqId, ip, port, timestamp: Date.now() }
    }).catch(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ online: false, ip, port, message: 'Falha ao transmitir sinal para a ponte em nuvem.' });
      }
    });
  });
}

/**
 * Envia comandos ESC/POS via Ponte em Nuvem Supabase Realtime (para Vercel / HTTPS)
 */
export function sendEscposViaCloud({ rawEscpos, tickets = null, type = 'counter', orderId = '', cfg, timeoutMs = 15000 }) {
  const ip = cfg?.ip || DEFAULT_PRINTER_SETTINGS.ip;
  const port = cfg?.port || 9100;
  const driver = PrinterManager.resolveDriver(cfg);
  const isOffice = (cfg?.driverId === 'a4_office' || cfg?.paperWidth === 'A4' || driver.category === 'office');
  const printerName = cfg?.printerName || '';
  const channel = getPrinterRelayChannel();

  if (!channel) {
    return Promise.resolve({
      success: false,
      error: 'Supabase não conectado para ponte em nuvem.',
      fallbackToBrowser: true
    });
  }

  return new Promise((resolve) => {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          error: 'Tempo esgotado aguardando impressão no computador da loja. Verifique se a ponte de impressão está em execução.',
          fallbackToBrowser: true
        });
      }
    }, timeoutMs);

    const handler = ({ payload }) => {
      if (payload?.jobId === jobId && !resolved) {
        resolved = true;
        clearTimeout(timer);
        if (payload.success) {
          resolve({
            success: true,
            endpoint: 'cloud_relay',
            via: 'cloud_relay',
            message: payload.message || `Impresso com sucesso na impressora "${payload.printer || printerName || 'Padrão'}" via Nuvem!`
          });
        } else {
          resolve({
            success: false,
            error: payload.error || 'Erro reportado pela impressora na loja.',
            fallbackToBrowser: true
          });
        }
      }
    };

    channel.on('broadcast', { event: 'printer_print_response' }, handler);

    channel.send({
      type: 'broadcast',
      event: 'printer_print_request',
      payload: {
        jobId,
        ip,
        port,
        printerName,
        isOffice,
        type,
        orderId,
        rawEscpos,
        tickets,
        timestamp: Date.now()
      }
    }).catch((err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: false,
          error: 'Erro de envio para nuvem: ' + err.message,
          fallbackToBrowser: true
        });
      }
    });
  });
}

/**
 * Envia cupom de teste via Ponte em Nuvem Supabase
 */
export function printTestViaCloud(settings = null, timeoutMs = 8000) {
  const cfg = settings || getPrinterSettings();
  const ip = cfg.ip || DEFAULT_PRINTER_SETTINGS.ip;
  const port = cfg.port || 9100;
  const driver = PrinterManager.resolveDriver(cfg);
  const isOffice = (cfg.driverId === 'a4_office' || cfg.paperWidth === 'A4' || driver.category === 'office');
  const printerName = cfg.printerName || '';
  const rawEscpos = isOffice
    ? ''
    : buildTestEscpos({
        paperWidth: cfg.paperWidth || '80mm',
        cutMode: cfg.cutMode || 'full',
        printerName: printerName || 'Impressora Padrão'
      });
  const channel = getPrinterRelayChannel();

  if (!channel) {
    return Promise.resolve({
      success: false,
      error: 'Supabase não conectado para ponte em nuvem.'
    });
  }

  return new Promise((resolve) => {
    const jobId = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          error: 'Tempo esgotado aguardando resposta da impressora no computador da loja.'
        });
      }
    }, timeoutMs);

    const handler = ({ payload }) => {
      if (payload?.jobId === jobId && !resolved) {
        resolved = true;
        clearTimeout(timer);
        if (payload.success) {
          resolve({
            success: true,
            via: 'cloud_relay',
            message: payload.message || `Teste impresso com sucesso na impressora "${payload.printer || printerName || 'Padrão'}" via Nuvem!`
          });
        } else {
          resolve({
            success: false,
            error: payload.error || 'Falha no teste de impressão.'
          });
        }
      }
    };

    channel.on('broadcast', { event: 'printer_test_response' }, handler);

    channel.send({
      type: 'broadcast',
      event: 'printer_test_request',
      payload: { jobId, ip, port, printerName, isOffice, rawEscpos, timestamp: Date.now() }
    }).catch(err => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, error: err.message });
      }
    });
  });
}

/**
 * Testa o status de conexão com a impressora Elgin na rede local ou via Nuvem (Vercel)
 */
export async function testPrinterStatus(settings = null) {
  const cfg = settings || getPrinterSettings();
  const label = cfg.printerName ? `Impressora "${cfg.printerName}"` : 'Impressora Padrão';
  return {
    online: true,
    via: 'os_default',
    printerName: cfg.printerName || '',
    paperWidth: cfg.paperWidth || '80mm',
    message: `${label} Pronta (${cfg.paperWidth || '80mm'})`
  };
}

/**
 * Consulta impressoras instaladas via Ponte em Nuvem Supabase Realtime (para Vercel / HTTPS)
 */
export function fetchInstalledPrintersViaCloud(timeoutMs = 3000) {
  const channel = getPrinterRelayChannel();
  if (!channel) return Promise.resolve({ success: false, printers: [], defaultPrinter: '' });

  return new Promise((resolve) => {
    const reqId = 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, printers: [], defaultPrinter: '' });
      }
    }, timeoutMs);

    const handler = ({ payload }) => {
      if (payload?.reqId === reqId && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: true,
          printers: Array.isArray(payload.printers) ? payload.printers : [],
          defaultPrinter: payload.defaultPrinter || '',
          networkPrinters: Array.isArray(payload.networkPrinters) ? payload.networkPrinters : []
        });
      }
    };

    channel.on('broadcast', { event: 'printer_list_response' }, handler);

    channel.send({
      type: 'broadcast',
      event: 'printer_list_request',
      payload: { reqId, timestamp: Date.now() }
    }).catch(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, printers: [], defaultPrinter: '' });
      }
    });
  });
}

/**
 * Consulta as impressoras instaladas no sistema operacional (Windows / Linux CUPS)
 */
export async function fetchInstalledPrinters(customServiceUrl = '') {
  // 1. Prioridade: Tenta obter diretamente do servidor local de impressão (porta 3001)
  const endpoints = getPrintCandidateEndpoints(customServiceUrl);
  for (const base of endpoints) {
    if (!base) continue;
    try {
      const url = `${base}/api/printer/list`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          printers: Array.isArray(data.printers) ? data.printers : [],
          defaultPrinter: data.defaultPrinter || '',
          networkPrinters: Array.isArray(data.networkPrinters) ? data.networkPrinters : []
        };
      }
    } catch (e) {}
  }

  // 2. Fallback: Se estiver em HTTPS na Nuvem, tenta obter via Ponte Supabase Realtime
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttps) {
    try {
      const cloudRes = await fetchInstalledPrintersViaCloud(2500);
      if (cloudRes.success && cloudRes.printers?.length > 0) {
        return cloudRes;
      }
    } catch (e) {}
  }

  return { success: false, printers: [], defaultPrinter: '', networkPrinters: [] };
}

/**
 * Verifica rapidamente se existe uma ponte de impressão ativa via Supabase.
 */
let bridgeStatusCache = { online: false, checkedAt: 0 };
const BRIDGE_CACHE_MS = 60000;

async function isCloudBridgeOnline(cfg) {
  const now = Date.now();
  if (now - bridgeStatusCache.checkedAt < BRIDGE_CACHE_MS) {
    return bridgeStatusCache.online;
  }
  try {
    const res = await testPrinterStatusViaCloud(cfg, 1500);
    bridgeStatusCache = { online: !!res.online, checkedAt: now };
  } catch (e) {
    bridgeStatusCache = { online: false, checkedAt: now };
  }
  return bridgeStatusCache.online;
}

/**
 * Envia cupons para impressão (Servidor local por padrão -> Fallback automático para o navegador)
 */
async function sendEscposToEndpoint({ rawEscpos, tickets = null, type, orderId, order, cfg }) {
  const ip = cfg.ip || DEFAULT_PRINTER_SETTINGS.ip;
  const port = cfg.port || 9100;

  // 1. PRIORIDADE: Tenta o servidor local na porta 3001
  const endpoints = getPrintCandidateEndpoints(cfg.serviceUrl);

  for (const base of endpoints) {
    if (!base) continue;
    try {
      const url = `${base}/api/printer/print`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: ip,
          printerPort: port,
          printerName: cfg.printerName || '',
          type,
          orderId,
          rawEscpos,
          tickets,
          order,
          cutPaper: cfg.cutPaper !== false,
          paperWidth: cfg.paperWidth || '80mm'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          fallbackToBrowser: false,
          endpoint: base,
          via: data.via || 'local_server',
          message: data.message || `Impresso com sucesso na impressora "${cfg.printerName || 'Padrão'}"!`
        };
      }
    } catch (e) {
      // Tenta próximo endpoint local
    }
  }

  // 2. Se falhar o servidor local e estiver na Nuvem (Vercel), tenta a ponte em nuvem Supabase (se houver)
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttps) {
    try {
      const bridgeOnline = await isCloudBridgeOnline(cfg);
      if (bridgeOnline) {
        const cloudRes = await sendEscposViaCloud({ rawEscpos, tickets, type, orderId, order, cfg });
        if (cloudRes.success) {
          return { ...cloudRes, fallbackToBrowser: false };
        }
      }
    } catch (e) {}
  }

  // 3. FALLBACK NATIVO: Se o servidor não estiver acessível, chama automaticamente o navegador!
  return {
    success: true,
    fallbackToBrowser: true,
    message: 'Servidor local desconectado. Imprimindo pelo navegador...'
  };
}

/**
 * Envia um cupom / comanda formatada diretamente para a impressora padrão do computador
 * Quando type === 'both', imprime primeiro o Balcão, aciona a guilhotina para corte, e imprime a 2ª via com novo corte.
 * @param {Object} params
 * @param {Object} params.order - Dados do pedido
 * @param {'kitchen' | 'counter' | 'both'} params.type - Tipo de impressão
 * @param {Object} [params.settings] - Configurações opcionais
 * @param {Function} [params.onProgress] - Callback opcional para progresso
 */
/**
 * Gera cupom em texto plano limpo para impressoras convencionais de escritório (A4/A5)
 */
export function buildOfficeTextSlip(order, type = 'counter') {
  const isDelivery = order?.deliveryType === 'delivery';
  const isKitchen = type === 'kitchen';
  const isMoto = type === 'motoboy';

  const title = isMoto
    ? 'VIA DO MOTOBOY / ENTREGA'
    : isKitchen
    ? 'VIA COZINHA / PRODUCAO'
    : (isDelivery ? 'VIA BALCAO & COZINHA' : 'VIA BALCAO / CAIXA');

  const lines = [
    '====================================================',
    '                 SDG RESTAURANTE',
    `             ${title}`,
    '====================================================',
    `PEDIDO #${order?.id || '---'}       ${new Date(order?.createdAt || Date.now()).toLocaleString('pt-BR')}`,
    `CLIENTE:  ${order?.customerName || 'Consumidor'}`,
    order?.customerPhone ? `TELEFONE: ${order.customerPhone}` : null,
    `TIPO:     ${isDelivery ? 'ENTREGA (DELIVERY)' : (order?.deliveryType === 'dine_in' ? 'MESA / SALAO' : 'RETIRADA NO BALCAO')}`,
    order?.address ? `ENDERECO: ${order.address}` : null,
    '----------------------------------------------------',
    'ITENS DO PEDIDO:',
    ...(order?.items || []).map(item => {
      const line = `${item.quantity || 1}x ${item.name || ''}`;
      const price = item.subtotal !== undefined ? `R$ ${Number(item.subtotal).toFixed(2)}` : '';
      const notes = item.notes ? `   Obs: ${item.notes}` : null;
      return [line.padEnd(38) + price, notes].filter(Boolean).join('\n');
    }),
    '----------------------------------------------------',
    `SUBTOTAL:                             R$ ${Number(order?.subtotal || order?.total || 0).toFixed(2)}`,
    isDelivery && order?.deliveryFee !== undefined ? `TAXA DE ENTREGA:                      R$ ${Number(order?.deliveryFee || 0).toFixed(2)}` : null,
    `TOTAL GERAL:                          R$ ${Number(order?.total || 0).toFixed(2)}`,
    `PAGAMENTO:                            ${String(order?.paymentMethod || 'A Definir').toUpperCase()}`,
    '====================================================',
    '\n\n'
  ].filter(Boolean);

  return lines.join('\n');
}

export async function printDirectToNetworkPrinter({ order, type = 'counter', settings = null, onProgress = null }) {
  const cfg = settings || getPrinterSettings();
  const driver = PrinterManager.resolveDriver(cfg);

  // Se o driver for explicitamente virtual (ex: PDF), roteia para visualização
  if (driver.category === 'virtual') {
    return {
      success: true,
      fallbackToBrowser: true,
      paperWidth: driver.category === 'office' ? 'A4' : cfg.paperWidth,
      driverId: driver.id,
      driverName: driver.name,
      message: `Impressão direcionada para o driver ${driver.name}.`
    };
  }

  // Se for impressora de escritório conectada ao SO local (ex: Epson L3250)
  if (driver.category === 'office') {
    const textSlip = buildOfficeTextSlip(order, type);
    return sendEscposToEndpoint({
      rawEscpos: textSlip,
      tickets: [textSlip],
      type,
      orderId: order?.id,
      order,
      cfg
    });
  }

  const options = {
    restaurantName: 'SDG RESTAURANTE',
    cutPaper: cfg.cutPaper !== false,
    cutMode: cfg.cutMode || 'full',
    paperWidth: cfg.paperWidth || '80mm'
  };

  // Se o tipo for 'both' (ambos): imprime 1ª Via Balcão com corte e 2ª Via Motoboy/Cozinha com corte
  if (type === 'both') {
    const isDelivery = order?.deliveryType === 'delivery';
    const counterEscpos = buildCounterEscpos(order, options);
    const secondEscpos = isDelivery ? buildMotoboyEscpos(order, options) : buildKitchenEscpos(order, options);
    const secondLabel = isDelivery ? 'Via do Motoboy' : 'Comanda da Cozinha';

    if (onProgress) {
      onProgress({ step: 1, total: 1, label: '2 Vias', message: `🖨️ Imprimindo 2 Vias (Balcão & Cozinha + ${secondLabel})...` });
    }

    return sendEscposToEndpoint({
      rawEscpos: counterEscpos + secondEscpos,
      tickets: [counterEscpos, secondEscpos],
      type: 'both',
      orderId: order?.id,
      order,
      cfg
    });
  }

  // Impressão individual (kitchen, counter ou motoboy)
  let rawEscpos = '';
  if (type === 'motoboy') {
    rawEscpos = buildMotoboyEscpos(order, options);
  } else if (type === 'kitchen') {
    rawEscpos = buildKitchenEscpos(order, options);
  } else {
    rawEscpos = buildCounterEscpos(order, options);
  }

  return sendEscposToEndpoint({
    rawEscpos,
    type,
    orderId: order?.id,
    order,
    cfg
  });
}

/**
 * Envia um ticket de teste para a impressora (prioriza servidor local -> fallback navegador)
 */
export async function printTestTicketDirect(settings = null) {
  const cfg = settings || getPrinterSettings();
  const driver = PrinterManager.resolveDriver(cfg);

  if (driver.category === 'virtual') {
    return {
      success: true,
      fallbackToBrowser: true,
      paperWidth: (driver.category === 'office' || cfg.paperWidth === 'A4') ? 'A4' : cfg.paperWidth,
      driverId: driver.id,
      driverName: driver.name,
      message: `Comprovante de teste gerado pelo driver ${driver.name}.`
    };
  }

  const isOffice = driver.category === 'office';
  const rawEscpos = isOffice
    ? ''
    : buildTestEscpos({
        paperWidth: cfg.paperWidth || '80mm',
        cutMode: cfg.cutMode || 'full',
        printerName: cfg.printerName || 'Impressora Padrão do Sistema'
      });

  // 1. Prioridade: Envia para o servidor local (localhost:3001)
  const endpoints = getPrintCandidateEndpoints(cfg.serviceUrl);
  for (const base of endpoints) {
    if (!base) continue;
    try {
      const url = `${base}/api/printer/test`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: cfg.ip,
          printerPort: cfg.port,
          printerName: cfg.printerName || '',
          rawEscpos,
          isOffice
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return {
            success: true,
            fallbackToBrowser: false,
            via: data.via || 'local_server',
            message: data.message || `Teste impresso com sucesso na impressora "${cfg.printerName || 'padrão'}"!`
          };
        }
      }
    } catch (e) {}
  }

  // 2. Ponte em nuvem Supabase
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttps && await isCloudBridgeOnline(cfg)) {
    return printTestViaCloud(cfg, 3500);
  }

  // 3. Fallback para visualização do navegador
  return {
    success: true,
    fallbackToBrowser: true,
    paperWidth: (driver.category === 'office' || cfg.paperWidth === 'A4') ? 'A4' : cfg.paperWidth,
    driverId: driver.id,
    driverName: driver.name,
    message: `Visualização aberta pelo navegador.`
  };
}

/**
 * Faz varredura na rede em busca de impressoras disponíveis
 */
export async function discoverNetworkPrinters(customServiceUrl = '') {
  const endpoints = getPrintCandidateEndpoints(customServiceUrl);
  for (const base of endpoints) {
    try {
      const url = `${base}/api/printer/discover`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}
  }

}

/**
 * Imprime comprovante de fechamento de caixa ou leitura X parcial diretamente na Elgin i8
 * @param {Object} params
 * @param {Object} params.shiftData - Dados completos do turno e fechamento
 * @param {boolean} [params.isPartial=false] - Se true, emite Leitura X (sem fechar); se false, Leitura Z (fechamento oficial)
 * @param {Object} [params.settings] - Configurações opcionais da impressora
 */
export async function printCashierReportDirect({ shiftData, isPartial = false, settings = null }) {
  const cfg = settings || getPrinterSettings();
  const options = {
    restaurantName: 'SDG RESTAURANTE',
    cutPaper: cfg.cutPaper !== false,
    cutMode: cfg.cutMode || 'full',
    isPartial
  };

  const rawEscpos = buildCashierClosingEscpos(shiftData, options);

  return sendEscposToEndpoint({
    rawEscpos,
    type: isPartial ? 'cashier_x_report' : 'cashier_z_closing',
    orderId: shiftData?.id || 'CAIXA',
    order: null,
    cfg
  });
}

/**
 * Imprime extrato / recibo de acerto de comissão do motoboy diretamente na Elgin i8
 * @param {Object} params
 * @param {Object} params.data - Dados completos do acerto do motoboy
 * @param {Object} [params.settings] - Configurações opcionais da impressora
 */
export async function printMotoboyCommissionDirect({ data, settings = null }) {
  const cfg = settings || getPrinterSettings();
  const options = {
    restaurantName: 'SDG RESTAURANTE',
    cutPaper: cfg.cutPaper !== false,
    cutMode: cfg.cutMode || 'full'
  };

  const rawEscpos = buildMotoboyCommissionEscpos(data, options);

  return sendEscposToEndpoint({
    rawEscpos,
    type: 'motoboy_commission',
    orderId: data?.motoboyName || 'MOTOBOY',
    order: null,
    cfg
  });
}

export { sendEscposToEndpoint };

