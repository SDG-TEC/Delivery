import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useOrder } from '../../context/OrderContext';
import { isHexColorLight } from '../../utils/theme';

export const ProductModal = ({ product, onClose }) => {
  const { addToCart, storeSettings } = useOrder();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [observation, setObservation] = useState('');

  const primaryColor = storeSettings?.primaryColor || '#f59e0b';
  const secondaryColor = storeSettings?.secondaryColor || '#ea580c';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  // Inicializa com as opções padrão de rádio (ex: Sem borda recheada, Massa tradicional)
  useEffect(() => {
    if (product?.options && Array.isArray(product.options)) {
      const defaults = [];
      product.options.forEach(group => {
        if (group.type === 'radio' && group.items?.length > 0) {
          const defaultItem = group.items.find(i => i.isDefault || i.price === 0) || group.items[0];
          if (defaultItem) defaults.push(defaultItem);
        }
      });
      setSelectedOptions(defaults);
    } else {
      setSelectedOptions([]);
    }
    setQuantity(1);
    setObservation('');
  }, [product]);

  if (!product) return null;

  const handleOptionToggle = (optionGroup, item) => {
    if (optionGroup.type === 'radio') {
      // Remove previous selection from same group
      const otherGroupItemsNames = optionGroup.items.map(i => i.name);
      setSelectedOptions(prev => [...prev.filter(i => !otherGroupItemsNames.includes(i.name)), item]);
    } else {
      // Checkbox multi-select toggle
      const exists = selectedOptions.some(i => i.name === item.name);
      if (exists) {
        setSelectedOptions(prev => prev.filter(i => i.name !== item.name));
      } else {
        setSelectedOptions(prev => [...prev, item]);
      }
    }
  };

  const optionExtraTotal = selectedOptions.reduce((acc, opt) => acc + (opt.price || 0), 0);
  const unitPrice = product.price + optionExtraTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedOptions, observation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Product Image Header */}
        <div className="relative h-40 sm:h-48 w-full bg-slate-950 flex-shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
          
          {/* Mobile Handle */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full"></div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-slate-950/80 text-slate-300 rounded-full flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Options Content */}
        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-white">{product.name}</h2>
              <div className="text-emerald-400 font-black text-lg sm:text-xl flex-shrink-0">
                {formatCurrency(product.price)}
              </div>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">{product.description}</p>
          </div>

          {/* Options Groups (Ponto da carne, borda de pizza, adicionais...) */}
          {product.options && product.options.map((group, idx) => {
            const groupItemsNames = group.items.map(i => i.name);
            const groupSelectedCount = selectedOptions.filter(i => groupItemsNames.includes(i.name)).length;

            return (
              <div key={idx} className="space-y-2.5 bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center pb-1">
                  <h4 className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wide">{group.name}</h4>
                  <span
                    style={{
                      color: primaryColor,
                      backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`
                    }}
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md"
                  >
                    {group.type === 'radio'
                      ? (groupSelectedCount > 0 ? 'Escolha 1' : 'Obrigatório (Escolha 1)')
                      : (groupSelectedCount > 0 ? `${groupSelectedCount} selecionado${groupSelectedCount > 1 ? 's' : ''}` : 'Opcional')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item, itemIdx) => {
                    const isSelected = selectedOptions.some(i => i.name === item.name);
                    const cleanName = item.name.replace(/\s*\(\+?R\$\s*[\d,.]+\)/i, '').trim();

                    return (
                      <div
                        key={itemIdx}
                        onClick={() => handleOptionToggle(group, item)}
                        style={isSelected ? {
                          borderColor: primaryColor,
                          backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`
                        } : {}}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all text-xs font-bold active:scale-[0.98] ${
                          isSelected
                            ? 'ring-1 ring-white/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            style={isSelected ? {
                              backgroundColor: primaryColor,
                              borderColor: primaryColor,
                              color: contrastText
                            } : {}}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? '' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span style={{ color: isSelected ? primaryColor : undefined }}>{cleanName}</span>
                        </div>

                        {item.price > 0 ? (
                          <span className="text-emerald-400 font-extrabold">+ {formatCurrency(item.price)}</span>
                        ) : (
                          group.type === 'radio' && (
                            <span className="text-slate-500 text-[10px] font-semibold">Incluso</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Observation */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Observações do Pedido
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Tirar cebola, maionese à parte, caprichar no molho..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all"
            ></textarea>
          </div>
        </div>

        {/* Sticky Footer Actions (Always Visible on Mobile) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          
          {/* Quantity Controls */}
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-black text-white text-sm w-4 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button with brand colors */}
          <button
            onClick={handleAddToCart}
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              color: contrastText
            }}
            className="flex-1 flex items-center justify-between px-4 sm:px-5 py-3 rounded-xl font-black text-xs sm:text-sm hover:brightness-105 transition-all shadow-lg active:scale-95"
          >
            <div className="flex items-center space-x-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Adicionar à Sacola</span>
            </div>
            <span>{formatCurrency(totalPrice)}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
