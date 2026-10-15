import React, { useState } from 'react';
import {
  X, Paperclip, Camera, Video, Mic, CheckCircle2,
  Clock, AlertCircle, ShoppingBag, User, Phone, MapPin
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, STATUS_MAP } from '../../utils/formatters';
import { MediaAttachmentPicker } from './MediaAttachmentPicker';
import { OrderMediaViewer } from './OrderMediaViewer';

export const OrderMediaModal = ({ isOpen, order, onClose, userRole = 'staff' }) => {
  const { orders, addOrderMedia, removeOrderMedia } = useOrder();
  const [successToast, setSuccessToast] = useState('');

  if (!isOpen || !order) return null;

  // Obter versão em tempo real do pedido
  const liveOrder = orders.find((o) => o.id === order.id) || order;
  const currentMedia = Array.isArray(liveOrder.media) ? liveOrder.media : [];

  const handleMediaChange = (newList) => {
    // Detectar novos itens adicionados
    const newItems = newList.filter(
      (item) => !currentMedia.some((existing) => existing.id === item.id)
    );

    newItems.forEach((item) => {
      addOrderMedia(liveOrder.id, {
        ...item,
        senderRole: userRole // 'client' | 'balcao' | 'cozinha' | 'motoboy' | 'staff'
      });
    });

    // Detectar itens removidos
    const removedItems = currentMedia.filter(
      (existing) => !newList.some((item) => item.id === existing.id)
    );

    removedItems.forEach((item) => {
      removeOrderMedia(liveOrder.id, item.id);
    });

    if (newItems.length > 0) {
      setSuccessToast('Mídia anexada e sincronizada ao pedido!');
      setTimeout(() => setSuccessToast(''), 3000);
    }
  };

  const statusInfo = STATUS_MAP[liveOrder.status] || STATUS_MAP.aguardando_pagamento;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-white">{liveOrder.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cliente: <strong className="text-slate-200">{liveOrder.customerName}</strong> ({liveOrder.customerPhone || 'Sem telefone'})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback toast */}
        {successToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Visualizador de Mídias Existentes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mídias & Anexos do Pedido ({currentMedia.length})
          </h4>

          {currentMedia.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma foto, vídeo ou áudio anexado a este pedido ainda.
            </div>
          ) : (
            <OrderMediaViewer media={currentMedia} showInlineAudio={true} />
          )}
        </div>

        {/* Seletor / Gravador para Adicionar Mais Mídias */}
        <div className="pt-2 border-t border-slate-800">
          <MediaAttachmentPicker
            mediaList={currentMedia}
            onChange={handleMediaChange}
            folder={`orders/${liveOrder.id}`}
            title="Anexar Nova Mídia ao Pedido"
            subtitle="Tire foto, grave áudio ou anexe vídeo em tempo real"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
