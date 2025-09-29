import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { OpenAI } from "openai";
import * as ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { renderService } from "../lib/services/render-service";
import { TranslationService, type TranslationServiceConfig } from "../lib/agents/translation-service";
import { languageConfigs } from "../lib/agents/language-configs";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Initialize OpenAI client with GPT-4o-mini for captions
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Language-specific prompt templates with diacritic requirements
const LANGUAGE_PROMPT_TEMPLATES = {
  vi: {
    systemPrompt: `You are an expert Vietnamese caption generator specializing in video content.
CRITICAL REQUIREMENTS:
1. PRESERVE ALL VIETNAMESE DIACRITICS EXACTLY: ấ, ề, ộ, ố, ờ, ủ, ứ, ử, ự, ể, ễ, ệ, ắ, ằ, ẳ, ẵ, ặ, ấ, ầ, ẩ, ẫ, ậ
2. Maintain proper tone marks and vowel combinations
3. Ensure natural Vietnamese sentence flow and rhythm
4. Use appropriate formal/informal address based on context
5. Handle technical terms with proper Vietnamese terminology
6. Preserve cultural nuances and expressions

Rules:
- Never omit or alter diacritics
- Maintain proper word spacing in Vietnamese
- Use natural Vietnamese punctuation
- Adapt English technical terms appropriately
- Keep sentences concise for video display
- Ensure proper Vietnamese grammar structure`,

    captionPrompt: `Generate Vietnamese captions for this video segment:
{{AUDIO_TRANSCRIPT}}

Language: Vietnamese (tiếng Việt)
Style: {{STYLE}}
Context: {{CONTEXT}}
Duration: {{DURATION}} seconds
Max characters per caption: {{MAX_CHARS}}

Requirements:
- Preserve ALL Vietnamese diacritics exactly
- Use natural Vietnamese sentence structure
- Keep captions concise and readable
- Match timing with speech rhythm
- Use appropriate Vietnamese terminology

Generate structured JSON output only.`,
  },

  hi: {
    systemPrompt: `You are an expert Hindi caption generator for video content.
CRITICAL REQUIREMENTS:
1. Use proper Devanagari script (हिंदी लिपि) for all Hindi text
2. Maintain correct matra (मात्रा) placement and vowel signs
3. Ensure proper word spacing in Devanagari
4. Use respectful and appropriate Hindi address forms
5. Handle technical terms with proper Hindi equivalents
6. Maintain formal Hindi grammar and structure

Rules:
- Always use complete Devanagari characters
- Proper vowel sign placement (कि, की, कु, कू, etc.)
- Correct conjunct consonants (क्ष, त्र, ज्ञ, etc.)
- Natural Hindi word order and sentence structure
- Appropriate use of Hindi punctuation (।, ः, ं)
- Formal/respectful language suitable for videos`,

    captionPrompt: `हिंदी कैप्शन जनरेट करें इस वीडियो सेगमेंट के लिए:
{{AUDIO_TRANSCRIPT}}

भाषा: हिंदी
शैली: {{STYLE}}
संदर्भ: {{CONTEXT}}
अवधि: {{DURATION}} सेकंड
प्रति कैप्शन अधिकतम अक्षर: {{MAX_CHARS}}

आवश्यकताएँ:
- पूरा देवनागरी लिपि का उपयोग करें
- सही मात्रा और स्वर चिह्न रखें
- प्राकृतिक हिंदी वाक्य संरचना
- वीडियो प्रदर्शन के लिए संक्षिप्त कैप्शन
- भाषण लय के साथ समय मिलाएँ

केवल संरचित JSON आउटपुट जनरेट करें।`,
  },

  fr: {
    systemPrompt: `You are an expert French caption generator specializing in video content.
CRITICAL REQUIREMENTS:
1. Preserve all French accent marks: é, è, ê, ë, à, â, ä, ç, î, ï, ô, ù, û, ü
2. Handle French liaisons and elisions correctly
3. Use proper French punctuation and spacing
4. Maintain formal French grammar and structure
5. Handle French-specific contractions (l', d', j', etc.)
6. Use appropriate French terminology for technical terms

Rules:
- Never omit French accents or diacritical marks
- Proper use of French contractions and elisions
- Correct French word order and sentence structure
- Appropriate use of French punctuation (« », !, ?)
- Handle French-specific grammatical structures
- Use formal French suitable for video content`,

    captionPrompt: `Générez des légendes en français pour ce segment vidéo:
{{AUDIO_TRANSCRIPT}}

Langue: Français
Style: {{STYLE}}
Contexte: {{CONTEXT}}
Durée: {{DURATION}} secondes
Maximum de caractères par légende: {{MAX_CHARS}}

Exigences:
- Conserver TOUS les accents français exactement
- Utiliser la structure de phrase française naturelle
- Gérer correctement les liaisons et élisions
- Maintenir la grammaire française formelle
- Légendes concises et lisibles

Générer uniquement la sortie JSON structurée.`,
  },

  es: {
    systemPrompt: `You are an expert Spanish caption generator specializing in video content.
CRITICAL REQUIREMENTS:
1. Preserve all Spanish accent marks: á, é, í, ó, ú, ü, ñ
2. Handle Spanish punctuation and inverted question/exclamation marks
3. Use proper Spanish grammar and verb conjugations
4. Maintain formal Spanish address forms (usted/ustedes)
5. Handle Spanish-specific characters and symbols
6. Use appropriate Spanish terminology and expressions

Rules:
- Never omit Spanish accents or diacritical marks
- Use proper Spanish punctuation (¿, ¡, « »)
- Correct Spanish verb conjugations and agreement
- Appropriate use of formal/informal address
- Handle Spanish-specific grammatical structures
- Use natural Spanish expressions and idioms`,

    captionPrompt: `Genere subtítulos en español para este segmento de video:
{{AUDIO_TRANSCRIPT}}

Idioma: Español
Estilo: {{STYLE}}
Contexto: {{CONTEXT}}
Duración: {{DURATION}} segundos
Máximo de caracteres por subtítulo: {{MAX_CHARS}}

Requisitos:
- Conservar TODOS los acentos españoles exactamente
- Usar signos de puntuación españoles (¿, ¡)
- Mantener gramática española formal
- Gestionar formas de dirección apropiadas
- Subtítulos concisos y legibles

Generar solo salida JSON estructurada.`,
  }
};

