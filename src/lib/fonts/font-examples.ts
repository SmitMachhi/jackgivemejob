// Font Manager Usage Examples
import { fontManager, fontUtils } from './font-manager';

export const fontExamples = {
  // Basic font selection
  basicFontSelection: async () => {
    console.log('=== Basic Font Selection ===');

    const result = await fontManager.getOptimalFont({
      text: 'Hello World',
      targetLanguage: 'en',
      style: 'normal',
      weight: 400
    });

    console.log('Recommended font:', result.fontFamily);
    console.log('Fallback chain:', result.fallbackFonts);
    console.log('Character coverage:', result.characterCoverage.percentage.toFixed(1) + '%');
    console.log('Loading strategy:', result.loadingStrategy);
    console.log('');
  },

  // Multi-language support
  multiLanguageSupport: async () => {
    console.log('=== Multi-Language Font Support ===');

    const languages = [
      { code: 'es', text: 'Hola Mundo ¿Cómo estás?', name: 'Spanish' },
      { code: 'fr', text: 'Bonjour le monde', name: 'French' },
      { code: 'de', text: 'Hallo Welt', name: 'German' },
      { code: 'vi', text: 'Xin chào thế giới', name: 'Vietnamese' },
      { code: 'ar', text: 'مرحبا بالعالم', name: 'Arabic' },
      { code: 'ja', text: 'こんにちは世界', name: 'Japanese' },
      { code: 'ko', text: '안녕하세요 세계', name: 'Korean' },
      { code: 'zh', text: '你好世界', name: 'Chinese' },
      { code: 'ru', text: 'Привет мир', name: 'Russian' }
    ];

    for (const lang of languages) {
      try {
        const result = await fontManager.getOptimalFont({
          text: lang.text,
          targetLanguage: lang.code,
          fallbackEnabled: true
        });

        console.log(`${lang.name} (${lang.code}):`);
        console.log(`  Font: ${result.fontFamily}`);
        console.log(`  Coverage: ${result.characterCoverage.percentage.toFixed(1)}%`);
        console.log(`  Missing chars: ${result.characterCoverage.missingCharacters.length}`);
        console.log('');
      } catch (error) {
        console.error(`${lang.name} failed:`, error);
      }
    }
  },

  // Font validation
  fontValidation: () => {
    console.log('=== Font Validation Examples ===');

    const testCases = [
      { font: 'Roboto', lang: 'en', text: 'Hello World' },
      { font: 'Noto Sans Arabic', lang: 'ar', text: 'مرحبا' },
      { font: 'Arial', lang: 'ja', text: 'こんにちは' },
      { font: 'Times New Roman', lang: 'vi', text: 'Xin chào' }
    ];

    testCases.forEach(({ font, lang, text }) => {
      const result = fontManager.validateFont(font, lang, text);
      console.log(`${font} for ${lang}:`);
      console.log(`  Valid: ${result.isValid ? 'Yes' : 'No'}`);
      console.log(`  Score: ${result.score}/100`);

      if (result.issues.critical.length > 0) {
        console.log(`  Critical: ${result.issues.critical.join(', ')}`);
      }
      if (result.issues.warning.length > 0) {
        console.log(`  Warnings: ${result.issues.warning.join(', ')}`);
      }
      if (result.recommendations.length > 0) {
        console.log(`  Recommendations: ${result.recommendations.join(', ')}`);
      }
      console.log('');
    });
  },

  // Font recommendations
  fontRecommendations: () => {
    console.log('=== Font Recommendations ===');

    const useCases = ['body', 'heading', 'display', 'code'];

    useCases.forEach(useCase => {
      console.log(`${useCase.charAt(0).toUpperCase() + useCase.slice(1)} text:`);

      ['en', 'es', 'ja', 'ar'].forEach(lang => {
        try {
          const recs = fontManager.getFontRecommendations(lang, useCase as any);
          console.log(`  ${lang}: ${recs.primary[0]} (fallback: ${recs.fallback[0]})`);
        } catch (error) {
          console.log(`  ${lang}: Error - ${error instanceof Error ? error.message : error}`);
        }
      });
      console.log('');
    });
  },

  // Performance optimization
  performanceOptimization: async () => {
    console.log('=== Performance Optimization ===');

    // Preload fonts for a language
    console.log('Preloading Japanese fonts...');
    await fontManager.preloadLanguageFonts('ja');

    // Check performance metrics
    const metrics = fontManager.getPerformanceMetrics();
    console.log('Performance Metrics:');
    console.log(`  Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`  Average load time: ${metrics.averageRenderTime.toFixed(2)}ms`);
    console.log(`  Fonts loaded: ${metrics.fontFamiliesLoaded}`);
    console.log(`  Failed loads: ${metrics.failedLoads}`);
    console.log('');
  },

  // CSS generation
  cssGeneration: () => {
    console.log('=== CSS Generation ===');

    // Generate font stack
    const fontStack = fontUtils.getFontStack('Roboto', ['Arial', 'sans-serif']);
    console.log('Font stack:', fontStack);

    // Generate @font-face CSS
    const fontFaceCSS = fontUtils.generateFontFaceCSS('Roboto');
    if (fontFaceCSS) {
      console.log('Generated CSS:');
      console.log(fontFaceCSS);
    } else {
      console.log('No CSS needed (system font)');
    }
    console.log('');
  },

  // Complex character handling
  complexCharacterHandling: async () => {
    console.log('=== Complex Character Handling ===');

    const complexTexts = [
      {
        lang: 'vi',
        text: 'Xin chào, đây là tiếng Việt với nhiều dấu câu và ký tự đặc biệt!',
        description: 'Vietnamese with diacritics'
      },
      {
        lang: 'ar',
        text: 'مرحبا بكم في عالم الخطوط العربية الجميلة',
        description: 'Arabic RTL text'
      },
      {
        lang: 'ja',
        text: 'こんにちは世界！これは日本語のテキストです。漢字、ひらがな、カタカナが含まれています。',
        description: 'Japanese with multiple scripts'
      },
      {
        lang: 'ko',
        text: '안녕하세요! 이것은 한국어 텍스트입니다. 한글 문자가 포함되어 있습니다.',
        description: 'Korean Hangul text'
      },
      {
        lang: 'zh',
        text: '你好，世界！这是包含简体中文字符的文本。',
        description: 'Simplified Chinese text'
      }
    ];

    for (const testCase of complexTexts) {
      try {
        const result = await fontManager.getOptimalFont({
          text: testCase.text,
          targetLanguage: testCase.lang,
          fallbackEnabled: true,
          performanceMode: true
        });

        const coverage = result.characterCoverage.percentage;
        const missing = result.characterCoverage.missingCharacters.length;
        const status = coverage >= 95 ? '✅ Excellent' :
                      coverage >= 85 ? '⚠️ Good' :
                      coverage >= 70 ? '❌ Fair' : '❌ Poor';

        console.log(`${testCase.description}:`);
        console.log(`  Status: ${status}`);
        console.log(`  Font: ${result.fontFamily}`);
        console.log(`  Coverage: ${coverage.toFixed(1)}%`);
        console.log(`  Missing characters: ${missing}`);

        if (result.warnings.length > 0) {
          console.log(`  Warnings: ${result.warnings.join(', ')}`);
        }
        console.log('');
      } catch (error) {
        console.error(`${testCase.description} failed:`, error);
      }
    }
  },

  // Integration with caption system
  captionSystemIntegration: async () => {
    console.log('=== Caption System Integration ===');

    const captionTexts = [
      {
        lang: 'es',
        captions: [
          'Bienvenido a nuestra presentación',
          'Hoy vamos a hablar sobre tecnología',
          'Gracias por su atención'
        ]
      },
      {
        lang: 'ja',
        captions: [
          '私たちのプレゼンテーションへようこそ',
          '今日はテクノロジーについて話します',
          'ご清聴ありがとうございました'
        ]
      },
      {
        lang: 'ar',
        captions: [
          'مرحبا بكم في عرضنا التقديمي',
          'سنتحدث اليوم عن التكنولوجيا',
          'شكرا لاهتمامكم'
        ]
      }
    ];

    for (const { lang, captions } of captionTexts) {
      console.log(`Processing ${lang} captions:`);

      for (const caption of captions) {
        try {
          const result = await fontManager.getOptimalFont({
            text: caption,
            targetLanguage: lang,
            style: 'normal',
            weight: 400,
            fallbackEnabled: true
          });

          const fontStack = fontUtils.getFontStack(result.fontFamily, result.fallbackFonts);
          console.log(`  "${caption}" -> ${fontStack}`);
        } catch (error) {
          console.error(`  Failed to process "${caption}":`, error);
        }
      }
      console.log('');
    }
  },

  // Error handling and fallbacks
  errorHandling: async () => {
    console.log('=== Error Handling and Fallbacks ===');

    const edgeCases = [
      {
        description: 'Unsupported language',
        request: { text: 'Hello', targetLanguage: 'xx' }
      },
      {
        description: 'Empty text',
        request: { text: '', targetLanguage: 'en' }
      },
      {
        description: 'Very long text',
        request: { text: 'A'.repeat(10000), targetLanguage: 'en' }
      },
      {
        description: 'Mixed scripts',
        request: { text: 'Hello こんにちは مرحبا', targetLanguage: 'en' }
      }
    ];

    for (const { description, request } of edgeCases) {
      try {
        const result = await fontManager.getOptimalFont(request);
        console.log(`${description}: Success - ${result.fontFamily}`);
      } catch (error) {
        console.log(`${description}: Failed - ${error instanceof Error ? error.message : error}`);
      }
    }
    console.log('');
  }
};

// Example usage function
export async function runFontExamples() {
  console.log('🎨 Font Manager System Examples\n');

  try {
    await fontExamples.basicFontSelection();
    await fontExamples.multiLanguageSupport();
    fontExamples.fontValidation();
    fontExamples.fontRecommendations();
    await fontExamples.performanceOptimization();
    fontExamples.cssGeneration();
    await fontExamples.complexCharacterHandling();
    await fontExamples.captionSystemIntegration();
    await fontExamples.errorHandling();

    console.log('✅ All font examples completed successfully!');
  } catch (error) {
    console.error('❌ Font examples failed:', error);
  }
}

// Export for easy usage
export default fontExamples;