"use client";

import { useState, useEffect, useRef } from "react";

interface EventLogDrawerProps {
  processingStatus: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  category: string;
  message: string;
  details?: string;
  duration?: number;
  progress?: number;
  metadata?: Record<string, any>;
}

interface EventStats {
  totalEvents: number;
  infoEvents: number;
  warningEvents: number;
  errorEvents: number;
  successEvents: number;
  debugEvents: number;
  averageDuration: number;
}

export default function EventLogDrawer({ processingStatus, isOpen, onClose }: EventLogDrawerProps) {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showJsonView, setShowJsonView] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (processingStatus) {
      generateMockLogEntries();
    }
  }, [processingStatus]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries, autoScroll]);

  const generateMockLogEntries = () => {
    const mockEntries: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 10000),
        level: 'info',
        category: 'System',
        message: 'Processing session started',
        details: 'Session ID: sess_123456789',
        metadata: { sessionId: 'sess_123456789', userId: 'user_001' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 8000),
        level: 'info',
        category: 'Upload',
        message: 'File upload initiated',
        details: 'video_sample.mp4 (2.4MB)',
        metadata: { filename: 'video_sample.mp4', fileSize: 2516582 }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 6000),
        level: 'success',
        category: 'Upload',
        message: 'File upload completed',
        details: 'Upload speed: 3.2 MB/s',
        duration: 2340,
        metadata: { uploadSpeed: 3200000, fileSize: 2516582 }
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 5000),
        level: 'info',
        category: 'Probe',
        message: 'Media analysis started',
        details: 'Analyzing video and audio streams',
        metadata: { streams: ['video', 'audio'] }
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 4500),
        level: 'success',
        category: 'Probe',
        message: 'Media analysis completed',
        details: 'Duration: 8.5s, Audio: English, Video: 1920x1080',
        duration: 450,
        metadata: {
          duration: 8.5,
          audioLanguage: 'en',
          videoResolution: '1920x1080',
          audioCodec: 'aac',
          videoCodec: 'h264'
        }
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 4000),
        level: 'info',
        category: 'STT',
        message: 'Speech-to-text processing started',
        details: 'Model: whisper-large-v3',
        metadata: { model: 'whisper-large-v3', language: 'en' }
      },
      {
        id: '7',
        timestamp: new Date(Date.now() - 3500),
        level: 'debug',
        category: 'STT',
        message: 'Audio segmentation completed',
        details: '12 segments identified',
        metadata: { segmentCount: 12, averageDuration: 0.71 }
      },
      {
        id: '8',
        timestamp: new Date(Date.now() - 3000),
        level: 'warning',
        category: 'STT',
        message: 'Low confidence segment detected',
        details: 'Segment 4 confidence: 72% (threshold: 80%)',
        metadata: { segmentId: 4, confidence: 0.72, threshold: 0.8 }
      },
      {
        id: '9',
        timestamp: new Date(Date.now() - 2500),
        level: 'success',
        category: 'STT',
        message: 'Transcription completed',
        details: '156 words transcribed, average confidence: 94.2%',
        duration: 1500,
        metadata: { wordCount: 156, averageConfidence: 0.942 }
      },
      {
        id: '10',
        timestamp: new Date(Date.now() - 2000),
        level: 'info',
        category: 'Chunk',
        message: 'Text chunking started',
        details: 'Processing 12 segments into optimal chunks',
        metadata: { inputSegments: 12, strategy: 'semantic' }
      },
      {
        id: '11',
        timestamp: new Date(Date.now() - 1500),
        level: 'success',
        category: 'Chunk',
        message: 'Chunking completed',
        details: 'Created 3 logical chunks',
        duration: 500,
        metadata: { outputChunks: 3, compressionRatio: 0.25 }
      },
      {
        id: '12',
        timestamp: new Date(Date.now() - 1000),
        level: 'info',
        category: 'Translate',
        message: 'Translation process started',
        details: 'Target language: Vietnamese, Model: gpt-4',
        metadata: { targetLanguage: 'vi', model: 'gpt-4' }
      },
      {
        id: '13',
        timestamp: new Date(Date.now() - 500),
        level: 'debug',
        category: 'Translate',
        message: 'Cultural adaptation applied',
        details: '3 cultural adjustments made',
        metadata: { adaptations: ['formal_greeting', 'particle_addition', 'context_localization'] }
      },
      {
        id: '14',
        timestamp: new Date(Date.now() - 200),
        level: 'success',
        category: 'Translate',
        message: 'Translation completed',
        details: 'All chunks translated successfully',
        duration: 800,
        metadata: { chunksTranslated: 3, culturalAdaptations: 3 }
      },
      {
        id: '15',
        timestamp: new Date(Date.now() - 100),
        level: 'info',
        category: 'Validate',
        message: 'Quality validation started',
        details: 'Running grammar and cultural validation',
        metadata: { validationTypes: ['grammar', 'cultural', 'technical'] }
      },
      {
        id: '16',
        timestamp: new Date(),
        level: 'success',
        category: 'Validate',
        message: 'Validation completed',
        details: '2 minor issues found, overall quality: 94%',
        duration: 100,
        metadata: { issuesFound: 2, qualityScore: 0.94 }
      }
    ];

    setLogEntries(mockEntries);
  };

  const categories = ['all', ...new Set(logEntries.map(entry => entry.category))];
  const levels = ['all', ...new Set(logEntries.map(entry => entry.level))];

  const filteredEntries = logEntries.filter(entry => {
    const levelMatch = filterLevel === 'all' || entry.level === filterLevel;
    const categoryMatch = filterCategory === 'all' || entry.category === filterCategory;
    return levelMatch && categoryMatch;
  });

  const eventStats: EventStats = {
    totalEvents: logEntries.length,
    infoEvents: logEntries.filter(e => e.level === 'info').length,
    warningEvents: logEntries.filter(e => e.level === 'warning').length,
    errorEvents: logEntries.filter(e => e.level === 'error').length,
    successEvents: logEntries.filter(e => e.level === 'success').length,
    debugEvents: logEntries.filter(e => e.level === 'debug').length,
    averageDuration: Math.round(
      logEntries
        .filter(e => e.duration)
        .reduce((sum, e) => sum + (e.duration || 0), 0) /
      logEntries.filter(e => e.duration).length
    ) || 0
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-info';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'success': return 'text-success';
      case 'debug': return 'text-secondary';
      default: return 'text-secondary';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md h-full bg-base-100 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-primary">Event Log</h3>
            <span className="badge badge-sm badge-warning">DEV MODE</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showJsonView}
                onChange={(e) => setShowJsonView(e.target.checked)}
                className="checkbox checkbox-xs"
              />
              <span className="text-xs text-secondary">JSON View</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="checkbox checkbox-xs"
              />
              <span className="text-xs text-secondary">Auto-scroll</span>
            </label>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-base-300 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="select select-sm select-bordered"
            >
              <option value="all">All Levels</option>
              {levels.filter(l => l !== 'all').map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="select select-sm select-bordered"
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c !== 'all').map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-1 bg-info/10 rounded">
              <div className="font-bold text-info">{eventStats.infoEvents}</div>
              <div className="text-secondary">Info</div>
            </div>
            <div className="text-center p-1 bg-warning/10 rounded">
              <div className="font-bold text-warning">{eventStats.warningEvents}</div>
              <div className="text-secondary">Warnings</div>
            </div>
            <div className="text-center p-1 bg-error/10 rounded">
              <div className="font-bold text-error">{eventStats.errorEvents}</div>
              <div className="text-secondary">Errors</div>
            </div>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {showJsonView ? (
            // JSON View
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <details key={entry.id} className="p-3 bg-base-200 rounded-lg">
                  <summary className="text-xs text-secondary cursor-pointer hover:text-primary flex items-center space-x-2">
                    <span>{getLevelIcon(entry.level)}</span>
                    <span>{entry.message}</span>
                    <span className="text-xs font-mono">{formatTime(entry.timestamp)}</span>
                  </summary>
                  <pre className="text-xs bg-base-300 p-3 rounded mt-2 overflow-x-auto">
                    {JSON.stringify({
                      id: entry.id,
                      timestamp: entry.timestamp.toISOString(),
                      level: entry.level,
                      category: entry.category,
                      message: entry.message,
                      details: entry.details,
                      duration: entry.duration,
                      progress: entry.progress,
                      metadata: entry.metadata
                    }, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          ) : (
            // Standard View
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-base-200 rounded-lg text-sm"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">{getLevelIcon(entry.level)}</span>
                      <span className={`text-xs font-medium ${getLevelColor(entry.level)}`}>
                        {entry.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-secondary">[{entry.category}]</span>
                    </div>
                    <span className="text-xs text-secondary font-mono">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-primary mb-1">{entry.message}</p>

                  {entry.details && (
                    <p className="text-xs text-secondary mb-1">{entry.details}</p>
                  )}

                  {entry.duration && (
                    <div className="text-xs text-secondary">
                      Duration: {formatDuration(entry.duration)}
                    </div>
                  )}

                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-secondary cursor-pointer hover:text-primary">
                        Metadata
                      </summary>
                      <pre className="text-xs bg-base-300 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span>{filteredEntries.length} of {eventStats.totalEvents} events</span>
            <span>Avg duration: {formatDuration(eventStats.averageDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}