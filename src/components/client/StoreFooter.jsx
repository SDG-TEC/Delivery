import React from 'react';
import { useOrder } from '../../context/OrderContext';
import { WhatsAppIcon, InstagramIcon } from '../common/BrandIcons';
import { formatWhatsAppLink, formatInstagramInfo } from '../../utils/theme';
import { MapPin, Clock, Phone, Utensils, ShieldCheck, Heart, Sparkles, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const StoreFooter = () => {
  const { storeSettings, setCurrentView } = useOrder();

  const settings = storeSettings || {};
  const restaurantName = settings.restaurantName || 'SDG Burger & Pizza';
  const slogan = settings.slogan || 'Os melhores lanches e pizzas da região';
  const logoUrl = settings.logoUrl;
  const address = settings.address || 'Rua Principal do Delivery, 500 - Centro';
  const openingHours = settings.openingHours || 'Terça a Domingo: 18:00 às 23:30';
  const phone = settings.whatsapp || settings.phoneSupport || '';
  
  const whatsappUrl = formatWhatsAppLink(
    phone,
    settings.whatsappMessage || `Olá! Vim pelo cardápio do ${restaurantName} e gostaria de tirar uma dúvida.`
  );

  const { handle: igHandle, url: igUrl } = formatInstagramInfo(settings.instagram);

  return (
    <footer className="mt-16 bg-slate-900 border-t border-slate-800/80 rounded-t-3xl pt-10 pb-16 px-4 sm:px-6 lg:px-8 text-slate-300">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Top Footer: Brand, Contact Buttons & Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Slogan (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={restaurantName}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[var(--brand-primary,#f59e0b)] to-[var(--brand-secondary,#ea580c)] flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {restaurantName}
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-snug">
                  {slogan}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Faça seu pedido online de forma rápida e segura. Preparamos cada item com ingredientes selecionados e muito carinho para você!
            </p>

            {/* Social & Contact Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-2 bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white px-4 py-2.5 rounded-2xl border border-[#25D366]/30 font-extrabold text-xs transition-all shadow-md active:scale-95 group"
                >
                  <WhatsAppIcon className="w-4 h-4" colored={false} />
                  <span>Chamar no WhatsApp</span>
                </a>
              )}

              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-2 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 hover:from-pink-500 hover:to-purple-600 text-pink-400 hover:text-white px-4 py-2.5 rounded-2xl border border-pink-500/30 font-extrabold text-xs transition-all shadow-md active:scale-95 group"
                >
                  <InstagramIcon className="w-4 h-4" colored={false} />
                  <span>{igHandle || 'Instagram'}</span>
                </a>
              )}
            </div>
          </div>

          {/* Details & Location (4 cols) */}
          <div className="md:col-span-4 space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
              <span>Atendimento & Localização</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-start space-x-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 font-medium leading-relaxed">
                  {address}
                </span>
              </div>

              <div className="flex items-start space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 font-medium">
                  {openingHours}
                </span>
              </div>

              {phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-300 font-bold">{phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Guarantees (3 cols) */}
          <div className="md:col-span-3 space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantia & Entrega</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Tempo médio: <b className="text-white">{settings.deliveryTime || '30 - 45 min'}</b></span>
              </div>

              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>
                  {settings.freeDeliveryThreshold > 0
                    ? `Frete Grátis acima de ${formatCurrency(settings.freeDeliveryThreshold)}`
                    : 'Entrega rápida e segura'}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Pagamento via PIX, Cartão ou Dinheiro</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Discreet Staff Links */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center space-x-2">
            <span>© {new Date().getFullYear()} <b>{restaurantName}</b>. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center space-x-1 text-slate-400">
              <Sparkles className="w-3 h-3 text-[var(--brand-primary,#f59e0b)]" />
              <span>Cardápio Digital Oficial</span>
            </span>

            {/* Quick staff link */}
            <button
              onClick={() => setCurrentView('admin')}
              className="text-slate-500 hover:text-slate-300 hover:underline transition-colors"
              title="Área restrita da equipe"
            >
              Acesso Gestor / Balcão
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
