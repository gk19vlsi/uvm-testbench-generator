/**
 * Readiness Score Display Component
 * Displays simulation readiness score with visual indicators,
 * score breakdown, and recommendations
 */

import { useMemo } from "react";

interface ReadinessScoreDisplayProps {
  score?: {
    overall: number;
    breakdown: {
      completeness: number;
      connectivity: number;
      syntax: number;
      coverage: number;
    };
    classification: "Not Ready" | "Needs Review" | "Ready";
  };
  recommendations?: Array<{
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    actionable: string;
  }>;
  generatedFilesCount?: number;
}

const ReadinessScoreDisplay: React.FC<ReadinessScoreDisplayProps> = ({
  score = {
    overall: 92,
    breakdown: {
      completeness: 95,
      connectivity: 100,
      syntax: 88,
      coverage: 85,
    },
    classification: "Ready",
  },
  recommendations = [
    {
      severity: "warning",
      category: "Coverage",
      message: "Consider adding more cross-coverage for signal interactions",
      actionable: "Add cross-coverage between address and data signals",
    },
    {
      severity: "info",
      category: "Generation",
      message: "24 files generated successfully",
      actionable: "Review generated files in the UVM Tree",
    },
  ],
  generatedFilesCount = 24,
}) => {
  const getScoreColor = (score: number) => {
    if (score < 70) return { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50" };
    if (score < 90) return { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50" };
    return { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50" };
  };

  const getClassificationColor = (classification: string) => {
    if (classification === "Not Ready") return "text-red-600";
    if (classification === "Needs Review") return "text-yellow-600";
    return "text-green-600";
  };

  const getSeverityBadge = (severity: string) => {
    const badges = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
    };
    return badges[severity as keyof typeof badges] || badges.info;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "critical") {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (severity === "warning") {
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const scoreColor = useMemo(() => getScoreColor(score.overall), [score.overall]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Score with Gauge */}
      <div className={`${scoreColor.light} rounded-lg p-4 sm:p-6 border-2 ${scoreColor.bg} border-opacity-20`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Simulation Readiness Score
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Overall testbench quality assessment
            </p>
            <div className={`text-sm font-medium mt-2 ${getClassificationColor(score.classification)}`}>
              Status: {score.classification}
            </div>
          </div>
          
          {/* Circular Progress Gauge */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                />
                {/* Progress Circle */}
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={scoreColor.text}
                  strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - score.overall / 100)}
                  style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
              </svg>
              {/* Score Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-3xl sm:text-4xl font-bold ${scoreColor.text}`}>
                  {score.overall}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                  out of 100
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar (Alternative visualization) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Quality Score</span>
            <span>{score.overall}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`${scoreColor.bg} h-3 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${score.overall}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Score Breakdown
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Object.entries(score.breakdown).map(([key, value]) => {
            const itemColor = getScoreColor(value);
            return (
              <div key={key} className="bg-white rounded-lg p-3 sm:p-4 shadow border border-gray-200">
                <p className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                  {key}
                </p>
                <div className="flex items-baseline mt-2">
                  <p className={`text-2xl sm:text-3xl font-bold ${itemColor.text}`}>
                    {value}
                  </p>
                  <span className="text-sm text-gray-500 ml-1">/100</span>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`${itemColor.bg} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg p-4 sm:p-5 shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Recommendations
            </h4>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {recommendations.length} items
            </span>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(rec.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadge(rec.severity)}`}
                    >
                      {rec.severity.charAt(0).toUpperCase() + rec.severity.slice(1)}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{rec.message}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-medium">Action:</span> {rec.actionable}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center space-x-3">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {generatedFilesCount} Files Generated
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Complete UVM testbench with all components
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadinessScoreDisplay;
