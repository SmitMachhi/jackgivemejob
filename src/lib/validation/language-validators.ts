import { z } from 'zod';

// Language-specific validation schemas
export const VietnameseValidationSchema = z.object({
  text: z.string()
    .min(1, 'Vietnamese text cannot be empty')
    .regex(/[\u00C0-\u1EF9]/, 'Vietnamese text must contain diacritic marks')
    .regex(/[àáạảãâầấậẩẫăằắặẳẵ]/, 'Missing Vietnamese vowel characters')
    .regex(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/, 'Contains invalid characters for Vietnamese'),
  syllables: z.array(z.string())
    .min(1, 'At least one syllable required')
    .refine(
      (syllables) => syllables.every(syllable =>
        /^[a-zA-Z\u00C0-\u1EF9]{1,6}$/.test(syllable)
      ),
      'Invalid Vietnamese syllable structure'
    ),
  tones: z.array(z.enum(['acute', 'grave', 'hook above', 'tilde', 'dot below', 'none']))
    .min(1, 'Tone information required')
});

export const HindiValidationSchema = z.object({
  text: z.string()
    .min(1, 'Hindi text cannot be empty')
    .regex(/[\u0900-\u097F]/, 'Hindi text must contain Devanagari script characters')
    .regex(/[\u0915-\u0939]/, 'Missing Hindi consonants (ka to ha)')
    .regex(/[\u093E-\u094C]/, 'Missing Hindi vowel signs (matras)')
    .regex(/[^\u0900-\u097F\s\.\,\!\?\;]/, 'Contains non-Devanagari characters'),
  aksharas: z.array(z.string())
    .min(1, 'At least one akshara required')
    .refine(
      (aksharas) => aksharas.every(akshara =>
        /^[\u0900-\u097F]{1,3}$/.test(akshara)
      ),
      'Invalid Devanagari akshara structure'
    ),
  matras: z.array(z.enum(['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः']))
    .min(1, 'Matra information required')
});

export const FrenchValidationSchema = z.object({
  text: z.string()
    .min(1, 'French text cannot be empty')
    .regex(/[àâäéèêëïîôöùûüÿç]/, 'French text must contain accent marks')
    .regex(/[a-zA-Zàâäéèêëïîôöùûüÿç\s]/, 'Contains invalid characters for French'),
  accents: z.record(z.object({
    character: z.string(),
    accent: z.enum(['acute', 'grave', 'circumflex', 'diaeresis', 'cedilla']),
    position: z.number(),
    valid: z.boolean()
  }))
    .refine(
      (accents) => Object.values(accents).some(acc => acc.valid),
      'No valid French accent marks found'
    ),
  punctuation: z.array(z.enum(['.', ',', '!', '?', ';', ':', '"', "'", '«', '»']))
    .min(1, 'Punctuation analysis required')
});

export const SpanishValidationSchema = z.object({
  text: z.string()
    .min(1, 'Spanish text cannot be empty')
    .regex(/[áéíóúüñ¿¡]/, 'Spanish text must contain accent marks or special characters')
    .regex(/[a-zA-Záéíóúüñ¿¡\s\.\,\!\?\;]/, 'Contains invalid characters for Spanish'),
  accents: z.record(z.object({
    character: z.string(),
    accent: z.enum(['acute', 'diaeresis', 'tilde']),
    position: z.number(),
    valid: z.boolean()
  }))
    .refine(
      (accents) => Object.values(accents).some(acc => acc.valid),
      'No valid Spanish accent marks found'
    ),
  punctuation: z.array(z.enum(['.', ',', '!', '?', ';', ':', '"', "'", '¿', '¡', '«', '»']))
    .min(1, 'Punctuation analysis required'),
  invertedPunctuation: z.object({
    opening: z.boolean().default(false),
    closing: z.boolean().default(false),
    matched: z.boolean().default(false)
  })
});

