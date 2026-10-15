import React, { useState, useEffect } from 'react';
import {
  X, Check, Plus, Minus, Trash2, Edit3, ShoppingBag,
  User, Phone, MapPin, DollarSign, Printer, ChefHat, Clock, AlertCircle, XCircle
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, STATUS_MAP, PAYMENT_METHODS } from '../../utils/formatters';

export const OrderEditModal = ({ isOpen, order, onClose, onSave, onPrint }) => {
  const { products, cancelOrder, storeSettings } = useOrder();

  const defaultFee = Number(storeSettings?.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [status, setStatus] = useState('aguardando_pagamento');
  const [observation, setObservation] = useState('');
  const [items, setItems] = useState([]);
  const [motoboyName, setMotoboyName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(defaultFee);

  // Adicionar novo item
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemNotes, setAddItemNotes] = useState('');

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setDeliveryType(order.deliveryType || 'delivery');
      setAddress(order.address || '');
      setPaymentMethod(order.paymentMethod || 'pix');
      setStatus(order.status || 'aguardando_pagamento');
      setObservation(order.observation || '');
      setItems(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
      setMotoboyName(order.motoboyName || order.driverName || order.deliveryGps?.driverName || '');
      setDeliveryFee(order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : defaultFee);
      if (products && products.length > 0) {
        setSelectedProductId(products[0].id);
      }
    }
  }, [order, products, isOpen, defaultFee]);

  if (!isOpen || !order) return null;

  // Modificar quantidade de um item existente
  const handleItemQty = (index, delta) => {
    setItems(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (!target) return prev;
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      target.quantity = newQty;
      const unit = target.unitPriceWithExtras || target.price || 0;
      target.subtotal = unit * newQty;
      return copy;
    });
  };

  // Remover item do pedido
  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Adicionar novo produto ao pedido
  const handleAddNewItem = () => {
    const prod = (products || []).find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Math.max(1, parseInt(addItemQty) || 1);
    const unitPrice = prod.price || 0;

    const newItem = {
      id: prod.id,
      name: prod.name,
      quantity: qty,
      price: prod.price,
      selectedOptions: [],
      unitPriceWithExtras: unitPrice,
      subtotal: unitPrice * qty,
      observation: addItemNotes.trim()
    };

    setItems(prev => [...prev, newItem]);
    setAddItemQty(1);
    setAddItemNotes('');
  };

  // Cálculos financeiros
  const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
  const activeFee = deliveryType === 'delivery' ? (Number(deliveryFee) || 0) : 0.00;
  const currentTotal = itemsSubtotal + activeFee;

  const handleSave = () => {
    if (items.length === 0) {
      return alert('O pedido precisa ter pelo menos um item. Adicione um produto antes de salvar.');
    }
    if (!customerName.trim()) {
      return alert('Por favor, informe o nome do cliente.');
    }

    const updatedOrder = {
      ...order,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType,
      address: deliveryType === 'delivery' ? (address.trim() || 'Endereço a confirmar') : 'Retirada no Balcão',
      motoboyName: motoboyName.trim(),
      driverName: motoboyName.trim(),
      deliveryFee: deliveryType === 'delivery' ? (Number(deliveryFee) || 0) : 0,
      paymentMethod,
      status,
      observation: observation.trim(),
      items,
      total: currentTotal
    };

    onSave(updatedOrder);
    onClose();
  };

  const handleSaveAndLaunch = () => {
    if (items.length === 0) {
      return alert('O pedido precisa ter pelo menos um item. Adicione um produto antes de salvar.');
    }
    if (!customerName.trim()) {
      return alert('Por favor, informe o nome do cliente.');
    }

    const updatedOrder = {
      ...order,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType,
      address: deliveryType === 'delivery' ? (address.trim() || 'Endereço a confirmar') : 'Retirada no Balcão',
      motoboyName: motoboyName.trim(),
      driverName: motoboyName.trim(),
      deliveryFee: deliveryType === 'delivery' ? (Number(deliveryFee) || 0) : 0,
      paymentMethod,
      status: 'pagamento_confirmado', // Lança diretamente na linha de produção da cozinha
      observation: observation.trim(),
      items,
      total: currentTotal
    };

    onSave(updatedOrder);
    if (onPrint) {
      onPrint(updatedOrder, 'kitchen');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Editar Pedido <span className="text-amber-400">{order.id}</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-slate-300">
                  {STATUS_MAP[status]?.label || status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere itens, adicione novos produtos, corrija o endereço ou o status do pedido
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* SEÇÃO 1: ITENS DO PEDIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Itens do Pedido ({items.length})</span>
              </label>
              <span className="text-xs font-black text-emerald-400">
                Subtotal Itens: {formatCurrency(itemsSubtotal)}
              </span>
            </div>

            {/* Lista dos Itens Atuais */}
            <div className="space-y-2 bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800">
              {items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">Nenhum item no pedido.</p>
              ) : (
                items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 gap-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white truncate">{item.name}</span>
                        <span className="text-[11px] text-emerald-400 font-bold">
                          {formatCurrency(item.unitPriceWithExtras || item.price)} un
                        </span>
                      </div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          + {item.selectedOptions.join(', ')}
                        </p>
                      )}
                      {item.observation && (
                        <p className="text-[10px] text-amber-400 italic">
                          Obs: {item.observation}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                      {/* Quantidade */}
                      <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleItemQty(index, -1)}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-black text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleItemQty(index, 1)}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-black text-xs text-white">
                        {formatCurrency(item.subtotal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remover item da comanda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar Novo Item no Pedido */}
            <div className="bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                + Adicionar Item do Cardápio ao Pedido:
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-semibold"
                  >
                    {(products || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatCurrency(p.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={addItemQty}
                    onChange={e => setAddItemQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:border-amber-500 outline-none"
                    placeholder="Qtd"
                  />
                </div>

                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar ao Pedido</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Observação para este item adicionado (opcional, ex: sem salada)"
                value={addItemNotes}
                onChange={e => setAddItemNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DO CLIENTE & ENTREGA */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-4 h-4 text-blue-400" />
              <span>Cliente & Dados da Entrega</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Entrega</label>
                <select
                  value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-bold"
                >
                  <option value="delivery">🛵 Delivery (Com Taxa de Entrega)</option>
                  <option value="takeout">🛍️ Retirada no Balcão (Sem Taxa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                >
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito / Débito</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>
            </div>

            {deliveryType === 'delivery' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Endereço de Entrega</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento, bairro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">Entregador Motoboy</label>
                    <input
                      type="text"
                      value={motoboyName}
                      onChange={e => setMotoboyName(e.target.value)}
                      placeholder="Nome do Motoboy (ex: Carlos, João...)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-bold"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Observações do Pedido</label>
              <textarea
                rows={2}
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder="Observações do cliente ou instruções do atendente"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* SEÇÃO 3: STATUS DO PEDIDO */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Status Operacional do Pedido</span>
            </label>

            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-purple-500 outline-none font-extrabold uppercase"
            >
              <option value="aguardando_pagamento">Aguardando Pagamento (Balcão)</option>
              <option value="pagamento_confirmado">Pagamento Confirmado (Vai para a Cozinha)</option>
              <option value="em_preparo">Em Preparo (Cozinha)</option>
              <option value="pronto">Pronto (Aguardando Retirada ou Motoboy)</option>
              <option value="entregue">Entregue / Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* RESUMO DE VALORES */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal dos Itens:</span>
              <span className="font-bold text-slate-200">{formatCurrency(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxa de Entrega:</span>
              <span className="font-bold text-slate-200">{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-black pt-2 border-t border-slate-800/80">
              <span className="text-white">Total Recalculado:</span>
              <span className="text-amber-400 text-lg">{formatCurrency(currentTotal)}</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          {onPrint && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onPrint({ ...order, items, total: currentTotal, customerName, customerPhone, address, deliveryType, observation, status }, 'counter')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
                title="Imprimir Cupom do Caixa"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir Balcão</span>
              </button>

              <button
                type="button"
                onClick={() => onPrint({ ...order, items, total: currentTotal, customerName, customerPhone, address, deliveryType, observation, status }, 'kitchen')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
                title="Imprimir Ficha da Cozinha"
              >
                <ChefHat className="w-3.5 h-3.5 text-blue-400" />
                <span>Imprimir Cozinha</span>
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            {order.status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  const reason = window.prompt(`Motivo do cancelamento do pedido #${order.id} (opcional):`, 'Cliente desistiu');
                  if (reason !== null) {
                    cancelOrder(order.id, reason);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Cancelar definitivamente este pedido"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar Pedido</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndLaunch}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
              title="Salvar alterações e enviar comanda imediatamente para a Linha de Produção da cozinha"
            >
              <ChefHat className="w-4 h-4 stroke-[2.5]" />
              <span>Lançar na Produção</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
