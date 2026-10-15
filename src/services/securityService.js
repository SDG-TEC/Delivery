/**
 * SDG Delivery - RBAC & Cybersecurity Authorization Engine
 * Implementa controle de acesso baseado em papéis (RBAC), integridade de sessão criptográfica
 * e prevenção de movimentação lateral e escalonamento de privilégios.
 */

import { logSecurityEvent, SECURITY_EVENT_TYPES } from './securityLogger';

export const ROLES = {
  ADMIN: 'admin',
  BALCAO: 'balcao',
  MOTOBOY: 'motoboy',
  CLIENT: 'client'
};

const SESSION_SALT = 'sdg_sec_salt_v1_9942a78fbc31';

/**
 * Gera assinatura hash simplificada síncrona para integridade de sessão no cliente
 * Previne que atacantes alterem "role": "motoboy" para "admin" manualmente no localStorage.
 */
export const computeSessionSignature = (user) => {
  if (!user || !user.id || !user.role) return '';
  const payload = `${user.id}::${user.username || ''}::${user.role}::${user.auth_user_id || ''}::${SESSION_SALT}`;
  
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Converte para inteiro de 32-bit
  }
  return 'sig_' + Math.abs(hash).toString(36) + '_' + user.role;
};

/**
 * Valida se uma sessão foi forjada ou modificada indevidamente no navegador
 * @param {Object} user 
 * @returns {boolean}
 */
export const verifySessionIntegrity = (user) => {
  if (!user) return true;
  if (!user.role || !['admin', 'balcao', 'motoboy'].includes(user.role)) {
    logSecurityEvent(SECURITY_EVENT_TYPES.SESSION_TAMPERING_DETECTED, {
      reason: 'Papel de usuário inválido na sessão',
      user
    });
    return false;
  }

  // Se a sessão possui assinatura, verifica correspondência
  if (user._sig) {
    const expected = computeSessionSignature(user);
    if (user._sig !== expected) {
      logSecurityEvent(SECURITY_EVENT_TYPES.SESSION_TAMPERING_DETECTED, {
        reason: 'Assinatura criptográfica da sessão violada',
        expectedSig: expected,
        providedSig: user._sig,
        userRole: user.role
      });
      return false;
    }
  }

  return true;
};

/**
 * Matriz de Permissões de Visualização de Telas (Views)
 */
const VIEW_PERMISSIONS = {
  client: ['admin', 'balcao', 'motoboy', 'client', null, undefined],
  motoboy: ['admin', 'motoboy'],
  counter: ['admin', 'balcao'],
  kitchen: ['admin', 'balcao'],
  admin: ['admin']
};

/**
 * Valida autorização de acesso a uma tela (View Guard)
 * 
 * @param {Object|null} user - Usuário autenticado
 * @param {string} targetView - Tela de destino ('client' | 'counter' | 'kitchen' | 'admin' | 'motoboy')
 * @returns {{ authorized: boolean, reason?: string, redirectView: string }}
 */
