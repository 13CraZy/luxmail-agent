import { ImapFlow } from 'imapflow';
import { IMAPConfig } from '../../shared/types';

export class ImapService {
  private client: ImapFlow | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private retryDelay = 5000;
  private explicitlyDisconnected = false;

  public onNewEmailCallback: ((email: { sender: string; subject: string; body: string; date: Date }, isInitialScan: boolean) => void) | null = null;
  public onStatusChangeCallback: ((status: 'connected' | 'disconnected' | 'reconnecting') => void) | null = null;

  constructor(private config: IMAPConfig) {}

  public onNewEmail(callback: (email: { sender: string; subject: string; body: string; date: Date }, isInitialScan: boolean) => void) {
    this.onNewEmailCallback = callback;
  }

  public onStatusChange(callback: (status: 'connected' | 'disconnected' | 'reconnecting') => void) {
    this.onStatusChangeCallback = callback;
  }

  public getStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus;
  }

  public async connect(): Promise<void> {
    if (this.connectionStatus === 'connected') return;

    this.explicitlyDisconnected = false;
    await this.attemptConnect();
  }

  private async attemptConnect(): Promise<void> {
    if (this.explicitlyDisconnected) return;

    let finalPassword = this.config.passwordHex.trim();
    // If it is a 16-character Google App Password (often displayed with spaces), strip all spaces
    if (finalPassword.replace(/\s+/g, '').length === 16) {
      finalPassword = finalPassword.replace(/\s+/g, '');
    }

    this.client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: finalPassword,
      },
      logger: false, // Suppress verbose library logs
    });

    this.client.on('error', (err) => {
      console.error('IMAP client connection error:', err);
      this.triggerReconnect();
    });

    this.client.on('close', () => {
      console.log('IMAP client closed.');
      this.triggerReconnect();
    });

    try {
      await this.client.connect();
      this.connectionStatus = 'connected';
      this.retryDelay = 5000; // Reset delay on success
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('connected');
      }

      // Open the INBOX in read-only mode by default for safety
      await this.client.mailboxOpen('INBOX', { readOnly: true });

      // Scan today's emails before entering IDLE
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        console.log(`[IMAP] Scanning for emails since ${todayStart.toDateString()}...`);
        const sequenceNumbers = await this.client.search({ since: todayStart });
        if (sequenceNumbers && sequenceNumbers.length > 0) {
          // Limit to last 10 emails of today to prevent overloading
          const targetSeqs = sequenceNumbers.slice(-10);
          console.log(`[IMAP] Found ${sequenceNumbers.length} emails today. Processing last ${targetSeqs.length} for initial scan...`);
          for (const seq of targetSeqs) {
            await this.fetchMessage(seq, true);
          }
        }
      } catch (scanErr) {
        console.error('[IMAP] Initial scan failed:', scanErr);
      }
      
      // Begin listening for new emails
      this.startListening();
    } catch (err) {
      console.error('IMAP connection attempt failed:', err);
      this.triggerReconnect();
      throw err; // Propagate for initial connection setup
    }
  }

  private triggerReconnect() {
    if (this.explicitlyDisconnected) return;
    if (this.connectionStatus === 'reconnecting') return;

    this.connectionStatus = 'reconnecting';
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback('reconnecting');
    }

    if (this.client) {
      try {
        this.client.logout().catch(() => {});
      } catch (e) {}
      this.client = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    console.log(`Scheduling IMAP reconnect in ${this.retryDelay}ms...`);
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.attemptConnect();
      } catch (err) {
        // Exponential backoff up to 60s
        this.retryDelay = Math.min(this.retryDelay * 2, 60000);
      }
    }, this.retryDelay);
  }

  public async disconnect(): Promise<void> {
    this.explicitlyDisconnected = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.connectionStatus = 'disconnected';
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback('disconnected');
    }

    if (this.client) {
      try {
        await this.client.logout();
      } catch (e) {}
      this.client = null;
    }
  }

  public async searchEmails(criteria: {
    since?: string;
    before?: string;
    from?: string;
    subject?: string;
    body?: string;
    keywords?: string[];
  }): Promise<{ sender: string; subject: string; date: string; bodySummary: string }[]> {
    if (!this.client || this.connectionStatus !== 'connected') {
      throw new Error('IMAP monitor is offline. Please check your credentials and retry.');
    }

    // Verify inbox is open
    if (!this.client.mailbox) {
      await this.client.mailboxOpen('INBOX', { readOnly: true });
    }

    let sequenceNumbers: number[] = [];

    if (criteria.keywords && criteria.keywords.length > 0) {
      const allSeqsMap = new Map<number, number>();
      for (const kw of criteria.keywords) {
        const query: any = {};
        if (criteria.since) query.since = new Date(criteria.since);
        if (criteria.before) query.before = new Date(criteria.before);
        if (criteria.from) query.from = criteria.from;

        // Search in body
        const bodyQuery = { ...query, body: kw };
        const bodySeqs = await this.client.search(bodyQuery);
        for (const s of bodySeqs || []) {
          allSeqsMap.set(s, s);
        }

        // Search in subject
        const subjectQuery = { ...query, subject: kw };
        const subjSeqs = await this.client.search(subjectQuery);
        for (const s of subjSeqs || []) {
          allSeqsMap.set(s, s);
        }
      }
      // Sort sequence numbers ascending
      sequenceNumbers = Array.from(allSeqsMap.keys()).sort((a, b) => a - b);
    } else {
      const query: any = {};
      if (criteria.since) query.since = new Date(criteria.since);
      if (criteria.before) query.before = new Date(criteria.before);
      if (criteria.from) query.from = criteria.from;
      if (criteria.subject) query.subject = criteria.subject;
      if (criteria.body) query.body = criteria.body;

      const seqs = await this.client.search(query);
      sequenceNumbers = seqs || [];
    }

    if (!sequenceNumbers || sequenceNumbers.length === 0) return [];
    
    // Retrieve up to 20 emails (newest first, since they are ordered ascending, we slice the last 20)
    const maxResults = 20;
    const targetSeqs = sequenceNumbers.slice(-maxResults);
    
    const results = [];
    for (const seq of targetSeqs) {
      try {
        const msg = await this.client.fetchOne(seq.toString(), {
          envelope: true,
          source: true,
        });
        if (msg && msg.envelope) {
          const fromList = msg.envelope.from || [];
          const sender = fromList.map(f => `${f.name || ''} <${f.address || ''}>`).join(', ');
          const subject = msg.envelope.subject || '(No Subject)';
          const date = msg.envelope.date ? msg.envelope.date.toISOString() : new Date().toISOString();
          
          const rawSource = msg.source ? msg.source.toString() : '';
          const bodySummary = this.cleanEmailBody(rawSource).substring(0, 500);
          
          results.push({ sender, subject, date, bodySummary });
        }
      } catch (err) {
        console.error(`Failed to fetch sequence ${seq}:`, err);
      }
    }
    
    return results;
  }

  private async startListening() {
    if (!this.client) return;

    // Listen for new messages using IMAP EXISTS/IDLE event
    this.client.on('exists', async (data) => {
      try {
        await this.fetchMessage(data.count, false);
      } catch (err) {
        console.error('Error fetching new message:', err);
      }
    });

    // Enter idle state to listen for real-time events
    while (this.connectionStatus === 'connected' && this.client) {
      try {
        await this.client.idle();
      } catch (idleErr) {
        console.error('[IMAP] Connection idle state lost:', idleErr);
        break;
      }
    }
  }

  private async fetchMessage(sequenceNumber: number, isInitialScan: boolean = false) {
    if (!this.client) return;

    try {
      // Fetch envelope (headers), body structure and text parts
      const message = await this.client.fetchOne(sequenceNumber.toString(), {
        envelope: true,
        source: true,
      });

      if (!message || !message.envelope) return;

      const fromList = message.envelope.from || [];
      const sender = fromList.map(f => `${f.name || ''} <${f.address || ''}>`).join(', ');
      const subject = message.envelope.subject || '(No Subject)';
      const date = message.envelope.date || new Date();
      
      // Extract plain text body from raw email source
      const rawSource = message.source ? message.source.toString() : '';
      const body = this.cleanEmailBody(rawSource);

      if (this.onNewEmailCallback) {
        this.onNewEmailCallback({ sender, subject, body, date }, isInitialScan);
      }
    } catch (err) {
      console.error(`[IMAP] Failed to fetch message sequence ${sequenceNumber}:`, err);
    }
  }

  /**
   * Helper to extract plain text body and remove raw MIME headers / attachments
   */
  private cleanEmailBody(raw: string): string {
    // Basic body extraction by removing MIME headers
    const bodyStartIndex = raw.indexOf('\r\n\r\n');
    if (bodyStartIndex === -1) return raw.substring(0, 1000);
    
    const bodyContent = raw.substring(bodyStartIndex + 4);
    
    // Strip HTML tags and normalize whitespace
    return bodyContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000); // Truncate to 2000 chars to avoid overloading LLM context
  }
}
