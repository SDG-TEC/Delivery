// ==============================================================================
// 🖨️ Elgin i8 / i9 ESC-POS Commands & Ticket Formatter (80mm Thermal Roll)
// ==============================================================================

export const ESC = '\x1b';
export const GS = '\x1d';

export const CMD = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  ALIGN_RIGHT: ESC + 'a\x02',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  DOUBLE_SIZE: GS + '!\x11', // 2x height, 2x width
  DOUBLE_HEIGHT: GS + '!\x01',
  DOUBLE_WIDTH: GS + '!\x10',
  NORMAL_SIZE: GS + '!\x00',
  UNDERLINE_ON: ESC + '-\x01',
  UNDERLINE_OFF: ESC + '-\x00',
  FEED_3: ESC + 'd\x03',
  FEED_5: ESC + 'd\x05',
  CUT_PARTIAL: GS + 'V\x42\x00', // Elgin Function B partial cut (corte parcial)
  CUT_FULL: GS + 'V\x41\x00',    // Elgin Function B full cut (corte total limpo)
  CUT_LEGACY_FULL: ESC + 'i',    // Elgin comando clássico corte total
  CUT_LEGACY_PARTIAL: ESC + 'm', // Elgin comando clássico corte parcial
  BEEP: ESC + 'b\x02\x02'        // Elgin buzzer beep
};

/**
 * Retorna o comando ESC/POS apropriado de corte de acordo com a configuração
 */
export function getCutCommand(cutMode = 'full') {
  if (cutMode === 'partial') {
    return CMD.CUT_PARTIAL;
  }
  return CMD.CUT_FULL;
}

export const LINE_WIDTH_80MM = 48; // Padrão 80mm (Fonte A)
export const LINE_WIDTH_58MM = 32; // Padrão 58mm (Fonte A bobina estreita)

/**
 * Retorna a largura de colunas de acordo com a bobina (80mm = 48 colunas, 58mm = 32 colunas)
 */
export function getLineWidth(options = {}) {
  return options?.paperWidth === '58mm' ? LINE_WIDTH_58MM : LINE_WIDTH_80MM;
}

/**
 * Remove acentos e caracteres especiais para compatibilidade 100% com impressoras térmicas
 */
export function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/º/g, 'o')
    .replace(/ª/g, 'a')
    .replace(/[^\x20-\x7E\n]/g, ' '); // Mantém apenas ASCII visível e quebra de linha
}

/**
 * Formata linha com texto à esquerda e texto à direita (ex: Nome do produto e Preço)
 */
export function formatRow(left, right, width = LINE_WIDTH_80MM) {
  const cleanLeft = sanitizeText(left);
  const cleanRight = sanitizeText(right);
  const spaces = Math.max(1, width - cleanLeft.length - cleanRight.length);
  return cleanLeft + ' '.repeat(spaces) + cleanRight;
}

/**
 * Centraliza um texto na largura da bobina térmica
 */
export function formatCenter(text, width = LINE_WIDTH_80MM) {
  const clean = sanitizeText(text);
  if (clean.length >= width) return clean.slice(0, width);
  const leftPad = Math.floor((width - clean.length) / 2);
  const rightPad = width - clean.length - leftPad;
  return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
}

/**
 * Cria divisor de linha (ex: ------------------------------------------------)
 */
export function formatDivider(char = '-', width = LINE_WIDTH_80MM) {
  return char.repeat(width);
}

/**
 * Formata moeda BRL simples sem acentos
 */
