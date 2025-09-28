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
    code: 'en',
    name: 'English',
    direction: 'ltr',
    promptTemplate: `Translate the following text from {{SOURCE_LANGUAGE}} to English:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Provide only the translation without any additional text or explanations.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      ...validationRules.grammar
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['es', 'fr'],
    formalLevel: 'neutral',
    culturalContext: 'Standard international English'
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
    code: 'de',
    name: 'German',
    direction: 'ltr',
    promptTemplate: `Übersetzen Sie den folgenden Text von {{SOURCE_LANGUAGE}} ins Deutsche:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Geben Sie nur die Übersetzung ohne zusätzlichen Text oder Erklärungen an.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'german-umlauts',
        name: 'German Umlaut Validation',
        description: 'Ensures proper use of German umlauts',
        severity: 'high',
        checkFunction: (translatedText: string): ValidationResult => {
          const hasUmlauts = /[äöüß]/i.test(translatedText);
          const hasCommonWords = translatedText.toLowerCase().includes('der') ||
                                translatedText.toLowerCase().includes('die') ||
                                translatedText.toLowerCase().includes('das');

          if (hasCommonWords && !hasUmlauts && translatedText.length > 20) {
            return {
              passed: false,
              message: 'German translation may be missing umlauts',
              suggestions: ['Review for missing umlauts in German words'],
              id: 'german-umlauts',
              name: 'German Umlaut Validation',
              description: 'Ensures proper use of German umlauts'
            };
          }
          return { passed: true, id: 'german-umlauts', name: 'German Umlaut Validation', description: 'German umlaut validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en'],
    formalLevel: 'formal',
    culturalContext: 'Formal German with proper capitalization and grammar'
  },

  {
    code: 'zh',
    name: 'Chinese',
    direction: 'ltr',
    promptTemplate: `将以下文本从{{SOURCE_LANGUAGE}}翻译成中文：

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

只提供翻译，不要提供任何额外的文本或解释。`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'chinese-characters',
        name: 'Chinese Character Validation',
        description: 'Ensures proper Chinese characters are used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const chineseCharCount = (translatedText.match(/[\u4e00-\u9fff]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (chineseCharCount < totalCharCount * 0.5 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Chinese characters',
              suggestions: ['Ensure translation uses proper Chinese characters'],
              id: 'chinese-characters',
              name: 'Chinese Character Validation',
              description: 'Ensures proper Chinese characters are used'
            };
          }
          return { passed: true, id: 'chinese-characters', name: 'Chinese Character Validation', description: 'Chinese character validation passed' };
        }
      }
    ],
    tokenLimit: 1500,
    fallbackLanguages: ['en'],
    formalLevel: 'neutral',
    culturalContext: 'Standard Chinese with simplified characters'
  },

  {
    code: 'ja',
    name: 'Japanese',
    direction: 'ltr',
    promptTemplate: `次のテキストを{{SOURCE_LANGUAGE}}から日本語に翻訳してください：

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

追加のテキストや説明を含めず、翻訳のみを提供してください。`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'japanese-characters',
        name: 'Japanese Character Validation',
        description: 'Ensures proper Japanese characters are used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const japaneseCharCount = (translatedText.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (japaneseCharCount < totalCharCount * 0.3 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Japanese characters',
              suggestions: ['Ensure translation uses proper Japanese characters (hiragana, katakana, kanji)'],
              id: 'japanese-characters',
              name: 'Japanese Character Validation',
              description: 'Ensures proper Japanese characters are used'
            };
          }
          return { passed: true, id: 'japanese-characters', name: 'Japanese Character Validation', description: 'Japanese character validation passed' };
        }
      }
    ],
    tokenLimit: 1500,
    fallbackLanguages: ['en', 'zh'],
    formalLevel: 'formal',
    culturalContext: 'Formal Japanese with proper honorifics'
  },

  {
    code: 'ko',
    name: 'Korean',
    direction: 'ltr',
    promptTemplate: `다음 텍스트를 {{SOURCE_LANGUAGE}}에서 한국어로 번역하세요:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

추가 텍스트나 설명 없이 번역만 제공하세요.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'korean-characters',
        name: 'Korean Character Validation',
        description: 'Ensures proper Korean characters are used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const koreanCharCount = (translatedText.match(/[\uac00-\ud7af]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (koreanCharCount < totalCharCount * 0.5 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Korean characters',
              suggestions: ['Ensure translation uses proper Korean characters (Hangul)'],
              id: 'korean-characters',
              name: 'Korean Character Validation',
              description: 'Ensures proper Korean characters are used'
            };
          }
          return { passed: true, id: 'korean-characters', name: 'Korean Character Validation', description: 'Korean character validation passed' };
        }
      }
    ],
    tokenLimit: 1500,
    fallbackLanguages: ['en', 'ja'],
    formalLevel: 'formal',
    culturalContext: 'Formal Korean with proper honorifics'
  },

  {
    code: 'ar',
    name: 'Arabic',
    direction: 'rtl',
    promptTemplate: `ترجم النص التالي من {{SOURCE_LANGUAGE}} إلى العربية:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

قدم فقط الترجمة دون أي نص إضافي أو شروحات.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'arabic-script',
        name: 'Arabic Script Validation',
        description: 'Ensures proper Arabic script is used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const arabicCharCount = (translatedText.match(/[\u0600-\u06ff]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (arabicCharCount < totalCharCount * 0.7 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Arabic characters',
              suggestions: ['Ensure translation uses proper Arabic script'],
              id: 'arabic-script',
              name: 'Arabic Script Validation',
              description: 'Ensures proper Arabic script is used'
            };
          }
          return { passed: true, id: 'arabic-script', name: 'Arabic Script Validation', description: 'Arabic script validation passed' };
        }
      }
    ],
    tokenLimit: 1500,
    fallbackLanguages: ['en'],
    formalLevel: 'formal',
    culturalContext: 'Formal Arabic with proper script and cultural sensitivity'
  },

  {
    code: 'ru',
    name: 'Russian',
    direction: 'ltr',
    promptTemplate: `Переведите следующий текст с {{SOURCE_LANGUAGE}} на русский:

{{SOURCE_TEXT}}

{{CONTEXT}}
{{STYLE}}
{{INDUSTRY}}
{{MAX_TOKENS}}

Предоставьте только перевод без дополнительного текста или пояснений.`,
    validationRules: [
      ...validationRules.length,
      ...validationRules.characters,
      ...validationRules.content,
      {
        id: 'cyrillic-characters',
        name: 'Cyrillic Character Validation',
        description: 'Ensures proper Cyrillic characters are used',
        severity: 'critical',
        checkFunction: (translatedText: string): ValidationResult => {
          const cyrillicCharCount = (translatedText.match(/[\u0400-\u04ff]/g) || []).length;
          const totalCharCount = translatedText.length;

          if (cyrillicCharCount < totalCharCount * 0.5 && totalCharCount > 10) {
            return {
              passed: false,
              message: 'Translation may not contain sufficient Cyrillic characters',
              suggestions: ['Ensure translation uses proper Cyrillic script'],
              id: 'cyrillic-characters',
              name: 'Cyrillic Character Validation',
              description: 'Ensures proper Cyrillic characters are used'
            };
          }
          return { passed: true, id: 'cyrillic-characters', name: 'Cyrillic Character Validation', description: 'Cyrillic character validation passed' };
        }
      }
    ],
    tokenLimit: 2000,
    fallbackLanguages: ['en'],
    formalLevel: 'formal',
    culturalContext: 'Formal Russian with proper Cyrillic script'
  },

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
    fallbackLanguages: ['en'],
    formalLevel: 'neutral',
    culturalContext: 'Standard Vietnamese with proper diacritics'
  }
];