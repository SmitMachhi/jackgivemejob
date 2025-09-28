import TranslationService, { TranslationServiceConfig } from './translation-service';

export const createTranslationService = (config: TranslationServiceConfig) => {
  return new TranslationService(config);
};

export const translationExamples = {
  basicTranslation: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
    });

    const result = await service.translate(
      'Hello, how are you?',
      'es'
    );

    console.log('Translation:', result.translatedText);
    console.log('Confidence:', result.confidence);
    console.log('Validation results:', result.validationResults);
  },

  advancedTranslation: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4',
      temperature: 0.3,
    });

    const result = await service.translate(
      'The user interface should be intuitive and user-friendly.',
      'vi',
      {
        sourceLanguage: 'en',
        context: 'Software documentation',
        style: 'formal',
        industry: 'technology',
        maxTokens: 500
      }
    );

    console.log('Advanced translation:', result.translatedText);
    console.log('Processing time:', result.processingTime, 'ms');
    console.log('Token usage:', result.tokenUsage);
  },

  batchTranslation: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
    });

    const results = await service.batchTranslate([
      { text: 'Hello world', targetLanguage: 'fr' },
      { text: 'Good morning', targetLanguage: 'de' },
      { text: 'Thank you', targetLanguage: 'ja' },
    ]);

    results.forEach((result, index) => {
      console.log(`Translation ${index + 1}:`, result.translatedText);
      console.log(`Confidence ${index + 1}:`, result.confidence);
    });
  },

  validationExample: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      enableValidation: true,
    });

    const result = await service.translate(
      'This is a test message with special characters: @#$%',
      'es'
    );

    console.log('Validation Results:');
    result.validationResults.forEach(validation => {
      console.log(`- ${validation.name}: ${validation.passed ? 'PASSED' : 'FAILED'}`);
      if (!validation.passed && validation.message) {
        console.log(`  Message: ${validation.message}`);
      }
      if (validation.suggestions) {
        console.log(`  Suggestions: ${validation.suggestions.join(', ')}`);
      }
    });
  },

  fallbackExample: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      enableFallback: true,
    });

    const result = await service.translate(
      'Complex technical content that might fail translation',
      'xx' // Invalid language code to trigger fallback
    );

    console.log('Fallback used:', result.fallbackUsed);
    console.log('Final translation:', result.translatedText);
  },

  getSupportedLanguages: async () => {
    const service = createTranslationService({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
    });

    const languages = service.getSupportedLanguages();

    console.log('Supported languages:');
    languages.forEach(lang => {
      console.log(`- ${lang.name} (${lang.code})`);
      console.log(`  Direction: ${lang.direction}`);
      console.log(`  Formal level: ${lang.formalLevel}`);
      console.log(`  Token limit: ${lang.tokenLimit}`);
      if (lang.fallbackLanguages) {
        console.log(`  Fallback languages: ${lang.fallbackLanguages.join(', ')}`);
      }
    });
  }
};

if (require.main === module) {
  (async () => {
    console.log('Running translation examples...');

    try {
      await translationExamples.basicTranslation();
      await translationExamples.advancedTranslation();
      await translationExamples.batchTranslation();
      await translationExamples.validationExample();
      await translationExamples.getSupportedLanguages();
    } catch (error) {
      console.error('Example failed:', error);
    }
  })();
}