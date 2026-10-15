export const CATEGORIES = [
  { id: 'todos', name: 'Todos os Itens', icon: 'Utensils' },
  { id: 'burgers', name: 'Hambúrgueres', icon: 'Ham' },
  { id: 'pizzas', name: 'Pizzas Artesanais', icon: 'Pizza' },
  { id: 'bebidas', name: 'Bebidas & Sucos', icon: 'CupSoda' },
  { id: 'sobremesas', name: 'Sobremesas', icon: 'IceCream' },
  { id: 'combos', name: 'Combos Especiais', icon: 'Zap' },
];

export const PIZZA_DEFAULT_OPTIONS = [
  {
    name: 'Borda Recheada',
    type: 'radio',
    items: [
      { name: 'Sem borda recheada', price: 0, isDefault: true },
      { name: 'Borda de Catupiry Original', price: 9.90 },
      { name: 'Borda de Cheddar Cremoso', price: 8.90 },
      { name: 'Borda Vulcão de Catupiry', price: 14.90 },
      { name: 'Borda Doce de Chocolate ao Leite', price: 12.90 },
      { name: 'Borda Doce de Doce de Leite', price: 10.90 }
    ]
  },
  {
    name: 'Acréscimos & Ingredientes Extras',
    type: 'checkbox',
    items: [
      { name: 'Extra Queijo Muçarela', price: 8.00 },
      { name: 'Bacon Crocante em Cubos', price: 6.50 },
      { name: 'Catupiry Original Extra', price: 8.00 },
      { name: 'Cheddar Cremoso Extra', price: 7.50 },
      { name: 'Pepperoni Fatiado Extra', price: 9.00 },
      { name: 'Calabresa Fatiada Extra', price: 6.00 },
      { name: 'Alho Frito Dourado', price: 3.50 },
      { name: 'Azeitonas Pretas Extras', price: 4.00 },
      { name: 'Palmito Especial Picado', price: 7.00 },
      { name: 'Manjericão Fresco', price: 2.50 },
      { name: 'Cebola Fatiada', price: 2.00 },
      { name: 'Tomatinho Cereja Confit', price: 4.50 },
      { name: 'Champignon Fatiado', price: 6.50 },
      { name: 'Parmesão Ralado Gratinado', price: 5.50 },
      { name: 'Milho Doce Especial', price: 3.00 },
      { name: 'Orégano Extra da Casa', price: 0.00 }
    ]
  },
  {
    name: 'Tipo de Massa',
    type: 'radio',
    items: [
      { name: 'Massa Tradicional Artesanal', price: 0, isDefault: true },
      { name: 'Massa Fina Crocante', price: 0 },
      { name: 'Massa Pan Fofinha', price: 6.00 }
    ]
  }
];

