// ==============================================================================
// 🚀 SDG Delivery - Content Script para WhatsApp Web
// Bolinha Flutuante, Painel Lateral, Reconhecimento de Cliente e Lançamento de Pedidos
// ==============================================================================

(function () {
  'use strict';

  // Evita injeção duplicada
  if (document.getElementById('sdg-floating-bubble')) return;

  const shared = window.SDG_DELIVERY_SHARED;
  if (!shared) {
    console.error('SDG Delivery: shared.js não carregado.');
    return;
  }

  // Estado local do pedido atual
  let currentOrder = {
    customerPhone: '',
    customerName: '',
    deliveryType: 'delivery',
    address: '',
    deliveryFee: 5.00,
    paymentMethod: 'pix',
    cashChangeFor: '',
    observation: '',
    items: []
  };

  let productsCatalog = [];
  let todayOrdersList = [];
  let currentActiveTab = 'order'; // 'order' | 'paste' | 'history' | 'settings'

  // --- 1. CRIAÇÃO DA BOLINHA FLUTUANTE (DRAGGABLE) ---
  function createFloatingBubble() {
    const bubble = document.createElement('div');
    bubble.id = 'sdg-floating-bubble';
    bubble.title = 'SDG Delivery - Lançador de Pedidos Balcão & WhatsApp';

    // Recupera posição salva
    try {
      const savedPos = localStorage.getItem('sdg_wz_bubble_pos');
      if (savedPos) {
        const { top, left, right, bottom } = JSON.parse(savedPos);
        if (top !== undefined && left !== undefined) {
          bubble.style.top = top + 'px';
          bubble.style.left = left + 'px';
          bubble.style.right = 'auto';
          bubble.style.bottom = 'auto';
        }
      }
    } catch (e) {}

    bubble.innerHTML = `
      <div class="sdg-bubble-inner">
        <div class="sdg-bubble-pulse"></div>
        <svg class="sdg-bubble-icon" viewBox="0 0 128 128" fill="none">
          <circle cx="64" cy="64" r="58" fill="#0f172a" stroke="#f59e0b" stroke-width="6"/>
          <circle cx="94" cy="34" r="18" fill="#10b981"/>
          <path d="M36 50 C36 36, 76 36, 76 50 Z" fill="#f59e0b"/>
          <rect x="34" y="58" width="44" height="8" rx="4" fill="#78350f"/>
          <path d="M33 66 L79 66 L77 70 L63 74 L61 70 L47 73 L35 70 Z" fill="#fbbf24"/>
          <path d="M36 72 L76 72 C76 80, 36 80, 36 72 Z" fill="#f59e0b"/>
          <text x="64" y="100" font-family="system-ui" font-weight="900" font-size="20" fill="#fbbf24" text-anchor="middle">SDG</text>
        </svg>
        <span class="sdg-bubble-badge" id="sdg-bubble-counter" style="display: none;">0</span>
      </div>
    `;

    document.body.appendChild(bubble);

    // Toggle ao clicar
    bubble.addEventListener('click', (e) => {
      if (bubble.dataset.wasDragged === 'true') {
        bubble.dataset.wasDragged = 'false';
        return;
      }
      toggleDrawer();
    });

    // Lógica para arrastar (Drag & Drop)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    bubble.addEventListener('mousedown', (e) => {
      isDragging = false;
      bubble.dataset.wasDragged = 'false';
      startX = e.clientX;
      startY = e.clientY;
      const rect = bubble.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          bubble.dataset.wasDragged = 'true';
          const newLeft = Math.max(10, Math.min(window.innerWidth - 70, initialLeft + dx));
          const newTop = Math.max(10, Math.min(window.innerHeight - 70, initialTop + dy));
          bubble.style.left = newLeft + 'px';
          bubble.style.top = newTop + 'px';
          bubble.style.right = 'auto';
          bubble.style.bottom = 'auto';
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (isDragging) {
          try {
            const rect = bubble.getBoundingClientRect();
            localStorage.setItem('sdg_wz_bubble_pos', JSON.stringify({
              left: rect.left,
              top: rect.top
            }));
          } catch (e) {}
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // --- 2. CRIAÇÃO DO PAINEL LATERAL (DRAWER) ---
  function createDrawerPanel() {
    const drawer = document.createElement('div');
    drawer.id = 'sdg-drawer-panel';
    drawer.innerHTML = `
      <!-- Header -->
      <div class="sdg-header">
        <div class="sdg-header-brand">
          <svg class="sdg-header-logo" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="58" fill="#0f172a" stroke="#f59e0b" stroke-width="6"/>
            <path d="M36 50 C36 36, 76 36, 76 50 Z" fill="#f59e0b"/>
            <rect x="34" y="58" width="44" height="8" rx="4" fill="#78350f"/>
            <path d="M33 66 L79 66 L77 70 L63 74 L61 70 L47 73 L35 70 Z" fill="#fbbf24"/>
            <path d="M36 72 L76 72 C76 80, 36 80, 36 72 Z" fill="#f59e0b"/>
            <text x="64" y="98" font-family="system-ui" font-weight="900" font-size="18" fill="#fbbf24" text-anchor="middle">SDG</text>
          </svg>
          <div>
            <h2 class="sdg-header-title">SDG Delivery & Balcão</h2>
            <span class="sdg-header-subtitle">Lançador Rápido WhatsApp</span>
          </div>
        </div>
        <div class="sdg-header-actions">
          <button type="button" class="sdg-btn-icon" id="sdg-btn-refresh-catalog" title="Atualizar Cardápio do Supabase">🔄</button>
          <button type="button" class="sdg-btn-icon" id="sdg-btn-close-drawer" title="Fechar Painel">✕</button>
        </div>
      </div>

      <!-- Abas de Navegação -->
      <div class="sdg-tabs">
        <button type="button" class="sdg-tab-btn active" data-tab="order">⚡ Novo Pedido</button>
        <button type="button" class="sdg-tab-btn" data-tab="paste">🪄 Colar do Zap</button>
        <button type="button" class="sdg-tab-btn" data-tab="history">📋 Anotações (<span id="sdg-tab-orders-count">0</span>)</button>
        <button type="button" class="sdg-tab-btn" data-tab="settings">⚙️ Ajustes</button>
      </div>

      <!-- Conteúdo do Painel -->
      <div class="sdg-body">
        
        <!-- ABA 1: NOVO PEDIDO -->
        <div class="sdg-tab-content active" id="sdg-tab-order">
          
          <!-- Seção do Cliente & Detecção do WhatsApp -->
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>👤 Cliente & Entrega</span>
              <button type="button" class="sdg-btn-secondary" id="sdg-btn-detect-chat" style="width: auto; padding: 3px 8px; font-size: 10px;">
                📲 Puxar Chat Aberto
              </button>
            </div>

            <div class="sdg-row-2">
              <div class="sdg-form-group">
                <label class="sdg-label">WhatsApp / Telefone *</label>
                <input type="text" class="sdg-input" id="sdg-input-phone" placeholder="(11) 98765-4321">
              </div>
              <div class="sdg-form-group">
                <label class="sdg-label">Nome do Cliente</label>
                <input type="text" class="sdg-input" id="sdg-input-name" placeholder="Ex: João Silva">
              </div>
            </div>

            <!-- Badge de Reconhecimento Automático de Endereço/Histórico -->
            <div id="sdg-customer-status-badge" style="display: none;"></div>

            <div class="sdg-row-2">
              <div class="sdg-form-group">
                <label class="sdg-label">Tipo de Entrega *</label>
                <select class="sdg-select" id="sdg-select-delivery-type">
                  <option value="delivery">🛵 Delivery (Entrega Motoboy)</option>
                  <option value="takeout">🏬 Retirada no Balcão</option>
                  <option value="dine_in">🍽️ Mesa / Salão</option>
                </select>
              </div>
              <div class="sdg-form-group" id="sdg-group-fee">
                <label class="sdg-label">Taxa de Entrega (R$)</label>
                <input type="number" step="0.50" class="sdg-input" id="sdg-input-fee" value="5.00">
              </div>
            </div>

            <div class="sdg-form-group" id="sdg-group-address">
              <label class="sdg-label">Endereço de Entrega *</label>
              <input type="text" class="sdg-input" id="sdg-input-address" placeholder="Rua, Número, Bairro, Ponto de ref.">
            </div>
          </div>

          <!-- Seção de Itens e Cardápio Rápido -->
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>🍔 Itens do Pedido</span>
              <span style="font-size: 10px; color: #f59e0b;">1-Clique no item</span>
            </div>

            <!-- Chips de Itens Frequentes do Cardápio -->
            <div class="sdg-quick-chips" id="sdg-quick-chips-container">
              <span style="font-size: 10px; color: #64748b;">Carregando produtos...</span>
            </div>

            <!-- Adição Manual Rápida -->
            <div class="sdg-row-3" style="margin-top: 4px;">
              <input type="text" class="sdg-input" id="sdg-input-item-name" placeholder="Nome do item (ex: X-Tudo)">
              <input type="number" class="sdg-input" id="sdg-input-item-qty" value="1" min="1" placeholder="Qtd">
              <input type="number" step="0.50" class="sdg-input" id="sdg-input-item-price" placeholder="R$ 0,00">
            </div>
            <button type="button" class="sdg-btn-secondary" id="sdg-btn-add-item">
              ➕ Adicionar Item ao Pedido
            </button>

            <!-- Lista de Itens Adicionados -->
            <div class="sdg-items-list" id="sdg-items-list-container">
              <div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
                Nenhum item adicionado ainda. Clique nos botões acima ou digite.
              </div>
            </div>
          </div>

          <!-- Pagamento e Observações -->
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>💳 Pagamento & Observações</span>
            </div>

            <div class="sdg-row-2">
              <div class="sdg-form-group">
                <label class="sdg-label">Forma de Pagamento *</label>
                <select class="sdg-select" id="sdg-select-payment">
                  <option value="pix">⚡ Pix</option>
                  <option value="cash">💵 Dinheiro</option>
                  <option value="credit_card">💳 Cartão de Crédito</option>
                  <option value="credit_card">💳 Cartão de Débito</option>
                </select>
              </div>
              <div class="sdg-form-group" id="sdg-group-troco" style="display: none;">
                <label class="sdg-label">Troco para (R$)</label>
                <input type="number" step="1.00" class="sdg-input" id="sdg-input-troco" placeholder="Ex: 50.00">
              </div>
            </div>

            <div class="sdg-form-group">
              <label class="sdg-label">Observações Gerais (Cozinha)</label>
              <input type="text" class="sdg-input" id="sdg-input-obs" placeholder="Ex: Sem cebola no lanche, maionese à parte">
            </div>
          </div>

          <!-- Box de Sucesso / Mensagem para o WhatsApp (após lançar) -->
          <div id="sdg-order-success-box" style="display: none;"></div>

        </div>

        <!-- ABA 2: COLAR DO WHATSAPP (PARSER) -->
        <div class="sdg-tab-content" id="sdg-tab-paste">
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>🪄 Copiar e Colar Mensagem</span>
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
              Cole qualquer texto enviado pelo cliente no WhatsApp. O sistema extrai automaticamente itens, quantidades, valores, endereço e observações!
            </p>
            <textarea class="sdg-textarea" id="sdg-textarea-paste" rows="7" placeholder="Exemplo:
1 x tudo 20
1 coca 2l 12
Sem cebola
Entrega na Rua das Flores, 123
Pagamento no Pix"></textarea>
            <button type="button" class="sdg-btn-primary" id="sdg-btn-parse-paste">
              🪄 Processar e Preencher Pedido
            </button>
          </div>
        </div>

        <!-- ABA 3: HISTÓRICO / ANOTAÇÕES DO DIA -->
        <div class="sdg-tab-content" id="sdg-tab-history">
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>📊 Fechamento do WhatsApp (Hoje)</span>
              <button type="button" class="sdg-btn-secondary" id="sdg-btn-refresh-history" style="width: auto; padding: 2px 6px; font-size: 10px;">
                🔄 Atualizar
              </button>
            </div>
            <div class="sdg-row-2">
              <div style="background: #090d16; padding: 8px; border-radius: 8px; text-align: center;">
                <span style="font-size: 10px; color: #94a3b8; font-weight: 800; display: block;">PEDIDOS HOJE</span>
                <span style="font-size: 18px; font-weight: 900; color: #f59e0b;" id="sdg-stat-count">0</span>
              </div>
              <div style="background: #090d16; padding: 8px; border-radius: 8px; text-align: center;">
                <span style="font-size: 10px; color: #94a3b8; font-weight: 800; display: block;">TOTAL FATURADO</span>
                <span style="font-size: 18px; font-weight: 900; color: #10b981;" id="sdg-stat-total">R$ 0,00</span>
              </div>
            </div>
          </div>

          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>📋 Lista de Anotações</span>
            </div>
            <div class="sdg-orders-history" id="sdg-history-list">
              <span style="font-size: 11px; color: #64748b; text-align: center; padding: 10px;">
                Nenhum pedido lançado hoje ainda.
              </span>
            </div>
          </div>
        </div>

        <!-- ABA 4: CONFIGURAÇÕES -->
        <div class="sdg-tab-content" id="sdg-tab-settings">
          <div class="sdg-card">
            <div class="sdg-card-title">
              <span>⚙️ Configuração do Sistema</span>
            </div>

            <div class="sdg-form-group">
              <label class="sdg-label">Supabase URL</label>
              <input type="text" class="sdg-input" id="sdg-setting-url">
            </div>
            <div class="sdg-form-group">
              <label class="sdg-label">Supabase Chave Anon</label>
              <input type="text" class="sdg-input" id="sdg-setting-key">
            </div>
            <div class="sdg-form-group">
              <label class="sdg-label">Servidor Local de Impressão (Node)</label>
              <input type="text" class="sdg-input" id="sdg-setting-printer-server" placeholder="http://localhost:3001">
            </div>
            <div class="sdg-row-2">
              <div class="sdg-form-group">
                <label class="sdg-label">IP da Elgin i8</label>
                <input type="text" class="sdg-input" id="sdg-setting-printer-ip" placeholder="192.168.1.150">
              </div>
              <div class="sdg-form-group">
                <label class="sdg-label">Porta</label>
                <input type="number" class="sdg-input" id="sdg-setting-printer-port" value="9100">
              </div>
            </div>

            <div class="sdg-row-2" style="margin-top: 6px;">
              <button type="button" class="sdg-btn-secondary" id="sdg-btn-test-printer">
                🖨️ Testar Elgin i8
              </button>
              <button type="button" class="sdg-btn-primary" id="sdg-btn-save-settings">
                💾 Salvar Ajustes
              </button>
            </div>
            <div id="sdg-settings-feedback" style="font-size: 11px; text-align: center;"></div>
          </div>
        </div>

      </div>

      <!-- Footer / Totais e Botão de Lançar -->
      <div class="sdg-footer" id="sdg-footer-section">
        <div class="sdg-totals-row">
          <span>Subtotal dos Itens:</span>
          <span id="sdg-subtotal-val" style="font-weight: 700; color: #f8fafc;">R$ 0,00</span>
        </div>
        <div class="sdg-totals-row" id="sdg-fee-row">
          <span>Taxa de Entrega:</span>
          <span id="sdg-fee-val" style="font-weight: 700; color: #f8fafc;">R$ 5,00</span>
        </div>
        <div class="sdg-grand-total">
          <span class="sdg-grand-total-label">TOTAL GERAL:</span>
          <span class="sdg-grand-total-val" id="sdg-grand-total-val">R$ 0,00</span>
        </div>

        <button type="button" class="sdg-btn-primary" id="sdg-btn-launch-order">
          🚀 Lançar Pedido & Imprimir na Cozinha
        </button>
        <button type="button" class="sdg-btn-secondary" id="sdg-btn-launch-waiting">
          ⏳ Lançar como Aguardando Pagamento
        </button>
      </div>
    `;

    document.body.appendChild(drawer);
    setupEventListeners(drawer);
  }

  // Alterna visibilidade do Drawer
  function toggleDrawer(forceOpen = null) {
    const drawer = document.getElementById('sdg-drawer-panel');
    if (!drawer) return;
    const shouldOpen = forceOpen !== null ? forceOpen : !drawer.classList.contains('open');
    if (shouldOpen) {
      drawer.classList.add('open');
      // Ao abrir, tenta capturar chat ativo se telefone estiver vazio
      const phoneInput = document.getElementById('sdg-input-phone');
      if (phoneInput && !phoneInput.value.trim()) {
        autoDetectActiveWhatsAppChat();
      }
    } else {
      drawer.classList.remove('open');
    }
  }

  // --- 3. DETECÇÃO INTELIGENTE DO CHAT ATIVO NO WHATSAPP WEB ---
  function autoDetectActiveWhatsAppChat() {
    try {
      // 1. Tenta achar o título da conversa no cabeçalho do chat
      const headerTitleElem = document.querySelector('header [data-testid="conversation-info-header-chat-title"]') ||
                              document.querySelector('header span[title][dir="auto"]') ||
                              document.querySelector('header span._ao3e');

      let nameOrPhone = '';
      if (headerTitleElem) {
        nameOrPhone = (headerTitleElem.getAttribute('title') || headerTitleElem.textContent || '').trim();
      }

      const digits = shared.cleanPhoneDigits(nameOrPhone);
      const isNumber = digits.length >= 8;

      const phoneInput = document.getElementById('sdg-input-phone');
      const nameInput = document.getElementById('sdg-input-name');

      if (isNumber) {
        phoneInput.value = shared.formatPhoneBRL(digits);
        handlePhoneLookup(digits);
      } else if (nameOrPhone) {
        nameInput.value = nameOrPhone;
        // Tenta achar número em subtextos ou status
        const subtextElem = document.querySelector('header span[data-testid="conversation-info-header-chat-subtitle"]') ||
                            document.querySelector('header ._amjy');
        if (subtextElem) {
          const subDigits = shared.cleanPhoneDigits(subtextElem.textContent);
          if (subDigits.length >= 8) {
            phoneInput.value = shared.formatPhoneBRL(subDigits);
            handlePhoneLookup(subDigits);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao detectar chat ativo:', e);
    }
  }

  // --- 4. RECONHECIMENTO DE CLIENTE E ENDEREÇO NO SUPABASE ---
  let lookupTimeout = null;
  async function handlePhoneLookup(rawPhone) {
    const badge = document.getElementById('sdg-customer-status-badge');
    const nameInput = document.getElementById('sdg-input-name');
    const addressInput = document.getElementById('sdg-input-address');

    if (!badge) return;

    const digits = shared.cleanPhoneDigits(rawPhone);
    if (!digits || digits.length < 8) {
      badge.style.display = 'none';
      return;
    }

    badge.style.display = 'flex';
    badge.className = 'sdg-customer-badge';
    badge.innerHTML = '🔍 Buscando cliente no banco de dados...';

    const customer = await shared.lookupCustomer(digits);

    if (customer) {
      badge.className = 'sdg-customer-badge';
      badge.innerHTML = `✅ <b>Cliente Cadastrado:</b> ${customer.name || 'Sem nome'} (${customer.total_orders || 1} pedidos realizados)`;
      if (!nameInput.value.trim() && customer.name) {
        nameInput.value = customer.name;
      }
      if (customer.address) {
        addressInput.value = customer.address;
      }
    } else {
      badge.className = 'sdg-customer-badge new';
      badge.innerHTML = '🆕 <b>Novo Cliente:</b> O endereço digitado será salvo no sistema automaticamente!';
    }
  }

  // --- 5. RENDERIZAÇÃO DE ITENS E CÁLCULO DE TOTAIS ---
  function renderItemsList() {
    const container = document.getElementById('sdg-items-list-container');
    if (!container) return;

    if (currentOrder.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
          Nenhum item adicionado ainda. Clique nos botões acima ou digite.
        </div>
      `;
      updateTotals();
      return;
    }

    container.innerHTML = currentOrder.items.map((item, idx) => `
      <div class="sdg-item-row">
        <div class="sdg-item-info">
          <span class="sdg-item-name">${item.name}</span>
          <span class="sdg-item-sub">${shared.formatCurrency(item.price)} un ${item.observation ? `• ${item.observation}` : ''}</span>
        </div>
        <div class="sdg-item-controls">
          <button type="button" class="sdg-btn-qty" data-action="dec" data-idx="${idx}">-</button>
          <span class="sdg-item-qty">${item.quantity}</span>
          <button type="button" class="sdg-btn-qty" data-action="inc" data-idx="${idx}">+</button>
          <span class="sdg-item-total">${shared.formatCurrency(item.price * item.quantity)}</span>
          <button type="button" class="sdg-btn-del" data-action="del" data-idx="${idx}" title="Remover">🗑️</button>
        </div>
      </div>
    `).join('');

    updateTotals();
  }

  function updateTotals() {
    const subtotal = currentOrder.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const feeInput = document.getElementById('sdg-input-fee');
    const isDelivery = document.getElementById('sdg-select-delivery-type')?.value === 'delivery';

    let fee = isDelivery ? (parseFloat(feeInput?.value) || 0) : 0;
    const grandTotal = subtotal + fee;

    const subElem = document.getElementById('sdg-subtotal-val');
    const feeElem = document.getElementById('sdg-fee-val');
    const grandElem = document.getElementById('sdg-grand-total-val');
    const feeRow = document.getElementById('sdg-fee-row');

    if (subElem) subElem.textContent = shared.formatCurrency(subtotal);
    if (feeElem) feeElem.textContent = shared.formatCurrency(fee);
    if (grandElem) grandElem.textContent = shared.formatCurrency(grandTotal);
    if (feeRow) feeRow.style.display = isDelivery ? 'flex' : 'none';
  }

  // Renderiza botões rápidos de produtos
  function renderQuickChips(products) {
    const container = document.getElementById('sdg-quick-chips-container');
    if (!container) return;

    if (!products || products.length === 0) {
      container.innerHTML = '<span style="font-size: 10px; color: #64748b;">Nenhum produto cadastrado.</span>';
      return;
    }

    container.innerHTML = products.slice(0, 16).map(prod => `
      <div class="sdg-chip" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.price}">
        <span>${prod.name}</span>
        <span class="sdg-chip-price">${shared.formatCurrency(prod.price)}</span>
      </div>
    `).join('');
  }

  // --- 6. LANÇAMENTO DO PEDIDO NO SUPABASE & IMPRESSÃO NA COZINHA ---
  async function launchOrder(targetStatus = 'pagamento_confirmado') {
    if (currentOrder.items.length === 0) {
      alert('Adicione pelo menos 1 item ao pedido.');
      return;
    }

    const phoneInput = document.getElementById('sdg-input-phone');
    const nameInput = document.getElementById('sdg-input-name');
    const deliveryTypeSelect = document.getElementById('sdg-select-delivery-type');
    const addressInput = document.getElementById('sdg-input-address');
    const feeInput = document.getElementById('sdg-input-fee');
    const paymentSelect = document.getElementById('sdg-select-payment');
    const trocoInput = document.getElementById('sdg-input-troco');
    const obsInput = document.getElementById('sdg-input-obs');
    const launchBtn = document.getElementById('sdg-btn-launch-order');

    const phone = phoneInput.value.trim();
    const name = nameInput.value.trim() || 'Cliente WhatsApp';
    const deliveryType = deliveryTypeSelect.value;
    const isDelivery = deliveryType === 'delivery';
    const address = isDelivery ? addressInput.value.trim() : 'Retirada no Balcão';

    if (isDelivery && !address) {
      alert('Informe o endereço de entrega do cliente.');
      addressInput.focus();
      return;
    }

    let fee = isDelivery ? (parseFloat(feeInput.value) || 0) : 0;
    let subtotal = currentOrder.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    let total = subtotal + fee;

    let finalObs = obsInput.value.trim();
    if (paymentSelect.value === 'cash' && trocoInput.value.trim()) {
      finalObs += (finalObs ? ' | ' : '') + `Troco para R$ ${trocoInput.value.trim()}`;
    }

    const orderId = `PED-WZ-${Date.now().toString().slice(-4)}`;

    const orderPayload = {
      id: orderId,
      customer_name: name,
      customer_phone: phone,
      delivery_type: deliveryType,
      address: address,
      payment_method: paymentSelect.value,
      status: targetStatus,
      total: total,
      observation: finalObs,
      items: currentOrder.items.map(i => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        unitPriceWithExtras: i.price,
        subtotal: i.price * i.quantity,
        observation: i.observation || ''
      }))
    };

    launchBtn.disabled = true;
    launchBtn.innerHTML = '⏳ Lançando no Supabase & Imprimindo...';

    try {
      // 1. Grava no Supabase
      const created = await shared.insertOrder(orderPayload);
      console.log('Pedido salvo no Supabase:', created);

      // 2. Envia para a impressora térmica Elgin i8
      const printRes = await shared.sendPrint(orderPayload, 'both');
      console.log('Resultado da impressão:', printRes);

      // 3. Mostra confirmação e gera mensagem do WhatsApp
      const successBox = document.getElementById('sdg-order-success-box');
      const confirmationMsg = shared.formatConfirmationWhatsApp(orderPayload);

      successBox.style.display = 'flex';
      successBox.className = 'sdg-success-box';
      successBox.innerHTML = `
        <h3 class="sdg-success-title">✅ Pedido #${orderId} Lançado com Sucesso!</h3>
        <p class="sdg-success-msg">
          O pedido já está na linha de produção da <b>Cozinha</b> e no <b>Financeiro/Balcão</b>.<br>
          ${printRes.message}
        </p>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <button type="button" class="sdg-btn-primary" id="sdg-btn-send-to-chat" style="padding: 8px; font-size: 11px;">
            💬 Inserir no Chat do Zap
          </button>
          <button type="button" class="sdg-btn-secondary" id="sdg-btn-copy-msg" style="padding: 8px; font-size: 11px;">
            📋 Copiar Resumo
          </button>
        </div>
      `;

      // Botão: Inserir no chat do WhatsApp
      document.getElementById('sdg-btn-send-to-chat')?.addEventListener('click', () => {
        insertTextIntoWhatsAppInput(confirmationMsg);
      });

      // Botão: Copiar resumo
      document.getElementById('sdg-btn-copy-msg')?.addEventListener('click', () => {
        navigator.clipboard.writeText(confirmationMsg).then(() => {
          alert('Resumo copiado com sucesso! Você pode colar no chat do cliente.');
        });
      });

      // Atualiza badge de contagem
      refreshHistory();

      // Limpa formulário após lançamento
      currentOrder.items = [];
      renderItemsList();
      obsInput.value = '';
      if (trocoInput) trocoInput.value = '';

    } catch (err) {
      alert('Erro ao lançar pedido: ' + err.message);
    } finally {
      launchBtn.disabled = false;
      launchBtn.innerHTML = '🚀 Lançar Pedido & Imprimir na Cozinha';
    }
  }

  // Insere texto diretamente na caixa de mensagem ativa do WhatsApp Web
  function insertTextIntoWhatsAppInput(text) {
    try {
      const input = document.querySelector('footer div[contenteditable="true"][data-tab="10"]') ||
                    document.querySelector('footer div[contenteditable="true"]') ||
                    document.querySelector('div[role="textbox"][contenteditable="true"]');

      if (input) {
        input.focus();
        document.execCommand('insertText', false, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        alert('Resumo inserido na caixa de texto do WhatsApp! Basta apertar Enter para enviar.');
      } else {
        navigator.clipboard.writeText(text);
        alert('Resumo copiado para a área de transferência! Cole no chat com Ctrl+V.');
      }
    } catch (e) {
      navigator.clipboard.writeText(text);
      alert('Resumo copiado! Cole com Ctrl+V.');
    }
  }

  // Atualiza histórico de pedidos de hoje
  async function refreshHistory() {
    const listContainer = document.getElementById('sdg-history-list');
    const countElem = document.getElementById('sdg-stat-count');
    const totalElem = document.getElementById('sdg-stat-total');
    const tabCount = document.getElementById('sdg-tab-orders-count');
    const bubbleCounter = document.getElementById('sdg-bubble-counter');

    const orders = await shared.fetchTodayOrders();
    todayOrdersList = orders;

    const wzOrders = orders.filter(o => String(o.id).startsWith('PED-WZ'));
    const totalSales = wzOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    if (countElem) countElem.textContent = wzOrders.length;
    if (totalElem) totalElem.textContent = shared.formatCurrency(totalSales);
    if (tabCount) tabCount.textContent = wzOrders.length;

    if (bubbleCounter) {
      bubbleCounter.textContent = wzOrders.length;
      bubbleCounter.style.display = wzOrders.length > 0 ? 'flex' : 'none';
    }

    if (!listContainer) return;

    if (wzOrders.length === 0) {
      listContainer.innerHTML = `
        <span style="font-size: 11px; color: #64748b; text-align: center; padding: 10px;">
          Nenhum pedido lançado pelo WhatsApp hoje ainda.
        </span>
      `;
      return;
    }

    listContainer.innerHTML = wzOrders.map(o => `
      <div class="sdg-history-card">
        <div class="sdg-history-header">
          <span style="color: #f59e0b;">#${o.id}</span>
          <span class="sdg-history-status ${o.status === 'pagamento_confirmado' || o.status === 'em_preparo' ? 'confirmed' : 'waiting'}">
            ${o.status.replace('_', ' ')}
          </span>
          <span style="color: #10b981;">${shared.formatCurrency(o.total)}</span>
        </div>
        <div style="font-size: 11px; color: #f8fafc; font-weight: 700;">
          👤 ${o.customer_name} ${o.customer_phone ? `(${shared.formatPhoneBRL(o.customer_phone)})` : ''}
        </div>
        <div style="font-size: 10px; color: #94a3b8;">
          📍 ${o.delivery_type === 'delivery' ? o.address : 'Retirada no Balcão'}
        </div>
        <div style="font-size: 10px; color: #cbd5e1;">
          📦 ${(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </div>
        <div class="sdg-history-actions">
          <button type="button" class="sdg-history-btn" data-action="reprint" data-id="${o.id}">
            🖨️ Re-imprimir
          </button>
          <button type="button" class="sdg-history-btn" data-action="recopy" data-id="${o.id}">
            📋 Copiar Resumo
          </button>
        </div>
      </div>
    `).join('');
  }

  // --- 7. EVENT LISTENERS E CONTROLES ---
  function setupEventListeners(drawer) {
    // Fechar drawer
    document.getElementById('sdg-btn-close-drawer')?.addEventListener('click', () => toggleDrawer(false));

    // Abas
    drawer.querySelectorAll('.sdg-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        drawer.querySelectorAll('.sdg-tab-btn').forEach(b => b.classList.remove('active'));
        drawer.querySelectorAll('.sdg-tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`sdg-tab-${tab}`)?.classList.add('active');

        // Mostra/oculta footer de totais dependendo da aba
        const footer = document.getElementById('sdg-footer-section');
        if (footer) footer.style.display = tab === 'order' ? 'flex' : 'none';

        if (tab === 'history') refreshHistory();
      });
    });

    // Puxar chat aberto
    document.getElementById('sdg-btn-detect-chat')?.addEventListener('click', autoDetectActiveWhatsAppChat);

    // Digitação de telefone com busca automática
    document.getElementById('sdg-input-phone')?.addEventListener('input', (e) => {
      clearTimeout(lookupTimeout);
      lookupTimeout = setTimeout(() => {
        handlePhoneLookup(e.target.value);
      }, 400);
    });

    // Tipo de entrega altera visibilidade do endereço e taxa
    document.getElementById('sdg-select-delivery-type')?.addEventListener('change', (e) => {
      const isDelivery = e.target.value === 'delivery';
      document.getElementById('sdg-group-address').style.display = isDelivery ? 'flex' : 'none';
      document.getElementById('sdg-group-fee').style.display = isDelivery ? 'flex' : 'none';
      updateTotals();
    });

    // Taxa de entrega
    document.getElementById('sdg-input-fee')?.addEventListener('input', updateTotals);

    // Forma de pagamento (mostra campo de troco se dinheiro)
    document.getElementById('sdg-select-payment')?.addEventListener('change', (e) => {
      document.getElementById('sdg-group-troco').style.display = e.target.value === 'cash' ? 'flex' : 'none';
    });

    // Clique nos Chips Rápidos do Cardápio
    document.getElementById('sdg-quick-chips-container')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.sdg-chip');
      if (!chip) return;
      const { id, name, price } = chip.dataset;
      const parsedPrice = parseFloat(price) || 0;

      const existing = currentOrder.items.find(i => i.id === id);
      if (existing) {
        existing.quantity += 1;
      } else {
        currentOrder.items.push({
          id,
          name,
          price: parsedPrice,
          quantity: 1,
          observation: ''
        });
      }
      renderItemsList();
    });

    // Adicionar item manual
    document.getElementById('sdg-btn-add-item')?.addEventListener('click', () => {
      const nameInput = document.getElementById('sdg-input-item-name');
      const qtyInput = document.getElementById('sdg-input-item-qty');
      const priceInput = document.getElementById('sdg-input-item-price');

      const name = nameInput.value.trim();
      const qty = parseInt(qtyInput.value, 10) || 1;
      const price = parseFloat(priceInput.value) || 0;

      if (!name) {
        alert('Digite o nome do item.');
        nameInput.focus();
        return;
      }

      currentOrder.items.push({
        id: `manual_${Date.now()}`,
        name,
        quantity: qty,
        price,
        observation: ''
      });

      nameInput.value = '';
      priceInput.value = '';
      qtyInput.value = '1';
      nameInput.focus();

      renderItemsList();
    });

    // Controles da lista de itens (+, -, remover)
    document.getElementById('sdg-items-list-container')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;

      if (action === 'inc') {
        currentOrder.items[idx].quantity += 1;
      } else if (action === 'dec') {
        if (currentOrder.items[idx].quantity > 1) {
          currentOrder.items[idx].quantity -= 1;
        } else {
          currentOrder.items.splice(idx, 1);
        }
      } else if (action === 'del') {
        currentOrder.items.splice(idx, 1);
      }

      renderItemsList();
    });

    // Botão Principal: Lançar Pedido & Imprimir Cozinha
    document.getElementById('sdg-btn-launch-order')?.addEventListener('click', () => launchOrder('pagamento_confirmado'));

    // Botão Secundário: Lançar como Aguardando Pagamento
    document.getElementById('sdg-btn-launch-waiting')?.addEventListener('click', () => launchOrder('aguardando_pagamento'));

    // Processar Copia e Cola (Aba 2)
    document.getElementById('sdg-btn-parse-paste')?.addEventListener('click', () => {
      const text = document.getElementById('sdg-textarea-paste').value;
      if (!text.trim()) {
        alert('Cole a mensagem do WhatsApp primeiro.');
        return;
      }

      const parsed = shared.parseWhatsAppMessage(text, productsCatalog);
      if (!parsed) return;

      if (parsed.customerName) document.getElementById('sdg-input-name').value = parsed.customerName;
      if (parsed.customerPhone) {
        document.getElementById('sdg-input-phone').value = parsed.customerPhone;
        handlePhoneLookup(parsed.customerPhone);
      }
      if (parsed.address) document.getElementById('sdg-input-address').value = parsed.address;
      if (parsed.deliveryType) document.getElementById('sdg-select-delivery-type').value = parsed.deliveryType;
      if (parsed.paymentMethod) document.getElementById('sdg-select-payment').value = parsed.paymentMethod;
      if (parsed.observation) document.getElementById('sdg-input-obs').value = parsed.observation;

      if (parsed.items.length > 0) {
        currentOrder.items = parsed.items;
        renderItemsList();
      }

      // Muda para aba de pedido
      drawer.querySelector('.sdg-tab-btn[data-tab="order"]').click();
      alert(`Mensagem processada! ${parsed.items.length} itens extraídos.`);
    });

    // Histórico: Re-imprimir ou Re-copiar
    document.getElementById('sdg-history-list')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.sdg-history-btn');
      if (!btn) return;
      const orderId = btn.dataset.id;
      const action = btn.dataset.action;
      const order = todayOrdersList.find(o => o.id === orderId);
      if (!order) return;

      if (action === 'reprint') {
        btn.textContent = '⏳ Imprimindo...';
        const res = await shared.sendPrint(order, 'both');
        alert(res.message);
        btn.textContent = '🖨️ Re-imprimir';
      } else if (action === 'recopy') {
        const msg = shared.formatConfirmationWhatsApp(order);
        insertTextIntoWhatsAppInput(msg);
      }
    });

    // Atualizar cardápio
    document.getElementById('sdg-btn-refresh-catalog')?.addEventListener('click', async () => {
      const btn = document.getElementById('sdg-btn-refresh-catalog');
      btn.style.transform = 'rotate(360deg)';
      productsCatalog = await shared.fetchProducts();
      renderQuickChips(productsCatalog);
      setTimeout(() => { btn.style.transform = ''; }, 400);
    });

    // Ajustes: Carregar e Salvar
    shared.getConfig().then(cfg => {
      document.getElementById('sdg-setting-url').value = cfg.supabaseUrl;
      document.getElementById('sdg-setting-key').value = cfg.supabaseAnonKey;
      document.getElementById('sdg-setting-printer-server').value = cfg.printerServerUrl;
      document.getElementById('sdg-setting-printer-ip').value = cfg.printerIp;
      document.getElementById('sdg-setting-printer-port').value = cfg.printerPort;
    });

    document.getElementById('sdg-btn-save-settings')?.addEventListener('click', async () => {
      const feedback = document.getElementById('sdg-settings-feedback');
      const newCfg = {
        supabaseUrl: document.getElementById('sdg-setting-url').value.trim(),
        supabaseAnonKey: document.getElementById('sdg-setting-key').value.trim(),
        printerServerUrl: document.getElementById('sdg-setting-printer-server').value.trim(),
        printerIp: document.getElementById('sdg-setting-printer-ip').value.trim(),
        printerPort: Number(document.getElementById('sdg-setting-printer-port').value) || 9100,
        defaultDeliveryFee: 5.00
      };
      await shared.saveConfig(newCfg);
      feedback.style.color = '#10b981';
      feedback.textContent = 'Configurações salvas com sucesso!';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    });

    // Testar Elgin i8
    document.getElementById('sdg-btn-test-printer')?.addEventListener('click', async () => {
      const feedback = document.getElementById('sdg-settings-feedback');
      feedback.style.color = '#f59e0b';
      feedback.textContent = 'Enviando teste de impressão para Elgin i8...';
      const testOrder = {
        id: 'TESTE-PRINT',
        created_at: new Date().toISOString(),
        customer_name: 'TESTE IMPRESSORA ELGIN i8',
        customer_phone: 'Balcao',
        delivery_type: 'takeout',
        payment_method: 'pix',
        total: 0,
        items: [{ name: 'TESTE DE COMUNICACAO ESC/POS OK', quantity: 1, price: 0, subtotal: 0 }]
      };
      const res = await shared.sendPrint(testOrder, 'both');
      feedback.style.color = res.success ? '#10b981' : '#ef4444';
      feedback.textContent = res.message;
    });
  }

  // --- 8. INICIALIZAÇÃO DA EXTENSÃO ---
  async function init() {
    createFloatingBubble();
    createDrawerPanel();

    // Carrega produtos do Supabase
    productsCatalog = await shared.fetchProducts();
    renderQuickChips(productsCatalog);

    // Carrega pedidos de hoje
    refreshHistory();

    console.log('✅ SDG Delivery: Extensão de Lançamento de Pedidos WhatsApp Web pronta!');
  }

  // Inicia após DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
