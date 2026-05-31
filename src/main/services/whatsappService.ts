import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export class WhatsappService {
  private client: Client | null = null;
  private isReady = false;
  private onQrCallback: ((qr: string) => void) | null = null;
  private onReadyCallback: (() => void) | null = null;

  constructor() {}

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
        dataPath: './data/auth' // Persisted path for WhatsApp login token session
      }),
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
          '--single-process',
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

    this.client.initialize();
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
}
