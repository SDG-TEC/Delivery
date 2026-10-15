import React, { useState, useEffect } from 'react';
import { useOrder } from '../../context/OrderContext';
import {
  fetchStaffUsers, saveStaffUser, deleteStaffUser
} from '../../services/staffAuthService';
import {
  ShieldCheck, Bike, KeyRound, UserPlus, Trash2, Edit2, Check,
  RefreshCw, AlertCircle, Lock, Eye, EyeOff, User, Phone, CheckCircle2, Mail,
  Monitor, Users, Search, AlertTriangle, Database, Copy, CheckCheck, CloudOff
} from 'lucide-react';

const SQL_FIX_SCRIPT = `-- ==============================================================================
-- 🚀 SDG DELIVERY - LIBERAÇÃO DE PERMISSÕES E TABELA DE USUÁRIOS (staff_users)
-- ==============================================================================
-- 1. CRIAÇÃO OU ATUALIZAÇÃO DA TABELA staff_users
create table if not exists public.staff_users (
  id text primary key,
  username text unique not null,
  name text not null,
  role text not null check (role in ('admin', 'balcao', 'motoboy')),
  password_hash text default '',
  pin text default '1234',
  phone text default '',
  email text default '',
  auth_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. AJUSTES DE COLUNAS
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'password_hash'
  ) then
    alter table public.staff_users alter column password_hash drop not null;
    alter table public.staff_users alter column password_hash set default '';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'auth_user_id'
  ) then
    alter table public.staff_users add column auth_user_id uuid references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'pin'
  ) then
    alter table public.staff_users add column pin text default '1234';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'phone'
  ) then
    alter table public.staff_users add column phone text default '';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'staff_users' and column_name = 'is_active'
  ) then
    alter table public.staff_users add column is_active boolean not null default true;
  end if;
end $$;

-- 3. PERMISSÕES E DESBLOQUEIO DE RLS (ROW LEVEL SECURITY)
alter table public.staff_users enable row level security;
drop policy if exists "allow_all_staff_users" on public.staff_users;
drop policy if exists "staff_users_select_policy" on public.staff_users;
drop policy if exists "staff_users_insert_policy" on public.staff_users;
drop policy if exists "staff_users_update_policy" on public.staff_users;
drop policy if exists "staff_users_delete_policy" on public.staff_users;

create policy "allow_all_staff_users"
  on public.staff_users
  for all
  using (true)
  with check (true);

-- 4. RECARREGA O CACHE DO SUPABASE
notify pgrst, 'reload schema';`;