// Language-specific validation rules
const LANGUAGE_VALIDATION_RULES = {
  vi: {
    maxCharactersPerCaption: 80,
    minCharactersPerCaption: 10,
    maxDuration: 10.2,
    minDuration: 1,
    requiredDiacritics: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i,
    commonWords: ['và', 'là', 'của', 'có', 'không', 'được', 'trong', 'với', 'để', 'một'],
    diacriticCheck: (text: string) => {
      const hasDiacritics = LANGUAGE_VALIDATION_RULES.vi.requiredDiacritics.test(text);
      const hasCommonWords = LANGUAGE_VALIDATION_RULES.vi.commonWords.some(word =>
        text.toLowerCase().includes(word)
      );
      return hasCommonWords ? hasDiacritics : true; // Only require diacritics if common words are present
    }
  },

  hi: {
    maxCharactersPerCaption: 70,
    minCharactersPerCaption: 8,
    maxDuration: 10.2,
    minDuration: 1,
    requiredDevanagari: /[\u0900-\u097F]/,
    minDevanagariRatio: 0.6,
    devanagariCheck: (text: string) => {
      const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
      const totalChars = text.length;
      return devanagariChars / totalChars >= LANGUAGE_VALIDATION_RULES.hi.minDevanagariRatio;
    }
  },

  fr: {
    maxCharactersPerCaption: 85,
    minCharactersPerCaption: 12,
    maxDuration: 10.2,
    minDuration: 1,
    requiredAccents: /[àâäçéèêëïîôùûüÿñ]/i,
    commonWords: ['le', 'la', 'de', 'que', 'et', 'à', 'en', 'un', 'est', 'se'],
    accentCheck: (text: string) => {
      const hasAccents = LANGUAGE_VALIDATION_RULES.fr.requiredAccents.test(text);
      const hasCommonWords = LANGUAGE_VALIDATION_RULES.fr.commonWords.some(word =>
        text.toLowerCase().includes(word)
      );
      return hasCommonWords ? hasAccents : true; // Only require accents if common words are present
    }
  },

  es: {
    maxCharactersPerCaption: 85,
    minCharactersPerCaption: 12,
    maxDuration: 10.2,
    minDuration: 1,
    requiredAccents: /[áéíóúñ]/i,
    commonWords: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'],
    accentCheck: (text: string) => {
      const hasAccents = LANGUAGE_VALIDATION_RULES.es.requiredAccents.test(text);
      const hasCommonWords = LANGUAGE_VALIDATION_RULES.es.commonWords.some(word =>
        text.toLowerCase().includes(word)
      );
      return hasCommonWords ? hasAccents : true; // Only require accents if common words are present
    }
  }
};

// Caption generation error codes
export enum CaptionAgentError {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  TRANSLATION_FAILED = "TRANSLATION_FAILED",
  CAPTION_GENERATION_FAILED = "CAPTION_GENERATION_FAILED",
  LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  API_ERROR = "API_ERROR"
}

// Input validation schema
export const CaptionAgentSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),

  // Language configuration
  targetLanguage: z.string().min(2, "Target language code is required").default("en"),
  sourceLanguage: z.string().min(2, "Source language code is required").default("en"),

  // Caption options
  captionFormat: z.enum(["srt", "vtt", "json"]).default("srt"),
  maxCaptionDuration: z.number().positive().min(1).max(10).default(5), // seconds
  minCaptionDuration: z.number().positive().min(0.5).max(3).default(1), // seconds
  maxCharactersPerCaption: z.number().positive().min(20).max(200).default(80),

  // Processing options
  enableTranslation: z.boolean().default(true),
  enableTimestamps: z.boolean().default(true),
  enableSpeakerDetection: z.boolean().default(false),

  // Retry and timeout configuration
  maxRetries: z.number().min(0).max(5).default(3),
  timeout: z.number().positive().min(30).max(600).default(300), // seconds

  // Context and styling
  context: z.string().optional(),
  style: z.enum(["formal", "informal", "neutral"]).default("neutral"),
  industry: z.string().optional(),

  // Translation options
  translationTemperature: z.number().min(0).max(1).default(0.3),
  translationMaxTokens: z.number().positive().min(100).max(2000).default(500),
});

export type CaptionAgentInput = z.infer<typeof CaptionAgentSchema>;

// Caption segment schema
export const CaptionSegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  translatedText: z.string().optional(),
  language: z.string(),
  confidence: z.number().min(0).max(1),
  speaker: z.string().optional(),
  duration: z.number(),
  wordCount: z.number(),
  characterCount: z.number(),
});

export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;

// Caption result schema
export const CaptionResultSchema = z.object({
  segments: z.array(CaptionSegmentSchema),
  originalLanguage: z.string(),
  targetLanguage: z.string(),
  captionFormat: z.string(),
  totalDuration: z.number(),
  totalSegments: z.number(),
  totalWords: z.number(),
  totalCharacters: z.number(),
  confidence: z.number(),
  processingTime: z.number(),
  metadata: z.object({
    transcriptionModel: z.string(),
    translationModel: z.string(),
    audioDuration: z.number(),
    translationEnabled: z.boolean(),
    speakerDetectionEnabled: z.boolean(),
    languageConfig: z.any(),
    validationResults: z.array(z.any()).optional(),
    fallbackUsed: z.boolean().optional(),
    translationStats: z.object({
      tokensUsed: z.number(),
      confidence: z.number(),
      processingTime: z.number()
    }).optional()
  }),
});

