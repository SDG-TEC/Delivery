import React from 'react';
import { CATEGORIES } from '../../data/mockData';
import { Utensils, Sandwich, Pizza, CupSoda, IceCream, Zap } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { isHexColorLight } from '../../utils/theme';

const ICON_MAP = {
  Utensils,
  Ham: Sandwich,
  Pizza,
  CupSoda,
  IceCream,
  Zap
};

export const CategoryNav = ({ activeCategory, setActiveCategory }) => {
  const { storeSettings } = useOrder();
  const primaryColor = storeSettings?.primaryColor || '#f59e0b';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  return (
    <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md py-3 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-800/80 mb-6 shadow-xl transition-all">
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
        {CATEGORIES.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Utensils;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={isActive ? {
                backgroundColor: primaryColor,
                color: contrastText,
                borderColor: primaryColor
              } : {}}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all duration-200 border flex-shrink-0 active:scale-95 ${
                isActive
                  ? 'shadow-lg ring-2 ring-white/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white hover:border-slate-700'
              }`}
            >
              <IconComponent
                className="w-4 h-4"
                style={{ color: isActive ? contrastText : primaryColor }}
              />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
