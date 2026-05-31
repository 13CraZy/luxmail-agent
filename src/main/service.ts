import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { ImapService } from './services/imapService';
import { AIService } from './services/aiService';
import { WhatsappService } from './services/whatsappService';
import { AgentConfig, SystemStatus, MailLog, ConsoleLog } from '../shared/types';

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
  return {
    imapConnected: imapService !== null,
    whatsappConnected: whatsappService?.getStatus() || false,
    aiConnected: aiService !== null,
  };
}

// Load configurations
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
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

app.post('/api/config', (req, res) => {
  config = req.body as AgentConfig;
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
      const result = await aiService.classifyEmail(sender, subject, body);
      
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
      const summary = `[Local Demo Mock] Analyzed email from ${sender}. Summary: Found job related request. Category determined as ${category}.`;

      const result = { isPriority, category, urgency, summary };
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

async function restartServices() {
  addConsoleLog('info', 'Initializing LuxMail Agent background pipelines...');

  // 1. Disconnect any existing IMAP instances
  if (imapService) {
    await imapService.disconnect();
    imapService = null;
  }

  if (!config) return;

  // 2. Initialize AI Engine
  aiService = new AIService(config.ai);
  addConsoleLog('success', `AI Engine initialized using provider: ${config.ai.provider.toUpperCase()}`);

  // 3. Initialize WhatsApp Automation
  if (config.whatsappEnabled) {
    whatsappService = new WhatsappService();
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
  imapService.onNewEmail(async (email) => {
    addConsoleLog('info', `New email detected from: ${email.sender}. Topic: "${email.subject}"`);
    
    if (!aiService) return;

    addConsoleLog('info', 'Analyzing email priority with AI...');
    const result = await aiService.classifyEmail(email.sender, email.subject, email.body);
    
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

    // Forward WhatsApp alerts if email meets priority threshold
    if (result.isPriority && config?.whatsappEnabled && whatsappService) {
      const alertMessage = `📬 *LuxMail Alert*\n\n*From:* ${email.sender}\n*Subject:* ${email.subject}\n*Summary:* ${result.summary}\n\n_Classification: ${result.category} (${result.urgency} priority)_`;
      try {
        // Send to self (using registered phone number from config or environment)
        const targetPhone = process.env.NOTIFICATION_PHONE || config.imap.user; 
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