export function formatCurrencyBRL(val) {
  const num = Number(val || 0);
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

/**
 * Formata data/hora amigável
 */
export function formatTicketDateTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ==============================================================================
// 🍳 1. COMANDA DA COZINHA (PRODUÇÃO & KDS)
// ==============================================================================
export function buildKitchenEscpos(order, options = {}) {
  const restaurantName = options.restaurantName || 'SDG RESTAURANTE';
  const width = getLineWidth(options);
  let out = '';

  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_SIZE;
  out += '*** COZINHA - PRODUCAO ***\n';
  out += CMD.NORMAL_SIZE;
  out += `${sanitizeText(restaurantName).toUpperCase()}\n`;
  out += CMD.BOLD_OFF;
  out += formatDivider('=', width) + '\n';

  // Destaque do número do pedido
  out += CMD.ALIGN_LEFT;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_SIZE;
  out += `PEDIDO: #${order.id}\n`;
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;

  out += `HORA: ${formatTicketDateTime(order.createdAt)}\n`;
  out += `CLIENTE: ${sanitizeText(order.customerName)}\n`;
  out += `TIPO: ${order.deliveryType === 'delivery' ? 'DELIVERY (ENTREGA)' : 'RETIRADA NO BALCAO'}\n`;
  if (order.deliveryType === 'delivery' && order.address) {
    out += `ENDERECO: ${sanitizeText(order.address)}\n`;
  }
  out += formatDivider('-', width) + '\n';

  // Itens do Pedido (Em destaque com quantidade ampliada)
  out += CMD.BOLD_ON;
  out += 'ITENS DA COMANDA:\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('-', width) + '\n';

  (order.items || []).forEach((item) => {
    out += CMD.BOLD_ON;
    out += CMD.DOUBLE_HEIGHT;
    out += `[ ${item.quantity}x ] ${sanitizeText(item.name).toUpperCase()}\n`;
    out += CMD.NORMAL_SIZE;
    out += CMD.BOLD_OFF;

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        out += `   + ${sanitizeText(opt)}\n`;
      });
    }

    if (item.observation) {
      out += CMD.BOLD_ON;
      out += `   ** OBS: ${sanitizeText(item.observation).toUpperCase()} **\n`;
      out += CMD.BOLD_OFF;
    }
    out += '\n';
  });

  // Observação Geral
  if (order.observation) {
    out += formatDivider('=', width) + '\n';
    out += CMD.BOLD_ON;
    out += 'ATENCAO OBS GERAL DO PEDIDO:\n';
    out += CMD.DOUBLE_HEIGHT;
    out += `${sanitizeText(order.observation).toUpperCase()}\n`;
    out += CMD.NORMAL_SIZE;
    out += CMD.BOLD_OFF;
  }

  out += formatDivider('-', width) + '\n';
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += '--- FIM DA COMANDA DA COZINHA ---\n';
  out += CMD.BOLD_OFF;

  // Finalização e Corte do Papel
  out += '\n\n\n';
  if (options.cutPaper !== false) {
    out += getCutCommand(options.cutMode || 'full');
  }

  return out;
}