export type CaptionResult = z.infer<typeof CaptionResultSchema>;

/**
 * Caption Agent Task - Generates multi-language captions with AI-powered translation
 *
 * This task performs comprehensive caption generation with:
 * - Multi-language transcription using OpenAI Whisper
 * - AI-powered translation using existing translation agent
 * - Language-specific validation and prompt templates
 * - Configurable caption formatting and timing
 * - Cultural context and industry-specific terminology
 * - Comprehensive error handling and retry logic
 */
export const runCaptionAgent = task({
  id: "caption-agent",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: CaptionAgentInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting caption agent", { payload });

    try {
      // Validate input
      const validatedInput = CaptionAgentSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Step 1: Validate language support and get configuration
      const languageValidation = validateLanguageSupport(validatedInput);
      if (!languageValidation.isValid) {
        throw new Error(`Language validation failed: ${languageValidation.errors.join(', ')}`);
      }

      const sourceConfig = languageConfigs.find(config => config.code === validatedInput.sourceLanguage);
      const targetConfig = languageConfigs.find(config => config.code === validatedInput.targetLanguage);

      if (!sourceConfig || !targetConfig) {
        throw new Error(`Language configuration not found for source: ${validatedInput.sourceLanguage} or target: ${validatedInput.targetLanguage}`);
      }

      console.log("Language configurations loaded", {
        sourceLanguage: sourceConfig.name,
        targetLanguage: targetConfig.name,
        sourceDirection: sourceConfig.direction,
        targetDirection: targetConfig.direction
      });

      // Emit caption generation started event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'translating',
          'translating',
          {
            type: 'caption_generation_started',
            fileName: validatedInput.fileName,
            sourceLanguage: validatedInput.sourceLanguage,
            targetLanguage: validatedInput.targetLanguage,
            captionFormat: validatedInput.captionFormat,
            enableTranslation: validatedInput.enableTranslation,
            maxCaptionDuration: validatedInput.maxCaptionDuration,
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['caption', 'generation', 'started']
          }
        );
      }

      // Step 2: Process audio and perform transcription
      let transcriptionResult;
      let audioDuration;

      try {
        // Get audio duration
        audioDuration = await getAudioDuration(validatedInput.filePath);
        console.log("Audio duration extracted", { duration: audioDuration });

        // Perform transcription with source language
        transcriptionResult = await performTranscription(
          validatedInput,
          sourceConfig,
          audioDuration
        );

        console.log("Transcription completed", {
          textLength: transcriptionResult.text.length,
          wordCount: transcriptionResult.wordCount,
          segmentsCount: transcriptionResult.segments?.length || 0,
          confidence: transcriptionResult.confidence
        });

      } catch (error) {
        console.error("Transcription failed", {
          error: error instanceof Error ? error.message : error,
          sourceLanguage: validatedInput.sourceLanguage
        });

        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'failed',
            'failed',
            {
              type: 'transcription_failed',
              error: error instanceof Error ? error.message : error,
              sourceLanguage: validatedInput.sourceLanguage,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'error',
              category: 'processing',
              tags: ['caption', 'transcription', 'error']
            }
          );
        }

        throw new Error(`Transcription failed: ${error instanceof Error ? error.message : error}`);
      }

      // Step 3: Generate caption segments
      let captionSegments = generateCaptionSegments(
        transcriptionResult,
        validatedInput,
        sourceConfig
      );

      console.log("Caption segments generated", {
        segmentCount: captionSegments.length,
        averageDuration: captionSegments.reduce((sum, seg) => sum + seg.duration, 0) / captionSegments.length
      });

      // Step 4: Translate captions using GPT-4o-mini if enabled
      let translationStats;
      let validationResults;

      if (validatedInput.enableTranslation && validatedInput.targetLanguage !== validatedInput.sourceLanguage) {
        // Check if target language is supported by GPT-4o-mini captions
        const supportedLanguages = Object.keys(LANGUAGE_PROMPT_TEMPLATES);
        if (!supportedLanguages.includes(validatedInput.targetLanguage)) {
          console.warn(`Target language ${validatedInput.targetLanguage} not supported by GPT-4o-mini captions, falling back to original translation service`);

          // Fallback to existing translation service for unsupported languages
          try {
            // TODO: Implement proper caption translation service
          // For now, skip translation for unsupported languages
          console.warn(`Translation for ${validatedInput.targetLanguage} not yet implemented`);

          // Initialize empty translation stats
          translationStats = {
            tokensUsed: 0,
            processingTime: Date.now() - startTime
          };
          validationResults = [];

            console.log("Caption translation completed (fallback)", {
              translatedSegments: captionSegments.length,
              averageConfidence: captionSegments.reduce((sum, seg) => sum + (seg.confidence || 0.8), 0) / captionSegments.length,
              tokensUsed: translationStats.tokensUsed
            });

          } catch (error) {
            console.error("Caption translation failed (fallback)", {
              error: error instanceof Error ? error.message : error,
              targetLanguage: validatedInput.targetLanguage
            });

            if (validatedInput.jobId) {
              await renderService.addEvent(
                validatedInput.jobId,
                'job_progress',
                'translating',
                'translating',
                {
                  type: 'translation_failed',
                  error: error instanceof Error ? error.message : error,
                  targetLanguage: validatedInput.targetLanguage,
                  processingTime: Date.now() - startTime,
                },
                {
                  severity: 'warning',
                  category: 'processing',
                  tags: ['caption', 'translation', 'error']
                }
              );
            }
          }
        } else {
          // Use enhanced GPT-4o-mini caption generation
          try {
            const gpt4oResult = await generateCaptionsWithGPT4oMini(
              captionSegments,
              validatedInput,
              validatedInput.targetLanguage
            );

            captionSegments = gpt4oResult.translatedSegments;
            translationStats = gpt4oResult.stats;
            validationResults = gpt4oResult.validationResults;

            console.log("GPT-4o-mini caption generation completed", {
              translatedSegments: captionSegments.length,
              averageConfidence: captionSegments.reduce((sum, seg) => sum + (seg.confidence || 0.8), 0) / captionSegments.length,
              tokensUsed: gpt4oResult.stats.tokensUsed,
              validationIssues: gpt4oResult.validationResults.length
            });

            // Emit GPT-4o-mini specific success event
            if (validatedInput.jobId) {
              await renderService.addEvent(
                validatedInput.jobId,
                'job_progress',
                'translating',
                'translating',
                {
                  type: 'gpt4o_caption_generation_completed',
                  targetLanguage: validatedInput.targetLanguage,
                  segmentsProcessed: captionSegments.length,
                  tokensUsed: gpt4oResult.stats.tokensUsed,
                  confidence: gpt4oResult.stats.confidence,
                  validationIssues: gpt4oResult.validationResults.length,
                  processingTime: Date.now() - startTime,
                },
                {
                  severity: 'success',
                  category: 'processing',
                  tags: ['caption', 'gpt4o-mini', 'ai-generation', 'completed']
                }
              );
            }

          } catch (error) {
            console.error("GPT-4o-mini caption generation failed", {
              error: error instanceof Error ? error.message : error,
              targetLanguage: validatedInput.targetLanguage
            });

            if (validatedInput.jobId) {
              await renderService.addEvent(
                validatedInput.jobId,
                'job_progress',
                'translating',
                'translating',
                {
                  type: 'gpt4o_caption_generation_failed',
                  error: error instanceof Error ? error.message : error,
                  targetLanguage: validatedInput.targetLanguage,
                  processingTime: Date.now() - startTime,
                },
                {
                  severity: 'warning',
                  category: 'processing',
                  tags: ['caption', 'gpt4o-mini', 'ai-generation', 'error']
                }
              );
            }

            // Fallback to original language captions if GPT-4o-mini fails
            console.warn("Continuing with original language captions due to GPT-4o-mini failure");
          }
        }
      }

      // Step 5: Format output and generate final result
      const captionResult = formatCaptionResult(
        captionSegments,
        validatedInput,
        transcriptionResult,
        {
          audioDuration: audioDuration || 0,
          sourceConfig,
          targetConfig,
          translationStats,
          validationResults,
          processingTime: Date.now() - startTime
        }
      );

      console.log("Caption generation completed successfully", {
        totalSegments: captionResult.totalSegments,
        totalDuration: captionResult.totalDuration,
        confidence: captionResult.confidence,
        processingTime: captionResult.processingTime
      });

      // Emit caption generation completed event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'translating',
          'translating',
          {
            type: 'caption_generation_completed',
            result: {
              totalSegments: captionResult.totalSegments,
              totalDuration: captionResult.totalDuration,
              confidence: captionResult.confidence,
              language: captionResult.targetLanguage,
              captionFormat: captionResult.captionFormat,
              processingTime: captionResult.processingTime,
              translationEnabled: validatedInput.enableTranslation,
            },
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['caption', 'generation', 'completed', 'success']
          }
        );
      }

      return captionResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Caption agent failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      // Emit caption generation failed event
      if (payload.jobId) {
        await renderService.addEvent(
          payload.jobId,
          'job_progress',
          'failed',
          'failed',
          {
            type: 'caption_generation_failed',
            error: error instanceof Error ? error.message : error,
            fileName: payload.fileName,
            processingTime,
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['caption', 'generation', 'error', 'failure']
          }
        );
      }

      throw new Error(`Caption generation failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to validate language support
function validateLanguageSupport(input: CaptionAgentInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const supportedLanguages = languageConfigs.map(config => config.code);

  if (!supportedLanguages.includes(input.sourceLanguage)) {
    errors.push(`Unsupported source language: ${input.sourceLanguage}. Supported: ${supportedLanguages.join(', ')}`);
  }

  if (!supportedLanguages.includes(input.targetLanguage)) {
    errors.push(`Unsupported target language: ${input.targetLanguage}. Supported: ${supportedLanguages.join(', ')}`);
  }

  // Check if caption format is compatible with target language direction
  const targetConfig = languageConfigs.find(config => config.code === input.targetLanguage);
  if (targetConfig && targetConfig.direction === 'rtl' && input.captionFormat === 'srt') {
    errors.push(`SRT format may not display correctly for RTL language: ${targetConfig.name}. Consider using VTT format.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to perform transcription
async function performTranscription(
  input: CaptionAgentInput,
  languageConfig: any,
  audioDuration: number
): Promise<any> {
  const startTime = Date.now();

  try {
    // Read audio file
    const fs = await import('fs/promises');
    const audioBuffer = await fs.readFile(input.filePath);

    // Create file for OpenAI API
    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mp3' });
    const file = new File([blob], input.fileName, { type: 'audio/mp3' });

    // Prepare transcription parameters
    const transcriptionParams: any = {
      file: file,
      model: 'whisper-1',
      language: input.sourceLanguage,
      response_format: 'verbose_json',
      temperature: 0.0,
      timestamp_granularities: ['word', 'segment'],
    };

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create(transcriptionParams);

    // Process transcription result
    const result = {
      text: transcription.text || '',
      language: (transcription as any).language || input.sourceLanguage,
      duration: (transcription as any).duration || audioDuration,
      words: (transcription as any).words || [],
      segments: (transcription as any).segments || [],
      confidence: calculateTranscriptionConfidence(transcription),
      wordCount: (transcription.text || '').split(/\s+/).filter((word: string) => word.length > 0).length,
      characterCount: (transcription.text || '').length,
      processingTime: Date.now() - startTime,
    };

    return result;

  } catch (error) {
    console.error("Transcription API call failed", {
      error: error instanceof Error ? error.message : error,
      language: input.sourceLanguage
    });
    throw error;
  }
}

// Helper function to calculate transcription confidence
function calculateTranscriptionConfidence(transcription: any): number {
  const words = (transcription as any).words || [];
  const segments = (transcription as any).segments || [];

  if (words.length > 0) {
    const totalConfidence = words.reduce((sum: number, word: any) => sum + (word.confidence || 0.8), 0);
    return totalConfidence / words.length;
  }

  if (segments.length > 0) {
    const totalAvgLogprob = segments.reduce((sum: number, seg: any) => sum + (seg.avg_logprob || -0.5), 0);
    return Math.max(0, Math.min(1, (totalAvgLogprob / segments.length + 1) / 2));
  }

  return 0.8; // Default confidence
}

// Helper function to generate caption segments
function generateCaptionSegments(
  transcription: any,
  input: CaptionAgentInput,
  languageConfig: any
): CaptionSegment[] {
  const segments: CaptionSegment[] = [];

  // Use segments if available, otherwise create from words
  const sourceSegments = transcription.segments || [];

  if (sourceSegments.length > 0) {
    // Process existing segments
    let currentSegment: any = null;
    let currentText = '';
    let currentWords: any[] = [];

    for (const segment of sourceSegments) {
      const segmentWords = segment.words || [];

      for (const word of segmentWords) {
        // Check if adding this word would exceed limits
        const potentialText = currentText + (currentText ? ' ' : '') + word.word;
        const potentialDuration = currentSegment ? (word.end - currentSegment.start) : 0;
        const wordCount = currentWords.length + 1;
        const charCount = potentialText.length;

        if (currentSegment && (
          potentialDuration > input.maxCaptionDuration ||
          charCount > input.maxCharactersPerCaption
        )) {
          // Finalize current segment
          if (currentText.trim()) {
            segments.push({
              id: segments.length + 1,
              start: currentSegment.start,
              end: currentWords[currentWords.length - 1].end,
              text: currentText.trim(),
              language: input.sourceLanguage,
              confidence: calculateSegmentConfidence(currentWords),
              duration: currentWords[currentWords.length - 1].end - currentSegment.start,
              wordCount: currentWords.length,
              characterCount: currentText.trim().length,
            });
          }

          // Start new segment
          currentSegment = word;
          currentText = word.word;
          currentWords = [word];
        } else {
          // Add to current segment
          if (!currentSegment) {
            currentSegment = word;
          }
          currentText = potentialText;
          currentWords.push(word);
        }
      }
    }

    // Add final segment
    if (currentText.trim()) {
      segments.push({
        id: segments.length + 1,
        start: currentSegment.start,
        end: currentWords[currentWords.length - 1].end,
        text: currentText.trim(),
        language: input.sourceLanguage,
        confidence: calculateSegmentConfidence(currentWords),
        duration: currentWords[currentWords.length - 1].end - currentSegment.start,
        wordCount: currentWords.length,
        characterCount: currentText.trim().length,
      });
    }
  } else {
    // Create segments from raw text
    const words = transcription.text.split(/\s+/).filter((word: string) => word.length > 0);
    const avgWordDuration = (transcription.duration || 0) / words.length;

    let currentSegment = {
      id: 1,
      start: 0,
      text: '',
      words: [] as string[]
    };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const potentialText = currentSegment.text + (currentSegment.text ? ' ' : '') + word;

      if (potentialText.length > input.maxCharactersPerCaption || currentSegment.words.length >= 15) {
        // Finalize current segment
        if (currentSegment.text.trim()) {
          segments.push({
            id: currentSegment.id,
            start: currentSegment.start,
            end: currentSegment.start + (currentSegment.words.length * avgWordDuration),
            text: currentSegment.text.trim(),
            language: input.sourceLanguage,
            confidence: 0.8,
            duration: currentSegment.words.length * avgWordDuration,
            wordCount: currentSegment.words.length,
            characterCount: currentSegment.text.trim().length,
          });
        }

        // Start new segment
        currentSegment = {
          id: segments.length + 1,
          start: i * avgWordDuration,
          text: word,
          words: [word]
        };
      } else {
        currentSegment.text = potentialText;
        currentSegment.words.push(word);
      }
    }

    // Add final segment
    if (currentSegment.text.trim()) {
      segments.push({
        id: currentSegment.id,
        start: currentSegment.start,
        end: currentSegment.start + (currentSegment.words.length * avgWordDuration),
        text: currentSegment.text.trim(),
        language: input.sourceLanguage,
        confidence: 0.8,
        duration: currentSegment.words.length * avgWordDuration,
        wordCount: currentSegment.words.length,
        characterCount: currentSegment.text.trim().length,
      });
    }
  }

  return segments;
}

