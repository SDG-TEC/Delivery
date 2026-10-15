/**
 * Theme & Branding Utilities for SDG Delivery
 */

export const THEME_PRESETS = [
  {
    id: 'amber',
    name: 'Âmbar Ouro Delivery',
    category: 'Gourmet / Geral',
    primary: '#f59e0b',
    secondary: '#ea580c',
    description: 'Tons quentes ideais para hamburguerias, batatas e combos'
  },
  {
    id: 'rose',
    name: 'Vermelho Burguer & Pizza',
    category: 'Burgers & Pizzas',
    primary: '#e11d48',
    secondary: '#be123c',
    description: 'Estimula o apetite e cria alto impacto visual'
  },
  {
    id: 'orange',
    name: 'Laranja Fast-Food',
    category: 'Lanches & Porções',
    primary: '#ea580c',
    secondary: '#c2410c',
    description: 'Vibrante, moderno e amigável'
  },
  {
    id: 'emerald',
    name: 'Verde Açaí & Saudável',
    category: 'Açaí, Sucos & Saladas',
    primary: '#10b981',
    secondary: '#059669',
    description: 'Transmite frescor, saúde e produtos naturais'
  },
  {
    id: 'purple',
    name: 'Roxo Açaí Prime',
    category: 'Açaíterias & Gelatos',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    description: 'A identidade perfeita para açaí artesanal e gelaterias'
  },
  {
    id: 'pink',
    name: 'Rosa Doceria & Confeitaria',
    category: 'Doces, Bolos & Café',
    primary: '#ec4899',
    secondary: '#db2777',
    description: 'Doce, acolhedor e irresistível para sobremesas'
  },
  {
    id: 'blue',
    name: 'Azul Drinks & Frutos do Mar',
    category: 'Bebidas, Peixes & Sushi',
    primary: '#0284c7',
    secondary: '#0369a1',
    description: 'Modernidade, frescor e bebidas refrescantes'
  },
  {
    id: 'dark',
    name: 'Dourado Premium Black Edition',
    category: 'Pizzas Nobres & Carnes Nobres',
    primary: '#d97706',
    secondary: '#b45309',
    description: 'Elegância, sofisticação e visual premium'
  }
];

export const isHexColorLight = (hex) => {
  if (!hex || typeof hex !== 'string') return true;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

export const applyThemeToDocument = (primary, secondary) => {
  if (typeof document === 'undefined') return;
  const p = primary || '#f59e0b';
  const s = secondary || '#ea580c';
  const root = document.documentElement;
  
  root.style.setProperty('--brand-primary', p);
  root.style.setProperty('--brand-secondary', s);
  
  const isLight = isHexColorLight(p);
  root.style.setProperty('--brand-contrast', isLight ? '#0f172a' : '#ffffff');
};

/**
 * Formata número de telefone para WhatsApp com código 55 (Brasil)
 */
export const formatWhatsAppLink = (phone, defaultMessage = '') => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  
  // Adiciona 55 caso o usuário tenha informado DDD + número (ex: 11999998888 -> 5511999998888)
  const fullNumber = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const encodedMsg = defaultMessage ? `?text=${encodeURIComponent(defaultMessage)}` : '';
  return `https://wa.me/${fullNumber}${encodedMsg}`;
};

/**
 * Extrai username limpo e URL do perfil do Instagram
 */
export const formatInstagramInfo = (input) => {
  if (!input) return { handle: '', url: '' };
  let clean = String(input).trim();
  
  // Se for URL completa, extrai o path
  if (clean.includes('instagram.com/')) {
    const parts = clean.split('instagram.com/');
    clean = parts[1] ? parts[1].split('/')[0].split('?')[0] : '';
  }
  
  clean = clean.replace('@', '').trim();
  if (!clean) return { handle: '', url: '' };
  
  return {
    handle: `@${clean}`,
    url: `https://instagram.com/${clean}`
  };
};
