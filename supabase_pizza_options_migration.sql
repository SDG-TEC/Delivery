-- ==============================================================================
-- 🍕 SDG DELIVERY - MIGRATION: OPÇÕES DE ACRÉSCIMOS, BORDAS E MASSAS DE PIZZAS
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto e vá em "SQL Editor" no menu lateral
-- 3. Cole este código completo e clique no botão verde "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DEDICADA DE ACRÉSCIMOS E COMPLEMENTOS (pizza_complements)
-- ------------------------------------------------------------------------------
create table if not exists public.pizza_complements (
  id text primary key,
  group_name text not null, -- 'Bordas Recheadas', 'Acréscimos & Extras', 'Tipos de Massa'
  type text not null default 'checkbox' check (type in ('checkbox', 'radio')),
  name text not null,
  price numeric(10, 2) not null default 0.00,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de performance
create index if not exists idx_pizza_complements_group on public.pizza_complements (group_name);
create index if not exists idx_pizza_complements_active on public.pizza_complements (is_active);

-- Habilitar Row Level Security (RLS)
alter table public.pizza_complements enable row level security;
drop policy if exists "allow_all_pizza_complements" on public.pizza_complements;
create policy "allow_all_pizza_complements" on public.pizza_complements for all using (true) with check (true);

-- Habilitar sincronização em tempo real (Realtime)
do $$
begin
  begin
    alter publication supabase_realtime add table public.pizza_complements;
  exception when others then null;
  end;
end $$;

-- ------------------------------------------------------------------------------
-- 2. POVOAMENTO INICIAL DOS COMPLEMENTOS DE PIZZAS (SEEDS)
-- ------------------------------------------------------------------------------
insert into public.pizza_complements (id, group_name, type, name, price, is_active, is_default, sort_order)
values
  -- BORDAS RECHEADAS (Escolha 1 - Radio)
  ('borda_sem', 'Borda Recheada', 'radio', 'Sem borda recheada', 0.00, true, true, 1),
  ('borda_catupiry', 'Borda Recheada', 'radio', 'Borda de Catupiry Original', 9.90, true, false, 2),
  ('borda_cheddar', 'Borda Recheada', 'radio', 'Borda de Cheddar Cremoso', 8.90, true, false, 3),
 

  -- ACRÉSCIMOS & INGREDIENTES EXTRAS (Múltipla Escolha - Checkbox)
  ('extra_mussarela', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Extra Queijo Muçarela', 8.00, true, false, 10),
  ('extra_bacon', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Bacon Crocante em Cubos', 6.50, true, false, 11),
  ('extra_catupiry', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Catupiry Original Extra', 8.00, true, false, 12),
  ('extra_cheddar', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Cheddar Cremoso Extra', 7.50, true, false, 13),
  ('extra_pepperoni', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Pepperoni Fatiado Extra', 9.00, true, false, 14),
  ('extra_calabresa', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Calabresa Fatiada Extra', 6.00, true, false, 15),
  ('extra_alho_frito', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Alho Frito Dourado', 3.50, true, false, 16),
  ('extra_azeitona', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Azeitonas Pretas Extras', 4.00, true, false, 17),
  ('extra_palmito', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Palmito Especial Picado', 7.00, true, false, 18),
  ('extra_manjericao', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Manjericão Fresco', 2.50, true, false, 19),
  ('extra_cebola', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Cebola Fatiada', 2.00, true, false, 20),
  ('extra_tomate_cereja', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Tomatinho Cereja Confit', 4.50, true, false, 21),
  ('extra_champignon', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Champignon Fatiado', 6.50, true, false, 22),
  ('extra_parmesao', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Parmesão Ralado Gratinado', 5.50, true, false, 23),
  ('extra_milho', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Milho Doce Especial', 3.00, true, false, 24),
  ('extra_oregano', 'Acréscimos & Ingredientes Extras', 'checkbox', 'Orégano Extra da Casa', 0.00, true, false, 25),

  -- TIPOS DE MASSA (Escolha 1 - Radio)
  ('massa_tradicional', 'Tipo de Massa', 'radio', 'Massa Tradicional Artesanal', 0.00, true, true, 30),
  ('massa_fina', 'Tipo de Massa', 'radio', 'Massa Fina Crocante', 0.00, true, false, 31),
  ('massa_pan', 'Tipo de Massa', 'radio', 'Massa Pan Fofinha', 6.00, true, false, 32)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  group_name = excluded.group_name,
  type = excluded.type,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DIRETA NO CARDÁPIO DE PRODUTOS (public.products)
-- Atualiza a coluna JSONB options de todas as pizzas cadastradas no banco
-- ------------------------------------------------------------------------------
do $$
declare
  pizza_options_json jsonb := '[
    {
      "name": "Borda Recheada",
      "type": "radio",
      "items": [
        { "name": "Sem borda recheada", "price": 0, "isDefault": true },
        { "name": "Borda de Catupiry Original", "price": 9.90 },
        { "name": "Borda de Cheddar Cremoso", "price": 8.90 },
      ]
    },
    -- {
    --   "name": "Acréscimos & Ingredientes Extras",
    --   "type": "checkbox",
    --   "items": [
    --     { "name": "Extra Queijo Muçarela", "price": 8.00 },
    --     { "name": "Bacon Crocante em Cubos", "price": 6.50 },
    --     { "name": "Catupiry Original Extra", "price": 8.00 },
    --     { "name": "Cheddar Cremoso Extra", "price": 7.50 },
    --     { "name": "Pepperoni Fatiado Extra", "price": 9.00 },
    --     { "name": "Calabresa Fatiada Extra", "price": 6.00 },
    --     { "name": "Alho Frito Dourado", "price": 3.50 },
    --     { "name": "Azeitonas Pretas Extras", "price": 4.00 },
    --     { "name": "Palmito Especial Picado", "price": 7.00 },
    --     { "name": "Manjericão Fresco", "price": 2.50 },
    --     { "name": "Cebola Fatiada", "price": 2.00 },
    --     { "name": "Tomatinho Cereja Confit", "price": 4.50 },
    --     { "name": "Champignon Fatiado", "price": 6.50 },
    --     { "name": "Parmesão Ralado Gratinado", "price": 5.50 },
    --     { "name": "Milho Doce Especial", "price": 3.00 },
    --     { "name": "Orégano Extra da Casa", "price": 0.00 }
    --   ]
    -- },
    {
      "name": "Tipo de Massa",
      "type": "radio",
      "items": [
        { "name": "Massa Tradicional Artesanal", "price": 0, "isDefault": true },
        { "name": "Massa Fina Crocante", "price": 0 },
        { "name": "Massa Pan Fofinha", "price": 6.00 }
      ]
    }
  ]'::jsonb;
begin
  -- 3.1. Atualiza todas as pizzas que já existem na categoria 'pizzas'
  update public.products
  set options = pizza_options_json
  where category_id = 'pizzas' or lower(name) like '%pizza%';

  -- 3.2. Garante o cadastro das principais pizzas com foto, descrição e acréscimos
  insert into public.products (id, category_id, name, description, price, image, badge, is_active, options)
  values
    (
      'p3',
      'pizzas',
      'Pizza Pepperoni Supreme',
      'Massa de longa fermentação, molho de tomate italiano, muçarela especial, pepperoni fatiado e orégano fresco.',
      59.90,
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      'Destaque',
      true,
      pizza_options_json
    ),
    (
      'p4',
      'pizzas',
      'Pizza Quattro Formaggi',
      'Combinação perfeita de Muçarela especial, Gorgonzola autêntico, Parmesão maturado e Catupiry cremoso.',
      64.90,
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      '4 Queijos',
      true,
      pizza_options_json
    ),
    (
      'p4b',
      'pizzas',
      'Pizza Calabresa Artesanal Especial',
      'Molho de tomate italiano, muçarela de búfala, calabresa defumada fatiada, cebola roxa marinada e azeitonas pretas.',
      54.90,
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
      'Tradicional',
      true,
      pizza_options_json
    ),
    (
      'p4c',
      'pizzas',
      'Pizza Frango Desfiado com Catupiry',
      'Peito de frango suavemente desfiado e temperado, milho verde selecionado e generosa camada de Catupiry Original.',
      58.90,
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'Mais Pedida',
      true,
      pizza_options_json
    ),
    (
      'p4d',
      'pizzas',
      'Pizza Margherita Especial Gourmet',
      'Massa artesanal, molho de tomates frescos pelati, muçarela especial, rodelas de tomate cereja e folhas frescas de manjericão.',
      52.90,
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
      'Clássica',
      true,
      pizza_options_json
    )
  on conflict (id) do update set
    options = excluded.options,
    name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    image = excluded.image,
    badge = excluded.badge;
end $$;
