import React, { useState, useEffect } from 'react';
import { useOrder } from '../../context/OrderContext';
import {
  Printer, RefreshCw, ChefHat, Store, Settings, Check, ChevronDown, ChevronUp, Scissors, Globe
} from 'lucide-react';
import { fetchInstalledPrinters, PrinterManager } from '../../services/printerService';

export const PrinterSettingsAdmin = () => {
  const {
    printerSettings,
    updatePrinterConfig,
    checkPrinterConnection,
    printTestTicket
  } = useOrder();

  const [formData, setFormData] = useState({
    enabled: printerSettings?.enabled !== false,
    mode: printerSettings?.mode || 'os_default',
    printerName: printerSettings?.printerName || '',
    driverId: printerSettings?.driverId || 'auto',
    paperWidth: printerSettings?.paperWidth || '80mm',
    autoPrintKitchenOnConfirm: printerSettings?.autoPrintKitchenOnConfirm !== false,
    autoPrintCounterOnConfirm: printerSettings?.autoPrintCounterOnConfirm !== false,
    cutPaper: printerSettings?.cutPaper !== false,
    cutMode: printerSettings?.cutMode || 'full',
    ip: printerSettings?.ip || '192.168.1.100',
    port: printerSettings?.port || 9100,
    serviceUrl: printerSettings?.serviceUrl || ''
  });

  const [installedPrinters, setInstalledPrinters] = useState([]);
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);

  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      const res = await fetchInstalledPrinters(formData.serviceUrl);
      if (res && res.success && Array.isArray(res.printers)) {
        setInstalledPrinters(res.printers);
        if (res.defaultPrinter) setDefaultPrinter(res.defaultPrinter);
        if (res.networkPrinters?.length > 0) {
          const firstNet = res.networkPrinters[0];
          setFormData(prev => ({
            ...prev,
            ip: (prev.ip === '192.168.1.20' || !prev.ip) ? firstNet.ip : prev.ip,
            printerName: prev.printerName || (res.defaultPrinter || '')
          }));
        }
      }
    } catch (e) {
      console.warn('Erro ao listar impressoras:', e);
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const availableDrivers = PrinterManager.getDrivers();
  const detectedDriver = PrinterManager.detectBestDriver(formData.printerName, formData);
  const activeDriver = PrinterManager.resolveDriver(formData);

  const handleChange = (field, val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'printerName') {
        const auto = PrinterManager.detectBestDriver(val, next);
        if (next.driverId === 'auto') {
          next.paperWidth = auto.category === 'office' ? 'A4' : '80mm';
        }
      } else if (field === 'driverId') {
        if (val === 'a4_office') next.paperWidth = 'A4';
        else if (val === 'escpos_thermal' && next.paperWidth === 'A4') next.paperWidth = '80mm';
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    updatePrinterConfig(formData);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 300);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    await printTestTicket();
    setIsTesting(false);
  };

  const activePrinterLabel = formData.printerName || defaultPrinter || 'Padrão do Sistema';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      
      {/* Cabeçalho Limpo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Impressoras</h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-white font-bold truncate max-w-[200px]" title={activePrinterLabel}>
                {activePrinterLabel}
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{activeDriver.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { checkPrinterConnection(); loadPrinters(); }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center space-x-1.5"
            title="Recarregar impressoras"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleTestPrint}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Imprimindo...' : 'Imprimir Teste'}</span>
          </button>
        </div>
      </div>

      {/* Grid Direto com 2 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Coluna 1: Dispositivo & Papel */}
        <div className="space-y-4">
          
          {/* Seletor do Modo de Impressão */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Modo de Impressão:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('mode', 'browser')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex flex-col space-y-1 ${
                  formData.mode === 'browser'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="font-extrabold">Diálogo do Navegador</span>
                </div>
                <span className={`text-[10px] font-normal leading-snug ${formData.mode === 'browser' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                  Recomendado na Web/Nuvem. O Chrome lista 100% das suas impressoras nativas com exatidão.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleChange('mode', 'os_default')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex flex-col space-y-1 ${
                  formData.mode === 'os_default'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Printer className="w-4 h-4 shrink-0" />
                  <span className="font-extrabold">Impressão Direta</span>
                </div>
                <span className={`text-[10px] font-normal leading-snug ${formData.mode === 'os_default' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                  Envia direto para a fila do Linux (CUPS) ou da loja sem abrir janelas.
                </span>
              </button>
            </div>
          </div>

          {/* Seletor de Impressora (apenas no modo direto) */}
          {formData.mode === 'os_default' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Impressora de Destino:
                </label>
                {installedPrinters.length === 0 && (
                  <span className="text-[10px] text-amber-400">
                    Padrão do Sistema Ativa
                  </span>
                )}
              </div>
              <select
                value={formData.printerName}
                onChange={(e) => handleChange('printerName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="">
                  🌟 Padrão do Sistema {defaultPrinter ? `(${defaultPrinter})` : ''}
                </option>
                {installedPrinters.map(p => (
                  <option key={p} value={p}>
                    🖨️ {p} {p === defaultPrinter ? '★ (Padrão)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.mode === 'browser' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex items-start space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Ao clicar em <strong>Imprimir</strong> no Balcão ou Cozinha, o diálogo do seu navegador abrirá exibindo <strong>todas as impressoras instaladas</strong> no seu computador (Epson L3250, PDF, etc.) em <strong>1 página única</strong> sem cortes.
              </p>
            </div>
          )}

          {/* Tipo / Driver */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Tipo / Driver:</span>
              <span className="text-[10px] text-amber-400 font-normal">
                Detectado: {detectedDriver.name}
              </span>
            </label>
            <select
              value={formData.driverId}
              onChange={(e) => handleChange('driverId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="auto">
                ⚡ Automático ({detectedDriver.name})
              </option>
              {availableDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formato do Papel */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Formato do Papel:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '80mm', label: 'Bobina 80mm' },
                { id: '58mm', label: 'Bobina 58mm' },
                { id: 'A4', label: 'Folha A4' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleChange('paperWidth', opt.id)}
                  className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                    formData.paperWidth === opt.id
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configurações de Rede / IP (Colapsável) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowNetworkSettings(!showNetworkSettings)}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition-colors"
            >
              {showNetworkSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>Configuração de IP na Rede (Opcional)</span>
            </button>

            {showNetworkSettings && (
              <div className="mt-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">IP da Impressora:</label>
                  <input
                    type="text"
                    value={formData.ip}
                    onChange={(e) => handleChange('ip', e.target.value.trim())}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Porta:</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleChange('port', Number(e.target.value))}
                    placeholder="9100"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Coluna 2: Automações */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            Automações de Impressão:
          </label>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5">
            {/* Toggle Cozinha */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <ChefHat className="w-3.5 h-3.5 text-blue-400" />
                <span>Imprimir Cozinha ao Confirmar</span>
              </span>
              <input
                type="checkbox"
                checked={formData.autoPrintKitchenOnConfirm}
                onChange={(e) => handleChange('autoPrintKitchenOnConfirm', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Toggle Balcão */}
            <label className="flex items-center justify-between cursor-pointer select-none pt-2.5 border-t border-slate-850">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir Balcão/Cliente ao Confirmar</span>
              </span>
              <input
                type="checkbox"
                checked={formData.autoPrintCounterOnConfirm}
                onChange={(e) => handleChange('autoPrintCounterOnConfirm', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Toggle Guilhotina */}
            <label className="flex items-center justify-between cursor-pointer select-none pt-2.5 border-t border-slate-850">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                <span>Corte Automático (Guilhotina)</span>
              </span>
              <input
                type="checkbox"
                checked={formData.cutPaper}
                onChange={(e) => handleChange('cutPaper', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Opções de Corte (se ativado) */}
            {formData.cutPaper && (
              <div className="grid grid-cols-2 gap-2 pt-1 pl-5">
                {[
                  { id: 'full', label: 'Corte Total' },
                  { id: 'partial', label: 'Corte Parcial' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChange('cutMode', opt.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      formData.cutMode === opt.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Rodapé com Botão Salvar */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div>
          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Salvo com sucesso!</span>
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
        </button>
      </div>

    </div>
  );
};
