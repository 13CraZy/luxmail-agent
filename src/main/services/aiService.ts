import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { AIConfig } from '../../shared/types';

export interface ClassificationResult {
  isPriority: boolean;
  category: 'Interview' | 'Job Offer' | 'Reject' | 'Spam' | 'General';
  urgency: 'low' | 'medium' | 'high';
  summary: string;
}

export class AIService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiClient: OpenAI | null = null;

  constructor(private config: AIConfig) {
    this.initializeClient();
  }

  private initializeClient() {
    if (this.config.provider === 'gemini') {
      this.geminiClient = new GoogleGenerativeAI(this.config.apiKeyHex);
    } else if (this.config.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKeyHex,
      });
    } else if (this.config.provider === 'deepseek') {
      // DeepSeek is fully compatible with the OpenAI API protocol
      this.openaiClient = new OpenAI({
        baseURL: this.config.customEndpoint || 'https://api.deepseek.com/v1',
        apiKey: this.config.apiKeyHex,
      });
    }
  }

  public async classifyEmail(sender: string, subject: string, body: string, language: 'en' | 'es' = 'en'): Promise<ClassificationResult> {
    const summaryLanguage = language === 'es' ? 'Spanish' : 'English';
    const prompt = `
You are an advanced email classification agent. Analyze the following email details and classify them.
SENDER: ${sender}
SUBJECT: ${subject}
BODY: ${body}

Return a JSON object matching this schema:
{
  "isPriority": boolean (true if it is a job interview invitation, job offer, technical test request, or direct follow-up from a recruiter),
  "category": "Interview" | "Job Offer" | "Reject" | "Spam" | "General",
  "urgency": "low" | "medium" | "high",
  "summary": "string (brief summary in ${summaryLanguage} of what the email says and any action items)"
}
`;

    try {
      if (this.config.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: this.config.modelName || 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText.trim()) as ClassificationResult;
      }

      if (this.openaiClient) {
        const modelName = this.config.provider === 'deepseek'
          ? (this.config.modelName || 'deepseek-chat')
          : (this.config.modelName || 'gpt-4o-mini');

        const response = await this.openaiClient.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an email parser. Always output structured JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const responseText = response.choices[0]?.message.content || '{}';
        return JSON.parse(responseText.trim()) as ClassificationResult;
      }

      throw new Error('AI Provider Client not initialized.');
    } catch (err) {
      console.error('Error during AI classification:', err);
      // Fallback response in case of API failure
      return {
        isPriority: false,
        category: 'General',
        urgency: 'low',
        summary: `Error during classification: ${(err as Error).message}. Sender: ${sender}`,
      };
    }
  }
}
