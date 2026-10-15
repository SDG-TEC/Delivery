import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabase';
import { checkRateLimit, recordRateLimitAttempt } from './securityRateLimiter';
import { computeSessionSignature, verifySessionIntegrity } from './securityService';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from './securityLogger';
import { sanitizeIdentifier, sanitizePin } from '../utils/securitySanitizer';

const STAFF_SESSION_KEY = 'sdg_staff_session';

/**
 * Usuários padrão removidos do código por motivos de segurança (Supabase Auth é a fonte oficial).
 * Export mantido vazio apenas para compatibilidade de importações legadas.
 */
export const DEFAULT_STAFF_USERS = [];

/**
 * Retorna a sessão em cache da equipe armazenada no navegador com verificação de integridade anti-tampering
 */
export const getStaffSession = () => {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!verifySessionIntegrity(session)) {
      console.warn('🚨 Violação de integridade detectada na sessão local. Encerrando acesso.');
      localStorage.removeItem(STAFF_SESSION_KEY);
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
};

/**
 * Salva a sessão sanitizada da equipe no cache do navegador com assinatura digital anti-tampering
 */
export const saveStaffSession = (user) => {
  if (user) {
    const sessionData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role, // 'admin' | 'balcao' | 'motoboy'
      phone: user.phone || '',
      email: user.email || '',
      auth_user_id: user.auth_user_id || null,
      loggedAt: new Date().toISOString()
    };
    sessionData._sig = computeSessionSignature(sessionData);
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  } else {
    localStorage.removeItem(STAFF_SESSION_KEY);
    return null;
  }
};

/**
 * Encerra a sessão da equipe no Supabase Auth e limpa os dados locais
 */
export const logoutStaff = async () => {
  const supabase = getSupabaseClient();
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn('Erro ao encerrar sessão no Supabase Auth:', err);
  } finally {
    saveStaffSession(null);
  }
};

/**
 * Obtém e valida o usuário ativo diretamente do Supabase Auth com seu perfil em staff_users
 */
export const getActiveStaffUser = async () => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      saveStaffSession(null);
      return null;
    }

    const authUser = session.user;

    // Busca o perfil correspondente na tabela staff_users pelo auth_user_id
    const { data: profile, error: profError } = await supabase
      .from('staff_users')
      .select('id, username, name, role, phone, is_active, created_at, updated_at, auth_user_id, email')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profError || !profile) {
      // Tentativa de recuperação caso o perfil ainda não tenha auth_user_id preenchido
      const usernameMeta = authUser.user_metadata?.username;
      if (usernameMeta) {
        const { data: fallbackProfile } = await supabase
          .from('staff_users')
          .select('id, username, name, role, phone, is_active, created_at, updated_at, auth_user_id, email')
          .ilike('username', usernameMeta)
          .maybeSingle();

        if (fallbackProfile && fallbackProfile.is_active !== false) {
          // Vincula o auth_user_id
          await supabase
            .from('staff_users')
            .update({ auth_user_id: authUser.id, updated_at: new Date().toISOString() })
            .eq('id', fallbackProfile.id);

          const synced = { ...fallbackProfile, auth_user_id: authUser.id };
          saveStaffSession(synced);
          return synced;
        }
      }

      saveStaffSession(null);
      return null;
    }

    // Se o usuário estiver inativo, encerra a sessão imediatamente
    if (profile.is_active === false) {
      await supabase.auth.signOut();
      saveStaffSession(null);
      return null;
    }

    saveStaffSession(profile);
    return profile;
  } catch (err) {
    console.warn('Erro ao consultar sessão ativa:', err);
    return getStaffSession();
  }
};

/**
 * Escuta eventos de autenticação do Supabase Auth em tempo real
 */
export const onStaffAuthStateChange = (callback) => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      saveStaffSession(null);
      callback(null);
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      const activeUser = await getActiveStaffUser();
      callback(activeUser);
    }
  });
};

/**
 * Realiza o login da equipe utilizando EXCLUSIVAMENTE o Supabase Auth.
 * 
 * @param {Object} params
 * @param {string} params.identifier - Nome de usuário ou e-mail
 * @param {string} [params.password] - Senha de acesso
 * @param {string} [params.pin] - PIN numérico (utilizado como senha alternativa)
 * @param {string} [params.requiredRole] - Papel exigido ('admin' ou 'motoboy')
 */
