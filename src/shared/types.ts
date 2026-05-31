export interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  passwordHex: string;
  secure: boolean;
}

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKeyHex: string;
  customEndpoint?: string;
  modelName?: string;
  ollamaEndpoint?: string;
}

export interface AgentConfig {
  imap: IMAPConfig;
  ai: AIConfig;
  whatsappEnabled: boolean;
  telegramEnabled: boolean;
  telegramTokenHex?: string;
  telegramChatId?: string;
  urgencyThreshold: 'low' | 'medium' | 'high';
  language?: 'en' | 'es';
  notificationRules?: string;
  notificationPhone?: string;
  dndEnabled: boolean;
  dndStart?: string;
  dndEnd?: string;
  priorityCategories?: string[];
}

export interface SystemStatus {
  imapConnected: boolean | 'reconnecting';
  whatsappConnected: boolean;
  aiConnected: boolean;
}

export interface MailLog {
  id: string;
  timestamp: string;
  sender: string;
  subject: string;
  summary: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  notified: boolean;
}

export interface ConsoleLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}
