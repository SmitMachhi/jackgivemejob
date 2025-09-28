"use client";

import { useState } from "react";

interface TranslationPreviewProps {
  processingStatus: string | null;
}

interface TranslationSegment {
  id: number;
  startTime: number;
  endTime: number;
  originalText: string;
  vietnameseText: string;
  alternativeTranslations: string[];
  confidence: number;
  culturalNotes?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TranslationStats {
  totalSegments: number;
  averageConfidence: number;
  culturalAdaptations: number;
  idiomaticExpressions: number;
  technicalTerms: number;
}

export default function TranslationPreview({ processingStatus }: TranslationPreviewProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showCulturalNotes, setShowCulturalNotes] = useState(true);
  const [highlightLevel, setHighlightLevel] = useState<'none' | 'confidence' | 'difficulty'>('confidence');

  const translationSegments: TranslationSegment[] = [
    {
      id: 1,
      startTime: 0.5,
      endTime: 1.8,
      originalText: "Hello everyone, welcome to our presentation.",
      vietnameseText: "Xin chào tất cả mọi người, chào mừng đến với bài thuyết trình của chúng tôi.",
      alternativeTranslations: [
        "Chào mừng các bạn đã đến với buổi thuyết trình.",
        "Xin kính chào quý vị và các bạn."
      ],
      confidence: 96.5,
      culturalNotes: "Used formal greeting appropriate for Vietnamese presentation context",
      difficulty: 'easy'
    },
    {
      id: 2,
      startTime: 2.1,
      endTime: 4.2,
      originalText: "Today we're going to talk about the future of technology.",
      vietnameseText: "Hôm nay chúng ta sẽ nói về tương lai của công nghệ.",
      alternativeTranslations: [
        "Trong bài nói hôm nay, chúng ta sẽ cùng thảo luận về tương lai công nghệ.",
        "Chủ đề hôm nay là tương lai của ngành công nghệ."
      ],
      confidence: 94.2,
      culturalNotes: "Adapted to natural Vietnamese conversation flow",
      difficulty: 'medium'
    },
    {
      id: 3,
      startTime: 4.5,
      endTime: 6.8,
      originalText: "Artificial intelligence is changing how we work and live.",
      vietnameseText: "Trí tuệ nhân tạo đang thay đổi cách chúng ta làm việc và sống.",
      alternativeTranslations: [
        "AI đang tác động đến công việc và cuộc sống hàng ngày của chúng ta.",
        "Trí tuệ nhân tạo đang làm thay đổi phương pháp làm việc và lối sống của con người."
      ],
      confidence: 98.1,
      culturalNotes: "Technical term 'Artificial intelligence' properly localized as 'Trí tuệ nhân tạo'",
      difficulty: 'hard'
    },
    {
      id: 4,
      startTime: 7.0,
      endTime: 9.3,
      originalText: "It's important to understand both the benefits and challenges.",
      vietnameseText: "Điều quan trọng là phải hiểu cả lợi ích và thách thức.",
      alternativeTranslations: [
        "Chúng ta cần nhận thức được cả mặt tích cực lẫn khó khăn.",
        "Hiểu rõ cả ưu điểm và nhược điểm là điều rất cần thiết."
      ],
      confidence: 89.7,
      culturalNotes: "Simplified structure for better Vietnamese comprehension",
      difficulty: 'medium'
    },
    {
      id: 5,
      startTime: 9.6,
      endTime: 11.9,
      originalText: "Let's explore some real-world applications together.",
      vietnameseText: "Cùng khám phá một số ứng dụng thực tế nhé.",
      alternativeTranslations: [
        "Hãy cùng nhau tìm hiểu các ứng dụng trong thực tế.",
        "Chúng ta hãy xem xét một vài ví dụ thực tiễn điển hình."
      ],
      confidence: 92.8,
      culturalNotes: "Added friendly particle 'nhé' to match casual tone",
      difficulty: 'easy'
    }
  ];

  const translationStats: TranslationStats = {
    totalSegments: translationSegments.length,
    averageConfidence: Math.round(translationSegments.reduce((sum, seg) => sum + seg.confidence, 0) / translationSegments.length * 10) / 10,
    culturalAdaptations: 3,
    idiomaticExpressions: 2,
    technicalTerms: 2
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-success';
    if (confidence >= 85) return 'text-warning';
    return 'text-error';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      default: return 'text-error';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const color = difficulty === 'easy' ? 'bg-success' : difficulty === 'medium' ? 'bg-warning' : 'bg-error';
    return (
      <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </span>
    );
  };