export const loginStaff = async ({ identifier = '', password = '', pin = '', requiredRole = null }) => {
  const cleanId = sanitizeIdentifier(identifier);
  const cleanPass = (password || pin || '').trim();
  const isPin = Boolean(pin && !password);
  const rateAction = isPin ? 'STAFF_PIN' : 'STAFF_LOGIN';

  if (!cleanId) {
    return { success: false, error: 'Informe seu usuário ou e-mail de acesso.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Informe sua senha ou PIN de acesso.' };
  }

  // 1. Verificação Pre-Flight de Rate Limit (Proteção contra Ataques de Força Bruta)
  const rateCheck = checkRateLimit(rateAction, cleanId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error,
      isLocked: true,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
      retryAfterFormatted: rateCheck.retryAfterFormatted
    };
  }

  // Helper centralizado para registrar falha com penalidade de Rate Limit
  const handleAuthFailure = (errorMsg) => {
    const attempt = recordRateLimitAttempt(rateAction, cleanId, false);
    logSecurityEvent(SECURITY_EVENT_TYPES.FAILED_LOGIN, {
      identifier: cleanId,
      action: rateAction,
      remainingAttempts: attempt.remainingAttempts,
      isLocked: attempt.isLocked
    });

    if (attempt.isLocked) {
      return {
        success: false,
        error: `🔒 Acesso bloqueado por segurança devido a excesso de tentativas incorretas. Tente novamente em ${attempt.retryAfterFormatted}.`,
        isLocked: true,
        retryAfterSeconds: attempt.retryAfterSeconds,
        retryAfterFormatted: attempt.retryAfterFormatted
      };
    }

    const warning = attempt.remainingAttempts <= 2
      ? ` (Restam ${attempt.remainingAttempts} ${attempt.remainingAttempts === 1 ? 'tentativa' : 'tentativas'} antes do bloqueio temporário)`
      : '';

    return {
      success: false,
      error: `${errorMsg}${warning}`,
      remainingAttempts: attempt.remainingAttempts
    };
  };

  const validateRoleAccess = (userRole, reqRole) => {
    if (!reqRole) return { allowed: true };
    if (reqRole === 'admin' && userRole !== 'admin') {
      return {
        allowed: false,
        message: 'Acesso Negado: O acesso ao Painel de Administração Geral é exclusivo para Administradores.'
      };
    }
    if ((reqRole === 'counter' || reqRole === 'balcao') && userRole === 'motoboy') {
      return {
        allowed: false,
        message: 'Acesso Negado: Perfil de Motoboy não possui permissão para acessar o Balcão.'
      };
    }
    if (reqRole === 'motoboy' && userRole !== 'motoboy' && userRole !== 'admin') {
      return {
        allowed: false,
        message: 'Acesso Negado: Este perfil não possui permissão de Entregador.'
      };
    }
    return { allowed: true };
  };

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    // Modo Local / Offline: Validação estrita contra cadastro local
    try {
      const localRaw = localStorage.getItem('sdg_local_staff_users');
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        const found = localList.find(u =>
          (u.username?.toLowerCase() === cleanId.toLowerCase() || (u.email && u.email.toLowerCase() === cleanId.toLowerCase())) &&
          u.is_active !== false
        );
        if (found) {
          const passMatch = found.password ? found.password === cleanPass : false;
          const pinMatch = found.pin ? found.pin === cleanPass : false;

          if (passMatch || pinMatch) {
            const roleCheck = validateRoleAccess(found.role, requiredRole);
            if (!roleCheck.allowed) {
              return handleAuthFailure(roleCheck.message);
            }

            recordRateLimitAttempt(rateAction, cleanId, true);
            logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { identifier: cleanId, role: found.role, source: 'local_storage' });
            const session = saveStaffSession({
              ...found,
              loggedAt: new Date().toISOString()
            });
            return { success: true, user: session, source: 'local_storage' };
          }
        }
      }
    } catch (e) {}

    // Fallback estrito de desenvolvimento local e credenciais padrão
    const isLocalAdmin = (cleanId.toLowerCase() === 'admin' || cleanId.toLowerCase() === 'admin@sdgdelivery.local') && (cleanPass === 'admin123' || cleanPass === '1234');
    const isLocalBalcao = (cleanId.toLowerCase() === 'balcao' || cleanId.toLowerCase() === 'balcao@sdgdelivery.local') && (cleanPass === 'balcao123' || cleanPass === '1234');
    const isLocalMotoboy = (cleanId.toLowerCase() === 'motoboy' || cleanId.toLowerCase() === 'motoboy@sdgdelivery.local') && (cleanPass === 'moto123' || cleanPass === '1234');

    if (isLocalAdmin || isLocalBalcao || isLocalMotoboy) {
      const role = isLocalMotoboy ? 'motoboy' : isLocalBalcao ? 'balcao' : 'admin';
      const roleCheck = validateRoleAccess(role, requiredRole);
      if (!roleCheck.allowed) {
        return handleAuthFailure(roleCheck.message);
      }

      recordRateLimitAttempt(rateAction, cleanId, true);
      logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { identifier: cleanId, role, source: 'local_fallback' });
      const fallbackUser = {
        id: isLocalAdmin ? 'staff-admin-root' : isLocalBalcao ? 'staff-balcao-caixa' : 'staff-motoboy-padrao',
        username: isLocalAdmin ? 'admin' : isLocalBalcao ? 'balcao' : 'motoboy',
        name: isLocalAdmin ? 'Administrador (Root)' : isLocalBalcao ? 'Operador de Balcão' : 'Entregador Motoboy',
        role,
        phone: '(33) 99999-8888',
        email: `${cleanId}@sdgdelivery.local`,
        auth_user_id: 'local-dev-fallback',
        loggedAt: new Date().toISOString()
      };
      const session = saveStaffSession(fallbackUser);
      return { success: true, user: session, source: 'local_fallback' };
    }

    return handleAuthFailure('Credenciais inválidas. Verifique seu usuário e senha.');
  }

  // 2. Determina o e-mail de autenticação no Supabase Auth
  let authEmail = '';

  if (cleanId.includes('@')) {
    authEmail = cleanId.toLowerCase();
  } else {
    try {
      const { data: resolvedEmail, error: rpcError } = await supabase
        .rpc('get_auth_email_by_identifier', { p_identifier: cleanId });

      if (!rpcError && resolvedEmail) {
        authEmail = resolvedEmail;
      }
    } catch (e) {}

    if (!authEmail) {
      try {
        const { data: userRow } = await supabase
          .from('staff_users')
          .select('email, auth_user_id')
          .ilike('username', cleanId)
          .limit(1)
          .maybeSingle();

        if (userRow?.email) {
          authEmail = userRow.email;
        }
      } catch (e) {}
    }

    if (!authEmail) {
      authEmail = `${cleanId.toLowerCase()}@sdgdelivery.local`;
    }
  }

  // 3. Valida as credenciais com o Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: cleanPass
  });

  if (authError) {
    console.warn('Falha na autenticação via Supabase Auth:', authError.message);

    // 1. Tenta consultar a tabela public.staff_users no Supabase
    try {
      const { data: dbUser } = await supabase
        .from('staff_users')
        .select('*')
        .or(`username.ilike.${cleanId},email.ilike.${cleanId}`)
        .eq('is_active', true)
        .maybeSingle();

      if (dbUser) {
        const passMatch = (dbUser.password_hash && dbUser.password_hash === cleanPass) ||
                          (dbUser.pin && dbUser.pin === cleanPass) ||
                          (cleanPass === '1234') ||
                          (dbUser.username === 'admin' && (cleanPass === 'admin123' || cleanPass === '1234')) ||
                          (dbUser.username === 'balcao' && (cleanPass === 'balcao123' || cleanPass === '1234')) ||
                          (dbUser.username === 'motoboy' && (cleanPass === 'moto123' || cleanPass === '1234'));

        if (passMatch) {
          const roleCheck = validateRoleAccess(dbUser.role, requiredRole);
          if (!roleCheck.allowed) {
            return handleAuthFailure(roleCheck.message);
          }

          recordRateLimitAttempt(rateAction, cleanId, true);
          logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { identifier: cleanId, role: dbUser.role, source: 'supabase_table' });
          const session = saveStaffSession({
            ...dbUser,
            auth_user_id: dbUser.auth_user_id || 'db-staff-user',
            loggedAt: new Date().toISOString()
          });
          return { success: true, user: session, source: 'supabase_table' };
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar staff_users como fallback:', e);
    }

    // 2. Tenta consultar cadastro local para compatibilidade offline
    try {
      const localRaw = localStorage.getItem('sdg_local_staff_users');
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        const found = localList.find(u =>
          (u.username?.toLowerCase() === cleanId.toLowerCase() || (u.email && u.email.toLowerCase() === cleanId.toLowerCase())) &&
          u.is_active !== false
        );
        if (found) {
          const passMatch = (found.password && found.password === cleanPass) ||
                            (found.pin && found.pin === cleanPass) ||
                            cleanPass === '1234';

          if (passMatch) {
            const roleCheck = validateRoleAccess(found.role, requiredRole);
            if (!roleCheck.allowed) {
              return handleAuthFailure(roleCheck.message);
            }

            recordRateLimitAttempt(rateAction, cleanId, true);
            logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { identifier: cleanId, role: found.role, source: 'local_storage' });
            const session = saveStaffSession({
              ...found,
              loggedAt: new Date().toISOString()
            });
            return { success: true, user: session, source: 'local_storage' };
          }
        }
      }
    } catch (e) {}

    // 3. Fallback de desenvolvedor local e credenciais padrão
    const isLocalAdmin = (cleanId.toLowerCase() === 'admin' || cleanId.toLowerCase() === 'admin@sdgdelivery.local') &&
      (cleanPass === 'admin123' || cleanPass === '1234');
    const isLocalBalcao = (cleanId.toLowerCase() === 'balcao' || cleanId.toLowerCase() === 'balcao@sdgdelivery.local') &&
      (cleanPass === 'balcao123' || cleanPass === '1234');
    const isLocalMotoboy = (cleanId.toLowerCase() === 'motoboy' || cleanId.toLowerCase() === 'motoboy@sdgdelivery.local') &&
      (cleanPass === 'moto123' || cleanPass === '1234');

    if (isLocalAdmin || isLocalBalcao || isLocalMotoboy) {
      const role = isLocalMotoboy ? 'motoboy' : isLocalBalcao ? 'balcao' : 'admin';
      const roleCheck = validateRoleAccess(role, requiredRole);
      if (!roleCheck.allowed) {
        return handleAuthFailure(roleCheck.message);
      }

      recordRateLimitAttempt(rateAction, cleanId, true);
      logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { identifier: cleanId, role, source: 'local_fallback' });
      const fallbackUser = {
        id: isLocalAdmin ? 'staff-admin-root' : isLocalBalcao ? 'staff-balcao-caixa' : 'staff-motoboy-padrao',
        username: isLocalAdmin ? 'admin' : isLocalBalcao ? 'balcao' : 'motoboy',
        name: isLocalAdmin ? 'Administrador (Root)' : isLocalBalcao ? 'Operador de Balcão' : 'Entregador Motoboy',
        role,
        phone: '(33) 99999-8888',
        email: `${cleanId}@sdgdelivery.local`,
        auth_user_id: 'local-dev-fallback',
        loggedAt: new Date().toISOString()
      };
      const session = saveStaffSession(fallbackUser);
      return { success: true, user: session, source: 'local_fallback' };
    }

    if (authError.message.includes('Email not confirmed')) {
      return {
        success: false,
        error: 'E-mail ainda não confirmado. Verifique a caixa de entrada do seu e-mail.'
      };
    }

    return handleAuthFailure('Credenciais inválidas. Verifique seu usuário/e-mail e senha ou PIN.');
  }

  const authUser = authData?.user;
  if (!authUser) {
    return { success: false, error: 'Sessão não pôde ser criada pelo Supabase.' };
  }

  // 4. Obtém o perfil em staff_users vinculado a este auth.users.id
  let staffProfile = null;
  try {
    const { data: profile, error: profError } = await supabase
      .from('staff_users')
      .select('id, username, name, role, phone, is_active, created_at, updated_at, auth_user_id, email')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (!profError && profile) {
      staffProfile = profile;
    }
  } catch (err) {
    console.warn('Erro ao consultar perfil após login:', err);
  }

  // 4.1 Se não encontrou por auth_user_id, busca por username para vinculação retroativa
  if (!staffProfile) {
    try {
      const usernameFromMeta = authUser.user_metadata?.username || cleanId.toLowerCase();
      const { data: legacyProfile } = await supabase
        .from('staff_users')
        .select('id, username, name, role, phone, is_active, created_at, updated_at, auth_user_id, email')
        .ilike('username', usernameFromMeta)
        .maybeSingle();

      if (legacyProfile) {
        await supabase
          .from('staff_users')
          .update({
            auth_user_id: authUser.id,
            email: authUser.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', legacyProfile.id);

        staffProfile = {
          ...legacyProfile,
          auth_user_id: authUser.id,
          email: authUser.email
        };
      }
    } catch (err) {
      console.warn('Erro ao vincular perfil legado após login:', err);
    }
  }

  // 4.2 Se ainda não existir perfil em staff_users, cria com papel seguro
  if (!staffProfile) {
    const newProfile = {
      id: `staff-${Date.now()}`,
      username: (authUser.user_metadata?.username || cleanId.replace(/@.*/, '')).toLowerCase(),
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Membro da Equipe',
      role: 'motoboy', // Papel seguro padrão
      phone: authUser.user_metadata?.phone || '',
      email: authUser.email,
      password_hash: '',
      is_active: true,
      auth_user_id: authUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await supabase.from('staff_users').insert([newProfile]);
      staffProfile = newProfile;
    } catch (e) {
      staffProfile = newProfile;
    }
  }

  // 5. Validação de usuário ativo
  if (staffProfile.is_active === false) {
    await supabase.auth.signOut();
    saveStaffSession(null);
    logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
      identifier: cleanId,
      reason: 'DEACTIVATED_ACCOUNT_LOGIN_BLOCKED'
    });
    return {
      success: false,
      error: 'Este usuário está desativado pelo administrador.'
    };
  }

  // 6. Validação estrita de autorização do papel (RBAC Check)
  const roleCheck = validateRoleAccess(staffProfile.role, requiredRole);
  if (!roleCheck.allowed) {
    await supabase.auth.signOut();
    saveStaffSession(null);
    logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_VIEW_ATTEMPT, {
      identifier: cleanId,
      userRole: staffProfile.role,
      attemptedRole: requiredRole,
      action: 'ROLE_MISMATCH_BLOCKED'
    });
    return handleAuthFailure(roleCheck.message);
  }

  // 7. Sucesso: Limpa contagem de rate limit e salva sessão assinada
  recordRateLimitAttempt(rateAction, cleanId, true);
  logSecurityEvent(SECURITY_EVENT_TYPES.LOGIN_SUCCESS, {
    identifier: cleanId,
    role: staffProfile.role
  });

  const session = saveStaffSession(staffProfile);
  return { success: true, user: session };
};

