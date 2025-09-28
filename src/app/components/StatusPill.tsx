"use client";

interface StatusPillProps {
  status: string;
}

export default function StatusPill({ status }: StatusPillProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'queued':
        return { color: 'neutral', icon: '⏳' };
      case 'uploading':
        return { color: 'info', icon: '📤' };
      case 'transcribing':
        return { color: 'warning', icon: '🎤' };
      case 'translating':
        return { color: 'warning', icon: '🌐' };
      case 'validating':
        return { color: 'warning', icon: '✅' };
      case 'rendering':
        return { color: 'warning', icon: '🎬' };
      case 'done':
        return { color: 'success', icon: '✨' };
      case 'failed':
        return { color: 'error', icon: '❌' };
      default:
        return { color: 'neutral', icon: '⚪' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={`badge badge-${config.color} gap-2 text-sm`}
      aria-live="polite"
      aria-label={`Status: ${status}`}
    >
      <span>{config.icon}</span>
      <span>{status}</span>
    </div>
  );
}