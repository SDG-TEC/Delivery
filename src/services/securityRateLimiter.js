/**
 * SDG Delivery - Cyber Security Rate Limiter
 * Protege o sistema contra ataques de força bruta, DoS, spam de pedidos e scraping.
 * Implementa algoritmo de janela deslizante com penalidade exponencial e persistência.
 */

import { logSecurityEvent, SECURITY_EVENT_TYPES, getDeviceFingerprint } from './securityLogger';

const RATE_LIMIT_STORAGE_KEY = 'sdg_security_rate_limits_v1';

/**
 * Políticas de segurança pré-configuradas por tipo de operação
 */
export const RATE_LIMIT_POLICIES = {
  // Tentativas de login da equipe com senha (Proteção contra Brute-Force)
  STAFF_LOGIN: {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,      // Janela de 10 minutos
    lockoutMs: 15 * 60 * 1000,     // Bloqueio temporário de 15 minutos
    description: 'Login da Equipe (Senha)'
  },

  // Tentativas de login da equipe com PIN rápido (PIN de 4-8 dígitos)
  STAFF_PIN: {
    maxAttempts: 4,
    windowMs: 5 * 60 * 1000,       // Janela de 5 minutos
    lockoutMs: 10 * 60 * 1000,     // Bloqueio temporário de 10 minutos
    description: 'Login da Equipe (PIN)'
  },

  // Tentativas de login do cliente por WhatsApp / PIN
  CUSTOMER_LOGIN: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
    lockoutMs: 10 * 60 * 1000,
    description: 'Login de Cliente'
  },

  // Criação de pedidos no cardápio público (Anti-Spam / Anti-Flooding)
  ORDER_CREATE: {
    maxAttempts: 30,
    windowMs: 60 * 1000,           // Janela de 1 minuto
    lockoutMs: 30 * 1000,          // Bloqueio breve de 30 segundos
    description: 'Criação de Pedidos'
  },

  // Alterações de status rápidas (Anti-Bot / Manipulação em lote desautorizada)
  STATUS_MUTATION: {
    maxAttempts: 20,
    windowMs: 30 * 1000,          // Máximo 20 alterações por 30s
    lockoutMs: 60 * 1000,         // Bloqueio de 1 minuto
    description: 'Transição de Status de Pedidos'
  },

  // Operações de Gestão de Usuários (Criação/Edição/Exclusão)
  USER_MANAGEMENT: {
    maxAttempts: 15,
    windowMs: 60 * 1000,
    lockoutMs: 5 * 60 * 1000,
    description: 'Gestão de Usuários'
  }
};

/**
 * Lê o estado armazenado do rate limiter e descarta registros expirados
 * @returns {Object}
 */
const getStorageData = () => {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const clean = {};

    // Garbage Collection de registros mais velhos que 2 horas
    Object.keys(parsed).forEach(key => {
      const record = parsed[key];
      if (record.lockedUntil > now || (now - record.lastAttempt < 2 * 60 * 60 * 1000)) {
        clean[key] = record;
      }
    });

    return clean;
  } catch (e) {
    return {};
  }
};

/**
 * Salva o estado do rate limiter
 * @param {Object} data 
 */
const saveStorageData = (data) => {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Falha ao persistir estado de rate limit:', e);
  }
};

/**
 * Gera chave única para rastrear o limite
 * @param {string} actionType 
 * @param {string} [identifier=''] 
 * @returns {string}
 */
const buildKey = (actionType, identifier = '') => {
  const cleanId = (identifier || getDeviceFingerprint()).trim().toLowerCase();
  return `${actionType}::${cleanId}`;
};

/**
 * Formata milissegundos restantes em texto amigável (ex: "4 min 30s")
 * @param {number} ms 
 * @returns {string}
 */
export const formatRemainingTime = (ms) => {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds <= 60) {
    return `${totalSeconds} segundos`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  return `${minutes} min e ${seconds}s`;
};

/**
 * Verifica se a ação está bloqueada por rate limit
 * 
 * @param {string} actionType - Membro de RATE_LIMIT_POLICIES
 * @param {string} [identifier=''] - Identificador alvo (ex: e-mail, telefone, username ou fingerprint)
 * @returns {{ allowed: boolean, remainingAttempts: number, retryAfterSeconds: number, retryAfterFormatted: string, error?: string }}
 */
