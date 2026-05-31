import { useState, useEffect, useRef } from 'react';
import { Mail, Cpu, Terminal, CheckCircle, Wifi, RefreshCw, Globe } from 'lucide-react';
import { AgentConfig, SystemStatus, MailLog, ConsoleLog, AIProvider } from '../shared/types';

const translations = {
  en: {
    title: 'luxmail.agent',
    subtitle: 'v1.0.0 // LOCAL ONLY',
    status: 'Status',
    settings: 'Settings',
    imapMailbox: 'IMAP MAILBOX',
    hostPort: 'Host / Port',
    emailAddress: 'Email Address',
    appPassword: 'App Password',
    aiEngine: 'AI ENGINE',
    provider: 'Provider',
    apiKey: 'API Key',
    whatsappAlerting: 'WhatsApp Alerting',
    whatsappAlertingSub: 'Forwards priority emails',
    applyBtn: 'Apply & Start Agent',
    applyingBtn: 'Applying...',
    whatsappConsole: 'WHATSAPP CONSOLE',
    connected: 'CONNECTED',
    disconnected: 'DISCONNECTED',
    scanQr: 'SCAN WITH WHATSAPP',
    waitingEngine: 'Waiting for engine start',
    systemLinked: 'System Linked',
    waInfo: 'Headless browser automation simulates a web client locally. Scan once, and your agent will run continuously.',
    telemetry: 'System Telemetry',
    memoryUsage: 'MEMORY USAGE',
    pollInterval: 'POLL INTERVAL',
    alertsForwarded: 'ALERTS FORWARDED',
    trackerTitle: 'CLASSIFIED INBOX TRACKER',
    trackerSub: 'SHOWING RECENT POLLED EMAILS',
    inboxSecureTitle: 'Inbox Fully Secure',
    inboxSecureSub: 'No matching priority emails detected. The agent will process new unread emails as they hit the server.',
    forwardedToWa: 'FORWARDED TO WA',
    noAlertsSent: 'NO ALERTS SENT',
    localConsole: 'LOCAL SYSTEM CONSOLE',
    realTimeStream: 'REAL-TIME DATASTREAM',
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
    imapBadge: 'IMAP',
    waBadge: 'WA',
    aiBadge: 'AI',
    loading: 'Loading configuration...',
  },
  es: {
    title: 'luxmail.agent',
    subtitle: 'v1.0.0 // LOCAL',
    status: 'Estado',
    settings: 'Ajustes',
    imapMailbox: 'BUZÓN IMAP',
    hostPort: 'Host / Puerto',
    emailAddress: 'Correo Electrónico',
    appPassword: 'Contraseña de Aplicación',
    aiEngine: 'MOTOR DE IA',
    provider: 'Proveedor',
    apiKey: 'Llave de API',
    whatsappAlerting: 'Alertas de WhatsApp',
    whatsappAlertingSub: 'Reenvía correos prioritarios',
    applyBtn: 'Aplicar y Arrancar Agente',
    applyingBtn: 'Aplicando...',
    whatsappConsole: 'CONSOLA DE WHATSAPP',
    connected: 'CONECTADO',
    disconnected: 'DESCONECTADO',
    scanQr: 'ESCANEA CON WHATSAPP',
    waitingEngine: 'Esperando inicio del motor',
    systemLinked: 'Sistema Vinculado',
    waInfo: 'La automatización web local simula un cliente en tu máquina. Escanea una vez y el agente funcionará 24/7.',
    telemetry: 'Telemetría del Sistema',
    memoryUsage: 'USO DE MEMORIA',
    pollInterval: 'INTERVALO DE ESCANEO',
    alertsForwarded: 'ALERTAS REENVIADAS',
    trackerTitle: 'SEGUIMIENTO DE CORREOS CLASIFICADOS',
    trackerSub: 'MOSTRANDO CORREOS RECIENTES DETECTADOS',
    inboxSecureTitle: 'Bandeja de Entrada Segura',
    inboxSecureSub: 'No se detectaron correos prioritarios. El agente procesará correos nuevos tan pronto como lleguen.',
    forwardedToWa: 'REENVIADO A WA',
    noAlertsSent: 'SIN ALERTAS',
    localConsole: 'CONSOLA LOCAL DEL SISTEMA',
    realTimeStream: 'FLUJO DE DATOS EN TIEMPO REAL',
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
    imapBadge: 'IMAP',
    waBadge: 'WA',
    aiBadge: 'IA',
    loading: 'Cargando configuración...',
  }
};

