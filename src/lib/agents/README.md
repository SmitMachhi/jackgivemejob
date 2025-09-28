# Multi-Language AI Translation Agent

A comprehensive translation system with language-specific configurations, validation rules, and fallback mechanisms.

## Features

- **Multi-language Support**: 10+ languages with specific configurations
- **Language-specific Validation**: Custom validation rules per language
- **Fallback Mechanisms**: Automatic fallback to similar languages
- **Batch Processing**: Efficient batch translation capabilities
- **Token Management**: Configurable token limits per language
- **Quality Scoring**: Confidence scoring based on validation results
- **Cultural Context**: Language-specific cultural considerations

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Russian (ru)
- Vietnamese (vi)

## Quick Start

```typescript
import TranslationService from './translation-service';

const service = new TranslationService({
  openaiApiKey: process.env.OPENAI_API_KEY,
});

// Basic translation
const result = await service.translate(
  'Hello, world!',
  'es'
);

console.log(result.translatedText); // "¡Hola, mundo!"
```

## Advanced Usage

```typescript
const result = await service.translate(
  'The user interface should be intuitive.',
  'vi',
  {
    sourceLanguage: 'en',
    context: 'Software documentation',
    style: 'formal',
    industry: 'technology',
    maxTokens: 500
  }
);
```

## Configuration

### Language Configuration

Each language has specific configurations:

- **Prompt Templates**: Language-specific translation prompts
- **Validation Rules**: Custom validation for character sets, grammar, etc.
- **Token Limits**: Different token limits per language
- **Fallback Languages**: Automatic fallback options
- **Cultural Context**: Language-specific cultural considerations

### Validation Rules

The system includes multiple validation rules:

1. **Length Validation**: Ensures translation length is reasonable
2. **Character Set Validation**: Validates proper character usage
3. **Content Integrity**: Ensures key content is preserved
4. **Grammar Validation**: Basic grammar and structure checks
5. **Language-specific Rules**: Custom rules per language (accents, characters, etc.)

## API Reference

### TranslationService

#### Constructor

```typescript
constructor(config: TranslationServiceConfig)
```

#### Methods

- `translate(text, targetLanguage, options?)`: Translate single text
- `batchTranslate(requests)`: Translate multiple texts
- `getSupportedLanguages()`: Get list of supported languages
- `detectLanguage(text)`: Detect language of text

### TranslationResponse

```typescript
interface TranslationResponse {
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
```

## Examples

See `usage-examples.ts` for comprehensive examples:

- Basic translation
- Advanced translation with options
- Batch processing
- Validation examples
- Fallback mechanisms
- Language detection

## Error Handling

The system includes comprehensive error handling:

- Retry mechanisms for API failures
- Fallback languages when primary translation fails
- Validation error reporting with suggestions
- Graceful degradation when services are unavailable

## Customization

### Adding New Languages

```typescript
const newLanguageConfig: LanguageConfig = {
  code: 'new',
  name: 'New Language',
  direction: 'ltr',
  promptTemplate: 'Custom prompt template...',
  validationRules: [/* custom rules */],
  tokenLimit: 2000,
  fallbackLanguages: ['en'],
  formalLevel: 'neutral'
};

service.agent.registerLanguage(newLanguageConfig);
```

### Custom Validation Rules

```typescript
const customRule: ValidationRule = {
  id: 'custom-rule',
  name: 'Custom Validation',
  description: 'Custom validation rule',
  severity: 'high',
  checkFunction: (translatedText: string, originalText: string) => {
    // Custom validation logic
    return { passed: true, score: 1.0 };
  }
};
```

## Performance Considerations

- Token limits are configurable per language
- Batch processing for efficiency
- Retry mechanisms for reliability
- Fallback options for robustness
- Validation caching to reduce API calls

## Environment Variables

Required:

- `OPENAI_API_KEY`: OpenAI API key for translation

Optional:

- `TRANSLATION_MODEL`: Default model (default: gpt-4)
- `TRANSLATION_TEMPERATURE`: Default temperature (default: 0.3)
- `TRANSLATION_MAX_RETRIES`: Maximum retry attempts (default: 3)