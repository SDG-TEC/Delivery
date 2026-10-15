-- ==============================================================================
-- 🚀 SDG DELIVERY - CORREÇÃO E ATUALIZAÇÃO SUPABASE AUTH (staff_users)
-- ==============================================================================
-- 1. Remove a restrição NOT NULL da coluna legada password_hash (que causava o erro ao cadastrar)
-- 2. Garante as colunas auth_user_id e email
-- 3. Atualiza a trigger com proteção contra falhas e tratamento de exceções
-- 4. Mantém as políticas de segurança RLS ativas
-- ==============================================================================

-- 1. ESTRUTURA DA TABELA staff_users
do $$
begin
  -- Remove a obrigatoriedade da coluna legada de senha
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'password_hash'
  ) then
    alter table public.staff_users alter column password_hash drop not null;
    alter table public.staff_users alter column password_hash set default '';
  end if;

  -- Coluna auth_user_id (vínculo oficial com auth.users)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'auth_user_id'
  ) then
    alter table public.staff_users add column auth_user_id uuid unique references auth.users(id) on delete set null;
  end if;

  -- Coluna email
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'email'
  ) then
    alter table public.staff_users add column email text;
  end if;
end $$;

-- Índices de performance
create index if not exists idx_staff_users_auth_user_id on public.staff_users (auth_user_id);
create index if not exists idx_staff_users_username on public.staff_users (username);
create index if not exists idx_staff_users_role on public.staff_users (role);

-- 2. FUNÇÃO SECURITY DEFINER PARA CHECAGEM DE PAPEL ROOT/ADMIN
create or replace function public.is_staff_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_users
    where auth_user_id = auth.uid()
      and role in ('admin', 'balcao')
      and is_active = true
  );
$$;

grant execute on function public.is_staff_admin() to authenticated, anon;

-- 3. FUNÇÃO PARA LOCALIZAR E-MAIL DE LOGIN ATRAVÉS DO IDENTIFICADOR (USERNAME OU E-MAIL)
create or replace function public.get_auth_email_by_identifier(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_clean text;
begin
  v_clean := lower(trim(p_identifier));

  if v_clean like '%@%' then
    return v_clean;
  end if;

  select coalesce(s.email, u.email)
  into v_email
  from public.staff_users s
  left join auth.users u on u.id = s.auth_user_id
  where lower(s.username) = v_clean
  limit 1;

  if v_email is not null then
    return v_email;
  end if;

  return v_clean || '@sdgdelivery.local';
end;
$$;

grant execute on function public.get_auth_email_by_identifier(text) to authenticated, anon;

-- 4. TRIGGER COM TRATAMENTO DE EXCEÇÃO (NÃO TRAVA CADASTRO DO SUPABASE AUTH)
create or replace function public.handle_new_auth_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_username text;
  v_name text;
  v_phone text;
  v_existing_id text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))));
  v_name := coalesce(new.raw_user_meta_data->>'name', v_username);
  v_phone := coalesce(new.raw_user_meta_data->>'phone', '');

  begin
    -- Verifica se já existe um usuário legado com este username sem vínculo
    select id into v_existing_id
    from public.staff_users
    where lower(username) = v_username and auth_user_id is null
    limit 1;

    if v_existing_id is not null then
      update public.staff_users
      set auth_user_id = new.id,
          email = coalesce(email, new.email),
          name = coalesce(nullif(name, ''), v_name),
          updated_at = now()
      where id = v_existing_id;
    else
      -- Novo usuário comum cadastrado (papel seguro 'motoboy')
      insert into public.staff_users (
        id,
        username,
        name,
        role,
        password_hash,
        phone,
        email,
        is_active,
        auth_user_id,
        created_at,
        updated_at
      ) values (
        'staff-' || substr(new.id::text, 1, 8),
        v_username,
        v_name,
        'motoboy',
        '',
        v_phone,
        new.email,
        true,
        new.id,
        now(),
        now()
      )
      on conflict (username) do update set
        auth_user_id = coalesce(public.staff_users.auth_user_id, excluded.auth_user_id),
        email = coalesce(public.staff_users.email, excluded.email),
        updated_at = now();
    end if;
  exception when others then
    -- Previne erro 'Database error saving new user' se houver qualquer divergência de constraints
    raise warning 'Aviso na sincronização de staff_users: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute function public.handle_new_auth_staff_user();

-- 5. ROW LEVEL SECURITY (RLS) RESTRITO E SEGURO
alter table public.staff_users enable row level security;

drop policy if exists "allow_all_staff_users" on public.staff_users;
drop policy if exists "staff_users_select_policy" on public.staff_users;
drop policy if exists "staff_users_insert_policy" on public.staff_users;
drop policy if exists "staff_users_update_policy" on public.staff_users;
drop policy if exists "staff_users_delete_policy" on public.staff_users;

create policy "staff_users_select_policy"
  on public.staff_users for select to authenticated
  using (auth_user_id = auth.uid() or public.is_staff_admin());

create policy "staff_users_insert_policy"
  on public.staff_users for insert to authenticated
  with check (public.is_staff_admin() or (auth_user_id = auth.uid() and role = 'motoboy'));

create policy "staff_users_update_policy"
  on public.staff_users for update to authenticated
  using (public.is_staff_admin() or auth_user_id = auth.uid());

create policy "staff_users_delete_policy"
  on public.staff_users for delete to authenticated
  using (public.is_staff_admin());
