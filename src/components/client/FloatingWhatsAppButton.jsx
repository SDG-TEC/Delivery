import React, { useState } from 'react';
import { WhatsAppIcon } from '../common/BrandIcons';
import { useOrder } from '../../context/OrderContext';
import { formatWhatsAppLink } from '../../utils/theme';
import { MessageCircle, X } from 'lucide-react';

export const FloatingWhatsAppButton = () => {
  const { storeSettings, cart } = useOrder();
  const [showTooltip, setShowTooltip] = useState(true);

  if (!storeSettings || storeSettings.showFloatingWhatsApp === false) {
    return null;
  }

  const phone = storeSettings.whatsapp || storeSettings.phoneSupport || '';
  if (!phone.replace(/\D/g, '')) {
    return null;
  }

  const message = storeSettings.whatsappMessage || `Olá! Vim pelo cardápio do ${storeSettings.restaurantName || 'Delivery'} e gostaria de tirar uma dúvida.`;
  const whatsappUrl = formatWhatsAppLink(phone, message);

  const hasCartItems = cart && cart.length > 0;

  return (
    <div
      className={`fixed right-4 z-40 transition-all duration-300 flex items-center space-x-2 ${
        hasCartItems ? 'bottom-24 sm:bottom-6' : 'bottom-6'
      }`}
    >
      {/* Tooltip / Balão de Fala */}
      {showTooltip && (
        <div className="hidden sm:flex items-center space-x-2 bg-slate-900/95 border border-slate-700 text-white text-xs px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-300">
          <span className="font-bold">Dúvidas? Fale no Whats!</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded-full"
            title="Fechar balão"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Botão Flutuante Circular */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group relative flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl hover:shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-all duration-200"
        title="Falar com o Restaurante no WhatsApp"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25 group-hover:opacity-40"></span>
        <WhatsAppIcon className="w-8 h-8 relative z-10" colored={false} />
      </a>
    </div>
  );
};
