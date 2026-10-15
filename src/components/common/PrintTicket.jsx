import React from 'react';
import { createPortal } from 'react-dom';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from '../../utils/formatters';
import { Printer, X, ChefHat, Store, Wifi, Bike } from 'lucide-react';

export const PrintTicket = () => {
  const { printTicket, closePrintTicket, triggerPrintTicket, printerSettings, printerStatus, storeSettings } = useOrder();

  if (!printTicket || !printTicket.order) return null;

  const { order, type } = printTicket; // type: 'counter' | 'kitchen' | 'motoboy' | 'both'
  const isDelivery = order.deliveryType === 'delivery';
  const isBoth = type === 'both';

  const formatPaymentLabel = (method) => {
    return PAYMENT_METHODS[method]?.label || method?.toUpperCase() || 'A DEFINIR';
  };

  const renderSingleTicket = (ticketType) => {
    const isKit = ticketType === 'kitchen';
    const isMoto = ticketType === 'motoboy';
    const isCount = ticketType === 'counter';

    const subtotal = (order.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const defaultFee = Number(storeSettings?.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
    const deliveryFee = isDelivery ? (order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : defaultFee) : 0;
    const grandTotal = order.total !== undefined ? Number(order.total) : (subtotal + deliveryFee);

    return (
      <div key={ticketType} className="ticket-content text-black font-mono leading-tight">
        {/* Cabeçalho Compacto */}
        <div className="text-center pb-1 mb-1 border-b border-dashed border-black">
          <h1 className="text-xs font-black tracking-wider uppercase">SDG DELIVERY</h1>
          <div className="mt-0.5 inline-block px-1.5 py-0.5 border border-black font-black uppercase text-[10px] tracking-wide">
            {isMoto
              ? '🛵 VIA DO MOTOBOY / ENTREGA'
              : isKit
              ? '👨‍🍳 VIA COZINHA / PRODUÇÃO'
              : (isDelivery ? '🏢 VIA BALCÃO & COZINHA' : '🏢 VIA BALCÃO / CAIXA')}
          </div>
        </div>

        {/* Destaque do Pedido & Horário */}
        <div className="flex justify-between items-center text-xs font-black border-b border-black pb-0.5 mb-1">
          <span>PEDIDO #{order.id}</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>

        {/* Bloco de Destino / Endereço (SUPER DESTAQUE PARA O MOTOBOY) */}
        {isDelivery && (
          <div className={`p-1 mb-1 border ${isMoto ? 'border-2 border-black bg-gray-100' : 'border-dashed border-black'}`}>
            <div className="text-[9px] font-black uppercase text-gray-700">📍 ENDEREÇO DE ENTREGA:</div>
            <div className={`font-black ${isMoto ? 'text-xs' : 'text-[11px]'} leading-snug break-words`}>
              {order.address || 'ENDEREÇO NÃO INFORMADO'}
            </div>
          </div>
        )}

        {order.deliveryType === 'dine_in' && (
          <div className="p-1 mb-1 border border-black text-xs font-black bg-gray-100">
            🍽️ LOCAL: {order.address || 'MESA DO SALÃO'}
          </div>
        )}

        {/* Info do Cliente & Tipo */}
        <div className="text-[10px] space-y-0.5 mb-1 pb-1 border-b border-dashed border-black">
          <div>CLIENTE: <span className="font-extrabold text-xs">{order.customerName}</span></div>
          {order.customerPhone && (
            <div>TEL: <span className="font-bold">{order.customerPhone}</span></div>
          )}
          <div>TIPO: <span className="font-bold uppercase">
            {order.deliveryType === 'delivery' ? 'DELIVERY (ENTREGA)' : (order.deliveryType === 'dine_in' ? 'CONSUMO SALÃO (MESA)' : 'RETIRADA NO BALCÃO')}
          </span></div>
        </div>

        {/* Bloco Financeiro / Cobrança (DESTACADO NA VIA DO MOTOBOY) */}
        {isMoto ? (
          <div className="border border-black p-1 mb-1.5 bg-gray-50 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>FORMA DE PAGTO:</span>
              <span className="font-black uppercase">{formatPaymentLabel(order.paymentMethod)}</span>
            </div>
            <div className="flex justify-between text-xs font-black border-t border-black pt-0.5 mt-0.5">
              <span>TOTAL A COBRAR:</span>
              <span className="text-sm">{formatCurrency(grandTotal)}</span>
            </div>
            {order.paymentMethod === 'pix' ? (
              <div className="text-[9px] font-black text-center border-t border-dashed border-black pt-0.5 text-gray-800">
                ✅ PAGO VIA PIX - NÃO COBRAR DO CLIENTE
              </div>
            ) : order.paymentMethod === 'credit_card' ? (
              <div className="text-[9px] font-black text-center border-t border-dashed border-black pt-0.5">
                💳 LEVAR MAQUININHA DE CARTÃO
              </div>
            ) : (
              <div className="text-[9px] font-black text-center border-t border-dashed border-black pt-0.5">
                💵 DINHEIRO - RECEBER NA ENTREGA
              </div>
            )}
          </div>
        ) : null}

        {/* Lista de Itens do Pedido */}
        <div className="mb-1 border-b border-dashed border-black pb-1">
          <div className="text-[10px] font-black uppercase mb-0.5 flex justify-between">
            <span>{isMoto ? 'CONFERÊNCIA (BAG)' : 'QTD  DESCRIÇÃO'}</span>
            {!isKit && !isMoto && <span>VALOR</span>}
          </div>

          <div className="space-y-1">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="text-[10px] leading-tight">
                <div className="flex justify-between font-bold">
                  <span>
                    {isMoto ? `[ ] ` : ''}{item.quantity}x {item.name}
                  </span>
                  {!isKit && !isMoto && (
                    <span className="font-mono">{formatCurrency(item.subtotal)}</span>
                  )}
                </div>

                {/* Opcionais / Adicionais */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div className="pl-2 text-[9px] text-gray-800">
                    {item.selectedOptions.map((opt, oIdx) => (
                      <div key={oIdx}>+ {opt}</div>
                    ))}
                  </div>
                )}

                {/* Observação do item */}
                {item.observation && (
                  <div className="pl-2 font-bold text-[9px] uppercase mt-0.5">
                    * OBS: {item.observation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observação Geral do Pedido */}
        {order.observation && (
          <div className="mb-1 p-1 border border-black text-[9px] font-bold uppercase leading-tight bg-gray-50">
            OBS: {order.observation}
          </div>
        )}

        {/* Totais do Balcão */}
        {isCount && (
          <div className="text-[10px] space-y-0.5 pt-0.5 mb-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span>Taxa Entrega:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            {order.serviceFee > 0 && (
              <div className="flex justify-between">
                <span>Taxa Serviço:</span>
                <span>{formatCurrency(order.serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black border-t border-black pt-0.5">
              <span>TOTAL:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[9px] pt-0.5 border-t border-dashed border-black">
              <span>PAGTO: <b>{formatPaymentLabel(order.paymentMethod)}</b></span>
              <span>STATUS: <b>{order.status === 'aguardando_pagamento' ? 'PENDENTE' : 'CONFIRMADO'}</b></span>
            </div>
          </div>
        )}

        {/* Rodapé Curto */}
        <div className="text-[8px] text-center pt-0.5 border-t border-black text-gray-700">
          {isMoto ? 'Dirija com cuidado! | SDG Delivery' : 'SDG Delivery & KDS'}
        </div>
      </div>
    );
  };

  // Auto-cleanup quando a janela de impressão fecha (após imprimir ou cancelar no Chrome)
  React.useEffect(() => {
    if (!printTicket) return;

    const handleAfterPrint = () => {
      closePrintTicket();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Timeout de segurança para não deixar tela travada
    let safetyTimer = null;
    if (printTicket.autoClose) {
      safetyTimer = setTimeout(() => {
        closePrintTicket();
      }, 4000);
    }

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [printTicket, closePrintTicket]);

  const effectivePaper = printTicket?.paperWidth || printerSettings?.paperWidth || '80mm';
  const paperWidthClass = (effectivePaper === 'A4' || effectivePaper === 'a4')
    ? 'paper-a4'
    : (effectivePaper === '58mm' ? 'paper-58mm' : 'paper-80mm');

  return (
    <>
      {/* Visualização na tela (apenas se solicitado explicitamente com showModal) */}
      {printTicket.showModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-xs text-white">
                  {isBoth
                    ? (isDelivery ? 'Comanda Dupla (1ª Balcão & Cozinha + 2ª Motoboy)' : 'Comanda Dupla (1ª Balcão & Caixa + 2ª Cozinha)')
                    : (type === 'motoboy' ? `Via Motoboy (${printerSettings?.paperWidth || '80mm'})` : (type === 'kitchen' ? `Comanda Cozinha (${printerSettings?.paperWidth || '80mm'})` : `Cupom Balcão (${printerSettings?.paperWidth || '80mm'})`))}
                </h3>
              </div>
              <button
                onClick={closePrintTicket}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-mono text-[11px]">
                Impressora Padrão do Sistema ({printerSettings?.paperWidth || '80mm'})
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir na Impressora Padrão</span>
              </button>

              <button
                onClick={closePrintTicket}
                className="w-full py-1.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-all"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Real de Impressão montado direto no body para isolamento total de impressão */}
      {typeof document !== 'undefined' ? createPortal(
        <div id="printable-ticket" className={`printable-ticket text-black font-mono ${paperWidthClass}`}>
          {isBoth ? (
            <>
              {/* Folha 1: Balcão */}
              <div className="ticket-page">
                {renderSingleTicket('counter')}
              </div>
              {/* Folha 2: Motoboy (se delivery) ou Cozinha (se balcão/salão) */}
              <div className="ticket-page">
                {renderSingleTicket(isDelivery ? 'motoboy' : 'kitchen')}
              </div>
            </>
          ) : (
            <div className="ticket-page">
              {renderSingleTicket(type === 'both' ? (isDelivery ? 'motoboy' : 'kitchen') : type)}
            </div>
          )}
        </div>,
        document.body
      ) : null}
    </>
  );
};
