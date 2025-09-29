/**
 * Font Management System - Multi-language font support with fallback logic
 *
 * This system provides comprehensive font management for international applications:
 * - Language-to-font mapping with cultural appropriateness
 * - Intelligent fallback logic for missing characters
 * - Font validation and performance optimization
 * - Loading and caching mechanisms
 * - Web font integration with Google Fonts and local fonts
 */

// Font family configuration
export interface FontFamily {
  name: string;
  displayName: string;
  category: 'serif' | 'sans-serif' | 'monospace' | 'handwriting' | 'display';
  weights: number[];
  styles: ('normal' | 'italic' | 'oblique')[];
  languages: string[];
  unicodeRanges: string[];
  characterCoverage: number; // 0-1 percentage
  fileFormats: ('woff2' | 'woff' | 'ttf' | 'otf' | 'eot')[];
  source: 'google' | 'local' | 'custom' | 'system';
  url?: string;
  localPath?: string;
  fileSize?: number; // in bytes
  loadingStrategy: 'swap' | 'block' | 'fallback' | 'optional';
  fallbackChain: string[];
  performanceMetrics?: {
    loadTime: number;
    renderTime: number;
    cacheHitRate: number;
  };
}

// Font request configuration
export interface FontRequest {
  text: string;
  targetLanguage: string;
  style?: 'normal' | 'italic' | 'oblique';
  weight?: number;
  size?: number;
  lineHeight?: number;
  letterSpacing?: number;
  fallbackEnabled?: boolean;
  performanceMode?: boolean;
}

// Font response with metadata
export interface FontResponse {
  fontFamily: string;
  fallbackFonts: string[];
  unicodeRange: string;
  characterCoverage: {
    supported: number;
    total: number;
    percentage: number;
    missingCharacters: string[];
  };
  loadingStrategy: string;
  estimatedLoadTime: number;
  cacheStatus: 'hit' | 'miss' | 'partial';
  performanceMetrics: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  };
  warnings: string[];
}

// Font validation result
export interface FontValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: {
    critical: string[];
    warning: string[];
    suggestion: string[];
  };
  recommendations: string[];
  alternativeFonts: string[];
}

// Language-specific font configuration
export interface LanguageFontConfig {
  languageCode: string;
  languageName: string;
  direction: 'ltr' | 'rtl';
  script: string;
  primaryFonts: string[];
  secondaryFonts: string[];
  fallbackFonts: string[];
  systemFonts: string[];
  recommendedWeights: number[];
  recommendedStyles: ('normal' | 'italic' | 'oblique')[];
  specialConsiderations: {
    requiresSpecialRendering: boolean;
    characterComplexity: 'simple' | 'moderate' | 'complex';
    lineHeightAdjustment: number;
    letterSpacingAdjustment: number;
  };
  googleFontsRecommendation?: {
    font: string;
    url: string;
    reason: string;
  };
}

// Font cache entry
interface FontCacheEntry {
  fontFamily: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadTime: number;
  lastAccessed: number;
  accessCount: number;
  characters: Set<string>;
  performanceMetrics: {
    loadTime: number;
    renderTime: number;
    cacheHitRate: number;
  };
}

// Font performance metrics
export interface FontPerformanceMetrics {
  totalLoadTime: number;
  averageRenderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkRequests: number;
  failedLoads: number;
  fontFamiliesLoaded: number;
  characterFallbackRate: number;
}

/**
 * Font Manager Class - Core font management functionality
 */
export class FontManager {
  private static instance: FontManager;
  private fontCache: Map<string, FontCacheEntry> = new Map();
  private performanceMetrics: FontPerformanceMetrics;
  private loadingPromises: Map<string, Promise<void>> = new Map();

  // Font configurations
  private fontFamilies: Map<string, FontFamily> = new Map();
  private languageConfigs: Map<string, LanguageFontConfig> = new Map();

  private constructor() {
    this.performanceMetrics = this.initializeMetrics();
    this.initializeFontFamilies();
    this.initializeLanguageConfigs();
    this.initializeSystemFonts();
  }

