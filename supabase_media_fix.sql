-- ==============================================================================
-- 🛠️ SDG DELIVERY - ADICIONAR COLUNA MEDIA E RECARREGAR SCHEMA CACHE
-- ==============================================================================

-- Adiciona a coluna 'media' na tabela orders caso ela ainda não exista
alter table if exists public.orders 
add column if not exists media jsonb not null default '[]'::jsonb;

-- Recarrega o cache do PostgREST para o Supabase reconhecer imediatamente
notify pgrst, 'reload schema';
