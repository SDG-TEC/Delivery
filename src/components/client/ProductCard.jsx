import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useOrder } from '../../context/OrderContext';
import { isHexColorLight } from '../../utils/theme';

export const ProductCard = ({ product, onSelectProduct, onSelect }) => {
  const { storeSettings } = useOrder();
  const primaryColor = storeSettings?.primaryColor || '#f59e0b';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  const handleClick = () => {
    if (onSelectProduct) onSelectProduct(product);
    else if (onSelect) onSelect(product);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer shadow-md hover:shadow-xl"
    >
      {/* Product Info (Left Side) */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Badge */}
        {product.badge && (
          <div
            style={{
              backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${primaryColor} 30%, transparent)`,
              color: primaryColor
            }}
            className="inline-flex items-center space-x-1 border text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider mb-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{product.badge}</span>
          </div>
        )}

        <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-white transition-colors line-clamp-1">
          {product.name}
        </h3>

        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium">
          {product.description}
        </p>

        <div className="pt-1.5 flex items-center space-x-2">
          <span className="text-sm sm:text-base font-black text-emerald-400">
            {formatCurrency(product.price)}
          </span>
          {product.options && product.options.length > 0 && (
            <span className="text-[10px] text-slate-500 font-semibold uppercase">
              • Personalizável
            </span>
          )}
        </div>
      </div>

      {/* Product Image & Plus Button (Right Side) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Plus / Add floating badge with brand color */}
        <div
          style={{
            backgroundColor: primaryColor,
            color: contrastText
          }}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all hover:brightness-105"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>
      </div>
    </div>
  );
};
