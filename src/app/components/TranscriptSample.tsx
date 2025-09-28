"use client";

import { useState } from "react";

interface TranscriptSampleProps {
  processingStatus: string | null;
}

interface TranscriptLine {
  id: number;
  startTime: number;
  endTime: number;
  english: string;
  vietnamese: string;
  confidence: number;
  speaker?: string;
}

export default function TranscriptSample({ processingStatus }: TranscriptSampleProps) {
  const [showOnlyHighConfidence, setShowOnlyHighConfidence] = useState(false);
  const [showTimecodes, setShowTimecodes] = useState(true);

  const transcriptData: TranscriptLine[] = [
    {
      id: 1,
      startTime: 0.5,
      endTime: 1.8,
      english: "Hello everyone, welcome to our presentation.",
      vietnamese: "Xin chào tất cả mọi người, chào mừng đến với bài thuyết trình của chúng tôi.",
      confidence: 96.5
    },
    {
      id: 2,
      startTime: 2.1,
      endTime: 4.2,
      english: "Today we're going to talk about the future of technology.",
      vietnamese: "Hôm nay chúng ta sẽ nói về tương lai của công nghệ.",
      confidence: 94.2
    },
    {
      id: 3,
      startTime: 4.5,
      endTime: 6.8,
      english: "Artificial intelligence is changing how we work and live.",
      vietnamese: "Trí tuệ nhân tạo đang thay đổi cách chúng ta làm việc và sống.",
      confidence: 98.1
    },
    {
      id: 4,
      startTime: 7.0,
      endTime: 9.3,
      english: "It's important to understand both the benefits and challenges.",
      vietnamese: "Điều quan trọng là phải hiểu cả lợi ích và thách thức.",
      confidence: 89.7
    },
    {
      id: 5,
      startTime: 9.6,
      endTime: 11.9,
      english: "Let's explore some real-world applications together.",
      vietnamese: "Cùng khám phá một số ứng dụng thực tế nhé.",
      confidence: 92.8
    },
    {
      id: 6,
      startTime: 12.2,
      endTime: 14.5,
      english: "From healthcare to education, AI is making a difference.",
      vietnamese: "Từ chăm sóc sức khỏe đến giáo dục, AI đang tạo ra sự khác biệt.",
      confidence: 95.3
    },
    {
      id: 7,
      startTime: 14.8,
      endTime: 17.1,
      english: "Thank you for your attention. Let's begin the journey.",
      vietnamese: "Cảm ơn sự chú ý của các bạn. Hãy bắt đầu hành trình nhé.",
      confidence: 97.6
    }
  ];

  const filteredTranscript = showOnlyHighConfidence
    ? transcriptData.filter(line => line.confidence >= 95)
    : transcriptData;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-success';
    if (confidence >= 85) return 'text-warning';
    return 'text-error';
  };

  const getConfidenceBadge = (confidence: number) => {
    const color = confidence >= 95 ? 'bg-success' : confidence >= 85 ? 'bg-warning' : 'bg-error';
    return (
      <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>
        {confidence}%
      </span>
    );
  };

  if (processingStatus !== 'Done') {
    return (
      <div className="card bg-base-100 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Transcript Sample
        </h3>
        <div className="text-center text-secondary py-8">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-sm">Transcript will be available when processing is complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          Transcript Sample
        </h3>
        <div className="flex space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showTimecodes}
              onChange={(e) => setShowTimecodes(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs text-secondary">Timecodes</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyHighConfidence}
              onChange={(e) => setShowOnlyHighConfidence(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs text-secondary">High confidence only</span>
          </label>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTranscript.map((line) => (
          <div key={line.id} className="p-3 border border-base-300 rounded-lg hover:bg-base-200 transition-colors">
            <div className="flex items-start justify-between mb-2">
              {showTimecodes && (
                <div className="text-xs text-secondary font-mono">
                  {formatTime(line.startTime)} - {formatTime(line.endTime)}
                </div>
              )}
              {getConfidenceBadge(line.confidence)}
            </div>

            <div className="space-y-2">
              <div className="group">
                <div className="text-xs text-secondary mb-1">English</div>
                <p className="text-sm text-primary leading-relaxed">
                  {line.english}
                </p>
              </div>

              <div className="border-l-2 border-accent/30 pl-3 group">
                <div className="text-xs text-secondary mb-1">Vietnamese</div>
                <p className="text-sm text-accent leading-relaxed">
                  {line.vietnamese}
                </p>
              </div>
            </div>

            {line.confidence < 95 && (
              <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/20">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">⚠️</span>
                  <span className="text-xs text-warning">
                    Lower confidence score - may need review
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-base-200 rounded-lg">
        <div className="flex items-center justify-between text-xs text-secondary">
          <span>
            Showing {filteredTranscript.length} of {transcriptData.length} segments
          </span>
          <span>
            Average confidence: {
              Math.round(
                filteredTranscript.reduce((sum, line) => sum + line.confidence, 0) / filteredTranscript.length
              )
            }%
          </span>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <button className="btn btn-sm btn-outline btn-primary flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export TXT
        </button>
        <button className="btn btn-sm btn-outline btn-secondary flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export SRT
        </button>
      </div>
    </div>
  );
}