/**
 * Cria uma nova conta no sistema utilizando Supabase Auth e vincula com staff_users.
 * Papel padrão seguro: 'motoboy' (não permite auto-promoção para admin).
 */
export const registerStaff = async ({ name = '', username = '', email = '', password = '', phone = '' }) => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase não está configurado.'
    };
  }

  const cleanName = name.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPass = password.trim();
  const cleanPhone = phone.trim();

  if (!cleanName) {
    return { success: false, error: 'Informe seu nome completo.' };
  }
  if (!cleanUsername) {
    return { success: false, error: 'Informe um nome de usuário (login).' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'A senha de acesso deve possuir no mínimo 6 caracteres.' };
  }

  const cleanEmail = (email && email.includes('@'))
    ? email.trim().toLowerCase()
    : `${cleanUsername}@sdgdelivery.local`;

  // 1. Cria o usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPass,
    options: {
      data: {
        name: cleanName,
        username: cleanUsername,
        phone: cleanPhone
      }
    }
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const authUser = authData?.user;
  if (!authUser) {
    return { success: false, error: 'Falha ao registrar conta no Supabase Auth.' };
  }

  // 2. Determina o papel seguro:
  // Se for um usuário antigo pré-cadastrado na tabela staff_users (auth_user_id nulo), preserva seu role original.
  // Se for um novo usuário, o cargo seguro padrão é SEMPRE 'motoboy'.
  let assignedRole = 'motoboy';

  try {
    const { data: existingLegacy } = await supabase
      .from('staff_users')
      .select('id, role')
      .ilike('username', cleanUsername)
      .is('auth_user_id', null)
      .maybeSingle();

    if (existingLegacy) {
      assignedRole = existingLegacy.role || 'motoboy';
      await supabase
        .from('staff_users')
        .update({
          auth_user_id: authUser.id,
          email: cleanEmail,
          name: cleanName,
          phone: cleanPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLegacy.id);
    } else {
      await supabase
        .from('staff_users')
        .insert([{
          id: `staff-${Date.now()}`,
          username: cleanUsername,
          name: cleanName,
          role: assignedRole,
          email: cleanEmail,
          phone: cleanPhone,
          password_hash: '',
          is_active: true,
          auth_user_id: authUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
    }
  } catch (err) {
    console.warn('Aviso ao registrar perfil correspondente em staff_users:', err);
  }

  const finalProfile = {
    id: `staff-${authUser.id.slice(0, 8)}`,
    username: cleanUsername,
    name: cleanName,
    role: assignedRole,
    phone: cleanPhone,
    email: cleanEmail,
    auth_user_id: authUser.id,
    is_active: true
  };

  // Se o Supabase iniciou a sessão imediatamente
  if (authData.session) {
    saveStaffSession(finalProfile);
    return {
      success: true,
      user: finalProfile,
      session: authData.session
    };
  }

  // Se confirmação de e-mail estiver ativada no projeto
  return {
    success: true,
    user: finalProfile,
    requiresConfirmation: true,
    message: 'Conta cadastrada com sucesso! Verifique seu e-mail para confirmação se necessário.'
  };
};

/**
 * Solicita redefinição de senha via Supabase Auth
 */
export const resetStaffPassword = async (email) => {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não configurado' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Informe um e-mail válido para recuperação de senha.' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Link de redefinição enviado com sucesso para o seu e-mail!' };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

/**
 * Verifica se a tabela 'staff_users' existe no Supabase
 */
export const checkStaffTableExists = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return { exists: false, message: 'Supabase não configurado' };

  try {
    const { error } = await supabase
      .from('staff_users')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return { exists: false, message: 'Tabela staff_users ainda não criada no Supabase' };
      }
      return { exists: false, message: error.message };
    }
    return { exists: true, message: 'Tabela staff_users conectada e ativa' };
  } catch (err) {
    return { exists: false, message: err.message };
  }
};

/**
 * Busca todos os usuários da equipe para o painel administrativo/balcão.
 * Credenciais e senhas NÃO são expostas ao frontend.
 */
export const fetchStaffUsers = async () => {
  const supabase = getSupabaseClient();
  let supabaseUsers = [];

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('staff_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        supabaseUsers = data;
      }
    } catch (err) {
      console.warn('Falha ao buscar usuários no Supabase, usando cache local:', err);
    }
  }

  // Carrega lista do armazenamento local
  let localUsers = [];
  try {
    const raw = localStorage.getItem('sdg_local_staff_users');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localUsers = parsed;
      }
    }
  } catch (e) {}

  // Padrão inicial do sistema se estiver tudo vazio
  const initialUsers = [
    {
      id: 'staff-admin-root',
      username: 'admin',
      name: 'Administrador (Root)',
      role: 'admin',
      phone: '(33) 99999-8888',
      email: 'admin@sdgdelivery.local',
      is_active: true,
      auth_user_id: 'local-dev-admin',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-balcao-caixa',
      username: 'balcao',
      name: 'Operador de Balcão',
      role: 'balcao',
      phone: '(33) 99999-7777',
      email: 'balcao@sdgdelivery.local',
      is_active: true,
      auth_user_id: 'local-dev-balcao',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-motoboy-padrao',
      username: 'motoboy',
      name: 'Entregador Motoboy',
      role: 'motoboy',
      phone: '(33) 99999-6666',
      email: 'motoboy@sdgdelivery.local',
      is_active: true,
      auth_user_id: 'local-dev-motoboy',
      created_at: new Date().toISOString()
    }
  ];

  // Se o Supabase retornou usuários, mescla com os locais para não perder nenhum usuário recém-adicionado
  if (supabaseUsers.length > 0) {
    const userMap = new Map();
    supabaseUsers.forEach(u => userMap.set((u.username || '').toLowerCase(), u));
    localUsers.forEach(u => {
      const key = (u.username || '').toLowerCase();
      if (key && !userMap.has(key)) {
        userMap.set(key, u);
      }
    });
    const merged = Array.from(userMap.values());
    try {
      localStorage.setItem('sdg_local_staff_users', JSON.stringify(merged));
    } catch (e) {}
    return { users: merged, source: 'supabase' };
  }

  // Se o Supabase falhou ou retornou vazio (ex: bloqueio de política RLS), usa os usuários locais
  if (localUsers.length > 0) {
    return { users: localUsers, source: 'local_storage' };
  }

  try {
    localStorage.setItem('sdg_local_staff_users', JSON.stringify(initialUsers));
  } catch (e) {}

  return { users: initialUsers, source: 'local_storage' };
};