export default function App() {
  // Configuration State
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [aiKey, setAiKey] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedCheck, setShowSavedCheck] = useState(false);
  
  // System & Connection State
  const [status, setStatus] = useState<SystemStatus>({
    imapConnected: false,
    whatsappConnected: false,
    aiConnected: false,
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<ConsoleLog[]>([
    { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'LuxMail Agent dashboard launched.' }
  ]);
  const [emails, setEmails] = useState<MailLog[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'settings'>('status');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-resolve API and WS URLs for development and production containers
  const isDevPort = window.location.port === '5172' || window.location.port === '5173';
  const apiBase = isDevPort ? 'http://localhost:3000' : '';
  const wsHost = isDevPort ? 'localhost:3000' : window.location.host;

  const t = (key: keyof typeof translations.en) => translations[language][key];

  const translateCategory = (cat: string) => {
    if (language !== 'es') return cat;
    const mapping: Record<string, string> = {
      'Interview': 'Entrevista',
      'Job Offer': 'Oferta de Trabajo',
      'Reject': 'Rechazo',
      'Spam': 'Spam',
      'General': 'General'
    };
    return mapping[cat] || cat;
  };

  const translateUrgency = (urg: string) => {
    if (language !== 'es') return urg;
    const mapping: Record<string, string> = {
      'low': 'baja',
      'medium': 'media',
      'high': 'alta'
    };
    return mapping[urg] || urg;
  };

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Synchronize status, logs, and new emails via WebSockets
  useEffect(() => {
    addLog('info', 'Connecting to backend daemon...');

    // Fetch saved configuration
    fetch(`${apiBase}/api/config`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Config not found');
      })
      .then((data: AgentConfig) => {
        if (data.imap) {
          setImapHost(data.imap.host);
          setImapPort(data.imap.port);
          setImapUser(data.imap.user);
          setImapPass(data.imap.passwordHex);
        }
        if (data.ai) {
          setAiProvider(data.ai.provider);
          setAiKey(data.ai.apiKeyHex);
        }
        setWhatsappEnabled(data.whatsappEnabled);
        if (data.language) {
          setLanguage(data.language);
        }
        addLog('success', 'Loaded configuration from backend daemon storage.');
      })
      .catch(() => {
        addLog('info', 'No pre-existing configuration loaded. Ready for first-time setup.');
      });

    // Fetch initial logs history
    fetch(`${apiBase}/api/logs`)
      .then(res => res.json())
      .then(data => {
        if (data.emails) setEmails(data.emails);
        if (data.console) setLogs(prev => [...prev, ...data.console]);
      })
      .catch(_err => addLog('error', 'Failed to retrieve logs history. Daemon offline.'));

    // Setup Websocket
    const socket = new WebSocket(`ws://${wsHost}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status') {
          setStatus(data.status);
        } else if (data.type === 'qr') {
          setQrCode(data.qr);
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, data.log]);
        } else if (data.type === 'email') {
          setEmails(prev => [data.email, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onopen = () => {
      addLog('success', 'Connected to local Agent daemon via WebSocket.');
    };

    socket.onclose = () => {
      addLog('error', 'Disconnected from local Agent daemon. Reconnecting in 5s...');
      setStatus({ imapConnected: false, whatsappConnected: false, aiConnected: false });
    };

    return () => {
      socket.close();
    };
  }, []);

  const addLog = (level: ConsoleLog['level'], message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    }]);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    addLog('info', 'Applying configuration updates...');

    const configPayload: AgentConfig = {
      imap: {
        host: imapHost,
        port: imapPort,
        user: imapUser,
        passwordHex: imapPass,
        secure: true,
      },
      ai: {
        provider: aiProvider,
        apiKeyHex: aiKey,
      },
      whatsappEnabled,
      telegramEnabled: false,
      urgencyThreshold: 'medium',
      language,
    };

    try {
      const response = await fetch(`${apiBase}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      const result = await response.json();
      if (result.success) {
        addConsoleLog('success', language === 'es' ? 'Configuración guardada e iniciada.' : 'Configuration updated successfully.');
        setShowSavedCheck(true);
        setTimeout(() => setShowSavedCheck(false), 2000);
      } else {
        addConsoleLog('error', language === 'es' ? 'El daemon rechazó la configuración.' : 'Configuration rejected by daemon.');
      }
    } catch (err) {
      addConsoleLog('error', `Failed to deliver configuration: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addConsoleLog = (level: ConsoleLog['level'], message: string) => {
    addLog(level, message);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-white font-sans overflow-hidden">
      {/* 1. Header (Apple-like Navigation) */}
      <header className="h-auto md:h-16 py-4 md:py-0 shrink-0 border-b border-card-border px-6 flex flex-col md:flex-row justify-between items-center bg-[rgba(3,3,5,0.8)] backdrop-blur-md z-20 gap-3 md:gap-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-purple to-accent-amber flex items-center justify-center font-bold text-xs select-none text-black">
            LM
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-sm font-bold tracking-tight select-none">{t('title')}<span className="text-accent-amber">.</span></h1>
            <p className="text-[10px] text-muted tracking-wider select-none uppercase">{t('subtitle')}</p>
          </div>
        </div>

        {/* Global Connection Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.imapConnected ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.imapConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[10px] font-mono text-muted select-none uppercase">{t('imapBadge')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.whatsappConnected ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.whatsappConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[10px] font-mono text-muted select-none uppercase">{t('waBadge')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.aiConnected ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.aiConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[10px] font-mono text-muted select-none uppercase">{t('aiBadge')}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Side Pane: Navigation & Configurations */}
        <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-card-border bg-[#050508] p-5 flex flex-col gap-4 overflow-y-visible md:overflow-y-auto">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-card-border">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === 'status' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-sm' : 'text-muted hover:text-white'}`}
            >
              {t('status')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === 'settings' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-sm' : 'text-muted hover:text-white'}`}
            >
              {t('settings')}
            </button>
          </div>

          {activeTab === 'settings' ? (
            <div className="flex flex-col gap-4">
              {/* Language Selector */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-amber select-none">
                  <Globe size={14} />
                  <span>{t('language').toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as 'en' | 'es')}
                    className="bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-amber"
                  >
                    <option value="en" className="bg-card">{t('english')}</option>
                    <option value="es" className="bg-card">{t('spanish')}</option>
                  </select>
                </div>
              </div>

              {/* IMAP Config Form */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col gap-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-purple select-none">
                  <Mail size={14} />
                  <span>{t('imapMailbox')}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono tracking-widest text-muted uppercase">{t('hostPort')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imapHost}
                      onChange={e => setImapHost(e.target.value)}
                      className="flex-1 bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-purple"
                    />
                    <input
                      type="number"
                      value={imapPort}
                      onChange={e => setImapPort(Number(e.target.value))}
                      className="w-16 bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-accent-purple"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-muted uppercase">{t('emailAddress')}</label>
                  <input
                    type="email"
                    value={imapUser}
                    onChange={e => setImapUser(e.target.value)}
                    placeholder="user@gmail.com"
                    className="bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-muted uppercase">{t('appPassword')}</label>
                  <input
                    type="password"
                    value={imapPass}
                    onChange={e => setImapPass(e.target.value)}
                    placeholder="•••• •••• •••• ••••"
                    className="bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              {/* AI Config Form */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col gap-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-amber select-none">
                  <Cpu size={14} />
                  <span>{t('aiEngine')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-muted uppercase">{t('provider')}</label>
                  <select
                    value={aiProvider}
                    onChange={e => setAiProvider(e.target.value as AIProvider)}
                    className="bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent-amber"
                  >
                    <option value="gemini" className="bg-card">Google Gemini (Recommended)</option>
                    <option value="deepseek" className="bg-card">DeepSeek API</option>
                    <option value="openai" className="bg-card">OpenAI GPT</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-muted uppercase">{t('apiKey')}</label>
                  <input
                    type="password"
                    value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder="sk-••••••••••••••••"
                    className="bg-[rgba(255,255,255,0.02)] border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-amber"
                  />
                </div>
              </div>

              {/* WhatsApp Activation Toggle */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-bold select-none text-emerald-400">{t('whatsappAlerting')}</span>
                  <span className="text-[9px] text-muted">{t('whatsappAlertingSub')}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={() => setWhatsappEnabled(!whatsappEnabled)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Save Config Button */}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all select-none disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  showSavedCheck 
                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/20' 
                    : 'bg-foreground text-background hover:bg-neutral-200'
                }`}
              >
                {isSaving && <RefreshCw size={12} className="animate-spin" />}
                {showSavedCheck && <CheckCircle size={12} className="text-white" />}
                {isSaving 
                  ? t('applyingBtn') 
                  : showSavedCheck 
                    ? (language === 'es' ? '¡Guardado!' : 'Saved!') 
                    : t('applyBtn')
                }
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* WhatsApp QR Panel */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col items-center justify-center text-center gap-3.5">
                <div className="w-full flex items-center justify-between text-xs font-bold text-emerald-400 select-none">
                  <span>{t('whatsappConsole')}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${status.whatsappConnected ? 'bg-[rgba(16,185,129,0.1)] text-emerald-400 border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.1)] text-accent-cherry border-[rgba(239,68,68,0.2)]'}`}>
                    {status.whatsappConnected ? t('connected') : t('disconnected')}
                  </span>
                </div>

                {qrCode ? (
                  <div className="bg-white p-3.5 rounded-xl flex items-center justify-center shadow-lg my-1 select-none">
                    {/* Simulated visual QR box */}
                    <div className="h-40 w-40 bg-zinc-100 border border-zinc-200 flex flex-col items-center justify-center p-2 rounded-lg gap-2 text-black">
                      <span className="font-bold text-xs tracking-tighter text-center">{t('scanQr')}</span>
                      <div className="h-24 w-24 border-4 border-black border-dashed flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-zinc-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 w-full rounded-xl bg-[rgba(255,255,255,0.01)] border border-dashed border-card-border flex flex-col items-center justify-center text-center p-4">
                    {status.whatsappConnected ? (
                      <>
                        <CheckCircle size={24} className="text-emerald-500 mb-2" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{t('systemLinked')}</span>
                      </>
                    ) : (
                      <>
                        <Wifi size={24} className="text-muted mb-2 animate-pulse" />
                        <span className="text-[10px] font-bold text-muted uppercase">{t('waitingEngine')}</span>
                      </>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-muted leading-relaxed">
                  {t('waInfo')}
                </p>
              </div>

              {/* Running Status Metadata */}
              <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col gap-2.5 text-xs">
                <div className="font-bold text-[10px] tracking-widest text-muted uppercase select-none">{t('telemetry')}</div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-muted">{t('memoryUsage')}</span>
                  <span className="font-bold text-white">48.2 MB</span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-muted">{t('pollInterval')}</span>
                  <span className="font-bold text-accent-purple">60 SECONDS</span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-muted">{t('alertsForwarded')}</span>
                  <span className="font-bold text-accent-amber">{emails.filter(e => e.notified).length} MSG</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Pane: Console & Extracted Emails */}
        <div className="flex-1 flex flex-col overflow-y-visible md:overflow-hidden bg-background p-4 md:p-5 gap-4">
          {/* Main Dashboard view */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-visible md:overflow-hidden">
            {/* Top Widget: Parsed Emails Log Grid */}
            <div className="flex-1 min-h-[350px] md:min-h-0 border border-card-border rounded-2xl bg-card overflow-hidden flex flex-col">
              <div className="px-4 py-3.5 border-b border-card-border flex justify-between items-center bg-[rgba(255,255,255,0.01)]">
                <div className="flex items-center gap-2 text-xs font-bold text-white select-none">
                  <Mail size={14} className="text-accent-purple" />
                  <span>{t('trackerTitle')}</span>
                </div>
                <span className="text-[9px] font-mono text-muted uppercase">{t('trackerSub')}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {emails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                    <CheckCircle size={28} className="text-emerald-500/70 mb-2.5" />
                    <h3 className="text-xs font-bold tracking-tight text-white mb-0.5">{t('inboxSecureTitle')}</h3>
                    <p className="text-[10px] text-muted max-w-[280px] leading-relaxed">
                      {t('inboxSecureSub')}
                    </p>
                  </div>
                ) : (
                  emails.map(email => (
                    <div
                      key={email.id}
                      className={`p-3.5 rounded-xl border ${email.urgency === 'high' ? 'border-[rgba(226,62,62,0.2)] bg-[rgba(226,62,62,0.02)]' : 'border-card-border bg-[rgba(255,255,255,0.01)]'} flex flex-col gap-2 transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${email.urgency === 'high' ? 'bg-[rgba(226,62,62,0.15)] text-accent-cherry border border-[rgba(226,62,62,0.2)]' : 'bg-neutral-800 text-muted'}`}>
                            {translateCategory(email.category)}
                          </span>
                          <span className="text-[10px] text-muted font-mono">{email.timestamp}</span>
                        </div>
                        {email.notified ? (
                          <span className="text-[9px] text-emerald-400 font-bold bg-[rgba(16,185,129,0.1)] px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                            {t('forwardedToWa')}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-500 font-medium bg-zinc-900 px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                            {t('noAlertsSent')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-xs font-bold text-white">{email.subject}</h4>
                        <p className="text-[10px] text-muted font-mono select-all">FROM: {email.sender}</p>
                      </div>
                      <p className="text-[10px] leading-relaxed text-muted bg-[rgba(0,0,0,0.2)] p-2 rounded border border-card-border select-text">
                        {email.summary}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Widget: Live Output Console */}
            <div className="h-[200px] shrink-0 border border-card-border rounded-2xl bg-black overflow-hidden flex flex-col font-mono">
              <div className="px-4 py-2 border-b border-card-border flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted select-none">
                  <Terminal size={12} />
                  <span>{t('localConsole')}</span>
                </div>
                <span className="text-[8px] tracking-widest text-muted uppercase">{t('realTimeStream')}</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1.5 text-[10px] leading-relaxed">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-muted shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`shrink-0 select-none ${log.level === 'error' ? 'text-accent-cherry font-bold' : log.level === 'warn' ? 'text-accent-amber font-bold' : log.level === 'success' ? 'text-emerald-400 font-bold' : 'text-sky-400'}`}>
                      {log.level.toUpperCase()}:
                    </span>
                    <span className="text-neutral-300 select-text">{log.message}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
