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
