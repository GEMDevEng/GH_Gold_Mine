import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  CodeBracketIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  TrendingUpIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import apiService from '../services/api';
import { RepositoryAnalysis, CodeQualityMetrics, BusinessEvaluationMetrics, RevivalPotentialScore } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';

// Chart colors
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  secondary: '#6B7280'
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

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

  // Prepare chart data
  const prepareRadarData = (analysis: RepositoryAnalysis) => {
    if (!analysis.revivalPotential.factors) return [];

    return [
      {
        factor: 'Abandonment',
        score: analysis.revivalPotential.factors.abandonment || 0,
        fullMark: 100
      },
      {
        factor: 'Community',
        score: analysis.revivalPotential.factors.community || 0,
        fullMark: 100
      },
      {
        factor: 'Technical',
        score: analysis.revivalPotential.factors.technical || 0,
        fullMark: 100
      },
      {
        factor: 'Business',
        score: analysis.revivalPotential.factors.business || 0,
        fullMark: 100
      },
      {
        factor: 'Market Timing',
        score: analysis.revivalPotential.factors.marketTiming || 0,
        fullMark: 100
      },
      {
        factor: 'Competitive Edge',
        score: analysis.revivalPotential.factors.competitiveAdvantage || 0,
        fullMark: 100
      }
    ];
  };

  const prepareCodeQualityData = (codeQuality: CodeQualityMetrics) => {
    return Object.entries(codeQuality)
      .filter(([key]) => key !== 'overallScore')
      .map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim(),
        score: value,
        color: CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)]
      }));
  };

  const prepareBusinessData = (businessEvaluation: BusinessEvaluationMetrics) => {
    return Object.entries(businessEvaluation)
      .filter(([key]) => key !== 'overallScore')
      .map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim(),
        score: value,
        color: CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)]
      }));
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
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
          
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
              <Button
                onClick={runAnalysis}
                disabled={analyzing}
                variant="primary"
                className="flex items-center"
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
              </Button>
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
            <Button
              onClick={runAnalysis}
              variant="primary"
              className="flex items-center mx-auto"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Start Analysis
            </Button>
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

            {/* Revival Factors Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUpIcon className="h-5 w-5 mr-2" />
                  Revival Factors Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={prepareRadarData(analysis)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="factor" />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={false}
                      />
                      <Radar
                        name="Revival Score"
                        dataKey="score"
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${value}/100`, 'Score']}
                        labelStyle={{ color: '#374151' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code Quality Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CodeBracketIcon className="h-5 w-5 mr-2" />
                    Code Quality Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareCodeQualityData(analysis.codeQuality)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          formatter={(value: any) => [`${value}/100`, 'Score']}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Bar dataKey="score" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Overall Score Display */}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-3xl font-bold ${getScoreColor(analysis.codeQuality.overallScore)}`}>
                      {analysis.codeQuality.overallScore}
                    </div>
                    <div className="text-sm text-gray-500">Overall Quality Score</div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Evaluation Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                    Business Potential Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareBusinessData(analysis.businessEvaluation)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="score"
                        >
                          {prepareBusinessData(analysis.businessEvaluation).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${value}/100`, 'Score']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Overall Score Display */}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-3xl font-bold ${getScoreColor(analysis.businessEvaluation.overallScore)}`}>
                      {analysis.businessEvaluation.overallScore}
                    </div>
                    <div className="text-sm text-gray-500">Overall Business Score</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LightBulbIcon className="h-5 w-5 mr-2" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Analysis Insights */}
              {analysis.revivalPotential.reasoning && analysis.revivalPotential.reasoning.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.revivalPotential.reasoning.map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></span>
                          <span className="text-gray-700">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Re-run Analysis */}
            <div className="text-center">
              <Button
                onClick={runAnalysis}
                disabled={analyzing}
                variant="secondary"
                className="flex items-center mx-auto"
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
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryAnalysisPage;
