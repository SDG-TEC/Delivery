import { BasePrinterDriver } from './BasePrinterDriver';

/**
 * ==============================================================================
 * 🖨️ Driver para Impressoras Convencionais de Escritório (A4 / A5 / Jato de Tinta / Laser)
 * Modelos suportados:
 *  - Epson EcoTank (L3250, L3150, L4260, L6270, L8050)
 *  - HP DeskJet, LaserJet, Smart Tank, Ink Advantage, OfficeJet
 *  - Canon MegaTank (G3110, G3160), PIXMA, MAXIFY
 *  - Brother DCP, MFC, HL Series
 * ==============================================================================
 */
export class StandardOfficeDriver extends BasePrinterDriver {
  constructor() {
    super({
      id: 'a4_office',
      name: 'Jato de Tinta / Laser (Folha A4 / A5)',
      category: 'office',
      description: 'Ideal para impressoras convencionais de escritório em folha A4 (Epson EcoTank L3250, HP, Canon, Brother)',
      supportedPaperSizes: ['A4', 'A5'],
      supportedTransports: ['browser', 'os_spooler']
    });
  }

  /**
   * Avalia compatibilidade com modelos de escritório
   */
  matchDevice(deviceName = '', settings = {}) {
    const term = (deviceName || '').toLowerCase();
    if (!term) return 30;

    const officeKeywords = [
      'l3250', 'l3150', 'l4160', 'l4260', 'l6270', 'ecotank', 'epson l',
      'deskjet', 'laserjet', 'smart tank', 'ink tank', 'officejet', 'photosmart',
      'brother', 'dcp-', 'mfc-', 'hl-', 'canon', 'g3110', 'g3160', 'megatank', 'pixma',
      'a4', 'laser', 'inkjet', 'color'
    ];

    for (const kw of officeKeywords) {
      if (term.includes(kw)) return 95;
    }

    // Se tiver 'elgin', 'bematech', 'mp-4200' etc, penaliza
    const thermalKeywords = ['elgin', 'bematech', 'mp-4200', 'tm-t', 'pos-80', 'pos-58'];
    for (const kw of thermalKeywords) {
      if (term.includes(kw)) return 5;
    }

    return 35;
  }

  buildOrderPayload(order, options = {}) {
    // Retorna objeto estruturado com layout e dados para renderização em A4
    return {
      order,
      type: options.type || 'counter',
      paperWidth: 'A4',
      layout: 'a4_office_slip',
      title: 'Comanda / Cupom do Restaurante'
    };
  }

  buildTestPayload(options = {}) {
    return {
      order: {
        id: 'TESTE-A4',
        customerName: 'Cliente Teste (Epson L3250 / A4)',
        customerPhone: '(33) 99999-8888',
        deliveryType: 'delivery',
        address: 'Rua do Teste de Impressão, 123 - Centro',
        paymentMethod: 'pix',
        status: 'pagamento_confirmado',
        createdAt: new Date().toISOString(),
        items: [
          { name: '1x X-Burger Artesanal Bacon', subtotal: 32.00, notes: 'Sem cebola, ponto da carne ao ponto' },
          { name: '1x Batata Rústica Especial', subtotal: 18.00, notes: 'Com molho da casa' },
          { name: '1x Coca-Cola Lata 350ml', subtotal: 6.00 }
        ],
        subtotal: 56.00,
        deliveryFee: 0,
        total: 56.00
      },
      type: 'counter',
      paperWidth: 'A4',
      isTest: true
    };
  }

  buildCashierReportPayload(shiftData, options = {}) {
    return {
      shiftData,
      isPartial: !!options.isPartial,
      paperWidth: 'A4',
      layout: 'a4_cashier_report'
    };
  }

  async print(job, context = {}) {
    const { payload, type, order } = job;
    const { onBrowserFallback = null, openA4Preview = null } = context;

    // Para impressoras convencionais A4, o canal padrão de impressão de alta fidelidade
    // é através do motor de renderização visual (diálogo de impressão nativo)
    const effectiveOrder = order || payload?.order;
    const effectiveType = type || payload?.type || 'both';

    if (typeof onBrowserFallback === 'function') {
      return onBrowserFallback({
        order: effectiveOrder,
        type: effectiveType,
        paperWidth: 'A4',
        driver: this.id
      });
    }

    return {
      success: true,
      via: 'browser_a4',
      message: 'Comanda formatada para folha A4 enviada para o diálogo de impressão.'
    };
  }
}
