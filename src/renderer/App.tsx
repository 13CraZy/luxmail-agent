import { useState, useEffect, useRef } from 'react';
import { Mail, Cpu, Terminal, CheckCircle, Wifi, RefreshCw, Globe, ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';
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
    imapPresetLabel: 'IMAP Provider Preset',
    presetGmail: 'Gmail Preset',
    presetOutlook: 'Outlook Preset',
    presetCustom: 'Custom / Manual',
    appPasswordGuideBtn: 'Gmail App Password Guide',
    guideTitle: 'Gmail App Password Setup',
    guideStep1: '1. Go to your Google Account (myaccount.google.com).',
    guideStep2: '2. Enable 2-Step Verification in the Security tab.',
    guideStep3: '3. Search for "App passwords" in the search bar.',
    guideStep4: '4. Generate a code named "LuxMail" and copy the 16 characters.',
    guideStep5: '5. Paste the 16 characters into the App Password input below.',
    guideClose: 'Got it',
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
    waLogoutBtn: 'Disconnect WhatsApp Session',
    waLoggingOut: 'Disconnecting...',
    chatTab: 'AI Assistant',
    inboxTab: 'Inbox Tracker',
    chatTitle: 'LUXMAIL AI ASSISTANT',
    chatSub: 'ZERO-TRUST EMAIL CHATBOT',
    chatPlaceholder: 'Ask about your emails (e.g., "emails from Alan yesterday")...',
    chatSend: 'Send',
    chatWarningOffline: 'AI Engine or IMAP connection is offline. Connect them in Settings first.',
    aiModelLabel: 'AI Model',
    aiModelPlaceholder: 'gemini-2.5-flash, gemini-2.5-pro, gpt-4o, etc.',
    ollamaEndpointLabel: 'Ollama Endpoint',
    notificationRulesLabel: 'Notification Rules (Natural Language)',
    notificationRulesPlaceholder: 'e.g., Only alert me if the email is about interviews, job offers, or urgent messages from Alan.',
    notificationPhoneLabel: 'WhatsApp Phone Number',
    notificationPhonePlaceholder: 'e.g., +526461234567',
    dndLabel: 'Do Not Disturb (DND)',
    dndSub: 'Silent hours to pause WhatsApp alerts',
    dndStartLabel: 'Start Time',
    dndEndLabel: 'End Time',
    dndPresetLabel: 'DND Presets',
    dndPresetNight: 'Night (22:00 - 08:00)',
    dndPresetWork: 'Work (09:00 - 17:00)',
    dndPresetNone: 'Custom',
    quickActions: 'Quick Search Suggestions',
    quickSearchToday: "Search today's emails",
    quickSearchInterview: "Search interview calls this week",
    quickSearchFromAlan: "Search emails from Alan",
    priorityCategoriesLabel: 'Priority Categories',
    priorityCategoriesSub: 'Select which categories trigger WhatsApp alerts',
    catInterview: 'Interviews',
    catJobOffer: 'Job Offers',
    catReject: 'Rejections',
    catSpam: 'Spam',
    catGeneral: 'General',
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
    imapPresetLabel: 'Preajuste de Proveedor',
    presetGmail: 'Preajuste Gmail',
    presetOutlook: 'Preajuste Outlook',
    presetCustom: 'Personalizado / Manual',
    appPasswordGuideBtn: 'Guía de Contraseña de Gmail',
    guideTitle: 'Configurar Contraseña de Gmail',
    guideStep1: '1. Ve a tu Cuenta de Google (myaccount.google.com).',
    guideStep2: '2. Activa la Verificación en 2 Pasos en la pestaña de Seguridad.',
    guideStep3: '3. Busca "Contraseñas de aplicaciones" en el buscador superior.',
    guideStep4: '4. Crea una contraseña llamada "LuxMail" y copia los 16 caracteres.',
    guideStep5: '5. Pega los 16 caracteres en el campo de contraseña abajo.',
    guideClose: 'Entendido',
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
    waLogoutBtn: 'Desvincular Sesión WhatsApp',
    waLoggingOut: 'Desvinculando...',
    chatTab: 'Asistente de IA',
    inboxTab: 'Buzón Clasificado',
    chatTitle: 'ASISTENTE DE IA LUXMAIL',
    chatSub: 'CHATBOT DE CORREO ZERO-TRUST',
    chatPlaceholder: 'Pregunta sobre tus correos (ej. "correos de Alan de ayer")...',
    chatSend: 'Enviar',
    chatWarningOffline: 'El motor de IA o la conexión IMAP están fuera de línea. Conéctalos en Ajustes primero.',
    aiModelLabel: 'Modelo de IA',
    aiModelPlaceholder: 'gemini-2.5-flash, gemini-2.5-pro, gpt-4o, etc.',
    ollamaEndpointLabel: 'Endpoint de Ollama',
    notificationRulesLabel: 'Reglas de Notificación (Lenguaje Natural)',
    notificationRulesPlaceholder: 'ej. Solo avísame si el correo es sobre entrevistas, ofertas de trabajo o mensajes urgentes de Alan.',
    notificationPhoneLabel: 'Número de WhatsApp',
    notificationPhonePlaceholder: 'ej. +526461234567',
    dndLabel: 'No Molestar (DND)',
    dndSub: 'Horario de silencio para pausar alertas de WhatsApp',
    dndStartLabel: 'Hora de Inicio',
    dndEndLabel: 'Hora de Fin',
    dndPresetLabel: 'Preajustes DND',
    dndPresetNight: 'Noche (22:00 - 08:00)',
    dndPresetWork: 'Trabajo (09:00 - 17:00)',
    dndPresetNone: 'Personalizado',
    quickActions: 'Sugerencias de Búsqueda Rápida',
    quickSearchToday: "Buscar correos de hoy",
    quickSearchInterview: "Buscar entrevistas de esta semana",
    quickSearchFromAlan: "Buscar correos de Alan",
    priorityCategoriesLabel: 'Categorías Prioritarias',
    priorityCategoriesSub: 'Selecciona qué categorías activan alertas de WhatsApp',
    catInterview: 'Entrevistas',
    catJobOffer: 'Ofertas',
    catReject: 'Rechazos',
    catSpam: 'Spam',
    catGeneral: 'General',
  }
};

