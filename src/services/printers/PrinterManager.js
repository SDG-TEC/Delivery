import { EscposThermalDriver } from './EscposThermalDriver';
import { StandardOfficeDriver } from './StandardOfficeDriver';
import { BrowserDriver } from './BrowserDriver';
import { PdfVirtualDriver } from './PdfVirtualDriver';

/**
 * ==============================================================================
 * 🏛️ PrinterManager - Gerenciador Central e Registro de Drivers de Impressão
 * Implementa o padrão Strategy / Registry para permitir adicionar suporte
 * a qualquer tipo de impressora (Térmicas, Jato de Tinta, Laser, Virtuais, etc.).
 * ==============================================================================
 */
class PrinterManagerClass {
  constructor() {
    this.drivers = new Map();

    // Registra os drivers padrão do sistema
    this.registerDriver(new EscposThermalDriver());
    this.registerDriver(new StandardOfficeDriver());
    this.registerDriver(new BrowserDriver());
    this.registerDriver(new PdfVirtualDriver());
  }

  /**
   * Registra um novo driver de impressora (extensibilidade aberta)
   * @param {import('./BasePrinterDriver').BasePrinterDriver} driverInstance
   */
  registerDriver(driverInstance) {
    if (!driverInstance || !driverInstance.id) {
      throw new Error('Instância de driver inválida para registro.');
    }
    this.drivers.set(driverInstance.id, driverInstance);
  }

  /**
   * Retorna a lista de todos os drivers registrados
   * @returns {import('./BasePrinterDriver').BasePrinterDriver[]}
   */
  getDrivers() {
    return Array.from(this.drivers.values());
  }

  /**
   * Obtém um driver específico pelo ID
   * @param {string} driverId
   * @returns {import('./BasePrinterDriver').BasePrinterDriver | null}
   */
  getDriver(driverId) {
    return this.drivers.get(driverId) || null;
  }

  /**
   * Detecta automaticamente o melhor driver para um dispositivo ou impressora
   * @param {string} deviceName - Nome ou identificação da impressora (ex: "Epson L3250", "Elgin i8")
   * @param {Object} [settings] - Configurações atuais
   * @returns {import('./BasePrinterDriver').BasePrinterDriver}
   */
  detectBestDriver(deviceName = '', settings = {}) {
    let bestDriver = this.getDriver('escpos_thermal');
    let highestScore = -1;

    for (const driver of this.drivers.values()) {
      const score = driver.matchDevice(deviceName, settings);
      if (score > highestScore) {
        highestScore = score;
        bestDriver = driver;
      }
    }

    return bestDriver;
  }

  /**
   * Resolve qual driver deve ser utilizado com base nas configurações
   * @param {Object} settings - Configurações da impressora
   * @returns {import('./BasePrinterDriver').BasePrinterDriver}
   */
  resolveDriver(settings = {}) {
    const driverId = settings.driverId || 'auto';

    if (driverId && driverId !== 'auto') {
      const explicitDriver = this.getDriver(driverId);
      if (explicitDriver) return explicitDriver;
    }

    // Se estiver em modo browser explícito no form legado
    if (settings.mode === 'browser') {
      return this.getDriver('browser');
    }

    // Detecção automática inteligente baseada no nome do dispositivo / IP
    const printerName = settings.printerName || '';
    return this.detectBestDriver(printerName, settings);
  }

  /**
   * Dispara a impressão de um pedido utilizando o driver adequado
   */
  async printOrder(order, options = {}, context = {}) {
    const settings = context.settings || {};
    const driver = this.resolveDriver(settings);

    // Ajusta papel no options se o driver sugerir (ex: A4 para office)
    const effectiveOptions = {
      ...options,
      paperWidth: settings.paperWidth || (driver.category === 'office' ? 'A4' : '80mm')
    };

    const payload = driver.buildOrderPayload(order, effectiveOptions);

    return driver.print({
      payload,
      type: options.type || 'counter',
      order
    }, {
      ...context,
      driver
    });
  }

  /**
   * Dispara a impressão de teste utilizando o driver adequado
   */
  async printTest(options = {}, context = {}) {
    const settings = context.settings || {};
    const driver = this.resolveDriver(settings);

    const effectiveOptions = {
      ...options,
      paperWidth: settings.paperWidth || (driver.category === 'office' ? 'A4' : '80mm'),
      printerName: settings.printerName || driver.name
    };

    const payload = driver.buildTestPayload(effectiveOptions);

    return driver.print({
      payload,
      type: 'test',
      order: payload?.order
    }, {
      ...context,
      driver
    });
  }

  /**
   * Dispara o relatório de fechamento de caixa
   */
  async printCashierReport(shiftData, options = {}, context = {}) {
    const settings = context.settings || {};
    const driver = this.resolveDriver(settings);

    const payload = driver.buildCashierReportPayload(shiftData, options);

    return driver.print({
      payload,
      type: 'cashier',
      shiftData
    }, {
      ...context,
      driver
    });
  }
}

export const PrinterManager = new PrinterManagerClass();
