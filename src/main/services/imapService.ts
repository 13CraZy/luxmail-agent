import { ImapFlow } from 'imapflow';
import { IMAPConfig } from '../../shared/types';

export class ImapService {
  private client: ImapFlow | null = null;
  private isConnected = false;
  public onNewEmailCallback: ((email: { sender: string; subject: string; body: string; date: Date }) => void) | null = null;

  constructor(private config: IMAPConfig) {}

  public onNewEmail(callback: (email: { sender: string; subject: string; body: string; date: Date }) => void) {
    this.onNewEmailCallback = callback;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

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

    await this.client.connect();
    this.isConnected = true;
    
    // Open the INBOX in read-only mode by default for safety
    await this.client.mailboxOpen('INBOX', { readOnly: true });
    
    // Begin listening for new emails
    this.startListening();
  }

  public async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) return;
    await this.client.logout();
    this.isConnected = false;
    this.client = null;
  }

  public async searchEmails(criteria: {
    since?: string;
    before?: string;
    from?: string;
    subject?: string;
    body?: string;
    keywords?: string[];
  }): Promise<{ sender: string; subject: string; date: string; bodySummary: string }[]> {
    if (!this.client || !this.isConnected) {
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
        await this.fetchMessage(data.count);
      } catch (err) {
        console.error('Error fetching new message:', err);
      }
    });

    // Enter idle state to listen for real-time events
    while (this.isConnected && this.client) {
      await this.client.idle();
    }
  }

  private async fetchMessage(sequenceNumber: number) {
    if (!this.client) return;

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
      this.onNewEmailCallback({ sender, subject, body, date });
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
