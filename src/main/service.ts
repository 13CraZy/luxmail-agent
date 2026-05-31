import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { ImapService } from './services/imapService';
import { AIService, ClassificationResult } from './services/aiService';
import { WhatsappService } from './services/whatsappService';
import { AgentConfig, SystemStatus, MailLog, ConsoleLog } from '../shared/types';


function translateCategory(category: string, lang: 'en' | 'es'): string {
  if (lang !== 'es') return category;
  const mapping: Record<string, string> = {
    'Interview': 'Entrevista',
    'Job Offer': 'Oferta de Trabajo',
    'Reject': 'Rechazo',
    'Spam': 'Spam',
    'General': 'General'
  };
  return mapping[category] || category;
}

function translateUrgency(urgency: string, lang: 'en' | 'es'): string {
  if (lang !== 'es') return urgency;
  const mapping: Record<string, string> = {
    'low': 'baja',
    'medium': 'media',
    'high': 'alta'
  };
  return mapping[urgency] || urgency;
}

function isCurrentlyInDndRange(startStr: string | undefined, endStr: string | undefined): boolean {
  if (!startStr || !endStr) return false;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentMinutesTotal = currentHours * 60 + currentMinutes;

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  const startMinutesTotal = startH * 60 + startM;
  const endMinutesTotal = endH * 60 + endM;

  if (startMinutesTotal <= endMinutesTotal) {
    return currentMinutesTotal >= startMinutesTotal && currentMinutesTotal <= endMinutesTotal;
  } else {
    return currentMinutesTotal >= startMinutesTotal || currentMinutesTotal <= endMinutesTotal;
  }
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve('./data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Express App Setup
const app = express();
app.use(express.json());

// Enable CORS for development cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const server = createServer(app);

// WebSocket Server for streaming live logs and QR codes
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Stream current system status upon connection
  ws.send(JSON.stringify({ type: 'status', status: getSystemStatus() }));
  
  // If QR code is active, send it immediately
  if (activeQr) {
    ws.send(JSON.stringify({ type: 'qr', qr: activeQr }));
  }

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(data: object) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Global Application State
let config: AgentConfig | null = null;
let imapService: ImapService | null = null;
let aiService: AIService | null = null;
let whatsappService: WhatsappService | null = null;

let activeQr: string | null = null;
const emailLogs: MailLog[] = [];
const consoleLogs: ConsoleLog[] = [];

function addConsoleLog(level: ConsoleLog['level'], message: string) {
  const log: ConsoleLog = {
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
  };
  consoleLogs.push(log);
  if (consoleLogs.length > 200) consoleLogs.shift();
  
  console.log(`[${log.level.toUpperCase()}] ${log.message}`);
  broadcast({ type: 'log', log });
}

function getSystemStatus(): SystemStatus {
  const imapStatus = imapService?.getStatus() || 'disconnected';
  return {
    imapConnected: imapStatus === 'connected' ? true : imapStatus === 'reconnecting' ? 'reconnecting' : false,
    whatsappConnected: whatsappService?.getStatus() || false,
    aiConnected: aiService !== null,
  };
}

// Load configurations
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (config && !config.priorityCategories) {
      config.priorityCategories = ['Interview', 'Job Offer'];
    }
    addConsoleLog('info', 'Configuration loaded successfully from local storage.');
  } catch (err) {
    addConsoleLog('error', `Failed to parse config file: ${(err as Error).message}`);
  }
} else {
  addConsoleLog('warn', 'Configuration file not found. Daemon waiting for setup.');
}

// REST Endpoints for config and status checks
app.get('/api/status', (_req, res) => {
  res.json({ status: getSystemStatus(), configExists: config !== null });
});

app.get('/api/config', (_req, res) => {
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'No configuration found' });
  }
});