  const getHighlightClass = (segment: TranslationSegment) => {
    if (highlightLevel === 'none') return '';
    if (highlightLevel === 'confidence') {
      return segment.confidence >= 95 ? 'bg-success/10' : segment.confidence >= 85 ? 'bg-warning/10' : 'bg-error/10';
    }
    return segment.difficulty === 'easy' ? 'bg-success/5' : segment.difficulty === 'medium' ? 'bg-warning/5' : 'bg-error/5';
  };

  if (processingStatus !== 'Done') {
    return (
      <div className="card bg-base-100 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Vietnamese Translation Preview
        </h3>
        <div className="text-center text-secondary py-8">
          <div className="text-4xl mb-4">🌐</div>
          <p className="text-sm">Translation preview will be available when processing is complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          Vietnamese Translation Preview
        </h3>
        <div className="flex space-x-2">
          <select
            value={highlightLevel}
            onChange={(e) => setHighlightLevel(e.target.value as any)}
            className="select select-sm select-bordered"
          >
            <option value="none">No Highlight</option>
            <option value="confidence">Highlight Confidence</option>
            <option value="difficulty">Highlight Difficulty</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-base-200 rounded-lg text-center">
          <div className="text-lg font-bold text-primary">{translationStats.totalSegments}</div>
          <div className="text-xs text-secondary">Segments</div>
        </div>
        <div className="p-3 bg-base-200 rounded-lg text-center">
          <div className={`text-lg font-bold ${getConfidenceColor(translationStats.averageConfidence)}`}>
            {translationStats.averageConfidence}%
          </div>
          <div className="text-xs text-secondary">Avg Confidence</div>
        </div>
        <div className="p-3 bg-base-200 rounded-lg text-center">
          <div className="text-lg font-bold text-accent">{translationStats.culturalAdaptations}</div>
          <div className="text-xs text-secondary">Cultural Adaptations</div>
        </div>
        <div className="p-3 bg-base-200 rounded-lg text-center">
          <div className="text-lg font-bold text-warning">{translationStats.technicalTerms}</div>
          <div className="text-xs text-secondary">Technical Terms</div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {translationSegments.map((segment) => (
          <div
            key={segment.id}
            className={`p-4 border border-base-300 rounded-lg transition-colors ${getHighlightClass(segment)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-secondary">
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </span>
                {getDifficultyBadge(segment.difficulty)}
              </div>
              <span className={`text-xs font-bold ${getConfidenceColor(segment.confidence)}`}>
                {segment.confidence}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="group">
                <div className="text-xs text-secondary mb-1">Original English</div>
                <p className="text-sm text-primary leading-relaxed">
                  {segment.originalText}
                </p>
              </div>

              <div className="border-l-4 border-accent/50 pl-4 group">
                <div className="text-xs text-secondary mb-1">Vietnamese Translation</div>
                <p className="text-sm text-accent font-medium leading-relaxed">
                  {segment.vietnameseText}
                </p>
              </div>

              {showAlternatives && segment.alternativeTranslations.length > 0 && (
                <div className="mt-2 p-2 bg-info/10 rounded border border-info/20">
                  <div className="text-xs text-info font-medium mb-1">Alternative Translations</div>
                  {segment.alternativeTranslations.map((alt, index) => (
                    <p key={index} className="text-xs text-secondary mb-1 last:mb-0">
                      • {alt}
                    </p>
                  ))}
                </div>
              )}

              {showCulturalNotes && segment.culturalNotes && (
                <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/20">
                  <div className="flex items-start space-x-1">
                    <span className="text-xs">💡</span>
                    <div>
                      <div className="text-xs text-warning font-medium">Cultural Note</div>
                      <p className="text-xs text-secondary">{segment.culturalNotes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showAlternatives}
              onChange={(e) => setShowAlternatives(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs text-secondary">Show Alternatives</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showCulturalNotes}
              onChange={(e) => setShowCulturalNotes(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs text-secondary">Cultural Notes</span>
          </label>
        </div>
        <button className="btn btn-sm btn-outline btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Translation
        </button>
      </div>
    </div>
  );
}