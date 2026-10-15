/**
 * SDG Delivery - Security Audit Logger
 * Registra eventos de segurança, tentativas de invasão, bloqueios de rate limit e violações de RBAC.
 */

const SECURITY_LOGS_KEY = 'sdg_security_audit_logs_v1';
const MAX_STORED_LOGS = 150;

/**
 * Tipos de eventos de segurança auditados
 */
export const SECURITY_EVENT_TYPES = {
  FAILED_LOGIN: 'FAILED_LOGIN',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  BRUTE_FORCE_LOCKOUT: 'BRUTE_FORCE_LOCKOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_VIEW_ATTEMPT: 'UNAUTHORIZED_VIEW_ATTEMPT',
  UNAUTHORIZED_ACTION_ATTEMPT: 'UNAUTHORIZED_ACTION_ATTEMPT',
  INVALID_STATUS_MUTATION: 'INVALID_STATUS_MUTATION',
  SESSION_TAMPERING_DETECTED: 'SESSION_TAMPERING_DETECTED',
  ORDER_SPAM_DETECTED: 'ORDER_SPAM_DETECTED'
};

/**
 * Obtém ou inicializa identificador anônimo de dispositivo para correlação forense
 */
export const getDeviceFingerprint = () => {
  try {
    const key = 'sdg_device_fingerprint';
    let fp = localStorage.getItem(key);
    if (!fp) {
      fp = 'fp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(key, fp);
    }
    return fp;
  } catch (e) {
    return 'fp_fallback_unknown';
  }
};

/**
 * Retorna a lista de logs de segurança armazenados
 * @returns {Array}
 */
export const getSecurityLogs = () => {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Falha ao ler logs de segurança:', e);
    return [];
  }
};

/**
 * Registra um evento de auditoria de segurança
 * @param {string} eventType - Membro de SECURITY_EVENT_TYPES
 * @param {Object} details - Detalhes do incidente
 */
export const logSecurityEvent = (eventType, details = {}) => {
  try {
    const entry = {
      id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: ['BRUTE_FORCE_LOCKOUT', 'SESSION_TAMPERING_DETECTED', 'UNAUTHORIZED_VIEW_ATTEMPT'].includes(eventType)
        ? 'critical'
        : ['FAILED_LOGIN', 'RATE_LIMIT_EXCEEDED', 'INVALID_STATUS_MUTATION'].includes(eventType)
        ? 'warning'
        : 'info',
      deviceFingerprint: getDeviceFingerprint(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      details
    };

    const current = getSecurityLogs();
    const updated = [entry, ...current].slice(0, MAX_STORED_LOGS);
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(updated));

    // Alerta no console apenas para eventos críticos ou warning
    if (entry.severity === 'critical') {
      console.error(`🚨 [CYBER SECURITY ALERT] ${eventType}:`, details);
    } else if (entry.severity === 'warning') {
      console.warn(`⚠️ [CYBER SECURITY AUDIT] ${eventType}:`, details);
    }

    return entry;
  } catch (err) {
    console.error('Erro ao gravar log de auditoria de segurança:', err);
    return null;
  }
};

/**
 * Limpa o histórico de logs de auditoria (Apenas Administrador Root)
 */
export const clearSecurityLogs = () => {
  try {
    localStorage.removeItem(SECURITY_LOGS_KEY);
    logSecurityEvent('LOGS_CLEARED', { clearedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    return false;
  }
};