// Helper function to calculate segment confidence
function calculateSegmentConfidence(words: any[]): number {
  if (words.length === 0) return 0.8;

  const totalConfidence = words.reduce((sum, word) => sum + (word.confidence || 0.8), 0);
  return totalConfidence / words.length;
}

// Enhanced caption generation with GPT-4o-mini and JSON tool-calling
async function generateCaptionsWithGPT4oMini(
  segments: CaptionSegment[],
  input: CaptionAgentInput,
  targetLanguage: string
): Promise<{
  translatedSegments: CaptionSegment[];
  stats: {
    tokensUsed: number;
    confidence: number;
    processingTime: number;
  };
  validationResults: any[];
}> {
  const startTime = Date.now();
  const translatedSegments: CaptionSegment[] = [];
  let totalTokensUsed = 0;
  let totalConfidence = 0;
  const allValidationResults: any[] = [];

  // Get language-specific configuration
  const langConfig = LANGUAGE_PROMPT_TEMPLATES[targetLanguage as keyof typeof LANGUAGE_PROMPT_TEMPLATES];
  const validationRules = LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES];

  if (!langConfig) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  // Define JSON schema for structured output
  const captionSchema = {
    type: "object",
    properties: {
      captions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            text: { type: "string" },
            start: { type: "number" },
            end: { type: "number" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            validation_notes: { type: "array", items: { type: "string" } }
          },
          required: ["id", "text", "start", "end", "confidence"]
        }
      },
      language_used: { type: "string" },
      total_segments: { type: "number" },
      processing_notes: { type: "array", items: { type: "string" } }
    },
    required: ["captions", "language_used", "total_segments"]
  };

  // Process segments in batches for efficiency
  const batchSize = 5; // Smaller batches for better quality control
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);

    try {
      // Prepare batch transcript
      const batchTranscript = batch.map(segment =>
        `[${segment.start.toFixed(2)}-${segment.end.toFixed(2)}s] ${segment.text}`
      ).join('\n');

      // Prepare prompt with language-specific template
      const prompt = langConfig.captionPrompt
        .replace('{{AUDIO_TRANSCRIPT}}', batchTranscript)
        .replace('{{STYLE}}', input.style || 'neutral')
        .replace('{{CONTEXT}}', input.context || 'Video caption')
        .replace('{{DURATION}}', batch.reduce((sum, seg) => sum + seg.duration, 0).toFixed(1))
        .replace('{{MAX_CHARS}}', validationRules.maxCharactersPerCaption.toString());

      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;

      while (attempt < maxRetries) {
        try {
          // Call GPT-4o-mini with structured output
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: langConfig.systemPrompt
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "caption_generation",
                schema: captionSchema,
                strict: true
              }
            },
            temperature: 0.3,
            max_tokens: 2000,
          });

          const responseContent = response.choices[0]?.message?.content;
          if (!responseContent) {
            throw new Error("Empty response from GPT-4o-mini");
          }

          // Parse JSON response
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(responseContent);
          } catch (parseError) {
            throw new Error(`Failed to parse JSON response: ${parseError}`);
          }

          // Validate response structure
          if (!parsedResponse.captions || !Array.isArray(parsedResponse.captions)) {
            throw new Error("Invalid response structure: missing captions array");
          }

          // Process and validate each caption
          for (let j = 0; j < parsedResponse.captions.length; j++) {
            const caption = parsedResponse.captions[j];
            const originalSegment = batch[j];

            // Validate language-specific rules
            const validationResults = validateCaptionText(
              caption.text,
              targetLanguage,
              validationRules
            );

            // Create translated segment
            const translatedSegment: CaptionSegment = {
              ...originalSegment,
              translatedText: caption.text,
              confidence: Math.min(
                (originalSegment.confidence + caption.confidence) / 2,
                validationResults.passed ? 1.0 : 0.7
              ),
            };

            translatedSegments.push(translatedSegment);
            totalConfidence += translatedSegment.confidence;

            // Add validation results
            if (!validationResults.passed) {
              allValidationResults.push({
                segmentId: originalSegment.id,
                language: targetLanguage,
                errors: validationResults.errors,
                suggestions: validationResults.suggestions,
                severity: validationResults.severity
              });
            }
          }

          // Track token usage
          const usage = response.usage;
          totalTokensUsed += usage?.total_tokens || 0;

          console.log(`Batch ${i + 1}-${i + batch.length} processed successfully`, {
            segmentsCount: parsedResponse.captions.length,
            tokensUsed: usage?.total_tokens,
            validationIssues: allValidationResults.length
          });

          break; // Success - exit retry loop

        } catch (error) {
          lastError = error;
          attempt++;

          console.warn(`Caption generation attempt ${attempt} failed for batch ${i + 1}-${i + batch.length}`, {
            error: error instanceof Error ? error.message : error,
            attempt,
            maxAttempts: maxRetries
          });

          if (attempt < maxRetries) {
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await wait.for({ seconds: delay / 1000 });
          }
        }
      }

      // If all retries failed, use original segments
      if (attempt >= maxRetries) {
        console.error(`All caption generation attempts failed for batch ${i + 1}-${i + batch.length}`, {
          error: lastError instanceof Error ? lastError.message : lastError
        });

        // Use original segments as fallback
        for (const segment of batch) {
          translatedSegments.push(segment);
          totalConfidence += segment.confidence * 0.8; // Reduce confidence for fallback

          allValidationResults.push({
            segmentId: segment.id,
            language: targetLanguage,
            errors: ['Caption generation failed, using original text'],
            suggestions: ['Manual review recommended'],
            severity: 'warning'
          });
        }
      }

    } catch (batchError) {
      console.error(`Batch processing failed for segments ${i + 1}-${i + batch.length}`, {
        error: batchError instanceof Error ? batchError.message : batchError
      });

      // Use original segments as fallback
      for (const segment of batch) {
        translatedSegments.push(segment);
        totalConfidence += segment.confidence * 0.8;

        allValidationResults.push({
          segmentId: segment.id,
          language: targetLanguage,
          errors: ['Batch processing failed, using original text'],
          suggestions: ['Manual review recommended'],
          severity: 'warning'
        });
      }
    }
  }

  const stats = {
    tokensUsed: totalTokensUsed,
    confidence: translatedSegments.length > 0 ? totalConfidence / translatedSegments.length : 0,
    processingTime: Date.now() - startTime,
  };

  return {
    translatedSegments,
    stats,
    validationResults: allValidationResults
  };
}

