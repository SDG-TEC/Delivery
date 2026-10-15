import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Plus, Minus, Trash2, ShoppingBag, Search, ChefHat, Bike, Store,
  DollarSign, User, Phone, MapPin, Check, AlertCircle, Sparkles, ArrowLeft
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, PAYMENT_METHODS } from '../../utils/formatters';

export const CounterNewOrderModal = ({ isOpen, onClose, onLaunchOrder }) => {
  const { products, categories, storeSettings } = useOrder();

  const defaultDeliveryFee = Number(storeSettings?.deliveryFee) >= 0 ? Number(storeSettings.deliveryFee) : 5.00;
  const [customDeliveryFee, setCustomDeliveryFee] = useState(defaultDeliveryFee);

  // Sincroniza a taxa com a configuração da loja caso seja atualizada
  useEffect(() => {
    if (storeSettings?.deliveryFee !== undefined && storeSettings?.deliveryFee !== null) {
      setCustomDeliveryFee(Number(storeSettings.deliveryFee));
    }
  }, [storeSettings?.deliveryFee]);

  // Selected items in current counter order
  const [orderItems, setOrderItems] = useState([]);

  // Customer & Delivery info
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('takeout'); // 'takeout' | 'delivery'
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'pix' | 'credit_card' | 'debit_card'
  const [observation, setObservation] = useState('');

  // Catalog search & category filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Active product being customized (if product has options)
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [customQty, setCustomQty] = useState(1);
  const [customSelectedOptions, setCustomSelectedOptions] = useState([]);
  const [customItemObs, setCustomItemObs] = useState('');

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (p.active === false) return false;
      const matchesCategory = selectedCategory === 'todos' || p.categoryId === selectedCategory;
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  if (!isOpen) return null;

  // Handle clicking a product from catalog
  const handleSelectProduct = (product) => {
    if (product.options && product.options.length > 0) {
      setCustomizingProduct(product);
      setCustomQty(1);
      const defaults = [];
      product.options.forEach(group => {
        if (group.type === 'radio' && group.items?.length > 0) {
          const defaultItem = group.items.find(i => i.isDefault || i.price === 0) || group.items[0];
          if (defaultItem) defaults.push(defaultItem);
        }
      });
      setCustomSelectedOptions(defaults);
      setCustomItemObs('');
    } else {
      addSimpleProductToOrder(product);
    }
  };

  // Add product without options directly
  const addSimpleProductToOrder = (product) => {
    setOrderItems(prev => {
      const existingIdx = prev.findIndex(item => item.id === product.id && (!item.selectedOptions || item.selectedOptions.length === 0) && !item.observation);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const nextQty = current.quantity + 1;
        updated[existingIdx] = {
          ...current,
          quantity: nextQty,
          subtotal: current.unitPriceWithExtras * nextQty
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          selectedOptions: [],
          unitPriceWithExtras: product.price,
          subtotal: product.price,
          observation: ''
        }
      ];
    });
  };

  // Toggle option inside customizer
  const handleToggleOption = (group, item) => {
    if (group.type === 'radio') {
      const otherNames = group.items.map(i => i.name);
      setCustomSelectedOptions(prev => [
        ...prev.filter(i => !otherNames.includes(i.name)),
        item
      ]);
    } else {
      const exists = customSelectedOptions.some(i => i.name === item.name);
      if (exists) {
        setCustomSelectedOptions(prev => prev.filter(i => i.name !== item.name));
      } else {
        setCustomSelectedOptions(prev => [...prev, item]);
      }
    }
  };

  // Confirm custom item addition
  const handleConfirmCustomProduct = () => {
    if (!customizingProduct) return;
    const optionExtra = customSelectedOptions.reduce((acc, opt) => acc + (opt.price || 0), 0);
    const unitPrice = customizingProduct.price + optionExtra;
    const qty = Math.max(1, customQty);

    const newItem = {
      id: customizingProduct.id,
      name: customizingProduct.name,
      quantity: qty,
      price: customizingProduct.price,
      selectedOptions: customSelectedOptions.map(opt => {
        if (typeof opt === 'string') return opt;
        if (opt.price && opt.price > 0 && !opt.name.includes('R$')) {
          return `${opt.name} (+R$ ${opt.price.toFixed(2).replace('.', ',')})`;
        }
        return opt.name;
      }),
      unitPriceWithExtras: unitPrice,
      subtotal: unitPrice * qty,
      observation: customItemObs.trim()
    };

    setOrderItems(prev => [...prev, newItem]);
    setCustomizingProduct(null);
  };

  // Update item quantity in order
  const handleItemQty = (index, delta) => {
    setOrderItems(prev => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      item.quantity = newQty;
      item.subtotal = item.unitPriceWithExtras * newQty;
      return copy;
    });
  };

  // Remove item
  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const itemsSubtotal = orderItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
  const isDelivery = deliveryType === 'delivery';
  const isFreeDelivery = storeSettings?.freeDeliveryThreshold > 0 && itemsSubtotal >= storeSettings.freeDeliveryThreshold;
  const parsedCustomFee = customDeliveryFee === '' ? 0 : Number(customDeliveryFee);
  const deliveryFee = isDelivery
    ? (isFreeDelivery ? 0 : (isNaN(parsedCustomFee) ? defaultDeliveryFee : parsedCustomFee))
    : 0;
  const grandTotal = itemsSubtotal + deliveryFee;

  // Submit handler
  const handleLaunch = (targetStatus) => {
    if (orderItems.length === 0) {
      alert('Por favor, adicione pelo menos um item ao pedido antes de lançar.');
      return;
    }

    if (isDelivery && !address.trim()) {
      alert('Por favor, informe o endereço de entrega para pedidos do tipo Delivery.');
      return;
    }

    const orderPayload = {
      customerName: customerName.trim() || 'Cliente Balcão',
      customerPhone: customerPhone.trim(),
      deliveryType,
      deliveryFee,
      address: isDelivery ? address.trim() : 'Retirada no Balcão',
      paymentMethod,
      observation: observation.trim(),
      items: orderItems,
      total: grandTotal,
      status: targetStatus
    };

    onLaunchOrder(orderPayload, targetStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Lançar Pedido no Balcão
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase">
                  Frente de Caixa / PDV
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Selecione os itens do cardápio e lance o pedido diretamente na Linha de Produção da cozinha.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT PANEL: CATALOG & SEARCH (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 overflow-hidden">
            
            {/* If currently customizing a product with options */}
            {customizingProduct ? (
              <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setCustomizingProduct(null)}
                    className="flex items-center space-x-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Cardápio</span>
                  </button>
                  <span className="text-xs font-black text-amber-400">Personalizando Item</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white">{customizingProduct.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{customizingProduct.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Preço Base</span>
                    <span className="text-base font-black text-emerald-400">
                      {formatCurrency(customizingProduct.price)}
                    </span>
                  </div>
                </div>

                {/* Option Groups */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {customizingProduct.options.map((group, gIdx) => (
                    <div key={gIdx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">{group.name}</span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                          {group.type === 'radio' ? 'Escolha 1' : 'Opcional'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map((opt, oIdx) => {
                          const isSelected = customSelectedOptions.some(i => i.name === opt.name);
                          const cleanName = opt.name.replace(/\s*\(\+?R\$\s*[\d,.]+\)/i, '').trim();
                          return (
                            <label
                              key={oIdx}
                              onClick={() => handleToggleOption(group, opt)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-500/50 text-white font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-600'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span>{cleanName}</span>
                              </div>
                              {opt.price > 0 ? (
                                <span className="font-bold text-amber-400">+{formatCurrency(opt.price)}</span>
                              ) : (
                                group.type === 'radio' && (
                                  <span className="text-[10px] text-slate-500 font-semibold">Incluso</span>
                                )
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Item note */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Observação para este item (ex: sem cebola, ponto da carne):
                    </label>
                    <input
                      type="text"
                      value={customItemObs}
                      onChange={e => setCustomItemObs(e.target.value)}
                      placeholder="Observação da cozinha para este item..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Customizer footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
                  <div className="flex items-center space-x-2 bg-slate-950 rounded-xl p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-black text-xs text-white">{customQty}</span>
                    <button
                      type="button"
                      onClick={() => setCustomQty(q => q + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmCustomProduct}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>
                      Adicionar ao Pedido (
                      {formatCurrency(
                        (customizingProduct.price +
                          customSelectedOptions.reduce((acc, opt) => acc + (opt.price || 0), 0)) *
                          customQty
                      )}
                      )
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              // Normal catalog browsing
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Search & Categories Bar */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800 space-y-2.5 bg-slate-950/40">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar produto pelo nome ou ingrediente..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('todos')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === 'todos'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Todos ({products?.length || 0})
                    </button>
                    {(categories || []).filter(c => c.id !== 'todos').map(cat => {
                      const isSelected = selectedCategory === cat.id;
                      const count = (products || []).filter(p => p.categoryId === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-semibold">
                      Nenhum produto encontrado com os filtros aplicados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredProducts.map(product => {
                        const hasOptions = product.options && product.options.length > 0;
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="group bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-950 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-amber-300 transition-colors">
                                  {product.name}
                                </h4>
                                {product.badge && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                    {product.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {product.description}
                              </p>
                              <div className="flex items-center space-x-2 mt-1.5">
                                <span className="text-xs font-black text-emerald-400">
                                  {formatCurrency(product.price)}
                                </span>
                                {hasOptions && (
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    • Com opções
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Product thumbnail + button */}
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: ORDER DETAILS & LAUNCH TO KITCHEN (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-950 overflow-hidden">
            
            {/* Sub-header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Itens da Comanda ({orderItems.length})
                </span>
              </div>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrderItems([])}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Scrollable Order Items & Customer Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Items List */}
              <div className="space-y-2">
                {orderItems.length === 0 ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">Comanda vazia</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Clique nos produtos do cardápio ao lado para adicionar itens ao pedido.
                    </p>
                  </div>
                ) : (
                  orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-start justify-between gap-2 hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-white truncate">{item.name}</span>
                          <span className="text-slate-400 font-bold text-[11px]">
                            ({formatCurrency(item.unitPriceWithExtras)})
                          </span>
                        </div>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-[10px] text-amber-400 line-clamp-1 mt-0.5">
                            + {item.selectedOptions.join(', ')}
                          </p>
                        )}
                        {item.observation && (
                          <p className="text-[10px] text-rose-300 italic mt-0.5">
                            Obs: {item.observation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleItemQty(index, -1)}
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-6 text-center font-black text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemQty(index, 1)}
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className="font-black text-white text-xs w-14 text-right">
                          {formatCurrency(item.subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer & Destination Section */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dados do Cliente & Entrega</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Nome do Cliente / Mesa</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ex: João Silva ou Mesa 05"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Delivery Type Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Destino do Pedido</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('takeout')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        deliveryType === 'takeout'
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>🛍️ Balcão / Retirada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        deliveryType === 'delivery'
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>🛵 Delivery ({isFreeDelivery ? 'Grátis' : (deliveryFee > 0 ? `+${formatCurrency(deliveryFee)}` : (defaultDeliveryFee > 0 ? `+${formatCurrency(defaultDeliveryFee)}` : 'Grátis'))})</span>
                    </button>
                  </div>
                </div>

                {/* Address & Delivery Fee (only if delivery) */}
                {deliveryType === 'delivery' && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Endereço Completo</label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Rua, número, complemento, bairro"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-amber-400 flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-amber-400 inline" />
                          <span>Taxa de Entrega (R$) — Ajustar na hora:</span>
                        </label>
                        {isFreeDelivery && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            🎉 Frete Grátis aplicado (&gt; {formatCurrency(storeSettings?.freeDeliveryThreshold)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={customDeliveryFee}
                            onChange={e => {
                              const val = e.target.value;
                              setCustomDeliveryFee(val === '' ? '' : parseFloat(val) || 0);
                            }}
                            placeholder={String(defaultDeliveryFee.toFixed(2))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-white focus:border-amber-500 outline-none"
                          />
                        </div>

                        {/* Botões de Acesso Rápido */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCustomDeliveryFee(0)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              Number(customDeliveryFee) === 0
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                            title="Zerar taxa de entrega"
                          >
                            Grátis
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDeliveryFee(defaultDeliveryFee)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              Number(customDeliveryFee) === defaultDeliveryFee
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                            title="Voltar para a taxa padrão configurada na loja"
                          >
                            Padrão ({formatCurrency(defaultDeliveryFee)})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      💵 Dinheiro
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === 'pix'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      📱 PIX
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === 'credit_card'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      💳 Cartão
                    </button>
                  </div>
                </div>

                {/* Observation */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Observações do Pedido</label>
                  <input
                    type="text"
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    placeholder="Instruções gerais, troco, sachês..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Sticky Order Footer: Totals & Launch Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/95 space-y-3">
              
              {/* Financial values */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Itens:</span>
                  <span className="font-bold text-slate-200">{formatCurrency(itemsSubtotal)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-slate-400">
                    <span>Taxa de Entrega:</span>
                    <span className="font-bold text-slate-200">
                      {isFreeDelivery ? 'Grátis' : formatCurrency(deliveryFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black pt-1.5 border-t border-slate-800">
                  <span className="text-white">Total do Pedido:</span>
                  <span className="text-amber-400 text-xl font-black">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* PRIMARY: LANÇAR NA LINHA DE PRODUÇÃO (COZINHA) */}
                <button
                  type="button"
                  onClick={() => handleLaunch('pagamento_confirmado')}
                  disabled={orderItems.length === 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer"
                >
                  <ChefHat className="w-5 h-5 stroke-[2.5]" />
                  <span>🚀 Lançar na Linha de Produção (Cozinha)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* SECONDARY: SALVAR COMO AGUARDANDO PAGAMENTO */}
                  <button
                    type="button"
                    onClick={() => handleLaunch('aguardando_pagamento')}
                    disabled={orderItems.length === 0}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    title="Registrar pedido mas aguardar o cliente efetuar o pagamento no caixa antes de produzir"
                  >
                    <span>⏳ Aguardar Pagamento</span>
                  </button>

                  {/* CANCEL */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
