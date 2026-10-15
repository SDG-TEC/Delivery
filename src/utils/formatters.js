export const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
};

export const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const STATUS_MAP = {
  aguardando_pagamento: {
    label: 'Aguardando Pagamento',
    shortLabel: 'Novo / Balcão',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    badgeBg: 'bg-amber-500',
    icon: 'Clock'
  },
  pagamento_confirmado: {
    label: 'Pagamento Confirmado',
    shortLabel: 'Na Cozinha',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    badgeBg: 'bg-blue-500',
    icon: 'CheckCircle2'
  },
  em_preparo: {
    label: 'Em Preparo na Cozinha',
    shortLabel: 'Em Preparo',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    badgeBg: 'bg-purple-500',
    icon: 'ChefHat'
  },
  pronto: {
    label: 'Pronto p/ Entrega / Balcão',
    shortLabel: 'Pronto',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    badgeBg: 'bg-emerald-500',
    icon: 'PackageCheck'
  },
  saiu_para_entrega: {
    label: 'Saiu para Entrega (Com Motoboy)',
    shortLabel: 'Em Rota 🛵',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    badgeBg: 'bg-amber-500',
    icon: 'Bike'
  },
  entregue: {
    label: 'Concluído / Entregue',
    shortLabel: 'Entregue',
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    badgeBg: 'bg-slate-500',
    icon: 'CheckCheck'
  },
  cancelado: {
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    badgeBg: 'bg-rose-500',
    icon: 'XCircle'
  }
};

export const PAYMENT_METHODS = {
  pix: { label: 'PIX (Aprovação Instantânea)', icon: 'QrCode' },
  credit_card: { label: 'Cartão de Crédito / Débito', icon: 'CreditCard' },
  cash: { label: 'Dinheiro', icon: 'Banknote' }
};
