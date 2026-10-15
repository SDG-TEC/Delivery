/**
 * ==============================================================================
 * 🖨️ Interface Base para Drivers de Impressão (Printer Driver Interface)
 * Permite suporte plugável e extensível para múltiplos tipos de impressoras:
 *  - Térmicas ESC/POS (Elgin, Bematech, Epson TM, POS-80/58)
 *  - Convencionais de Escritório A4/A5 (Epson EcoTank L3250, HP, Brother, Canon)
 *  - Diálogo Nativo do Navegador (HTML5 @media print)
 *  - Impressoras Virtuais / PDF Digital (WhatsApp e Arquivamento)
 * ==============================================================================
 */

export class BasePrinterDriver {
  /**
   * @param {Object} metadata
   * @param {string} metadata.id - Identificador único do driver
   * @param {string} metadata.name - Nome amigável de exibição
   * @param {string} metadata.category - 'thermal' | 'office' | 'browser' | 'virtual'
   * @param {string} metadata.description - Descrição do tipo de impressora
   * @param {string[]} metadata.supportedPaperSizes - ['80mm', '58mm', 'A4', 'A5']
   * @param {string[]} metadata.supportedTransports - ['tcp', 'os_spooler', 'browser', 'cloud', 'virtual']
   */
  constructor({ id, name, category, description, supportedPaperSizes = ['80mm'], supportedTransports = ['browser'] }) {
    if (!id || !name) {
      throw new Error('Todo driver de impressora deve possuir um id e um name.');
    }
    this.id = id;
    this.name = name;
    this.category = category || 'thermal';
    this.description = description || '';
    this.supportedPaperSizes = supportedPaperSizes;
    this.supportedTransports = supportedTransports;
  }

  /**
   * Avalia a correspondência do driver com base no nome do dispositivo, modelo ou IP
   * @param {string} deviceName - Nome do dispositivo ou modelo (ex: "Epson L3250", "Elgin i8")
   * @param {Object} [settings] - Configurações atuais da impressora
   * @returns {number} Nível de afinidade de 0 a 100 (0 = incompatível, 100 = compatibilidade ideal)
   */
  matchDevice(deviceName = '', settings = {}) {
    return 0;
  }

  /**
   * Constrói a carga útil (payload) do cupom/comanda do pedido
   * @param {Object} order - Dados do pedido
   * @param {Object} options - Opções de impressão (tipo: 'counter' | 'kitchen' | 'motoboy' | 'both', papel, etc.)
   * @returns {any} Payload formatado (string ESC/POS, HTML, objeto de visualização)
   */
  buildOrderPayload(order, options = {}) {
    throw new Error(`buildOrderPayload não implementado no driver "${this.name}".`);
  }

  /**
   * Constrói o comprovante de teste de comunicação
   * @param {Object} options - Opções (largura do papel, destino, modelo)
   * @returns {any} Payload de teste formatado
   */
  buildTestPayload(options = {}) {
    throw new Error(`buildTestPayload não implementado no driver "${this.name}".`);
  }

  /**
   * Constrói o comprovante de fechamento de turno / caixa
   * @param {Object} shiftData - Dados do turno
   * @param {Object} options - Opções de fechamento (isPartial, restaurantName)
   * @returns {any} Payload de fechamento formatado
   */
  buildCashierReportPayload(shiftData, options = {}) {
    throw new Error(`buildCashierReportPayload não implementado no driver "${this.name}".`);
  }

  /**
   * Executa a impressão
   * @param {Object} job - Detalhes do trabalho
   * @param {any} job.payload - Carga de impressão
   * @param {string} job.type - 'order' | 'test' | 'cashier'
   * @param {Object} [job.order] - Dados originais do pedido (caso necessário para rendering)
   * @param {Object} context - Configurações e callbacks de transporte (settings, onBrowserPrint, etc.)
   * @returns {Promise<{success: boolean, via: string, message?: string, error?: string}>}
   */
  async print(job, context = {}) {
    throw new Error(`Método print não implementado no driver "${this.name}".`);
  }
}
