"use client";

import { useState, useRef, useEffect } from "react";

interface TimelinePanelProps {
  file: File;
  videoUrl: string;
  processingStatus: string | null;
}

interface TimelineItem {
  id: number;
  time: number;
  text: string;
  type: 'subtitle' | 'translation';
}

export default function TimelinePanel({ file, videoUrl, processingStatus }: TimelinePanelProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoRef.current?.duration || 0);
      });
    }
  }, [videoUrl]);

  useEffect(() => {
    if (processingStatus === 'Done') {
      const mockTimelineData: TimelineItem[] = [
        { id: 1, time: 0.5, text: 'Xin chào!', type: 'subtitle' },
        { id: 2, time: 1.2, text: 'Hello!', type: 'translation' },
        { id: 3, time: 2.0, text: 'Chào mừng bạn đến đây.', type: 'subtitle' },
        { id: 4, time: 3.1, text: 'Welcome here.', type: 'translation' },
        { id: 5, time: 4.5, text: 'Hôm nay là một ngày tốt.', type: 'subtitle' },
        { id: 6, time: 5.8, text: 'Today is a good day.', type: 'translation' },
        { id: 7, time: 7.2, text: 'Cảm ơn bạn rất nhiều.', type: 'subtitle' },
        { id: 8, time: 8.5, text: 'Thank you very much.', type: 'translation' },
      ];
      setTimelineItems(mockTimelineData);
    }
  }, [processingStatus]);

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current?.currentTime || 0);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="card bg-base-100 shadow-lg p-4">
      <h3 className="text-lg font-semibold text-primary mb-4">
        Timeline & Subtitles
      </h3>

      <div className="mb-4">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full rounded-lg"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-secondary">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => videoRef.current?.play()}
              className="btn btn-xs btn-primary"
              disabled={isPlaying}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => videoRef.current?.pause()}
              className="btn btn-xs btn-secondary"
              disabled={!isPlaying}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-200"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {processingStatus === 'Done' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-secondary">Subtitles Timeline</h4>
          {timelineItems.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded cursor-pointer transition-colors ${
                Math.abs(currentTime - item.time) < 0.5 ? 'bg-primary/20' : 'hover:bg-base-200'
              }`}
              onClick={() => handleSeek(item.time)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="text-xs text-secondary">{formatTime(item.time)}</span>
                  <p className={`text-sm mt-1 ${
                    item.type === 'subtitle' ? 'text-primary font-medium' : 'text-secondary'
                  }`}>
                    {item.text}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.type === 'subtitle' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                }`}>
                  {item.type === 'subtitle' ? 'VI' : 'EN'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {processingStatus !== 'Done' && (
        <div className="text-center text-secondary">
          <p className="text-sm">Timeline will appear when processing is complete</p>
        </div>
      )}
    </div>
  );
}