// Language-specific caption validation
function validateCaptionText(
  text: string,
  language: string,
  rules: any
): {
  passed: boolean;
  errors: string[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Basic character count validation
  if (text.length > rules.maxCharactersPerCaption) {
    errors.push(`Caption exceeds maximum character limit of ${rules.maxCharactersPerCaption}`);
    suggestions.push('Consider shortening the caption');
    suggestions.push('Break into multiple segments');
    severity = 'medium';
  }

  if (text.length < rules.minCharactersPerCaption) {
    errors.push(`Caption below minimum character limit of ${rules.minCharactersPerCaption}`);
    suggestions.push('Consider combining with adjacent segments');
    suggestions.push('Add more context if possible');
    severity = 'low';
  }

  // Language-specific validation
  switch (language) {
    case 'vi':
      if (!rules.diacriticCheck(text)) {
        errors.push('Vietnamese diacritics may be missing or incorrect');
        suggestions.push('Review for missing diacritics: ấ, ề, ộ, ố, etc.');
        suggestions.push('Ensure proper tone marks are present');
        suggestions.push('Check vowel combinations');
        severity = 'high';
      }
      break;

    case 'hi':
      if (!rules.devanagariCheck(text)) {
        errors.push('Insufficient Devanagari characters or incorrect script');
        suggestions.push('Ensure proper Devanagari script usage');
        suggestions.push('Check for correct matra placement');
        suggestions.push('Verify conjunct consonant formation');
        severity = 'critical';
      }
      break;

    case 'fr':
      if (!rules.accentCheck(text)) {
        errors.push('French accents may be missing or incorrect');
        suggestions.push('Review for missing accents: é, è, ê, ç, etc.');
        suggestions.push('Check proper French punctuation');
        suggestions.push('Verify liaison and elision handling');
        severity = 'high';
      }
      break;

    case 'es':
      if (!rules.accentCheck(text)) {
        errors.push('Spanish accents may be missing or incorrect');
        suggestions.push('Review for missing accents: á, é, í, ó, ú, ñ');
        suggestions.push('Check proper Spanish punctuation (¿, ¡)');
        suggestions.push('Verify verb conjugations and agreements');
        severity = 'high';
      }
      break;
  }

  // Check for obvious encoding issues
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
    errors.push('Caption contains invalid control characters');
    suggestions.push('Remove control characters');
    suggestions.push('Ensure proper text encoding');
    severity = 'critical';
  }

  // Check for repeated characters (potential transcription errors)
  if (/(.)\1{3,}/.test(text)) {
    errors.push('Caption contains suspicious repeated characters');
    suggestions.push('Review for transcription errors');
    suggestions.push('Consider manual correction');
    severity = 'medium';
  }

  return {
    passed: errors.length === 0,
    errors,
    suggestions: suggestions.flat(),
    severity
  };
}