export default function App() {
  // Configuration State
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [imapPreset, setImapPreset] = useState<'gmail' | 'outlook' | 'custom'>('custom');
  const [showAppPasswordGuide, setShowAppPasswordGuide] = useState(false);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [notificationRules, setNotificationRules] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [dndPreset, setDndPreset] = useState<'night' | 'work' | 'custom'>('night');
  const [priorityCategories, setPriorityCategories] = useState<string[]>(['Interview', 'Job Offer']);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedCheck, setShowSavedCheck] = useState(false);
  const [isLoggingOutWa, setIsLoggingOutWa] = useState(false);
  
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
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [emails, setEmails] = useState<MailLog[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'settings'>('status');

  // Splash screen state
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const splashStartTime = useRef(Date.now());

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [rightTab, setRightTab] = useState<'inbox' | 'chat'>('inbox');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'agent'; text: string; timestamp: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat greeting on language change
  useEffect(() => {
    if (chatMessages.length === 0 || (chatMessages.length === 1 && chatMessages[0].sender === 'agent')) {
      setChatMessages([
        {
          sender: 'agent',
          text: language === 'es' 
            ? 'Hola. Soy tu Asistente de IA. Puedo buscar y analizar los correos de tu buzón IMAP local de forma privada. ¿En qué correo en específico te gustaría que me enfoque hoy?' 
            : 'Hello. I am your AI Assistant. I can search and analyze emails from your local IMAP mailbox privately. Which specific email would you like me to check today?',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, [language]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
          if (data.imap.host === 'imap.gmail.com') {
            setImapPreset('gmail');
          } else if (data.imap.host === 'outlook.office365.com') {
            setImapPreset('outlook');
          } else {
            setImapPreset('custom');
          }
        }
        if (data.ai) {
          setAiProvider(data.ai.provider);
          setAiKey(data.ai.apiKeyHex);
          setAiModel(data.ai.modelName || '');
          if (data.ai.ollamaEndpoint) {
            setOllamaEndpoint(data.ai.ollamaEndpoint);
          }
        }
        setWhatsappEnabled(data.whatsappEnabled);
        if (data.language) {
          setLanguage(data.language);
        }
        setNotificationRules(data.notificationRules || '');
        setNotificationPhone(data.notificationPhone || '');
        setDndEnabled(data.dndEnabled || false);
        if (data.dndStart) setDndStart(data.dndStart);
        if (data.dndEnd) setDndEnd(data.dndEnd);
        if (data.dndStart === '22:00' && data.dndEnd === '08:00') {
          setDndPreset('night');
        } else if (data.dndStart === '09:00' && data.dndEnd === '17:00') {
          setDndPreset('work');
        } else {
          setDndPreset('custom');
        }
        if (data.priorityCategories) {
          setPriorityCategories(data.priorityCategories);
        } else {
          setPriorityCategories(['Interview', 'Job Offer']);
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
        } else if (data.type === 'clear') {
          setEmails([]);
          setLogs([]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onopen = () => {
      addLog('success', 'Connected to local Agent daemon via WebSocket.');
      // Dismiss splash after a minimum 1.8s display for premium feel
      const elapsed = Date.now() - splashStartTime.current;
      const minSplashMs = 1800;
      const remaining = Math.max(0, minSplashMs - elapsed);
      setTimeout(() => setIsAppReady(true), remaining);
    };

    socket.onclose = () => {
      addLog('error', 'Disconnected from local Agent daemon. Reconnecting in 5s...');
      setStatus({ imapConnected: false, whatsappConnected: false, aiConnected: false });
    };

    return () => {
      socket.close();
    };
  }, []);

  // Handle splash exit animation lifecycle
  useEffect(() => {
    if (isAppReady && !isSplashExiting) {
      setIsSplashExiting(true);
      // Remove splash from DOM after exit animation (600ms)
      const timer = setTimeout(() => setIsSplashVisible(false), 650);
      return () => clearTimeout(timer);
    }
  }, [isAppReady]);

  const addLog = (level: ConsoleLog['level'], message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    }]);
  };

  const addConsoleLog = (level: ConsoleLog['level'], message: string) => {
    addLog(level, message);
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
        modelName: aiModel.trim() || undefined,
        ollamaEndpoint: ollamaEndpoint.trim() || undefined,
      },
      whatsappEnabled,
      telegramEnabled: false,
      urgencyThreshold: 'medium',
      language,
      notificationRules: notificationRules.trim() || undefined,
      notificationPhone: notificationPhone.trim() || undefined,
      dndEnabled,
      dndStart: dndEnabled ? dndStart : undefined,
      dndEnd: dndEnabled ? dndEnd : undefined,
      priorityCategories,
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

  const handleLogoutWhatsapp = async () => {
    if (isLoggingOutWa) return;
    setIsLoggingOutWa(true);
    addLog('info', language === 'es' ? 'Desvinculando WhatsApp y eliminando sesión...' : 'Unlinking WhatsApp and clearing session files...');
    try {
      const response = await fetch(`${apiBase}/api/whatsapp/logout`, {
        method: 'POST',
      });
      if (response.ok) {
        addLog('success', language === 'es' ? 'Sesión de WhatsApp cerrada exitosamente.' : 'WhatsApp session logged out and cleared.');
        setQrCode(null);
      } else {
        const data = await response.json();
        addLog('error', `Failed to log out: ${data.error}`);
      }
    } catch (err) {
      addLog('error', `Network error during WhatsApp logout: ${(err as Error).message}`);
    } finally {
      setIsLoggingOutWa(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${apiBase}/api/logs/clear`, {
        method: 'POST',
      });
      if (response.ok) {
        setLogs([]);
      } else {
        addLog('error', 'Failed to clear logs on server.');
      }
    } catch (err) {
      addLog('error', `Failed to contact daemon: ${(err as Error).message}`);
    }
  };

  const handleSendChatMessage = async (overrideMessage?: string) => {
    const textToSend = overrideMessage || chatInput;
    if (!textToSend.trim() || isChatSending) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!overrideMessage) setChatInput('');
    setIsChatSending(true);

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await response.json();

      if (response.ok) {
        setChatMessages(prev => [...prev, {
          sender: 'agent',
          text: data.response,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          sender: 'agent',
          text: data.error || (language === 'es' ? 'Ocurrió un error inesperado al procesar tu solicitud.' : 'An unexpected error occurred while processing your request.'),
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text: (language === 'es' ? 'Error de red: no se pudo contactar con el daemon.' : 'Network error: could not contact the daemon.') + ` (${(err as Error).message})`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleOpenEmail = async (email: MailLog) => {
    const match = email.sender.match(/<([^>]+)>/);
    const emailAddr = match ? match[1] : email.sender;
    
    let url = '';
    const hostLower = imapHost.toLowerCase();
    const userLower = imapUser.toLowerCase();
    
    const isGmail = hostLower.includes('gmail') || userLower.endsWith('@gmail.com');
    const isOutlook = hostLower.includes('outlook') || hostLower.includes('office365') || hostLower.includes('hotmail') || 
                      userLower.endsWith('@outlook.com') || userLower.endsWith('@hotmail.com') || userLower.endsWith('@live.com');
    
    if (isGmail) {
      url = `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(emailAddr)}+subject%3A%22${encodeURIComponent(email.subject)}%22`;
    } else if (isOutlook) {
      url = `https://outlook.live.com/mail/0/deeplink/search?q=from:${encodeURIComponent(emailAddr)}+subject:%22${encodeURIComponent(email.subject)}%22`;
    } else {
      url = `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(emailAddr)}+subject%3A%22${encodeURIComponent(email.subject)}%22`;
    }

    try {
      await fetch(`${apiBase}/api/open-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.error('Error opening email in browser:', err);
    }
  };

  const isConfigValid = 
    imapHost.trim() !== '' && 
    imapPort > 0 && 
    imapUser.trim() !== '' && 
    imapPass.trim() !== '' && 
    (aiProvider === 'ollama' ? ollamaEndpoint.trim() !== '' : aiKey.trim() !== '');

  return (
    <>
      {/* ============ PREMIUM SPLASH SCREEN ============ */}
      {isSplashVisible && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background ${isSplashExiting ? 'splash-exit' : ''}`}>
          {/* Orbital spinner ring */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Outer rotating ring */}
            <div className="absolute w-24 h-24 rounded-full splash-orbit-ring" style={{
              border: '2px solid transparent',
              borderTopColor: 'rgba(168, 85, 247, 0.6)',
              borderRightColor: 'rgba(245, 158, 11, 0.3)',
            }} />
            {/* Inner counter-rotating ring */}
            <div className="absolute w-16 h-16 rounded-full" style={{
              border: '1.5px solid transparent',
              borderBottomColor: 'rgba(245, 158, 11, 0.5)',
              borderLeftColor: 'rgba(168, 85, 247, 0.2)',
              animation: 'splash-orbit 1.8s linear infinite reverse',
            }} />
            {/* Center logo */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-amber flex items-center justify-center font-bold text-base select-none text-black splash-logo-glow">
              LM
            </div>
          </div>
          {/* Title */}
          <h1 className="text-lg font-bold tracking-tight select-none mb-1">luxmail<span className="text-accent-amber">.</span>agent</h1>
          {/* Subtitle with floating animation */}
          <p className="text-[11px] text-zinc-500 tracking-widest uppercase select-none splash-subtitle">Initializing secure pipeline...</p>
        </div>
      )}

      {/* ============ MAIN APPLICATION ============ */}
    <div className={`h-screen w-screen flex flex-col bg-background text-white font-sans overflow-hidden ${isAppReady ? 'app-reveal' : (isSplashVisible ? 'opacity-0' : '')}`}>
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
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.imapConnected === true ? 'bg-emerald-400' : status.imapConnected === 'reconnecting' ? 'bg-amber-400' : 'bg-rose-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.imapConnected === true ? 'bg-emerald-500' : status.imapConnected === 'reconnecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[10px] font-mono text-muted select-none uppercase">
              {status.imapConnected === 'reconnecting' ? (language === 'es' ? 'IMAP RECONECTANDO' : 'IMAP RECONNECTING') : t('imapBadge')}
            </span>
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
        <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-zinc-900 bg-[#040406] p-5 pb-8 flex flex-col gap-4 overflow-y-auto h-auto md:h-[calc(100vh-4rem)] min-h-0">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-zinc-950 border border-zinc-800/30">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 ${activeTab === 'status' ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              {t('status')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 ${activeTab === 'settings' ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              {t('settings')}
            </button>
          </div>

          {activeTab === 'settings' ? (
            <div className="flex flex-col gap-4 pb-8">
              {/* Language Selector */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3 backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-amber select-none">
                  <Globe size={14} />
                  <span>{t('language').toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as 'en' | 'es')}
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  >
                    <option value="en" className="bg-card">{t('english')}</option>
                    <option value="es" className="bg-card">{t('spanish')}</option>
                  </select>
                </div>
              </div>

              {/* IMAP Config Form */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-purple select-none">
                  <Mail size={14} />
                  <span>{t('imapMailbox')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('imapPresetLabel')}</label>
                  <select
                    value={imapPreset}
                    onChange={e => {
                      const preset = e.target.value as 'gmail' | 'outlook' | 'custom';
                      setImapPreset(preset);
                      if (preset === 'gmail') {
                        setImapHost('imap.gmail.com');
                        setImapPort(993);
                      } else if (preset === 'outlook') {
                        setImapHost('outlook.office365.com');
                        setImapPort(993);
                      }
                    }}
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-purple/80 focus:bg-zinc-950/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  >
                    <option value="gmail" className="bg-card">{t('presetGmail')}</option>
                    <option value="outlook" className="bg-card">{t('presetOutlook')}</option>
                    <option value="custom" className="bg-card">{t('presetCustom')}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('hostPort')}</label>
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={imapHost}
                      onChange={e => {
                        const val = e.target.value;
                        setImapHost(val);
                        if (val === 'imap.gmail.com') setImapPreset('gmail');
                        else if (val === 'outlook.office365.com') setImapPreset('outlook');
                        else setImapPreset('custom');
                      }}
                      className="flex-1 min-w-0 bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-purple/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                    />
                    <input
                      type="number"
                      value={imapPort}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setImapPort(val);
                        if (imapHost === 'imap.gmail.com' && val === 993) setImapPreset('gmail');
                        else if (imapHost === 'outlook.office365.com' && val === 993) setImapPreset('outlook');
                        else setImapPreset('custom');
                      }}
                      className="w-16 shrink-0 bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-purple/80 focus:bg-zinc-950/80 rounded-xl px-2 py-1.5 text-xs text-white text-center focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('emailAddress')}</label>
                  <input
                    type="email"
                    value={imapUser}
                    onChange={e => setImapUser(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-purple/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('appPassword')}</label>
                  <input
                    type="password"
                    value={imapPass}
                    onChange={e => setImapPass(e.target.value)}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-purple/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  />
                  {imapPreset === 'gmail' && (
                    <button
                      type="button"
                      onClick={() => setShowAppPasswordGuide(true)}
                      className="text-left text-[10px] text-accent-purple hover:underline select-none mt-0.5 flex items-center gap-1 active:scale-95 transition-all w-fit"
                    >
                      <span>🔑 {t('appPasswordGuideBtn')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AI Config Form */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-amber select-none">
                  <Cpu size={14} />
                  <span>{t('aiEngine')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('provider')}</label>
                  <select
                    value={aiProvider}
                    onChange={e => setAiProvider(e.target.value as AIProvider)}
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  >
                    <option value="gemini" className="bg-card">Google Gemini (Recommended)</option>
                    <option value="deepseek" className="bg-card">DeepSeek API</option>
                    <option value="openai" className="bg-card">OpenAI GPT</option>
                    <option value="ollama" className="bg-card">Ollama (Local Offline)</option>
                  </select>
                </div>
                {aiProvider === 'ollama' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('ollamaEndpointLabel')}</label>
                    <input
                      type="text"
                      value={ollamaEndpoint}
                      onChange={e => setOllamaEndpoint(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('apiKey')}</label>
                    <input
                      type="password"
                      value={aiKey}
                      onChange={e => setAiKey(e.target.value)}
                      placeholder="sk-••••••••••••••••"
                      className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('aiModelLabel')}</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    placeholder={
                      aiProvider === 'gemini' ? 'gemini-2.5-flash' :
                      aiProvider === 'openai' ? 'gpt-4o-mini' : 
                      aiProvider === 'ollama' ? 'llama3' : 'deepseek-chat'
                    }
                    className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* WhatsApp Activation Toggle & Config */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold select-none text-emerald-400">{t('whatsappAlerting')}</span>
                    <span className="text-[9px] text-zinc-500">{t('whatsappAlertingSub')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={() => setWhatsappEnabled(!whatsappEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {whatsappEnabled && (
                  <div className="flex flex-col gap-3.5 pt-2 border-t border-zinc-800/30">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('notificationPhoneLabel')}</label>
                      <input
                        type="text"
                        value={notificationPhone}
                        onChange={e => setNotificationPhone(e.target.value)}
                        placeholder={t('notificationPhonePlaceholder')}
                        className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-emerald-500/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('notificationRulesLabel')}</label>
                      <textarea
                        value={notificationRules}
                        onChange={e => setNotificationRules(e.target.value)}
                        placeholder={t('notificationRulesPlaceholder')}
                        rows={3}
                        className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-emerald-500/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200 resize-none font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Categories Config Card */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3.5 backdrop-blur-md">
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-bold select-none text-accent-purple">{t('priorityCategoriesLabel')}</span>
                  <span className="text-[9px] text-zinc-500">{t('priorityCategoriesSub')}</span>
                </div>
                <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-800/30">
                  {[
                    { id: 'Interview', label: t('catInterview'), color: 'peer-checked:bg-purple-500' },
                    { id: 'Job Offer', label: t('catJobOffer'), color: 'peer-checked:bg-emerald-500' },
                    { id: 'Reject', label: t('catReject'), color: 'peer-checked:bg-rose-500' },
                    { id: 'Spam', label: t('catSpam'), color: 'peer-checked:bg-amber-500' },
                    { id: 'General', label: t('catGeneral'), color: 'peer-checked:bg-zinc-500' },
                  ].map(cat => {
                    const isChecked = priorityCategories.includes(cat.id);
                    return (
                      <div key={cat.id} className="flex items-center justify-between py-0.5">
                        <span className="text-xs text-neutral-300 font-medium select-none">{cat.label}</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setPriorityCategories(priorityCategories.filter(c => c !== cat.id));
                              } else {
                                setPriorityCategories([...priorityCategories, cat.id]);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-10 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${cat.color}`}></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Do Not Disturb (DND) Config Card */}
              <div className="p-4 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold select-none text-accent-amber">{t('dndLabel')}</span>
                    <span className="text-[9px] text-zinc-500">{t('dndSub')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={dndEnabled}
                      onChange={() => setDndEnabled(!dndEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {dndEnabled && (
                  <div className="flex flex-col gap-3.5 pt-2 border-t border-zinc-800/30">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('dndPresetLabel')}</label>
                      <select
                        value={dndPreset}
                        onChange={e => {
                          const preset = e.target.value as 'night' | 'work' | 'custom';
                          setDndPreset(preset);
                          if (preset === 'night') {
                            setDndStart('22:00');
                            setDndEnd('08:00');
                          } else if (preset === 'work') {
                            setDndStart('09:00');
                            setDndEnd('17:00');
                          }
                        }}
                        className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                      >
                        <option value="night" className="bg-card">{t('dndPresetNight')}</option>
                        <option value="work" className="bg-card">{t('dndPresetWork')}</option>
                        <option value="custom" className="bg-card">{t('dndPresetNone')}</option>
                      </select>
                    </div>

                    <div className="flex gap-3 w-full">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('dndStartLabel')}</label>
                        <input
                          type="time"
                          value={dndStart}
                          onChange={e => {
                            setDndStart(e.target.value);
                            setDndPreset('custom');
                          }}
                          className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase select-none">{t('dndEndLabel')}</label>
                        <input
                          type="time"
                          value={dndEnd}
                          onChange={e => {
                            setDndEnd(e.target.value);
                            setDndPreset('custom');
                          }}
                          className="w-full bg-zinc-900/50 border border-zinc-800/60 focus:border-accent-amber/80 focus:bg-zinc-950/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Config Button */}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving || !isConfigValid}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none flex items-center justify-center gap-1.5 ${
                  !isConfigValid
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800/20'
                    : showSavedCheck 
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/20 active:scale-[0.98]' 
                      : 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98] hover:scale-[1.01]'
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
              <div className="p-4.5 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col items-center justify-center text-center gap-3.5 backdrop-blur-md">
                <div className="w-full flex items-center justify-between text-xs font-bold text-emerald-400 select-none">
                  <span>{t('whatsappConsole')}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${status.whatsappConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-accent-cherry border-rose-500/20'}`}>
                    {status.whatsappConnected ? t('connected') : t('disconnected')}
                  </span>
                </div>

                {qrCode ? (
                  <div className="bg-white p-3.5 rounded-xl flex items-center justify-center shadow-lg my-1 select-none">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=050508&data=${encodeURIComponent(qrCode)}`}
                      alt="WhatsApp Web QR Code"
                      className="h-40 w-40"
                    />
                  </div>
                ) : (
                  <div className="h-44 w-full rounded-xl bg-zinc-900/10 border border-dashed border-zinc-800/50 flex flex-col items-center justify-center text-center p-4">
                    {status.whatsappConnected ? (
                      <>
                        <CheckCircle size={24} className="text-emerald-500 mb-2" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{t('systemLinked')}</span>
                      </>
                    ) : (
                      <>
                        <Wifi size={24} className="text-zinc-600 mb-2 animate-pulse" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{t('waitingEngine')}</span>
                      </>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-zinc-500 leading-relaxed">
                  {t('waInfo')}
                </p>

                {(status.whatsappConnected || qrCode) && (
                  <button
                    onClick={handleLogoutWhatsapp}
                    disabled={isLoggingOutWa}
                    className="w-full py-2 mt-1 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 select-none"
                  >
                    {isLoggingOutWa ? (
                      <>
                        <RefreshCw size={10} className="animate-spin" />
                        <span>{t('waLoggingOut')}</span>
                      </>
                    ) : (
                      <span>{t('waLogoutBtn')}</span>
                    )}
                  </button>
                )}
              </div>

              {/* Running Status Metadata */}
              <div className="p-4.5 rounded-2xl bg-[#09090e]/60 border border-zinc-800/40 flex flex-col gap-2.5 text-xs backdrop-blur-md">
                <div className="font-bold text-[10px] tracking-widest text-zinc-500 uppercase select-none">{t('telemetry')}</div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-zinc-500">{t('memoryUsage')}</span>
                  <span className="font-bold text-white">48.2 MB</span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-zinc-500">{t('pollInterval')}</span>
                  <span className="font-bold text-accent-purple">60 SECONDS</span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-zinc-500">{t('alertsForwarded')}</span>
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
            {/* Top Widget: Parsed Emails Log Grid or AI Chat */}
            <div className="flex-1 min-h-[350px] md:min-h-0 border border-zinc-900 rounded-3xl bg-[#07070c]/90 overflow-hidden flex flex-col backdrop-blur-md">
              <div className="px-5 py-4 border-b border-zinc-900 flex flex-col sm:flex-row justify-between items-center bg-zinc-950/20 gap-2 select-none">
                <div className="flex items-center gap-3">
                  {/* Segmented Control */}
                  <div className="flex p-0.5 rounded-xl bg-zinc-950 border border-zinc-800/30">
                    <button
                      onClick={() => setRightTab('inbox')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 ${rightTab === 'inbox' ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {t('inboxTab').toUpperCase()}
                    </button>
                    <button
                      onClick={() => setRightTab('chat')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 ${rightTab === 'chat' ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {t('chatTab').toUpperCase()}
                    </button>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  {rightTab === 'inbox' ? t('trackerSub') : t('chatSub')}
                </span>
              </div>

              {rightTab === 'chat' ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {(!status.aiConnected || !status.imapConnected) && (
                    <div className="mx-4 mt-4 px-3.5 py-2.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-[10px] text-rose-400 select-none flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>{t('chatWarningOffline')}</span>
                    </div>
                  )}

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 min-h-0">
                    {chatMessages.map((msg, idx) => {
                      // Detect category keyword to style agent message bubble
                      let bubbleBorder = 'border-zinc-800/50';
                      let bubbleShadow = '';
                      if (msg.sender === 'agent') {
                        const txt = msg.text.toLowerCase();
                        if (txt.includes('entrevista') || txt.includes('interview')) {
                          bubbleBorder = 'border-accent-purple/40';
                          bubbleShadow = 'shadow-[0_0_12px_rgba(99,102,241,0.08)]';
                        } else if (txt.includes('oferta') || txt.includes('offer')) {
                          bubbleBorder = 'border-emerald-500/40';
                          bubbleShadow = 'shadow-[0_0_12px_rgba(16,185,129,0.08)]';
                        } else if (txt.includes('rechazo') || txt.includes('reject') || txt.includes('rejection')) {
                          bubbleBorder = 'border-accent-cherry/40';
                          bubbleShadow = 'shadow-[0_0_12px_rgba(226,62,62,0.08)]';
                        } else if (txt.includes('spam')) {
                          bubbleBorder = 'border-accent-amber/40';
                          bubbleShadow = 'shadow-[0_0_12px_rgba(223,184,108,0.08)]';
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <div
                            className={`p-3.5 rounded-3xl text-xs leading-relaxed break-words select-text ${
                              msg.sender === 'user'
                                ? 'bg-gradient-to-br from-accent-purple to-accent-purple/80 text-white rounded-br-none shadow-[0_4px_12px_rgba(139,92,246,0.15)]'
                                : `bg-zinc-900/30 border ${bubbleBorder} ${bubbleShadow} text-neutral-200 rounded-bl-none`
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                          <span className="text-[8px] text-zinc-500 font-mono mt-1 px-1.5 select-none">{msg.timestamp}</span>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
 
                  {/* Quick Search Chips */}
                  <div className="px-5 py-3 border-t border-zinc-900 bg-zinc-950/20 select-none">
                    <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">{t('quickActions')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleSendChatMessage(language === 'es' ? 'Buscar correos de hoy' : "Search today's emails")}
                        disabled={isChatSending || !status.aiConnected || !status.imapConnected}
                        className="px-3 py-1.5 rounded-full bg-zinc-900/20 border border-zinc-800/40 text-[9px] text-neutral-300 hover:border-zinc-500/80 hover:bg-zinc-800/40 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('quickSearchToday')}
                      </button>
                      <button
                        onClick={() => handleSendChatMessage(language === 'es' ? 'Buscar entrevistas de esta semana' : 'Search interview calls this week')}
                        disabled={isChatSending || !status.aiConnected || !status.imapConnected}
                        className="px-3 py-1.5 rounded-full bg-zinc-900/20 border border-accent-purple/40 text-[9px] text-neutral-300 hover:border-accent-purple/80 hover:bg-accent-purple/5 hover:text-white hover:shadow-[0_0_8px_rgba(99,102,241,0.2)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('quickSearchInterview')}
                      </button>
                      <button
                        onClick={() => handleSendChatMessage(language === 'es' ? 'Buscar correos de Alan' : 'Search emails from Alan')}
                        disabled={isChatSending || !status.aiConnected || !status.imapConnected}
                        className="px-3 py-1.5 rounded-full bg-zinc-900/20 border border-emerald-500/40 text-[9px] text-neutral-300 hover:border-emerald-500/80 hover:bg-emerald-500/5 hover:text-white hover:shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('quickSearchFromAlan')}
                      </button>
                    </div>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
                    className="p-3 border-t border-zinc-900 flex gap-2 items-center bg-zinc-950/20"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isChatSending || !status.aiConnected || !status.imapConnected}
                      placeholder={t('chatPlaceholder')}
                      className="flex-1 bg-zinc-900/40 border border-zinc-800/50 focus:border-accent-purple/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed animate-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatSending || !status.aiConnected || !status.imapConnected}
                      className="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-2xl hover:bg-neutral-200 transition-all duration-200 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed select-none shrink-0"
                    >
                      {isChatSending ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        t('chatSend')
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* INBOX VIEWER CONTAINER */
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {emails.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                      <CheckCircle size={28} className="text-emerald-500/70 mb-2.5" />
                      <h3 className="text-xs font-bold tracking-tight text-white mb-0.5">{t('inboxSecureTitle')}</h3>
                      <p className="text-[10px] text-zinc-500 max-w-[280px] leading-relaxed">
                        {t('inboxSecureSub')}
                      </p>
                    </div>
                  ) : (
                    emails.map(email => {
                      const categoryStyles: Record<string, { border: string; bg: string; text: string; badge: string }> = {
                        'Interview': {
                          border: 'border-accent-purple/35',
                          bg: 'bg-accent-purple/5',
                          text: 'text-purple-300',
                          badge: 'bg-accent-purple/15 text-purple-300 border border-accent-purple/20'
                        },
                        'Job Offer': {
                          border: 'border-emerald-500/35',
                          bg: 'bg-emerald-500/5',
                          text: 'text-emerald-300',
                          badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                        },
                        'Reject': {
                          border: 'border-accent-cherry/35',
                          bg: 'bg-[#e23e3e]/5',
                          text: 'text-rose-300',
                          badge: 'bg-[#e23e3e]/15 text-rose-300 border border-[#e23e3e]/20'
                        },
                        'Spam': {
                          border: 'border-accent-amber/20',
                          bg: 'bg-accent-amber/5',
                          text: 'text-accent-amber/80',
                          badge: 'bg-accent-amber/10 text-accent-amber/80 border border-accent-amber/15'
                        },
                        'General': {
                          border: 'border-zinc-800',
                          bg: 'bg-zinc-900/10',
                          text: 'text-zinc-400',
                          badge: 'bg-zinc-900/30 border border-zinc-800/60 text-zinc-400'
                        }
                      };

                      const style = categoryStyles[email.category] || categoryStyles['General'];

                      return (
                        <div
                          key={email.id}
                          onClick={() => handleOpenEmail(email)}
                          className={`p-4 rounded-2xl border ${style.border} ${style.bg} flex flex-col gap-2.5 hover:bg-white/[0.02] active:scale-[0.99] cursor-pointer transition-all duration-300 relative group`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider ${style.badge}`}>
                                {translateCategory(email.category)}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">{email.timestamp}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {email.notified ? (
                                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none">
                                  {t('forwardedToWa')}
                                </span>
                              ) : (
                                <span className="text-[9px] text-zinc-500 font-medium bg-zinc-900/50 border border-zinc-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none">
                                  {t('noAlertsSent')}
                                </span>
                              )}
                              <ExternalLink size={12} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-xs font-bold text-white">{email.subject}</h4>
                            <p className="text-[10px] text-zinc-500 font-mono select-all" onClick={(e) => e.stopPropagation()}>FROM: {email.sender}</p>
                          </div>
                          <p 
                            className={`text-[10px] leading-relaxed select-text bg-zinc-950/40 border border-zinc-900/80 p-3 rounded-xl whitespace-pre-line ${style.text}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {email.summary}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Bottom Widget: Live Output Console */}
            <div className={`shrink-0 border border-card-border rounded-2xl bg-black overflow-hidden flex flex-col font-mono transition-all duration-300 ${isConsoleCollapsed ? 'h-10' : 'h-[200px]'}`}>
              <div className="px-4 py-2 border-b border-card-border flex justify-between items-center bg-[rgba(255,255,255,0.02)] select-none">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
                  <Terminal size={12} />
                  <span>{t('localConsole')}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[8px] tracking-widest text-muted uppercase hidden sm:inline">{t('realTimeStream')}</span>
                  
                  {/* Clean Console logs action button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearLogs();
                    }}
                    className="p-1 hover:text-white text-muted rounded hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center"
                    title={language === 'es' ? 'Limpiar consola' : 'Clear console'}
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Collapse / Expand Toggle Button */}
                  <button
                    onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                    className="p-1 hover:text-white text-muted rounded hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center"
                    title={isConsoleCollapsed ? (language === 'es' ? 'Expandir' : 'Collapse') : (language === 'es' ? 'Contraer' : 'Expand')}
                  >
                    {isConsoleCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {!isConsoleCollapsed && (
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
              )}
            </div>
          </div>
        </div>
      </main>

      {showAppPasswordGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-sm rounded-3xl bg-[#07070c]/95 border border-zinc-800/60 p-6 flex flex-col gap-4 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 text-accent-purple font-bold text-sm">
              <Mail size={16} />
              <h3>{t('guideTitle')}</h3>
            </div>
            <div className="flex flex-col gap-3.5 text-xs text-neutral-300 leading-relaxed font-sans">
              <p>{t('guideStep1')}</p>
              <p>{t('guideStep2')}</p>
              <p>{t('guideStep3')}</p>
              <p>{t('guideStep4')}</p>
              <p>{t('guideStep5')}</p>
            </div>
            <button
              onClick={() => setShowAppPasswordGuide(false)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all mt-2 select-none"
            >
              {t('guideClose')}
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
