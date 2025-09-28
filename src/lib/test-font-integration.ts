/**
 * Font Integration Test Script
 *
 * This script tests the integration between the font manager and video processing system
 * Run with: npx ts-node src/lib/test-font-integration.ts
 */

import { fontManager } from "./fonts/font-manager";

async function testFontIntegration() {
  console.log("🎨 Testing Font Integration with FFmpeg\n");

  const testCases = [
    {
      language: "en",
      text: "Hello World! This is a test caption for video processing.",
      description: "English caption"
    },
    {
      language: "es",
      text: "¡Hola Mundo! Esto es una prueba de subtítulos para procesamiento de video.",
      description: "Spanish caption with accents"
    },
    {
      language: "ar",
      text: "مرحبا بالعالم! هذا اختبار للترجمة في معالجة الفيديو.",
      description: "Arabic RTL caption"
    },
    {
      language: "ja",
      text: "こんにちは世界！これはビデオ処理のためのテストキャプションです。",
      description: "Japanese caption with complex characters"
    },
    {
      language: "zh",
      text: "你好世界！这是视频处理的测试字幕。",
      description: "Chinese caption"
    },
    {
      language: "vi",
      text: "Xin chào thế giới! Đây là bài kiểm tra chú thích cho xử lý video.",
      description: "Vietnamese caption with diacritics"
    }
  ];

  for (const testCase of testCases) {
    console.log(`Testing ${testCase.description} (${testCase.language}):`);
    console.log(`Text: "${testCase.text}"`);

    try {
      const fontResponse = await fontManager.getOptimalFont({
        text: testCase.text,
        targetLanguage: testCase.language,
        style: 'normal',
        weight: 400,
        fallbackEnabled: true
      });

      console.log(`✅ Success:`);
      console.log(`   Font: ${fontResponse.fontFamily}`);
      console.log(`   Fallbacks: ${fontResponse.fallbackFonts.join(', ')}`);
      console.log(`   Coverage: ${fontResponse.characterCoverage.percentage.toFixed(1)}%`);

      if (fontResponse.characterCoverage.missingCharacters.length > 0) {
        console.log(`   Missing: ${fontResponse.characterCoverage.missingCharacters.length} characters`);
      }

      if (fontResponse.warnings.length > 0) {
        console.log(`   Warnings: ${fontResponse.warnings.join(', ')}`);
      }

      console.log(`   Loading strategy: ${fontResponse.loadingStrategy}`);

    } catch (error) {
      console.log(`❌ Failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log(""); // Empty line for readability
  }

  // Test performance metrics
  console.log("📊 Performance Metrics:");
  const metrics = fontManager.getPerformanceMetrics();
  console.log(`   Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`   Average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
  console.log(`   Fonts loaded: ${metrics.fontFamiliesLoaded}`);
  console.log(`   Failed loads: ${metrics.failedLoads}`);

  // Test CSS generation (using font utilities)
  console.log("\n🎭 CSS Generation Test:");
  try {
    const { fontUtils } = await import("./fonts/font-manager");
    const fontStack = fontUtils.getFontStack("NotoSans", ["Arial", "sans-serif"]);
    console.log(`Font stack: ${fontStack}`);
  } catch (error) {
    console.log(`CSS test skipped: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n✅ Font integration test completed!");
}

// Run the test
if (require.main === module) {
  testFontIntegration().catch(console.error);
}

export { testFontIntegration };