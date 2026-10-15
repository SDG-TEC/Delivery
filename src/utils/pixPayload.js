// ==============================================================================
// 🇧🇷 Gerador Oficial de PIX BRCode / EMVCo (Padrão Banco Central do Brasil)
// Zero dependências externas - Compatível com Node.js e Navegador
// ==============================================================================

/**
 * Normaliza texto removendo acentos e caracteres especiais para o padrão EMVCo
 */
export function sanitizeText(text = '', maxLength = 25) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '')   // apenas letras, números e espaços
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Formata a chave PIX de acordo com o padrão do Banco Central
 */
export function formatPixKey(key = '', type = 'phone') {
  const clean = String(key || '').trim();
  if (!clean) return '';

  switch (type) {
    case 'phone': {
      const digits = clean.replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('55') && digits.length >= 12) {
        return `+${digits}`;
      }
      return `+55${digits}`;
    }
    case 'cpf':
    case 'cnpj':
      return clean.replace(/\D/g, '');
    case 'email':
      return clean.toLowerCase();
    case 'random':
    default:
      return clean;
  }
}

/**
 * Formata um campo TLV (Tag, Length, Value) no padrão EMVCo
 */
export function formatTLV(tag, value) {
  const strVal = String(value);
  const len = String(strVal.length).padStart(2, '0');
  return `${tag}${len}${strVal}`;
}

/**
 * Calcula o checksum CRC-16/CCITT-FALSE no padrão do Banco Central (polinômio 0x1021)
 */
export function calculateCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload completo do Pix (Copia e Cola) no padrão do Banco Central
 * 
 * @param {Object} params
 * @param {string} params.pixKey - Chave Pix cadastrada
 * @param {string} [params.pixKeyType='phone'] - Tipo de chave ('phone'|'cpf'|'cnpj'|'email'|'random')
 * @param {string} [params.beneficiaryName='SDG DELIVERY'] - Nome do recebedor
 * @param {string} [params.city='ALMENARA'] - Cidade do recebedor (max 15 chars)
 * @param {number|string} params.amount - Valor do pedido em Reais (ex: 45.90)
 * @param {string} [params.txid='***'] - Identificador da transação (ex: PED1001)
 * @param {string} [params.description] - Mensagem/descrição opcional
 * @returns {Object} { payload, copyPasteCode, isValid, error, formattedAmount, key, beneficiary, city }
 */
export function generatePixPayload({
  pixKey = '',
  pixKeyType = 'phone',
  beneficiaryName = 'SDG DELIVERY',
  city = 'ALMENARA',
  amount = 0,
  txid = '***',
  description = ''
}) {
  const formattedKey = formatPixKey(pixKey, pixKeyType);

  if (!formattedKey) {
    return {
      payload: '',
      copyPasteCode: '',
      isValid: false,
      error: 'Chave PIX não informada. Configure sua chave no painel administrativo.',
      formattedAmount: '0,00'
    };
  }

  const numAmount = Number(amount) || 0;
  const strAmount = numAmount.toFixed(2);
  const formattedAmount = numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Normalização de campos textuais exigida pelo Banco Central
  const cleanName = sanitizeText(beneficiaryName || 'SDG DELIVERY', 25) || 'SDG DELIVERY';
  const cleanCity = sanitizeText(city || 'ALMENARA', 15) || 'ALMENARA';
  const cleanTxid = txid ? String(txid).replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) : '***';

  try {
    // 00: Payload Format Indicator (01)
    let payload = formatTLV('00', '01');

    // 01: Point of Initiation Method (11 = Estático reutilizável com valor pré-definido)
    payload += formatTLV('01', '11');

    // 26: Merchant Account Information
    // Subtag 00: GUI ("br.gov.bcb.pix")
    let merchantAccount = formatTLV('00', 'br.gov.bcb.pix');
    // Subtag 01: Chave Pix
    merchantAccount += formatTLV('01', formattedKey);
    // Subtag 02: Descrição (opcional)
    if (description) {
      const cleanDesc = sanitizeText(description, 40);
      if (cleanDesc) {
        merchantAccount += formatTLV('02', cleanDesc);
      }
    }
    payload += formatTLV('26', merchantAccount);

    // 52: Merchant Category Code (0000 padrão)
    payload += formatTLV('52', '0000');

    // 53: Transaction Currency (986 = Real BRL)
    payload += formatTLV('53', '986');

    // 54: Transaction Amount (Valor)
    if (numAmount > 0) {
      payload += formatTLV('54', strAmount);
    }

    // 58: Country Code (BR)
    payload += formatTLV('58', 'BR');

    // 59: Merchant Name
    payload += formatTLV('59', cleanName);

    // 60: Merchant City
    payload += formatTLV('60', cleanCity);

    // 62: Additional Data Field Template (txid)
    const additionalData = formatTLV('05', cleanTxid || '***');
    payload += formatTLV('62', additionalData);

    // 63: CRC16
    const payloadWithCRCHeader = payload + '6304';
    const crc = calculateCRC16(payloadWithCRCHeader);
    const finalPayload = payloadWithCRCHeader + crc;

    return {
      payload: finalPayload,
      copyPasteCode: finalPayload,
      isValid: true,
      error: null,
      formattedAmount,
      key: formattedKey,
      beneficiary: cleanName,
      city: cleanCity
    };
  } catch (err) {
    console.error('Erro ao gerar payload Pix:', err);
    return {
      payload: '',
      copyPasteCode: '',
      isValid: false,
      error: 'Falha ao processar código PIX.',
      formattedAmount
    };
  }
}
