import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Lock, AlertTriangle, RefreshCw, Trash2,
  Clock, Eye, Smartphone, Activity, CheckCircle2, UserX, Bug
} from 'lucide-react';
import {
  getSecurityLogs,
  clearSecurityLogs,
  getDeviceFingerprint,
  logSecurityEvent,
  SECURITY_EVENT_TYPES
} from '../../services/securityLogger';
import { RATE_LIMIT_POLICIES } from '../../services/securityRateLimiter';

export const SecurityAuditAdmin = () => {
  const [logs, setLogs] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [clearedNotice, setClearedNotice] = useState(false);

  const refreshLogs = () => {
    setLogs(getSecurityLogs());
  };

  useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = () => {
    if (window.confirm('Tem certeza de que deseja limpar os registros de auditoria de segurança?')) {
      clearSecurityLogs();
      refreshLogs();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const typeMatch = log.type?.toLowerCase().includes(q);
      const userMatch = JSON.stringify(log.details || {}).toLowerCase().includes(q);
      return typeMatch || userMatch;
    }
    return true;
  });

  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const warningCount = logs.filter(l => l.severity === 'warning').length;
  const totalCount = logs.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner de Segurança */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">Central de Cyber Security & Auditoria</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Proteção Ativa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoramento de integridade de sessões, bloqueios RBAC (ex: Motoboys no balcão) e mitigação contra força bruta.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={refreshLogs}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Atualizar</span>
            </button>
            <button
              onClick={handleClearLogs}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas de Segurança */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Status de Proteção */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Políticas de Segurança</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-center space-x-2">
            <span>100% Ativo</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            ✓ Rate Limiter + Assinatura de Sessão + RBAC
          </p>
        </div>

        {/* Card 2: Incidentes Críticos */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tentativas Críticas Bloqueadas</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {criticalCount}
          </div>
          <p className="text-[11px] text-slate-400">
            Acessos indevidos de motoboy ao balcão e lockouts
          </p>
        </div>

        {/* Card 3: Alertas / Avisos */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tentativas Incorretas</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {warningCount}
          </div>
          <p className="text-[11px] text-slate-400">
            Senhas inválidas ou rate limit temporário
          </p>
        </div>

        {/* Card 4: Dispositivo Atual */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fingerprint Deste Terminal</span>
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-mono font-bold text-white truncate">
            {getDeviceFingerprint()}
          </div>
          <p className="text-[11px] text-slate-400">
            Identificador criptográfico de sessão
          </p>
        </div>
      </div>

      {/* Tabela de Políticas de Rate Limit em vigor */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-white flex items-center space-x-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Políticas de Rate Limit e Tolerância a Ataques</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.keys(RATE_LIMIT_POLICIES).map(key => {
            const pol = RATE_LIMIT_POLICIES[key];
            return (
              <div key={key} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{pol.description}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {pol.maxAttempts}x / {Math.round(pol.windowMs / 60000)} min
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Penalidade por excesso: <b className="text-rose-400">{Math.round(pol.lockoutMs / 60000)} min de bloqueio</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed de Auditoria em Tempo Real */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-base font-black text-white">Registro de Auditoria Forense ({filteredLogs.length})</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filtros de Severidade */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterSeverity === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterSeverity === 'critical' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:text-white'
                }`}
              >
                Críticos ({criticalCount})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterSeverity === 'warning' ? 'bg-amber-500 text-slate-950' : 'text-amber-400 hover:text-white'
                }`}
              >
                Avisos ({warningCount})
              </button>
            </div>
          </div>
        </div>

        {clearedNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">
            ✓ Histórico de auditoria limpo com sucesso.
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Nenhuma violação de segurança registrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              O sistema está operando em conformidade com as diretrizes de cyber security.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredLogs.map(log => {
              const isCritical = log.severity === 'critical';
              const isWarning = log.severity === 'warning';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase ${
                        isCritical
                          ? 'bg-rose-500 text-white'
                          : isWarning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.type}
                      </span>
                      <span className="font-bold text-white">
                        {log.details?.action || log.details?.reason || log.type}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {log.details && (
                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-xl font-mono overflow-x-auto">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