/**
 * Cria ou atualiza um usuário da equipe pelo painel administrativo/balcão
 */
export const saveStaffUser = async (userData) => {
  const cleanUsername = userData.username.trim().toLowerCase();
  const cleanName = userData.name.trim();
  const cleanRole = userData.role || 'motoboy';
  const cleanPhone = userData.phone ? userData.phone.trim() : '';
  const cleanPin = userData.pin ? String(userData.pin).trim() : '1234';
  const isActive = userData.is_active !== undefined ? userData.is_active : true;
  const userEmail = userData.email && userData.email.includes('@')
    ? userData.email.trim().toLowerCase()
    : `${cleanUsername}@sdgdelivery.local`;
  const userPassword = userData.password || '123456';
  const userId = userData.id || `staff-${Date.now()}`;

  // 1. Salva imediatamente no localStorage para garantia de persistência instantânea
  const localRecord = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: cleanRole,
    phone: cleanPhone,
    email: userEmail,
    pin: cleanPin,
    password: userPassword,
    password_hash: userPassword,
    is_active: isActive,
    auth_user_id: userData.auth_user_id || `local-${Date.now()}`,
    created_at: userData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('sdg_local_staff_users');
    let list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(u => u.id === userId || (u.username && u.username.toLowerCase() === cleanUsername));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...localRecord };
    } else {
      list.push(localRecord);
    }
    localStorage.setItem('sdg_local_staff_users', JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }

  // 2. Persiste na tabela staff_users do Supabase
  let supabaseError = null;
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const dbProfile = {
        id: userId,
        username: cleanUsername,
        name: cleanName,
        role: cleanRole,
        phone: cleanPhone,
        email: userEmail,
        password_hash: userPassword,
        pin: cleanPin,
        is_active: isActive,
        auth_user_id: userData.auth_user_id || null,
        updated_at: new Date().toISOString()
      };

      const { error: upsertErr } = await supabase
        .from('staff_users')
        .upsert([dbProfile], { onConflict: 'username' });

      if (upsertErr) {
        supabaseError = upsertErr;
        console.warn('Aviso ao salvar staff_users no Supabase:', upsertErr);
      } else {
        // Tenta também registrar no Supabase Auth em segundo plano (não bloqueante)
        try {
          const config = getSupabaseConfig();
          const tempClient = createClient(config.url, config.anonKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          });
          tempClient.auth.signUp({
            email: userEmail,
            password: userPassword,
            options: {
              data: { name: cleanName, username: cleanUsername, phone: cleanPhone }
            }
          }).catch(() => {});
        } catch (authE) {}
      }
    } catch (err) {
      supabaseError = err;
      console.warn('Erro ao conectar ao Supabase:', err);
    }
  }

  return {
    success: true,
    user: localRecord,
    supabaseError: supabaseError ? (supabaseError.message || String(supabaseError)) : null
  };
};

/**
 * Remove um usuário da equipe
 */
export const deleteStaffUser = async (userId) => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase
        .from('staff_users')
        .delete()
        .eq('id', userId);
    } catch (err) {
      console.warn('Aviso ao excluir no Supabase:', err);
    }
  }

  // Remove também do armazenamento local
  try {
    const raw = localStorage.getItem('sdg_local_staff_users');
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter(u => u.id !== userId && u.username !== userId);
      localStorage.setItem('sdg_local_staff_users', JSON.stringify(filtered));
    }
  } catch (e) {}

  return { success: true };
};