// ==============================================================================
// 🧾 2. CUPOM DO BALCÃO / CLIENTE / CAIXA
// ==============================================================================
export function buildCounterEscpos(order, options = {}) {
  const restaurantName = options.restaurantName || 'SDG RESTAURANTE';
  const width = getLineWidth(options);
  let out = '';

  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_SIZE;
  out += `${sanitizeText(restaurantName).toUpperCase()}\n`;
  out += CMD.NORMAL_SIZE;
  out += 'SISTEMA DE DELIVERY & BALCAO\n';
  out += CMD.BOLD_ON;
  out += options.copyLabel
    ? `*** ${options.copyLabel} ***\n`
    : (order.deliveryType === 'delivery' ? '*** VIA BALCAO & COZINHA ***\n' : '*** VIA BALCAO & CAIXA ***\n');
  out += CMD.BOLD_OFF;
  out += formatDivider('=', width) + '\n';

  // Cabeçalho do Pedido
  out += CMD.ALIGN_LEFT;
  out += CMD.BOLD_ON;
  out += formatRow(`PEDIDO: #${order.id}`, `HORA: ${formatTicketDateTime(order.createdAt)}`, width) + '\n';
  out += CMD.BOLD_OFF;
  out += `CLIENTE: ${sanitizeText(order.customerName)}\n`;
  if (order.customerPhone) {
    out += `TELEFONE: ${sanitizeText(order.customerPhone)}\n`;
  }
  out += `TIPO: ${order.deliveryType === 'delivery' ? 'DELIVERY (ENTREGA)' : (order.deliveryType === 'dine_in' ? 'CONSUMO SALAO (MESA)' : 'RETIRADA NO BALCAO')}\n`;
  if (order.deliveryType === 'delivery' && order.address) {
    out += `ENDERECO: ${sanitizeText(order.address)}\n`;
  }
  out += formatDivider('-', width) + '\n';

  // Tabela de Itens com Preços e Preparo Cozinha
  out += CMD.BOLD_ON;
  out += formatRow('QTD  DESCRICAO (PREPARO)', 'VALOR', width) + '\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('-', width) + '\n';

  const subtotal = (order.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const deliveryFee = order.deliveryType === 'delivery' ? (order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : 5.00) : 0;
  const grandTotal = order.total !== undefined ? Number(order.total) : (subtotal + deliveryFee);

  (order.items || []).forEach(item => {
    const rightText = formatCurrencyBRL(item.subtotal);
    const maxLeft = Math.max(12, width - rightText.length - 2);
    const leftText = `[ ${item.quantity}x ] ${item.name}`.slice(0, maxLeft);
    out += CMD.BOLD_ON;
    out += formatRow(leftText, rightText, width) + '\n';
    out += CMD.BOLD_OFF;

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        out += `   + ${sanitizeText(opt)}\n`;
      });
    }

    if (item.observation) {
      out += CMD.BOLD_ON;
      out += `   ** OBS: ${sanitizeText(item.observation).toUpperCase()} **\n`;
      out += CMD.BOLD_OFF;
    }
  });

  out += formatDivider('-', width) + '\n';

  // Totais Financeiros
  out += formatRow('Subtotal:', formatCurrencyBRL(subtotal), width) + '\n';
  if (order.deliveryType === 'delivery') {
    out += formatRow('Taxa de Entrega:', formatCurrencyBRL(deliveryFee), width) + '\n';
  }

  out += formatDivider('=', width) + '\n';
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_HEIGHT;
  out += formatRow('TOTAL A PAGAR:', formatCurrencyBRL(grandTotal), width) + '\n';
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;
  out += formatDivider('=', width) + '\n';

  // Informações de Pagamento
  const paymentLabels = {
    pix: 'PIX (CONFIRMADO)',
    credit_card: 'CARTAO CREDITO / DEBITO',
    cash: 'DINHEIRO'
  };
  const payDesc = paymentLabels[order.paymentMethod] || (order.paymentMethod ? order.paymentMethod.toUpperCase() : 'A DEFINIR');
  out += `FORMA DE PAGAMENTO: ${payDesc}\n`;
  out += `STATUS: ${order.status === 'aguardando_pagamento' ? 'PENDENTE NO CAIXA' : 'PAGAMENTO CONFIRMADO'}\n`;

  if (order.observation) {
    out += formatDivider('-', width) + '\n';
    out += `OBS: ${sanitizeText(order.observation)}\n`;
  }

  // Rodapé
  out += formatDivider('-', width) + '\n';
  out += CMD.ALIGN_CENTER;
  out += 'SDG Delivery & KDS\n';

  // Finalização e Corte do Papel
  out += '\n\n\n';
  if (options.cutPaper !== false) {
    out += getCutCommand(options.cutMode || 'full');
  }

  return out;
}

