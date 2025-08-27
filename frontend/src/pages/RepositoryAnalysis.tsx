import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChartBarIcon, 
  CodeBracketIcon, 
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import apiService from '../services/api';
import { RepositoryAnalysis, CodeQualityMetrics, BusinessEvaluationMetrics, RevivalPotentialScore } from '../types/api';

const RepositoryAnalysisPage: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (owner && repo) {
      loadExistingAnalysis();
    }
  }, [owner, repo]);

  const loadExistingAnalysis = async () => {
    if (!owner || !repo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getRepositoryAnalysis(owner, repo);
      setAnalysis(result);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        // No existing analysis, that's okay
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!owner || !repo) return;
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const result = await apiService.analyzeRepository(owner, repo);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Repository Analysis
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                {owner}/{repo}
              </p>
            </div>
            
            {!analysis && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {analyzing ? (
                  <>
                    <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Run Analysis
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Analysis State */}
        {!analysis && !analyzing && !error && (
          <div className="text-center py-12">
            <ChartBarIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Analysis Available
            </h3>
            <p className="text-gray-600 mb-6">
              Run an analysis to get detailed insights about this repository's revival potential.
            </p>
            <button
              onClick={runAnalysis}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Start Analysis
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-8">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Analysis Summary</h2>
                <span className="text-sm text-gray-500">
                  Analyzed {new Date(analysis.analyzedAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revival Score */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.revivalPotential.score)} mb-2`}>
                    {analysis.revivalPotential.score}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Revival Score</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRecommendationColor(analysis.revivalPotential.recommendation)}`}>
                    {analysis.revivalPotential.recommendation.toUpperCase()}
                  </span>
                </div>

                {/* Code Quality */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.codeQuality.overallScore)} mb-2`}>
                    {analysis.codeQuality.overallScore}
                  </div>
                  <div className="text-sm text-gray-600">Code Quality</div>
                </div>

                {/* Business Potential */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.businessEvaluation.overallScore)} mb-2`}>
                    {analysis.businessEvaluation.overallScore}
                  </div>
                  <div className="text-sm text-gray-600">Business Potential</div>
                </div>

                {/* Confidence */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.revivalPotential.confidence)} mb-2`}>
                    {analysis.revivalPotential.confidence}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{analysis.summary}</p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code Quality Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <CodeBracketIcon className="h-6 w-6 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Code Quality Analysis</h3>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(analysis.codeQuality).map(([key, value]) => {
                    if (key === 'overallScore') return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${getScoreBgColor(value as number).replace('bg-', 'bg-')}`}
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getScoreColor(value as number)}`}>
                            {value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Business Evaluation Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <BuildingOfficeIcon className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Business Evaluation</h3>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(analysis.businessEvaluation).map(([key, value]) => {
                    if (key === 'overallScore') return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${getScoreBgColor(value as number).replace('bg-', 'bg-')}`}
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getScoreColor(value as number)}`}>
                            {value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-yellow-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
                </div>
                
                <ul className="space-y-3">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Re-run Analysis */}
            <div className="text-center">
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
              >
                {analyzing ? (
                  <>
                    <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  <>
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Re-run Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryAnalysisPage;