export const StaffUsersAdmin = () => {
  const { staffUser } = useOrder();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('local_storage');
  const [syncAlert, setSyncAlert] = useState(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'balcao_admin' | 'motoboy'

  // Modal de Adicionar / Editar Usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'balcao',
    email: '',
    password: '',
    pin: '',
    phone: '',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchStaffUsers();
      setUsers(res.users || []);
      if (res.source) {
        setDataSource(res.source);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      role: 'balcao',
      email: '',
      password: '',
      pin: '',
      phone: '',
      is_active: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name,
      role: u.role || 'balcao',
      email: u.email || '',
      password: '',
      pin: u.pin || '',
      phone: u.phone || '',
      is_active: u.is_active !== false
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id, name) => {
    if (users.length <= 1) {
      alert('Você não pode excluir o único usuário restante!');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) {
      await deleteStaffUser(id);
      loadData();
    }
  };

  const handleToggleStatus = async (user) => {
    const updated = { ...user, is_active: !user.is_active };
    await saveStaffUser(updated);
    loadData();
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim()) {
      setFormError('Informe o nome de usuário (login).');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Informe o nome completo ou apelido da pessoa.');
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError('Defina uma senha com no mínimo 6 caracteres para o novo usuário.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingUser ? editingUser.id : `staff-${Date.now()}`,
        isNew: !editingUser,
        username: formData.username,
        name: formData.name,
        role: formData.role,
        email: formData.email,
        password: formData.password,
        pin: formData.pin,
        phone: formData.phone,
        is_active: formData.is_active
      };

      const res = await saveStaffUser(payload);
      if (!res.success) {
        setFormError(res.error || 'Erro ao salvar usuário.');
        return;
      }

      if (res.supabaseError) {
        setSyncAlert({
          type: 'warning',
          message: `Usuário "${formData.name}" (@${formData.username}) salvo com sucesso! Está gravado no navegador deste computador. Porém o Supabase retornou restrição de permissão (RLS 42501). Para que funcione em outros celulares ou computadores, execute o Script SQL no Supabase.`
        });
      } else {
        setSyncAlert({
          type: 'success',
          message: `Usuário "${formData.name}" (@${formData.username}) salvo e sincronizado com o Supabase com sucesso!`
        });
        setTimeout(() => setSyncAlert(null), 6000);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_FIX_SCRIPT);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  // Contadores
  const totalCount = users.length;
  const balcaoCount = users.filter(u => u.role === 'admin' || u.role === 'balcao').length;
  const motoboyCount = users.filter(u => u.role === 'motoboy').length;
  const activeCount = users.filter(u => u.is_active !== false).length;

  // Filtragem
  const filteredUsers = users.filter(u => {
    const isBalcaoOrAdmin = u.role === 'admin' || u.role === 'balcao';
    const matchesRole = roleFilter === 'all' ||
      (roleFilter === 'balcao_admin' && isBalcaoOrAdmin) ||
      (roleFilter === 'motoboy' && u.role === 'motoboy');

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      u.name?.toLowerCase().includes(searchLower) ||
      u.username?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.includes(searchTerm.trim());

    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner Informativo */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">Gestão de Usuários da Equipe</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                Exclusivo Balcão
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Cadastre e gerencie os operadores de <b>Balcão/Caixa</b> e entregadores <b>Motoboys</b>. 
              O cadastro público de contas foi desativado na tela de login; apenas usuários criados nesta tela terão acesso ao sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            title="Ver script SQL para executar no Supabase"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Script SQL Supabase</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Alerta de Sincronização e Salvamento */}
      {syncAlert && (
        <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          syncAlert.type === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
        }`}>
          <div className="flex items-start sm:items-center space-x-3">
            {syncAlert.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span className="leading-relaxed">{syncAlert.message}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            {syncAlert.type === 'warning' && (
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
              >
                Como Resolver no Supabase
              </button>
            )}
            <button
              type="button"
              onClick={() => setSyncAlert(null)}
              className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner de Status da Fonte de Dados */}
      {dataSource === 'local_storage' && !syncAlert && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Armazenamento: <b className="text-slate-200">Cache Local</b>. Seus usuários cadastrados estão funcionando normalmente neste navegador.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>Liberar sincronização na nuvem Supabase</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Total de Usuários</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-white">{totalCount}</span>
            <Users className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Balcão & Caixa</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-amber-400">{balcaoCount}</span>
            <Monitor className="w-5 h-5 text-amber-500/40" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Entregadores Motoboys</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-emerald-400">{motoboyCount}</span>
            <Bike className="w-5 h-5 text-emerald-500/40" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Acessos Ativos</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-cyan-400">{activeCount}</span>
            <CheckCircle2 className="w-5 h-5 text-cyan-500/40" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        {/* Filtros por Papel */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            Todos ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('balcao_admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'balcao_admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            👑 Balcão & Caixa ({balcaoCount})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('motoboy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'motoboy'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            🏍️ Motoboys ({motoboyCount})
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nome, login, e-mail..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Usuários Cadastrados */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Usuários Cadastrados ({filteredUsers.length})
          </h3>
          <span className="text-xs text-slate-500">
            Você está logado como: <b className="text-amber-400">{staffUser?.name || staffUser?.username || 'Root'}</b>
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">
              {searchTerm ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado nesta categoria.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-amber-400 text-xs font-bold hover:underline cursor-pointer"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredUsers.map((u) => {
              const isAdmin = u.role === 'admin';
              const isBalcao = u.role === 'balcao';
              const isMotoboy = u.role === 'motoboy';
              const isAuthLinked = Boolean(u.auth_user_id);

              return (
                <div key={u.id || u.username} className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
                  
                  {/* Dados do Usuário */}
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isAdmin
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : isBalcao
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    }`}>
                      {isAdmin ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : isBalcao ? (
                        <Monitor className="w-5 h-5" />
                      ) : (
                        <Bike className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm font-black text-white truncate">{u.name}</span>
                        
                        {/* Role Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isBalcao
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isAdmin ? '👑 Administrador' : isBalcao ? '🖥️ Balcão / Caixa' : '🏍️ Motoboy'}
                        </span>

                        {!u.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Desativado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                        <span>Login: <b className="text-slate-200">{u.username}</b></span>
                        {u.pin && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <KeyRound className="w-3 h-3" />
                              PIN: {u.pin}
                            </span>
                          </>
                        )}
                        {u.email && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{u.email}</span>
                          </>
                        )}
                        {u.phone && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{u.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        u.is_active
                          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
                          : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                      }`}
                      title={u.is_active ? 'Desativar acesso deste usuário' : 'Reativar acesso deste usuário'}
                    >
                      {u.is_active ? '✓ Ativo' : '✕ Inativo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Editar dados do usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* Modal de Cadastro / Edição de Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingUser ? 'Editar Usuário da Equipe' : 'Cadastrar Novo Usuário da Equipe'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              
              {/* Papel / Nível de Acesso (3 Opções) */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nível de Permissão *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 border transition-all cursor-pointer ${
                      formData.role === 'admin'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[11px]">Admin (Root)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'balcao' })}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 border transition-all cursor-pointer ${
                      formData.role === 'balcao'
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="text-[11px]">Balcão/Caixa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'motoboy' })}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 border transition-all cursor-pointer ${
                      formData.role === 'motoboy'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span className="text-[11px]">Motoboy</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  {formData.role === 'admin' && '👑 Administrador tem acesso total a todos os módulos e relatórios.'}
                  {formData.role === 'balcao' && '🖥️ Balcão tem acesso ao Caixa, Mesas, Pedidos e Gestão de Usuários.'}
                  {formData.role === 'motoboy' && '🏍️ Motoboy tem acesso exclusivo ao Painel de Entregas e rotas.'}
                </span>
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Login (Username) */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Login de Acesso (Username) *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="Ex: carlossilva, motoboy1"
                  required
                  disabled={Boolean(editingUser)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">
                  {editingUser ? 'Alterar Senha (Opcional - deixe em branco para manter)' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Nova senha (ou em branco)' : 'Mínimo 6 caracteres'}
                    required={!editingUser}
                    minLength={editingUser ? 0 : 6}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-white outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* PIN Numérico Rápido */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">PIN de Acesso Rápido (Ex: 1234 - Opcional)</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="Ex: 1234 (login simplificado)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">E-mail (Opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: carlossilva@email.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* WhatsApp / Telefone */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">WhatsApp / Telefone (Opcional)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(33) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Salvar Usuário</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Instruções e Script SQL para o Supabase */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Sincronização na Nuvem do Supabase
                  </h3>
                  <p className="text-xs text-slate-400">
                    Liberação de permissões (RLS) para a tabela de usuários (<code className="text-amber-300">staff_users</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 text-xs text-slate-300">
              <p className="leading-relaxed">
                Por padrão de segurança, o Supabase bloqueia novos cadastros que vêm do aplicativo sem uma sessão master (erro <b>42501</b>). 
                Para que os usuários cadastrados funcionem em todos os computadores e nos celulares dos motoboys, basta executar o comando SQL abaixo no seu painel:
              </p>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Passo a passo rápido:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
                  <li>Abra o seu painel em <b>supabase.com/dashboard</b></li>
                  <li>No menu lateral esquerdo, clique no ícone do <b>SQL Editor</b></li>
                  <li>Clique em <b>+ New Query</b></li>
                  <li>Cole o código abaixo e clique no botão verde <b>RUN</b> (no canto inferior direito)</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] text-slate-400">
                  <span className="font-mono">supabase_staff_users_fix.sql</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    {sqlCopied ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copiado com sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-b-xl text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all">
                  {SQL_FIX_SCRIPT}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-500">
                Arquivo disponível também na raiz do projeto: <code className="text-slate-400">supabase_staff_users_fix.sql</code>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {sqlCopied ? (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código SQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