// ==============================================================================
// 🛵 2.1. CUPOM DO MOTOBOY / ENTREGA (ENTREGADOR)
// ==============================================================================
export function buildMotoboyEscpos(order, options = {}) {
  const restaurantName = options.restaurantName || 'SDG RESTAURANTE';
  let out = '';

  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_SIZE;
  out += `${sanitizeText(restaurantName).toUpperCase()}\n`;
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_ON;
  out += '*** VIA DO MOTOBOY / ENTREGA ***\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('=') + '\n';

  // Destaque do Pedido e Destino
  out += CMD.ALIGN_LEFT;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_HEIGHT;
  out += `PEDIDO: #${order.id}\n`;
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;
  out += `HORA: ${formatTicketDateTime(order.createdAt)}\n`;
  out += formatDivider('-') + '\n';

  // DESTINO / ENDEREÇO EM DESTAQUE TOTAL
  out += CMD.BOLD_ON;
  out += '>>> ENDERECO DE ENTREGA:\n';
  out += CMD.DOUBLE_HEIGHT;
  out += `${sanitizeText(order.address || 'ENDERECO NAO INFORMADO')}\n`;
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;
  out += formatDivider('-') + '\n';

  // CLIENTE E CONTATO
  out += `CLIENTE: ${sanitizeText(order.customerName)}\n`;
  if (order.customerPhone) {
    out += CMD.BOLD_ON;
    out += `TELEFONE: ${sanitizeText(order.customerPhone)}\n`;
    out += CMD.BOLD_OFF;
  }
  out += formatDivider('-') + '\n';

  // COBRANÇA / PAGAMENTO
  const paymentLabels = {
    pix: 'PIX (JA PAGO)',
    credit_card: 'CARTAO (LEVAR MAQUININHA)',
    cash: 'DINHEIRO (COBRAR NA ENTREGA)'
  };
  const payDesc = paymentLabels[order.paymentMethod] || (order.paymentMethod ? order.paymentMethod.toUpperCase() : 'A DEFINIR');

  const subtotal = (order.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const deliveryFee = order.deliveryType === 'delivery' ? (order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : 5.00) : 0;
  const grandTotal = order.total !== undefined ? Number(order.total) : (subtotal + deliveryFee);

  out += `FORMA DE PAGAMENTO: ${payDesc}\n`;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_HEIGHT;
  if (order.paymentMethod === 'pix' || order.status !== 'aguardando_pagamento') {
    out += formatRow('TOTAL DO PEDIDO:', formatCurrencyBRL(grandTotal)) + '\n';
    out += CMD.NORMAL_SIZE;
    out += '*** PAGO VIA PIX - NAO COBRAR DO CLIENTE ***\n';
  } else {
    out += formatRow('COBRAR DO CLIENTE:', formatCurrencyBRL(grandTotal)) + '\n';
    out += CMD.NORMAL_SIZE;
  }
  out += CMD.BOLD_OFF;
  out += formatDivider('-') + '\n';

  // ITENS PARA CONFERÊNCIA NA BAG
  out += CMD.BOLD_ON;
  out += 'CONFERENCIA DE ITENS NA BAG:\n';
  out += CMD.BOLD_OFF;

  (order.items || []).forEach(item => {
    out += `[ ] ${item.quantity}x ${sanitizeText(item.name).toUpperCase()}\n`;
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        out += `     + ${sanitizeText(opt)}\n`;
      });
    }
  });

  // OBSERVAÇÃO DE ENTREGA
  if (order.observation) {
    out += formatDivider('-') + '\n';
    out += CMD.BOLD_ON;
    out += `OBS ENTREGA: ${sanitizeText(order.observation).toUpperCase()}\n`;
    out += CMD.BOLD_OFF;
  }

  // Rodapé compacto
  out += formatDivider('-') + '\n';
  out += CMD.ALIGN_CENTER;
  out += 'Dirija com cuidado! Boa entrega.\n';

  // Finalização e corte (3 quebras de linha para avanço justo até a guilhotina)
  out += '\n\n\n';
  if (options.cutPaper !== false) {
    out += getCutCommand(options.cutMode || 'full');
  }

  return out;
}

