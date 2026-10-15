import React, { useState, useMemo } from 'react';
import {
  X, Plus, Minus, Trash2, ShoppingBag, Search, ChefHat, Users,
  Check, AlertCircle, Utensils, MessageSquare, ArrowLeft
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency } from '../../utils/formatters';

export const TableOrderModal = ({
  isOpen,
  onClose,
  table,
  mode = 'open', // 'open' (abrir mesa) | 'add_items' (adicionar rodada)
  onConfirm
}) => {
  const { products, categories } = useOrder();

  const [orderItems, setOrderItems] = useState([]);
  const [customerName, setCustomerName] = useState(table?.customerName || '');
  const [peopleCount, setPeopleCount] = useState(table?.peopleCount || 2);
  const [notes, setNotes] = useState(table?.notes || '');
  const [sendToKitchen, setSendToKitchen] = useState(true);

  // Filtros de busca e categoria
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Customização de produto com opcionais
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [customQty, setCustomQty] = useState(1);
  const [customSelectedOptions, setCustomSelectedOptions] = useState([]);
  const [customItemObs, setCustomItemObs] = useState('');

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

  if (!isOpen || !table) return null;

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

  const handleUpdateItemQty = (index, delta) => {
    setOrderItems(prev => {
      const updated = [...prev];
      const current = updated[index];
      const nextQty = current.quantity + delta;
      if (nextQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...current,
        quantity: nextQty,
        subtotal: current.unitPriceWithExtras * nextQty
      };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const itemsTotal = orderItems.reduce((acc, it) => acc + it.subtotal, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Adicione ao menos um item para lançar o pedido.');
      return;
    }

    onConfirm({
      items: orderItems,
      customerName: customerName.trim() || `Mesa ${String(table.tableNumber).padStart(2, '0')}`,
      peopleCount: Number(peopleCount) || 1,
      notes: notes.trim(),
      sendToKitchen
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">
                  {table.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  mode === 'open' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {mode === 'open' ? 'Abrir Nova Comanda' : 'Adicionar Nova Rodada'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'open' ? 'Selecione os itens iniciais para abrir a mesa.' : 'Lançar novos pratos e bebidas para a mesa já em atendimento.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Catalog (Left) and Comanda/Cart (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: Product Catalog */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 overflow-hidden">
            
            {/* Search and Categories Bar */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Pesquisar produto ou bebida..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === 'todos'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Todos
                </button>
                {(categories || []).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid or Customizer */}
            <div className="flex-1 overflow-y-auto p-4">
              {customizingProduct ? (
                /* Sub-tela de personalização de opcionais */
                <div className="space-y-4 max-w-xl mx-auto animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => setCustomizingProduct(null)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 hover:underline mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao Cardápio</span>
                  </button>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <h3 className="font-extrabold text-white text-base">{customizingProduct.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{customizingProduct.description}</p>
                    <div className="text-amber-400 font-extrabold text-sm mt-2">
                      A partir de {formatCurrency(customizingProduct.price)}
                    </div>
                  </div>

                  {customizingProduct.options?.map((grp, gIdx) => (
                    <div key={gIdx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white">{grp.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{grp.type === 'radio' ? 'Escolha 1' : 'Opcional'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {grp.items?.map((opt, oIdx) => {
                          const isSelected = customSelectedOptions.some(i => i.name === opt.name);
                          const cleanName = opt.name.replace(/\s*\(\+?R\$\s*[\d,.]+\)/i, '').trim();
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleToggleOption(grp, opt)}
                              className={`p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                                  : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xs font-bold">{cleanName}</span>
                              <span className="text-xs font-extrabold">
                                {opt.price > 0 ? `+ ${formatCurrency(opt.price)}` : (grp.type === 'radio' ? 'Incluso' : 'Grátis')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Observação deste Item</label>
                    <input
                      type="text"
                      value={customItemObs}
                      onChange={(e) => setCustomItemObs(e.target.value)}
                      placeholder="Ex: Sem cebola, gelo à parte..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCustomQty(Math.max(1, customQty - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-black text-white w-6 text-center">{customQty}</span>
                      <button
                        type="button"
                        onClick={() => setCustomQty(customQty + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmCustomProduct}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar à Mesa ({formatCurrency((customizingProduct.price + customSelectedOptions.reduce((a, b) => a + (b.price || 0), 0)) * customQty)})</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Lista normal de produtos */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] group"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-white text-xs group-hover:text-amber-400 transition-colors">
                            {p.name}
                          </h4>
                          {p.options && p.options.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                              Opcionais
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-900">
                        <span className="text-xs font-black text-emerald-400">
                          {formatCurrency(p.price)}
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Current Comanda / Selected Items */}
          <div className="w-full md:w-96 flex flex-col bg-slate-950/60 overflow-hidden">
            
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Itens da Comanda ({orderItems.reduce((a, b) => a + b.quantity, 0)})
                </span>
              </div>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrderItems([])}
                  className="text-[10px] text-rose-400 hover:underline font-bold"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Customer & Table details */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Identificação / Cliente</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Família Silva"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Pessoas na Mesa</label>
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Observações da Mesa</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Comanda 42, juntar pratos..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Checkbox: Enviar para a Cozinha */}
              <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendToKitchen}
                  onChange={(e) => setSendToKitchen(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <div className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enviar para Produção da Cozinha</span>
                </div>
              </label>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {orderItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5] text-slate-600" />
                  <span className="text-xs">Nenhum item adicionado ainda. Clique nos produtos à esquerda para lançar.</span>
                </div>
              ) : (
                orderItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-white">{item.name}</span>
                      <span className="font-black text-amber-400">{formatCurrency(item.subtotal)}</span>
                    </div>

                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-[10px] text-slate-400 pl-1">
                        {item.selectedOptions.map((opt, oIdx) => (
                          <div key={oIdx}>+ {opt}</div>
                        ))}
                      </div>
                    )}

                    {item.observation && (
                      <div className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 p-1 rounded">
                        Obs: {item.observation}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, -1)}
                          className="w-5 h-5 rounded bg-slate-800 text-white flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-white text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, 1)}
                          className="w-5 h-5 rounded bg-slate-800 text-white flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Launch Button */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Total dos Itens:</span>
                <span className="text-xl font-black text-emerald-400">{formatCurrency(itemsTotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={orderItems.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {mode === 'open'
                    ? `Abrir Mesa & Lançar (${formatCurrency(itemsTotal)})`
                    : `Adicionar Rodada (${formatCurrency(itemsTotal)})`}
                </span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
