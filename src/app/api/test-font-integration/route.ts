import { NextRequest, NextResponse } from "next/server";
import { fontManager } from "@/lib/fonts/font-manager";

export async function GET(request: NextRequest) {
  try {
    console.log("🎨 Testing Font Integration with FFmpeg");

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

    const results = [];

    for (const testCase of testCases) {
      try {
        const fontResponse = await fontManager.getOptimalFont({
          text: testCase.text,
          targetLanguage: testCase.language,
          style: 'normal',
          weight: 400,
          fallbackEnabled: true
        });

        results.push({
          language: testCase.language,
          description: testCase.description,
          text: testCase.text,
          success: true,
          font: fontResponse.fontFamily,
          fallbackFonts: fontResponse.fallbackFonts,
          coverage: fontResponse.characterCoverage.percentage,
          missingCharacters: fontResponse.characterCoverage.missingCharacters.length,
          warnings: fontResponse.warnings,
          loadingStrategy: fontResponse.loadingStrategy
        });

      } catch (error) {
        results.push({
          language: testCase.language,
          description: testCase.description,
          text: testCase.text,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Get performance metrics
    const metrics = fontManager.getPerformanceMetrics();

    const response = {
      success: true,
      message: "Font integration test completed",
      results,
      performance: {
        cacheHitRate: metrics.cacheHitRate,
        averageRenderTime: metrics.averageRenderTime,
        fontsLoaded: metrics.fontFamiliesLoaded,
        failedLoads: metrics.failedLoads
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Font integration test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}