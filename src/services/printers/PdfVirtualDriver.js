import { BasePrinterDriver } from './BasePrinterDriver';

/**
 * ==============================================================================
 * 📄 Driver Virtual / Cupom Digital & PDF
 * Não gasta papel físico. Permite visualização imediata na tela,
 * cópia do comprovante formatado para o WhatsApp do cliente ou download.
 * ==============================================================================
 */
export class PdfVirtualDriver extends BasePrinterDriver {
  constructor() {
    super({
      id: 'pdf_virtual',
      name: 'Comprovante Digital / PDF',
      category: 'virtual',
      description: 'Gera comprovante digital na tela para visualização, cópia rápida para o WhatsApp ou download em PDF.',
      supportedPaperSizes: ['80mm', 'A4'],
      supportedTransports: ['virtual']
    });
  }

  matchDevice(deviceName = '', settings = {}) {
    const term = (deviceName || '').toLowerCase();
    if (term.includes('pdf') || term.includes('virtual') || term.includes('digital') || term.includes('tela')) {
      return 95;
    }
    return 20;
  }

  buildOrderPayload(order, options = {}) {
    return {
      order,
      type: options.type || 'counter',
      paperWidth: options.paperWidth || '80mm',
      isVirtual: true
    };
  }

  buildTestPayload(options = {}) {
    return {
      order: {
        id: 'TESTE-DIGITAL',
        customerName: 'Cliente Teste (Cupom Digital)',
        customerPhone: '(33) 99999-8888',
        deliveryType: 'delivery',
        address: 'Rua Digital, 77 - Bairro Web',
        paymentMethod: 'pix',
        status: 'pagamento_confirmado',
        createdAt: new Date().toISOString(),
        items: [
          { name: '1x Combo Artesanal Premium', subtotal: 38.00 }
        ],
        subtotal: 38.00,
        deliveryFee: 5.00,
        total: 43.00
      },
      type: 'counter',
      paperWidth: '80mm',
      isTest: true,
      isVirtual: true
    };
  }

  buildCashierReportPayload(shiftData, options = {}) {
    return {
      shiftData,
      isPartial: !!options.isPartial,
      paperWidth: '80mm',
      isVirtual: true
    };
  }

  async print(job, context = {}) {
    const { payload, type, order } = job;
    const { onOpenVirtualModal = null, onBrowserFallback = null } = context;

    const effectiveOrder = order || payload?.order;
    const effectiveType = type || payload?.type || 'counter';

    if (typeof onOpenVirtualModal === 'function') {
      return onOpenVirtualModal({ order: effectiveOrder, type: effectiveType });
    }

    if (typeof onBrowserFallback === 'function') {
      return onBrowserFallback({
        order: effectiveOrder,
        type: effectiveType,
        showModal: true,
        autoClose: false
      });
    }

    return {
      success: true,
      via: 'virtual_preview',
      message: 'Comprovante digital gerado com sucesso.'
    };
  }
}
