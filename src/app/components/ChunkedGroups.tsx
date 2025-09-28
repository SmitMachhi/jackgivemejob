"use client";

import { useState } from "react";

interface ChunkedGroupsProps {
  processingStatus: string | null;
}

interface Chunk {
  id: string;
  groupId: number;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  translatedText: string;
  confidence: number;
  wordCount: number;
  processingTime: number;
  status: 'completed' | 'processing' | 'pending';
  agentNotes?: string;
}

interface ChunkGroup {
  id: number;
  chunks: Chunk[];
  totalDuration: number;
  totalWords: number;
  averageConfidence: number;
  context: string;
  processingOrder: number;
}

export default function ChunkedGroups({ processingStatus }: ChunkedGroupsProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'order' | 'duration' | 'confidence'>('order');

  const chunkGroups: ChunkGroup[] = [
    {
      id: 1,
      processingOrder: 1,
      totalDuration: 2.1,
      totalWords: 18,
      averageConfidence: 96.5,
      context: "Introduction and welcome message",
      chunks: [
        {
          id: 'chunk-1-1',
          groupId: 1,
          startTime: 0.5,
          endTime: 1.8,
          duration: 1.3,
          text: "Hello everyone, welcome to our presentation.",
          translatedText: "Xin chào tất cả mọi người, chào mừng đến với bài thuyết trình của chúng tôi.",
          confidence: 96.5,
          wordCount: 8,
          processingTime: 0.8,
          status: 'completed',
          agentNotes: "Clear greeting, good volume levels"
        },
        {
          id: 'chunk-1-2',
          groupId: 1,
          startTime: 2.1,
          endTime: 2.6,
          duration: 0.5,
          text: "Today we're going to talk about",
          translatedText: "Hôm nay chúng ta sẽ nói về",
          confidence: 98.1,
          wordCount: 6,
          processingTime: 0.3,
          status: 'completed',
          agentNotes: "Smooth transition to main topic"
        }
      ]
    },
    {
      id: 2,
      processingOrder: 2,
      totalDuration: 3.3,
      totalWords: 25,
      averageConfidence: 94.2,
      context: "Main topic discussion - technology impact",
      chunks: [
        {
          id: 'chunk-2-1',
          groupId: 2,
          startTime: 2.8,
          endTime: 4.2,
          duration: 1.4,
          text: "the future of technology and AI innovation.",
          translatedText: "tương lai của công nghệ và đổi mới AI.",
          confidence: 94.2,
          wordCount: 8,
          processingTime: 1.2,
          status: 'completed',
          agentNotes: "Technical terminology detected, handled well"
        },
        {
          id: 'chunk-2-2',
          groupId: 2,
          startTime: 4.5,
          endTime: 6.1,
          duration: 1.6,
          text: "Artificial intelligence is changing how we work",
          translatedText: "Trí tuệ nhân tạo đang thay đổi cách chúng ta làm việc",
          confidence: 95.8,
          wordCount: 9,
          processingTime: 0.9,
          status: 'completed',
          agentNotes: "Complex sentence structure, good translation flow"
        },
        {
          id: 'chunk-2-3',
          groupId: 2,
          startTime: 6.3,
          endTime: 6.8,
          duration: 0.5,
          text: "and live our daily lives.",
          translatedText: "và sống cuộc sống hàng ngày của chúng ta.",
          confidence: 92.7,
          wordCount: 6,
          processingTime: 0.4,
          status: 'completed',
          agentNotes: "Contextual translation maintained"
        }
      ]
    },
    {
      id: 3,
      processingOrder: 3,
      totalDuration: 2.8,
      totalWords: 22,
      averageConfidence: 97.1,
      context: "Practical applications and conclusion",
      chunks: [
        {
          id: 'chunk-3-1',
          groupId: 3,
          startTime: 7.0,
          endTime: 8.5,
          duration: 1.5,
          text: "Let's explore real-world applications together",
          translatedText: "Cùng khám phá các ứng dụng thực tế nhé",
          confidence: 97.1,
          wordCount: 7,
          processingTime: 0.7,
          status: 'completed',
          agentNotes: "Engaging call to action, natural tone preserved"
        },
        {
          id: 'chunk-3-2',
          groupId: 3,
          startTime: 8.8,
          endTime: 9.8,
          duration: 1.0,
          text: "From healthcare to education, AI is making a difference.",
          translatedText: "Từ chăm sóc sức khỏe đến giáo dục, AI đang tạo ra sự khác biệt.",
          confidence: 96.3,
          wordCount: 11,
          processingTime: 0.8,
          status: 'completed',
          agentNotes: "Multiple domains mentioned, translations accurate"
        }
      ]
    }
  ];

  const sortedGroups = [...chunkGroups].sort((a, b) => {
    switch (sortBy) {
      case 'duration':
        return b.totalDuration - a.totalDuration;
      case 'confidence':
        return b.averageConfidence - a.averageConfidence;
      default:
        return a.processingOrder - b.processingOrder;
    }
  });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⚡';
      default: return '⏳';
    }
  };

  if (processingStatus !== 'Done') {
    return (
      <div className="card bg-base-100 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Chunked Processing Groups
        </h3>
        <div className="text-center text-secondary py-8">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-sm">Chunked groups will be available when processing is complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          Chunked Processing Groups
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="select select-sm select-bordered"
          >
            <option value="order">Sort by Order</option>
            <option value="duration">Sort by Duration</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedGroups.map((group) => (
          <div key={group.id} className="border border-base-300 rounded-lg overflow-hidden">
            <div
              className={`p-4 cursor-pointer transition-colors ${
                selectedGroupId === group.id ? 'bg-primary/10' : 'hover:bg-base-200'
              }`}
              onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-primary">
                    Group {group.processingOrder}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    group.averageConfidence >= 95 ? 'bg-success text-white' :
                    group.averageConfidence >= 85 ? 'bg-warning text-white' : 'bg-error text-white'
                  }`}>
                    {Math.round(group.averageConfidence)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-secondary">
                    {group.totalDuration.toFixed(1)}s
                  </span>
                  <span className="text-xs text-secondary">
                    {group.totalWords} words
                  </span>
                  <svg
                    className={`w-4 h-4 text-secondary transition-transform ${
                      selectedGroupId === group.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-secondary">{group.context}</p>
            </div>

            {selectedGroupId === group.id && (
              <div className="border-t border-base-300 p-4 space-y-3">
                {group.chunks.map((chunk) => (
                  <div key={chunk.id} className="p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">{getStatusIcon(chunk.status)}</span>
                        <span className="text-xs font-mono text-secondary">
                          {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                        </span>
                        <span className="text-xs text-secondary">
                          ({chunk.duration.toFixed(1)}s)
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${getConfidenceColor(chunk.confidence)}`}>
                        {chunk.confidence}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-secondary mb-1">Original</div>
                        <p className="text-sm text-primary">{chunk.text}</p>
                      </div>
                      <div className="border-l-2 border-accent/30 pl-3">
                        <div className="text-xs text-secondary mb-1">Translation</div>
                        <p className="text-sm text-accent">{chunk.translatedText}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-base-300">
                      <div className="flex items-center space-x-4 text-xs text-secondary">
                        <span>{chunk.wordCount} words</span>
                        <span>{chunk.processingTime}s processing</span>
                      </div>
                    </div>

                    {chunk.agentNotes && (
                      <div className="mt-2 p-2 bg-info/10 rounded border border-info/20">
                        <div className="flex items-start space-x-1">
                          <span className="text-xs">📝</span>
                          <p className="text-xs text-secondary">{chunk.agentNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-base-200 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="font-semibold text-primary">Total Groups</div>
            <div className="text-secondary">{chunkGroups.length}</div>
          </div>
          <div>
            <div className="font-semibold text-primary">Total Chunks</div>
            <div className="text-secondary">{chunkGroups.reduce((sum, group) => sum + group.chunks.length, 0)}</div>
          </div>
          <div>
            <div className="font-semibold text-primary">Avg Confidence</div>
            <div className="text-secondary">
              {Math.round(
                chunkGroups.reduce((sum, group) => sum + group.averageConfidence, 0) / chunkGroups.length
              )}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}