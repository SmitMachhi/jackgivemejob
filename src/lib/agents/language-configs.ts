import { LanguageConfig, ValidationRule, ValidationResult } from './translation-agent';

export const validationRules: Record<string, ValidationRule[]> = {
  length: [
    {
      id: 'length-check',
      name: 'Length Validation',
      description: 'Ensures translation length is within reasonable bounds',
      severity: 'medium',
      checkFunction: (translatedText: string, originalText: string): ValidationResult => {
        const ratio = translatedText.length / originalText.length;
        if (ratio < 0.3 || ratio > 3) {
          return {
            passed: false,
            message: `Translation length ratio (${ratio.toFixed(2)}) is outside acceptable range`,
            suggestions: ['Review translation for completeness', 'Check for truncation or padding'],
            id: 'length-check',
            name: 'Length Validation',
            description: 'Ensures translation length is within reasonable bounds'
          };
        }
        return { passed: true, id: 'length-check', name: 'Length Validation', description: 'Length validation passed' };
      }
    }
  ],

  characters: [
    {
      id: 'character-check',
      name: 'Character Set Validation',
      description: 'Ensures translation uses appropriate character set',
      severity: 'critical',
      checkFunction: (translatedText: string): ValidationResult => {
        const hasInvalidChars = /[\x00-\x1F\x7F-\x9F]/.test(translatedText);
        if (hasInvalidChars) {
          return {
            passed: false,
            message: 'Translation contains invalid control characters',
            suggestions: ['Remove or replace special characters', 'Ensure proper text encoding'],
            id: 'character-check',
            name: 'Character Set Validation',
            description: 'Ensures translation uses appropriate character set'
          };
        }
        return { passed: true, id: 'character-check', name: 'Character Set Validation', description: 'Character validation passed' };
      }
    }
  ],

  content: [
    {
      id: 'content-check',
      name: 'Content Integrity',
      description: 'Ensures translation maintains essential content',
      severity: 'critical',
      checkFunction: (translatedText: string, originalText: string): ValidationResult => {
        const originalWords = new Set(originalText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const translatedWords = new Set(translatedText.toLowerCase().split(/\s+/));

        const missingWords = Array.from(originalWords).filter(word =>
          !translatedWords.has(word) && !translatedWords.has(word.replace(/[^\w]/g, ''))
        );

        if (missingWords.length > originalWords.size * 0.3) {
          return {
            passed: false,
            message: 'Translation may be missing significant content',
            suggestions: ['Review for missing key terms', 'Ensure technical terms are preserved'],
            id: 'content-check',
            name: 'Content Integrity',
            description: 'Ensures translation maintains essential content'
          };
        }
        return { passed: true, id: 'content-check', name: 'Content Integrity', description: 'Content validation passed' };
      }
    }
  ],

  grammar: [
    {
      id: 'grammar-check',
      name: 'Grammar and Structure',
      description: 'Basic grammar validation',
      severity: 'high',
      checkFunction: (translatedText: string): ValidationResult => {
        const sentences = translatedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const issues: string[] = [];

        sentences.forEach((sentence, index) => {
          if (sentence.trim().length > 0) {
            const firstChar = sentence.trim()[0];
            if (!firstChar.match(/[A-ZÀ-Ý]/)) {
              issues.push(`Sentence ${index + 1} doesn't start with capital letter`);
            }

            if (sentence.includes('  ')) {
              issues.push(`Sentence ${index + 1} contains double spaces`);
            }
          }
        });

        if (issues.length > 0) {
          return {
            passed: false,
            message: 'Grammar issues detected',
            suggestions: issues,
            id: 'grammar-check',
            name: 'Grammar and Structure',
            description: 'Basic grammar validation'
          };
        }
        return { passed: true, id: 'grammar-check', name: 'Grammar and Structure', description: 'Grammar validation passed' };
      }
    }
  ]
};

export const languageConfigs: LanguageConfig[] = [
  {
    code: 'vi',
    name: 'Vietnamese',
    direction: 'ltr',
    promptTemplate: `Dịch văn bản sau từ {{SOURCE_LANGUAGE}} sang tiếng Việt:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Chỉ cung cấp bản dịch mà không có bất kỳ văn bản hoặc giải thích bổ sung nào.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'vietnamese-diacritics',
        name: 'Vietnamese Diacritics Validation',
        description: 'Ensures proper use of Vietnamese diacritics',
        severity: 'high',
        checkFunction: (translatedText: string): ValidationResult => {
          const hasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(translatedText);
          const hasCommonWords = translatedText.toLowerCase().includes('và') ||
                                translatedText.toLowerCase().includes('là') ||
                                translatedText.toLowerCase().includes('của');

          if (hasCommonWords && !hasDiacritics && translatedText.length > 20) {
            return {
              passed: false,
              message: 'Vietnamese translation may be missing diacritics',
              suggestions: ['Review for missing diacritics in Vietnamese words'],
              id: 'vietnamese-diacritics',
              name: 'Vietnamese Diacritics Validation',
              description: 'Ensures proper use of Vietnamese diacritics'
            };
          }
          return { passed: true, id: 'vietnamese-diacritics', name: 'Vietnamese Diacritics Validation', description: 'Vietnamese diacritics validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en', 'hi'],
    formalLevel: 'neutral',
    culturalContext: 'Standard Vietnamese with proper diacritics'
  },

  {
    code: 'hi',
    name: 'Hindi',
    direction: 'ltr',
    promptTemplate: `निम्नलिखित पाठ का {{SOURCE_LANGUAGE}} से हिंदी में अनुवाद करें:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

केवल अनुवाद प्रदान करें, कोई अतिरिक्त पाठ या स्पष्टीकरण नहीं।`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'hindi-characters',
        name: 'Hindi Character Validation',
        description: 'Ensures proper Hindi characters are used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const hindiCharCount = (translatedText.match(/[\u0900-\u097F]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (hindiCharCount < totalCharCount * 0.5 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Hindi characters',
              suggestions: ['Ensure translation uses proper Devanagari script'],
              id: 'hindi-characters',
              name: 'Hindi Character Validation',
              description: 'Ensures proper Hindi characters are used'
            };
          }
          return { passed: true, id: 'hindi-characters', name: 'Hindi Character Validation', description: 'Hindi character validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en', 'vi'],
    formalLevel: 'formal',
    culturalContext: 'Formal Hindi with proper Devanagari script and respectful address'
  },

  {
    code: 'fr',
    name: 'French',
    direction: 'ltr',
    promptTemplate: `Traduisez le texte suivant du {{SOURCE_LANGUAGE}} vers le français :

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Fournissez uniquement la traduction sans aucun texte supplémentaire ou explication.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'french-accents',
        name: 'French Accent Validation',
        description: 'Ensures proper use of French accents',
        severity: 'high',
        checkFunction: (translatedText: string): ValidationResult => {
          const commonWords = ['le', 'la', 'de', 'que', 'et', 'à', 'en', 'un', 'est', 'se'];
          const hasAccents = /[àâäçéèêëïîôùûüÿñ]/i.test(translatedText);
          const hasCommonWords = commonWords.some(word =>
            translatedText.toLowerCase().includes(word)
          );

          if (hasCommonWords && !hasAccents && translatedText.length > 20) {
            return {
              passed: false,
              message: 'French translation may be missing accents',
              suggestions: ['Review for missing accents in French words'],
              id: 'french-accents',
              name: 'French Accent Validation',
              description: 'Ensures proper use of French accents'
            };
          }
          return { passed: true, id: 'french-accents', name: 'French Accent Validation', description: 'French accent validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en', 'es'],
    formalLevel: 'formal',
    culturalContext: 'Formal French with proper accents and formal address'
  },

  {
    code: 'es',
    name: 'Spanish',
    direction: 'ltr',
    promptTemplate: `Traduce el siguiente texto del {{SOURCE_LANGUAGE}} al español:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Proporciona solo la traducción sin ningún texto adicional o explicaciones.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'spanish-accents',
        name: 'Spanish Accent Validation',
        description: 'Ensures proper use of Spanish accents',
        severity: 'high',
        checkFunction: (translatedText: string): ValidationResult => {
          const commonWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'];
          const hasAccents = /[áéíóúñ]/i.test(translatedText);
          const hasCommonWords = commonWords.some(word =>
            translatedText.toLowerCase().includes(word)
          );

          if (hasCommonWords && !hasAccents && translatedText.length > 20) {
            return {
              passed: false,
              message: 'Spanish translation may be missing accents',
              suggestions: ['Review for missing accents in Spanish words'],
              id: 'spanish-accents',
              name: 'Spanish Accent Validation',
              description: 'Ensures proper use of Spanish accents'
            };
          }
          return { passed: true, id: 'spanish-accents', name: 'Spanish Accent Validation', description: 'Spanish accent validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en', 'fr'],
    formalLevel: 'formal',
    culturalContext: 'Formal Spanish with proper accents and formal address'
  }
];