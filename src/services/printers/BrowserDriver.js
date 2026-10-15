import { BasePrinterDriver } from './BasePrinterDriver';

/**
 * ==============================================================================
 * 🌐 Driver Universal via Diálogo do Navegador (HTML5 / @media print)
 * Funciona em qualquer impressora conectada ao computador ou celular,
 * utilizando o diálogo nativo do Chrome, Firefox, Edge ou Safari.
 * ==============================================================================
 */
export class BrowserDriver extends BasePrinterDriver {
  constructor() {
    super({
      id: 'browser',
      name: 'Diálogo do Navegador (Universal)',
      category: 'browser',
      description: 'Abre a janela de impressão nativa do sistema/navegador. Funciona com qualquer impressora instalada.',
      supportedPaperSizes: ['80mm', '58mm', 'A4', 'A5'],
      supportedTransports: ['browser']
    });
  }

  matchDevice(deviceName = '', settings = {}) {
    if (settings.mode === 'browser') return 100;
    return 30; // Sempre disponível como fallback
  }

  buildOrderPayload(order, options = {}) {
    return {
      order,
      type: options.type || 'counter',
      paperWidth: options.paperWidth || '80mm'
    };
  }

  buildTestPayload(options = {}) {
    return {
      order: {
        id: 'TESTE-NAVEGADOR',
        customerName: 'Cliente Teste (Diálogo Navegador)',
        customerPhone: '(33) 99999-8888',
        deliveryType: 'delivery',
        address: 'Rua Principal, 100 - Centro',
        paymentMethod: 'pix',
        status: 'pagamento_confirmado',
        createdAt: new Date().toISOString(),
        items: [
          { name: '1x X-Burger Especial', subtotal: 30.00 },
          { name: '1x Batata Frita Grande', subtotal: 16.00 }
        ],
        subtotal: 46.00,
        deliveryFee: 5.00,
        total: 51.00
      },
      type: 'both',
      paperWidth: options.paperWidth || '80mm',
      isTest: true
    };
  }

  buildCashierReportPayload(shiftData, options = {}) {
    return {
      shiftData,
      isPartial: !!options.isPartial,
      paperWidth: options.paperWidth || '80mm'
    };
  }

  async print(job, context = {}) {
    const { payload, type, order } = job;
    const { onBrowserFallback = null, settings = {} } = context;

    const effectiveOrder = order || payload?.order;
    const effectiveType = type || payload?.type || 'counter';
    const effectivePaper = settings.paperWidth || payload?.paperWidth || '80mm';

    if (typeof onBrowserFallback === 'function') {
      return onBrowserFallback({
        order: effectiveOrder,
        type: effectiveType,
        paperWidth: effectivePaper,
        driver: this.id
      });
    }

    return {
      success: true,
      via: 'browser_dialog',
      message: 'Diálogo de impressão aberto no navegador.'
    };
  }
}