// ==============================================================================
// 🔄 3. AMBOS OS TICKETS (1º BALCÃO COM CORTE, 2º MOTOBOY/COZINHA COM CORTE)
// ==============================================================================
export function buildBothEscpos(order, options = {}) {
  const isDelivery = order.deliveryType === 'delivery';
  const counter = buildCounterEscpos(order, {
    ...options,
    copyLabel: isDelivery ? 'VIA BALCAO & COZINHA' : 'VIA BALCAO & CAIXA'
  });
  const secondTicket = isDelivery
    ? buildMotoboyEscpos(order, { ...options, copyLabel: 'VIA DO MOTOBOY / ENTREGA' })
    : buildKitchenEscpos(order, { ...options, copyLabel: 'VIA DA COZINHA / PRODUCAO' });
  return counter + secondTicket;
}

/**
 * Retorna os dois cupons como uma lista para impressão sequencial com pausa de guilhotina
 */
export function buildBothEscposList(order, options = {}) {
  const isDelivery = order.deliveryType === 'delivery';
  const counter = buildCounterEscpos(order, {
    ...options,
    copyLabel: isDelivery ? 'VIA BALCAO & COZINHA' : 'VIA BALCAO & CAIXA'
  });
  const secondTicket = isDelivery
    ? buildMotoboyEscpos(order, { ...options, copyLabel: 'VIA DO MOTOBOY / ENTREGA' })
    : buildKitchenEscpos(order, { ...options, copyLabel: 'VIA DA COZINHA / PRODUCAO' });
  return [
    { type: 'counter', label: isDelivery ? '1ª Via: Balcão & Cozinha' : '1ª Via: Balcão / Caixa', rawEscpos: counter },
    { type: isDelivery ? 'motoboy' : 'kitchen', label: isDelivery ? '2ª Via: Motoboy' : '2ª Via: Cozinha', rawEscpos: secondTicket }
  ];
}

// ==============================================================================
// 🧪 4. TICKET DE TESTE DE COMUNICAÇÃO ELGIN i8
// ==============================================================================
export function buildTestEscpos(printerIpOrOptions = 'Impressora Padrão', printerPort = 9100, customOptions = {}) {
  let opts = {};
  let label = 'Impressora Padrão do Sistema';
  if (typeof printerIpOrOptions === 'object' && printerIpOrOptions !== null) {
    opts = printerIpOrOptions;
    label = opts.printerName || 'Impressora Padrão do Sistema';
  } else {
    opts = customOptions || {};
    label = printerIpOrOptions || 'Impressora Padrão do Sistema';
  }

  const width = getLineWidth(opts);
  let out = '';
  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_SIZE;
  out += 'SDG RESTAURANTE\n';
  out += CMD.NORMAL_SIZE;
  out += 'TESTE DE IMPRESSAO TERMICA\n';
  out += formatDivider('=', width) + '\n';

  out += CMD.ALIGN_LEFT;
  out += CMD.BOLD_ON;
  out += 'STATUS DA COMUNICACAO: OK (SUCESSO)\n';
  out += CMD.BOLD_OFF;
  out += `DESTINO: ${sanitizeText(label)}\n`;
  out += `BOBINA CONFIGURADA: ${opts.paperWidth === '58mm' ? '58mm (32 colunas)' : '80mm (48 colunas)'}\n`;
  out += `DATA/HORA: ${formatTicketDateTime(new Date().toISOString())}\n`;
  out += formatDivider('-', width) + '\n';
  out += 'Modulos Integrados no Sistema:\n';
  out += '  [X] Comanda de Cozinha (Producao / KDS)\n';
  out += '  [X] Cupom de Balcao (Caixa / Cliente)\n';
  out += '  [X] Via do Motoboy (Entrega)\n';
  out += '  [X] Corte automatico de guilhotina\n';
  out += '  [X] Impressao automatica ao confirmar\n';
  out += formatDivider('=', width) + '\n';

  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += '*** IMPRESSORA PRONTA PARA OPERACAO ***\n';
  out += CMD.BOLD_OFF;

  out += '\n\n\n\n';
  out += getCutCommand(opts.cutMode || 'full');
  return out;
}