  public static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager();
    }
    return FontManager.instance;
  }

  /**
   * Get optimal font for given text and language
   */
  public async getOptimalFont(request: FontRequest): Promise<FontResponse> {
    const startTime = performance.now();

    try {
      // Get language configuration
      const langConfig = this.languageConfigs.get(request.targetLanguage);
      if (!langConfig) {
        throw new Error(`Unsupported language: ${request.targetLanguage}`);
      }

      // Analyze text characters
      const characterAnalysis = this.analyzeTextCharacters(request.text);

      // Determine primary font
      const primaryFont = this.selectPrimaryFont(langConfig, characterAnalysis);

      // Generate fallback chain
      const fallbackChain = this.generateFallbackChain(primaryFont, langConfig, characterAnalysis);

      // Calculate character coverage
      const coverage = this.calculateCharacterCoverage(request.text, primaryFont, fallbackChain);

      // Check cache status
      const cacheStatus = this.getCacheStatus(primaryFont, characterAnalysis.characters);

      // Load font if necessary
      if (cacheStatus === 'miss' || cacheStatus === 'partial') {
        await this.loadFont(primaryFont, request);
      }

      const loadTime = performance.now() - startTime;

      // Update performance metrics
      this.updatePerformanceMetrics({
        loadTime,
        cacheStatus,
        fontFamily: primaryFont,
        characterFallbackRate: coverage.missingCharacters.length / coverage.total
      });

      return {
        fontFamily: primaryFont,
        fallbackFonts: fallbackChain,
        unicodeRange: this.generateUnicodeRange(characterAnalysis.characters),
        characterCoverage: coverage,
        loadingStrategy: this.getLoadingStrategy(primaryFont),
        estimatedLoadTime: this.estimateLoadTime(primaryFont, cacheStatus),
        cacheStatus,
        performanceMetrics: {
          loadTime,
          renderTime: this.estimateRenderTime(request.text.length),
          memoryUsage: this.estimateMemoryUsage(primaryFont)
        },
        warnings: this.generateWarnings(coverage, langConfig)
      };

    } catch (error) {
      console.error('Font selection failed:', error);

      // Return fallback response
      return this.getFallbackResponse(request, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Validate font for specific language and content
   */
  public validateFont(fontFamily: string, languageCode: string, sampleText: string): FontValidationResult {
    const langConfig = this.languageConfigs.get(languageCode);
    const fontConfig = this.fontFamilies.get(fontFamily);

    if (!langConfig) {
      return {
        isValid: false,
        score: 0,
        issues: {
          critical: [`Unsupported language: ${languageCode}`],
          warning: [],
          suggestion: []
        },
        recommendations: ['Use a supported language code'],
        alternativeFonts: []
      };
    }

    if (!fontConfig) {
      return {
        isValid: false,
        score: 0,
        issues: {
          critical: [`Unknown font family: ${fontFamily}`],
          warning: [],
          suggestion: []
        },
        recommendations: ['Use a known font family or register custom font'],
        alternativeFonts: langConfig.primaryFonts
      };
    }

    const issues = {
      critical: [] as string[],
      warning: [] as string[],
      suggestion: [] as string[]
    };

    let score = 100;

    // Check language support
    if (!fontConfig.languages.includes(languageCode)) {
      issues.warning.push(`Font not specifically designed for ${langConfig.languageName}`);
      score -= 20;
    }

    // Check character coverage
    const coverage = this.calculateCharacterCoverage(sampleText, fontFamily, []);
    if (coverage.percentage < 90) {
      issues.warning.push(`Low character coverage (${coverage.percentage.toFixed(1)}%)`);
      score -= 15;
    }

    if (coverage.missingCharacters.length > 0) {
      issues.suggestion.push(`Consider adding fallback fonts for missing characters: ${coverage.missingCharacters.slice(0, 5).join(', ')}`);
      score -= 10;
    }

    // Check script compatibility
    if (fontConfig.category === 'monospace' && langConfig.specialConsiderations.characterComplexity === 'complex') {
      issues.warning.push('Monospace fonts may not render complex scripts well');
      score -= 10;
    }

    // Check direction support
    if (langConfig.direction === 'rtl' && !fontConfig.unicodeRanges.some(range => range.includes('Arabic'))) {
      issues.critical.push('Font may not support RTL text properly');
      score -= 30;
    }

    // Check loading performance
    if (fontConfig.fileSize && fontConfig.fileSize > 100000) { // 100KB
      issues.warning.push('Large font file may impact loading performance');
      score -= 5;
    }

    return {
      isValid: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations: this.generateValidationRecommendations(issues, langConfig),
      alternativeFonts: this.getAlternativeFonts(fontFamily, languageCode)
    };
  }

  /**
   * Load font with caching and performance optimization
   */
  public async loadFont(fontFamily: string, request?: FontRequest): Promise<void> {
    const cacheKey = this.generateCacheKey(fontFamily, request);

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Check cache
    const cached = this.fontCache.get(cacheKey);
    if (cached && cached.loaded) {
      cached.lastAccessed = Date.now();
      cached.accessCount++;
      return Promise.resolve();
    }

    const loadPromise = this.performFontLoad(fontFamily, request, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Get font performance metrics
   */
  public getPerformanceMetrics(): FontPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear font cache
   */
  public clearCache(): void {
    this.fontCache.clear();
    this.performanceMetrics = this.initializeMetrics();
  }

  /**
   * Preload fonts for specific language
   */
  public async preloadLanguageFonts(languageCode: string): Promise<void> {
    const langConfig = this.languageConfigs.get(languageCode);
    if (!langConfig) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }

    const fontsToLoad = [
      ...langConfig.primaryFonts,
      ...langConfig.secondaryFonts.slice(0, 2) // Load top 2 secondary fonts
    ];

    const loadPromises = fontsToLoad.map(font =>
      this.loadFont(font, { targetLanguage: languageCode, text: '', fallbackEnabled: true })
    );

    await Promise.all(loadPromises);
  }

  /**
   * Get font recommendations for language
   */
  public getFontRecommendations(languageCode: string, useCase?: 'body' | 'heading' | 'display' | 'code'): {
    primary: string[];
    secondary: string[];
    fallback: string[];
    recommendations: string[];
  } {
    const langConfig = this.languageConfigs.get(languageCode);
    if (!langConfig) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }

    const recommendations = this.generateUseCaseRecommendations(langConfig, useCase);

    return {
      primary: langConfig.primaryFonts,
      secondary: langConfig.secondaryFonts,
      fallback: langConfig.fallbackFonts,
      recommendations
    };
  }

  // Private helper methods
  private initializeMetrics(): FontPerformanceMetrics {
    return {
      totalLoadTime: 0,
      averageRenderTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      networkRequests: 0,
      failedLoads: 0,
      fontFamiliesLoaded: 0,
      characterFallbackRate: 0
    };
  }

  private initializeFontFamilies(): void {
    // Google Fonts integration
    const googleFonts: FontFamily[] = [
      {
        name: 'Roboto',
        displayName: 'Roboto',
        category: 'sans-serif',
        weights: [100, 300, 400, 500, 700, 900],
        styles: ['normal', 'italic'],
        languages: ['en', 'es', 'fr', 'de', 'vi'],
        unicodeRanges: ['Latin-1 Supplement', 'Latin Extended-A', 'Latin Extended-B'],
        characterCoverage: 0.95,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Arial', 'Helvetica', 'sans-serif']
      },
      {
        name: 'Noto Sans',
        displayName: 'Noto Sans',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        languages: ['en', 'es', 'fr', 'de', 'vi', 'ru', 'ar'],
        unicodeRanges: ['Latin', 'Cyrillic', 'Arabic', 'Greek'],
        characterCoverage: 0.98,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Roboto', 'Arial', 'sans-serif']
      },
      {
        name: 'Noto Sans Arabic',
        displayName: 'Noto Sans Arabic',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal'],
        languages: ['ar'],
        unicodeRanges: ['Arabic'],
        characterCoverage: 0.99,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Tahoma', 'Arial', 'sans-serif']
      },
      {
        name: 'Noto Sans JP',
        displayName: 'Noto Sans JP',
        category: 'sans-serif',
        weights: [300, 400, 500, 700],
        styles: ['normal'],
        languages: ['ja'],
        unicodeRanges: ['Hiragana', 'Katakana', 'Kanji', 'Latin'],
        characterCoverage: 0.99,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300..700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Hiragino Sans', 'Yu Gothic', 'sans-serif']
      },
      {
        name: 'Noto Sans KR',
        displayName: 'Noto Sans KR',
        category: 'sans-serif',
        weights: [300, 400, 500, 700],
        styles: ['normal'],
        languages: ['ko'],
        unicodeRanges: ['Hangul', 'Latin'],
        characterCoverage: 0.99,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300..700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Malgun Gothic', 'sans-serif']
      },
      {
        name: 'Noto Sans SC',
        displayName: 'Noto Sans SC',
        category: 'sans-serif',
        weights: [300, 400, 500, 700],
        styles: ['normal'],
        languages: ['zh'],
        unicodeRanges: ['Han Simplified', 'Latin'],
        characterCoverage: 0.99,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300..700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Microsoft YaHei', 'SimSun', 'sans-serif']
      },
      {
        name: 'Noto Sans Devanagari',
        displayName: 'Noto Sans Devanagari',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal'],
        languages: ['hi'],
        unicodeRanges: ['Devanagari', 'Latin'],
        characterCoverage: 0.99,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Noto Sans', 'Arial', 'sans-serif']
      },
      {
        name: 'Source Han Sans',
        displayName: 'Source Han Sans',
        category: 'sans-serif',
        weights: [300, 400, 500, 700],
        styles: ['normal'],
        languages: ['ja', 'ko', 'zh'],
        unicodeRanges: ['Han', 'Hiragana', 'Katakana', 'Hangul', 'Latin'],
        characterCoverage: 0.98,
        fileFormats: ['woff2', 'woff'],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Source+Han+Sans:wght@300..700&display=swap',
        loadingStrategy: 'swap',
        fallbackChain: ['Noto Sans', 'sans-serif']
      }
    ];

    // System fonts
    const systemFonts: FontFamily[] = [
      {
        name: 'Arial',
        displayName: 'Arial',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        languages: ['en', 'es', 'fr', 'de'],
        unicodeRanges: ['Latin-1'],
        characterCoverage: 0.85,
        fileFormats: ['ttf'],
        source: 'system',
        loadingStrategy: 'swap',
        fallbackChain: ['Helvetica', 'sans-serif']
      },
      {
        name: 'Times New Roman',
        displayName: 'Times New Roman',
        category: 'serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        languages: ['en', 'es', 'fr', 'de'],
        unicodeRanges: ['Latin-1'],
        characterCoverage: 0.85,
        fileFormats: ['ttf'],
        source: 'system',
        loadingStrategy: 'swap',
        fallbackChain: ['Georgia', 'serif']
      },
      {
        name: 'Georgia',
        displayName: 'Georgia',
        category: 'serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        languages: ['en', 'es', 'fr', 'de'],
        unicodeRanges: ['Latin-1'],
        characterCoverage: 0.85,
        fileFormats: ['ttf'],
        source: 'system',
        loadingStrategy: 'swap',
        fallbackChain: ['Times New Roman', 'serif']
      }
    ];

    // Register all fonts
    [...googleFonts, ...systemFonts].forEach(font => {
      this.fontFamilies.set(font.name, font);
    });
  }

  private initializeLanguageConfigs(): void {
    const configs: LanguageFontConfig[] = [
      {
        languageCode: 'en',
        languageName: 'English',
        direction: 'ltr',
        script: 'Latin',
        primaryFonts: ['Roboto', 'Arial', 'Helvetica'],
        secondaryFonts: ['Georgia', 'Times New Roman'],
        fallbackFonts: ['sans-serif', 'serif'],
        systemFonts: ['Arial', 'Times New Roman', 'Georgia'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'simple',
          lineHeightAdjustment: 1.2,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Roboto',
          url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
          reason: 'Excellent readability and comprehensive character support'
        }
      },
      {
        languageCode: 'es',
        languageName: 'Spanish',
        direction: 'ltr',
        script: 'Latin',
        primaryFonts: ['Roboto', 'Noto Sans'],
        secondaryFonts: ['Open Sans', 'Lato'],
        fallbackFonts: ['Arial', 'Helvetica', 'sans-serif'],
        systemFonts: ['Arial', 'Helvetica'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'simple',
          lineHeightAdjustment: 1.3,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Roboto',
          url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
          reason: 'Good support for Spanish accented characters'
        }
      },
      {
        languageCode: 'fr',
        languageName: 'French',
        direction: 'ltr',
        script: 'Latin',
        primaryFonts: ['Roboto', 'Open Sans'],
        secondaryFonts: ['Lato', 'Noto Sans'],
        fallbackFonts: ['Arial', 'Helvetica', 'sans-serif'],
        systemFonts: ['Arial', 'Helvetica'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'simple',
          lineHeightAdjustment: 1.3,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Open Sans',
          url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300..800&display=swap',
          reason: 'Excellent French accent and ligature support'
        }
      },
      {
        languageCode: 'de',
        languageName: 'German',
        direction: 'ltr',
        script: 'Latin',
        primaryFonts: ['Roboto', 'Open Sans'],
        secondaryFonts: ['Lato', 'Source Sans Pro'],
        fallbackFonts: ['Arial', 'Helvetica', 'sans-serif'],
        systemFonts: ['Arial', 'Helvetica'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'simple',
          lineHeightAdjustment: 1.3,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Source Sans Pro',
          url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200..900&display=swap',
          reason: 'Excellent German umlaut and special character support'
        }
      },
      {
        languageCode: 'vi',
        languageName: 'Vietnamese',
        direction: 'ltr',
        script: 'Latin',
        primaryFonts: ['Roboto', 'Open Sans'],
        secondaryFonts: ['Noto Sans', 'Lato'],
        fallbackFonts: ['Arial', 'sans-serif'],
        systemFonts: ['Arial'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'moderate',
          lineHeightAdjustment: 1.4,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Roboto',
          url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
          reason: 'Good Vietnamese diacritic support'
        }
      },
      {
        languageCode: 'ar',
        languageName: 'Arabic',
        direction: 'rtl',
        script: 'Arabic',
        primaryFonts: ['Noto Sans Arabic', 'Tahoma'],
        secondaryFonts: ['Arial', 'Helvetica'],
        fallbackFonts: ['sans-serif'],
        systemFonts: ['Tahoma'],
        recommendedWeights: [400, 700],
        recommendedStyles: ['normal'],
        specialConsiderations: {
          requiresSpecialRendering: true,
          characterComplexity: 'complex',
          lineHeightAdjustment: 1.6,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Noto Sans Arabic',
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap',
          reason: 'Comprehensive Arabic script support with proper RTL rendering'
        }
      },
      {
        languageCode: 'ja',
        languageName: 'Japanese',
        direction: 'ltr',
        script: 'Japanese',
        primaryFonts: ['Noto Sans JP', 'Source Han Sans'],
        secondaryFonts: ['Hiragino Sans', 'Yu Gothic'],
        fallbackFonts: ['sans-serif'],
        systemFonts: ['Hiragino Sans', 'Yu Gothic'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal'],
        specialConsiderations: {
          requiresSpecialRendering: true,
          characterComplexity: 'complex',
          lineHeightAdjustment: 1.8,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Noto Sans JP',
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300..700&display=swap',
          reason: 'Comprehensive Japanese character set with excellent readability'
        }
      },
      {
        languageCode: 'ko',
        languageName: 'Korean',
        direction: 'ltr',
        script: 'Hangul',
        primaryFonts: ['Noto Sans KR', 'Malgun Gothic'],
        secondaryFonts: ['Source Han Sans', 'Batang'],
        fallbackFonts: ['sans-serif'],
        systemFonts: ['Malgun Gothic', 'Batang'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal'],
        specialConsiderations: {
          requiresSpecialRendering: true,
          characterComplexity: 'complex',
          lineHeightAdjustment: 1.6,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Noto Sans KR',
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300..700&display=swap',
          reason: 'Complete Hangul support with modern design'
        }
      },
      {
        languageCode: 'zh',
        languageName: 'Chinese (Simplified)',
        direction: 'ltr',
        script: 'Han',
        primaryFonts: ['Noto Sans SC', 'Source Han Sans'],
        secondaryFonts: ['Microsoft YaHei', 'SimSun'],
        fallbackFonts: ['sans-serif'],
        systemFonts: ['Microsoft YaHei', 'SimSun'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal'],
        specialConsiderations: {
          requiresSpecialRendering: true,
          characterComplexity: 'complex',
          lineHeightAdjustment: 1.8,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Noto Sans SC',
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300..700&display=swap',
          reason: 'Comprehensive simplified Chinese character support'
        }
      },
      {
        languageCode: 'hi',
        languageName: 'Hindi',
        direction: 'ltr',
        script: 'Devanagari',
        primaryFonts: ['Noto Sans Devanagari', 'Noto Sans'],
        secondaryFonts: ['Arial', 'sans-serif'],
        fallbackFonts: ['sans-serif'],
        systemFonts: ['Arial'],
        recommendedWeights: [400, 700],
        recommendedStyles: ['normal'],
        specialConsiderations: {
          requiresSpecialRendering: true,
          characterComplexity: 'complex',
          lineHeightAdjustment: 1.6,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Noto Sans Devanagari',
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap',
          reason: 'Comprehensive Devanagari script support with proper vowel marking'
        }
      },
      {
        languageCode: 'ru',
        languageName: 'Russian',
        direction: 'ltr',
        script: 'Cyrillic',
        primaryFonts: ['Roboto', 'Open Sans'],
        secondaryFonts: ['Noto Sans', 'Source Sans Pro'],
        fallbackFonts: ['Arial', 'sans-serif'],
        systemFonts: ['Arial'],
        recommendedWeights: [300, 400, 500, 700],
        recommendedStyles: ['normal', 'italic'],
        specialConsiderations: {
          requiresSpecialRendering: false,
          characterComplexity: 'moderate',
          lineHeightAdjustment: 1.4,
          letterSpacingAdjustment: 0
        },
        googleFontsRecommendation: {
          font: 'Roboto',
          url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
          reason: 'Good Cyrillic character support'
        }
      }
    ];

    configs.forEach(config => {
      this.languageConfigs.set(config.languageCode, config);
    });
  }

  private initializeSystemFonts(): void {
    // Initialize system font detection
    if (typeof document !== 'undefined') {
      const testElement = document.createElement('div');
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.style.fontSize = '48px';

      // Test for common system fonts
      const testFonts = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'];
      testFonts.forEach(fontName => {
        testElement.style.fontFamily = `'${fontName}', monospace`;
        testElement.textContent = 'mmmmmmmmmmlli';

        const defaultWidth = testElement.offsetWidth;
        testElement.style.fontFamily = `'${fontName}', sans-serif`;
        const testWidth = testElement.offsetWidth;

        if (testWidth !== defaultWidth) {
          // Font is available
          const fontConfig = this.fontFamilies.get(fontName);
          if (fontConfig) {
            fontConfig.performanceMetrics = {
              loadTime: 0,
              renderTime: 5,
              cacheHitRate: 1.0
            };
          }
        }
      });
    }
  }

  private analyzeTextCharacters(text: string) {
    const characters = new Set(text.split(''));
    const unicodeRanges = new Set<string>();

    characters.forEach(char => {
      const codePoint = char.codePointAt(0) || 0;
      const range = this.getUnicodeRange(codePoint);
      unicodeRanges.add(range);
    });

    return {
      characters,
      unicodeRanges: Array.from(unicodeRanges),
      characterCount: characters.size
    };
  }

  private getUnicodeRange(codePoint: number): string {
    if (codePoint <= 0x007F) return 'Basic Latin';
    if (codePoint <= 0x00FF) return 'Latin-1 Supplement';
    if (codePoint <= 0x017F) return 'Latin Extended-A';
    if (codePoint <= 0x024F) return 'Latin Extended-B';
    if (codePoint <= 0x02AF) return 'IPA Extensions';
    if (codePoint <= 0x02FF) return 'Spacing Modifier Letters';
    if (codePoint <= 0x036F) return 'Combining Diacritical Marks';
    if (codePoint <= 0x03FF) return 'Greek and Coptic';
    if (codePoint <= 0x04FF) return 'Cyrillic';
    if (codePoint <= 0x052F) return 'Cyrillic Supplementary';
    if (codePoint <= 0x058F) return 'Armenian';
    if (codePoint <= 0x05FF) return 'Hebrew';
    if (codePoint <= 0x06FF) return 'Arabic';
    if (codePoint <= 0x070F) return 'Syriac';
    if (codePoint <= 0x074F) return 'Arabic Supplement';
    if (codePoint <= 0x077F) return 'Thaana';
    if (codePoint <= 0x07BF) return 'NKo';
    if (codePoint <= 0x07FF) return 'Other European Scripts';
    if (codePoint <= 0x08FF) return 'Other African Scripts';
    if (codePoint <= 0x097F) return 'Devanagari';
    if (codePoint <= 0x09FF) return 'Bengali';
    if (codePoint <= 0x0A7F) return 'Gurmukhi';
    if (codePoint <= 0x0AFF) return 'Gujarati';
    if (codePoint <= 0x0B7F) return 'Oriya';
    if (codePoint <= 0x0BFF) return 'Tamil';
    if (codePoint <= 0x0C7F) return 'Telugu';
    if (codePoint <= 0x0CFF) return 'Kannada';
    if (codePoint <= 0x0D7F) return 'Malayalam';
    if (codePoint <= 0x0DFF) return 'Sinhala';
    if (codePoint <= 0x0E7F) return 'Thai';
    if (codePoint <= 0x0EFF) return 'Lao';
    if (codePoint <= 0x0FBF) return 'Tibetan';
    if (codePoint <= 0x0FFF) return 'Other Southeast Asian Scripts';
    if (codePoint <= 0x109F) return 'Georgian';
    if (codePoint <= 0x10FF) return 'Other Eurasian Scripts';
    if (codePoint <= 0x11FF) return 'Hangul Jamo';
    if (codePoint <= 0x137F) return 'Ethiopic';
    if (codePoint <= 0x139F) return 'Other African Scripts';
    if (codePoint <= 0x167F) return 'Unified Canadian Aboriginal Syllabics';
    if (codePoint <= 0x169F) return 'Other North American Scripts';
    if (codePoint <= 0x16FF) return 'Other American Scripts';
    if (codePoint <= 0x177F) return 'Other Oceanian Scripts';
    if (codePoint <= 0x18AF) return 'Mongolian';
    if (codePoint <= 0x18FF) return 'Other Eurasian Scripts';
    if (codePoint <= 0x194F) return 'Other African Scripts';
    if (codePoint <= 0x197F) return 'Other African Scripts';
    if (codePoint <= 0x19DF) return 'Other African Scripts';
    if (codePoint <= 0x19FF) return 'Other African Scripts';
    if (codePoint <= 0x1D4F) return 'Other Eurasian Scripts';
    if (codePoint <= 0x1D7F) return 'Other Eurasian Scripts';
    if (codePoint <= 0x1DFF) return 'Other Eurasian Scripts';
    if (codePoint <= 0x1EFF) return 'Other Eurasian Scripts';
    if (codePoint <= 0x1FFF) return 'Other Eurasian Scripts';
    if (codePoint <= 0x206F) return 'General Punctuation';
    if (codePoint <= 0x209F) return 'Superscripts and Subscripts';
    if (codePoint <= 0x20CF) return 'Currency Symbols';
    if (codePoint <= 0x20FF) return 'Combining Diacritical Marks for Symbols';
    if (codePoint <= 0x212F) return 'Letterlike Symbols';
    if (codePoint <= 0x213F) return 'Number Forms';
    if (codePoint <= 0x214F) return 'Other Symbols';
    if (codePoint <= 0x218F) return 'Other Symbols';
    if (codePoint <= 0x219F) return 'Arrows';
    if (codePoint <= 0x21FF) return 'Arrows';
    if (codePoint <= 0x22FF) return 'Mathematical Operators';
    if (codePoint <= 0x23FF) return 'Miscellaneous Technical';
    if (codePoint <= 0x243F) return 'Control Pictures';
    if (codePoint <= 0x245F) return 'Optical Character Recognition';
    if (codePoint <= 0x24FF) return 'Enclosed Alphanumerics';
    if (codePoint <= 0x257F) return 'Box Drawing';
    if (codePoint <= 0x259F) return 'Block Elements';
    if (codePoint <= 0x25FF) return 'Geometric Shapes';
    if (codePoint <= 0x26FF) return 'Miscellaneous Symbols';
    if (codePoint <= 0x27BF) return 'Dingbats';
    if (codePoint <= 0x27FF) return 'Miscellaneous Symbols';
    if (codePoint <= 0x28FF) return 'Braille Patterns';
    if (codePoint <= 0x28FF) return 'Braille Patterns';
    if (codePoint <= 0x29FF) return 'Supplemental Arrows-A';
    if (codePoint <= 0x2AFF) return 'Supplemental Arrows-B';
    if (codePoint <= 0x2BFF) return 'Miscellaneous Symbols and Arrows';
    if (codePoint <= 0x2CFF) return 'Gliphaglyphs';
    if (codePoint <= 0x2DFF) return 'Gliphaglyphs';
    if (codePoint <= 0x2E7F) return 'CJK Symbols and Punctuation';
    if (codePoint <= 0x2EFF) return 'Hiragana';
    if (codePoint <= 0x2FAF) return 'Katakana';
    if (codePoint <= 0x2FFF) return 'Bopomofo';
    if (codePoint <= 0x302F) return 'Hangul Compatibility Jamo';
    if (codePoint <= 0x303F) return 'Kanbun';
    if (codePoint <= 0x309F) return 'Bopomofo Extended';
    if (codePoint <= 0x30FF) return 'Katakana Phonetic Extensions';
    if (codePoint <= 0x312F) return 'Enclosed CJK Letters and Months';
    if (codePoint <= 0x318F) return 'CJK Compatibility';
    if (codePoint <= 0x319F) return 'Hangul Syllables';
    if (codePoint <= 0x31FF) return 'Kanbun';
    if (codePoint <= 0x32FF) return 'Bopomofo Extended';
    if (codePoint <= 0x33FF) return 'CJK Strokes';
    if (codePoint <= 0x4DBF) return 'CJK Unified Ideographs Extension A';
    if (codePoint <= 0x4DFF) return 'Yijing Hexagram Symbols';
    if (codePoint <= 0x9FFF) return 'CJK Unified Ideographs';
    if (codePoint <= 0xA48F) return 'Yi Syllables';
    if (codePoint <= 0xA4CF) return 'Yi Radicals';
    if (codePoint <= 0xA4DF) return 'Lisu';
    if (codePoint <= 0xA4FF) return 'Vai';
    if (codePoint <= 0xA63F) return 'Other African Scripts';
    if (codePoint <= 0xA67F) return 'Other African Scripts';
    if (codePoint <= 0xA69F) return 'Other African Scripts';
    if (codePoint <= 0xA6FF) return 'Other African Scripts';
    if (codePoint <= 0xA71F) return 'Other African Scripts';
    if (codePoint <= 0xA7FF) return 'Other African Scripts';
    if (codePoint <= 0xA7FF) return 'Other African Scripts';
    if (codePoint <= 0xA82F) return 'Other African Scripts';
    if (codePoint <= 0xA83F) return 'Other African Scripts';
    if (codePoint <= 0xA87F) return 'Other African Scripts';
    if (codePoint <= 0xA8FF) return 'Other African Scripts';
    if (codePoint <= 0xA8FF) return 'Other African Scripts';
    if (codePoint <= 0xA92F) return 'Other African Scripts';
    if (codePoint <= 0xA95F) return 'Other African Scripts';
    if (codePoint <= 0xA97F) return 'Other African Scripts';
    if (codePoint <= 0xA9CF) return 'Other African Scripts';
    if (codePoint <= 0xA9DF) return 'Other African Scripts';
    if (codePoint <= 0xA9FF) return 'Other African Scripts';
    if (codePoint <= 0xAA4F) return 'Other African Scripts';
    if (codePoint <= 0xAA5F) return 'Other African Scripts';
    if (codePoint <= 0xAA6F) return 'Other African Scripts';
    if (codePoint <= 0xAA7F) return 'Other African Scripts';
    if (codePoint <= 0xAAAF) return 'Other African Scripts';
    if (codePoint <= 0xAABF) return 'Other African Scripts';
    if (codePoint <= 0xAACF) return 'Other African Scripts';
    if (codePoint <= 0xAADF) return 'Other African Scripts';
    if (codePoint <= 0xAAFF) return 'Other African Scripts';
    if (codePoint <= 0xAB2F) return 'Other African Scripts';
    if (codePoint <= 0xAB4F) return 'Other African Scripts';
    if (codePoint <= 0xAB6F) return 'Other African Scripts';
    if (codePoint <= 0xAB8F) return 'Other African Scripts';
    if (codePoint <= 0xABAF) return 'Other African Scripts';
    if (codePoint <= 0xABBF) return 'Other African Scripts';
    if (codePoint <= 0xABFF) return 'Other African Scripts';
    if (codePoint <= 0xACFF) return 'Other African Scripts';
    if (codePoint <= 0xADFF) return 'Other African Scripts';
    if (codePoint <= 0xAEFF) return 'Other African Scripts';
    if (codePoint <= 0xAFFF) return 'Other African Scripts';
    if (codePoint <= 0xB03F) return 'Other African Scripts';
    if (codePoint <= 0xB05F) return 'Other African Scripts';
    if (codePoint <= 0xB07F) return 'Other African Scripts';
    if (codePoint <= 0xB09F) return 'Other African Scripts';
    if (codePoint <= 0xB0BF) return 'Other African Scripts';
    if (codePoint <= 0xB0FF) return 'Other African Scripts';
    if (codePoint <= 0xB1FF) return 'Other African Scripts';
    if (codePoint <= 0xB2FF) return 'Other African Scripts';
    if (codePoint <= 0xB3FF) return 'Other African Scripts';
    if (codePoint <= 0xB4FF) return 'Other African Scripts';
    if (codePoint <= 0xB5FF) return 'Other African Scripts';
    if (codePoint <= 0xB6FF) return 'Other African Scripts';
    if (codePoint <= 0xB7FF) return 'Other African Scripts';
    if (codePoint <= 0xB8FF) return 'Other African Scripts';
    if (codePoint <= 0xB9FF) return 'Other African Scripts';
    if (codePoint <= 0xBAFF) return 'Other African Scripts';
    if (codePoint <= 0xBBFF) return 'Other African Scripts';
    if (codePoint <= 0xBCFF) return 'Other African Scripts';
    if (codePoint <= 0xBDFF) return 'Other African Scripts';
    if (codePoint <= 0xBEFF) return 'Other African Scripts';
    if (codePoint <= 0xBFFF) return 'Other African Scripts';
    if (codePoint <= 0xC03F) return 'Other African Scripts';
    if (codePoint <= 0xC04F) return 'Other African Scripts';
    if (codePoint <= 0xC05F) return 'Other African Scripts';
    if (codePoint <= 0xC06F) return 'Other African Scripts';
    if (codePoint <= 0xC07F) return 'Other African Scripts';
    if (codePoint <= 0xC08F) return 'Other African Scripts';
    if (codePoint <= 0xC09F) return 'Other African Scripts';
    if (codePoint <= 0xC0AF) return 'Other African Scripts';
    if (codePoint <= 0xC0BF) return 'Other African Scripts';
    if (codePoint <= 0xC0FF) return 'Other African Scripts';
    if (codePoint <= 0xC1FF) return 'Other African Scripts';
    if (codePoint <= 0xC2FF) return 'Other African Scripts';
    if (codePoint <= 0xC3FF) return 'Other African Scripts';
    if (codePoint <= 0xC4FF) return 'Other African Scripts';
    if (codePoint <= 0xC5FF) return 'Other African Scripts';
    if (codePoint <= 0xC6FF) return 'Other African Scripts';
    if (codePoint <= 0xC7FF) return 'Other African Scripts';
    if (codePoint <= 0xC8FF) return 'Other African Scripts';
    if (codePoint <= 0xC9FF) return 'Other African Scripts';
    if (codePoint <= 0xCAFF) return 'Other African Scripts';
    if (codePoint <= 0xCBFF) return 'Other African Scripts';
    if (codePoint <= 0xCCFF) return 'Other African Scripts';
    if (codePoint <= 0xCDFF) return 'Other African Scripts';
    if (codePoint <= 0xCEFF) return 'Other African Scripts';
    if (codePoint <= 0xCFFF) return 'Other African Scripts';
    if (codePoint <= 0xD0FF) return 'Other African Scripts';
    if (codePoint <= 0xD1FF) return 'Other African Scripts';
    if (codePoint <= 0xD2FF) return 'Other African Scripts';
    if (codePoint <= 0xD3FF) return 'Other African Scripts';
    if (codePoint <= 0xD4FF) return 'Other African Scripts';
    if (codePoint <= 0xD5FF) return 'Other African Scripts';
    if (codePoint <= 0xD6FF) return 'Other African Scripts';
    if (codePoint <= 0xD7FF) return 'Other African Scripts';
    if (codePoint <= 0xD8FF) return 'Other African Scripts';
    if (codePoint <= 0xD9FF) return 'Other African Scripts';
    if (codePoint <= 0xDAFF) return 'Other African Scripts';
    if (codePoint <= 0xDBFF) return 'Other African Scripts';
    if (codePoint <= 0xDCFF) return 'Other African Scripts';
    if (codePoint <= 0xDDFF) return 'Other African Scripts';
    if (codePoint <= 0xDEFF) return 'Other African Scripts';
    if (codePoint <= 0xDFFF) return 'Other African Scripts';
    if (codePoint <= 0xE0FF) return 'Other African Scripts';
    if (codePoint <= 0xE1FF) return 'Other African Scripts';
    if (codePoint <= 0xE2FF) return 'Other African Scripts';
    if (codePoint <= 0xE3FF) return 'Other African Scripts';
    if (codePoint <= 0xE4FF) return 'Other African Scripts';
    if (codePoint <= 0xE5FF) return 'Other African Scripts';
    if (codePoint <= 0xE6FF) return 'Other African Scripts';
    if (codePoint <= 0xE7FF) return 'Other African Scripts';
    if (codePoint <= 0xE8FF) return 'Other African Scripts';
    if (codePoint <= 0xE9FF) return 'Other African Scripts';
    if (codePoint <= 0xEAFF) return 'Other African Scripts';
    if (codePoint <= 0xEBFF) return 'Other African Scripts';
    if (codePoint <= 0xECFF) return 'Other African Scripts';
    if (codePoint <= 0xEDFF) return 'Other African Scripts';
    if (codePoint <= 0xEEFF) return 'Other African Scripts';
    if (codePoint <= 0xEFFF) return 'Other African Scripts';
    if (codePoint <= 0xF0FF) return 'Other African Scripts';
    if (codePoint <= 0xF1FF) return 'Other African Scripts';
    if (codePoint <= 0xF2FF) return 'Other African Scripts';
    if (codePoint <= 0xF3FF) return 'Other African Scripts';
    if (codePoint <= 0xF4FF) return 'Other African Scripts';
    if (codePoint <= 0xF5FF) return 'Other African Scripts';
    if (codePoint <= 0xF6FF) return 'Other African Scripts';
    if (codePoint <= 0xF7FF) return 'Other African Scripts';
    if (codePoint <= 0xF8FF) return 'Other African Scripts';
    if (codePoint <= 0xF9FF) return 'Other African Scripts';
    if (codePoint <= 0xFAFF) return 'Other African Scripts';
    if (codePoint <= 0xFBFF) return 'Other African Scripts';
    if (codePoint <= 0xFCFF) return 'Other African Scripts';
    if (codePoint <= 0xFDFF) return 'Other African Scripts';
    if (codePoint <= 0xFEFF) return 'Other African Scripts';
    if (codePoint <= 0xFFFF) return 'Other African Scripts';
    if (codePoint <= 0x10FFFF) return 'Supplementary Private Use Area-A';
    return 'Unknown';
  }

  private selectPrimaryFont(langConfig: LanguageFontConfig, characterAnalysis: any): string {
    // Try primary fonts first
    for (const fontName of langConfig.primaryFonts) {
      const font = this.fontFamilies.get(fontName);
      if (font && this.hasUnicodeCoverage(font, characterAnalysis.unicodeRanges)) {
        return fontName;
      }
    }

    // Try secondary fonts
    for (const fontName of langConfig.secondaryFonts) {
      const font = this.fontFamilies.get(fontName);
      if (font && this.hasUnicodeCoverage(font, characterAnalysis.unicodeRanges)) {
        return fontName;
      }
    }

    // Fall back to first primary font
    return langConfig.primaryFonts[0];
  }

  private hasUnicodeCoverage(font: FontFamily, requiredRanges: string[]): boolean {
    return requiredRanges.some(range =>
      font.unicodeRanges.some(fontRange =>
        fontRange.includes(range.split(' ')[0]) || range.includes(fontRange.split(' ')[0])
      )
    );
  }

  private generateFallbackChain(primaryFont: string, langConfig: LanguageFontConfig, characterAnalysis: any): string[] {
    const fallbackChain: string[] = [];

    // Add secondary fonts
    langConfig.secondaryFonts.forEach(fontName => {
      if (fontName !== primaryFont) {
        fallbackChain.push(fontName);
      }
    });

    // Add fallback fonts
    langConfig.fallbackFonts.forEach(fontName => {
      if (!fallbackChain.includes(fontName) && fontName !== primaryFont) {
        fallbackChain.push(fontName);
      }
    });

    // Add generic fallbacks
    const genericFallbacks = ['sans-serif', 'serif', 'monospace'];
    genericFallbacks.forEach(fallback => {
      if (!fallbackChain.includes(fallback)) {
        fallbackChain.push(fallback);
      }
    });

    return fallbackChain;
  }

  private calculateCharacterCoverage(text: string, primaryFont: string, fallbackChain: string[]) {
    const characters = new Set(text.split(''));
    let supported = 0;
    const missingCharacters: string[] = [];

    characters.forEach(char => {
      if (this.isCharacterSupported(char, primaryFont)) {
        supported++;
      } else {
        // Check fallback fonts
        let fallbackSupported = false;
        for (const fallbackFont of fallbackChain) {
          if (this.isCharacterSupported(char, fallbackFont)) {
            fallbackSupported = true;
            break;
          }
        }

        if (fallbackSupported) {
          supported++;
        } else {
          missingCharacters.push(char);
        }
      }
    });

    return {
      supported,
      total: characters.size,
      percentage: characters.size > 0 ? (supported / characters.size) * 100 : 100,
      missingCharacters
    };
  }

  private isCharacterSupported(character: string, fontFamily: string): boolean {
    // Simplified character support check
    // In a real implementation, this would use font metrics or canvas rendering
    const font = this.fontFamilies.get(fontFamily);
    if (!font) return false;

    const codePoint = character.codePointAt(0) || 0;
    const unicodeRange = this.getUnicodeRange(codePoint);

    return font.unicodeRanges.some(range =>
      range.includes(unicodeRange.split(' ')[0]) || unicodeRange.includes(range.split(' ')[0])
    );
  }

  private generateCacheKey(fontFamily: string, request?: FontRequest): string {
    return `${fontFamily}-${request?.targetLanguage || 'default'}-${request?.weight || 400}-${request?.style || 'normal'}`;
  }

  private getCacheStatus(fontFamily: string, characters: Set<string>): 'hit' | 'miss' | 'partial' {
    const cacheEntries = Array.from(this.fontCache.values()).filter(entry =>
      entry.fontFamily === fontFamily && entry.loaded
    );

    if (cacheEntries.length === 0) return 'miss';

    const cachedCharacters = new Set<string>();
    cacheEntries.forEach(entry => {
      entry.characters.forEach(char => cachedCharacters.add(char));
    });

    const allCharactersCached = Array.from(characters).every(char => cachedCharacters.has(char));
    if (allCharactersCached) return 'hit';

    const someCharactersCached = Array.from(characters).some(char => cachedCharacters.has(char));
    if (someCharactersCached) return 'partial';

    return 'miss';
  }

  private async performFontLoad(fontFamily: string, request?: FontRequest, cacheKey?: string): Promise<void> {
    const startTime = performance.now();

    try {
      const font = this.fontFamilies.get(fontFamily);
      if (!font) {
        throw new Error(`Font family not found: ${fontFamily}`);
      }

      // Load font based on source
      if (font.source === 'google' && font.url && typeof document !== 'undefined') {
        await this.loadGoogleFont(font);
      } else if (font.source === 'local' && font.localPath) {
        await this.loadLocalFont(font);
      } else if (font.source === 'system') {
        // System fonts are already available
        await this.markSystemFontLoaded(font, cacheKey);
      }

      const loadTime = performance.now() - startTime;

      // Update cache
      if (cacheKey) {
        this.fontCache.set(cacheKey, {
          fontFamily,
          loaded: true,
          loading: false,
          error: null,
          loadTime,
          lastAccessed: Date.now(),
          accessCount: 1,
          characters: new Set(request?.text?.split('') || []),
          performanceMetrics: {
            loadTime,
            renderTime: 0,
            cacheHitRate: 0
          }
        });
      }

      // Update performance metrics
      this.performanceMetrics.totalLoadTime += loadTime;
      this.performanceMetrics.fontFamiliesLoaded++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (cacheKey) {
        this.fontCache.set(cacheKey, {
          fontFamily,
          loaded: false,
          loading: false,
          error: errorMessage,
          loadTime: performance.now() - startTime,
          lastAccessed: Date.now(),
          accessCount: 1,
          characters: new Set(),
          performanceMetrics: {
            loadTime: performance.now() - startTime,
            renderTime: 0,
            cacheHitRate: 0
          }
        });
      }

      this.performanceMetrics.failedLoads++;
      throw error;
    }
  }

  private async loadGoogleFont(font: FontFamily): Promise<void> {
    if (typeof document === 'undefined') return;

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.href = font.url!;
      link.rel = 'stylesheet';
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load Google Font: ${font.name}`));
      document.head.appendChild(link);
    });
  }

  private async loadLocalFont(font: FontFamily): Promise<void> {
    // Implementation for loading local fonts
    // This would involve @font-face CSS rules or FontFace API
    return Promise.resolve();
  }

  private async markSystemFontLoaded(font: FontFamily, cacheKey?: string): Promise<void> {
    // System fonts are already available, just mark as loaded
    return Promise.resolve();
  }

  private generateUnicodeRange(characters: Set<string>): string {
    const codePoints = Array.from(characters).map(char => char.codePointAt(0) || 0).sort((a, b) => a - b);

    if (codePoints.length === 0) return '';

    let ranges: string[] = [];
    let start = codePoints[0];
    let end = start;

    for (let i = 1; i < codePoints.length; i++) {
      if (codePoints[i] === end + 1) {
        end = codePoints[i];
      } else {
        ranges.push(start === end ? `U+${start.toString(16).toUpperCase()}` : `U+${start.toString(16).toUpperCase()}-${end.toString(16).toUpperCase()}`);
        start = codePoints[i];
        end = start;
      }
    }

    ranges.push(start === end ? `U+${start.toString(16).toUpperCase()}` : `U+${start.toString(16).toUpperCase()}-${end.toString(16).toUpperCase()}`);

    return ranges.join(', ');
  }

  private getLoadingStrategy(fontFamily: string): string {
    const font = this.fontFamilies.get(fontFamily);
    return font?.loadingStrategy || 'swap';
  }

  private estimateLoadTime(fontFamily: string, cacheStatus: 'hit' | 'miss' | 'partial'): number {
    if (cacheStatus === 'hit') return 0;

    const font = this.fontFamilies.get(fontFamily);
    if (!font) return 100;

    if (font.source === 'system') return 10;
    if (font.source === 'google') return font.fileSize ? font.fileSize / 1000 : 50;
    if (font.source === 'local') return 20;

    return 100;
  }

  private estimateRenderTime(characterCount: number): number {
    return characterCount * 0.1; // 0.1ms per character
  }

  private estimateMemoryUsage(fontFamily: string): number {
    const font = this.fontFamilies.get(fontFamily);
    return font?.fileSize || 50000; // 50KB default
  }

  private generateWarnings(coverage: any, langConfig: LanguageFontConfig): string[] {
    const warnings: string[] = [];

    if (coverage.percentage < 90) {
      warnings.push(`Low character coverage: ${coverage.percentage.toFixed(1)}%`);
    }

    if (coverage.missingCharacters.length > 0) {
      warnings.push(`${coverage.missingCharacters.length} characters not found in primary font`);
    }

    if (langConfig.specialConsiderations.requiresSpecialRendering) {
      warnings.push('Language requires special rendering considerations');
    }

    return warnings;
  }

  private getFallbackResponse(request: FontRequest, errorMessage: string): FontResponse {
    return {
      fontFamily: 'sans-serif',
      fallbackFonts: ['serif', 'monospace'],
      unicodeRange: '',
      characterCoverage: {
        supported: 0,
        total: request.text.length,
        percentage: 0,
        missingCharacters: request.text.split('')
      },
      loadingStrategy: 'swap',
      estimatedLoadTime: 0,
      cacheStatus: 'miss',
      performanceMetrics: {
        loadTime: 0,
        renderTime: this.estimateRenderTime(request.text.length),
        memoryUsage: 0
      },
      warnings: [errorMessage, 'Using fallback font']
    };
  }

  private updatePerformanceMetrics(metrics: {
    loadTime: number;
    cacheStatus: 'hit' | 'miss' | 'partial';
    fontFamily: string;
    characterFallbackRate: number;
  }): void {
    this.performanceMetrics.totalLoadTime += metrics.loadTime;
    this.performanceMetrics.characterFallbackRate = metrics.characterFallbackRate;

    if (metrics.cacheStatus === 'hit') {
      this.performanceMetrics.cacheHitRate = (this.performanceMetrics.cacheHitRate + 1) / 2;
    } else {
      this.performanceMetrics.cacheHitRate = this.performanceMetrics.cacheHitRate * 0.9;
    }
  }

  private generateValidationRecommendations(issues: {
    critical: string[];
    warning: string[];
    suggestion: string[];
  }, langConfig: LanguageFontConfig): string[] {
    const recommendations: string[] = [];

    if (issues.critical.length > 0) {
      recommendations.push('Consider using a different font family');
    }

    if (issues.warning.length > 0) {
      recommendations.push('Review font configuration for optimal results');
    }

    if (langConfig.googleFontsRecommendation) {
      recommendations.push(`Consider using ${langConfig.googleFontsRecommendation.font}: ${langConfig.googleFontsRecommendation.reason}`);
    }

    return recommendations;
  }

  private getAlternativeFonts(fontFamily: string, languageCode: string): string[] {
    const langConfig = this.languageConfigs.get(languageCode);
    if (!langConfig) return [];

    return [
      ...langConfig.primaryFonts.filter(f => f !== fontFamily),
      ...langConfig.secondaryFonts.filter(f => f !== fontFamily),
      ...langConfig.fallbackFonts
    ];
  }

  private generateUseCaseRecommendations(langConfig: LanguageFontConfig, useCase?: string): string[] {
    const recommendations: string[] = [];

    switch (useCase) {
      case 'heading':
        recommendations.push('Use heavier weights (600-700) for better heading visibility');
        break;
      case 'body':
        recommendations.push('Use regular weights (400-500) for optimal readability');
        break;
      case 'display':
        recommendations.push('Consider display fonts with unique character designs');
        break;
      case 'code':
        recommendations.push('Use monospace fonts for better code readability');
        break;
      default:
        recommendations.push('Use primary fonts for general text');
    }

    if (langConfig.specialConsiderations.requiresSpecialRendering) {
      recommendations.push('Ensure proper text direction and line height settings');
    }

    return recommendations;
  }
}

// Export singleton instance
export const fontManager = FontManager.getInstance();

// Utility functions
export const fontUtils = {
  /**
   * Get font stack CSS string
   */
  getFontStack(fontFamily: string, fallbackChain: string[]): string {
    return [fontFamily, ...fallbackChain].join(', ');
  },

  /**
   * Generate CSS @font-face rules
   */
  generateFontFaceCSS(fontFamily: string): string {
    const font = fontManager['fontFamilies'].get(fontFamily);
    if (!font || font.source !== 'google') return '';

    return `
@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  font-weight: 400;
  font-display: ${font.loadingStrategy};
  src: url('${font.url}') format('woff2');
}`;
  },

  /**
   * Generate font loading CSS
   */
  generateLoadingCSS(fonts: string[]): string {
    return fonts.map(font => {
      const fontConfig = fontManager['fontFamilies'].get(font);
      if (!fontConfig) return '';

      return `
@font-face {
  font-family: '${font}';
  font-display: ${fontConfig.loadingStrategy};
  src: local('${font}'), local('${fontConfig.displayName}');
}`;
    }).join('\n');
  },

  /**
   * Preload fonts for optimal performance
   */
  preloadFonts(fonts: string[], document?: Document): void {
    if (typeof document === 'undefined' || !document) return;

    fonts.forEach(fontFamily => {
      const font = fontManager['fontFamilies'].get(fontFamily);
      if (font?.source === 'google' && font.url) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = font.url;
        link.as = 'style';
        link.onload = function() {
          const linkElement = this as HTMLLinkElement;
          linkElement.rel = 'stylesheet';
        };
        document.head.appendChild(link);
      }
    });
  }
};