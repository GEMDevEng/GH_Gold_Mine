import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  StarIcon,
  CodeBracketIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CubeIcon,
  TrendingUpIcon,
  LightBulbIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import apiService from '../services/api';
import { Repository, RepositoryAnalysis } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';

const RepositoryDetail: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  
  const [repository, setRepository] = useState<Repository | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchRepositoryDetails = async () => {
      if (!owner || !repo) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch repository details and analysis
        const [repoResponse, analysisResponse] = await Promise.allSettled([
          apiService.getRepository(`${owner}/${repo}`),
          apiService.getRepositoryAnalysis(`${owner}/${repo}`)
        ]);

        if (repoResponse.status === 'fulfilled') {
          setRepository(repoResponse.value);
        }

        if (analysisResponse.status === 'fulfilled') {
          setAnalysis(analysisResponse.value);
        }

        if (repoResponse.status === 'rejected' && analysisResponse.status === 'rejected') {
          setError('Failed to load repository details. Please try again.');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRepositoryDetails();
  }, [owner, repo]);

  const handleSaveRepository = async () => {
    if (!repository) return;
    
    try {
      if (isSaved) {
        await apiService.unsaveRepository(repository._id);
        setIsSaved(false);
      } else {
        await apiService.saveRepository(repository._id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to save/unsave repository:', err);
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

  const getRecommendationBadge = (recommendation: string) => {
    const variants = {
      'high': 'success',
      'medium': 'warning',
      'low': 'secondary',
      'not-recommended': 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[recommendation as keyof typeof variants] || 'secondary'}>
        {recommendation.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading repository analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Repository</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const revivalScore = repository.revival?.potentialScore || 0;
  const analysisData = analysis || repository.analysis;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
            
            <Button
              onClick={handleSaveRepository}
              variant={isSaved ? "default" : "outline"}
              className="mb-4"
            >
              <HeartIcon className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save Repository'}
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <img 
                    src={repository.owner.avatar} 
                    alt={repository.owner.login}
                    className="h-8 w-8 rounded-full"
                  />
                  <h1 className="text-2xl font-bold text-gray-900">
                    {repository.fullName}
                  </h1>
                  {getRecommendationBadge(repository.revival.recommendation)}
                </div>
                
                {repository.description && (
                  <p className="text-gray-600 mb-4">{repository.description}</p>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    {repository.metrics.stars.toLocaleString()} stars
                  </div>
                  <div className="flex items-center">
                    <CodeBracketIcon className="h-4 w-4 mr-1" />
                    {repository.metrics.forks.toLocaleString()} forks
                  </div>
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1" />
                    {repository.metrics.watchers.toLocaleString()} watchers
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Updated {new Date(repository.metrics.lastCommitDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(revivalScore)}`}>
                  {revivalScore}
                </div>
                <div className="text-sm text-gray-500">Revival Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Revival Factors */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revival Potential Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUpIcon className="h-5 w-5 mr-2" />
                  Revival Potential Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData?.revivalPotential ? (
                  <div className="space-y-4">
                    {/* Core Factors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Abandonment</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.revivalPotential.factors.abandonment}/100
                          </span>
                        </div>
                        <Progress 
                          value={analysisData.revivalPotential.factors.abandonment} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Community</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.revivalPotential.factors.community}/100
                          </span>
                        </div>
                        <Progress 
                          value={analysisData.revivalPotential.factors.community} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Technical</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.revivalPotential.factors.technical}/100
                          </span>
                        </div>
                        <Progress 
                          value={analysisData.revivalPotential.factors.technical} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Business</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.revivalPotential.factors.business}/100
                          </span>
                        </div>
                        <Progress 
                          value={analysisData.revivalPotential.factors.business} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    {/* Enhanced Factors */}
                    {(analysisData.revivalPotential.factors.marketTiming || 
                      analysisData.revivalPotential.factors.competitiveAdvantage ||
                      analysisData.revivalPotential.factors.revivalComplexity ||
                      analysisData.revivalPotential.factors.communityReadiness) && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Enhanced Factors</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {analysisData.revivalPotential.factors.marketTiming && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Market Timing</span>
                                <span className="text-sm text-gray-500">
                                  {analysisData.revivalPotential.factors.marketTiming}/100
                                </span>
                              </div>
                              <Progress 
                                value={analysisData.revivalPotential.factors.marketTiming} 
                                className="h-2"
                              />
                            </div>
                          )}
                          
                          {analysisData.revivalPotential.factors.competitiveAdvantage && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Competitive Edge</span>
                                <span className="text-sm text-gray-500">
                                  {analysisData.revivalPotential.factors.competitiveAdvantage}/100
                                </span>
                              </div>
                              <Progress 
                                value={analysisData.revivalPotential.factors.competitiveAdvantage} 
                                className="h-2"
                              />
                            </div>
                          )}
                          
                          {analysisData.revivalPotential.factors.revivalComplexity && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Revival Complexity</span>
                                <span className="text-sm text-gray-500">
                                  {analysisData.revivalPotential.factors.revivalComplexity}/100
                                </span>
                              </div>
                              <Progress 
                                value={analysisData.revivalPotential.factors.revivalComplexity} 
                                className="h-2"
                              />
                            </div>
                          )}
                          
                          {analysisData.revivalPotential.factors.communityReadiness && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Community Readiness</span>
                                <span className="text-sm text-gray-500">
                                  {analysisData.revivalPotential.factors.communityReadiness}/100
                                </span>
                              </div>
                              <Progress 
                                value={analysisData.revivalPotential.factors.communityReadiness} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Confidence Score */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Analysis Confidence</span>
                        <span className={`text-sm font-semibold ${getScoreColor(analysisData.revivalPotential.confidence)}`}>
                          {analysisData.revivalPotential.confidence}%
                        </span>
                      </div>
                      <Progress 
                        value={analysisData.revivalPotential.confidence} 
                        className="h-2 mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Detailed analysis not available</p>
                    <p className="text-sm">Basic revival score: {revivalScore}/100</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Code Quality Metrics */}
            {analysisData?.codeQuality && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CodeBracketIcon className="h-5 w-5 mr-2" />
                    Code Quality Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={`text-3xl font-bold ${getScoreColor(analysisData.codeQuality.overallScore)}`}>
                        {analysisData.codeQuality.overallScore}
                      </div>
                      <div className="text-sm text-gray-500">Overall Quality Score</div>
                    </div>

                    {/* Quality Metrics */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center">
                            <CubeIcon className="h-4 w-4 mr-1" />
                            Complexity
                          </span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.complexity}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.complexity} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Maintainability
                          </span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.maintainability}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.maintainability} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center">
                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                            Test Coverage
                          </span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.testCoverage}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.testCoverage} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center">
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            Documentation
                          </span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.documentation}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.documentation} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Code Style</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.codeStyle}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.codeStyle} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Dependencies</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.dependencies}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.dependencies} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Security</span>
                          <span className="text-sm text-gray-500">
                            {analysisData.codeQuality.security}/100
                          </span>
                        </div>
                        <Progress value={analysisData.codeQuality.security} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {(repository.revival.reasons.length > 0 || repository.revival.concerns.length > 0 ||
              (analysisData?.recommendations && analysisData.recommendations.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LightBulbIcon className="h-5 w-5 mr-2" />
                    Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Reasons for Revival */}
                    {repository.revival.reasons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {repository.revival.reasons.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {repository.revival.concerns.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          Concerns
                        </h4>
                        <ul className="space-y-1">
                          {repository.revival.concerns.map((concern, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-orange-500 mr-2">•</span>
                              {concern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Analysis Recommendations */}
                    {analysisData?.recommendations && analysisData.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                          <LightBulbIcon className="h-4 w-4 mr-1" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {analysisData.recommendations.map((recommendation, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Enhanced Reasoning */}
                    {analysisData?.revivalPotential?.reasoning && analysisData.revivalPotential.reasoning.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-purple-700 mb-2 flex items-center">
                          <ChartBarIcon className="h-4 w-4 mr-1" />
                          Analysis Reasoning
                        </h4>
                        <ul className="space-y-1">
                          {analysisData.revivalPotential.reasoning.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-purple-500 mr-2">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Language</span>
                    <span className="text-sm font-medium">
                      {Object.keys(repository.metrics.languages)[0] || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Size</span>
                    <span className="text-sm font-medium">
                      {(repository.metrics.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Open Issues</span>
                    <span className="text-sm font-medium">
                      {repository.metrics.openIssues}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">License</span>
                    <span className="text-sm font-medium">
                      {repository.metrics.license || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium">
                      {new Date(repository.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topics */}
            {repository.metrics.topics && repository.metrics.topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {repository.metrics.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* External Links */}
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <a 
                    href={repository.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    View on GitHub →
                  </a>
                  {repository.homepage && (
                    <a 
                      href={repository.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800"
                    >
                      Project Homepage →
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryDetail;
