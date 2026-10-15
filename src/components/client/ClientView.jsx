import React, { useState } from 'react';
import { HeaderBanner } from './HeaderBanner';
import { CategoryNav } from './CategoryNav';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartDrawer } from './CartDrawer';
import { OrderStatusModal } from './OrderStatusModal';
import { CustomerAuthModal } from './CustomerAuthModal';
import { FloatingWhatsAppButton } from './FloatingWhatsAppButton';
import { StoreFooter } from './StoreFooter';
import { useOrder } from '../../context/OrderContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { isHexColorLight } from '../../utils/theme';

export const ClientView = () => {
  const { cart, setCurrentView, products, categories, storeSettings } = useOrder();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [activeOrderTrack, setActiveOrderTrack] = useState(null);

  const primaryColor = storeSettings?.primaryColor || '#f59e0b';
  const secondaryColor = storeSettings?.secondaryColor || '#ea580c';
  const isLight = isHexColorLight(primaryColor);
  const contrastText = isLight ? '#0f172a' : '#ffffff';

  // Filter products by active status, category and search term
  const activeProducts = (products || []).filter(p => p.isActive !== false);

  const filteredProducts = activeProducts.filter(prod => {
    const matchesCategory = activeCategory === 'todos' || prod.categoryId === activeCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCartQty = cart.reduce((acc, i) => acc + i.quantity, 0);
  const totalCartValue = cart.reduce((acc, i) => acc + i.subtotal, 0);

  const realCategories = (categories || []).filter(c => c.id !== 'todos');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Banner com atalhos de fidelidade, logo, cores e contatos oficiais */}
        <HeaderBanner
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        />

        {/* Category Navbar (Sticky on mobile & desktop com a cor da marca) */}
        <CategoryNav
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        {/* Search Results or Category Section List */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
            <p className="text-slate-400 text-sm font-medium">Nenhum produto encontrado para sua busca.</p>
            <button
              onClick={() => { setActiveCategory('todos'); setSearchQuery(''); }}
              style={{ color: primaryColor }}
              className="text-xs font-bold hover:underline"
            >
              Limpar filtros e ver cardápio completo
            </button>
          </div>
        ) : activeCategory !== 'todos' || searchQuery ? (
          // Grid view when filtered
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={() => setSelectedProduct(product)}
                onSelect={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        ) : (
          // Grouped by Category Section View (Cardápio Anota Aí Style)
          <div className="space-y-10 mt-6">
            {realCategories.map(category => {
              const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
              if (categoryProducts.length === 0) return null;

              return (
                <section key={category.id} id={`category-${category.id}`} className="space-y-4 scroll-mt-24">
                  <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
                    <h2 className="text-lg font-extrabold text-white tracking-tight">
                      {category.name}
                    </h2>
                    <span className="text-xs text-slate-500 font-bold">
                      ({categoryProducts.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {categoryProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelectProduct={() => setSelectedProduct(product)}
                        onSelect={() => setSelectedProduct(product)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

      </div>

      {/* Rodapé Oficial da Loja com Logotipo, WhatsApp e Instagram */}
      <StoreFooter />

      {/* Floating Bottom Cart Bar for Mobile */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              color: contrastText
            }}
            className="w-full font-extrabold p-4 rounded-2xl shadow-2xl flex items-center justify-between transition-transform active:scale-95 animate-bounce-subtle"
          >
            <div className="flex items-center space-x-3">
              <div
                style={{
                  backgroundColor: isLight ? '#0f172a' : '#ffffff',
                  color: isLight ? '#ffffff' : '#0f172a'
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold shadow"
              >
                {totalCartQty}
              </div>
              <div className="text-left">
                <div className="text-xs uppercase font-bold opacity-80">Ver Carrinho</div>
                <div className="text-sm font-black">{formatCurrency(totalCartValue)}</div>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-black">
              <span>Finalizar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Botão Flutuante do WhatsApp do Delivery */}
      <FloatingWhatsAppButton />

      {/* Product Options Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderPlaced={(order) => setActiveOrderTrack(order)}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
      />

      {/* Customer Auth & Loyalty Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onOpenCart={() => setIsCartOpen(true)}
        onTrackOrder={(order) => {
          setIsCustomerAuthOpen(false);
          setActiveOrderTrack(order);
        }}
      />

      {/* Live Order Status Tracker */}
      {activeOrderTrack && (
        <OrderStatusModal
          order={activeOrderTrack}
          onClose={() => setActiveOrderTrack(null)}
        />
      )}
    </div>
  );
};
