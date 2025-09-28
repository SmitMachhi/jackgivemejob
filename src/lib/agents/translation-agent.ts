import OpenAI from 'openai';

export interface LanguageConfig {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  promptTemplate: string;
  validationRules: ValidationRule[];
  tokenLimit: number;
  fallbackLanguages?: string[];
  culturalContext?: string;
  formalLevel: 'formal' | 'informal' | 'neutral';
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  checkFunction: (text: string, originalText: string) => ValidationResult;
}

export interface ValidationResult {
  passed: boolean;
  message?: string;
  suggestions?: string[];
  score?: number;
  id: string;
  name: string;
  description: string;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  style?: 'formal' | 'informal' | 'neutral';
  industry?: string;
  maxTokens?: number;
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  languageDetected?: string;
  validationResults: ValidationResult[];
  fallbackUsed?: boolean;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime: number;
}

export interface TranslationAgentConfig {
  openai: OpenAI;
  model?: string;
  temperature?: number;
  retryAttempts?: number;
  enableValidation?: boolean;
  enableFallback?: boolean;
}

class TranslationAgent {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private retryAttempts: number;
  private enableValidation: boolean;
  private enableFallback: boolean;

  constructor(config: TranslationAgentConfig) {
    this.openai = config.openai;
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature || 0.3;
    this.retryAttempts = config.retryAttempts || 3;
    this.enableValidation = config.enableValidation ?? true;
    this.enableFallback = config.enableFallback ?? true;
  }

  private languageConfigs: Map<string, LanguageConfig> = new Map();

  public registerLanguage(config: LanguageConfig): void {
    this.languageConfigs.set(config.code, config);
  }

  public getLanguageConfig(code: string): LanguageConfig | undefined {
    return this.languageConfigs.get(code);
  }

  private buildPrompt(request: TranslationRequest, targetConfig: LanguageConfig): string {
    const contextSection = request.context
      ? `\nContext: ${request.context}`
      : '';

    const styleSection = request.style && request.style !== targetConfig.formalLevel
      ? `\nStyle: ${request.style}`
      : '';

    const industrySection = request.industry
      ? `\nIndustry: ${request.industry}`
      : '';

    const maxTokensSection = request.maxTokens
      ? `\nMaximum tokens: ${request.maxTokens}`
      : '';

    return targetConfig.promptTemplate
      .replace('{{SOURCE_TEXT}}', request.text)
      .replace('{{SOURCE_LANGUAGE}}', request.sourceLanguage)
      .replace('{{TARGET_LANGUAGE}}', targetConfig.name)
      .replace('{{CONTEXT}}', contextSection)
      .replace('{{STYLE}}', styleSection)
      .replace('{{INDUSTRY}}', industrySection)
      .replace('{{MAX_TOKENS}}', maxTokensSection);
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in multilingual content translation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.temperature,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || '';
  }

  private async validateTranslation(
    translatedText: string,
    originalText: string,
    targetConfig: LanguageConfig
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (!this.enableValidation) {
      return results;
    }

    for (const rule of targetConfig.validationRules) {
      try {
        const result = rule.checkFunction(translatedText, originalText);
        results.push({
          ...result,
          id: rule.id,
          name: rule.name,
          description: rule.description
        });
      } catch (error) {
        results.push({
          passed: false,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          id: rule.id,
          name: rule.name,
          description: rule.description
        });
      }
    }

    return results;
  }

  private async attemptTranslation(
    request: TranslationRequest,
    targetConfig: LanguageConfig
  ): Promise<TranslationResponse> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(request, targetConfig);
    const translatedText = await this.callOpenAI(prompt);
    const validationResults = await this.validateTranslation(translatedText, request.text, targetConfig);

    const processingTime = Date.now() - startTime;
    const estimatedTokens = Math.ceil((prompt.length + translatedText.length) / 4);

    return {
      translatedText,
      confidence: this.calculateConfidence(validationResults),
      validationResults,
      fallbackUsed: false,
      tokenUsage: {
        prompt: Math.ceil(prompt.length / 4),
        completion: Math.ceil(translatedText.length / 4),
        total: estimatedTokens
      },
      processingTime
    };
  }

  private calculateConfidence(validationResults: ValidationResult[]): number {
    if (validationResults.length === 0) return 0.9;

    const passed = validationResults.filter(r => r.passed).length;
    const weightedScore = validationResults.reduce((sum, result) => {
      const weight = this.getSeverityWeight(result);
      return sum + (result.passed ? weight : 0);
    }, 0);

    const totalWeight = validationResults.reduce((sum, result) => {
      return sum + this.getSeverityWeight(result);
    }, 0);

    return totalWeight > 0 ? weightedScore / totalWeight : 0.9;
  }

  private getSeverityWeight(result: ValidationResult): number {
    const severityMap = {
      critical: 0.4,
      high: 0.3,
      medium: 0.2,
      low: 0.1
    };
    return severityMap[result.id.includes('critical') ? 'critical' :
             result.id.includes('high') ? 'high' :
             result.id.includes('medium') ? 'medium' : 'low'];
  }

  public async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const targetConfig = this.getLanguageConfig(request.targetLanguage);

    if (!targetConfig) {
      throw new Error(`Unsupported target language: ${request.targetLanguage}`);
    }

    try {
      return await this.attemptTranslation(request, targetConfig);
    } catch (error) {
      if (this.enableFallback && targetConfig.fallbackLanguages && targetConfig.fallbackLanguages.length > 0) {
        for (const fallbackLang of targetConfig.fallbackLanguages) {
          try {
            const fallbackConfig = this.getLanguageConfig(fallbackLang);
            if (fallbackConfig) {
              const result = await this.attemptTranslation(request, fallbackConfig);
              result.fallbackUsed = true;
              return result;
            }
          } catch (fallbackError) {
            console.warn(`Fallback to ${fallbackLang} failed:`, fallbackError);
          }
        }
      }
      throw error;
    }
  }

  public async batchTranslate(requests: TranslationRequest[]): Promise<TranslationResponse[]> {
    const results: TranslationResponse[] = [];

    for (const request of requests) {
      try {
        const result = await this.translate(request);
        results.push(result);
      } catch (error) {
        results.push({
          translatedText: '',
          confidence: 0,
          validationResults: [{
            passed: false,
            message: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            id: 'error-result',
            name: 'Translation Error',
            description: 'Translation processing error'
          }],
          fallbackUsed: false,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          processingTime: 0
        });
      }
    }

    return results;
  }

  public getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languageConfigs.values());
  }
}

export default TranslationAgent;