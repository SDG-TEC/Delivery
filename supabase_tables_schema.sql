-- ==============================================================================
-- 🚀 SDG DELIVERY - TABELA DE CONTROLE DE MESAS E SALÃO (restaurant_tables)
-- ==============================================================================
-- 1. Cria a tabela restaurant_tables para controle de status e comandas
-- 2. Habilita sincronização em tempo real (Realtime)
-- 3. Atualiza a restrição da tabela orders para aceitar pedidos tipo 'dine_in' (Salão/Mesa)
-- 4. Insere 12 mesas padrão caso a tabela esteja vazia
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA restaurant_tables
create table if not exists public.restaurant_tables (
  id text primary key,
  table_number integer unique not null,
  name text not null default '',
  status text not null default 'livre' check (status in ('livre', 'ocupada', 'fechando')),
  current_order_id text references public.orders(id) on delete set null,
  customer_name text default '',
  people_count integer default 1,
  opened_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurant_tables_status on public.restaurant_tables (status);
create index if not exists idx_restaurant_tables_number on public.restaurant_tables (table_number);

-- 2. PERMISSÕES DE ACESSO (Row Level Security - RLS)
alter table public.restaurant_tables enable row level security;
drop policy if exists "allow_all_restaurant_tables" on public.restaurant_tables;
create policy "allow_all_restaurant_tables" on public.restaurant_tables for all using (true) with check (true);

-- 3. SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
do $$
begin
  begin
    alter publication supabase_realtime add table public.restaurant_tables;
  exception when others then null;
  end;
end $$;

-- 4. ATUALIZAR TABELA ORDERS PARA SUPORTAR PEDIDOS DE MESA (dine_in)
alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check check (delivery_type in ('delivery', 'takeout', 'dine_in'));

-- 5. POVOAMENTO INICIAL DE 12 MESAS PADRÃO (SEEDS)
insert into public.restaurant_tables (id, table_number, name, status)
values
  ('mesa-1', 1, 'Mesa 01', 'livre'),
  ('mesa-2', 2, 'Mesa 02', 'livre'),
  ('mesa-3', 3, 'Mesa 03', 'livre'),
  ('mesa-4', 4, 'Mesa 04', 'livre'),
  ('mesa-5', 5, 'Mesa 05', 'livre'),
  ('mesa-6', 6, 'Mesa 06', 'livre'),
  ('mesa-7', 7, 'Mesa 07', 'livre'),
  ('mesa-8', 8, 'Mesa 08', 'livre'),
  ('mesa-9', 9, 'Mesa 09', 'livre'),
  ('mesa-10', 10, 'Mesa 10', 'livre'),
  ('mesa-11', 11, 'Mesa 11', 'livre'),
  ('mesa-12', 12, 'Mesa 12', 'livre')
on conflict (table_number) do nothing;
