-- ==============================================================================
-- 🚀 SDG DELIVERY & KDS - RESET TOTAL E CRIAÇÃO DO BANCO DE DADOS (SUPABASE)
-- ==============================================================================

-- 1. LIMPEZA TOTAL DE TABELAS ANTIGAS DO SCHEMA PÚBLICO
do $$
declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- 2. TABELA DE CLIENTES (customers)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text not null,
  address text default '',
  neighborhood text default '',
  avatar_url text default '',
  total_orders integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_phone on public.customers (phone);
alter table public.customers add column if not exists avatar_url text default '';

-- 3. TABELA DE CATEGORIAS (categories)
create table public.categories (
  id text primary key,
  name text not null,
  icon text not null default 'Utensils',
  sort_order integer not null default 0
);

-- 4. TABELA DE PRODUTOS DO CARDÁPIO (products)
create table public.products (
  id text primary key,
  category_id text references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  price numeric(10, 2) not null default 0.00,
  image text default '',
  badge text default '',
  is_active boolean not null default true,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_products_category on public.products (category_id);

-- 5. TABELA DE PEDIDOS (orders)
create table public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  delivery_type text not null default 'delivery' check (delivery_type in ('delivery', 'takeout')),
  address text not null default '',
  payment_method text not null default 'pix' check (payment_method in ('pix', 'credit_card', 'cash')),
  status text not null default 'aguardando_pagamento' check (status in ('aguardando_pagamento', 'pagamento_confirmado', 'em_preparo', 'pronto', 'saiu_para_entrega', 'entregue', 'cancelado')),
  total numeric(10, 2) not null default 0.00,
  observation text default '',
  items jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb
);

create index idx_orders_created_at on public.orders (created_at desc);
create index idx_orders_status on public.orders (status);
alter table public.orders add column if not exists media jsonb not null default '[]'::jsonb;

-- 6. AUTOMAÇÃO: CADASTRO AUTOMÁTICO DO CLIENTE A CADA PEDIDO
create or replace function public.handle_order_customer_sync()
returns trigger as $$
begin
  insert into public.customers (phone, name, address, total_orders, updated_at)
  values (
    new.customer_phone,
    new.customer_name,
    case when new.address <> 'Retirada no Balcão' then new.address else '' end,
    1,
    now()
  )
  on conflict (phone) do update set
    name = excluded.name,
    address = case when excluded.address <> '' then excluded.address else public.customers.address end,
    total_orders = public.customers.total_orders + 1,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_created_sync_customer on public.orders;
create trigger on_order_created_sync_customer
  after insert on public.orders
  for each row
  execute function public.handle_order_customer_sync();

-- 5.1. TABELA DE PERSONALIZAÇÃO DA LOJA (store_settings)
create table if not exists public.store_settings (
  id text primary key default 'default',
  name text not null default 'SDG Burger & Pizza',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 7. PERMISSÕES DE ACESSO (Row Level Security - RLS)
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "allow_all_customers" on public.customers;
create policy "allow_all_customers" on public.customers for all using (true) with check (true);

drop policy if exists "allow_all_categories" on public.categories;
create policy "allow_all_categories" on public.categories for all using (true) with check (true);

drop policy if exists "allow_all_products" on public.products;
create policy "allow_all_products" on public.products for all using (true) with check (true);

drop policy if exists "allow_all_orders" on public.orders;
create policy "allow_all_orders" on public.orders for all using (true) with check (true);

drop policy if exists "allow_all_store_settings" on public.store_settings;
create policy "allow_all_store_settings" on public.store_settings for all using (true) with check (true);

-- 8. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME - BLINDADO)
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.customers;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.products;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.store_settings;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.pizza_complements;
  exception when others then null;
  end;
end $$;

-- 8.1. STORAGE BUCKET PÚBLICO PARA MÍDIAS (delivery-media)
-- Permite upload e visualização de fotos, vídeos, áudios, comprovantes, logotipo, banner de capa e produtos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-media',
  'delivery-media',
  true,
  52428800, -- limite de 50MB por arquivo (fotos, vídeos e áudios)
  null -- null permite fotos, vídeos e gravações de áudio
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = null;

