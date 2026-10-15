import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Lock,
  Unlock,
  Printer,
  Plus,
  Minus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  FileText,
  X,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Calculator,
  User,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  getActiveCashierShift,
  openCashierShift,
  addCashMovement,
  updateCashMovement,
  deleteCashMovement,
  updateShiftInitialCash,
  calculateShiftMetrics,
  closeCashierShift,
  getCashierHistory,
  printCashierReport,
  CASHIER_EVENT_NAME
} from '../../services/cashierService';
import { useOrder } from '../../context/OrderContext';

export const CashierManagementModal = ({ isOpen, onClose }) => {
  const { orders, printerSettings, showPrinterToast } = useOrder();

  // Estados principais
  const [activeShift, setActiveShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('turno'); // 'turno' | 'historico'
  const [isClosingStep, setIsClosingStep] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState('sangria'); // 'sangria' | 'suprimento'
  const [isPrinting, setIsPrinting] = useState(false);

  // Formulário de Abertura
  const [openOperator, setOpenOperator] = useState('Operador de Balcão');
  const [openInitialCash, setOpenInitialCash] = useState('100.00');
  const [openNotes, setOpenNotes] = useState('');

  // Formulário de Movimentação (Sangria / Suprimento)
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementOperator, setMovementOperator] = useState('');

  // Edição de Movimentação Existente (Sangria / Suprimento)
  const [editingMovement, setEditingMovement] = useState(null);

  // Edição de Fundo de Troco Inicial
  const [isEditInitialCashOpen, setIsEditInitialCashOpen] = useState(false);
  const [newInitialCashVal, setNewInitialCashVal] = useState('');

  // Formulário de Fechamento (Conferência de Dinheiro)
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [printOnClose, setPrintOnClose] = useState(true);
  const [showDenominations, setShowDenominations] = useState(false);

  // Calculadora de cédulas e moedas
  const [denominations, setDenominations] = useState({
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    b10: 0,
    b5: 0,
    b2: 0,
    c1: 0,
    c050: 0,
    c025: 0,
    c010: 0,
    c005: 0
  });

  // Histórico
  const [historyShifts, setHistoryShifts] = useState([]);
  const [selectedHistoryShift, setSelectedHistoryShift] = useState(null);

  // Carregar turno ativo e histórico
  const loadCashierData = useCallback(async () => {
    setIsLoading(true);
    try {
      const shift = await getActiveCashierShift();
      setActiveShift(shift);
      const history = await getCashierHistory(30);
      setHistoryShifts(history);
    } catch (e) {
      console.error('Erro ao carregar dados do caixa:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCashierData();
    }
  }, [isOpen, loadCashierData]);

  // Ouvir eventos globais de alteração de caixa
  useEffect(() => {
    const handleCashierEvent = () => {
      loadCashierData();
    };
    window.addEventListener(CASHIER_EVENT_NAME, handleCashierEvent);
    return () => window.removeEventListener(CASHIER_EVENT_NAME, handleCashierEvent);
  }, [loadCashierData]);

  // Calcular métricas em tempo real do turno ativo
  const shiftMetrics = useMemo(() => {
    if (!activeShift) return null;
    return calculateShiftMetrics(activeShift, orders);
  }, [activeShift, orders]);

  // Atualizar o valor contado automaticamente pela calculadora de notas/moedas
  useEffect(() => {
    if (showDenominations) {
      const totalFromCalc =
        (denominations.b200 * 200) +
        (denominations.b100 * 100) +
        (denominations.b50 * 50) +
        (denominations.b20 * 20) +
        (denominations.b10 * 10) +
        (denominations.b5 * 5) +
        (denominations.b2 * 2) +
        (denominations.c1 * 1) +
        (denominations.c050 * 0.5) +
        (denominations.c025 * 0.25) +
        (denominations.c010 * 0.1) +
        (denominations.c005 * 0.05);

      setCountedCash(totalFromCalc.toFixed(2));
    }
  }, [denominations, showDenominations]);

  // Abertura de turno
  const handleOpenShift = async (e) => {
    e.preventDefault();
    const initialVal = parseFloat(openInitialCash) || 0;
    try {
      const shift = await openCashierShift({
        operatorName: openOperator,
        initialCash: initialVal,
        notes: openNotes
      });
      setActiveShift(shift);
      if (showPrinterToast) {
        showPrinterToast(`💵 Turno de caixa #${shift.id} aberto com sucesso!`, 'success');
      }
    } catch (err) {
      alert('Erro ao abrir turno de caixa: ' + err.message);
    }
  };

  // Registro de Movimentação (Sangria / Suprimento)
  const handleSaveMovement = async (e) => {
    e.preventDefault();
    const val = parseFloat(movementAmount);
    if (!val || val <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }
    if (!movementReason.trim()) {
      alert('Informe o motivo ou justificativa da movimentação.');
      return;
    }

    try {
      await addCashMovement({
        shiftId: activeShift.id,
        type: movementType,
        amount: val,
        reason: movementReason,
        operatorName: movementOperator || activeShift.operatorName
      });

      setIsMovementModalOpen(false);
      setMovementAmount('');
      setMovementReason('');
      setMovementOperator('');

      if (showPrinterToast) {
        showPrinterToast(
          `✅ ${movementType === 'sangria' ? 'Sangria' : 'Suprimento'} de ${formatCurrency(val)} registrado!`,
          'success'
        );
      }
      await loadCashierData();
    } catch (err) {
      alert('Erro ao registrar movimentação: ' + err.message);
    }
  };

  // Iniciar edição de uma movimentação
  const handleStartEditMovement = (mov) => {
    setEditingMovement({
      id: mov.id,
      type: mov.type || 'sangria',
      amount: String(mov.amount || ''),
      reason: mov.reason || ''
    });
  };

  // Salvar alteração de uma movimentação
  const handleSaveEditMovement = async (e) => {
    e.preventDefault();
    if (!editingMovement || !activeShift) return;

    const val = parseFloat(editingMovement.amount);
    if (!val || val <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }
    if (!editingMovement.reason.trim()) {
      alert('Informe o motivo ou descrição da movimentação.');
      return;
    }

    try {
      await updateCashMovement({
        shiftId: activeShift.id,
        movementId: editingMovement.id,
        type: editingMovement.type,
        amount: val,
        reason: editingMovement.reason
      });

      setEditingMovement(null);
      if (showPrinterToast) {
        showPrinterToast('✏️ Movimentação atualizada com sucesso!', 'success');
      }
      await loadCashierData();
    } catch (err) {
      alert('Erro ao atualizar movimentação: ' + err.message);
    }
  };

  // Excluir uma movimentação lançada errada
  const handleDeleteMovement = async (movId) => {
    if (!activeShift) return;
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação de caixa? O valor será removido do cálculo.')) {
      return;
    }

    try {
      await deleteCashMovement({
        shiftId: activeShift.id,
        movementId: movId
      });

      if (showPrinterToast) {
        showPrinterToast('🗑️ Movimentação excluída com sucesso!', 'info');
      }
      await loadCashierData();
    } catch (err) {
      alert('Erro ao excluir movimentação: ' + err.message);
    }
  };

  // Salvar correção do fundo de troco inicial
  const handleSaveInitialCash = async () => {
    if (!activeShift) return;
    const val = parseFloat(newInitialCashVal);
    if (isNaN(val) || val < 0) {
      alert('Informe um valor válido para o fundo inicial.');
      return;
    }

    try {
      await updateShiftInitialCash({
        shiftId: activeShift.id,
        initialCash: val
      });

      setIsEditInitialCashOpen(false);
      if (showPrinterToast) {
        showPrinterToast(`💵 Fundo inicial atualizado para ${formatCurrency(val)}!`, 'success');
      }
      await loadCashierData();
    } catch (err) {
      alert('Erro ao atualizar fundo inicial: ' + err.message);
    }
  };

  // Impressão Parcial (Leitura X)
  const handlePrintPartial = async () => {
    if (!activeShift || !shiftMetrics) return;
    setIsPrinting(true);
    try {
      const shiftWithClosing = {
        ...activeShift,
        closing: {
          ...shiftMetrics
        }
      };
      const res = await printCashierReport({
        shiftData: shiftWithClosing,
        isPartial: true,
        settings: printerSettings
      });

      if (res?.success) {
        if (showPrinterToast) {
          showPrinterToast('🖨️ Cupom de Leitura X impresso na Elgin i8!', 'success');
        }
      } else {
        if (showPrinterToast) {
          showPrinterToast('⚠️ Falha ao imprimir na Elgin i8: ' + (res?.error || 'Verifique a conexão'), 'warning');
        }
      }
    } catch (err) {
      console.error('Erro na impressão da Leitura X:', err);
      alert('Erro ao emitir Leitura X: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  // Fechamento de Turno (Leitura Z)
  const handleConfirmCloseShift = async () => {
    if (!activeShift) return;
    const numCounted = parseFloat(countedCash);
    if (isNaN(numCounted) || numCounted < 0) {
      alert('Por favor, informe o valor físico total apurado na gaveta de dinheiro.');
      return;
    }

    const confirmMsg = `Confirma o fechamento definitivo do Turno #${activeShift.id}?\n\n` +
      `Dinheiro Esperado: ${formatCurrency(shiftMetrics.expectedCash)}\n` +
      `Dinheiro Contado: ${formatCurrency(numCounted)}\n` +
      `Diferença: ${formatCurrency(numCounted - shiftMetrics.expectedCash)}`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const closed = await closeCashierShift({
        shiftId: activeShift.id,
        countedCash: numCounted,
        notes: closingNotes,
        orders,
        operatorName: activeShift.operatorName
      });

      if (printOnClose) {
        const shiftDataToPrint = {
          ...closed,
          closing: closed.closingData
        };
        printCashierReport({
          shiftData: shiftDataToPrint,
          isPartial: false,
          settings: printerSettings
        }).catch(err => console.warn('Erro ao imprimir fechamento:', err));
      }

      if (showPrinterToast) {
        showPrinterToast(`🔒 Turno #${closed.id} fechado com sucesso!`, 'success');
      }

      setActiveShift(null);
      setIsClosingStep(false);
      setCountedCash('');
      setClosingNotes('');
      await loadCashierData();
      setCurrentTab('historico');
    } catch (err) {
      alert('Erro ao fechar caixa: ' + err.message);
    }
  };

  // Reimprimir comprovante do histórico
  const handleReprintHistory = async (shift) => {
    try {
      const shiftDataToPrint = {
        ...shift,
        closing: shift.closingData || calculateShiftMetrics(shift, orders)
      };
      const res = await printCashierReport({
        shiftData: shiftDataToPrint,
        isPartial: shift.status === 'open',
        settings: printerSettings
      });
      if (res?.success) {
        if (showPrinterToast) {
          showPrinterToast(`🖨️ Cupom do turno #${shift.id} reimpresso na Elgin i8!`, 'success');
        }
      } else {
        alert('Impressora não respondeu: ' + (res?.error || 'verifique a rede da Elgin i8'));
      }
    } catch (err) {
      alert('Erro ao reimprimir: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">Gestão & Fechamento de Caixa</h2>
                {activeShift ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ABERTO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>FECHADO</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeShift
                  ? `Turno #${activeShift.id} • Operador: ${activeShift.operatorName} • Aberto em ${formatDateTime(activeShift.openedAt)}`
                  : 'Nenhum turno aberto no momento. Abra o caixa para iniciar o registro.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadCashierData}
              disabled={isLoading}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              title="Recarregar dados do caixa"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-3 gap-2">
          <button
            onClick={() => { setCurrentTab('turno'); setIsClosingStep(false); }}
            className={`flex items-center space-x-2 pb-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              currentTab === 'turno'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Turno Atual {activeShift ? '(Ativo)' : ''}</span>
          </button>

          <button
            onClick={() => { setCurrentTab('historico'); setIsClosingStep(false); }}
            className={`flex items-center space-x-2 pb-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              currentTab === 'historico'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Fechamentos ({historyShifts.length})</span>
          </button>
        </div>

        {/* CORPO MODAL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* ABA 1: TURNO ATUAL */}
          {/* ========================================================================= */}
          {currentTab === 'turno' && (
            <>
              {/* CASO 1: NENHUM CAIXA ABERTO -> FORMULÁRIO DE ABERTURA */}
              {!activeShift && (
                <div className="max-w-md mx-auto py-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                      <Unlock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-extrabold text-white">Abertura de Turno de Caixa</h3>
                    <p className="text-xs text-slate-400">
                      Informe o operador responsável e o fundo de troco inicial em dinheiro na gaveta.
                    </p>
                  </div>

                  <form onSubmit={handleOpenShift} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Operador Responsável
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={openOperator}
                          onChange={e => setOpenOperator(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-amber-500 focus:outline-none"
                          placeholder="Nome do Operador do Caixa"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Fundo de Troco Inicial (Dinheiro Físico)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-400">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={openInitialCash}
                          onChange={e => setOpenInitialCash(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-lg focus:border-amber-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Presets rápidos */}
                      <div className="flex items-center gap-2 mt-2">
                        {['50.00', '100.00', '150.00', '200.00'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setOpenInitialCash(preset)}
                            className="flex-1 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all"
                          >
                            R$ {parseFloat(preset).toFixed(0)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Observações da Abertura (Opcional)
                      </label>
                      <textarea
                        value={openNotes}
                        onChange={e => setOpenNotes(e.target.value)}
                        rows={2}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                        placeholder="Ex: Turno da Noite, troco conferido com gerente..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-4 h-4 stroke-[3]" />
                      <span>Abrir Turno de Caixa</span>
                    </button>
                  </form>
                </div>
              )}

              {/* CASO 2: CAIXA ABERTO E ESTÁ NA ETAPA DE FECHAMENTO (CONFERÊNCIA FÍSICA) */}
              {activeShift && isClosingStep && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center space-x-2">
                        <Lock className="w-5 h-5 text-amber-400" />
                        <span>Conferência de Dinheiro & Fechamento (Leitura Z)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Faça a contagem física das cédulas e moedas presentes na gaveta para apurar eventuais sobras ou faltas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClosingStep(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
                    >
                      ← Voltar ao Painel
                    </button>
                  </div>

                  {/* Comparativo de Dinheiro */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dinheiro Esperado */}
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dinheiro Esperado na Gaveta</span>
                      <div className="text-2xl sm:text-3xl font-black text-white">
                        {formatCurrency(shiftMetrics.expectedCash)}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Fundo ({formatCurrency(shiftMetrics.initialCash)}) + Vendas Dinheiro ({formatCurrency(shiftMetrics.totalCash)}) + Suprimentos ({formatCurrency(shiftMetrics.totalSuprimentos)}) - Sangrias ({formatCurrency(shiftMetrics.totalSangrias)})
                      </p>
                    </div>

                    {/* Dinheiro Contado */}
                    <div className="bg-slate-950 border border-amber-500/40 p-5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Dinheiro Físico Contado</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setCountedCash(shiftMetrics.expectedCash.toFixed(2))}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
                            title="Preencher automaticamente com o valor esperado"
                          >
                            ⚡ Bateu Certinho
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDenominations(!showDenominations)}
                            className="text-[11px] font-bold text-amber-400 hover:underline flex items-center space-x-1"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>{showDenominations ? 'Ocultar' : 'Cédulas'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-amber-400">R$</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={countedCash}
                          onChange={e => setCountedCash(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-amber-500/50 rounded-xl text-white font-black text-xl focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Diferença (Sobra / Falta) */}
                    {(() => {
                      const countedNum = parseFloat(countedCash);
                      if (isNaN(countedNum)) {
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Diferença de Caixa</span>
                            <div className="text-lg font-bold text-slate-500 mt-2">Aguardando contagem...</div>
                          </div>
                        );
                      }
                      const diff = countedNum - shiftMetrics.expectedCash;
                      const isExact = Math.abs(diff) < 0.01;
                      const isSurplus = diff > 0.01;

                      return (
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                          isExact
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                            : isSurplus
                              ? 'bg-blue-950/30 border-blue-500/40 text-blue-400'
                              : 'bg-rose-950/30 border-rose-500/40 text-rose-400'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {isExact ? 'Caixa Conferido' : isSurplus ? 'Sobra de Caixa (+)' : 'Falta de Caixa (-)'}
                            </span>
                            {isExact ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div className="text-2xl sm:text-3xl font-black">
                            {(diff > 0 ? '+' : '') + formatCurrency(diff)}
                          </div>
                          <p className="text-[11px] opacity-80">
                            {isExact
                              ? '✅ O valor contado bate exatamente com o esperado pelo sistema!'
                              : isSurplus
                                ? '⚠️ Há mais dinheiro na gaveta do que o registrado no sistema.'
                                : '⚠️ O valor físico contado é menor que o esperado pelo sistema.'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Calculadora de Cédulas e Moedas (Opcional expansível) */}
                  {showDenominations && (
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <Calculator className="w-4 h-4" />
                          <span>Contador Detalhado de Cédulas & Moedas</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setDenominations({
                            b200: 0, b100: 0, b50: 0, b20: 0, b10: 0, b5: 0, b2: 0,
                            c1: 0, c050: 0, c025: 0, c010: 0, c005: 0
                          })}
                          className="text-[11px] font-bold text-slate-400 hover:text-white"
                        >
                          Limpar contagem
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {[
                          { key: 'b200', label: 'R$ 200,00', mult: 200 },
                          { key: 'b100', label: 'R$ 100,00', mult: 100 },
                          { key: 'b50', label: 'R$ 50,00', mult: 50 },
                          { key: 'b20', label: 'R$ 20,00', mult: 20 },
                          { key: 'b10', label: 'R$ 10,00', mult: 10 },
                          { key: 'b5', label: 'R$ 5,00', mult: 5 },
                          { key: 'b2', label: 'R$ 2,00', mult: 2 },
                          { key: 'c1', label: 'R$ 1,00', mult: 1 },
                          { key: 'c050', label: 'R$ 0,50', mult: 0.5 },
                          { key: 'c025', label: 'R$ 0,25', mult: 0.25 },
                          { key: 'c010', label: 'R$ 0,10', mult: 0.1 },
                          { key: 'c005', label: 'R$ 0,05', mult: 0.05 }
                        ].map(item => (
                          <div key={item.key} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-slate-300">{item.label}</span>
                              <span className="text-amber-400 font-black">
                                {formatCurrency(denominations[item.key] * item.mult)}
                              </span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={denominations[item.key] || ''}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setDenominations(prev => ({ ...prev, [item.key]: Math.max(0, val) }));
                              }}
                              placeholder="0"
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-center font-bold text-sm focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações de Fechamento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Observações do Fechamento
                    </label>
                    <textarea
                      value={closingNotes}
                      onChange={e => setClosingNotes(e.target.value)}
                      rows={2}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                      placeholder="Justificativa de divergência, observações para o próximo turno ou para a gerência..."
                    />
                  </div>

                  {/* Toggle Imprimir Cupom na Elgin i8 */}
                  <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                    <input
                      type="checkbox"
                      id="printOnClose"
                      checked={printOnClose}
                      onChange={e => setPrintOnClose(e.target.checked)}
                      className="w-5 h-5 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer accent-amber-500"
                    />
                    <label htmlFor="printOnClose" className="text-xs font-bold text-white cursor-pointer select-none">
                      🖨️ Imprimir Comprovante de Fechamento de Caixa na impressora térmica Elgin i8 (Bobina 80mm)
                    </label>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsClosingStep(false)}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCloseShift}
                      disabled={isNaN(parseFloat(countedCash))}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4 stroke-[3]" />
                      <span>Confirmar & Fechar Caixa Definitivo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CASO 3: CAIXA ABERTO -> PAINEL AO VIVO DE GESTÃO DO TURNO */}
              {activeShift && !isClosingStep && (
                <div className="space-y-6">
                  {/* BARRA DE AÇÕES RÁPIDAS */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão Novo Suprimento */}
                      <button
                        type="button"
                        onClick={() => { setMovementType('suprimento'); setIsMovementModalOpen(true); }}
                        className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black transition-all cursor-pointer"
                        title="Adicionar reforço de troco em dinheiro na gaveta"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>➕ Suprimento / Entrada</span>
                      </button>

                      {/* Botão Nova Sangria */}
                      <button
                        type="button"
                        onClick={() => { setMovementType('sangria'); setIsMovementModalOpen(true); }}
                        className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black transition-all cursor-pointer"
                        title="Registrar retirada de dinheiro da gaveta (pagamentos, segurança)"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>➖ Sangria / Retirada</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Leitura X Parcial na Elgin i8 */}
                      <button
                        type="button"
                        onClick={handlePrintPartial}
                        disabled={isPrinting}
                        className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                        title="Imprimir relatório parcial da gaveta na impressora Elgin sem encerrar o turno"
                      >
                        <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-bounce' : ''}`} />
                        <span>Leitura X (Parcial)</span>
                      </button>

                      {/* Botão Fechar Caixa (Leitura Z) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsClosingStep(true);
                          setCountedCash(shiftMetrics.expectedCash.toFixed(2));
                        }}
                        className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                        title="Iniciar processo de conferência física e fechamento oficial do caixa"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Fechar Caixa (Leitura Z)</span>
                      </button>
                    </div>
                  </div>

                  {/* CARDS DE CONFERÊNCIA DE DINHEIRO (GAVETA FÍSICA) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>1. Dinheiro Físico na Gaveta</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">Dinheiro em mãos neste momento</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {/* Fundo Inicial */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Fundo Inicial</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewInitialCashVal(String(shiftMetrics.initialCash));
                              setIsEditInitialCashOpen(true);
                            }}
                            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 cursor-pointer"
                            title="Editar/corrigir o troco de abertura deste turno"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                        <div className="text-lg font-black text-white">
                          {formatCurrency(shiftMetrics.initialCash)}
                        </div>
                        <span className="text-[10px] text-slate-500">Troco na abertura</span>
                      </div>

                      {/* (+) Vendas Dinheiro */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">(+) Vendas Dinheiro</span>
                        <div className="text-lg font-black text-emerald-400">
                          {formatCurrency(shiftMetrics.totalCash)}
                        </div>
                        <span className="text-[10px] text-slate-500">{shiftMetrics.countCash} pedidos em dinheiro</span>
                      </div>

                      {/* (+) Suprimentos */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-teal-400 uppercase">(+) Suprimentos</span>
                        <div className="text-lg font-black text-teal-400">
                          {formatCurrency(shiftMetrics.totalSuprimentos)}
                        </div>
                        <span className="text-[10px] text-slate-500">Reforços de troco</span>
                      </div>

                      {/* (-) Sangrias */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-rose-400 uppercase">(-) Sangrias</span>
                        <div className="text-lg font-black text-rose-400">
                          -{formatCurrency(shiftMetrics.totalSangrias)}
                        </div>
                        <span className="text-[10px] text-slate-500">Retiradas de caixa</span>
                      </div>

                      {/* DINHEIRO ESPERADO (DESTAQUE) */}
                      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-950/40 to-slate-950 border-2 border-emerald-500/50 p-4 rounded-2xl space-y-1 shadow-lg shadow-emerald-950/40">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="text-[10px] font-black uppercase tracking-wider">Esperado na Gaveta</span>
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xl font-black text-emerald-400">
                          {formatCurrency(shiftMetrics.expectedCash)}
                        </div>
                        <span className="text-[10px] text-emerald-300 font-bold">Total físico a conferir</span>
                      </div>
                    </div>
                  </div>

                  {/* CARDS DE FATURAMENTO TOTAL DO TURNO POR FORMA DE PAGAMENTO */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <Receipt className="w-4 h-4 text-amber-400" />
                        <span>2. Faturamento do Turno (Todos os Meios)</span>
                      </h4>
                      <div className="text-xs text-slate-400 font-bold">
                        Total de Pedidos: <span className="text-white font-extrabold">{shiftMetrics.ordersCount}</span> • Ticket Médio: <span className="text-white font-extrabold">{formatCurrency(shiftMetrics.averageTicket)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Pix */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-teal-400">
                          <span className="text-[10px] font-bold uppercase">Pix Online/QR</span>
                          <span className="text-[10px] font-bold">{shiftMetrics.countPix}x</span>
                        </div>
                        <div className="text-lg font-black text-teal-400">
                          {formatCurrency(shiftMetrics.totalPix)}
                        </div>
                        <p className="text-[10px] text-slate-500">Direto na conta</p>
                      </div>

                      {/* Cartão de Crédito */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-purple-400">
                          <span className="text-[10px] font-bold uppercase">Cartão Crédito</span>
                          <span className="text-[10px] font-bold">{shiftMetrics.countCredit}x</span>
                        </div>
                        <div className="text-lg font-black text-purple-400">
                          {formatCurrency(shiftMetrics.totalCredit)}
                        </div>
                        <p className="text-[10px] text-slate-500">Maquininha</p>
                      </div>

                      {/* Cartão de Débito */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-blue-400">
                          <span className="text-[10px] font-bold uppercase">Cartão Débito</span>
                          <span className="text-[10px] font-bold">{shiftMetrics.countDebit}x</span>
                        </div>
                        <div className="text-lg font-black text-blue-400">
                          {formatCurrency(shiftMetrics.totalDebit)}
                        </div>
                        <p className="text-[10px] text-slate-500">Maquininha</p>
                      </div>

                      {/* TOTAL FATURADO GERAL */}
                      <div className="bg-gradient-to-br from-amber-500/10 to-slate-950 border-2 border-amber-500/40 p-4 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-amber-400">
                          <span className="text-[10px] font-black uppercase">Total Faturado</span>
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xl font-black text-amber-400">
                          {formatCurrency(shiftMetrics.totalSales)}
                        </div>
                        <p className="text-[10px] text-amber-300 font-bold">Vendas líquidas do turno</p>
                      </div>
                    </div>
                  </div>

                  {/* DISTRIBUIÇÃO POR CANAL DE VENDA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">🛵 Delivery</span>
                        <div className="text-sm font-black text-white">{formatCurrency(shiftMetrics.byChannel.delivery.total)}</div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        {shiftMetrics.byChannel.delivery.count} pedidos
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">🛍️ Retirada Balcão</span>
                        <div className="text-sm font-black text-white">{formatCurrency(shiftMetrics.byChannel.takeout.total)}</div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        {shiftMetrics.byChannel.takeout.count} pedidos
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">🍽️ Salão & Mesas</span>
                        <div className="text-sm font-black text-white">{formatCurrency(shiftMetrics.byChannel.dine_in.total)}</div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        {shiftMetrics.byChannel.dine_in.count} pedidos
                      </span>
                    </div>
                  </div>

                  {/* HISTÓRICO DE MOVIMENTAÇÕES DESTE TURNO */}
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Movimentações Registradas no Turno ({activeShift.movements?.length || 0})</span>
                      </h4>
                    </div>

                    {(!activeShift.movements || activeShift.movements.length === 0) ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        Nenhuma sangria ou suprimento registrado até o momento.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeShift.movements.map((mov, idx) => (
                          <div
                            key={mov.id || idx}
                            className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800/80 rounded-xl text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg ${
                                mov.type === 'suprimento'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {mov.type === 'suprimento' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-extrabold text-white flex items-center space-x-2">
                                  <span>{mov.type === 'suprimento' ? 'Suprimento (Entrada)' : 'Sangria (Retirada)'}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">• {new Date(mov.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{mov.reason || 'Sem descrição'}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`font-black text-sm ${
                                mov.type === 'suprimento' ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {mov.type === 'suprimento' ? '+' : '-'}{formatCurrency(mov.amount)}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEditMovement(mov)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                                title="Editar esta movimentação"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMovement(mov.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                                title="Excluir esta movimentação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: HISTÓRICO DE FECHAMENTOS ANTERIORES */}
          {/* ========================================================================= */}
          {currentTab === 'historico' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Histórico de Fechamentos de Caixa</h3>
                  <p className="text-xs text-slate-400">
                    Consulte os turnos encerrados e reimprima cupons térmicos para a gerência ou contabilidade.
                  </p>
                </div>
              </div>

              {historyShifts.length === 0 ? (
                <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-3xl space-y-2">
                  <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-bold text-sm">Nenhum fechamento registrado no histórico</p>
                  <p className="text-xs text-slate-500">Ao encerrar um turno de caixa, ele aparecerá aqui com todos os detalhes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyShifts.map(shift => {
                    const cData = shift.closingData || {};
                    const diff = cData.difference !== undefined ? Number(cData.difference) : 0;
                    const isExact = Math.abs(diff) < 0.01;
                    const isSurplus = diff > 0.01;

                    return (
                      <div
                        key={shift.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-black text-amber-400">#{shift.id}</span>
                              <span className="text-slate-400 text-xs font-bold">• Operador: <strong className="text-white">{shift.operatorName}</strong></span>
                              {shift.status === 'open' ? (
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Em Aberto</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-800 text-slate-300">Fechado</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Aberto em {formatDateTime(shift.openedAt)} {shift.closedAt ? `• Fechado em ${formatDateTime(shift.closedAt)}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleReprintHistory(shift)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-all cursor-pointer"
                              title="Reimprimir comprovante deste fechamento na impressora Elgin i8"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Reimprimir Elgin i8</span>
                            </button>
                          </div>
                        </div>

                        {/* Dados Financeiros do Fechamento */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Faturamento Total</span>
                            <div className="font-extrabold text-white">
                              {formatCurrency(cData.totalSales || 0)} ({cData.ordersCount || 0} ped.)
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Dinheiro Esperado</span>
                            <div className="font-extrabold text-slate-300">
                              {formatCurrency(cData.expectedCash || 0)}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Dinheiro Contado</span>
                            <div className="font-extrabold text-amber-400">
                              {formatCurrency(cData.countedCash || 0)}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Divergência</span>
                            <div className={`font-black ${
                              isExact ? 'text-emerald-400' : isSurplus ? 'text-blue-400' : 'text-rose-400'
                            }`}>
                              {isExact ? '✅ Bateu (R$ 0,00)' : isSurplus ? `+${formatCurrency(diff)} (Sobra)` : `${formatCurrency(diff)} (Falta)`}
                            </div>
                          </div>
                        </div>

                        {cData.notes && (
                          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <strong>Obs:</strong> {cData.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL SECUNDÁRIO: REGISTRAR SANGRIA OU SUPRIMENTO */}
        {isMovementModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${
                    movementType === 'sangria' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {movementType === 'sangria' ? <Minus className="w-5 h-5 stroke-[3]" /> : <Plus className="w-5 h-5 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {movementType === 'sangria' ? 'Nova Sangria (Retirada)' : 'Novo Suprimento (Entrada)'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {movementType === 'sangria'
                        ? 'Retirada de dinheiro da gaveta (ex: pagamento motoboy, compras urgentes)'
                        : 'Entrada de dinheiro para reforço de troco ou acréscimo de saldo'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-400">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0.50"
                      value={movementAmount}
                      onChange={e => setMovementAmount(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-black text-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Presets de valor */}
                  <div className="flex items-center gap-2 mt-2">
                    {['20.00', '50.00', '100.00', '200.00'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMovementAmount(preset)}
                        className="flex-1 py-1 text-xs font-bold bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all"
                      >
                        R$ {parseFloat(preset).toFixed(0)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Motivo / Justificativa
                  </label>
                  <input
                    type="text"
                    value={movementReason}
                    onChange={e => setMovementReason(e.target.value)}
                    required
                    placeholder={movementType === 'sangria' ? 'Ex: Pagamento entregador diária, compra gelo...' : 'Ex: Troco de moedas, reforço de notas...'}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                  />

                  {/* Sugestões rápidas de motivos */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(movementType === 'sangria'
                      ? ['Pagamento Entregador', 'Compra Urgente', 'Sangria de Segurança', 'Despesa Operacional']
                      : ['Reforço de Troco', 'Troca de Moedas', 'Acréscimo de Fundo']
                    ).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setMovementReason(tag)}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl font-black text-xs text-slate-950 shadow-md transition-all cursor-pointer ${
                      movementType === 'sangria'
                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                    }`}
                  >
                    {movementType === 'sangria' ? 'Confirmar Sangria' : 'Confirmar Suprimento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE MOVIMENTAÇÃO (SANGRIA / SUPRIMENTO) */}
        {editingMovement && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Editar Entrada / Saída de Caixa</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Tipo de Movimentação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingMovement(prev => ({ ...prev, type: 'suprimento' }))}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        editingMovement.type === 'suprimento'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ➕ Suprimento (Entrada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMovement(prev => ({ ...prev, type: 'sangria' }))}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        editingMovement.type === 'sangria'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ➖ Sangria (Retirada)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Valor da Movimentação</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editingMovement.amount}
                      onChange={e => setEditingMovement(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-black text-lg focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Motivo / Descrição</label>
                  <input
                    type="text"
                    value={editingMovement.reason}
                    onChange={e => setEditingMovement(prev => ({ ...prev, reason: e.target.value }))}
                    required
                    placeholder="Ex: Troco para motoboy, compra de insumo..."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingMovement(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    Salvar Alteração
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE FUNDO INICIAL */}
        {isEditInitialCashOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-extrabold text-white">Corrigir Fundo Inicial</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditInitialCashOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Altere o valor do fundo de troco da abertura se tiver sido digitado incorretamente.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Fundo Inicial Real (R$)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-400">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={newInitialCashVal}
                    onChange={e => setNewInitialCashVal(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-extrabold text-lg focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditInitialCashOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveInitialCash}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Atualizar Fundo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

  );
};
