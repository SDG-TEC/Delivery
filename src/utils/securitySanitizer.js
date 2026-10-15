/**
 * SDG Delivery - Security Sanitizer Module
 * Previne XSS, HTML Injection e sanitiza dados de entrada sensíveis.
 */

/**
 * Escapa caracteres HTML perigosos para evitar XSS e injeção em DOM
 * @param {string} str 
 * @returns {string}
 */
export const sanitizeText = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
};

/**
 * Sanitiza texto permitindo apenas caracteres alfanuméricos, espaços e pontuação básica comum
 * @param {string} str 
 * @param {number} [maxLength=500] 
 * @returns {string}
 */
export const sanitizeSafeString = (str, maxLength = 500) => {
  if (typeof str !== 'string') return '';
  // Remove tags HTML e caracteres de controle
  const stripped = str.replace(/<[^>]*>?/gm, '').replace(/[\x00-\x1F\x7F]/g, '');
  return stripped.slice(0, maxLength).trim();
};

/**
 * Sanitiza e valida números de telefone/WhatsApp (apenas dígitos válidos)
 * @param {string} phone 
 * @returns {string}
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(0, 15); // E.164 max digits
};

/**
 * Sanitiza PINs numéricos (apenas dígitos, tamanho restrito)
 * @param {string} pin 
 * @param {number} [maxLen=8]
 * @returns {string}
 */
export const sanitizePin = (pin, maxLen = 8) => {
  if (typeof pin !== 'string') return '';
  return pin.replace(/\D/g, '').slice(0, maxLen);
};

/**
 * Sanitiza identificador de usuário (apenas letras minúsculas, números, ponto, hífen, underline ou e-mail)
 * @param {string} identifier 
 * @returns {string}
 */
export const sanitizeIdentifier = (identifier) => {
  if (typeof identifier !== 'string') return '';
  const clean = identifier.trim().toLowerCase();
  // Se for e-mail, valida formato básico
  if (clean.includes('@')) {
    return clean.replace(/[^a-z0-9@._+-]/g, '').slice(0, 100);
  }
  // Nome de usuário
  return clean.replace(/[^a-z0-9._-]/g, '').slice(0, 40);
};

/**
 * Sanitização profunda de payloads de pedidos de clientes para prevenir ataques
 * @param {Object} payload 
 * @returns {Object}
 */
export const sanitizeOrderPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return {};
  
  return {
    ...payload,
    name: sanitizeSafeString(payload.name || payload.customerName || '', 100),
    phone: sanitizePhone(payload.phone || payload.customerPhone || ''),
    address: sanitizeSafeString(payload.address || '', 250),
    observation: sanitizeSafeString(payload.observation || '', 400),
    deliveryType: ['delivery', 'takeout', 'dine_in'].includes(payload.deliveryType) ? payload.deliveryType : 'delivery',
    deliveryFee: typeof payload.deliveryFee === 'number' ? Math.max(0, payload.deliveryFee) : (payload.deliveryFee !== undefined && payload.deliveryFee !== null ? Math.max(0, parseFloat(payload.deliveryFee) || 0) : undefined),
    paymentMethod: ['pix', 'card', 'cash', 'card_machine'].includes(payload.paymentMethod) ? payload.paymentMethod : 'pix',
    cashChangeFor: typeof payload.cashChangeFor === 'number' ? Math.max(0, payload.cashChangeFor) : 0
  };
};
