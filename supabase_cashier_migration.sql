-- ==============================================================================
-- 💵 SDG DELIVERY - TABELA DE FECHAMENTO E GESTÃO DE CAIXA (CASHIER SHIFTS)
-- ==============================================================================

create table if not exists public.cashier_shifts (
  id text primary key,
  operator_name text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  initial_cash numeric(10, 2) not null default 0.00,
  movements jsonb not null default '[]'::jsonb,
  closing_data jsonb default null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de performance
create index if not exists idx_cashier_shifts_status on public.cashier_shifts (status);
create index if not exists idx_cashier_shifts_opened_at on public.cashier_shifts (opened_at desc);

-- Políticas de RLS
alter table public.cashier_shifts enable row level security;

drop policy if exists "allow_all_cashier_shifts" on public.cashier_shifts;
create policy "allow_all_cashier_shifts" on public.cashier_shifts for all using (true) with check (true);

-- Habilitar sincronização em tempo real (Supabase Realtime)
do $$
begin
  alter publication supabase_realtime add table public.cashier_shifts;
exception when others then
  null;
end $$;
