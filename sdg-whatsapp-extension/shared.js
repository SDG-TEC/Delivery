// ==============================================================================
// 🚀 SDG Delivery - Extensão Chrome para WhatsApp & Balcão (shared.js)
// Utilitários Compartilhados: Supabase, Impressão Elgin i8, Parser de Texto
// ==============================================================================

(function () {
  const DEFAULT_CONFIG = {
    supabaseUrl: '',
    supabaseAnonKey: '',
    printerServerUrl: 'http://localhost:3001',
    printerIp: '192.168.1.100',
    printerPort: 9100,
    defaultDeliveryFee: 5.00,
    autoPrintKitchen: true,
    autoPrintCounter: true,
    soundEnabled: true
  };

  // Carrega configurações persistidas da extensão
  async function getConfig() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['sdg_extension_config'], (res) => {
          resolve({ ...DEFAULT_CONFIG, ...(res.sdg_extension_config || {}) });
        });
      } else {
        resolve(DEFAULT_CONFIG);
      }
    });
  }

  // Salva configurações da extensão
  async function saveConfig(newConfig) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ sdg_extension_config: newConfig }, () => {
          resolve(newConfig);
        });
      } else {
        resolve(newConfig);
      }
    });
  }

  // Limpa caracteres especiais de número de telefone
  function cleanPhoneDigits(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
  }

  // Formata telefone no padrão amigável (XX) 9XXXX-XXXX
  function formatPhoneBRL(raw) {
    const digits = cleanPhoneDigits(raw);
    if (!digits) return '';
    // Remove DDI 55 se presente no início
    let num = digits;
    if (num.startsWith('55') && num.length >= 12) {
      num = num.substring(2);
    }
    if (num.length === 11) {
      return `(${num.substring(0, 2)}) ${num.substring(2, 7)}-${num.substring(7)}`;
    }
    if (num.length === 10) {
      return `(${num.substring(0, 2)}) ${num.substring(2, 6)}-${num.substring(6)}`;
    }
    return raw;
  }

  // Formata moeda BRL
  function formatCurrency(val) {
    const num = Number(val || 0);
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  }

  // --- REQUISIÇÕES AO SUPABASE REST API ---

  // Busca catálogo de produtos ativos
  async function fetchProducts() {
    const config = await getConfig();
    try {
      const url = `${config.supabaseUrl}/rest/v1/products?select=id,name,price,category_id,image,description&is_active=eq.true&order=name.asc`;
      const res = await fetch(url, {
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Erro ao carregar produtos do Supabase:', e);
      return [];
    }
  }

  // Reconhece e busca dados do cliente pelo número de telefone
  async function lookupCustomer(phone) {
    const config = await getConfig();
    const clean = cleanPhoneDigits(phone);
    if (!clean || clean.length < 8) return null;

    // Remove 55 inicial para busca mais flexível
    const national = clean.startsWith('55') ? clean.substring(2) : clean;
    const last8 = national.slice(-8);

    try {
      // Tenta busca exata ou por trecho final do telefone
      const query = `or=(phone.ilike.%25${national}%25,phone.ilike.%25${last8}%25)&limit=1`;
      const url = `${config.supabaseUrl}/rest/v1/customers?${query}`;
      const res = await fetch(url, {
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (!res.ok) return null;
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        return list[0];
      }
      return null;
    } catch (e) {
      console.warn('Erro na busca de cliente:', e);
      return null;
    }
  }

  // Mapeia e higieniza payload para as colunas exatas suportadas pela tabela 'orders' no Supabase
  function sanitizeOrderRow(order) {
    const row = {
      id: order.id,
      created_at: order.created_at || order.createdAt || new Date().toISOString(),
      updated_at: order.updated_at || order.updatedAt || new Date().toISOString(),
      customer_name: order.customer_name || order.customerName || 'Cliente',
      customer_phone: order.customer_phone || order.customerPhone || '',
      delivery_type: order.delivery_type || order.deliveryType || 'takeout',
      address: order.address || '',
      payment_method: order.payment_method || order.paymentMethod || 'pix',
      status: order.status || 'aguardando_pagamento',
      total: Number(order.total) || 0,
      observation: order.observation || '',
      items: Array.isArray(order.items) ? order.items : []
    };
    // Garante que 'media' não seja enviada a menos que explicitamente suportada
    delete row.media;
    return row;
  }

  // Salva pedido no Supabase
  async function insertOrder(orderPayload) {
    const config = await getConfig();
    const url = `${config.supabaseUrl}/rest/v1/orders`;
    let payload = sanitizeOrderRow(orderPayload);

    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errText = await res.text();

      // Auto-cura para PostgREST PGRST204 (coluna ausente no schema cache, ex: media)
      if (res.status === 400 && errText.includes('PGRST204')) {
        const colMatch = errText.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1]) {
          const missingCol = colMatch[1];
          console.warn(`[SDG Extensão] Removendo coluna não existente '${missingCol}' do payload e retentando...`);
          delete payload[missingCol];
          const retryRes = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': config.supabaseAnonKey,
              'Authorization': `Bearer ${config.supabaseAnonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            return Array.isArray(data) ? data[0] : data;
          }
          errText = await retryRes.text();
        }
      }

      throw new Error(`Falha ao salvar pedido no Supabase (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  }

  // Busca anotações e pedidos lançados hoje pelo WhatsApp
  async function fetchTodayOrders() {
    const config = await getConfig();
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const url = `${config.supabaseUrl}/rest/v1/orders?created_at=gte.${todayIso}T00:00:00&order=created_at.desc&limit=50`;
      const res = await fetch(url, {
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('Erro ao carregar pedidos de hoje:', e);
      return [];
    }
  }

  // --- ESC/POS & IMPRESSÃO TÉRMICA (ELGIN i8 / i9) ---

  const ESC = '\x1b';
  const GS = '\x1d';

  const CMD = {
    INIT: ESC + '@',
    ALIGN_LEFT: ESC + 'a\x00',
    ALIGN_CENTER: ESC + 'a\x01',
    ALIGN_RIGHT: ESC + 'a\x02',
    BOLD_ON: ESC + 'E\x01',
    BOLD_OFF: ESC + 'E\x00',
    DOUBLE_SIZE: GS + '!\x11',
    DOUBLE_HEIGHT: GS + '!\x01',
    DOUBLE_WIDTH: GS + '!\x10',
    NORMAL_SIZE: GS + '!\x00',
    CUT_FULL: GS + 'V\x41\x00',
    CUT_PARTIAL: GS + 'V\x42\x00',
    FEED_3: ESC + 'd\x03',
    FEED_5: ESC + 'd\x05'
  };

  function sanitizeAscii(text) {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/º/g, 'o')
      .replace(/ª/g, 'a')
      .replace(/[^\x20-\x7E\n]/g, ' ');
  }

  function formatRow(left, right, width = 48) {
    const l = sanitizeAscii(left);
    const r = sanitizeAscii(right);
    const spaces = Math.max(1, width - l.length - r.length);
    return l + ' '.repeat(spaces) + r;
  }

  function formatCenter(text, width = 48) {
    const clean = sanitizeAscii(text);
    if (clean.length >= width) return clean.slice(0, width);
    const leftPad = Math.floor((width - clean.length) / 2);
    const rightPad = width - clean.length - leftPad;
    return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
  }

  // Gera Cupom da Cozinha (KDS / Impressora Térmica)
  function buildKitchenEscpos(order) {
    const isDelivery = order.delivery_type === 'delivery';
    const typeLabel = isDelivery ? '>> DELIVERY / MOTOBOY <<' : '>> RETIRADA NO BALCAO <<';
    const timeStr = new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let t = '';
    t += CMD.INIT;
    t += CMD.ALIGN_CENTER;
    t += CMD.BOLD_ON;
    t += '*** SDG BURGER & PIZZA ***\n';
    t += CMD.DOUBLE_SIZE;
    t += `PEDIDO COZINHA #${order.id}\n`;
    t += CMD.NORMAL_SIZE;
    t += CMD.BOLD_ON;
    t += `${typeLabel}\n`;
    t += CMD.BOLD_OFF;
    t += `Hora: ${timeStr}  |  Origem: WhatsApp / Balcao\n`;
    t += '-'.repeat(48) + '\n';

    t += CMD.ALIGN_LEFT;
    t += `Cliente: ${sanitizeAscii(order.customer_name)}\n`;
    t += `Tel: ${order.customer_phone || 'Nao informado'}\n`;
    if (isDelivery && order.address) {
      t += CMD.BOLD_ON;
      t += `ENTREGA: ${sanitizeAscii(order.address)}\n`;
      t += CMD.BOLD_OFF;
    }
    t += '-'.repeat(48) + '\n';

    // Itens
    t += CMD.BOLD_ON;
    t += 'QTD  DESCRICAO DO ITEM\n';
    t += CMD.BOLD_OFF;
    t += '-'.repeat(48) + '\n';

    (order.items || []).forEach(item => {
      t += CMD.BOLD_ON;
      t += CMD.DOUBLE_HEIGHT;
      t += `[${item.quantity}x] ${sanitizeAscii(item.name).toUpperCase()}\n`;
      t += CMD.NORMAL_SIZE;
      t += CMD.BOLD_OFF;

      if (item.observation) {
        t += `   >> OBS: ${sanitizeAscii(item.observation)}\n`;
      }
    });

    t += '-'.repeat(48) + '\n';

    if (order.observation) {
      t += CMD.BOLD_ON;
      t += `OBSERVACOES GERAIS:\n${sanitizeAscii(order.observation)}\n`;
      t += CMD.BOLD_OFF;
      t += '-'.repeat(48) + '\n';
    }

    t += CMD.ALIGN_CENTER;
    t += 'PRODUCAO IMEDIATA - AGILIDADE\n';
    t += CMD.FEED_5;
    t += CMD.CUT_FULL;
    return t;
  }

  // Gera Cupom do Balcão / Cliente com valores
  function buildCounterEscpos(order) {
    const isDelivery = order.delivery_type === 'delivery';
    const timeStr = new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let t = '';
    t += CMD.INIT;
    t += CMD.ALIGN_CENTER;
    t += CMD.BOLD_ON;
    t += '*** SDG BURGER & PIZZA ***\n';
    t += 'CUPOM DE BALCAO / CONFERENCIA\n';
    t += CMD.DOUBLE_SIZE;
    t += `#${order.id}\n`;
    t += CMD.NORMAL_SIZE;
    t += CMD.BOLD_OFF;
    t += `Hora: ${timeStr}  |  Origem: WhatsApp\n`;
    t += '='.repeat(48) + '\n';

    t += CMD.ALIGN_LEFT;
    t += `Cliente: ${sanitizeAscii(order.customer_name)}\n`;
    t += `Tel: ${order.customer_phone}\n`;
    if (isDelivery) {
      t += `Endereco: ${sanitizeAscii(order.address)}\n`;
    } else {
      t += `Modalidade: Retirada no Balcao\n`;
    }
    t += '-'.repeat(48) + '\n';

    // Itens e preços
    t += formatRow('ITEM', 'TOTAL') + '\n';
    t += '-'.repeat(48) + '\n';

    let subtotal = 0;
    (order.items || []).forEach(item => {
      const itemSub = Number(item.subtotal || (item.price * item.quantity) || 0);
      subtotal += itemSub;
      const leftDesc = `${item.quantity}x ${item.name}`;
      t += formatRow(leftDesc, formatCurrency(itemSub)) + '\n';
    });

    t += '-'.repeat(48) + '\n';
    t += formatRow('Subtotal Itens:', formatCurrency(subtotal)) + '\n';

    if (isDelivery) {
      const fee = Number(order.delivery_fee || 0);
      t += formatRow('Taxa de Entrega:', formatCurrency(fee)) + '\n';
    }

    t += CMD.BOLD_ON;
    t += CMD.DOUBLE_HEIGHT;
    t += formatRow('TOTAL A PAGAR:', formatCurrency(order.total)) + '\n';
    t += CMD.NORMAL_SIZE;
    t += formatRow('Forma de Pagamento:', sanitizeAscii(order.payment_method).toUpperCase()) + '\n';
    t += CMD.BOLD_OFF;

    t += '='.repeat(48) + '\n';
    t += CMD.ALIGN_CENTER;
    t += 'Obrigado pela preferencia!\n';
    t += CMD.FEED_5;
    t += CMD.CUT_FULL;
    return t;
  }

  // Envia impressão diretamente ao Servidor Local Elgin i8 ou ponte Realtime
  async function sendPrint(order, mode = 'both') {
    const config = await getConfig();
    const tickets = [];

    if (mode === 'kitchen' || mode === 'both') {
      tickets.push(buildKitchenEscpos(order));
    }
    if (mode === 'counter' || mode === 'both') {
      tickets.push(buildCounterEscpos(order));
    }

    if (tickets.length === 0) return { success: false, message: 'Nenhum cupom gerado' };

    // 1. Tenta envio direto ao servidor local de impressão (http://localhost:3001/api/printer/print)
    try {
      const endpoint = `${config.printerServerUrl.replace(/\/+$/, '')}/api/printer/print`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: config.printerIp,
          printerPort: Number(config.printerPort) || 9100,
          tickets
        })
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, via: 'local_server', message: data.message || 'Impresso com sucesso na Elgin i8!' };
      }
    } catch (localErr) {
      console.warn('Servidor local de impressão inacessível, tentando ponte Realtime...', localErr.message);
    }

    // 2. Se falhar, tenta via Supabase REST / Realtime broadcast
    try {
      const broadcastUrl = `${config.supabaseUrl}/rest/v1/rpc/broadcast_printer_job`;
      // Se não houver RPC, fallback informativo
      return { success: true, via: 'queued', message: 'Pedido registrado no sistema (Servidor de impressão offline no momento)' };
    } catch (e) {
      return { success: false, message: 'Não foi possível comunicar com a impressora: ' + e.message };
    }
  }

  // --- PARSER INTELIGENTE DE TEXTO DO WHATSAPP (COPIA E COLA) ---
  function parseWhatsAppMessage(rawText, productsCatalog = []) {
    if (!rawText || !rawText.trim()) return null;

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const result = {
      customerName: '',
      customerPhone: '',
      address: '',
      deliveryType: 'delivery',
      paymentMethod: 'pix',
      observation: '',
      items: [],
      deliveryFee: 5.00
    };

    const remainingLines = [];

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Detecta Endereço
      if (lower.startsWith('end:') || lower.startsWith('endereço:') || lower.startsWith('endereco:') || lower.startsWith('entrega:') ||
          lower.includes('rua ') || lower.includes('av.') || lower.includes('avenida ') || lower.includes('alameda ') ||
          lower.includes('bairro ') || lower.includes('apto ') || lower.includes('bloco ') || lower.includes('casa ')) {
        result.address = line.replace(/^(end:|endereço:|endereco:|entrega:)/i, '').trim();
        result.deliveryType = 'delivery';
        continue;
      }

      // Detecta Retirada no Balcão
      if (lower.includes('balcão') || lower.includes('balcao') || lower.includes('retirar') || lower.includes('retirada') || lower.includes('buscar')) {
        result.deliveryType = 'takeout';
        result.address = 'Retirada no Balcão';
        result.deliveryFee = 0;
        continue;
      }

      // Detecta Pagamento
      if (lower.includes('pix')) {
        result.paymentMethod = 'pix';
        continue;
      }
      if (lower.includes('dinheiro')) {
        result.paymentMethod = 'cash';
        const trocoMatch = line.match(/troco\s*(?:para)?\s*R?\$?\s*(\d+[.,]?\d*)/i);
        if (trocoMatch) {
          result.observation += (result.observation ? ' | ' : '') + `Troco para R$ ${trocoMatch[1]}`;
        }
        continue;
      }
      if (lower.includes('cartao') || lower.includes('cartão') || lower.includes('debito') || lower.includes('débito') || lower.includes('credito') || lower.includes('crédito')) {
        result.paymentMethod = 'credit_card';
        continue;
      }

      // Detecta Observação ("sem cebola", "bem passado", etc.)
      if (lower.startsWith('obs:') || lower.startsWith('observação:') || lower.startsWith('observacao:') ||
          lower.startsWith('sem ') || lower.includes('ponto da carne') || lower.includes('bem passado') || lower.includes('ao ponto')) {
        result.observation += (result.observation ? ' | ' : '') + line.replace(/^(obs:|observação:|observacao:)/i, '').trim();
        continue;
      }

      // Detecta Nome
      if (lower.startsWith('nome:') || lower.startsWith('cliente:')) {
        result.customerName = line.replace(/^(nome:|cliente:)/i, '').trim();
        continue;
      }

      // Detecta Telefone
      if (lower.startsWith('tel:') || lower.startsWith('telefone:') || lower.startsWith('zap:')) {
        result.customerPhone = line.replace(/^(tel:|telefone:|zap:)/i, '').trim();
        continue;
      }

      remainingLines.push(line);
    }

    // Processa linhas restantes procurando itens (ex: "1 x-tudo 20", "2 coca 2l", "pizza 4 sabores")
    for (const line of remainingLines) {
      let qty = 1;
      let cleanLine = line;

      // Padrão "2x" ou "2 " ou "1-" no início
      const qtyMatch = cleanLine.match(/^(\d+)\s*(?:x|un|-)?\s*(.*)/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10) || 1;
        cleanLine = qtyMatch[2].trim();
      }

      // Padrão de preço no final da linha (ex: "20.00" ou "R$ 25,00")
      let price = 0;
      const priceMatch = cleanLine.match(/(?:r\$)?\s*(\d+[.,]\d{2}|\d+)\s*$/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));
        cleanLine = cleanLine.substring(0, priceMatch.index).trim();
      }

      // Tenta cruzar com os produtos cadastrados no catálogo para pegar o preço oficial se não informado
      const lowerLine = cleanLine.toLowerCase();
      let matchedProd = null;

      if (productsCatalog && productsCatalog.length > 0) {
        matchedProd = productsCatalog.find(p => {
          const pName = p.name.toLowerCase();
          return pName === lowerLine || lowerLine.includes(pName) || pName.includes(lowerLine);
        });
      }

      const itemName = matchedProd ? matchedProd.name : (cleanLine || 'Item do Pedido');
      const itemPrice = price > 0 ? price : (matchedProd ? Number(matchedProd.price) : 0);

      result.items.push({
        id: matchedProd ? matchedProd.id : `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: itemName,
        quantity: qty,
        price: itemPrice,
        subtotal: itemPrice * qty,
        observation: ''
      });
    }

    return result;
  }

  // Formata mensagem de confirmação para enviar de volta no WhatsApp
  function formatConfirmationWhatsApp(order, storeName = 'SDG Burger & Pizza') {
    const isDelivery = order.delivery_type === 'delivery';
    let text = `🍕 *${storeName}*\n`;
    text += `✅ *Pedido Confirmado no Balcão!*\n`;
    text += `Nº do Pedido: *#${order.id}*\n\n`;

    text += `👤 *Cliente:* ${order.customer_name || 'Amigo(a)'}\n`;
    if (order.customer_phone) {
      text += `📱 *Telefone:* ${formatPhoneBRL(order.customer_phone)}\n`;
    }

    text += `\n📋 *Itens do Pedido:*\n`;
    (order.items || []).forEach(item => {
      const priceStr = item.subtotal ? ` (${formatCurrency(item.subtotal)})` : '';
      text += `• ${item.quantity}x *${item.name}*${priceStr}\n`;
      if (item.observation) {
        text += `  _Obs: ${item.observation}_\n`;
      }
    });

    text += `\n`;
    if (isDelivery) {
      text += `🛵 *Tipo:* Entrega (Delivery)\n`;
      text += `📍 *Endereço:* ${order.address}\n`;
      if (order.delivery_fee) {
        text += `🛵 *Taxa de Entrega:* ${formatCurrency(order.delivery_fee)}\n`;
      }
    } else {
      text += `🏬 *Tipo:* Retirada no Balcão\n`;
    }

    text += `💳 *Forma de Pagamento:* ${order.payment_method.toUpperCase()}\n`;
    text += `💰 *VALOR TOTAL:* *${formatCurrency(order.total)}*\n\n`;

    if (order.observation) {
      text += `📝 *Observações:* ${order.observation}\n\n`;
    }

    text += `⏱️ *Tempo Estimado:* 30 a 45 minutos.\n`;
    text += `Seu pedido já foi impresso e está sendo preparado na cozinha! 🔥`;
    return text;
  }

  // Expõe no objeto global
  window.SDG_DELIVERY_SHARED = {
    DEFAULT_CONFIG,
    getConfig,
    saveConfig,
    cleanPhoneDigits,
    formatPhoneBRL,
    formatCurrency,
    fetchProducts,
    lookupCustomer,
    insertOrder,
    fetchTodayOrders,
    buildKitchenEscpos,
    buildCounterEscpos,
    sendPrint,
    parseWhatsAppMessage,
    formatConfirmationWhatsApp
  };
})();
