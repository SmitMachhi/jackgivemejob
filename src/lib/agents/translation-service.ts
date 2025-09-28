import OpenAI from 'openai';
import TranslationAgent from './translation-agent';
import { languageConfigs } from './language-configs';
import { TranslationRequest, TranslationResponse } from './translation-agent';

export interface TranslationServiceConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
  retryAttempts?: number;
  enableValidation?: boolean;
  enableFallback?: boolean;
}

export class TranslationService {
  private agent: TranslationAgent;

  constructor(config: TranslationServiceConfig) {
    const openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.agent = new TranslationAgent({
      openai,
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.3,
      retryAttempts: config.retryAttempts || 3,
      enableValidation: config.enableValidation ?? true,
      enableFallback: config.enableFallback ?? true,
    });

    this.initializeLanguages();
  }

  private initializeLanguages(): void {
    languageConfigs.forEach(config => {
      this.agent.registerLanguage(config);
    });
  }

  public async translate(
    text: string,
    targetLanguage: string,
    options?: {
      sourceLanguage?: string;
      context?: string;
      style?: 'formal' | 'informal' | 'neutral';
      industry?: string;
      maxTokens?: number;
    }
  ): Promise<TranslationResponse> {
    const request: TranslationRequest = {
      text,
      sourceLanguage: options?.sourceLanguage || 'auto',
      targetLanguage,
      context: options?.context,
      style: options?.style,
      industry: options?.industry,
      maxTokens: options?.maxTokens,
    };

    return this.agent.translate(request);
  }

  public async batchTranslate(
    requests: Array<{
      text: string;
      targetLanguage: string;
      sourceLanguage?: string;
      context?: string;
      style?: 'formal' | 'informal' | 'neutral';
      industry?: string;
      maxTokens?: number;
    }>
  ): Promise<TranslationResponse[]> {
    const translationRequests: TranslationRequest[] = requests.map(req => ({
      text: req.text,
      sourceLanguage: req.sourceLanguage || 'auto',
      targetLanguage: req.targetLanguage,
      context: req.context,
      style: req.style,
      industry: req.industry,
      maxTokens: req.maxTokens,
    }));

    return this.agent.batchTranslate(translationRequests);
  }

  public getSupportedLanguages() {
    return this.agent.getSupportedLanguages();
  }

  public async detectLanguage(text: string): Promise<string> {
    try {
      const response = await this.translate(text, 'en', { sourceLanguage: 'auto' });
      return response.languageDetected || 'en';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en';
    }
  }
}

export default TranslationService;