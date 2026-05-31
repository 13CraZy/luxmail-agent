import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

export class WhatsappService {
  private client: Client | null = null;
  private isReady = false;
  private onQrCallback: ((qr: string) => void) | null = null;
  private onReadyCallback: (() => void) | null = null;

  constructor(private dataPath?: string) {}

  public onQr(callback: (qr: string) => void) {
    this.onQrCallback = callback;
  }

  public onReady(callback: () => void) {
    this.onReadyCallback = callback;
  }

  public initialize(): void {
    // Detect if we are running inside Docker or custom env to resolve Chromium path
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.dataPath || './data/auth' // Persisted path for WhatsApp login token session
      }),
      webVersionCache: {
        type: 'none'
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      puppeteer: {
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this.client.on('qr', (qr) => {
      // Print QR to console for CLI/Docker setup as fallback
      qrcode.generate(qr, { small: true });
      
      if (this.onQrCallback) {
        this.onQrCallback(qr);
      }
    });

    this.client.on('ready', () => {
      this.isReady = true;
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    });

    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp Authentication Failure:', msg);
    });

    this.client.initialize().catch((err) => {
      console.error('Failed to initialize WhatsApp client:', err);
    });
  }

  public async sendMessage(toPhoneNumber: string, message: string): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp Service is not ready to send messages.');
    }

    // Format phone number to WhatsApp format (e.g. 5211234567890@c.us)
    let formattedNumber = toPhoneNumber.replace(/\D/g, '');
    
    // Append '@c.us' suffix for standard WhatsApp user chats
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber = `${formattedNumber}@c.us`;
    }

    await this.client.sendMessage(formattedNumber, message);
  }

  public getStatus(): boolean {
    return this.isReady;
  }

  public async logout(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout();
      } catch (err) {
        console.error('Error logging out WhatsApp client:', err);
      }
      await this.destroy();
    }

    const sessionPath = path.resolve(this.dataPath || './data/auth', 'session');
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('[SUCCESS] WhatsApp session folder removed.');
      } catch (err) {
        console.error('Failed to remove WhatsApp session directory:', err);
      }
    }
  }

  public async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('Error destroying WhatsApp client:', err);
      }
      this.client = null;
      this.isReady = false;
    }
  }
}
