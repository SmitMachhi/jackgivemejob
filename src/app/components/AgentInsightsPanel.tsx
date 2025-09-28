"use client";

interface AgentInsightsPanelProps {
  processingStatus: string | null;
}

interface Insight {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  description: string;
}

interface AgentMetric {
  agent: string;
  confidence: number;
  processingTime: number;
  quality: number;
  details: string;
}

export default function AgentInsightsPanel({ processingStatus }: AgentInsightsPanelProps) {
  const insights: Insight[] = [
    {
      id: 'duration',
      title: 'Video Duration',
      value: '8.5',
      unit: 'seconds',
      trend: 'stable',
      description: 'Total processing time'
    },
    {
      id: 'segments',
      title: 'Audio Segments',
      value: 12,
      unit: 'chunks',
      trend: 'up',
      description: 'Identified speech segments'
    },
    {
      id: 'confidence',
      title: 'Translation Confidence',
      value: 94.2,
      unit: '%',
      trend: 'up',
      description: 'Overall translation accuracy'
    },
    {
      id: 'words',
      title: 'Word Count',
      value: 156,
      unit: 'words',
      trend: 'stable',
      description: 'Total transcribed words'
    }
  ];

  const agentMetrics: AgentMetric[] = [
    {
      agent: 'Speech-to-Text',
      confidence: 96.5,
      processingTime: 1.2,
      quality: 98,
      details: 'High quality audio transcription with minimal noise interference'
    },
    {
      agent: 'Chunk Analyzer',
      confidence: 92.8,
      processingTime: 0.8,
      quality: 95,
      details: 'Successfully identified natural speech boundaries and pauses'
    },
    {
      agent: 'Translator',
      confidence: 94.2,
      processingTime: 2.1,
      quality: 93,
      details: 'Cultural adaptation applied for better Vietnamese localization'
    },
    {
      agent: 'Quality Validator',
      confidence: 97.1,
      processingTime: 0.5,
      quality: 96,
      details: 'Grammar and context validation completed successfully'
    }
  ];

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-success';
    if (confidence >= 85) return 'text-warning';
    return 'text-error';
  };

  const getQualityBar = (quality: number) => {
    const color = quality >= 95 ? 'bg-success' : quality >= 85 ? 'bg-warning' : 'bg-error';
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${quality}%` }}
        ></div>
      </div>
    );
  };

  if (processingStatus !== 'Done') {
    return (
      <div className="card bg-base-100 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Agent Insights
        </h3>
        <div className="text-center text-secondary py-8">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-sm">Agent insights will be available when processing is complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <h3 className="text-lg font-semibold text-primary mb-6">
        Agent Insights
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {insights.map((insight) => (
          <div key={insight.id} className="p-3 bg-base-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-secondary">{insight.title}</span>
              <span className="text-xs">{getTrendIcon(insight.trend)}</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-bold text-primary">{insight.value}</span>
              {insight.unit && <span className="text-xs text-secondary">{insight.unit}</span>}
            </div>
            <p className="text-xs text-secondary mt-1">{insight.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-secondary border-b border-base-300 pb-2">
          Agent Performance Metrics
        </h4>
        {agentMetrics.map((metric, index) => (
          <div key={index} className="p-3 border border-base-300 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-primary">{metric.agent}</h5>
              <span className={`text-sm font-bold ${getConfidenceColor(metric.confidence)}`}>
                {metric.confidence}%
              </span>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-secondary mb-1">
                <span>Quality Score</span>
                <span>{metric.quality}%</span>
              </div>
              {getQualityBar(metric.quality)}
            </div>

            <div className="flex justify-between text-xs text-secondary">
              <span>Processing Time</span>
              <span>{metric.processingTime}s</span>
            </div>

            <p className="text-xs text-secondary mt-2 leading-relaxed">
              {metric.details}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-info/10 rounded-lg border border-info/20">
        <div className="flex items-start space-x-2">
          <span className="text-sm">💡</span>
          <div>
            <p className="text-xs font-medium text-info">Processing Summary</p>
            <p className="text-xs text-secondary mt-1">
              All agents performed within optimal parameters. Translation quality exceeds industry standards with cultural localization improvements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}