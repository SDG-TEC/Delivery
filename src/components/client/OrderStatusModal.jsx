import React, { useState } from 'react';
import { X, CheckCircle2, Clock, ChefHat, PackageCheck, Sparkles, Navigation, Paperclip, Send } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, STATUS_MAP, PAYMENT_METHODS } from '../../utils/formatters';
import { MotoboyTrackingModal } from '../counter/MotoboyTrackingModal';
import { OrderMediaViewer } from '../common/OrderMediaViewer';
import { MediaAttachmentPicker } from '../common/MediaAttachmentPicker';
import { WhatsAppIcon } from '../common/BrandIcons';

export const OrderStatusModal = ({ order, onClose }) => {
  const { orders, storeSettings, addOrderMedia, removeOrderMedia } = useOrder();
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  if (!order) return null;

  // Find live order state
  const liveOrder = orders.find(o => o.id === order.id) || order;
  const statusInfo = STATUS_MAP[liveOrder.status] || STATUS_MAP.aguardando_pagamento;

  const isDelivery = liveOrder.deliveryType === 'delivery';

  const currentMedia = Array.isArray(liveOrder.media) ? liveOrder.media : [];

  const handleMediaChange = (newList) => {
    const newItems = newList.filter((item) => !currentMedia.some((existing) => existing.id === item.id));
    newItems.forEach((item) => {
      addOrderMedia(liveOrder.id, {
        ...item,
        senderRole: 'client'
      });
    });

    const removedItems = currentMedia.filter((existing) => !newList.some((item) => item.id === existing.id));
    removedItems.forEach((item) => {
      removeOrderMedia(liveOrder.id, item.id);
    });

    if (newItems.length > 0) {
      setSuccessToast('Mídia enviada para a loja com sucesso!');
      setTimeout(() => setSuccessToast(''), 3500);
    }
  };

  const handleSendReceiptWhatsapp = () => {
    const phoneDigits = String(storeSettings?.whatsapp || storeSettings?.phoneSupport || '').replace(/\D/g, '');
    const targetNumber = phoneDigits ? (phoneDigits.startsWith('55') && phoneDigits.length >= 12 ? phoneDigits : `55${phoneDigits}`) : '';
    let msg = `*COMPROVANTE / MÍDIA DO PEDIDO #${liveOrder.id}*\n\n` +
      `Olá! Seguem os detalhes do meu *Pedido #${liveOrder.id}* no valor de *${formatCurrency(liveOrder.total)}*.\n` +
      `Cliente: ${liveOrder.customerName}\n`;

    if (currentMedia.length > 0) {
      msg += `\n*Mídias / Anexos do Pedido:*\n`;
      currentMedia.forEach((m) => {
        if (m.type === 'image') msg += `📸 Foto: ${m.url}\n`;
        else if (m.type === 'audio') msg += `🎙️ Áudio (${m.duration ? `${m.duration}s` : 'Voz'}): ${m.url}\n`;
        else if (m.type === 'video') msg += `🎥 Vídeo: ${m.url}\n`;
      });
    }

    msg += `\nAguardo a confirmação da equipe! 🍔🍕`;

    const waUrl = targetNumber
      ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const steps = [
    { key: 'aguardando_pagamento', label: '1. Pedido Recebido', desc: 'Aguardando confirmação do pagamento no caixa' },
    { key: 'pagamento_confirmado', label: '2. Confirmado', desc: 'Pedido enviado para a cozinha' },
    { key: 'em_preparo', label: '3. Em Preparo', desc: 'Chefs preparando seus pratos com carinho' },
    { key: 'pronto', label: isDelivery ? '4. Pronto p/ Saída' : '4. Pronto p/ Retirada', desc: isDelivery ? 'Embalado e aguardando o motoboy' : 'Pode retirar no balcão da loja!' },
    ...(isDelivery ? [
      { key: 'saiu_para_entrega', label: '5. Em Rota com Motoboy 🛵', desc: 'O entregador está a caminho do seu endereço!' }
    ] : []),
    { key: 'entregue', label: isDelivery ? 'Concluído' : 'Retirado', desc: 'Pedido entregue com sucesso. Bom apetite!' }
  ];

  const getStepStatus = (stepKey) => {
    const orderIndex = steps.findIndex(s => s.key === liveOrder.status);
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-amber-400 font-extrabold text-lg">PEDIDO #{liveOrder.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                  {statusInfo.shortLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Acompanhamento em tempo real</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Informação do Pagamento no WhatsApp (Sem QR Code, acertado na conversa) */}
          {liveOrder.status === 'aguardando_pagamento' && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <WhatsAppIcon className="w-4 h-4" colored={true} />
                  <span>
                    {liveOrder.paymentMethod === 'pix' && 'Pagamento via PIX no WhatsApp'}
                    {liveOrder.paymentMethod === 'cash' && 'Pagamento em Dinheiro'}
                    {liveOrder.paymentMethod === 'credit_card' && 'Pagamento no Cartão'}
                    {!['pix', 'cash', 'credit_card'].includes(liveOrder.paymentMethod) && 'Pagamento no WhatsApp'}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Combinado no WhatsApp
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {liveOrder.paymentMethod === 'pix'
                  ? 'A chave PIX e o envio do comprovante são combinados diretamente na conversa com a nossa loja no WhatsApp.'
                  : liveOrder.paymentMethod === 'cash'
                  ? 'O pagamento em dinheiro será realizado no momento do recebimento do seu pedido.'
                  : 'A maquininha de cartão será levada no momento da entrega/retirada.'}
              </p>
              <button
                type="button"
                onClick={handleSendReceiptWhatsapp}
                className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-[#25D366]/20 active:scale-98"
              >
                <WhatsAppIcon className="w-4 h-4 fill-slate-950" colored={false} />
                <span>Abrir WhatsApp da Loja</span>
              </button>
            </div>
          )}

          {/* Botão de Rastreamento no Mapa ao Vivo para entregas */}
          {isDelivery && (
            <button
              type="button"
              onClick={() => setShowTrackingMap(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <Navigation className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>🗺️ Acompanhar Rota no Mapa ao Vivo</span>
            </button>
          )}

          {/* Live Timeline Steps */}
          <div className="space-y-4 relative pl-4 border-l-2 border-slate-800 my-4">
            {steps.map((step, idx) => {
              const state = getStepStatus(step.key);
              return (
                <div key={idx} className="relative space-y-0.5">
                  <div className={`absolute -left-[25px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : state === 'current'
                      ? 'bg-amber-500 border-amber-300 ring-4 ring-amber-500/20'
                      : 'bg-slate-950 border-slate-700'
                  }`}>
                    {state === 'completed' && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>

                  <div className={`font-bold text-xs ${
                    state === 'current' ? 'text-amber-400' : state === 'completed' ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-[11px] text-slate-400">{step.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Order Details Summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between font-bold text-slate-300">
              <span>Cliente:</span>
              <span>{liveOrder.customerName}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Telefone:</span>
              <span>{liveOrder.customerPhone}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tipo:</span>
              <span>{liveOrder.deliveryType === 'delivery' ? 'Delivery (Entrega)' : 'Retirada no Balcão'}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between text-slate-400">
                <span>Endereço:</span>
                <span className="text-right truncate max-w-[200px]">{liveOrder.address}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
              <span>Total a Pagar:</span>
              <span className="text-amber-400 font-extrabold text-sm">{formatCurrency(liveOrder.total)}</span>
            </div>
          </div>

          {/* Feedback Toast */}
          {successToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Mídias & Anexos do Pedido */}
          {currentMedia.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Mídias Anexadas ao Pedido ({currentMedia.length})
              </h4>
              <OrderMediaViewer media={currentMedia} showInlineAudio={true} />
            </div>
          )}

          {/* Painel para o Cliente Enviar Mídia Adicional (Comprovante, Fotos, Voz) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enviar Foto, Vídeo ou Gravação de Voz</span>
                </h4>
                <p className="text-[10px] text-slate-400">Envie o comprovante PIX ou mensagem de voz para a loja</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-all cursor-pointer"
              >
                {showMediaPicker ? 'Ocultar' : '+ Anexar'}
              </button>
            </div>

            {showMediaPicker && (
              <div className="pt-2 border-t border-slate-800 animate-in fade-in">
                <MediaAttachmentPicker
                  mediaList={currentMedia}
                  onChange={handleMediaChange}
                  folder={`orders/${liveOrder.id}`}
                  compact={true}
                />
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all"
          >
            Entendido / Fechar
          </button>

        </div>
      </div>

      {showTrackingMap && (
        <MotoboyTrackingModal
          isOpen={showTrackingMap}
          onClose={() => setShowTrackingMap(false)}
          targetOrderId={liveOrder.id}
        />
      )}
    </>
  );
};
