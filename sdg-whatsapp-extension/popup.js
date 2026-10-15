// ==============================================================================
// 🚀 SDG Delivery - Popup Script (Toolbar do Chrome)
// Lançamento de Pedidos fora do WhatsApp Web
// ==============================================================================

(function () {
  'use strict';

  const shared = window.SDG_DELIVERY_SHARED;
  if (!shared) return;

  let currentOrder = {
    customerPhone: '',
    customerName: '',
    deliveryType: 'delivery',
    address: '',
    deliveryFee: 5.00,
    paymentMethod: 'pix',
    items: []
  };

  let productsCatalog = [];
  let todayOrdersList = [];
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
    badge.innerHTML = '🔍 Buscando cliente...';

    const customer = await shared.lookupCustomer(digits);

    if (customer) {
      badge.className = 'sdg-customer-badge';
      badge.innerHTML = `✅ <b>Cliente:</b> ${customer.name || 'Sem nome'} (${customer.total_orders || 1} pedidos)`;
      if (!nameInput.value.trim() && customer.name) nameInput.value = customer.name;
      if (customer.address) addressInput.value = customer.address;
    } else {
      badge.className = 'sdg-customer-badge new';
      badge.innerHTML = '🆕 <b>Novo Cliente:</b> O endereço digitado será salvo no sistema.';
    }
  }

  function renderItemsList() {
    const container = document.getElementById('sdg-items-list-container');
    if (!container) return;

    if (currentOrder.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
          Nenhum item adicionado ainda.
        </div>
      `;
      updateTotals();
      return;
    }

    container.innerHTML = currentOrder.items.map((item, idx) => `
      <div class="sdg-item-row">
        <div class="sdg-item-info">
          <span class="sdg-item-name">${item.name}</span>
          <span class="sdg-item-sub">${shared.formatCurrency(item.price)} un</span>
        </div>
        <div class="sdg-item-controls">
          <button type="button" class="sdg-btn-qty" data-action="dec" data-idx="${idx}">-</button>
          <span class="sdg-item-qty">${item.quantity}</span>
          <button type="button" class="sdg-btn-qty" data-action="inc" data-idx="${idx}">+</button>
          <span class="sdg-item-total">${shared.formatCurrency(item.price * item.quantity)}</span>
          <button type="button" class="sdg-btn-del" data-action="del" data-idx="${idx}">🗑️</button>
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

  async function launchOrder(targetStatus = 'pagamento_confirmado') {
    if (currentOrder.items.length === 0) {
      alert('Adicione pelo menos 1 item ao pedido.');
      return;
    }

    const phone = document.getElementById('sdg-input-phone').value.trim();
    const name = document.getElementById('sdg-input-name').value.trim() || 'Cliente Balcão';
    const deliveryType = document.getElementById('sdg-select-delivery-type').value;
    const isDelivery = deliveryType === 'delivery';
    const address = isDelivery ? document.getElementById('sdg-input-address').value.trim() : 'Retirada no Balcão';

    if (isDelivery && !address) {
      alert('Informe o endereço de entrega.');
      return;
    }

    let fee = isDelivery ? (parseFloat(document.getElementById('sdg-input-fee').value) || 0) : 0;
    let subtotal = currentOrder.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    let total = subtotal + fee;

    let finalObs = document.getElementById('sdg-input-obs').value.trim();
    const payment = document.getElementById('sdg-select-payment').value;
    const troco = document.getElementById('sdg-input-troco').value.trim();
    if (payment === 'cash' && troco) {
      finalObs += (finalObs ? ' | ' : '') + `Troco para R$ ${troco}`;
    }

    const orderId = `PED-WZ-${Date.now().toString().slice(-4)}`;

    const orderPayload = {
      id: orderId,
      customer_name: name,
      customer_phone: phone,
      delivery_type: deliveryType,
      address: address,
      payment_method: payment,
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

    const launchBtn = document.getElementById('sdg-btn-launch-order');
    launchBtn.disabled = true;
    launchBtn.innerHTML = '⏳ Lançando...';

    try {
      await shared.insertOrder(orderPayload);
      const printRes = await shared.sendPrint(orderPayload, 'both');

      const successBox = document.getElementById('sdg-order-success-box');
      const confirmationMsg = shared.formatConfirmationWhatsApp(orderPayload);

      successBox.style.display = 'flex';
      successBox.className = 'sdg-success-box';
      successBox.innerHTML = `
        <h3 class="sdg-success-title">✅ Pedido #${orderId} Lançado!</h3>
        <p class="sdg-success-msg">${printRes.message}</p>
        <button type="button" class="sdg-btn-primary" id="sdg-btn-copy-msg" style="padding: 6px; font-size: 11px;">
          📋 Copiar Resumo para o WhatsApp
        </button>
      `;

      document.getElementById('sdg-btn-copy-msg')?.addEventListener('click', () => {
        navigator.clipboard.writeText(confirmationMsg).then(() => {
          alert('Resumo copiado com sucesso!');
        });
      });

      refreshHistory();
      currentOrder.items = [];
      renderItemsList();
      document.getElementById('sdg-input-obs').value = '';
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      launchBtn.disabled = false;
      launchBtn.innerHTML = '🚀 Lançar Pedido & Imprimir Cozinha';
    }
  }

  async function refreshHistory() {
    const listContainer = document.getElementById('sdg-history-list');
    const countElem = document.getElementById('sdg-stat-count');
    const totalElem = document.getElementById('sdg-stat-total');
    const tabCount = document.getElementById('sdg-tab-orders-count');

    const orders = await shared.fetchTodayOrders();
    todayOrdersList = orders;

    const wzOrders = orders.filter(o => String(o.id).startsWith('PED-WZ'));
    const totalSales = wzOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    if (countElem) countElem.textContent = wzOrders.length;
    if (totalElem) totalElem.textContent = shared.formatCurrency(totalSales);
    if (tabCount) tabCount.textContent = wzOrders.length;

    if (!listContainer) return;

    if (wzOrders.length === 0) {
      listContainer.innerHTML = '<span style="font-size: 11px; color: #64748b; text-align: center; padding: 10px;">Nenhum pedido de hoje.</span>';
      return;
    }

    listContainer.innerHTML = wzOrders.map(o => `
      <div class="sdg-history-card">
        <div class="sdg-history-header">
          <span style="color: #f59e0b;">#${o.id}</span>
          <span style="color: #10b981;">${shared.formatCurrency(o.total)}</span>
        </div>
        <div style="font-size: 11px; color: #f8fafc; font-weight: 700;">
          ${o.customer_name} ${o.customer_phone ? `(${shared.formatPhoneBRL(o.customer_phone)})` : ''}
        </div>
        <div style="font-size: 10px; color: #cbd5e1;">
          📦 ${(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </div>
        <div class="sdg-history-actions">
          <button type="button" class="sdg-history-btn" data-action="reprint" data-id="${o.id}">🖨️ Imprimir</button>
          <button type="button" class="sdg-history-btn" data-action="recopy" data-id="${o.id}">📋 Copiar</button>
        </div>
      </div>
    `).join('');
  }

  function setupEvents() {
    // Abas
    document.querySelectorAll('.sdg-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.sdg-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sdg-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`sdg-tab-${tab}`)?.classList.add('active');
        const footer = document.getElementById('sdg-footer-section');
        if (footer) footer.style.display = tab === 'order' ? 'flex' : 'none';
        if (tab === 'history') refreshHistory();
      });
    });

    // Telefone
    document.getElementById('sdg-input-phone')?.addEventListener('input', (e) => {
      clearTimeout(lookupTimeout);
      lookupTimeout = setTimeout(() => handlePhoneLookup(e.target.value), 400);
    });

    // Tipo de entrega
    document.getElementById('sdg-select-delivery-type')?.addEventListener('change', (e) => {
      const isDelivery = e.target.value === 'delivery';
      document.getElementById('sdg-group-address').style.display = isDelivery ? 'flex' : 'none';
      document.getElementById('sdg-group-fee').style.display = isDelivery ? 'flex' : 'none';
      updateTotals();
    });

    document.getElementById('sdg-input-fee')?.addEventListener('input', updateTotals);

    document.getElementById('sdg-select-payment')?.addEventListener('change', (e) => {
      document.getElementById('sdg-group-troco').style.display = e.target.value === 'cash' ? 'flex' : 'none';
    });

    // Chips de cardápio
    document.getElementById('sdg-quick-chips-container')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.sdg-chip');
      if (!chip) return;
      const { id, name, price } = chip.dataset;
      const parsedPrice = parseFloat(price) || 0;
      const existing = currentOrder.items.find(i => i.id === id);
      if (existing) {
        existing.quantity += 1;
      } else {
        currentOrder.items.push({ id, name, price: parsedPrice, quantity: 1, observation: '' });
      }
      renderItemsList();
    });

    // Adição manual
    document.getElementById('sdg-btn-add-item')?.addEventListener('click', () => {
      const name = document.getElementById('sdg-input-item-name').value.trim();
      const qty = parseInt(document.getElementById('sdg-input-item-qty').value, 10) || 1;
      const price = parseFloat(document.getElementById('sdg-input-item-price').value) || 0;
      if (!name) return;

      currentOrder.items.push({ id: `custom_${Date.now()}`, name, quantity: qty, price, observation: '' });
      document.getElementById('sdg-input-item-name').value = '';
      document.getElementById('sdg-input-item-price').value = '';
      document.getElementById('sdg-input-item-qty').value = '1';
      renderItemsList();
    });

    // Itens (+, -, lixeira)
    document.getElementById('sdg-items-list-container')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      if (action === 'inc') currentOrder.items[idx].quantity += 1;
      else if (action === 'dec') {
        if (currentOrder.items[idx].quantity > 1) currentOrder.items[idx].quantity -= 1;
        else currentOrder.items.splice(idx, 1);
      } else if (action === 'del') currentOrder.items.splice(idx, 1);
      renderItemsList();
    });

    document.getElementById('sdg-btn-launch-order')?.addEventListener('click', () => launchOrder('pagamento_confirmado'));
    document.getElementById('sdg-btn-launch-waiting')?.addEventListener('click', () => launchOrder('aguardando_pagamento'));

    // Processar copia e cola
    document.getElementById('sdg-btn-parse-paste')?.addEventListener('click', () => {
      const text = document.getElementById('sdg-textarea-paste').value;
      if (!text.trim()) return;
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
      document.querySelector('.sdg-tab-btn[data-tab="order"]').click();
    });

    // Histórico re-imprimir
    document.getElementById('sdg-history-list')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.sdg-history-btn');
      if (!btn) return;
      const order = todayOrdersList.find(o => o.id === btn.dataset.id);
      if (!order) return;
      if (btn.dataset.action === 'reprint') {
        btn.textContent = '⏳ Imprimindo...';
        const res = await shared.sendPrint(order, 'both');
        alert(res.message);
        btn.textContent = '🖨️ Imprimir';
      } else if (btn.dataset.action === 'recopy') {
        const msg = shared.formatConfirmationWhatsApp(order);
        navigator.clipboard.writeText(msg).then(() => alert('Resumo copiado!'));
      }
    });

    // Ajustes
    shared.getConfig().then(cfg => {
      document.getElementById('sdg-setting-url').value = cfg.supabaseUrl;
      document.getElementById('sdg-setting-key').value = cfg.supabaseAnonKey;
      document.getElementById('sdg-setting-printer-ip').value = cfg.printerIp;
      document.getElementById('sdg-setting-printer-port').value = cfg.printerPort;
    });

    document.getElementById('sdg-btn-save-settings')?.addEventListener('click', async () => {
      const feedback = document.getElementById('sdg-settings-feedback');
      await shared.saveConfig({
        supabaseUrl: document.getElementById('sdg-setting-url').value.trim(),
        supabaseAnonKey: document.getElementById('sdg-setting-key').value.trim(),
        printerIp: document.getElementById('sdg-setting-printer-ip').value.trim(),
        printerPort: Number(document.getElementById('sdg-setting-printer-port').value) || 9100
      });
      feedback.style.color = '#10b981';
      feedback.textContent = 'Ajustes salvos com sucesso!';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    });

    document.getElementById('sdg-btn-test-printer')?.addEventListener('click', async () => {
      const feedback = document.getElementById('sdg-settings-feedback');
      feedback.textContent = 'Enviando teste...';
      const testOrder = {
        id: 'TESTE-PRINT',
        created_at: new Date().toISOString(),
        customer_name: 'TESTE IMPRESSORA ELGIN i8',
        delivery_type: 'takeout',
        payment_method: 'pix',
        total: 0,
        items: [{ name: 'TESTE COMUNICACAO OK', quantity: 1, price: 0 }]
      };
      const res = await shared.sendPrint(testOrder, 'both');
      feedback.style.color = res.success ? '#10b981' : '#ef4444';
      feedback.textContent = res.message;
    });

    document.getElementById('sdg-btn-refresh-catalog')?.addEventListener('click', async () => {
      productsCatalog = await shared.fetchProducts();
      renderQuickChips(productsCatalog);
    });
  }

  async function init() {
    setupEvents();
    productsCatalog = await shared.fetchProducts();
    renderQuickChips(productsCatalog);
    refreshHistory();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
