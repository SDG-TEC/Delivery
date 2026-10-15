import React, { useState, useEffect } from 'react';
import {
  X, Trash2, Plus, Minus, QrCode, CreditCard, Banknote,
  MapPin, Phone, User, ShoppingBag, ArrowRight
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency } from '../../utils/formatters';
import { WhatsAppIcon } from '../common/BrandIcons';
import { isHexColorLight } from '../../utils/theme';
import { MediaAttachmentPicker } from '../common/MediaAttachmentPicker';
import confetti from 'canvas-confetti';

export const CartDrawer = ({ isOpen, onClose, onOrderPlaced, onOpenCustomerAuth }) => {
  const { cart, removeFromCart, updateCartQuantity, createOrder, customer, storeSettings } = useOrder();

  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'takeout'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // '' | 'pix' | 'credit_card' | 'cash'
  const [changeFor, setChangeFor] = useState('');
  const [observation, setObservation] = useState('');
  const [mediaList, setMediaList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  const primaryColor = storeSettings?.primaryColor || '#f59e0b';
  const secondaryColor = storeSettings?.secondaryColor || '#ea580c';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  // Preenche automaticamente com os dados salvos do cliente logado
  useEffect(() => {
    if (customer) {
      if (customer.name) setName(customer.name);
      if (customer.phone) setPhone(customer.phone);
      if (customer.address) setAddress(customer.address);
    }
  }, [customer, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setMediaList([]);
      setCopiedPix(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const isFreeDelivery = storeSettings?.freeDeliveryThreshold > 0 && subtotal >= storeSettings.freeDeliveryThreshold;
  const standardFee = Number(storeSettings?.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
  const deliveryFee = deliveryType === 'delivery' ? (isFreeDelivery ? 0 : standardFee) : 0;
  const total = subtotal + deliveryFee;

  // Finalização do Pedido com Envio Oficial para o WhatsApp da Empresa
  const handleCheckoutViaWhatsApp = () => {
    if (!name.trim()) {
      setErrorMsg('Por favor, informe o seu Nome.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor, informe o seu Telefone / WhatsApp.');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      setErrorMsg('Por favor, informe o Endereço de Entrega.');
      return;
    }
    if (!paymentMethod) {
      setErrorMsg('Por favor, selecione como deseja pagar (PIX, Cartão ou Dinheiro).');
      return;
    }

    setErrorMsg('');

    const fullObservation = [
      observation.trim(),
      paymentMethod === 'cash' && changeFor.trim() ? `Troco para: ${changeFor.trim()}` : '',
      paymentMethod === 'credit_card' ? 'Pagamento no Cartão (levar maquininha)' : '',
      paymentMethod === 'pix' ? 'Pagamento via PIX no WhatsApp' : ''
    ].filter(Boolean).join(' | ');

    // 1. Registra o pedido no sistema local e Supabase
    let newOrder;
    try {
      newOrder = createOrder({
        name: name.trim(),
        phone: phone.trim(),
        deliveryType,
        deliveryFee,
        address: deliveryType === 'delivery' ? address.trim() : 'Retirada no Balcão',
        paymentMethod,
        observation: fullObservation,
        media: mediaList
      });
    } catch (err) {
      console.error('Erro ao registrar pedido:', err);
      setErrorMsg(err.message || 'Não foi possível registrar o pedido. Tente novamente.');
      return;
    }

    // 2. Dispara celebração visual de confete
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // 3. Monta a mensagem formatada para o WhatsApp da loja
    const isDelivery = deliveryType === 'delivery';
    const payLabel = paymentMethod === 'pix'
      ? 'PIX'
      : paymentMethod === 'cash'
      ? (changeFor.trim() ? `DINHEIRO (Troco para ${changeFor.trim()})` : 'DINHEIRO')
      : 'CARTÃO (Débito / Crédito)';

    let msg = `🍔 *NOVO PEDIDO #${newOrder.id}* 🍕\n`;
    msg += `----------------------------------------\n`;
    msg += `👤 *Cliente:* ${name.trim()}\n`;
    msg += `📱 *WhatsApp:* ${phone.trim()}\n`;
    msg += `📍 *Tipo:* ${isDelivery ? '🛵 Delivery (Entrega)' : '🛍️ Retirada no Balcão'}\n`;
    if (isDelivery) {
      msg += `🏠 *Endereço:* ${address.trim()}\n`;
    }
    msg += `----------------------------------------\n`;
    msg += `📋 *ITENS DO PEDIDO:*\n`;
    cart.forEach(item => {
      msg += `• ${item.quantity}x *${item.name}* - ${formatCurrency(item.subtotal)}\n`;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        msg += `   └ _Opções: ${item.selectedOptions.join(', ')}_\n`;
      }
      if (item.observation) {
        msg += `   └ _Obs: ${item.observation}_\n`;
      }
    });
    msg += `----------------------------------------\n`;
    msg += `💵 *Subtotal:* ${formatCurrency(subtotal)}\n`;
    if (isDelivery) {
      msg += `🛵 *Taxa de Entrega:* ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}\n`;
    }
    msg += `💰 *TOTAL A PAGAR:* ${formatCurrency(total)}\n`;
    msg += `----------------------------------------\n`;
    msg += `💳 *Forma de Pagamento:* ${payLabel}\n`;
    if (observation.trim()) {
      msg += `📝 *Observação:* ${observation.trim()}\n`;
    }
    if (mediaList && mediaList.length > 0) {
      msg += `----------------------------------------\n`;
      msg += `📎 *ANEXOS / MÍDIAS DO PEDIDO:* \n`;
      mediaList.forEach((m) => {
        if (m.type === 'image') msg += `📸 Foto: ${m.url}\n`;
        else if (m.type === 'audio') msg += `🎙️ Áudio (${m.duration ? `${m.duration}s` : 'Voz'}): ${m.url}\n`;
        else if (m.type === 'video') msg += `🎥 Vídeo: ${m.url}\n`;
      });
    }
    msg += `----------------------------------------\n`;
    if (paymentMethod === 'pix') {
      msg += `⚡ *PIX:* Aguardo a chave PIX ou QR Code da loja para enviar o comprovante!\n`;
    } else if (paymentMethod === 'cash') {
      msg += `💵 *Pagamento em Dinheiro* no momento da ${isDelivery ? 'entrega' : 'retirada'}.\n`;
      if (changeFor && changeFor.trim()) {
        msg += `🪙 *Troco para:* ${changeFor.trim()}\n`;
      }
    } else if (paymentMethod === 'credit_card') {
      msg += `💳 *Pagamento no Cartão:* Por favor, levar a maquininha de cartão no momento da ${isDelivery ? 'entrega' : 'retirada'}.\n`;
    }
    msg += `\nOlá! Acabei de fazer meu pedido pelo cardápio digital e gostaria de confirmar! 😊`;

    // 4. Formata o número de WhatsApp da empresa
    const rawDigits = String(storeSettings?.whatsapp || storeSettings?.phoneSupport || '').replace(/\D/g, '');
    let targetPhone = '';
    if (rawDigits) {
      if (rawDigits.startsWith('55') && rawDigits.length >= 12) {
        targetPhone = rawDigits;
      } else if (rawDigits.length >= 10) {
        targetPhone = `55${rawDigits}`;
      } else {
        targetPhone = rawDigits;
      }
    }

    const encoded = encodeURIComponent(msg);
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');

    onClose();
    onOrderPlaced(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Drawer Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
            <div>
              <h2 className="text-lg font-extrabold text-white">Seu Pedido</h2>
              <p className="text-[11px] text-slate-400">
                {cart.length} {cart.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">

          {/* Cart Items List */}
          {cart.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-400 font-medium text-sm">Seu carrinho está vazio.</p>
              <button
                type="button"
                onClick={onClose}
                className="text-amber-400 text-xs font-bold hover:underline cursor-pointer"
              >
                Voltar ao cardápio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Itens Selecionados</h3>
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {item.selectedOptions.join(', ')}
                      </p>
                    )}
                    {item.observation && (
                      <p className="text-[11px] text-amber-400/90 italic">
                        Obs: {item.observation}
                      </p>
                    )}
                    <div className="text-amber-400 font-extrabold text-xs">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 space-x-2">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(index, -1)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(index, 1)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(index)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-rose-500/10 cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <>
              {/* Delivery vs Takeout Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipo de Entrega</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    style={deliveryType === 'delivery' ? {
                      backgroundColor: primaryColor,
                      color: contrastText
                    } : {}}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      deliveryType === 'delivery'
                        ? 'shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛵 Entrega ({deliveryFee > 0 ? `+ ${formatCurrency(deliveryFee)}` : 'Grátis'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('takeout')}
                    style={deliveryType === 'takeout' ? {
                      backgroundColor: primaryColor,
                      color: contrastText
                    } : {}}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      deliveryType === 'takeout'
                        ? 'shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛍️ Retirada no Balcão
                  </button>
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Seus Dados</h3>
                  {customer && (
                    <span className="text-[10px] text-emerald-400 font-semibold">✓ Dados pré-preenchidos</span>
                  )}
                </div>

                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Seu Nome Completo *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Telefone / WhatsApp (ex: 33999998888) *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>

                {deliveryType === 'delivery' && (
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Endereço Completo com Nº, Bairro e Complemento *"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Campo de Observações do Pedido */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Observações do Pedido (Opcional)
                </label>
                <textarea
                  placeholder="Ex: Tirar cebola, ponto da carne, caprichar no molho, interfone..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* Anexar Fotos, Vídeos ou Áudios */}
              <div className="pt-2 border-t border-slate-800">
                <MediaAttachmentPicker
                  mediaList={mediaList}
                  onChange={setMediaList}
                  folder="orders/client"
                  title="Anexar Foto, Vídeo ou Áudio (Opcional)"
                  subtitle="Comprovante de pagamento, áudio com orientações de entrega ou fotos"
                />
              </div>
            </>
          )}

        </div>

        {/* Drawer Footer - Forma de Pagamento e Finalização no WhatsApp */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 space-y-3">

            {/* Mensagem de Erro de Validação */}
            {errorMsg && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold animate-in fade-in flex items-center space-x-2">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {/* Seletor de Forma de Pagamento - JUNTO AO BOTÃO DE FINALIZAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <span>Forma de Pagamento</span>
                  <span className="text-amber-400">*</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <WhatsAppIcon className="w-3 h-3" colored={true} />
                  <span>Acertado no WhatsApp</span>
                </span>
              </div>

              {/* 3 Botões de Pagamento */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('pix'); setErrorMsg(''); }}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setPaymentMethod('credit_card'); setErrorMsg(''); }}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setPaymentMethod('cash'); setErrorMsg(''); }}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Dinheiro</span>
                </button>
              </div>

              {/* Detalhes contextuais de acordo com o método selecionado */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-2.5 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                      <Banknote className="w-3.5 h-3.5" />
                      Pagamento em Dinheiro
                    </span>
                    <span className="text-[10px] text-slate-400">Na {deliveryType === 'delivery' ? 'entrega' : 'retirada'}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Precisa de troco? Para quanto? (Ex: R$ 50 ou Não)"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                    autoFocus
                  />
                </div>
              )}

              {paymentMethod === 'pix' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pagamento via PIX</span>
                    </div>
                    {storeSettings?.pixKey && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(storeSettings.pixKey);
                          setCopiedPix(true);
                          setTimeout(() => setCopiedPix(false), 2500);
                        }}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 font-bold text-[10px] transition-all cursor-pointer"
                      >
                        {copiedPix ? 'Copiado! ✓' : 'Copiar Chave'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    {storeSettings?.pixKey
                      ? `Chave (${storeSettings.pixKeyType || 'PIX'}): ${storeSettings.pixKey}. Envie o comprovante no WhatsApp.`
                      : 'A chave PIX e o comprovante serão combinados diretamente no WhatsApp.'}
                  </p>
                </div>
              )}

              {paymentMethod === 'credit_card' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-xs flex items-center space-x-2 text-slate-300 animate-in fade-in">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-400 leading-tight">
                    O motoboy levará a maquininha de cartão no local da {deliveryType === 'delivery' ? 'entrega' : 'retirada'}.
                  </span>
                </div>
              )}
            </div>

            {/* Totais do Pedido */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</span>
                <span className="font-semibold text-slate-300">{formatCurrency(subtotal)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-slate-400">
                  <span>Taxa de Entrega</span>
                  <span className="font-semibold text-slate-300">
                    {deliveryFee > 0 ? formatCurrency(deliveryFee) : <span className="text-emerald-400 font-bold">Grátis</span>}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm sm:text-base font-extrabold text-white pt-1.5 border-t border-slate-800">
                <span>Total a Pagar</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Botão Oficial de Envio no WhatsApp */}
            <button
              type="button"
              onClick={handleCheckoutViaWhatsApp}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-98 flex items-center justify-between cursor-pointer group ${
                !paymentMethod
                  ? 'bg-emerald-500/85 hover:bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 shadow-[#25D366]/25'
              }`}
            >
              <div className="flex items-center space-x-2 text-slate-950">
                <WhatsAppIcon className="w-5 h-5 fill-slate-950 shrink-0" colored={false} />
                <span className="tracking-tight text-xs sm:text-sm font-black">
                  {paymentMethod === 'pix' && 'Finalizar no WhatsApp (PIX)'}
                  {paymentMethod === 'cash' && 'Finalizar no WhatsApp (Dinheiro)'}
                  {paymentMethod === 'credit_card' && 'Finalizar no WhatsApp (Cartão)'}
                  {!paymentMethod && 'Escolha o Pagamento e Finalize'}
                </span>
              </div>
              <div className="flex items-center space-x-1 font-extrabold text-xs bg-black/15 px-2.5 py-1 rounded-xl shrink-0">
                <span>{formatCurrency(total)}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <p className="text-[10px] text-center text-slate-400 font-medium leading-tight">
              Ao clicar, seu pedido será registrado e abrirá a conversa com a mensagem pronta no WhatsApp da loja.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
