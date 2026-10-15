import React, { useState, useMemo } from 'react';
import { QrCode, Copy, Check, ExternalLink, ShieldCheck, AlertCircle, Clock, Smartphone, Sparkles, Building2, User, Phone, Mail, Key } from 'lucide-react';
import { generatePixPayload, PixQrCodeSVG, formatPixKey } from '../../utils/pixGenerator';
import { formatCurrency } from '../../utils/formatters';
import { WhatsAppIcon } from './BrandIcons';

export const PixPaymentCard = ({
  amount = 0,
  orderId = '',
  storeSettings = {},
  onPaymentConfirmed = null,
  onSendWhatsapp = null,
  compact = false,
  showActionButtons = true
}) => {
  const [copied, setCopied] = useState(false);

  const pixKey = storeSettings?.pixKey || '';
  const pixKeyType = storeSettings?.pixKeyType || 'phone';
  const beneficiaryName = storeSettings?.pixBeneficiaryName || storeSettings?.restaurantName || 'SDG DELIVERY';
  const city = storeSettings?.pixCity || 'SAO PAULO';

  // Gera o payload do PIX dinâmico com o valor exato do pedido
  const pixData = useMemo(() => {
    return generatePixPayload({
      pixKey,
      pixKeyType,
      beneficiaryName,
      city,
      amount,
      txid: orderId ? String(orderId).replace(/[^a-zA-Z0-9]/g, '') : '***',
      description: orderId ? `Pedido ${orderId}` : 'Pedido Delivery'
    });
  }, [pixKey, pixKeyType, beneficiaryName, city, amount, orderId]);

  const handleCopy = () => {
    if (!pixData.payload) return;
    try {
      navigator.clipboard.writeText(pixData.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      // Fallback
      const input = document.createElement('textarea');
      input.value = pixData.payload;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getKeyTypeIcon = () => {
    switch (pixKeyType) {
      case 'phone': return <Phone className="w-3.5 h-3.5" />;
      case 'cnpj': return <Building2 className="w-3.5 h-3.5" />;
      case 'cpf': return <User className="w-3.5 h-3.5" />;
      case 'email': return <Mail className="w-3.5 h-3.5" />;
      case 'random': return <Key className="w-3.5 h-3.5" />;
      default: return <QrCode className="w-3.5 h-3.5" />;
    }
  };

  const getKeyTypeLabel = () => {
    switch (pixKeyType) {
      case 'phone': return 'Celular / WhatsApp';
      case 'cnpj': return 'CNPJ';
      case 'cpf': return 'CPF';
      case 'email': return 'E-mail';
      case 'random': return 'Chave Aleatória (EVP)';
      default: return 'Chave PIX';
    }
  };

  if (!pixKey) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-white">Chave PIX não cadastrada</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          O administrador do restaurante precisa cadastrar a Chave PIX no painel administrativo (na aba <strong>Personalizar Loja</strong>) para que o QR Code e o Copia e Cola sejam gerados automaticamente com o valor do pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      
      {/* Cabeçalho com Valor do Pedido */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <QrCode className="w-4 h-4" />
            <span>Pagar com PIX Instantâneo</span>
          </div>
          {orderId && (
            <span className="text-[11px] text-slate-400 font-mono">Pedido #{orderId}</span>
          )}
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor a pagar:</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* QR Code Centralizado em Alta Definição */}
      <div className="flex flex-col items-center justify-center space-y-3 py-1">
        <div className="p-3 bg-white rounded-3xl shadow-xl ring-4 ring-amber-500/20 border-2 border-amber-400/40 transition-transform hover:scale-[1.02]">
          <PixQrCodeSVG
            payload={pixData.payload}
            size={compact ? 170 : 210}
            margin={1}
            color="#090d16"
            bgColor="#ffffff"
          />
        </div>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-extrabold">
            <Sparkles className="w-3 h-3" />
            <span>Valor de {formatCurrency(amount)} já embutido no QR Code</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Aponte a câmera do aplicativo do seu banco para pagar
          </p>
        </div>
      </div>

      {/* Botão de 1 Clique: Copiar Código Pix Copia e Cola */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center space-x-2 active:scale-95 ${
            copied
              ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 shadow-amber-500/20'
          }`}
        >
          {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
          <span>{copied ? 'Código Pix Copiado com Sucesso!' : 'Copiar Código Pix (Copia e Cola)'}</span>
        </button>

        {/* Input Read-only com o código Pix para visualização/cópia manual */}
        <div className="relative">
          <input
            type="text"
            readOnly
            value={pixData.payload}
            onClick={(e) => { e.target.select(); handleCopy(); }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-400 font-mono truncate focus:border-amber-500 outline-none cursor-pointer"
            title="Clique para selecionar todo o código"
          />
          <span className="absolute right-2 top-2 text-[9px] text-slate-500 font-bold uppercase pointer-events-none">
            {copied ? 'Copiado!' : 'Clique p/ copiar'}
          </span>
        </div>
      </div>

      {/* Dados do Recebedor (Chave cadastrada no Admin) */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center space-x-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dados da Conta do Restaurante:</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
            {getKeyTypeIcon()}
            <span>{getKeyTypeLabel()}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
          <div>
            <span className="text-slate-500 block text-[10px]">Titular / Razão Social:</span>
            <span className="font-extrabold text-white truncate block">{beneficiaryName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Chave PIX:</span>
            <span className="font-extrabold text-amber-300 font-mono truncate block">{pixKey}</span>
          </div>
        </div>
      </div>

      {/* Passo a Passo Rápido para o Cliente */}
      <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50">
        <div className="font-bold text-slate-300 uppercase text-[10px] flex items-center space-x-1">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Como pagar pelo celular:</span>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 pl-1">
          <li>Clique no botão acima para <strong>Copiar o Código Pix</strong></li>
          <li>Abra o aplicativo do seu banco e acesse a opção <strong>Pix</strong></li>
          <li>Escolha <strong>Pix Copia e Cola</strong> e cole o código</li>
          <li>Confirme o pagamento no valor de <strong>{formatCurrency(amount)}</strong></li>
        </ol>
      </div>

      {/* Ações de Conclusão do Pedido */}
      {showActionButtons && (
        <div className="space-y-2 pt-1 border-t border-slate-800">
          {onPaymentConfirmed && (
            <button
              type="button"
              onClick={onPaymentConfirmed}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Já realizei o pagamento! Concluir Pedido</span>
            </button>
          )}

          {onSendWhatsapp && (
            <button
              type="button"
              onClick={onSendWhatsapp}
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <WhatsAppIcon className="w-4 h-4" colored={false} />
              <span>Enviar Pedido & Comprovante no WhatsApp</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