// Validation functions for each language
export class LanguageSpecificValidators {
  /**
   * Vietnamese diacritic validation
   * Validates proper Vietnamese syllable structure and tone marks
   */
  static validateVietnamese(text: string): {
    isValid: boolean;
    errors: string[];
    details: {
      hasDiacritics: boolean;
      syllableCount: number;
      toneDistribution: Record<string, number>;
      missingDiacritics: string[];
    };
  } {
    const errors: string[] = [];
    const details = {
      hasDiacritics: false,
      syllableCount: 0,
      toneDistribution: {} as Record<string, number>,
      missingDiacritics: [] as string[]
    };

    // Check for Vietnamese diacritics
    const vietnameseChars = /[\u00C0-\u1EF9]/;
    const vietnameseVowels = /[àáạảãâầấậẩẫăằắặẳẵ]/;
    const vietnameseConsonants = /[bcdđfghjklmnpqrstvwxz]/;

    details.hasDiacritics = vietnameseChars.test(text);

    if (!details.hasDiacritics) {
      errors.push('Vietnamese text must contain diacritic marks (accent marks)');
    }

    // Check for Vietnamese syllable structure
    const syllables = text.split(/\s+/);
    details.syllableCount = syllables.length;

    syllables.forEach((syllable, index) => {
      if (!vietnameseVowels.test(syllable)) {
        errors.push(`Syllable "${syllable}" at position ${index + 1} lacks Vietnamese vowel structure`);
        details.missingDiacritics.push(syllable);
      }
    });

    // Check tone distribution
    const tonePatterns = {
      acute: /[áấéếíóốúứý]/g,
      grave: /[àầèềìòồùừỳ]/g,
      hookAbove: /[ảẳẻểỉỏổủửỷ]/g,
      tilde: /[ãẵẽễĩõỗũữỹ]/g,
      dotBelow: /[ạặẹẹịọộụựỵ]/g
    };

    Object.entries(tonePatterns).forEach(([tone, pattern]) => {
      const matches = text.match(pattern);
      details.toneDistribution[tone] = matches ? matches.length : 0;
    });

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  /**
   * Hindi Devanagari script validation
   * Validates proper Devanagari script structure and character composition
   */
  static validateHindi(text: string): {
    isValid: boolean;
    errors: string[];
    details: {
      hasDevanagari: boolean;
      aksharaCount: number;
      consonantCount: number;
      vowelCount: number;
      matraCount: number;
      invalidCharacters: string[];
    };
  } {
    const errors: string[] = [];
    const details = {
      hasDevanagari: false,
      aksharaCount: 0,
      consonantCount: 0,
      vowelCount: 0,
      matraCount: 0,
      invalidCharacters: [] as string[]
    };

    // Check for Devanagari script
    const devanagariRange = /[\u0900-\u097F]/;
    const consonants = /[\u0915-\u0939]/; // ka to ha
    const vowels = /[\u0905-\u0914]/; // a to au
    const matras = /[\u093E-\u094C]/; // vowel signs
    const virama = /\u094D/; // halant

    details.hasDevanagari = devanagariRange.test(text);

    if (!details.hasDevanagari) {
      errors.push('Hindi text must contain Devanagari script characters');
    }

    // Count character types
    details.consonantCount = (text.match(consonants) || []).length;
    details.vowelCount = (text.match(vowels) || []).length;
    details.matraCount = (text.match(matras) || []).length;

    // Check for valid akshara structure
    const aksharas = text.split(/\s+/);
    details.aksharaCount = aksharas.length;

    aksharas.forEach((akshara, index) => {
      // Check for consonant-vowel combinations
      if (!consonants.test(akshara) && !vowels.test(akshara)) {
        const invalidChars = akshara.split('').filter(char => !devanagariRange.test(char));
        details.invalidCharacters.push(...invalidChars);
        errors.push(`Invalid akshara "${akshara}" at position ${index + 1}`);
      }
    });

    // Check for proper virama usage
    const viramaMatches = text.match(virama);
    if (viramaMatches && viramaMatches.length > aksharas.length * 0.3) {
      errors.push('Excessive use of virama (halant) detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  /**
   * French accent mark validation
   * Validates proper French accent usage and punctuation
   */
  static validateFrench(text: string): {
    isValid: boolean;
    errors: string[];
    details: {
      hasAccents: boolean;
      accentTypes: Record<string, number>;
      punctuationCount: number;
      missingAccents: string[];
      guillemetsMatched: boolean;
    };
  } {
    const errors: string[] = [];
    const details = {
      hasAccents: false,
      accentTypes: {} as Record<string, number>,
      punctuationCount: 0,
      missingAccents: [] as string[],
      guillemetsMatched: false
    };

    // Check for French accents
    const accents = {
      acute: /[áéíóúý]/g,
      grave: /[àèìòùỳ]/g,
      circumflex: /[âêîôûŷ]/g,
      diaeresis: /[äëïöüÿ]/g,
      cedilla: /[ç]/g
    };

    let totalAccents = 0;
    Object.entries(accents).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      const count = matches ? matches.length : 0;
      details.accentTypes[type] = count;
      totalAccents += count;
    });

    details.hasAccents = totalAccents > 0;

    if (!details.hasAccents) {
      errors.push('French text should contain accent marks');
    }

    // Check for words that typically need accents
    const commonWordsNeedingAccents = [
      'etre', 'avoir', 'faire', 'aller', 'venir', 'prendre', 'comprendre',
      'ecrire', 'lire', 'dire', 'voir', 'croire', 'savoir', 'connaitre',
      'reconnaitre', 'paraitre', 'apparaitre', 'connait', 'sait', 'ecrit'
    ];

    commonWordsNeedingAccents.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        details.missingAccents.push(word);
      }
    });