app.post('/api/config', (req, res) => {
  config = req.body as AgentConfig;
  if (config && !config.priorityCategories) {
    config.priorityCategories = ['Interview', 'Job Offer'];
  }
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    addConsoleLog('success', 'Configuration updated and written to disk.');
    res.json({ success: true });
    
    // Restart services to apply new configurations
    restartServices();
  } catch (err) {
    addConsoleLog('error', `Failed to save configuration: ${(err as Error).message}`);
    res.status(500).json({ error: 'Failed to write configuration.' });
  }
});

app.get('/api/logs', (_req, res) => {
  res.json({ emails: emailLogs, console: consoleLogs });
});

app.post('/api/whatsapp/logout', async (req, res) => {
  addConsoleLog('info', 'Request received to log out WhatsApp session.');
  try {
    if (whatsappService) {
      await whatsappService.logout();
      whatsappService = null;
      activeQr = null;
      broadcast({ type: 'qr', qr: null });
      broadcast({ type: 'status', status: getSystemStatus() });
      addConsoleLog('success', 'WhatsApp session successfully logged out and cleared.');
      
      // Re-initialize WhatsApp engine to obtain a fresh QR code
      if (config?.whatsappEnabled) {
        const absoluteAuthPath = path.resolve(DATA_DIR, 'auth');
        whatsappService = new WhatsappService(absoluteAuthPath);
        whatsappService.onQr((qr) => {
          activeQr = qr;
          broadcast({ type: 'qr', qr });
        });
        whatsappService.onReady(() => {
          activeQr = null;
          addConsoleLog('success', 'WhatsApp Engine ready and linked.');
          broadcast({ type: 'status', status: getSystemStatus() });
        });
        whatsappService.initialize();
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'WhatsApp service is not active.' });
    }
  } catch (err) {
    addConsoleLog('error', `Failed to log out WhatsApp: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message in request body.' });
  }

  const isSpanish = config?.language === 'es';

  try {
    if (!aiService) {
      return res.status(503).json({
        error: isSpanish 
          ? 'El motor de IA está fuera de línea. Configura una Llave de API válida en Ajustes.' 
          : 'AI Engine is offline. Please configure a valid API key in Settings.'
      });
    }

    if (!imapService || !imapService.getStatus()) {
      return res.status(503).json({
        error: isSpanish
          ? 'El monitor de correo IMAP está fuera de línea. Por favor conecta tu buzón primero.'
          : 'IMAP mail monitor is offline. Please connect your mailbox first.'
      });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    addConsoleLog('info', `Translating chat request: "${message}"`);
    const criteria = await aiService.translateChatQueryToSearchCriteria(message, todayDate);
    addConsoleLog('info', `IMAP search filters generated: ${JSON.stringify(criteria)}`);

    addConsoleLog('info', 'Executing IMAP search on INBOX...');
    const searchResults = await imapService.searchEmails(criteria);
    addConsoleLog('success', `IMAP search completed. Found ${searchResults.length} matching messages.`);

    addConsoleLog('info', 'Generating AI analysis response...');
    const responseText = await aiService.generateChatResponse(message, searchResults, config?.language || 'en');
    
    res.json({ response: responseText });
  } catch (err) {
    addConsoleLog('error', `Error during chat processing: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Endpoint to simulate incoming emails for testing purposes
app.post('/api/test/inject-email', async (req, res) => {
  const { sender, subject, body } = req.body;
  if (!sender || !subject || !body) {
    return res.status(400).json({ error: 'Missing sender, subject or body in request body.' });
  }

  addConsoleLog('info', `[SIMULATION] Injecting mock email: "${subject}" from ${sender}`);

  if (imapService && imapService.onNewEmailCallback) {
    // Simulates the exact E2E pipeline as if it was fetched via IMAP
    imapService.onNewEmailCallback({ sender, subject, body, date: new Date() });
    res.json({ success: true, message: 'Mock email injected into active monitor pipeline.' });
  } else {
    // Dry run if IMAP is offline but AI is configured
    if (aiService) {
      addConsoleLog('warn', '[SIMULATION] IMAP monitor offline. Executing AI classification dry run.');
      const result = await aiService.classifyEmail(sender, subject, body, config?.language || 'en');
      
      const priorityCategories = config?.priorityCategories || ['Interview', 'Job Offer'];
      result.isPriority = priorityCategories.includes(result.category);

      const mailLog: MailLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        sender,
        subject,
        summary: result.summary,
        category: result.category,
        urgency: result.urgency,
        notified: false,
      };
      emailLogs.push(mailLog);
      broadcast({ type: 'email', email: mailLog });

      res.json({ 
        success: true, 
        message: 'Processed dry run email classification (IMAP not online).',
        classification: result 
      });
    } else {
      // Local fallback mock classifier if no configuration is present (for instant UI/E2E demo)
      addConsoleLog('warn', '[SIMULATION] No active configuration. Running local mock rule-based classifier.');
      
      const isPriority = subject.toLowerCase().includes('interview') || subject.toLowerCase().includes('schedule');
      const category: 'Interview' | 'Job Offer' | 'Reject' | 'Spam' | 'General' = isPriority ? 'Interview' 
                     : (subject.toLowerCase().includes('rejection') || body.toLowerCase().includes('proceed with another')) ? 'Reject'
                     : (subject.toLowerCase().includes('offer') || body.toLowerCase().includes('job offer')) ? 'Job Offer'
                     : (subject.toLowerCase().includes('discount') || subject.toLowerCase().includes('promo')) ? 'Spam'
                     : 'General';
      const urgency: 'low' | 'medium' | 'high' = isPriority ? 'high' : 'low';
      const isSpanish = config?.language === 'es';
      const summary = isSpanish
        ? `[Simulación Local] Correo analizado de ${sender}. Resumen: Se encontró solicitud relacionada a empleo. Categoría determinada como ${translateCategory(category, 'es')}.`
        : `[Local Demo Mock] Analyzed email from ${sender}. Summary: Found job related request. Category determined as ${category}.`;

      const priorityCategories = config?.priorityCategories || ['Interview', 'Job Offer'];
      const finalIsPriority = priorityCategories.includes(category);

      const result = { isPriority: finalIsPriority, category, urgency, summary };
      const mailLog: MailLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        sender,
        subject,
        summary: result.summary,
        category: result.category,
        urgency: result.urgency,
        notified: false,
      };
      emailLogs.push(mailLog);
      broadcast({ type: 'email', email: mailLog });

      res.json({ 
        success: true, 
        message: 'Mock email classified using local rule-based engine (Daemon not configured).',
        classification: result 
      });
    }
  }
});

function killZombieChromium(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve();
      return;
    }
    const normalizedPath = path.resolve(DATA_DIR, 'auth/session').replace(/\\/g, '*').replace(/\//g, '*');
    const command = `powershell -Command "Get-CimInstance Win32_Process -Filter 'Name = ''chrome.exe''' | Where-Object CommandLine -like '*${normalizedPath}*' | Remove-CimInstance"`;
    
    exec(command, (err) => {
      if (err) {
        console.log(`[INFO] Zombie cleanup finished: ${err.message}`);
      } else {
        console.log('[SUCCESS] Zombie Chromium processes cleaned up.');
      }
      resolve();
    });
  });
}