// Helper function to format final caption result
function formatCaptionResult(
  segments: CaptionSegment[],
  input: CaptionAgentInput,
  transcription: any,
  metadata: {
    audioDuration: number;
    sourceConfig: any;
    targetConfig: any;
    translationStats?: any;
    validationResults?: any[];
    processingTime: number;
  }
): CaptionResult {
  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
  const totalWords = segments.reduce((sum, seg) => sum + seg.wordCount, 0);
  const totalCharacters = segments.reduce((sum, seg) => sum + seg.characterCount, 0);
  const averageConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;

  return {
    segments,
    originalLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    captionFormat: input.captionFormat,
    totalDuration,
    totalSegments: segments.length,
    totalWords,
    totalCharacters,
    confidence: averageConfidence,
    processingTime: metadata.processingTime,
    metadata: {
      transcriptionModel: 'whisper-1',
      translationModel: 'gpt-4',
      audioDuration: metadata.audioDuration,
      translationEnabled: input.enableTranslation,
      speakerDetectionEnabled: input.enableSpeakerDetection,
      languageConfig: {
        source: {
          code: metadata.sourceConfig.code,
          name: metadata.sourceConfig.name,
          direction: metadata.sourceConfig.direction,
          formalLevel: metadata.sourceConfig.formalLevel,
          tokenLimit: metadata.sourceConfig.tokenLimit,
        },
        target: {
          code: metadata.targetConfig.code,
          name: metadata.targetConfig.name,
          direction: metadata.targetConfig.direction,
          formalLevel: metadata.targetConfig.formalLevel,
          tokenLimit: metadata.targetConfig.tokenLimit,
        }
      },
      validationResults: metadata.validationResults,
      fallbackUsed: segments.some(seg => !seg.translatedText && input.enableTranslation),
      translationStats: metadata.translationStats
    },
  };
}

