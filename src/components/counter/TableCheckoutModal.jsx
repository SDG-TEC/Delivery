import React, { useState } from 'react';
import {
  X, Check, Printer, DollarSign, QrCode, CreditCard, Banknote, Users,
  Utensils, AlertCircle, Percent, ArrowRight, Receipt
} from 'lucide-react';
import { formatCurrency, formatTime, PAYMENT_METHODS } from '../../utils/formatters';

export const TableCheckoutModal = ({
  isOpen,
  onClose,
  table,
  order,
  onConfirmPayment,
  onPrintConference
}) => {
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [includeServiceFee, setIncludeServiceFee] = useState(false);
  const [serviceFeeRate, setServiceFeeRate] = useState(10); // 10%
  const [cashReceived, setCashReceived] = useState('');
  const [peopleSplit, setPeopleSplit] = useState(table?.peopleCount || 2);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !table || !order) return null;

  const itemsSubtotal = (order.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const serviceFeeValue = includeServiceFee ? (itemsSubtotal * (serviceFeeRate / 100)) : 0;
  const grandTotal = itemsSubtotal + serviceFeeValue;

  const receivedAmount = parseFloat(cashReceived.replace(',', '.')) || 0;
  const changeAmount = Math.max(0, receivedAmount - grandTotal);

  const splitValue = peopleSplit > 0 ? (grandTotal / peopleSplit) : grandTotal;

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      await onConfirmPayment({
        tableId: table.id,
        orderId: order.id,
        paymentMethod,
        includeServiceFee,
        serviceFeeValue,
        grandTotal,
        cashReceived: receivedAmount,
        changeAmount
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">Fechar Conta - {table.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Comanda #{order.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente: <b className="text-slate-200">{table.customerName || 'Cliente Salão'}</b> • Aberta às {formatTime(table.openedAt || order.createdAt)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* Itemized Consumed List */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800/80 pb-2">
              <span>Itens Consumidos no Salão ({order.items?.length || 0})</span>
              <span>Subtotal</span>
            </div>

            <div className="divide-y divide-slate-850/60 max-h-48 overflow-y-auto pr-1">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-white">{item.quantity}x {item.name}</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-[10px] text-slate-400">
                        {item.selectedOptions.map((opt, oIdx) => (
                          <span key={oIdx} className="mr-1.5">+ {opt}</span>
                        ))}
                      </div>
                    )}
                    {item.observation && (
                      <div className="text-[10px] text-amber-300 italic">Obs: {item.observation}</div>
                    )}
                  </div>
                  <span className="font-black text-slate-200">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Subtotal dos Produtos:</span>
              <span className="font-extrabold text-white">{formatCurrency(itemsSubtotal)}</span>
            </div>
          </div>

          {/* Taxa de Serviço & Divisão de Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Taxa de Serviço (10%) */}
            <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
              includeServiceFee
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
              onClick={() => setIncludeServiceFee(!includeServiceFee)}
            >
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={includeServiceFee}
                  onChange={(e) => setIncludeServiceFee(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-xs block text-white">Taxa de Serviço ({serviceFeeRate}%)</span>
                  <span className="text-[10px] text-slate-400">Gorjeta opcional da equipe</span>
                </div>
              </div>
              <span className="font-black text-amber-400 text-sm">
                +{formatCurrency(itemsSubtotal * 0.1)}
              </span>
            </div>

            {/* Divisor de Conta */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="font-extrabold text-xs block text-white">Dividir Conta</span>
                  <span className="text-[10px] text-slate-400">{peopleSplit} pessoa(s) na mesa</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={peopleSplit}
                  onChange={(e) => setPeopleSplit(Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-slate-900 border border-slate-700 rounded-lg py-1 text-center font-bold text-white text-xs"
                />
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Por pessoa</span>
                  <span className="font-black text-emerald-400 text-xs">{formatCurrency(splitValue)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <label className="text-slate-300 font-bold uppercase text-[10px] block">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'credit_card', label: 'Cartão Crédito', icon: CreditCard },
                { id: 'debit_card', label: 'Cartão Débito', icon: CreditCard },
                { id: 'cash', label: 'Dinheiro', icon: Banknote },
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 font-bold'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calculadora de Troco (Se Dinheiro) */}
          {paymentMethod === 'cash' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold text-[11px] block">Valor Recebido do Cliente (R$)</label>
                <input
                  type="text"
                  placeholder="Ex: 100,00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Troco a Devolver:</span>
                <span className={`text-lg font-black ${changeAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Total Final Highlight */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-slate-400 font-bold block text-xs uppercase">Total a Pagar:</span>
              {includeServiceFee && (
                <span className="text-[10px] text-amber-400">Inclui taxa de serviço (+{formatCurrency(serviceFeeValue)})</span>
              )}
            </div>
            <span className="text-2xl font-black text-emerald-400">{formatCurrency(grandTotal)}</span>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Botão de Imprimir Pré-Conta */}
          <button
            type="button"
            onClick={() => onPrintConference(order, table)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            title="Imprimir ticket de conferência da comanda para o cliente"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Pré-Conta</span>
          </button>

          <div className="w-full sm:w-auto flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={isProcessing}
              className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Pagamento & Liberar Mesa</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
