import { BasePrinterDriver } from './BasePrinterDriver';
import {
  buildKitchenEscpos,
  buildCounterEscpos,
  buildMotoboyEscpos,
  buildBothEscposList,
  buildTestEscpos,
  buildCashierClosingEscpos
} from '../../utils/escposGenerator';

/**
 * ==============================================================================
 * 🧾 Driver de Impressora Térmica Não Fiscal (ESC/POS)
 * Modelos suportados:
 *  - Elgin i7, i8, i9, Flash MT
 *  - Bematech MP-4200 TH, MP-2800, MP-100
 *  - Epson TM-T20, TM-T88, TM-m30
 *  - Daruma DR-800, DR-700
 *  - Mini impressoras térmicas genéricas POS-80 e POS-58 (USB / Ethernet 9100)
 * ==============================================================================
 */
export class EscposThermalDriver extends BasePrinterDriver {
  constructor() {
    super({
      id: 'escpos_thermal',
      name: 'Térmica de Bobina (ESC/POS)',
      category: 'thermal',
      description: 'Alta velocidade e corte automático em bobina contínua de 80mm ou 58mm (Elgin, Bematech, Epson TM, POS-80/58)',
      supportedPaperSizes: ['80mm', '58mm'],
      supportedTransports: ['tcp', 'os_spooler', 'cloud', 'browser']
    });
  }

  /**
   * Avalia compatibilidade com dispositivos térmicos
   */
  matchDevice(deviceName = '', settings = {}) {
    const term = (deviceName || '').toLowerCase();
    if (!term) return 40; // Opção padrão caso não especificado

    // Se for expressamente identificada como Elgin, Bematech, TM-T20, POS-80, etc.
    const thermalKeywords = [
      'elgin', 'i7', 'i8', 'i9', 'bematech', 'mp-4200', 'mp-2800', 'tm-t',
      'tm-t20', 'tm-t88', 'pos-80', 'pos-58', 'thermal', 'termica', 'daruma',
      'diebold', 'sweda', 'generic / text'
    ];

    for (const kw of thermalKeywords) {
      if (term.includes(kw)) return 95;
    }

    // Se for identificado como modelo de escritório A4 conhecido (ex: EcoTank, DeskJet), NÃO é térmica
    const officeKeywords = ['l3250', 'l3150', 'ecotank', 'deskjet', 'laserjet', 'officejet', 'pixma'];
    for (const kw of officeKeywords) {
      if (term.includes(kw)) return 5;
    }

    return 50;
  }

  buildOrderPayload(order, options = {}) {
    const { type = 'counter', cutPaper = true, cutMode = 'full', paperWidth = '80mm' } = options;
    const isDelivery = order.deliveryType === 'delivery';

    if (type === 'both') {
      return buildBothEscposList(order, { cutPaper, cutMode, paperWidth });
    }

    let raw = '';
    if (type === 'motoboy') {
      raw = buildMotoboyEscpos(order, { cutPaper, cutMode, paperWidth });
    } else if (type === 'kitchen') {
      raw = buildKitchenEscpos(order, { cutPaper, cutMode, paperWidth });
    } else {
      raw = buildCounterEscpos(order, { cutPaper, cutMode, paperWidth });
    }
    return raw;
  }

  buildTestPayload(options = {}) {
    return buildTestEscpos({
      paperWidth: options.paperWidth || '80mm',
      cutMode: options.cutMode || 'full',
      printerName: options.printerName || 'Impressora Térmica ESC/POS'
    });
  }

  buildCashierReportPayload(shiftData, options = {}) {
    return buildCashierClosingEscpos(shiftData, options);
  }

  async print(job, context = {}) {
    const { payload, type, order } = job;
    const { settings = {}, sendViaHttp = null, sendViaCloud = null, onBrowserFallback = null } = context;

    // Se o usuário configurou para usar diálogo do navegador mesmo com driver térmico
    if (settings.mode === 'browser' && onBrowserFallback) {
      return onBrowserFallback({ order, type });
    }

    // 1. Tenta envio direto para endpoint local (Vite/Node na porta 9100 ou spooler)
    if (typeof sendViaHttp === 'function') {
      try {
        const res = await sendViaHttp({
          payload,
          type,
          order,
          settings,
          printerName: settings.printerName || '',
          ip: settings.ip,
          port: settings.port || 9100
        });
        if (res && res.success) return res;
      } catch (err) {
        console.warn('[EscposThermalDriver] Envio local falhou:', err.message);
      }
    }

    // 2. Se estiver em nuvem (HTTPS) e tiver relay configurado
    if (typeof sendViaCloud === 'function') {
      try {
        const cloudRes = await sendViaCloud({ payload, type, order, settings });
        if (cloudRes && cloudRes.success) return cloudRes;
      } catch (cloudErr) {
        console.warn('[EscposThermalDriver] Envio em nuvem falhou:', cloudErr.message);
      }
    }

    // 3. Fallback: abre no navegador
    if (onBrowserFallback) {
      return onBrowserFallback({ order, type, fallbackReason: 'Dispositivo térmico não respondeu no IP/Porta.' });
    }

    return {
      success: false,
      error: 'Não foi possível comunicar com a impressora térmica nem abrir o diálogo do navegador.'
    };
  }
}