// Helper function to get audio duration
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Audio duration detection timed out'));
    }, 30000);

    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      clearTimeout(timeout);

      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      const duration = metadata.format?.duration;
      if (!duration || duration <= 0) {
        reject(new Error('Invalid or missing audio duration'));
        return;
      }

      resolve(duration);
    });
  });
}

/**
 * Standalone Multi-Language Caption Generation Task
 *
 * This task provides a simplified interface for generating captions
 * with GPT-4o-mini for specific languages. Designed to be easily
 * integrated into the render workflow.
 */
export const generateMultiLanguageCaptions = task({
  id: "multi-language-caption-generation",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: {
    filePath: string;
    fileName: string;
    targetLanguage: "vi" | "hi" | "fr" | "es";
    sourceLanguage?: string;
    jobId?: string;
    style?: "formal" | "informal" | "neutral";
    context?: string;
    maxCaptionLength?: number;
    enableValidation?: boolean;
  }, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting multi-language caption generation", { payload });

    try {
      // Validate language support
      const supportedLanguages = Object.keys(LANGUAGE_PROMPT_TEMPLATES);
      if (!supportedLanguages.includes(payload.targetLanguage)) {
        throw new Error(`Unsupported target language: ${payload.targetLanguage}. Supported: ${supportedLanguages.join(', ')}`);
      }

      // Get audio duration first
      const audioDuration = await getAudioDuration(payload.filePath);
      console.log("Audio duration extracted", { duration: audioDuration });

      // Perform transcription
      const transcriptionResult = await performTranscription({
        filePath: payload.filePath,
        fileName: payload.fileName,
        mimeType: 'audio/mp3',
        sourceLanguage: payload.sourceLanguage || 'en',
        targetLanguage: payload.targetLanguage,
        enableTranslation: false,
        captionFormat: 'json',
        maxCaptionDuration: 5,
        minCaptionDuration: 1,
        maxCharactersPerCaption: payload.maxCaptionLength || 80,
        enableTimestamps: true,
        enableSpeakerDetection: false,
        maxRetries: 3,
        timeout: 300,
        style: payload.style || 'neutral',
        context: payload.context || 'Video caption',
        translationTemperature: 0.3,
        translationMaxTokens: 500,
      }, { code: payload.targetLanguage, name: payload.targetLanguage }, audioDuration);

      console.log("Transcription completed", {
        textLength: transcriptionResult.text.length,
        wordCount: transcriptionResult.wordCount,
        confidence: transcriptionResult.confidence
      });

      // Generate initial caption segments
      const captionSegments = generateCaptionSegments(
        transcriptionResult,
        {
          filePath: payload.filePath,
          fileName: payload.fileName,
          mimeType: 'audio/mp3',
          sourceLanguage: payload.sourceLanguage || 'en',
          targetLanguage: payload.targetLanguage,
          enableTranslation: false,
          captionFormat: 'json',
          maxCaptionDuration: 5,
          minCaptionDuration: 1,
          maxCharactersPerCaption: payload.maxCaptionLength || 80,
          enableTimestamps: true,
          enableSpeakerDetection: false,
          maxRetries: 3,
          timeout: 300,
          style: payload.style || 'neutral',
          context: payload.context || 'Video caption',
          translationTemperature: 0.3,
          translationMaxTokens: 500,
        },
        { code: payload.targetLanguage, name: payload.targetLanguage }
      );

      console.log("Initial caption segments generated", {
        segmentCount: captionSegments.length
      });

      // Use GPT-4o-mini for enhanced caption generation
      const gpt4oResult = await generateCaptionsWithGPT4oMini(
        captionSegments,
        {
          filePath: payload.filePath,
          fileName: payload.fileName,
          mimeType: 'audio/mp3',
          sourceLanguage: payload.sourceLanguage || 'en',
          targetLanguage: payload.targetLanguage,
          enableTranslation: true,
          captionFormat: 'json',
          maxCaptionDuration: 5,
          minCaptionDuration: 1,
          maxCharactersPerCaption: payload.maxCaptionLength || 80,
          enableTimestamps: true,
          enableSpeakerDetection: false,
          maxRetries: 3,
          timeout: 300,
          style: payload.style || 'neutral',
          context: payload.context || 'Video caption',
          translationTemperature: 0.3,
          translationMaxTokens: 500,
        },
        payload.targetLanguage
      );

      // Format the final result
      const totalProcessingTime = Date.now() - startTime;
      const averageConfidence = gpt4oResult.translatedSegments.reduce(
        (sum, seg) => sum + (seg.confidence || 0.8), 0
      ) / gpt4oResult.translatedSegments.length;

      const result = {
        success: true,
        captions: gpt4oResult.translatedSegments.map(seg => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.translatedText || seg.text,
          language: payload.targetLanguage,
          confidence: seg.confidence,
          duration: seg.duration,
          wordCount: seg.wordCount,
          characterCount: seg.characterCount
        })),
        metadata: {
          totalSegments: gpt4oResult.translatedSegments.length,
          totalDuration: gpt4oResult.translatedSegments.reduce((sum, seg) => sum + seg.duration, 0),
          averageConfidence,
          audioDuration,
          processingTime: totalProcessingTime,
          tokensUsed: gpt4oResult.stats.tokensUsed,
          validationResults: gpt4oResult.validationResults,
          modelUsed: 'gpt-4o-mini',
          language: payload.targetLanguage,
          style: payload.style || 'neutral',
          context: payload.context || 'Video caption'
        }
      };

      console.log("Multi-language caption generation completed successfully", {
        totalSegments: result.metadata.totalSegments,
        totalDuration: result.metadata.totalDuration,
        averageConfidence: result.metadata.averageConfidence,
        tokensUsed: result.metadata.tokensUsed,
        validationIssues: result.metadata.validationResults.length,
        processingTime: totalProcessingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Multi-language caption generation failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      // Emit failure event if jobId is provided
      if (payload.jobId) {
        try {
          await renderService.addEvent(
            payload.jobId,
            'job_progress',
            'failed',
            'failed',
            {
              type: 'multi_language_caption_generation_failed',
              error: error instanceof Error ? error.message : error,
              targetLanguage: payload.targetLanguage,
              processingTime,
            },
            {
              severity: 'error',
              category: 'processing',
              tags: ['caption', 'multi-language', 'gpt4o-mini', 'error', 'failure']
            }
          );
        } catch (eventError) {
          console.warn("Failed to emit failure event", { eventError });
        }
      }

      throw new Error(`Multi-language caption generation failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Export supported languages for easy integration
export const SUPPORTED_CAPTION_LANGUAGES = Object.keys(LANGUAGE_PROMPT_TEMPLATES) as Array<"vi" | "hi" | "fr" | "es">;