export const PRODUCTS = [
  {
    id: 'p1',
    categoryId: 'burgers',
    name: 'Smash Bacon Double',
    description: 'Dois hambúrgueres smash 90g, queijo cheddar fatiado, bacon crocante em tiras e molho especial da casa no pão brioche.',
    price: 34.90,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    badge: 'Mais Pedido',
    options: [
      {
        name: 'Adicionais',
        type: 'checkbox',
        items: [
          { name: 'Extra Bacon', price: 4.50 },
          { name: 'Extra Queijo Cheddar', price: 3.50 },
          { name: 'Ovo frito', price: 2.50 }
        ]
      },
      {
        name: 'Ponto da Carne',
        type: 'radio',
        items: [
          { name: 'Ao Ponto (Recomendado)', price: 0, isDefault: true },
          { name: 'Bem Passado', price: 0 },
          { name: 'Mal Passado', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'p2',
    categoryId: 'burgers',
    name: 'Master Trufado',
    description: 'Hambúrguer de fraldinha 180g, queijo gouda derretido, maionese trufada, cebola caramelizada e rúcula fresca.',
    price: 39.90,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    badge: 'Gourmet',
    options: [
      {
        name: 'Molho Extra',
        type: 'radio',
        items: [
          { name: 'Sem molho extra', price: 0, isDefault: true },
          { name: 'Maionese Trufada', price: 4.00 },
          { name: 'Barbecue de Bacon', price: 3.00 }
        ]
      }
    ]
  },
  {
    id: 'p3',
    categoryId: 'pizzas',
    name: 'Pizza Pepperoni Supreme',
    description: 'Massa de longa fermentação, molho de tomate italiano, muçarela especial, pepperoni fatiado e orégano fresco.',
    price: 59.90,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    badge: 'Destaque',
    options: PIZZA_DEFAULT_OPTIONS
  },
  {
    id: 'p4',
    categoryId: 'pizzas',
    name: 'Pizza Quattro Formaggi',
    description: 'Combinação perfeita de Muçarela especial, Gorgonzola autêntico, Parmesão maturado e Catupiry cremoso.',
    price: 64.90,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    badge: '4 Queijos',
    options: PIZZA_DEFAULT_OPTIONS
  },
  {
    id: 'p4b',
    categoryId: 'pizzas',
    name: 'Pizza Calabresa Artesanal Especial',
    description: 'Molho de tomate italiano, muçarela de búfala, calabresa defumada fatiada, cebola roxa marinada e azeitonas pretas.',
    price: 54.90,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    badge: 'Tradicional',
    options: PIZZA_DEFAULT_OPTIONS
  },
  {
    id: 'p4c',
    categoryId: 'pizzas',
    name: 'Pizza Frango Desfiado com Catupiry',
    description: 'Peito de frango suavemente desfiado e temperado, milho verde selecionado e generosa camada de Catupiry Original.',
    price: 58.90,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    badge: 'Mais Pedida',
    options: PIZZA_DEFAULT_OPTIONS
  },
  {
    id: 'p4d',
    categoryId: 'pizzas',
    name: 'Pizza Margherita Especial Gourmet',
    description: 'Massa artesanal, molho de tomates frescos pelati, muçarela especial, rodelas de tomate cereja e folhas frescas de manjericão.',
    price: 52.90,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    badge: 'Clássica',
    options: PIZZA_DEFAULT_OPTIONS
  },
  {
    id: 'p5',
    categoryId: 'combos',
    name: 'Combo Casal Smash + Batata + Refri',
    description: '2x Smash Bacon Double + 1x Batata Frita Grande Crocante + 2x Refrigerantes Lata 350ml.',
    price: 79.90,
    image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=800&q=80',
    badge: 'Economia',
    options: []
  },
  {
    id: 'p6',
    categoryId: 'bebidas',
    name: 'Coca-Cola Zero 350ml',
    description: 'Lata trincando de gelada.',
    price: 7.50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    options: []
  },
  {
    id: 'p7',
    categoryId: 'bebidas',
    name: 'Suco Natural de Laranja 500ml',
    description: 'Suco 100% fruta espremido na hora.',
    price: 11.00,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
    options: []
  },
  {
    id: 'p8',
    categoryId: 'sobremesas',
    name: 'Grand Gateau com Picolé',
    description: 'Bolo quente de chocolate derretido com picolé Magnum, morangos frescos e farofa de castanhas.',
    price: 28.90,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    badge: 'Irresistível',
    options: []
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'PED-1001',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    customerName: 'Carlos Eduardo',
    customerPhone: '(11) 98765-4321',
    deliveryType: 'delivery',
    address: 'Av. Paulista, 1000 - Apto 42 - Bela Vista, São Paulo',
    paymentMethod: 'pix',
    status: 'aguardando_pagamento',
    total: 79.80,
    observation: 'Por favor mandar sachês de maionese extra e sem cebola no lanche.',
    items: [
      {
        id: 'p1',
        name: 'Smash Bacon Double',
        quantity: 2,
        price: 34.90,
        selectedOptions: ['Extra Bacon (+R$ 4,50)', 'Ao Ponto (Recomendado)'],
        unitPriceWithExtras: 39.40,
        subtotal: 78.80
      }
    ]
  },
  {
    id: 'PED-1002',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(), // 8 mins ago
    customerName: 'Fernanda Lima',
    customerPhone: '(11) 97777-8888',
    deliveryType: 'takeout',
    address: 'Retirada no Balcão',
    paymentMethod: 'credit_card',
    status: 'pagamento_confirmado', // Balcão já confirmou! Pronta para Cozinha
    total: 67.40,
    observation: 'Caprichar no orégano na pizza.',
    items: [
      {
        id: 'p3',
        name: 'Pizza Pepperoni Supreme',
        quantity: 1,
        price: 59.90,
        selectedOptions: ['Sem borda recheada'],
        unitPriceWithExtras: 59.90,
        subtotal: 59.90
      },
      {
        id: 'p6',
        name: 'Coca-Cola Zero 350ml',
        quantity: 1,
        price: 7.50,
        selectedOptions: [],
        unitPriceWithExtras: 7.50,
        subtotal: 7.50
      }
    ]
  }
];
