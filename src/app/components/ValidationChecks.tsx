"use client";

import { useState } from "react";

interface ValidationChecksProps {
  processingStatus: string | null;
}

interface ValidationCheck {
  id: string;
  category: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  description: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
  autoFixed?: boolean;
  suggestions?: string[];
}

interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  pending: number;
  overallScore: number;
  criticalIssues: number;
}

export default function ValidationChecks({ processingStatus }: ValidationChecksProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const validationChecks: ValidationCheck[] = [
    {
      id: 'audio-quality',
      category: 'Audio',
      name: 'Audio Quality Check',
      status: 'passed',
      description: 'Audio clarity and volume levels meet requirements',
      details: 'Signal-to-noise ratio: 42dB, Volume: -12dB to -6dB',
      severity: 'high',
      timestamp: '2024-01-15 10:23:45'
    },
    {
      id: 'duration-validation',
      category: 'Content',
      name: 'Video Duration',
      status: 'passed',
      description: 'Video length within acceptable limits',
      details: 'Duration: 8.5 seconds (limit: 10 seconds)',
      severity: 'medium'
    },
    {
      id: 'language-detection',
      category: 'Language',
      name: 'Source Language Detection',
      status: 'passed',
      description: 'Confirmed English language with 98% confidence',
      details: 'Language: English (US), Confidence: 98.2%',
      severity: 'critical'
    },
    {
      id: 'grammar-check',
      category: 'Translation',
      name: 'Vietnamese Grammar',
      status: 'warning',
      description: 'Minor grammar issues detected in 2 segments',
      details: '2 segments have minor grammatical concerns that may need review',
      severity: 'medium',
      suggestions: [
        'Consider using formal pronouns in presentation context',
        'Review technical term consistency'
      ],
      timestamp: '2024-01-15 10:24:12'
    },
    {
      id: 'cultural-context',
      category: 'Cultural',
      name: 'Cultural Appropriateness',
      status: 'passed',
      description: 'Translation respects Vietnamese cultural norms',
      details: 'All translations are culturally appropriate and context-aware',
      severity: 'high'
    },
    {
      id: 'timing-sync',
      category: 'Technical',
      name: 'Subtitle Timing Synchronization',
      status: 'passed',
      description: 'Subtitle timing matches audio segments perfectly',
      details: 'Average sync offset: 15ms, All segments within 50ms tolerance',
      severity: 'critical'
    },
    {
      id: 'readability-score',
      category: 'Quality',
      name: 'Readability Assessment',
      status: 'warning',
      description: 'Some segments may be difficult to read at normal speed',
      details: '2 segments exceed 80 characters per line limit',
      severity: 'low',
      suggestions: [
        'Consider breaking long sentences into shorter segments',
        'Adjust timing for longer text segments'
      ],
      autoFixed: true
    },
    {
      id: 'content-appropriateness',
      category: 'Content',
      name: 'Content Appropriateness',
      status: 'passed',
      description: 'Content is appropriate for general audience',
      details: 'No inappropriate or offensive content detected',
      severity: 'high'
    },
    {
      id: 'technical-accuracy',
      category: 'Technical',
      name: 'Technical Term Accuracy',
      status: 'passed',
      description: 'Technical terms translated correctly',
      details: 'AI -> Trí tuệ nhân tạo, Technology -> Công nghệ',
      severity: 'critical'
    },
    {
      id: 'format-validation',
      category: 'Format',
      name: 'Subtitle Format Compliance',
      status: 'failed',
      description: 'Subtitle format does not meet broadcast standards',
      details: 'Line breaks inconsistent in 3 segments, Character encoding issues',
      severity: 'medium',
      suggestions: [
        'Standardize line break positions',
        'Ensure UTF-8 encoding compliance',
        'Check special character rendering'
      ],
      timestamp: '2024-01-15 10:24:45'
    }
  ];

  const validationSummary: ValidationSummary = {
    totalChecks: validationChecks.length,
    passed: validationChecks.filter(check => check.status === 'passed').length,
    failed: validationChecks.filter(check => check.status === 'failed').length,
    warnings: validationChecks.filter(check => check.status === 'warning').length,
    pending: validationChecks.filter(check => check.status === 'pending').length,
    overallScore: Math.round((validationChecks.filter(check => check.status === 'passed').length / validationChecks.length) * 100),
    criticalIssues: validationChecks.filter(check => check.severity === 'critical' && check.status !== 'passed').length
  };

  const categories = ['all', ...new Set(validationChecks.map(check => check.category))];

  const filteredChecks = filterCategory === 'all'
    ? validationChecks
    : validationChecks.filter(check => check.category === filterCategory);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-success';
      case 'failed': return 'text-error';
      case 'warning': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = status === 'passed' ? 'bg-success' : status === 'failed' ? 'bg-error' : status === 'warning' ? 'bg-warning' : 'bg-neutral';
    return (
      <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const color = severity === 'critical' ? 'bg-error' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-warning' : 'bg-info';
    return (
      <span className={`text-xs px-2 py-1 rounded ${color} text-white`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  if (processingStatus !== 'Done') {
    return (
      <div className="card bg-base-100 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Validation Checks
        </h3>
        <div className="text-center text-secondary py-8">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-sm">Validation results will be available when processing is complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          Validation Checks
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="select select-sm select-bordered"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs text-secondary">Details</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="p-3 bg-success/10 rounded-lg text-center">
          <div className="text-lg font-bold text-success">{validationSummary.passed}</div>
          <div className="text-xs text-secondary">Passed</div>
        </div>
        <div className="p-3 bg-error/10 rounded-lg text-center">
          <div className="text-lg font-bold text-error">{validationSummary.failed}</div>
          <div className="text-xs text-secondary">Failed</div>
        </div>
        <div className="p-3 bg-warning/10 rounded-lg text-center">
          <div className="text-lg font-bold text-warning">{validationSummary.warnings}</div>
          <div className="text-xs text-secondary">Warnings</div>
        </div>
        <div className="p-3 bg-neutral/10 rounded-lg text-center">
          <div className="text-lg font-bold text-neutral">{validationSummary.pending}</div>
          <div className="text-xs text-secondary">Pending</div>
        </div>
        <div className="p-3 bg-base-200 rounded-lg text-center">
          <div className={`text-lg font-bold ${validationSummary.overallScore >= 90 ? 'text-success' : validationSummary.overallScore >= 70 ? 'text-warning' : 'text-error'}`}>
            {validationSummary.overallScore}%
          </div>
          <div className="text-xs text-secondary">Score</div>
        </div>
        <div className="p-3 bg-error/10 rounded-lg text-center">
          <div className="text-lg font-bold text-error">{validationSummary.criticalIssues}</div>
          <div className="text-xs text-secondary">Critical</div>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredChecks.map((check) => (
          <div key={check.id} className="p-3 border border-base-300 rounded-lg hover:bg-base-200 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{getStatusIcon(check.status)}</span>
                <div>
                  <h4 className="text-sm font-medium text-primary">{check.name}</h4>
                  <p className="text-xs text-secondary">{check.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {getSeverityBadge(check.severity)}
                {getStatusBadge(check.status)}
                {check.autoFixed && (
                  <span className="text-xs px-1 py-0.5 rounded bg-info/20 text-info">
                    Auto-fixed
                  </span>
                )}
              </div>
            </div>

            {showDetails && (
              <div className="mt-2 pt-2 border-t border-base-300">
                {check.details && (
                  <p className="text-xs text-secondary mb-2">{check.details}</p>
                )}

                {check.suggestions && check.suggestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-warning mb-1">Suggestions</div>
                    {check.suggestions.map((suggestion, index) => (
                      <p key={index} className="text-xs text-secondary mb-1 last:mb-0">
                        • {suggestion}
                      </p>
                    ))}
                  </div>
                )}

                {check.timestamp && (
                  <div className="mt-2 text-xs text-secondary">
                    Validated: {check.timestamp}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {validationSummary.failed > 0 && (
        <div className="mt-4 p-3 bg-error/10 rounded-lg border border-error/20">
          <div className="flex items-center space-x-2">
            <span className="text-error">⚠️</span>
            <div>
              <p className="text-sm font-medium text-error">Action Required</p>
              <p className="text-xs text-secondary">
                {validationSummary.failed} validation check(s) failed. Please review and address issues before exporting.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}