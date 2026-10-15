import React, { useState } from 'react';
import { X, ArrowRightLeft, Check, AlertCircle, Utensils } from 'lucide-react';

export const TableTransferModal = ({
  isOpen,
  onClose,
  sourceTable,
  tables = [],
  onConfirmTransfer
}) => {
  const freeTables = tables.filter(t => t.id !== sourceTable?.id && t.status === 'livre');
  const [selectedTargetId, setSelectedTargetId] = useState(freeTables[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sourceTable) return null;

  const handleTransfer = async () => {
    if (!selectedTargetId) {
      alert('Selecione a mesa de destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(sourceTable.id, selectedTargetId);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden space-y-4 p-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Transferir Mesa</h3>
              <p className="text-[11px] text-slate-400">Mover comanda ativa para outra mesa livre</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Table Details */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Mesa de Origem:</span>
          <div className="flex justify-between items-center font-extrabold text-white">
            <span className="text-amber-400 font-black">{sourceTable.name}</span>
            <span>{sourceTable.customerName || 'Cliente Salão'}</span>
          </div>
        </div>

        {/* Target Table Selector */}
        {freeTables.length === 0 ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Não há nenhuma outra mesa livre no salão para transferência no momento.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-slate-300 font-bold text-xs block">
              Selecione a Nova Mesa de Destino:
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {freeTables.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTargetId(t.id)}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    selectedTargetId === t.id
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleTransfer}
            disabled={!selectedTargetId || freeTables.length === 0 || isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-black flex items-center space-x-2 shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar Transferência</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