// ==============================================================================
// 💵 5. COMPROVANTE DE FECHAMENTO DE CAIXA (REDUÇÃO Z / LEITURA X)
// ==============================================================================
export function buildCashierClosingEscpos(shiftData, options = {}) {
  const restaurantName = options.restaurantName || 'SDG BURGER & PIZZA';
  const isPartial = options.isPartial || false;
  const closing = shiftData.closingData || shiftData;
  let out = '';

  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += `${sanitizeText(restaurantName).toUpperCase()}\n`;
  out += CMD.DOUBLE_SIZE;
  out += isPartial ? 'LEITURA X DE CAIXA\n' : 'FECHAMENTO DE CAIXA\n';
  out += CMD.NORMAL_SIZE;
  out += isPartial ? '*** CONFERENCIA PARCIAL DE TURNO ***\n' : '*** COMPROVANTE OFICIAL DE TURNO ***\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('=') + '\n';

  out += CMD.ALIGN_LEFT;
  out += `TURNO: #${shiftData.id || 'CAIXA'}\n`;
  out += `OPERADOR: ${sanitizeText(shiftData.operatorName || 'Operador')}\n`;
  out += `ABERTURA: ${formatTicketDateTime(shiftData.openedAt)}\n`;
  if (!isPartial && shiftData.closedAt) {
    out += `FECHAMENTO: ${formatTicketDateTime(shiftData.closedAt)}\n`;
  } else {
    out += `EMISSAO: ${formatTicketDateTime(new Date().toISOString())}\n`;
  }
  out += formatDivider('-') + '\n';

  // Resumo de Dinheiro Físico na Gaveta
  out += CMD.BOLD_ON;
  out += '1. CONFERENCIA DE DINHEIRO (GAVETA)\n';
  out += CMD.BOLD_OFF;
  out += formatRow('Fundo Inicial (Troco):', formatCurrencyBRL(shiftData.initialCash || 0)) + '\n';
  out += formatRow('(+) Vendas em Dinheiro:', formatCurrencyBRL(closing.totalCash || 0)) + '\n';
  out += formatRow('(+) Suprimentos / Entradas:', formatCurrencyBRL(closing.totalSuprimentos || 0)) + '\n';
  out += formatRow('(-) Sangrias / Retiradas:', '-' + formatCurrencyBRL(closing.totalSangrias || 0)) + '\n';
  out += formatDivider('-') + '\n';

  out += CMD.BOLD_ON;
  out += formatRow('DINHEIRO ESPERADO:', formatCurrencyBRL(closing.expectedCash || 0)) + '\n';
  if (!isPartial && closing.countedCash !== undefined) {
    out += formatRow('DINHEIRO CONTADO:', formatCurrencyBRL(closing.countedCash || 0)) + '\n';
    const diff = Number(closing.difference || 0);
    const diffLabel = diff === 0 ? 'DIFERENCA (EXATO):' : (diff > 0 ? 'SOBRA DE CAIXA:' : 'FALTA DE CAIXA:');
    out += formatRow(diffLabel, (diff > 0 ? '+' : '') + formatCurrencyBRL(diff)) + '\n';
  }
  out += CMD.BOLD_OFF;
  out += formatDivider('-') + '\n';

  // Faturamento Total por Forma de Pagamento
  out += CMD.BOLD_ON;
  out += '2. FATURAMENTO POR FORMA DE PAGAMENTO\n';
  out += CMD.BOLD_OFF;
  out += formatRow(`Pix (${closing.countPix || 0}):`, formatCurrencyBRL(closing.totalPix || 0)) + '\n';
  out += formatRow(`Cartao Credito (${closing.countCredit || 0}):`, formatCurrencyBRL(closing.totalCredit || 0)) + '\n';
  out += formatRow(`Cartao Debito (${closing.countDebit || 0}):`, formatCurrencyBRL(closing.totalDebit || 0)) + '\n';
  out += formatRow(`Dinheiro (${closing.countCash || 0}):`, formatCurrencyBRL(closing.totalCash || 0)) + '\n';
  out += formatDivider('-') + '\n';

  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_HEIGHT;
  out += formatRow('TOTAL FATURADO:', formatCurrencyBRL(closing.totalSales || 0)) + '\n';
  out += CMD.NORMAL_SIZE;
  out += formatRow('Total de Pedidos:', String(closing.ordersCount || 0)) + '\n';
  out += formatRow('Ticket Medio:', formatCurrencyBRL(closing.averageTicket || 0)) + '\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('-') + '\n';

  // Distribuição por Canal
  if (closing.byChannel) {
    out += CMD.BOLD_ON;
    out += '3. DISTRIBUICAO POR CANAL DE VENDA\n';
    out += CMD.BOLD_OFF;
    out += formatRow(`Delivery (${closing.byChannel.delivery?.count || 0}):`, formatCurrencyBRL(closing.byChannel.delivery?.total || 0)) + '\n';
    out += formatRow(`Retirada Balcao (${closing.byChannel.takeout?.count || 0}):`, formatCurrencyBRL(closing.byChannel.takeout?.total || 0)) + '\n';
    out += formatRow(`Salao / Mesas (${closing.byChannel.dine_in?.count || 0}):`, formatCurrencyBRL(closing.byChannel.dine_in?.total || 0)) + '\n';
    if (closing.totalDeliveryFee) {
      out += formatRow('Total Taxas Entrega:', formatCurrencyBRL(closing.totalDeliveryFee)) + '\n';
    }
    out += formatDivider('-') + '\n';
  }

  // Lista de Movimentações (Sangrias e Suprimentos)
  const movs = shiftData.movements || [];
  if (movs.length > 0) {
    out += CMD.BOLD_ON;
    out += '4. MOVIMENTACOES DE CAIXA DO TURNO\n';
    out += CMD.BOLD_OFF;
    movs.forEach(m => {
      const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const prefix = m.type === 'suprimento' ? '[+] SUPRIMENTO' : '[-] SANGRIA';
      out += `${time} ${prefix} ${formatCurrencyBRL(m.amount)}\n`;
      if (m.reason) out += `   Motivo: ${sanitizeText(m.reason)}\n`;
    });
    out += formatDivider('-') + '\n';
  }

  if (closing.notes || shiftData.notes) {
    out += `OBS: ${sanitizeText(closing.notes || shiftData.notes)}\n`;
    out += formatDivider('-') + '\n';
  }

  if (!isPartial) {
    out += '\n\n';
    out += formatCenter('________________________________________') + '\n';
    out += formatCenter(`Operador: ${sanitizeText(shiftData.operatorName || 'Operador')}`) + '\n';
    out += '\n\n';
    out += formatCenter('________________________________________') + '\n';
    out += formatCenter('Gerente / Responsavel da Loja') + '\n';
  }

  out += formatDivider('=') + '\n';
  out += CMD.ALIGN_CENTER;
  out += 'SDG DELIVERY & RESTAURANTE\n';
  out += '\n\n\n\n';
  out += CMD.CUT_FULL;

  return out;
}

