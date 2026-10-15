import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Sparkles, Image, DollarSign, Tag, Utensils, ListPlus, ChevronDown, Upload, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { uploadMediaToSupabase } from '../../services/storageService';
import { getSupabaseConfig } from '../../services/supabase';

const getPresetMediaUrl = (filename) => {
  const { url } = getSupabaseConfig();
  return url ? `${url}/storage/v1/object/public/delivery-media/products/${filename}` : '';
};

const PRESET_IMAGES = [
  // Lanches & Burgers
  { label: 'X-Tudo Artesanal', category: 'burgers', get url() { return getPresetMediaUrl('x_tudo_artesanal.jpg'); } },
  { label: 'X-Bacon Especial', category: 'burgers', get url() { return getPresetMediaUrl('x_bacon_especial.jpg'); } },
  { label: 'X-Egg Bacon Gourmet', category: 'burgers', get url() { return getPresetMediaUrl('x_egg_bacon_gourmet.jpg'); } },
  { label: 'X-Salada Clássico', category: 'burgers', get url() { return getPresetMediaUrl('x_salada_classico.jpg'); } },
  { label: 'Misto Quente na Chapa', category: 'burgers', get url() { return getPresetMediaUrl('misto_quente_chapa.jpg'); } },
  { label: 'Macarrão na Chapa', category: 'burgers', get url() { return getPresetMediaUrl('macarrao_na_chapa.jpg'); } },
  { label: 'Cheeseburger Cheddar', category: 'burgers', get url() { return getPresetMediaUrl('x_burguer_cheddar.jpg'); } },

  // Pizzas
  { label: 'Pizza 4 Sabores', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_4_sabores_grande.jpg'); } },
  { label: 'Pizza Nordestina', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_nordestina_grande.jpg'); } },
  { label: 'Pizza À Moda', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_a_moda_grande.jpg'); } },
  { label: 'Pizza Frango Catupiry', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_frango_catupiry.jpg'); } },
  { label: 'Pizza Calabresa Artesanal', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_calabresa_artesanal.jpg'); } },
  { label: 'Pizza Pepperoni Supreme', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_pepperoni_supreme.jpg'); } },
  { label: 'Pizza 4 Queijos', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_quattro_formaggi.jpg'); } },
  { label: 'Pizza Margherita Especial', category: 'pizzas', get url() { return getPresetMediaUrl('pizza_margherita_especial.jpg'); } },

  // Bebidas
  { label: 'Coca-Cola 2 Litros', category: 'bebidas', get url() { return getPresetMediaUrl('coca_cola_2l_garrafa.jpg'); } },
  { label: 'Coca-Cola Lata 350ml', category: 'bebidas', get url() { return getPresetMediaUrl('coca_cola_lata_350ml.jpg'); } },
  { label: 'Guaraná Antarctica 1L', category: 'bebidas', get url() { return getPresetMediaUrl('guarana_1l_garrafa.jpg'); } },
  { label: 'Sukita Laranja 2L', category: 'bebidas', get url() { return getPresetMediaUrl('refrigerante_sukita_2l.jpg'); } },

  // Combos & Sobremesas
  { label: 'Batata Frita Crocante', category: 'combos', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sobremesa Irresistível', category: 'sobremesas', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80' }
];

const OPTION_TEMPLATES = [
  {
    name: 'Bordas Recheadas para Pizza',
    type: 'radio',
    items: [
      { name: 'Sem borda recheada', price: 0 },
      { name: 'Borda de Catupiry Original', price: 9.90 },
      { name: 'Borda de Cheddar Cremoso', price: 8.90 },
    ]
  },
  {
    name: 'Tipo de Massa da Pizza',
    type: 'radio',
    items: [
      { name: 'Massa Tradicional Artesanal', price: 0 },
      { name: 'Massa Fina Crocante', price: 0 },
      { name: 'Massa Pan Fofinha', price: 6.00 }
    ]
  },
  {
    name: 'Adicionais para Hambúrguer',
    type: 'checkbox',
    items: [
      { name: 'Extra Bacon Crocante', price: 4.50 },
      { name: 'Extra Queijo Cheddar', price: 3.50 },
      { name: 'Ovo Frito na Chapa', price: 2.50 }
    ]
  },
  {
    name: 'Ponto da Carne',
    type: 'radio',
    items: [
      { name: 'Ao Ponto (Recomendado)', price: 0 },
      { name: 'Bem Passado', price: 0 },
      { name: 'Mal Passado', price: 0 }
    ]
  },
  {
    name: 'Molho Extra da Casa',
    type: 'radio',
    items: [
      { name: 'Maionese Especial Verde', price: 3.00 },
      { name: 'Barbecue com Bacon', price: 3.50 },
      { name: 'Sem molho extra', price: 0 }
    ]
  }
];

export const ProductModalAdmin = ({ isOpen, product, categories, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    categoryId: 'burgers',
    price: '',
    description: '',
    image: '',
    badge: '',
    isActive: true,
    options: []
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Novo grupo de adicionais manual
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('checkbox');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const result = await uploadMediaToSupabase(file, { folder: 'products', maxDim: 1000 });
    setUploadingImage(false);

    if (result.url) {
      setFormData(prev => ({ ...prev, image: result.url }));
    } else {
      alert('Erro ao carregar foto do produto: ' + (result.error || 'Falha no upload'));
    }
  };

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id || '',
        name: product.name || '',
        categoryId: product.categoryId || 'burgers',
        price: product.price ? String(product.price) : '',
        description: product.description || '',
        image: product.image || PRESET_IMAGES[0].url,
        badge: product.badge || '',
        isActive: product.isActive !== false,
        options: product.options ? JSON.parse(JSON.stringify(product.options)) : []
      });
    } else {
      const defaultCat = categories && categories.length > 1 ? categories[1].id : 'burgers';
      const defaultImg = PRESET_IMAGES.find(p => p.category === defaultCat)?.url || PRESET_IMAGES[0].url;
      setFormData({
        id: `p_${Date.now()}`,
        name: '',
        categoryId: defaultCat,
        price: '',
        description: '',
        image: defaultImg,
        badge: '',
        isActive: true,
        options: []
      });
    }
    setConfirmDelete(false);
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  // Handlers para grupos de opções
  const handleAddOptionTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, JSON.parse(JSON.stringify(template))]
    }));
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      name: newGroupName.trim(),
      type: newGroupType,
      items: []
    };
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newGroup]
    }));
    setNewGroupName('');
  };

  const handleRemoveGroup = (groupIndex) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== groupIndex)
    }));
  };

  const handleAddItemToGroup = (groupIndex, itemName, itemPrice) => {
    if (!itemName.trim()) return;
    const priceNum = parseFloat(String(itemPrice).replace(',', '.')) || 0;
    setFormData(prev => {
      const copy = JSON.parse(JSON.stringify(prev.options));
      copy[groupIndex].items.push({ name: itemName.trim(), price: priceNum });
      return { ...prev, options: copy };
    });
  };

  const handleRemoveItemFromGroup = (groupIndex, itemIndex) => {
    setFormData(prev => {
      const copy = JSON.parse(JSON.stringify(prev.options));
      copy[groupIndex].items.splice(itemIndex, 1);
      return { ...prev, options: copy };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Por favor, informe o nome do produto.');
    const priceNum = parseFloat(String(formData.price).replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) return alert('Por favor, informe um preço válido.');

    onSave({
      ...formData,
      name: formData.name.trim(),
      price: priceNum,
      description: formData.description.trim(),
      badge: formData.badge.trim()
    });
    onClose();
  };

  const isEditing = Boolean(product && product.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {isEditing ? 'Editar Item do Cardápio' : 'Novo Item no Cardápio'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure nome, valores, foto e grupos de adicionais personalizáveis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Nome e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Nome do Item *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Cheddar Bacon Master"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Categoria *
              </label>
              <select
                value={formData.categoryId}
                onChange={e => {
                  const newCat = e.target.value;
                  setFormData(prev => {
                    const isPreset = !prev.image || PRESET_IMAGES.some(p => p.url === prev.image);
                    let newImage = prev.image;
                    if (isPreset) {
                      const matched = PRESET_IMAGES.find(p => p.category === newCat);
                      if (matched) newImage = matched.url;
                    }
                    return { ...prev, categoryId: newCat, image: newImage };
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500 outline-none font-semibold"
              >
                {(categories || []).filter(c => c.id !== 'todos').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preço e Destaque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Preço (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">R$</span>
                <input
                  type="text"
                  required
                  placeholder="29,90"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white font-black placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Selo de Destaque (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Mais Pedido, Gourmet, Promo"
                value={formData.badge}
                onChange={e => setFormData({ ...formData, badge: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
              Descrição dos Ingredientes
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pão brioche tostado, 2 carnes smash 90g, queijo cheddar cremoso..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Imagem do Produto com Upload Direto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Foto do Produto
              </label>

              {/* Botão de Carregar Imagem */}
              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95">
                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{uploadingImage ? 'Enviando ao Supabase...' : '📷 Carregar Foto do Dispositivo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                <img
                  src={formData.image || PRESET_IMAGES[0].url}
                  alt="Pré-visualização"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = PRESET_IMAGES[0].url; }}
                />
              </div>
              <input
                type="url"
                placeholder="URL da foto (preenchida automaticamente ao carregar arquivo)"
                value={formData.image}
                onChange={e => setFormData({ ...formData, image: e.target.value })}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none truncate"
              />
            </div>

            {/* Sugestões de Fotos Rápidas */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fotos Prontas Rápidas:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, image: img.url })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      formData.image === img.url
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {img.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO: GRUPOS DE ADICIONAIS & PERSONALIZAÇÃO DO PRODUTO */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <ListPlus className="w-4 h-4 text-amber-400" />
                  <span>Opções & Adicionais para o Cliente ({formData.options?.length || 0})</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Permite ao cliente escolher adicionais pagos, ponto da carne, borda recheada, etc.
                </p>
              </div>
            </div>

            {/* Templates Prontos com 1 Clique */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                + Adicionar Modelos Rápidos de Opções:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {OPTION_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddOptionTemplate(tpl)}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-[10px] font-bold text-amber-300 hover:text-white transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lista dos Grupos Atuais */}
            {formData.options && formData.options.length > 0 && (
              <div className="space-y-3">
                {formData.options.map((group, groupIdx) => (
                  <div key={groupIdx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white">{group.name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-900 text-amber-400 border border-slate-800 uppercase">
                          {group.type === 'radio' ? 'Escolha Única' : 'Múltipla Escolha'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(groupIdx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remover grupo de opções"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Itens deste grupo */}
                    <div className="space-y-1.5 pt-1">
                      {group.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                          <span className="text-slate-200 font-medium">{item.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-emerald-400 font-bold">
                              {item.price > 0 ? `+ ${formatCurrency(item.price)}` : 'Grátis'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromGroup(groupIdx, itemIdx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Adicionar novo item a este grupo */}
                    <ItemAdder onAdd={(name, price) => handleAddItemToGroup(groupIdx, name, price)} />
                  </div>
                ))}
              </div>
            )}

            {/* Criar Grupo Manual */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                placeholder="Novo grupo personalizado (ex: Escolha a Bebida)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
              />
              <select
                value={newGroupType}
                onChange={e => setNewGroupType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2.5 py-2 focus:border-amber-500 outline-none font-bold"
              >
                <option value="checkbox">Múltiplo</option>
                <option value="radio">Único</option>
              </select>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Grupo</span>
              </button>
            </div>
          </div>

          {/* Disponibilidade (Ativo / Pausado) */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-white block">
                  {formData.isActive ? '🟢 Item Disponível no Cardápio' : '🔴 Item Esgotado / Pausado'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {formData.isActive ? 'Os clientes podem pedir normalmente' : 'Fica oculto do cardápio até ser reativado'}
                </span>
              </div>
            </label>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-md"
                >
                  Confirmar Exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center space-x-1.5 transition-all"
                title="Excluir este produto do cardápio"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            )
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Item'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Componente inline para adicionar item ao grupo
const ItemAdder = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name, price);
    setName('');
    setPrice('');
  };

  return (
    <div className="flex items-center space-x-2 pt-1">
      <input
        type="text"
        placeholder="Nome do opcional (ex: Bacon Extra)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
      />
      <div className="relative w-24">
        <span className="absolute left-2 top-1.5 text-[10px] text-slate-500">R$</span>
        <input
          type="text"
          placeholder="0,00"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none font-bold"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-all"
        title="Adicionar opcional ao grupo"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
