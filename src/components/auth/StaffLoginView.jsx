import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { resetStaffPassword } from '../../services/staffAuthService';
import {
  ShieldCheck, Lock, Bike, User, Eye, EyeOff, ArrowLeft,
  KeyRound, AlertCircle, CheckCircle2, LogIn, Mail, Monitor
} from 'lucide-react';

export const StaffLoginView = ({ initialRole = 'admin', onCancel = null }) => {
  const { loginStaffUser, setCurrentView, storeSettings } = useOrder();

  const [activeTab, setActiveTab] = useState(() => {
    if (initialRole === 'motoboy') return 'motoboy';
    if (initialRole === 'admin') return 'admin';
    return 'counter';
  });
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'recovery'
  const [usePinMode, setUsePinMode] = useState(false);

  // Campos de Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Campos de Recuperação de Senha
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Efeito de contagem regressiva para liberação do Rate Limit
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleTabChange = (role) => {
    setActiveTab(role);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (lockoutSeconds > 0) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await loginStaffUser({
        identifier: identifier.trim(),
        password: usePinMode ? '' : password.trim(),
        pin: usePinMode ? pin.trim() : '',
        requiredRole: activeTab === 'counter' ? 'balcao' : activeTab
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Falha ao autenticar. Verifique seus dados.');
        if (res.isLocked && res.retryAfterSeconds) {
          setLockoutSeconds(res.retryAfterSeconds);
        }
      } else {
        // Redireciona para a tela correspondente ao papel autorizado
        if (res.user?.role === 'motoboy') {
          setCurrentView('motoboy');
        } else if (res.user?.role === 'balcao') {
          // Balcão SEMPRE entra e fica em Balcão
          setCurrentView('counter');
        } else if (res.user?.role === 'admin') {
          // Admin pode abrir tudo: se escolheu Balcão vai para Balcão, se escolheu Admin vai para Admin
          setCurrentView(activeTab === 'counter' ? 'counter' : 'admin');
        } else {
          setCurrentView('counter');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro inesperado ao realizar login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await resetStaffPassword(recoveryEmail);
      if (!res.success) {
        setErrorMessage(res.error || 'Falha ao solicitar recuperação.');
      } else {
        setSuccessMessage(res.message || 'Link de recuperação enviado com sucesso para o seu e-mail!');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao processar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center px-4 py-8 font-sans">
      
      {/* Container Central */}
      <div className="w-full max-w-md">
        
        {/* Topo / Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-1 mb-3">
            {storeSettings?.logoUrl ? (
              <img
                src={storeSettings.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-slate-950 stroke-[2.5]" />
              </div>
            )}
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight">
            {storeSettings?.restaurantName || 'SDG Delivery'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Portal de Acesso Restrito da Equipe
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
          
          {/* Luz sutil de destaque no topo */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300 ${
            activeTab === 'admin'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : activeTab === 'counter'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`} />

          {/* Seletor de Perfil: Balcão vs Admin vs Motoboy */}
          {authMode === 'login' && (
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => handleTabChange('counter')}
                className={`flex flex-col sm:flex-row items-center justify-center space-x-0 sm:space-x-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'counter'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Balcão</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`flex flex-col sm:flex-row items-center justify-center space-x-0 sm:space-x-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('motoboy')}
                className={`flex flex-col sm:flex-row items-center justify-center space-x-0 sm:space-x-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'motoboy'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Motoboy</span>
              </button>
            </div>
          )}

          {/* Descrição do Nível de Acesso Selecionado */}
          {authMode === 'login' && (
            <div className="mb-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2.5">
              {activeTab === 'counter' && (
                <>
                  <Monitor className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-400 block text-[11px] uppercase tracking-wider">
                      Acesso Balcão & Cozinha
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      Lançamento de pedidos, mesas, recebimentos, fechamento de caixa e monitor da Cozinha (KDS). Sem acesso ao painel de Admin.
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'admin' && (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-400 block text-[11px] uppercase tracking-wider">
                      Acesso Administrador (Root)
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      Acesso irrestrito a tudo: Painel de Administração, Relatórios Financeiros, DRE, Cardápio, Balcão, Cozinha e Motoboys.
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'motoboy' && (
                <>
                  <Bike className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-400 block text-[11px] uppercase tracking-wider">
                      Acesso Exclusivo Motoboy
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      Acesso estritamente às entregas em rota, rastreamento GPS em tempo real e confirmações.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Alerta de Bloqueio por Força Bruta (Rate Limit Ativo) */}
          {lockoutSeconds > 0 && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs space-y-2 shadow-lg animate-pulse">
              <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-sm">
                <Lock className="w-4 h-4" />
                <span>Bloqueio de Segurança Ativo</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Detectadas múltiplas tentativas inválidas consecutivas. Para proteger o sistema contra ataques de força bruta, este dispositivo foi temporariamente bloqueado.
              </p>
              <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-rose-500/30 flex items-center justify-between font-mono font-bold text-rose-300">
                <span>Liberando acesso em:</span>
                <span className="text-sm text-amber-400 font-black">
                  {Math.floor(lockoutSeconds / 60)}:{(lockoutSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          {/* Mensagens de Feedback */}
          {errorMessage && !lockoutSeconds && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* 1. MODO: LOGIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Alternância Senha vs PIN */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span>{usePinMode ? 'Entrar com PIN' : 'Entrar com Senha'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsePinMode(!usePinMode);
                    setErrorMessage('');
                  }}
                  className="text-amber-400 hover:underline font-bold text-[11px]"
                >
                  {usePinMode ? 'Usar Senha' : 'Usar PIN Rápido'}
                </button>
              </div>

              {/* Campo de Identificador (Usuário ou E-mail) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={activeTab === 'admin' ? 'ex: admin ou seu@email.com' : 'ex: motoboy ou seu@email.com'}
                    autoCapitalize="none"
                    autoComplete="username"
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {!usePinMode ? (
                /* Campo de Senha */
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                /* Campo de PIN Rápido */
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    PIN Numérico
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 1234"
                      autoFocus
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* Botão de Entrar */}
              <button
                type="submit"
                disabled={isSubmitting || lockoutSeconds > 0}
                className={`w-full py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-xl ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : lockoutSeconds > 0 ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Acesso Bloqueado ({lockoutSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no {activeTab === 'admin' ? 'Balcão / Gestor' : 'App do Motoboy'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. MODO: RECUPERAÇÃO DE SENHA */}
          {authMode === 'recovery' && (
            <form onSubmit={handleRecovery} className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Recuperação de Senha
                </span>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Informe o seu e-mail cadastrado para receber as instruções de redefinição de senha.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Seu E-mail Cadastrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="ex: seu@email.com"
                    autoCapitalize="none"
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar Link de Recuperação</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Rodapé: Apenas Login e Recuperação de Senha */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Cadastros novos gerenciados no Balcão</span>
            </div>

            {authMode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('recovery');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-slate-400 hover:text-white hover:underline text-[11px]"
              >
                Esqueceu a senha?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-amber-400 hover:underline font-bold text-[11px] flex items-center space-x-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Voltar ao Login</span>
              </button>
            )}
          </div>

        </div>

        {/* Botão de Retorno ao Cardápio */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else setCurrentView('client');
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Cardápio do Cliente</span>
          </button>
        </div>

      </div>
    </div>
  );
};