export const checkRateLimit = (actionType, identifier = '') => {
  const policy = RATE_LIMIT_POLICIES[actionType];
  if (!policy) {
    return { allowed: true, remainingAttempts: 999, retryAfterSeconds: 0, retryAfterFormatted: '' };
  }

  const key = buildKey(actionType, identifier);
  const data = getStorageData();
  const record = data[key];
  const now = Date.now();

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: policy.maxAttempts,
      retryAfterSeconds: 0,
      retryAfterFormatted: ''
    };
  }

  // 1. Está atualmente em período de Bloqueio (Lockout)?
  if (record.lockedUntil && record.lockedUntil > now) {
    const diffMs = record.lockedUntil - now;
    const retryAfterSec = Math.ceil(diffMs / 1000);
    const retryFormatted = formatRemainingTime(diffMs);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: retryAfterSec,
      retryAfterFormatted: retryFormatted,
      error: `Acesso temporariamente bloqueado por segurança devido a excesso de tentativas. Tente novamente em ${retryFormatted}.`
    };
  }

  // 2. Filtra tentativas dentro da janela deslizante
  const recentAttempts = (record.attempts || []).filter(ts => (now - ts) < policy.windowMs);
  const remaining = Math.max(0, policy.maxAttempts - recentAttempts.length);

  if (remaining <= 0) {
    // Ultrapassou o limite: aplica o Lockout imediatamente
    const lockedUntil = now + policy.lockoutMs;
    data[key] = {
      ...record,
      attempts: recentAttempts,
      lockedUntil,
      lastAttempt: now
    };
    saveStorageData(data);

    logSecurityEvent(SECURITY_EVENT_TYPES.BRUTE_FORCE_LOCKOUT, {
      actionType,
      identifier: identifier || 'fingerprint',
      attemptsCount: recentAttempts.length,
      lockoutDurationMs: policy.lockoutMs
    });

    const diffMs = policy.lockoutMs;
    const retryFormatted = formatRemainingTime(diffMs);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(diffMs / 1000),
      retryAfterFormatted: retryFormatted,
      error: `Limite de tentativas excedido para ${policy.description}. Acesso suspenso por ${retryFormatted} para proteção contra ataques.`
    };
  }

  return {
    allowed: true,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
    retryAfterFormatted: ''
  };
};

/**
 * Registra uma tentativa executada (seja sucesso ou falha)
 * 
 * @param {string} actionType 
 * @param {string} [identifier=''] 
 * @param {boolean} [success=false] 
 * @returns {Object}
 */
export const recordRateLimitAttempt = (actionType, identifier = '', success = false) => {
  const policy = RATE_LIMIT_POLICIES[actionType];
  if (!policy) return { allowed: true };

  const key = buildKey(actionType, identifier);
  const data = getStorageData();
  const now = Date.now();
  const record = data[key] || { attempts: [], lockedUntil: 0, failureCount: 0 };

  // Se a tentativa foi bem-sucedida, reseta as falhas acumuladas
  if (success) {
    delete data[key];
    saveStorageData(data);
    return { allowed: true, remainingAttempts: policy.maxAttempts };
  }

  // Se falhou, adiciona a tentativa
  const recentAttempts = [...(record.attempts || []).filter(ts => (now - ts) < policy.windowMs), now];
  const failureCount = (record.failureCount || 0) + 1;

  let lockedUntil = record.lockedUntil || 0;
  if (recentAttempts.length >= policy.maxAttempts) {
    // Penalidade progressiva: multiplica tempo se já tiver sido bloqueado recentemente
    const penaltyMultiplier = Math.min(4, Math.floor(failureCount / policy.maxAttempts) || 1);
    lockedUntil = now + (policy.lockoutMs * penaltyMultiplier);

    logSecurityEvent(SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED, {
      actionType,
      identifier: identifier || 'fingerprint',
      failedAttempts: recentAttempts.length,
      penaltyMultiplier,
      lockedUntil: new Date(lockedUntil).toISOString()
    });
  }

  data[key] = {
    attempts: recentAttempts,
    failureCount,
    lockedUntil,
    lastAttempt: now
  };
  saveStorageData(data);

  const remaining = Math.max(0, policy.maxAttempts - recentAttempts.length);
  const isLocked = lockedUntil > now;
  const remainingTimeFormatted = isLocked ? formatRemainingTime(lockedUntil - now) : '';

  return {
    allowed: !isLocked,
    remainingAttempts: remaining,
    isLocked,
    retryAfterSeconds: isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0,
    retryAfterFormatted: remainingTimeFormatted,
    error: isLocked
      ? `Acesso temporariamente bloqueado por ${remainingTimeFormatted} por motivos de segurança.`
      : undefined
  };
};

/**
 * Reseta manualmente o bloqueio de um identificador (Uso exclusivo do Administrador Root)
 * @param {string} actionType 
 * @param {string} identifier 
 */
export const resetRateLimit = (actionType, identifier) => {
  const key = buildKey(actionType, identifier);
  const data = getStorageData();
  delete data[key];
  saveStorageData(data);
  return true;
};
