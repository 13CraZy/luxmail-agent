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

  private async callOllama(prompt: string, json: boolean = false, systemMessage?: string): Promise<string> {
    const endpoint = this.config.ollamaEndpoint || 'http://localhost:11434';
    const model = this.config.modelName || 'llama3';
    const url = `${endpoint}/api/generate`;
    const body: any = {
      model,
      prompt,
      stream: false,
    };
    if (json) {
      body.format = 'json';
    }
    if (systemMessage) {
      body.system = systemMessage;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP error! status: ${res.status}`);
    }

    const data: any = await res.json();
    return data.response;
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
          model: this.config.modelName || 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText.trim()) as ClassificationResult;
      }

      if (this.config.provider === 'ollama') {
        const responseText = await this.callOllama(prompt, true);
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
      
      // Local rule-based fallback to guarantee clean UI without raw JSON errors
      const isPriority = subject.toLowerCase().includes('interview') || subject.toLowerCase().includes('schedule');
      const category: 'Interview' | 'Job Offer' | 'Reject' | 'Spam' | 'General' = isPriority ? 'Interview' 
                     : (subject.toLowerCase().includes('rejection') || body.toLowerCase().includes('proceed with another')) ? 'Reject'
                     : (subject.toLowerCase().includes('offer') || body.toLowerCase().includes('job offer')) ? 'Job Offer'
                     : (subject.toLowerCase().includes('discount') || subject.toLowerCase().includes('promo')) ? 'Spam'
                     : 'General';
      const urgency: 'low' | 'medium' | 'high' = isPriority ? 'high' : 'low';
      
      const isSpanish = language === 'es';
      const mapping: Record<string, string> = {
        'Interview': 'Entrevista',
        'Job Offer': 'Oferta de Trabajo',
        'Reject': 'Rechazo',
        'Spam': 'Spam',
        'General': 'General'
      };
      const categoryText = isSpanish ? (mapping[category] || category) : category;
      const summary = isSpanish
        ? `[Respaldo de Emergencia] Analizado localmente. Categoría: ${categoryText}. Remitente: ${sender}.`
        : `[Emergency Fallback] Analyzed locally. Category: ${category}. Sender: ${sender}.`;

      return {
        isPriority,
        category,
        urgency,
        summary,
      };
    }
  }

  public async shouldNotifyUser(
    sender: string,
    subject: string,
    summary: string,
    category: string,
    urgency: string,
    isPriority: boolean,
    userRules: string | undefined
  ): Promise<boolean> {
    if (!userRules || userRules.trim() === '') {
      return isPriority;
    }

    const prompt = `
You are an email notification router. Decide if this email should trigger a mobile notification based on the user's custom routing rules.

EMAIL INFO:
- Sender: ${sender}
- Subject: ${subject}
- Category: ${category}
- Urgency: ${urgency}
- Summary: ${summary}
- Auto-Classification Priority: ${isPriority}

USER'S CUSTOM ROUTING RULES:
"${userRules}"

Return a JSON object matching this schema:
{
  "shouldNotify": boolean
}
`;

    try {
      if (this.config.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: this.config.modelName || 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText.trim());
        return !!parsed.shouldNotify;
      }

      if (this.config.provider === 'ollama') {
        const responseText = await this.callOllama(prompt, true);
        const parsed = JSON.parse(responseText.trim());
        return !!parsed.shouldNotify;
      }

      if (this.openaiClient) {
        const modelName = this.config.provider === 'deepseek'
          ? (this.config.modelName || 'deepseek-chat')
          : (this.config.modelName || 'gpt-4o-mini');

        const response = await this.openaiClient.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an email notification router. Always output structured JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const responseText = response.choices[0]?.message.content || '{}';
        const parsed = JSON.parse(responseText.trim());
        return !!parsed.shouldNotify;
      }

      throw new Error('AI Provider Client not initialized.');
    } catch (err) {
      console.error('Error during notification routing analysis:', err);
      // Fallback to isPriority on failure
      return isPriority;
    }
  }

  public async translateChatQueryToSearchCriteria(query: string, todayDate: string): Promise<{
    since?: string;
    before?: string;
    from?: string;
    subject?: string;
    body?: string;
    keywords?: string[];
  }> {
    const prompt = `
You are the IMAP query builder for LuxMail. Convert the user's natural language request into a clean JSON object filter for an IMAP search.
Today is ${todayDate}.
User query: "${query}"

RULES FOR BUILDING THE IMAP FILTER:
1. HIGH RECALL PRINCIPLE: IMAP search is primitive and combines fields using strict logical AND. To prevent missing important emails, keep the query as broad as possible.
2. DO NOT GUESS SUBJECT/BODY KEYWORDS: Do not add keywords like "respuesta", "correo", "mensaje", or "contacto" unless the user explicitly requested a specific subject text. Recruiters do not put the word "respuesta" in their email subjects.
3. HANDLE 'OR' CONDITIONS WITH KEYWORDS: If the user searches for multiple alternate entities/topics (e.g. "linkedin or indeed", "entrevistas o vacantes"), output them as a list of strings in the "keywords" field instead of placing them as an AND string in "body".
4. DATE FILTERING: Always set "since" and "before" if a date range is mentioned or strongly implied, calculating the YYYY-MM-DD dates relative to today (${todayDate}).

Return a JSON object matching this schema. Only include fields if they are explicitly mentioned or strongly implied by the search query:
{
  "since": "string (YYYY-MM-DD format if date limit specified or implied. For example: if they ask for 'yesterday', calculate YYYY-MM-DD for yesterday based on today: ${todayDate})",
  "before": "string (YYYY-MM-DD format if date limit specified)",
  "from": "string (sender's email address or name keyword if searching by sender)",
  "subject": "string (subject keyword if searching for specific subjects)",
  "body": "string (body keyword if searching for specific content in body)",
  "keywords": ["array of strings (alternative candidate keywords to search for in body or subject, e.g. ['linkedin', 'indeed']. Use when there are multiple possibilities or OR relationships.)"]
}
`;

    try {
      if (this.config.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: this.config.modelName || 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().trim());
      }

      if (this.config.provider === 'ollama') {
        const responseText = await this.callOllama(prompt, true);
        return JSON.parse(responseText.trim());
      }

      if (this.openaiClient) {
        const modelName = this.config.provider === 'deepseek'
          ? (this.config.modelName || 'deepseek-chat')
          : (this.config.modelName || 'gpt-4o-mini');

        const response = await this.openaiClient.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an IMAP query builder. Always output structured JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0]?.message.content || '{}');
      }

      throw new Error('AI Provider Client not initialized.');
    } catch (err) {
      console.error('Error during query translation:', err);
      return {};
    }
  }

  public async generateChatResponse(
    query: string,
    emails: { sender: string; subject: string; date: string; bodySummary: string }[],
    language: 'en' | 'es' = 'en'
  ): Promise<string> {
    const targetLang = language === 'es' ? 'Spanish' : 'English';
    const emailsContext = emails.length === 0 
      ? "No matching emails were found in the mailbox." 
      : JSON.stringify(emails, null, 2);

    const systemPrompt = `
You are LuxMail Agent, a premium AI assistant for residence and career emails.
Your task is to answer the user's question based ONLY on the email data provided.
DO NOT answer general questions or perform research unrelated to these emails.
If the user asks an unrelated question (e.g. general knowledge, coding, math, world events), politely decline to answer, stating that you can only assist with their email queries.

Email Data:
${emailsContext}

User Question:
"${query}"

Write your response in ${targetLang}. Be highly professional, direct, and concise. Avoid fluff.
`;

    try {
      if (this.config.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: this.config.modelName || 'gemini-2.5-flash',
        });
        const result = await model.generateContent(systemPrompt);
        return result.response.text().trim();
      }

      if (this.config.provider === 'ollama') {
        return await this.callOllama(systemPrompt, false);
      }

      if (this.openaiClient) {
        const modelName = this.config.provider === 'deepseek'
          ? (this.config.modelName || 'deepseek-chat')
          : (this.config.modelName || 'gpt-4o-mini');

        const response = await this.openaiClient.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are LuxMail Agent. Answer queries based strictly on the email context provided.' },
            { role: 'user', content: systemPrompt }
          ],
        });
        return response.choices[0]?.message.content || 'Error generating response';
      }

      throw new Error('AI Provider Client not initialized.');
    } catch (err) {
      console.error('Error generating chat response:', err);
      return language === 'es' 
        ? 'Lo siento, no pude procesar tu solicitud de chat debido a un límite de cuota o error temporal de la IA. Por favor, intenta de nuevo.'
        : 'Sorry, I could not process your chat request right now due to a temporary quota limit or AI error. Please try again.';
    }
  }
}
