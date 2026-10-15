import React, { useState, useEffect, useRef } from 'react';
import { useOrder } from '../../context/OrderContext';
import { formatTime, formatCurrency } from '../../utils/formatters';
import {
  ChefHat, Printer, Play, CheckCircle2, Clock, CheckCheck,
  AlertTriangle, Bike, Store, ArrowRightLeft, Send, MapPin, Check, Paperclip, Utensils, ArrowRight
} from 'lucide-react';
import { OrderMediaViewer } from '../common/OrderMediaViewer';
import { OrderMediaModal } from '../common/OrderMediaModal';

export const KitchenView = () => {
  const {
    orders,
    updateOrderStatus,
    dispatchOrder,
    triggerPrintTicket,
    printerSettings,
    printerStatus,
    printTestTicket,
    showPrinterToast
  } = useOrder();

  const [selectedMediaOrder, setSelectedMediaOrder] = useState(null);

  // Kitchen active orders
  const pendingPaymentOrders = orders.filter(o => o.status === 'aguardando_pagamento');
  const newOrders = orders.filter(o => o.status === 'pagamento_confirmado');
  const inPreparation = orders.filter(o => o.status === 'em_preparo');
  const readyOrders = orders.filter(o => o.status === 'pronto');

  // Auto-print setting on the kitchen screen
  const [autoPrintIncoming, setAutoPrintIncoming] = useState(() => {
    const saved = localStorage.getItem('sdg_autoprint_incoming_kitchen');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const printedOrderIds = useRef(new Set());

  useEffect(() => {
    if (!autoPrintIncoming) return;
    newOrders.forEach(order => {
      if (!printedOrderIds.current.has(order.id)) {
        printedOrderIds.current.add(order.id);
        triggerPrintTicket(order, 'kitchen');
      }
    });
  }, [newOrders, autoPrintIncoming]);

  const toggleAutoPrintIncoming = () => {
    setAutoPrintIncoming(prev => {
      const next = !prev;
      localStorage.setItem('sdg_autoprint_incoming_kitchen', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Kitchen KDS Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              <span>Monitor da Cozinha & KDS</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Linha de Produção & Expedição</h1>
            <p className="text-slate-400 text-sm mt-1">
              Ao concluir o prato, escolha se vai para o <b>Motoboy (Entrega)</b> ou para o <b>Balcão (Retirada)</b>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status da Impressora Padrão */}
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1 font-bold text-white text-[11px]">
                  <Printer className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Impressora Padrão ({printerSettings?.paperWidth || '80mm'})</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  🟢 Pronta para imprimir
                </span>
              </div>
              <button
                type="button"
                onClick={() => printTestTicket()}
                className="ml-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-[10px] font-bold transition-all"
                title="Imprimir comanda de teste na impressora Elgin"
              >
                Testar
              </button>
            </div>

            {/* Auto-print toggle for kitchen */}
            <div
              onClick={toggleAutoPrintIncoming}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl border cursor-pointer select-none transition-all ${
                autoPrintIncoming
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
              title="Imprimir automaticamente a comanda na cozinha quando o caixa confirmar o pedido"
            >
              <input
                type="checkbox"
                checked={autoPrintIncoming}
                onChange={toggleAutoPrintIncoming}
                className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-700 cursor-pointer accent-blue-500"
              />
              <div className="text-xs font-bold">
                <div className="flex items-center space-x-1">
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Imprimir Automático</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Para Preparar</div>
              <div className="text-xl font-black text-blue-400">{newOrders.length}</div>
            </div>
            <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Em Preparo</div>
              <div className="text-xl font-black text-purple-400">{inPreparation.length}</div>
            </div>
            <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Prontos</div>
              <div className="text-xl font-black text-emerald-400">{readyOrders.length}</div>
            </div>
          </div>
        </div>

        {/* PENDING PAYMENT ALERT (CLIENT ORDERS AWAITING CASHIER CONFIRMATION) */}
        {pendingPaymentOrders.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
                    {pendingPaymentOrders.length} {pendingPaymentOrders.length === 1 ? 'Pedido Novo Aguardando Caixa' : 'Pedidos Novos Aguardando Caixa'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estes pedidos foram feitos por clientes e aguardam confirmação no Balcão. Você pode adiantar a produção liberando direto para a cozinha:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingPaymentOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-950/80 border border-amber-500/20 rounded-2xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {order.id.slice(-6).toUpperCase()}
                      </span>
                      <h4 className="text-sm font-extrabold text-white line-clamp-1 flex items-center gap-1">
                        {order.customerName || 'Cliente'}
                        {order.isBot && <span title="Via Bot">🤖</span>}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {order.deliveryType === 'delivery' ? '🛵 Entrega' : '🏪 Balcão'} • {formatCurrency(order.total)}
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                      {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PENDENTE'}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="text-[11px] text-slate-300 bg-slate-900/60 rounded-lg p-2 mb-3 max-h-16 overflow-y-auto">
                    {order.items?.map((it, idx) => (
                      <div key={idx} className="truncate">
                        <span className="font-bold text-white">{it.quantity}x</span> {it.name}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      updateOrderStatus(order.id, 'pagamento_confirmado');
                      showPrinterToast?.(`Pedido ${order.id.slice(-4)} liberado para produção!`, 'success');
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>Liberar p/ Cozinha Já</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KANBAN PRODUCTION BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* COLUMN 1: NOVOS PARA PREPARAR */}
          <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                  1. Para Preparar ({newOrders.length})
                </h2>
              </div>
              <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md">
                Pagto Confirmado
              </span>
            </div>

            {newOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                Nenhum novo pedido na fila.
              </div>
            ) : (
              newOrders.map((order) => {
                const isDelivery = order.deliveryType === 'delivery';
                const isDineIn = order.deliveryType === 'dine_in';

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border-2 border-blue-500/60 rounded-2xl p-4 shadow-xl space-y-4 animate-in fade-in"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-blue-400">{order.id}</span>
                          <span className="text-xs text-slate-400 font-semibold">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="font-extrabold text-white text-sm mt-0.5 flex items-center gap-1">
                          {order.customerName}
                          {order.isBot && <span title="Via Bot">🤖</span>}
                        </div>
                      </div>

                      {/* Tag do destino */}
                      {isDineIn ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black border bg-purple-500/15 border-purple-500/40 text-purple-300 flex items-center space-x-1">
                          <Utensils className="w-3 h-3" />
                          <span>{order.address?.includes('Mesa') ? order.address : `Mesa ${order.tableNumber || ''}`}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => dispatchOrder(order.id, { deliveryType: isDelivery ? 'takeout' : 'delivery' })}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center space-x-1 ${
                            isDelivery
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          }`}
                          title="Clique para alternar o destino antes de preparar"
                        >
                          {isDelivery ? <Bike className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                          <span>{isDelivery ? 'Entrega' : 'Balcão'}</span>
                          <ArrowRightLeft className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      )}
                    </div>

                    {/* Order items */}
                    <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="space-y-0.5 border-b border-slate-900 pb-1.5 last:border-none">
                          <div className="flex justify-between font-extrabold text-white">
                            <span>{item.quantity}x {item.name}</span>
                          </div>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="text-[11px] text-amber-400 font-semibold pl-2">
                              {item.selectedOptions.map((opt, oIdx) => (
                                <div key={oIdx}>+ {typeof opt === 'string' ? opt : opt.name}</div>
                              ))}
                            </div>
                          )}
                          {item.observation && (
                            <div className="text-[11px] text-rose-400 font-bold underline pl-2">
                              Obs: {item.observation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.observation && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-300">
                        OBS GERAL: {order.observation}
                      </div>
                    )}

                    {/* Mídias / Áudios do Pedido na Cozinha */}
                    {order.media && order.media.length > 0 && (
                      <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                            <Paperclip className="w-3 h-3" />
                            <span>Mídias do Cliente ({order.media.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMediaOrder(order)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                          >
                            Ver / Ouvir
                          </button>
                        </div>
                        <OrderMediaViewer media={order.media} showInlineAudio={true} maxInlinePhotos={2} />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => triggerPrintTicket(order, 'kitchen')}
                        className="py-2 px-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all flex items-center justify-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ficha Cozinha</span>
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'em_preparo')}
                        className="py-2 px-3 rounded-xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-500 transition-all flex items-center justify-center space-x-1 shadow-md shadow-purple-600/20 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Iniciar Preparo</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* COLUMN 2: EM PREPARO */}
          <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                  2. Em Preparo ({inPreparation.length})
                </h2>
              </div>
              <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md">
                No Fogo / Montando
              </span>
            </div>

            {inPreparation.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                Nenhum prato sendo preparado no momento.
              </div>
            ) : (
              inPreparation.map((order) => {
                const isDelivery = order.deliveryType === 'delivery';
                const isDineIn = order.deliveryType === 'dine_in';

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl p-4 shadow-xl space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-purple-400">{order.id}</span>
                          <span className="text-xs text-slate-400 font-semibold">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="font-extrabold text-white text-sm mt-0.5 flex items-center gap-1">
                          {order.customerName}
                          {order.isBot && <span title="Via Bot">🤖</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white uppercase animate-pulse">
                          PREPARANDO
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 flex items-center justify-end space-x-1">
                          {isDelivery ? (
                            <span className="text-amber-300 flex items-center space-x-1">
                              <Bike className="w-3 h-3" />
                              <span>Para Entrega</span>
                            </span>
                          ) : isDineIn ? (
                            <span className="text-purple-300 flex items-center space-x-1">
                              <Utensils className="w-3 h-3" />
                              <span>{order.address || 'Salão'}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-300 flex items-center space-x-1">
                              <Store className="w-3 h-3" />
                              <span>Para Balcão</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="space-y-0.5 border-b border-slate-900 pb-1.5 last:border-none">
                          <div className="flex justify-between font-extrabold text-white">
                            <span>{item.quantity}x {item.name}</span>
                          </div>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="text-[11px] text-amber-400 font-semibold pl-2">
                              {item.selectedOptions.map((opt, oIdx) => (
                                <div key={oIdx}>+ {typeof opt === 'string' ? opt : opt.name}</div>
                              ))}
                            </div>
                          )}
                          {item.observation && (
                            <div className="text-[11px] text-rose-400 font-bold underline pl-2">
                              Obs: {item.observation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.observation && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-300">
                        OBS: {order.observation}
                      </div>
                    )}

                    {/* Mídias / Áudios do Pedido na Cozinha */}
                    {order.media && order.media.length > 0 && (
                      <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center space-x-1">
                            <Paperclip className="w-3 h-3" />
                            <span>Mídias do Cliente ({order.media.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMediaOrder(order)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 underline font-bold cursor-pointer"
                          >
                            Ver / Ouvir
                          </button>
                        </div>
                        <OrderMediaViewer media={order.media} showInlineAudio={true} maxInlinePhotos={2} />
                      </div>
                    )}

                    {/* DECISÃO DA COZINHA: MANDAR PARA O MOTOBOY OU PARA O BALCÃO */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-black text-slate-400 block text-center">
                        Pronto! Para onde mandar?
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Botão Mandar para o Motoboy */}
                        <button
                          onClick={() => dispatchOrder(order.id, { deliveryType: 'delivery', status: 'pronto' })}
                          className={`py-3 px-2 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-lg ${
                            isDelivery
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/50'
                              : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30'
                          }`}
                          title="Enviar para a expedição e chamar o Motoboy para entrega na rua"
                        >
                          <Bike className="w-4 h-4 stroke-[2.5]" />
                          <span>p/ Motoboy 🛵</span>
                        </button>

                        {/* Botão Mandar para o Balcão */}
                        <button
                          onClick={() => dispatchOrder(order.id, { deliveryType: 'takeout', status: 'pronto' })}
                          className={`py-3 px-2 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-lg ${
                            !isDelivery
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                              : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                          title="Enviar para o Balcão para o cliente retirar no local"
                        >
                          <Store className="w-4 h-4 stroke-[2.5]" />
                          <span>p/ Balcão 🛍️</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* COLUMN 3: PRONTOS PARA EXPEDIÇÃO */}
          <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                  3. Prontos ({readyOrders.length})
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Expedição & Saída
              </span>
            </div>

            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                Nenhum pedido aguardando expedição.
              </div>
            ) : (
              readyOrders.map((order) => {
                const isDelivery = order.deliveryType === 'delivery';
                const isDineIn = order.deliveryType === 'dine_in';

                return (
                  <div
                    key={order.id}
                    className={`bg-slate-900 border-2 rounded-2xl p-4 shadow-xl space-y-3 ${
                      isDelivery ? 'border-amber-500/60' : isDineIn ? 'border-purple-500/60' : 'border-emerald-500/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-base font-black ${isDelivery ? 'text-amber-400' : isDineIn ? 'text-purple-400' : 'text-emerald-400'}`}>
                            {order.id}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="font-extrabold text-white text-sm mt-0.5 flex items-center gap-1">
                          {order.customerName}
                          {order.isBot && <span title="Via Bot">🤖</span>}
                        </div>
                      </div>

                      {/* Destino Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow flex items-center space-x-1 ${
                        isDelivery
                          ? 'bg-amber-500 text-slate-950'
                          : isDineIn
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-500 text-slate-950'
                      }`}>
                        {isDelivery ? <Bike className="w-3.5 h-3.5" /> : isDineIn ? <Utensils className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                        <span>{isDelivery ? 'P/ MOTOBOY' : isDineIn ? 'P/ SALÃO' : 'P/ BALCÃO'}</span>
                      </span>
                    </div>

                    {/* Endereço ou Local de Retirada */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start space-x-1.5">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDelivery ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <span className="font-medium">{order.address || 'Retirada no Balcão'}</span>
                    </div>

                    {/* Mídias / Áudios do Pedido na Cozinha */}
                    {order.media && order.media.length > 0 && (
                      <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
                            <Paperclip className="w-3 h-3" />
                            <span>Mídias do Cliente ({order.media.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMediaOrder(order)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-bold cursor-pointer"
                          >
                            Ver / Ouvir
                          </button>
                        </div>
                        <OrderMediaViewer media={order.media} showInlineAudio={true} maxInlinePhotos={2} />
                      </div>
                    )}

                    {/* Alternância de Destino de Última Hora */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Mudou de ideia?</span>
                      <button
                        onClick={() => dispatchOrder(order.id, { deliveryType: isDelivery ? 'takeout' : 'delivery' })}
                        className="text-amber-400 hover:underline font-bold flex items-center space-x-1"
                        title="Alternar entre entrega com motoboy e retirada no balcão"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Mudar para {isDelivery ? 'Balcão 🛍️' : 'Motoboy 🛵'}</span>
                      </button>
                    </div>

                    {/* Botões de Ação Final */}
                    <div className="space-y-1.5 pt-1">
                      {isDelivery ? (
                        <button
                          onClick={() => dispatchOrder(order.id, { status: 'saiu_para_entrega' })}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <Bike className="w-4 h-4 stroke-[2.5]" />
                          <span>Despachar c/ Motoboy (Em Rota)</span>
                        </button>
                      ) : isDineIn ? (
                        <button
                          onClick={() => dispatchOrder(order.id, { status: 'entregue' })}
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md shadow-purple-600/20 flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <Utensils className="w-4 h-4 stroke-[2.5]" />
                          <span>Servir à Mesa no Salão</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => dispatchOrder(order.id, { status: 'entregue' })}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                          <span>Entregar ao Cliente no Balcão</span>
                        </button>
                      )}

                      <button
                        onClick={() => dispatchOrder(order.id, { status: 'entregue' })}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold text-[11px] transition-all flex items-center justify-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                        <span>Finalizar / Marcar Concluído</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