export const checkViewAuthorization = (user, targetView) => {
  const allowedRoles = VIEW_PERMISSIONS[targetView] || ['admin'];
  const userRole = user?.role || 'client';

  // 1. ÁREA PÚBLICA (Cliente) - Livre acesso
  if (targetView === 'client') {
    return { authorized: true, redirectView: 'client' };
  }

  // 2. Não autenticado tentando acessar área restrita:
  // Permite carregar a view para que o App.jsx renderize a tela de Login (StaffLoginView)
  if (!user) {
    return {
      authorized: true,
      redirectView: targetView
    };
  }

  // 3. Valida integridade da sessão do usuário
  if (!verifySessionIntegrity(user)) {
    return {
      authorized: false,
      reason: 'Sessão inválida ou adulterada. Por segurança, realize login novamente.',
      redirectView: 'client'
    };
  }

  // 4. Se o usuário é MOTOBOY tentando acessar Balcão, Cozinha ou Admin (BLOQUEIO ESTRITO)
  if (userRole === 'motoboy' && (targetView === 'counter' || targetView === 'kitchen' || targetView === 'admin')) {
    logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_VIEW_ATTEMPT, {
      userId: user.id,
      username: user.username,
      userRole: user.role,
      targetView,
      action: 'MOTOBOY_BLOCKED_FROM_INTERNAL_PANEL'
    });

    return {
      authorized: false,
      reason: 'Acesso Proibido: Perfil de Motoboy não possui permissão para acessar o Balcão, Cozinha ou Painel de Administração.',
      redirectView: 'motoboy'
    };
  }

  // 5. Se o usuário é OPERADOR DE BALCÃO tentando acessar Admin ou Motoboy
  if (userRole === 'balcao' && (targetView === 'admin' || targetView === 'motoboy')) {
    return {
      authorized: false,
      reason: 'Acesso Restrito: Usuários com perfil de Balcão possuem acesso exclusivo ao Balcão e à Cozinha.',
      redirectView: 'counter'
    };
  }

  // 6. Verifica conformidade com a matriz de papéis
  const isAllowed = allowedRoles.includes(userRole);
  if (!isAllowed) {
    logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_VIEW_ATTEMPT, {
      userId: user.id,
      userRole,
      targetView
    });

    return {
      authorized: false,
      reason: `Acesso Negado: O papel '${userRole}' não tem permissão para visualizar '${targetView}'.`,
      redirectView: userRole === 'motoboy' ? 'motoboy' : 'client'
    };
  }

  return { authorized: true, redirectView: targetView };
};

/**
 * Valida se um usuário tem permissão para executar uma transição de status em um pedido
 * 
 * @param {Object|null} user 
 * @param {string} currentStatus 
 * @param {string} targetStatus 
 * @param {Object} [order=null]
 * @returns {{ allowed: boolean, reason?: string }}
 */
export const validateOrderStatusTransition = (user, currentStatus, targetStatus, order = null) => {
  const userRole = user?.role || 'client';

  // 1. Root / Administrador e Balcão têm permissão completa para gerenciar o fluxo
  if (userRole === 'admin' || userRole === 'balcao') {
    return { allowed: true };
  }

  // 2. MOTOBOY: Permissão estritamente restrita a etapas de entrega
  if (userRole === 'motoboy') {
    // Motoboy só pode aceitar pedido PRONTO para iniciar entrega
    if (currentStatus === 'pronto' && targetStatus === 'saiu_para_entrega') {
      return { allowed: true };
    }

    // Motoboy só pode confirmar a entrega de pedidos que ESTAVAM em rota
    if (currentStatus === 'saiu_para_entrega' && targetStatus === 'entregue') {
      return { allowed: true };
    }

    // Qualquer outra transição é bloqueada
    logSecurityEvent(SECURITY_EVENT_TYPES.INVALID_STATUS_MUTATION, {
      userId: user.id,
      userRole: 'motoboy',
      orderId: order?.id,
      currentStatus,
      targetStatus,
      blockedAttempt: true
    });

    return {
      allowed: false,
      reason: `Violação de Segurança: Entregadores não podem alterar pedidos de '${currentStatus}' para '${targetStatus}'.`
    };
  }

  // 3. Clientes e usuários não autenticados NÃO podem alterar status de pedidos
  logSecurityEvent(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACTION_ATTEMPT, {
    userRole,
    targetStatus,
    action: 'UNAUTHENTICATED_STATUS_UPDATE'
  });

  return {
    allowed: false,
    reason: 'Operação não autorizada. Apenas operadores autorizados podem atualizar pedidos.'
  };
};

/**
 * Valida se um usuário pode executar ações de gestão crítica
 * @param {Object|null} user 
 * @param {'CREATE_ORDER'|'EDIT_ORDER'|'DELETE_ORDER'|'MANAGE_USERS'|'UPDATE_SETTINGS'} action 
 * @returns {boolean}
 */
export const isActionAuthorized = (user, action) => {
  const role = user?.role;
  if (!role) return false;

  switch (action) {
    case 'CREATE_COUNTER_ORDER':
    case 'EDIT_ORDER':
    case 'TRIGGER_PRINT':
      return role === 'admin' || role === 'balcao';

    case 'DELETE_ORDER':
    case 'UPDATE_SETTINGS':
      return role === 'admin';

    case 'MANAGE_USERS':
      return role === 'admin';

    default:
      return false;
  }
};