drop policy if exists "allow_public_read_delivery_media" on storage.objects;
create policy "allow_public_read_delivery_media"
on storage.objects for select
using (bucket_id = 'delivery-media');

drop policy if exists "allow_public_insert_delivery_media" on storage.objects;
create policy "allow_public_insert_delivery_media"
on storage.objects for insert
with check (bucket_id = 'delivery-media');

drop policy if exists "allow_public_update_delivery_media" on storage.objects;
create policy "allow_public_update_delivery_media"
on storage.objects for update
using (bucket_id = 'delivery-media');

drop policy if exists "allow_public_delete_delivery_media" on storage.objects;
create policy "allow_public_delete_delivery_media"
on storage.objects for delete
using (bucket_id = 'delivery-media');

-- 4.1. TABELA DE COMPLEMENTOS E ACRÉSCIMOS DE PIZZAS (pizza_complements)
create table if not exists public.pizza_complements (
  id text primary key,
  group_name text not null,
  type text not null default 'checkbox' check (type in ('checkbox', 'radio')),
  name text not null,
  price numeric(10, 2) not null default 0.00,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pizza_complements_group on public.pizza_complements (group_name);
create index if not exists idx_pizza_complements_active on public.pizza_complements (is_active);

alter table public.pizza_complements enable row level security;
drop policy if exists "allow_all_pizza_complements" on public.pizza_complements;
create policy "allow_all_pizza_complements" on public.pizza_complements for all using (true) with check (true);

-- 9. DADOS INICIAIS DO CARDÁPIO (SEED)
insert into public.categories (id, name, icon, sort_order)
values
  ('todos', 'Todos os Itens', 'Utensils', 0),
  ('burgers', 'Hambúrgueres', 'Ham', 1),
  ('pizzas', 'Pizzas Artesanais', 'Pizza', 2),
  ('combos', 'Combos Especiais', 'Zap', 3),
  ('bebidas', 'Bebidas & Sucos', 'CupSoda', 4),
  ('sobremesas', 'Sobremesas', 'IceCream', 5)
on conflict (id) do update set name = excluded.name;

insert into public.products (id, category_id, name, description, price, image, badge, options)
values
  ('p1', 'burgers', 'Smash Bacon Double', 'Dois hambúrgueres smash 90g, queijo cheddar fatiado, bacon crocante em tiras e molho especial no pão brioche.', 34.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'Mais Pedido', '[{"name":"Adicionais","type":"checkbox","items":[{"name":"Extra Bacon","price":4.50},{"name":"Extra Queijo Cheddar","price":3.50},{"name":"Ovo frito","price":2.50}]},{"name":"Ponto da Carne","type":"radio","items":[{"name":"Ao Ponto (Recomendado)","price":0,"isDefault":true},{"name":"Bem Passado","price":0},{"name":"Mal Passado","price":0}]}]'::jsonb),
  ('p2', 'burgers', 'Master Trufado', 'Hambúrguer de fraldinha 180g, queijo gouda derretido, maionese trufada, cebola caramelizada e rúcula.', 39.90, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', 'Gourmet', '[{"name":"Molho Extra","type":"radio","items":[{"name":"Sem molho extra","price":0,"isDefault":true},{"name":"Maionese Trufada","price":4.00},{"name":"Barbecue de Bacon","price":3.00}]}]'::jsonb),
  ('p3', 'pizzas', 'Pizza Pepperoni Supreme', 'Massa de longa fermentação, molho de tomate italiano, muçarela especial, pepperoni fatiado e orégano.', 59.90, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', 'Destaque', '[{"name":"Borda Recheada","type":"radio","items":[{"name":"Sem borda recheada","price":0,"isDefault":true},{"name":"Borda de Catupiry Original","price":9.90},{"name":"Borda de Cheddar Cremoso","price":8.90},{"name":"Borda Vulcão de Catupiry","price":14.90},{"name":"Borda Doce de Chocolate ao Leite","price":12.90},{"name":"Borda Doce de Doce de Leite","price":10.90}]},{"name":"Acréscimos & Ingredientes Extras","type":"checkbox","items":[{"name":"Extra Queijo Muçarela","price":8.00},{"name":"Bacon Crocante em Cubos","price":6.50},{"name":"Catupiry Original Extra","price":8.00},{"name":"Cheddar Cremoso Extra","price":7.50},{"name":"Pepperoni Fatiado Extra","price":9.00},{"name":"Calabresa Fatiada Extra","price":6.00},{"name":"Alho Frito Dourado","price":3.50},{"name":"Azeitonas Pretas Extras","price":4.00},{"name":"Palmito Especial Picado","price":7.00},{"name":"Manjericão Fresco","price":2.50},{"name":"Cebola Fatiada","price":2.00},{"name":"Tomatinho Cereja Confit","price":4.50},{"name":"Champignon Fatiado","price":6.50},{"name":"Parmesão Ralado Gratinado","price":5.50},{"name":"Milho Doce Especial","price":3.00},{"name":"Orégano Extra da Casa","price":0.00}]},{"name":"Tipo de Massa","type":"radio","items":[{"name":"Massa Tradicional Artesanal","price":0,"isDefault":true},{"name":"Massa Fina Crocante","price":0},{"name":"Massa Pan Fofinha","price":6.00}]}]'::jsonb),
  ('p4', 'pizzas', 'Pizza Quattro Formaggi', 'Combinação perfeita de Muçarela especial, Gorgonzola autêntico, Parmesão maturado e Catupiry cremoso.', 64.90, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', '4 Queijos', '[{"name":"Borda Recheada","type":"radio","items":[{"name":"Sem borda recheada","price":0,"isDefault":true},{"name":"Borda de Catupiry Original","price":9.90},{"name":"Borda de Cheddar Cremoso","price":8.90},{"name":"Borda Vulcão de Catupiry","price":14.90},{"name":"Borda Doce de Chocolate ao Leite","price":12.90},{"name":"Borda Doce de Doce de Leite","price":10.90}]},{"name":"Acréscimos & Ingredientes Extras","type":"checkbox","items":[{"name":"Extra Queijo Muçarela","price":8.00},{"name":"Bacon Crocante em Cubos","price":6.50},{"name":"Catupiry Original Extra","price":8.00},{"name":"Cheddar Cremoso Extra","price":7.50},{"name":"Pepperoni Fatiado Extra","price":9.00},{"name":"Calabresa Fatiada Extra","price":6.00},{"name":"Alho Frito Dourado","price":3.50},{"name":"Azeitonas Pretas Extras","price":4.00},{"name":"Palmito Especial Picado","price":7.00},{"name":"Manjericão Fresco","price":2.50},{"name":"Cebola Fatiada","price":2.00},{"name":"Tomatinho Cereja Confit","price":4.50},{"name":"Champignon Fatiado","price":6.50},{"name":"Parmesão Ralado Gratinado","price":5.50},{"name":"Milho Doce Especial","price":3.00},{"name":"Orégano Extra da Casa","price":0.00}]},{"name":"Tipo de Massa","type":"radio","items":[{"name":"Massa Tradicional Artesanal","price":0,"isDefault":true},{"name":"Massa Fina Crocante","price":0},{"name":"Massa Pan Fofinha","price":6.00}]}]'::jsonb),
  ('p5', 'combos', 'Combo Casal Smash + Batata + Refri', '2x Smash Bacon Double + 1x Batata Frita Grande Crocante + 2x Refrigerantes Lata 350ml.', 79.90, 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=800&q=80', 'Economia', '[]'::jsonb),
  ('p6', 'bebidas', 'Coca-Cola Zero 350ml', 'Lata trincando de gelada.', 7.50, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', '', '[]'::jsonb),
  ('p8', 'sobremesas', 'Grand Gateau com Picolé', 'Bolo quente de chocolate derretido com picolé Magnum, morangos frescos e castanhas.', 28.90, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', 'Irresistível', '[]'::jsonb)
on conflict (id) do update set price = excluded.price, name = excluded.name, options = excluded.options;

insert into public.orders (id, created_at, updated_at, customer_name, customer_phone, delivery_type, address, payment_method, status, total, observation, items)
values
  (
    'PED-1001',
    now() - interval '15 minutes',
    now() - interval '15 minutes',
    'Carlos Eduardo',
    '(11) 98765-4321',
    'delivery',
    'Av. Paulista, 1000 - Apto 42 - Bela Vista, São Paulo',
    'pix',
    'aguardando_pagamento',
    79.80,
    'Por favor mandar sachês de maionese extra e sem cebola no lanche.',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'p1',
        'name', 'Smash Bacon Double',
        'quantity', 2,
        'price', 34.90,
        'selectedOptions', jsonb_build_array('Extra Bacon (+R$ 4,50)', 'Ao Ponto (Recomendado)'),
        'unitPriceWithExtras', 39.40,
        'subtotal', 78.80
      )
    )
  ),
  (
    'PED-1002',
    now() - interval '8 minutes',
    now() - interval '8 minutes',
    'Fernanda Lima',
    '(11) 97777-8888',
    'takeout',
    'Retirada no Balcão',
    'credit_card',
    'pagamento_confirmado',
    67.40,
    'Caprichar no orégano na pizza.',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'p3',
        'name', 'Pizza Pepperoni Supreme',
        'quantity', 1,
        'price', 59.90,
        'selectedOptions', jsonb_build_array('Sem borda recheada'),
        'unitPriceWithExtras', 59.90,
        'subtotal', 59.90
      ),
      jsonb_build_object(
        'id', 'p6',
        'name', 'Coca-Cola Zero 350ml',
        'quantity', 1,
        'price', 7.50,
        'selectedOptions', jsonb_build_array(),
        'unitPriceWithExtras', 7.50,
        'subtotal', 7.50
      )
    )
  )
on conflict (id) do nothing;

-- ==============================================================================
-- 10. TABELA DE RASTREAMENTO GPS DOS MOTOBOYS (motoboy_locations)
-- ==============================================================================
create table if not exists public.motoboy_locations (
  id text primary key,
  driver_name text not null,
  order_id text default '',
  latitude double precision not null,
  longitude double precision not null,
  speed double precision default 0,
  heading double precision default 0,
  accuracy double precision default 0,
  is_online boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.motoboy_locations enable row level security;
drop policy if exists "allow_all_motoboy_locations" on public.motoboy_locations;
create policy "allow_all_motoboy_locations" on public.motoboy_locations for all using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.motoboy_locations;
  exception when others then null;
  end;
end $$;

-- ==============================================================================
-- 11. TABELA DE CONTROLE DE ACESSO E EQUIPE (staff_users)
-- ==============================================================================
create table if not exists public.staff_users (
  id text primary key,
  username text unique not null,
  name text not null,
  role text not null check (role in ('admin', 'balcao', 'motoboy')),
  password_hash text not null,
  pin text default '1234',
  phone text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_users_username on public.staff_users (username);
create index if not exists idx_staff_users_role on public.staff_users (role);

alter table public.staff_users enable row level security;
drop policy if exists "allow_all_staff_users" on public.staff_users;
create policy "allow_all_staff_users" on public.staff_users for all using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.staff_users;
  exception when others then null;
  end;
end $$;

-- USUÁRIOS INICIAIS PADRÃO (SEEDS)
insert into public.staff_users (id, username, name, role, password_hash, pin, phone, is_active)
values
  ('staff-admin-root', 'admin', 'Administrador Root (Balcão)', 'admin', 'admin123', '1234', '(33) 99999-8888', true),
  ('staff-balcao-caixa', 'balcao', 'Operador de Balcão', 'admin', 'balcao123', '1234', '(33) 99999-8888', true),
  ('staff-motoboy-padrao', 'motoboy', 'Entregador Motoboy', 'motoboy', 'moto123', '1234', '(33) 99999-7777', true)
on conflict (username) do update set
  role = excluded.role,
  updated_at = now();