export async function shutdownServices() {
  if (imapService) {
    try {
      await imapService.disconnect();
    } catch (e) {}
    imapService = null;
  }
  if (whatsappService) {
    try {
      await whatsappService.destroy();
    } catch (e) {}
    whatsappService = null;
  }
}

async function restartServices() {
  // Clear logs history on service restart to keep UI and logs aligned
  emailLogs.length = 0;
  consoleLogs.length = 0;
  broadcast({ type: 'clear' });

  addConsoleLog('info', 'Initializing LuxMail Agent background pipelines...');

  // 1. Disconnect any existing IMAP instances
  if (imapService) {
    try {
      await imapService.disconnect();
    } catch (err) {
      addConsoleLog('error', `Error disconnecting IMAP: ${(err as Error).message}`);
    }
    imapService = null;
  }

  // 2. Shut down previous WhatsApp service if it exists to release the browser lock
  if (whatsappService) {
    try {
      addConsoleLog('info', 'Stopping previous WhatsApp engine...');
      await whatsappService.destroy();
    } catch (err) {
      addConsoleLog('error', `Error destroying WhatsApp service: ${(err as Error).message}`);
    }
    whatsappService = null;
  }

  // 3. Clean up any remaining zombie Chrome processes holding the folder lock
  await killZombieChromium();

  if (!config) return;
  const currentLanguage = config.language || 'en';

  // 2. Initialize AI Engine
  const isOllama = config.ai.provider === 'ollama';
  const hasValidApiKey = config.ai.apiKeyHex && !config.ai.apiKeyHex.startsWith('test') && !config.ai.apiKeyHex.includes('••••');
  if (isOllama || hasValidApiKey) {
    aiService = new AIService(config.ai);
    addConsoleLog('success', `AI Engine initialized using provider: ${config.ai.provider.toUpperCase()}`);
  } else {
    aiService = null;
    addConsoleLog('warn', `AI Engine skipped: No valid API key provided. Fallback mock classifier will be active.`);
  }

  // 3. Initialize WhatsApp Automation
  if (config.whatsappEnabled) {
    const absoluteAuthPath = path.resolve(DATA_DIR, 'auth');
    whatsappService = new WhatsappService(absoluteAuthPath);
    whatsappService.onQr((qr) => {
      activeQr = qr;
      broadcast({ type: 'qr', qr });
    });
    whatsappService.onReady(() => {
      activeQr = null;
      addConsoleLog('success', 'WhatsApp Engine ready and linked.');
      broadcast({ type: 'status', status: getSystemStatus() });
    });
    whatsappService.initialize();
  }

  // 4. Initialize IMAP Mail Monitor
  imapService = new ImapService(config.imap);
  imapService.onStatusChange((status) => {
    addConsoleLog('info', `IMAP connection status: ${status.toUpperCase()}`);
    broadcast({ type: 'status', status: getSystemStatus() });
  });
  imapService.onNewEmail(async (email) => {
    addConsoleLog('info', `New email detected from: ${email.sender}. Topic: "${email.subject}"`);
    
    let result: ClassificationResult;

    if (aiService) {
      addConsoleLog('info', 'Analyzing email priority with AI...');
      result = await aiService.classifyEmail(email.sender, email.subject, email.body, currentLanguage);
    } else {
      addConsoleLog('warn', 'AI Engine offline. Running local mock rule-based classifier.');
      const isPriority = email.subject.toLowerCase().includes('interview') || email.subject.toLowerCase().includes('schedule');
      const category: 'Interview' | 'Job Offer' | 'Reject' | 'Spam' | 'General' = isPriority ? 'Interview' 
                     : (email.subject.toLowerCase().includes('rejection') || email.body.toLowerCase().includes('proceed with another')) ? 'Reject'
                     : (email.subject.toLowerCase().includes('offer') || email.body.toLowerCase().includes('job offer')) ? 'Job Offer'
                     : (email.subject.toLowerCase().includes('discount') || email.subject.toLowerCase().includes('promo')) ? 'Spam'
                     : 'General';
      const urgency: 'low' | 'medium' | 'high' = isPriority ? 'high' : 'low';
      const isSpanish = currentLanguage === 'es';
      const summary = isSpanish
        ? `[Simulación Local] Correo analizado de ${email.sender}. Resumen: Se encontró solicitud relacionada a empleo. Categoría determinada como ${translateCategory(category, 'es')}.`
        : `[Local Demo Mock] Analyzed email from ${email.sender}. Summary: Found job related request. Category determined as ${category}.`;

      result = { isPriority, category, urgency, summary };
    }

    // Override isPriority dynamically based on the configured priorityCategories
    const priorityCategories = config?.priorityCategories || ['Interview', 'Job Offer'];
    result.isPriority = priorityCategories.includes(result.category);

    const mailLog: MailLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      sender: email.sender,
      subject: email.subject,
      summary: result.summary,
      category: result.category,
      urgency: result.urgency,
      notified: false,
    };

    addConsoleLog('info', `AI Classification: [Category: ${result.category}] [Priority: ${result.isPriority}] [Urgency: ${result.urgency}]`);

    // Evaluate if WhatsApp notification should be sent based on natural language rules
    let shouldNotify = result.isPriority;
    if (aiService && config?.notificationRules) {
      addConsoleLog('info', 'Evaluating custom notification rules with AI...');
      shouldNotify = await aiService.shouldNotifyUser(
        email.sender,
        email.subject,
        result.summary,
        result.category,
        result.urgency,
        result.isPriority,
        config.notificationRules
      );
      addConsoleLog('info', `Custom notification rules result: shouldNotify = ${shouldNotify}`);
    }

    // Forward WhatsApp alerts if email meets priority/custom rules threshold and DND is not active
    let dndActive = false;
    if (config?.dndEnabled && config.dndStart && config.dndEnd) {
      dndActive = isCurrentlyInDndRange(config.dndStart, config.dndEnd);
      if (dndActive) {
        addConsoleLog('warn', `WhatsApp notification skipped due to active Do Not Disturb (DND) silent hours (${config.dndStart} - ${config.dndEnd}).`);
      }
    }

    if (shouldNotify && !dndActive && config?.whatsappEnabled && whatsappService) {
      const isSpanish = currentLanguage === 'es';
      const alertMessage = isSpanish
        ? `📬 *Alerta de LuxMail*\n\n*De:* ${email.sender}\n*Asunto:* ${email.subject}\n*Resumen:* ${result.summary}\n\n_Clasificación: ${translateCategory(result.category, 'es')} (prioridad ${translateUrgency(result.urgency, 'es')})_`
        : `📬 *LuxMail Alert*\n\n*From:* ${email.sender}\n*Subject:* ${email.subject}\n*Summary:* ${result.summary}\n\n_Classification: ${result.category} (${result.urgency} priority)_`;
      try {
        // Send to self (using registered phone number from config or environment)
        const targetPhone = config.notificationPhone || process.env.NOTIFICATION_PHONE || config.imap.user; 
        addConsoleLog('info', `Forwarding WhatsApp alert to ${targetPhone}...`);
        await whatsappService.sendMessage(targetPhone, alertMessage);
        mailLog.notified = true;
        addConsoleLog('success', 'WhatsApp notification delivered successfully.');
      } catch (err) {
        addConsoleLog('error', `Failed to send WhatsApp message: ${(err as Error).message}`);
      }
    }

    emailLogs.push(mailLog);
    if (emailLogs.length > 50) emailLogs.shift();
    broadcast({ type: 'email', email: mailLog });
  });

  try {
    addConsoleLog('info', 'Establishing connection to IMAP mailbox...');
    await imapService.connect();
    addConsoleLog('success', 'IMAP Mail Monitor online.');
  } catch (err) {
    addConsoleLog('error', `IMAP connection error: ${(err as Error).message}`);
  }

  broadcast({ type: 'status', status: getSystemStatus() });
}

// Start pipeline automatically if configuration is pre-loaded
if (config) {
  restartServices().catch((err) => {
    addConsoleLog('error', `Startup error: ${(err as Error).message}`);
  });
}

// Start REST and WebSocket Server
server.listen(PORT, () => {
  addConsoleLog('success', `LuxMail Daemon running locally on http://localhost:${PORT}`);
});
