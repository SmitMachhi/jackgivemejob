"use client";

interface StepIndicatorsProps {
  processingStatus: string | null;
  uploadProgress: number | null;
  isUploading: boolean;
}

interface Step {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const steps: Step[] = [
  { id: 'probe', name: 'Probe', description: 'Analyzing video file', icon: '🔍', color: 'neutral' },
  { id: 'stt', name: 'STT', description: 'Speech-to-text conversion', icon: '🎤', color: 'info' },
  { id: 'agent.chunk', name: 'Chunk', description: 'Dividing into segments', icon: '✂️', color: 'warning' },
  { id: 'agent.translate', name: 'Translate', description: 'Converting to Vietnamese', icon: '🌐', color: 'accent' },
  { id: 'agent.validate', name: 'Validate', description: 'Quality assurance', icon: '✅', color: 'success' },
  { id: 'render', name: 'Render', description: 'Burning subtitles', icon: '🎬', color: 'secondary' },
  { id: 'upload', name: 'Upload', description: 'Finalizing video', icon: '☁️', color: 'primary' }
];

const statusToStepMap: Record<string, string> = {
  'Queued': 'probe',
  'Uploading': 'upload',
  'Transcribing': 'stt',
  'Translating': 'agent.translate',
  'Validating': 'agent.validate',
  'Rendering': 'render',
  'Done': 'upload'
};

export default function StepIndicators({ processingStatus, uploadProgress, isUploading }: StepIndicatorsProps) {
  const getStepStatus = (stepId: string) => {
    if (!processingStatus) return 'pending';

    const currentStep = statusToStepMap[processingStatus] || 'probe';
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const stepIndex = steps.findIndex(step => step.id === stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in-progress';
    return 'pending';
  };

  const getStatusIcon = (status: string, step: Step) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return step.icon;
      default:
        return '⭕';
    }
  };

  const getStatusClass = (status: string, step: Step) => {
    switch (status) {
      case 'completed':
        return 'opacity-100';
      case 'in-progress':
        return `ring-2 ring-${step.color} ring-offset-2`;
      default:
        return 'opacity-50';
    }
  };

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <h3 className="text-lg font-semibold text-primary mb-6 text-center">
        Processing Pipeline
      </h3>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isInProgress = status === 'in-progress' && step.id === 'upload' && isUploading;

          return (
            <div key={step.id} className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-base-200 flex items-center justify-center transition-all duration-300 ${getStatusClass(status, step)}`}>
                <span className="text-lg">
                  {isInProgress && uploadProgress !== null ? `${uploadProgress}%` : getStatusIcon(status, step)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-primary">{step.name}</h4>
                  {status === 'in-progress' && step.id !== 'upload' && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-secondary">{step.description}</p>
                {isInProgress && step.id === 'upload' && uploadProgress !== null && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {processingStatus === 'Done' && (
        <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🎉</span>
            <span className="text-success font-medium">All steps completed successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}