    // Check punctuation
    const punctuation = /[.,!?;:"'«»]/g;
    details.punctuationCount = (text.match(punctuation) || []).length;

    // Check guillemets matching
    const openingGuillemets = (text.match(/«/g) || []).length;
    const closingGuillemets = (text.match(/»/g) || []).length;
    details.guillemetsMatched = openingGuillemets === closingGuillemets;

    if (!details.guillemetsMatched) {
      errors.push('French guillemets (« ») must be properly matched');
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  /**
   * Spanish punctuation and accent validation
   * Validates proper Spanish accent usage and inverted punctuation
   */
  static validateSpanish(text: string): {
    isValid: boolean;
    errors: string[];
    details: {
      hasAccents: boolean;
      accentTypes: Record<string, number>;
      hasInvertedPunctuation: boolean;
      punctuationMatched: boolean;
      questionMarks: { opening: number; closing: number };
      exclamationMarks: { opening: number; closing: number };
      missingAccents: string[];
    };
  } {
    const errors: string[] = [];
    const details = {
      hasAccents: false,
      accentTypes: {} as Record<string, number>,
      hasInvertedPunctuation: false,
      punctuationMatched: false,
      questionMarks: { opening: 0, closing: 0 },
      exclamationMarks: { opening: 0, closing: 0 },
      missingAccents: [] as string[]
    };

    // Check for Spanish accents
    const accents = {
      acute: /[áéíóúý]/g,
      diaeresis: /[ü]/g,
      tilde: /[ñ]/g
    };

    let totalAccents = 0;
    Object.entries(accents).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      const count = matches ? matches.length : 0;
      details.accentTypes[type] = count;
      totalAccents += count;
    });

    details.hasAccents = totalAccents > 0;

    if (!details.hasAccents) {
      errors.push('Spanish text should contain accent marks');
    }

    // Check for words that typically need accents
    const commonWordsNeedingAccents = [
      'que', 'que', 'el', 'el', 'como', 'donde', 'cual', 'cuando', 'cuanto',
      'si', 'no', 'mas', 'mas', 'aun', 'aun', 'este', 'ese', 'aquel',
      'solo', 'solo', 'practico', 'practica', 'publico', 'publica'
    ];

    commonWordsNeedingAccents.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        details.missingAccents.push(word);
      }
    });

    // Check inverted punctuation
    const openingQuestions = (text.match(/¿/g) || []).length;
    const closingQuestions = (text.match(/\?/g) || []).length;
    const openingExclamations = (text.match(/¡/g) || []).length;
    const closingExclamations = (text.match(/!/g) || []).length;

    details.questionMarks = { opening: openingQuestions, closing: closingQuestions };
    details.exclamationMarks = { opening: openingExclamations, closing: closingExclamations };
    details.hasInvertedPunctuation = openingQuestions > 0 || openingExclamations > 0;

    // Check punctuation matching
    const questionsMatched = openingQuestions === closingQuestions;
    const exclamationsMatched = openingExclamations === closingExclamations;
    details.punctuationMatched = questionsMatched && exclamationsMatched;

    if (!questionsMatched && openingQuestions > 0) {
      errors.push('Spanish question marks (¿ ?) must be properly matched');
    }

    if (!exclamationsMatched && openingExclamations > 0) {
      errors.push('Spanish exclamation marks (¡ !) must be properly matched');
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  /**
   * Universal language validation dispatcher
   */
  static validateLanguage(text: string, language: string): {
    isValid: boolean;
    errors: string[];
    details: any;
  } {
    switch (language.toLowerCase()) {
      case 'vi':
        return this.validateVietnamese(text);
      case 'hi':
        return this.validateHindi(text);
      case 'fr':
        return this.validateFrench(text);
      case 'es':
        return this.validateSpanish(text);
      default:
        return {
          isValid: false,
          errors: [`Unsupported language for validation: ${language}`],
          details: {}
        };
    }
  }
}

// Type definitions for validation results
export type VietnameseValidationResult = ReturnType<typeof LanguageSpecificValidators.validateVietnamese>;
export type HindiValidationResult = ReturnType<typeof LanguageSpecificValidators.validateHindi>;
export type FrenchValidationResult = ReturnType<typeof LanguageSpecificValidators.validateFrench>;
export type SpanishValidationResult = ReturnType<typeof LanguageSpecificValidators.validateSpanish>;

// Language validation configuration
export const LANGUAGE_VALIDATION_CONFIG = {
  vi: {
    enabled: true,
    strictMode: true,
    requiredChecks: ['diacritics', 'syllableStructure', 'toneDistribution'],
    maxErrors: 10
  },
  hi: {
    enabled: true,
    strictMode: true,
    requiredChecks: ['devanagariScript', 'aksharaStructure', 'characterComposition'],
    maxErrors: 10
  },
  fr: {
    enabled: true,
    strictMode: true,
    requiredChecks: ['accents', 'punctuation', 'guillemets'],
    maxErrors: 10
  },
  es: {
    enabled: true,
    strictMode: true,
    requiredChecks: ['accents', 'invertedPunctuation', 'punctuationMatching'],
    maxErrors: 10
  }
};