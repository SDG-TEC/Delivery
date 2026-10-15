import React from 'react';
import { Star, Clock, MapPin, Search, ShoppingBag, Utensils, CheckCircle2, Award, User, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency } from '../../utils/formatters';
import { formatWhatsAppLink, formatInstagramInfo, isHexColorLight } from '../../utils/theme';
import { WhatsAppIcon, InstagramIcon } from '../common/BrandIcons';

export const HeaderBanner = ({ searchQuery, setSearchQuery, onOpenCart, onOpenCustomerAuth }) => {
  const { cart, customer, storeSettings, setCurrentView } = useOrder();
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const settings = storeSettings || {};
  const restaurantName = settings.restaurantName || 'SDG Burger & Pizza';
  const slogan = settings.slogan || 'Artesanais, Pizzas & Delivery no WhatsApp';
  const primaryColor = settings.primaryColor || '#f59e0b';
  const secondaryColor = settings.secondaryColor || '#ea580c';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  const whatsappPhone = settings.whatsapp || settings.phoneSupport || '';
  const whatsappUrl = formatWhatsAppLink(
    whatsappPhone,
    settings.whatsappMessage || `Olá! Vim pelo cardápio do ${restaurantName} e gostaria de tirar uma dúvida.`
  );

  const { handle: igHandle, url: igUrl } = formatInstagramInfo(settings.instagram);

  return (
    <div className="relative overflow-hidden bg-slate-900 rounded-3xl border border-slate-800 mb-6 shadow-2xl">
      
      {/* 1. Promotional Marquee Notice (com as cores da marca do delivery) */}
      {settings.showBannerNotice && settings.bannerNotice && (
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            color: contrastText
          }}
          className="font-black text-xs py-2 px-4 text-center tracking-wide flex items-center justify-center space-x-2 shadow-inner"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span className="truncate">{settings.bannerNotice}</span>
        </div>
      )}

      {/* 2. Cover Photo Banner */}
      <div className="relative h-36 sm:h-52 w-full overflow-hidden bg-slate-950">
        <img
          src={settings.coverUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"}
          alt={restaurantName}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        
        {/* Loyalty Club Top Banner Shortcut */}
        <button
          onClick={onOpenCustomerAuth}
          className="absolute top-4 left-4 z-10 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-[var(--brand-primary,#f59e0b)]/40 text-[var(--brand-primary,#f59e0b)] font-extrabold text-[11px] sm:text-xs shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Ver meus prêmios de fidelidade e histórico"
        >
          <Award className="w-3.5 h-3.5 text-[var(--brand-primary,#f59e0b)]" />
          {customer ? (
            <span>👑 {customer.name.split(' ')[0]} ({customer.total_orders || 1} Pedidos)</span>
          ) : (
            <span>🎁 Ganhe Prêmios (Entrar / Cadastrar)</span>
          )}
        </button>

        {/* Top Right Controls: Atalho para Gestão/Equipe + Status Pill */}
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('counter')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white font-extrabold text-[11px] sm:text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="Acesso da Equipe (Balcão, Cozinha, Admin)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Painel da Equipe</span>
          </button>

          {/* Status Pill (Aberto / Fechado) */}
          <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            {settings.isOpen !== false ? (
              <div className="flex items-center space-x-1.5 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>ABERTO AGORA</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-md">
                <span className="w-2 h-2 rounded-full bg-rose-200"></span>
                <span>FECHADO NO MOMENTO</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Profile & Info Section */}
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
          
          {/* Avatar / Logotipo Customizado da Loja */}
          <div className="flex items-end space-x-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 border-4 border-slate-900 shadow-2xl overflow-hidden flex items-center justify-center p-1 group shrink-0">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={restaurantName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  className="w-full h-full rounded-xl flex items-center justify-center shadow-inner"
                >
                  <Utensils className="w-10 h-10 text-slate-950 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="pb-1">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {restaurantName}
                </h1>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" title="Delivery Oficial" />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5 max-w-lg">
                {slogan}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Login & Cart) */}
          <div className="flex items-center space-x-2 self-start sm:self-end w-full sm:w-auto">
            {/* Customer Auth / Loyalty Button */}
            <button
              onClick={onOpenCustomerAuth}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[var(--brand-primary,#f59e0b)]/40 text-slate-200 hover:text-[var(--brand-primary,#f59e0b)] font-bold text-xs transition-all shadow-md active:scale-95"
            >
              {customer?.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt={customer.name}
                  className="w-5 h-5 rounded-full object-cover border border-[var(--brand-primary,#f59e0b)]/40 shrink-0"
                />
              ) : (
                <User className="w-4 h-4 text-[var(--brand-primary,#f59e0b)] shrink-0" />
              )}
              <span>
                {customer ? `Olá, ${customer.name.split(' ')[0]}` : 'Cadastrar / Entrar'}
              </span>
              {customer && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--brand-primary,#f59e0b)]/20 text-[var(--brand-primary,#f59e0b)] text-[10px] font-black border border-[var(--brand-primary,#f59e0b)]/30">
                  ⭐ {customer.total_orders || 1}
                </span>
              )}
            </button>

            {/* Quick Cart Button com a Cor Primária da Loja */}
            <button
              onClick={onOpenCart}
              style={{
                backgroundColor: primaryColor,
                color: contrastText
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl font-extrabold text-sm hover:brightness-105 transition-all shadow-lg active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sacola</span>
              {totalCartItems > 0 && (
                <span
                  style={{
                    backgroundColor: isLight ? '#0f172a' : '#ffffff',
                    color: isLight ? '#ffffff' : '#0f172a'
                  }}
                  className="ml-1 px-2 py-0.5 text-xs rounded-full font-black shadow"
                >
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4. Badges / Metrics Row + Redes Sociais da Loja */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800/80">
          <div className="flex items-center space-x-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-extrabold text-white">4.9</span>
            <span className="text-slate-500 text-[11px]">(500+ pedidos)</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>{settings.deliveryTime || '30 - 45 min'}</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {settings.deliveryFee > 0 ? `Taxa: ${formatCurrency(settings.deliveryFee)}` : 'Entrega Grátis'}
              {settings.freeDeliveryThreshold > 0 && (
                <span className="text-emerald-400 font-bold ml-1">
                  (Grátis acima de {formatCurrency(settings.freeDeliveryThreshold)})
                </span>
              )}
            </span>
          </div>

          {/* Redes Sociais Oficiais no Topo (WhatsApp e Instagram) */}
          <div className="flex items-center space-x-2 ml-auto">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white px-3 py-1.5 rounded-xl border border-[#25D366]/30 font-bold transition-all shadow-sm group"
                title="Conversar com o restaurante no WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" colored={false} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-pink-500/15 to-purple-500/15 hover:from-pink-500 hover:to-purple-600 text-pink-400 hover:text-white px-3 py-1.5 rounded-xl border border-pink-500/30 font-bold transition-all shadow-sm group"
                title="Seguir o restaurante no Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5" colored={false} />
                <span className="hidden sm:inline">{igHandle || 'Instagram'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Aviso de Loja Fechada se estiver pausada */}
        {settings.isOpen === false && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {settings.closedMessage || 'Estamos fechados no momento. Você ainda pode visualizar o cardápio!'}
            </span>
          </div>
        )}

        {/* 5. Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="O que você gostaria de comer hoje? (Ex: smash, pepperoni, coca...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--brand-primary,#f59e0b)] transition-all"
          />
        </div>

      </div>
    </div>
  );
};
