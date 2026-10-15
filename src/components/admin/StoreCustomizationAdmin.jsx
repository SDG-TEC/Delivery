import React, { useState } from 'react';
import {
  Palette, Image, Sparkles, Check, Clock, DollarSign,
  Phone, MapPin, Store, AlertTriangle, Eye, Upload, CheckCircle2,
  Utensils, ExternalLink, MessageCircle, Sliders, Smartphone, Star,
  Loader2, QrCode, Copy, ShieldCheck, Building2, User, Mail, Key,
  Navigation, Crosshair
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency } from '../../utils/formatters';
import { THEME_PRESETS, isHexColorLight, formatWhatsAppLink, formatInstagramInfo } from '../../utils/theme';
import { WhatsAppIcon, InstagramIcon } from '../common/BrandIcons';
import { uploadMediaToSupabase } from '../../services/storageService';
import { PixPaymentCard } from '../common/PixPaymentCard';

const PRESET_COVERS = [
  {
    name: 'Burger Gourmet',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Pizzaria Forno à Lenha',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Açaí & Sobremesas',
    url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Sushi & Culinária Oriental',
    url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Gourmet Noturno & Bar',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'American Diner',
    url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80'
  }
];

const PRESET_LOGOS = [
  { name: 'Ícone Padrão', url: '' },
  { name: 'Smash Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
  { name: 'Pizza Artesanal', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=300&q=80' },
  { name: 'Açaí Tropical', url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=300&q=80' },
  { name: 'Sushi Bar', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80' },
  { name: 'Doceria & Bolos', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80' }
];

export const StoreCustomizationAdmin = () => {
  const { storeSettings, updateStoreSettings } = useOrder();

  const [formData, setFormData] = useState({
    restaurantName: storeSettings?.restaurantName || 'SDG Burger & Pizza',
    slogan: storeSettings?.slogan || 'Artesanais, Pizzas & Delivery no WhatsApp',
    logoUrl: storeSettings?.logoUrl || '',
    coverUrl: storeSettings?.coverUrl || PRESET_COVERS[0].url,
    themePreset: storeSettings?.themePreset || 'amber',
    primaryColor: storeSettings?.primaryColor || '#f59e0b',
    secondaryColor: storeSettings?.secondaryColor || '#ea580c',
    isOpen: storeSettings?.isOpen !== false,
    closedMessage: storeSettings?.closedMessage || 'Estamos fechados no momento. Nosso horário de atendimento é de Terça a Domingo das 18h às 23h30.',
    deliveryTime: storeSettings?.deliveryTime || '30 - 45 min',
    deliveryFee: storeSettings?.deliveryFee !== undefined ? String(storeSettings.deliveryFee) : '5.00',
    freeDeliveryThreshold: storeSettings?.freeDeliveryThreshold !== undefined ? String(storeSettings.freeDeliveryThreshold) : '80.00',
    bannerNotice: storeSettings?.bannerNotice || '🔥 PROMOÇÃO: Frete Grátis em pedidos acima de R$ 80!',
    showBannerNotice: storeSettings?.showBannerNotice !== false,
    phoneSupport: storeSettings?.phoneSupport || '(33) 99999-8888',
    whatsapp: storeSettings?.whatsapp || '(33) 99999-8888',
    whatsappMessage: storeSettings?.whatsappMessage || 'Olá! Vim pelo cardápio digital e gostaria de tirar uma dúvida.',
    showFloatingWhatsApp: storeSettings?.showFloatingWhatsApp !== false,
    instagram: storeSettings?.instagram || '@sdgdelivery',
    address: storeSettings?.address || 'Centro, Almenara - MG',
    latitude: storeSettings?.latitude !== undefined && Math.abs(Number(storeSettings.latitude) - (-23.550520)) > 0.01 ? String(storeSettings.latitude) : '-16.1834',
    longitude: storeSettings?.longitude !== undefined && Math.abs(Number(storeSettings.longitude) - (-46.633308)) > 0.01 ? String(storeSettings.longitude) : '-40.6936',
    openingHours: storeSettings?.openingHours || 'Terça a Domingo: 18:00 às 23:30',
    // Configurações PIX Oficiais
    pixKey: storeSettings?.pixKey || '(33) 99999-8888',
    pixKeyType: storeSettings?.pixKeyType || 'phone',
    pixBeneficiaryName: storeSettings?.pixBeneficiaryName || storeSettings?.restaurantName || 'SDG Burger & Pizza',
    pixCity: storeSettings?.pixCity && storeSettings.pixCity !== 'Sao Paulo' ? storeSettings.pixCity : 'Almenara',
    pixEnabled: storeSettings?.pixEnabled !== false
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [testPixAmount, setTestPixAmount] = useState('34.90');

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setUploadStatusMsg('Otimizando e enviando logotipo ao Supabase Storage...');
    const result = await uploadMediaToSupabase(file, { folder: 'store', maxDim: 600 });
    setUploadingLogo(false);

    if (result.url) {
      setFormData(prev => {
        const updated = { ...prev, logoUrl: result.url };
        updateStoreSettings(updated);
        return updated;
      });
      setUploadStatusMsg(result.isFallback ? 'Aviso: Imagem salva localmente.' : '✅ Logotipo salvo no Supabase com sucesso!');
      setTimeout(() => setUploadStatusMsg(''), 4000);
    } else {
      setUploadStatusMsg('Erro ao enviar imagem: ' + (result.error || 'Falha no upload'));
      setTimeout(() => setUploadStatusMsg(''), 4000);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setUploadStatusMsg('Otimizando e enviando foto de capa ao Supabase Storage...');
    const result = await uploadMediaToSupabase(file, { folder: 'store', maxDim: 1400 });
    setUploadingCover(false);

    if (result.url) {
      setFormData(prev => {
        const updated = { ...prev, coverUrl: result.url };
        updateStoreSettings(updated);
        return updated;
      });
      setUploadStatusMsg(result.isFallback ? 'Aviso: Imagem salva localmente.' : '✅ Foto de capa salva no Supabase com sucesso!');
      setTimeout(() => setUploadStatusMsg(''), 4000);
    } else {
      setUploadStatusMsg('Erro ao enviar imagem: ' + (result.error || 'Falha no upload'));
      setTimeout(() => setUploadStatusMsg(''), 4000);
    }
  };

  const handleSelectPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      themePreset: preset.id,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary
    }));
  };

  const handleSetAlmenaraCoords = () => {
    setFormData(prev => ({
      ...prev,
      address: 'Centro, Almenara - MG',
      latitude: '-16.1834',
      longitude: '-40.6936',
      pixCity: 'Almenara'
    }));
  };

  const handleGetDeviceCoords = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
      },
      err => {
        alert('Não foi possível obter coordenadas via GPS');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const feeNum = parseFloat(String(formData.deliveryFee).replace(',', '.'));
    const freeNum = parseFloat(String(formData.freeDeliveryThreshold).replace(',', '.'));
    const latNum = parseFloat(String(formData.latitude).replace(',', '.'));
    const lngNum = parseFloat(String(formData.longitude).replace(',', '.'));

    updateStoreSettings({
      ...formData,
      deliveryFee: isNaN(feeNum) ? 5.00 : feeNum,
      freeDeliveryThreshold: isNaN(freeNum) ? 0 : freeNum,
      latitude: isNaN(latNum) ? -16.1834 : latNum,
      longitude: isNaN(lngNum) ? -40.6936 : lngNum
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isLight = isHexColorLight(formData.primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  const previewWhatsappUrl = formatWhatsAppLink(formData.whatsapp || formData.phoneSupport, formData.whatsappMessage);
  const { handle: previewIgHandle, url: previewIgUrl } = formatInstagramInfo(formData.instagram);

  return (
    <div className="space-y-8">
      {/* Header da Seção */}
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[var(--brand-primary,#f59e0b)]/10 border border-[var(--brand-primary,#f59e0b)]/20 text-[var(--brand-primary,#f59e0b)] text-xs font-bold uppercase mb-2">
            <Palette className="w-3.5 h-3.5" />
            <span>Identidade Visual, Cores & Redes Sociais</span>
          </div>
          <h2 className="text-2xl font-black text-white">Personalização do Cardápio do Cliente</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Configure o nome do seu delivery, logotipo, cores da sua marca, WhatsApp oficial e Instagram para os clientes.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          style={{
            backgroundColor: formData.primaryColor,
            color: contrastText
          }}
          className="py-3 px-6 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center space-x-2 shrink-0 self-start md:self-center active:scale-95 hover:brightness-105"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{savedSuccess ? 'Salvo no Banco & Nuvem!' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Grid Principal: Formulário na Esquerda & Pré-Visualização na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulário de Configuração (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          
          {/* GRUPO 1: CORES E IDENTIDADE VISUAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Palette className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
              <span>1. Cores da Marca (Paleta do Cardápio)</span>
            </h3>

            <p className="text-xs text-slate-400">
              Escolha uma paleta gastronômica pronta ou defina exatamente o código hexadecimal da cor da sua empresa:
            </p>

            {/* Paletas Rápidas com 1 clique */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = formData.themePreset === preset.id || (formData.primaryColor === preset.primary && formData.secondaryColor === preset.secondary);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-white bg-slate-800/90 ring-2 ring-white/30 shadow-md'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-2">
                      <span className="w-4 h-4 rounded-full shadow" style={{ backgroundColor: preset.primary }}></span>
                      <span className="w-3 h-3 rounded-full opacity-80" style={{ backgroundColor: preset.secondary }}></span>
                    </div>
                    <div className="text-[11px] font-black text-white line-clamp-1">{preset.name}</div>
                    <div className="text-[9px] text-slate-400 line-clamp-1">{preset.category}</div>
                  </button>
                );
              })}
            </div>

            {/* Seletor Livre de Cores (Color Pickers) */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Personalização Livre de Cores (Hexadecimal):</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Cor Primária (Botões, Sacola, Destaques)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={e => setFormData({ ...formData, primaryColor: e.target.value, themePreset: 'custom' })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={e => setFormData({ ...formData, primaryColor: e.target.value, themePreset: 'custom' })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Cor Secundária (Degradê & Detalhes)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={e => setFormData({ ...formData, secondaryColor: e.target.value, themePreset: 'custom' })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={e => setFormData({ ...formData, secondaryColor: e.target.value, themePreset: 'custom' })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                      placeholder="#EA580C"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Exemplo */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Exemplo de Botão no Cardápio:</span>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})`,
                    color: contrastText
                  }}
                  className="px-4 py-2 rounded-xl font-black text-xs shadow-md flex items-center space-x-1.5"
                >
                  <span>Adicionar ao Pedido</span>
                  <span>• R$ 34,90</span>
                </div>
              </div>
            </div>

          </div>

          {/* GRUPO 2: LOGOTIPO, NOME & BANNER DA LOJA */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Store className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
              <span>2. Nome, Logotipo & Banner</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nome do Estabelecimento *</label>
              <input
                type="text"
                required
                value={formData.restaurantName}
                onChange={e => setFormData({ ...formData, restaurantName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none font-bold"
                placeholder="Ex: Pizzaria Forno & Sabor, Burger do Chef, etc."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Slogan ou Subtítulo</label>
              <input
                type="text"
                value={formData.slogan}
                onChange={e => setFormData({ ...formData, slogan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                placeholder="Ex: As melhores pizzas artesanais e hambúrgueres no WhatsApp"
              />
            </div>

            {/* Feedback de Upload em Tempo Real */}
            {uploadStatusMsg && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{uploadStatusMsg}</span>
              </div>
            )}

            {/* Logotipo da Loja */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-300">
                  Logotipo da Loja
                </label>

                {/* Botão de Upload de Arquivo para Supabase */}
                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95 shrink-0">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingLogo ? 'Otimizando & Enviando...' : '📷 Carregar Foto/Logo do Dispositivo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-md">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                      className="w-full h-full rounded-xl flex items-center justify-center"
                    >
                      <Utensils className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                    placeholder="URL direta da imagem (preenchida automaticamente ao carregar arquivo)"
                  />
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remover logotipo e usar ícone temático
                    </button>
                  )}
                </div>
              </div>

              {/* Modelos rápidos de Logo */}
              <span className="text-[10px] text-slate-500 font-bold block uppercase mt-2">Ou escolha um modelo pronto:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_LOGOS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: item.url })}
                    className={`p-1.5 rounded-xl border text-center transition-all ${
                      formData.logoUrl === item.url
                        ? 'border-white bg-slate-800 ring-2 ring-white/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 mx-auto rounded-lg overflow-hidden bg-slate-900 mb-1 flex items-center justify-center">
                      {item.url ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Utensils className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 block truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Imagem de Capa do Banner */}
            <div className="space-y-2.5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-300">
                  Foto de Capa do Cardápio (Banner Superior)
                </label>

                {/* Botão de Upload da Capa para Supabase */}
                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95 shrink-0">
                  {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingCover ? 'Otimizando & Enviando...' : '📷 Carregar Capa do Dispositivo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="url"
                value={formData.coverUrl}
                onChange={e => setFormData({ ...formData, coverUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                placeholder="URL da foto de capa (preenchida automaticamente ao carregar arquivo)"
              />

              <span className="text-[10px] text-slate-500 font-bold block uppercase">Capas em Alta Definição:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, coverUrl: cov.url })}
                    className={`relative h-14 rounded-xl overflow-hidden border text-left p-1.5 transition-all group ${
                      formData.coverUrl === cov.url
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={cov.url} alt={cov.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent"></div>
                    <span className="relative z-10 text-[10px] font-black text-white line-clamp-1 self-end">
                      {cov.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRUPO 3: CONTATOS OFICIAIS & REDES SOCIAIS (WHATSAPP & INSTAGRAM) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>3. WhatsApp Oficial & Redes Sociais</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* WhatsApp Oficial */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                  <WhatsAppIcon className="w-4 h-4" colored={false} />
                  <span>WhatsApp Oficial com DDD *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value, phoneSupport: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                  placeholder="(11) 99999-8888"
                />
                <span className="text-[10px] text-slate-500">Número para onde os clientes mandam mensagens</span>
              </div>

              {/* Instagram Oficial */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                  <InstagramIcon className="w-4 h-4" colored={false} />
                  <span>Instagram da Loja (@usuario)</span>
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-pink-500 outline-none font-bold"
                  placeholder="@seurestaurante ou link do Instagram"
                />
                <span className="text-[10px] text-slate-500">Exibido no banner e no rodapé do cliente</span>
              </div>
            </div>

            {/* Mensagem Inicial do WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mensagem Inicial ao Chamar no WhatsApp</label>
              <input
                type="text"
                value={formData.whatsappMessage}
                onChange={e => setFormData({ ...formData, whatsappMessage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                placeholder="Ex: Olá! Vim pelo cardápio e gostaria de tirar uma dúvida."
              />
            </div>

            {/* Switch Botão Flutuante do WhatsApp */}
            <label className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.showFloatingWhatsApp}
                onChange={e => setFormData({ ...formData, showFloatingWhatsApp: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-white block">Exibir Botão Flutuante do WhatsApp na Tela do Cliente</span>
                <span className="text-slate-400 text-[11px]">Permite ao cliente tirar dúvidas a qualquer momento com 1 toque</span>
              </div>
            </label>

            {/* Endereço Físico & Horários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Endereço Completo da Loja</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-slate-600 outline-none"
                  placeholder="Rua, Número, Bairro - Cidade"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Horário de Atendimento</label>
                <input
                  type="text"
                  value={formData.openingHours}
                  onChange={e => setFormData({ ...formData, openingHours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-slate-600 outline-none"
                  placeholder="Ex: Terça a Domingo das 18h às 23h30"
                />
              </div>
            </div>

            {/* Coordenadas GPS da Sede no Mapa (Almenara - MG) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-extrabold text-white">Coordenadas GPS da Loja no Mapa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSetAlmenaraCoords}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    📍 Definir Almenara - MG
                  </button>
                  <button
                    type="button"
                    onClick={handleGetDeviceCoords}
                    className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Usar Meu GPS</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                    placeholder="-16.1834"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                    placeholder="-40.6936"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Ponto de partida exibido no mapa de rastreamento de motoboys e rotas de entrega. Padrão: Almenara, MG (-16.1834, -40.6936).
              </p>
            </div>
          </div>

          {/* GRUPO 4: PAGAMENTO PIX OFICIAL & QR CODE AUTOMÁTICO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>4. Chave PIX do Restaurante & QR Code Automático</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                Padrão Banco Central
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Cadastre aqui a chave PIX da sua empresa. Quando o cliente fechar o pedido no cardápio, o sistema irá gerar o <strong>QR Code oficial e o código Pix Copia e Cola</strong> com o <strong>valor exato do pedido</strong> para ele pagar na hora.
            </p>

            {/* Ativar / Desativar PIX */}
            <label className="flex items-center space-x-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.pixEnabled}
                onChange={e => setFormData({ ...formData, pixEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer accent-emerald-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-white block">Habilitar Opção de Pagamento por PIX no Cardápio</span>
                <span className="text-slate-400 text-[11px]">Gera o QR Code e código Copia e Cola antes do cliente fechar o pedido</span>
              </div>
            </label>

            {formData.pixEnabled && (
              <div className="space-y-4 pt-1 animate-in fade-in">
                
                {/* Tipo de Chave e Chave Pix */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tipo de Chave *
                    </label>
                    <select
                      value={formData.pixKeyType}
                      onChange={e => setFormData({ ...formData, pixKeyType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-bold cursor-pointer"
                    >
                      <option value="phone">📱 Telefone Celular (+55)</option>
                      <option value="cnpj">🏢 CNPJ</option>
                      <option value="cpf">👤 CPF</option>
                      <option value="email">✉️ E-mail</option>
                      <option value="random">🔑 Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Chave PIX Cadastrada *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pixKey}
                      onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 focus:border-emerald-500 outline-none font-mono font-bold"
                      placeholder={
                        formData.pixKeyType === 'phone' ? 'Ex: (11) 99999-8888 ou 11999998888' :
                        formData.pixKeyType === 'cnpj' ? 'Ex: 12.345.678/0001-90' :
                        formData.pixKeyType === 'cpf' ? 'Ex: 123.456.789-00' :
                        formData.pixKeyType === 'email' ? 'Ex: financeiro@seurestaurante.com.br' :
                        'Ex: 123e4567-e89b-12d3-a456-426614174000'
                      }
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {formData.pixKeyType === 'phone' && 'Pode digitar com DDD e parênteses. O código do país (+55) é adicionado automaticamente.'}
                      {formData.pixKeyType === 'cnpj' && 'Digite o CNPJ da empresa titular da conta bancária.'}
                      {formData.pixKeyType === 'cpf' && 'Digite o CPF do titular da conta.'}
                      {formData.pixKeyType === 'email' && 'Digite o e-mail cadastrado como chave Pix no seu banco.'}
                      {formData.pixKeyType === 'random' && 'Cole a chave aleatória gerada pelo aplicativo do seu banco.'}
                    </span>
                  </div>
                </div>

                {/* Titular e Cidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nome do Titular / Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={formData.pixBeneficiaryName}
                      onChange={e => setFormData({ ...formData, pixBeneficiaryName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                      placeholder="Ex: SDG Burger & Pizza"
                    />
                    <span className="text-[10px] text-slate-500">Nome que aparece no comprovante Pix (máx. 25 letras)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Cidade da Conta Bancária *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formData.pixCity}
                      onChange={e => setFormData({ ...formData, pixCity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                      placeholder="Ex: Sao Paulo, Rio de Janeiro..."
                    />
                    <span className="text-[10px] text-slate-500">Exigido pelo Banco Central no BRCode (máx. 15 letras)</span>
                  </div>
                </div>

                {/* Simulador Interativo do QR Code PIX */}
                <div className="pt-2">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-extrabold text-white">Simulador em Tempo Real do PIX:</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400">Valor de Teste (R$):</span>
                        <input
                          type="number"
                          step="0.10"
                          value={testPixAmount}
                          onChange={e => setTestPixAmount(e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-right outline-none"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Veja abaixo como o QR Code e o código Copia e Cola serão exibidos para o cliente com este valor:
                    </p>

                    <PixPaymentCard
                      amount={parseFloat(testPixAmount) || 34.90}
                      orderId="TESTE-1001"
                      storeSettings={{
                        ...formData,
                        pixKey: formData.pixKey,
                        pixKeyType: formData.pixKeyType,
                        pixBeneficiaryName: formData.pixBeneficiaryName,
                        pixCity: formData.pixCity
                      }}
                      compact={true}
                      showActionButtons={false}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* GRUPO 5: FAIXA DE AVISO / PROMOÇÃO NO TOPO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
              <span>5. Faixa de Anúncio / Promoção no Topo</span>
            </h3>

            <label className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.showBannerNotice}
                onChange={e => setFormData({ ...formData, showBannerNotice: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer accent-amber-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-white block">Exibir Faixa Promocional no Topo do Cardápio</span>
                <span className="text-slate-400 text-[11px]">Destaque animado visível no topo da página do cliente</span>
              </div>
            </label>

            {formData.showBannerNotice && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texto da Promoção ou Comunicado</label>
                <input
                  type="text"
                  value={formData.bannerNotice}
                  onChange={e => setFormData({ ...formData, bannerNotice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none font-bold"
                  placeholder="Ex: 🔥 PROMOÇÃO: Frete Grátis em pedidos acima de R$ 80!"
                />
              </div>
            )}
          </div>

          {/* GRUPO 6: STATUS DA LOJA & REGRAS DE ENTREGA */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>6. Status da Loja & Regras de Entrega</span>
            </h3>

            {/* Aberto ou Fechado */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Status Atual de Atendimento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isOpen: true })}
                  className={`py-3 px-4 rounded-2xl border font-black text-xs flex items-center justify-center space-x-2 transition-all ${
                    formData.isOpen
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>🟢 ABERTO AGORA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isOpen: false })}
                  className={`py-3 px-4 rounded-2xl border font-black text-xs flex items-center justify-center space-x-2 transition-all ${
                    !formData.isOpen
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>🔴 FECHADO NO MOMENTO</span>
                </button>
              </div>
            </div>

            {!formData.isOpen && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mensagem de Loja Fechada</label>
                <textarea
                  rows={2}
                  value={formData.closedMessage}
                  onChange={e => setFormData({ ...formData, closedMessage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-rose-500 outline-none resize-none"
                />
              </div>
            )}

            {/* Prazos e Taxas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tempo Médio</label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none"
                  placeholder="Ex: 30 - 45 min"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Taxa Entrega Padrão (R$)</label>
                <input
                  type="text"
                  value={formData.deliveryFee}
                  onChange={e => setFormData({ ...formData, deliveryFee: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[var(--brand-primary,#f59e0b)] outline-none font-bold"
                  placeholder="5,00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Frete Grátis Acima (R$)</label>
                <input
                  type="text"
                  value={formData.freeDeliveryThreshold}
                  onChange={e => setFormData({ ...formData, freeDeliveryThreshold: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 focus:border-emerald-500 outline-none font-bold"
                  placeholder="80,00"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})`,
              color: contrastText
            }}
            className="w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center space-x-2 hover:brightness-105 active:scale-95"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Salvar Todas as Personalizações do Delivery</span>
          </button>
        </form>

        {/* Mockup de Pré-visualização ao Vivo (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-[var(--brand-primary,#f59e0b)]" />
                <span>Pré-Visualização do Cliente</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold">Atualização em tempo real</span>
            </div>

            {/* Cartão Mockup Smartphone */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
              
              {/* Promoção Marquee com a Cor da Marca */}
              {formData.showBannerNotice && formData.bannerNotice && (
                <div
                  style={{
                    background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})`,
                    color: contrastText
                  }}
                  className="font-black text-[10px] py-1.5 px-3 text-center tracking-wide flex items-center justify-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">{formData.bannerNotice}</span>
                </div>
              )}

              {/* Foto de Capa */}
              <div className="relative h-28 w-full overflow-hidden bg-slate-950">
                <img
                  src={formData.coverUrl || PRESET_COVERS[0].url}
                  alt="Capa"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                
                <div className="absolute top-2.5 right-2.5">
                  {formData.isOpen ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] shadow">
                      ABERTO AGORA
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shadow">
                      FECHADO
                    </span>
                  )}
                </div>
              </div>

              {/* Perfil & Info */}
              <div className="p-4 pt-0 -mt-8 relative space-y-3">
                <div className="flex items-end space-x-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-lg">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div
                        style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                        className="w-full h-full rounded-xl flex items-center justify-center"
                      >
                        <Utensils className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                      </div>
                    )}
                  </div>

                  <div className="pb-0.5">
                    <div className="flex items-center space-x-1">
                      <h4 className="text-base font-black text-white leading-tight">
                        {formData.restaurantName || 'Nome do Delivery'}
                      </h4>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {formData.slogan || 'Slogan ou descrição da sua loja'}
                    </p>
                  </div>
                </div>

                {/* Botões de Redes Sociais no Mockup */}
                <div className="flex items-center space-x-2 pt-1">
                  {formData.whatsapp && (
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#25D366]/20 text-[#25D366] text-[10px] font-extrabold border border-[#25D366]/30">
                      <WhatsAppIcon className="w-3 h-3" colored={false} />
                      <span>WhatsApp</span>
                    </div>
                  )}

                  {formData.instagram && (
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-pink-500/20 text-pink-400 text-[10px] font-extrabold border border-pink-500/30">
                      <InstagramIcon className="w-3 h-3" colored={false} />
                      <span>{previewIgHandle || '@instagram'}</span>
                    </div>
                  )}
                </div>

                {/* Métricas do Mockup */}
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-300">
                  <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 flex items-center space-x-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>4.9</span>
                  </div>
                  <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    🕒 {formData.deliveryTime || '30 - 45 min'}
                  </div>
                  <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    🛵 {formData.deliveryFee ? `R$ ${formData.deliveryFee}` : 'Grátis'}
                  </div>
                  {formData.pixEnabled && formData.pixKey && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg text-emerald-400 text-[10px] font-extrabold flex items-center space-x-1">
                      <QrCode className="w-3 h-3" />
                      <span>Aceita PIX</span>
                    </div>
                  )}
                </div>

                {/* Exemplo de Botão no Mockup com a cor escolhida */}
                <div
                  style={{
                    backgroundColor: formData.primaryColor,
                    color: contrastText
                  }}
                  className="p-2.5 rounded-xl font-extrabold text-xs text-center shadow-lg"
                >
                  Ver Sacola de Pedidos
                </div>

                {!formData.isOpen && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span className="line-clamp-2">{formData.closedMessage}</span>
                  </div>
                )}
              </div>

            </div>

            <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <span className="font-bold text-[var(--brand-primary,#f59e0b)] block">💡 Dica para o Dono do Negócio:</span>
              <p className="text-[11px] leading-relaxed">
                As configurações de cores e logotipo sincronizam automaticamente em todos os celulares dos clientes e na nuvem.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