/**
 * Formata comprovante / vale de comissão de motoboy para bobina térmica de 80mm Elgin i8
 * @param {Object} data - Dados do acerto de comissão do motoboy
 * @param {string} data.motoboyName - Nome do entregador
 * @param {string} [data.motoboyPhone] - Telefone / Chave Pix
 * @param {Array} data.deliveries - Lista de entregas realizadas [{ id, time, address, deliveryFee, commission }]
 * @param {number} data.totalDeliveries - Total de corridas
 * @param {number} data.totalCommission - Valor total a pagar
 * @param {number} [data.dailyAllowance] - Diária fixa
 * @param {string} [data.status] - 'pago' | 'pendente'
 * @param {string} [data.paymentMethod] - 'dinheiro' | 'pix'
 * @param {string} [data.operatorName] - Operador do caixa que fez o acerto
 * @param {string} [data.notes] - Observações
 * @param {Object} [options]
 */
export function buildMotoboyCommissionEscpos(data, options = {}) {
  const restaurantName = options.restaurantName || 'SDG RESTAURANTE';
  let out = '';

  out += CMD.INIT;
  out += CMD.ALIGN_CENTER;
  out += CMD.BOLD_ON;
  out += `${sanitizeText(restaurantName)}\n`;
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;
  out += 'EXTRATO DE COMISSAO / ACERTO MOTOBOY\n';
  out += formatDivider('=') + '\n';

  out += CMD.ALIGN_LEFT;
  out += `ENTREGADOR: ${sanitizeText(data.motoboyName || 'Entregador')}\n`;
  if (data.motoboyPhone) {
    out += `CHAVE PIX/TEL: ${sanitizeText(data.motoboyPhone)}\n`;
  }
  out += `EMISSAO: ${formatTicketDateTime(new Date().toISOString())}\n`;
  if (data.operatorName) {
    out += `RESPONSAVEL: ${sanitizeText(data.operatorName)}\n`;
  }
  out += formatDivider('-') + '\n';

  // Detalhamento das entregas
  out += CMD.BOLD_ON;
  out += formatRow('PEDIDO / HORARIO', 'COMISSAO') + '\n';
  out += CMD.BOLD_OFF;
  out += formatDivider('-') + '\n';

  const list = data.deliveries || [];
  list.forEach(item => {
    const time = item.time ? new Date(item.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const leftText = `#${item.id} (${time})`;
    const rightText = formatCurrencyBRL(item.commission || 0);
    out += formatRow(leftText, rightText) + '\n';
    if (item.address) {
      const cleanAddr = sanitizeText(item.address);
      out += `   ${cleanAddr.substring(0, LINE_WIDTH_80MM - 5)}\n`;
    }
  });

  out += formatDivider('-') + '\n';
  out += formatRow('Total de Corridas:', String(data.totalDeliveries || list.length)) + '\n';
  if (data.dailyAllowance) {
    out += formatRow('Diaria Fixa:', formatCurrencyBRL(data.dailyAllowance)) + '\n';
  }

  out += CMD.BOLD_ON;
  out += CMD.DOUBLE_HEIGHT;
  out += formatRow('TOTAL A ACERTAR:', formatCurrencyBRL(data.totalCommission || 0)) + '\n';
  out += CMD.NORMAL_SIZE;
  out += CMD.BOLD_OFF;

  const statusLabel = data.status === 'pago' ? '[X] PAGO / QUITADO' : '[ ] PENDENTE DE ACERTO';
  out += formatCenter(`SITUACAO: ${statusLabel}`) + '\n';
  if (data.paymentMethod) {
    out += formatCenter(`Forma: ${sanitizeText(data.paymentMethod.toUpperCase())}`) + '\n';
  }

  if (data.notes) {
    out += formatDivider('-') + '\n';
    out += `OBS: ${sanitizeText(data.notes)}\n`;
  }

  out += formatDivider('-') + '\n';
  out += '\n\n';
  out += formatCenter('________________________________________') + '\n';
  out += formatCenter(`Entregador: ${sanitizeText(data.motoboyName || 'Entregador')}`) + '\n';
  out += '\n\n';
  out += formatCenter('________________________________________') + '\n';
  out += formatCenter('Responsavel do Caixa / Balcao') + '\n';

  out += formatDivider('=') + '\n';
  out += CMD.ALIGN_CENTER;
  out += 'SDG DELIVERY & RESTAURANTE\n';
  out += '\n\n\n\n';
  out += CMD.CUT_FULL;

  return out;
}

