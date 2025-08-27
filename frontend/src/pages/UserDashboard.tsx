import React, { useState, useEffect } from 'react';
import { 
  UserIcon,
  BookmarkIcon,
  ChartBarIcon,
  ClockIcon,
  StarIcon,
  TrendingUpIcon,
  CogIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Repository, AnalysisHistoryEntry, UsageStats } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';

interface DashboardData {
  savedRepositories: Repository[];
  analysisHistory: AnalysisHistoryEntry[];
  usageStats: UsageStats;
  recommendations: Repository[];
}

const UserDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'history' | 'recommendations'>('overview');

  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [savedRepos, analysisHistory, usageStats, recommendations] = await Promise.allSettled([
        apiService.getSavedRepositories(),
        apiService.getAnalysisHistory(),
        apiService.getUsageStats(),
        apiService.getPersonalizedRecommendations()
      ]);

      setDashboardData({
        savedRepositories: savedRepos.status === 'fulfilled' ? savedRepos.value : [],
        analysisHistory: analysisHistory.status === 'fulfilled' ? analysisHistory.value : [],
        usageStats: usageStats.status === 'fulfilled' ? usageStats.value : {
          usage: { apiCalls: 0, analysesRun: 0, projectsDiscovered: 0, lastResetAt: new Date() },
          limits: { apiCalls: 1000, analysesRun: 50, projectsDiscovered: 100 },
          subscription: { plan: 'free', status: 'active', startDate: new Date() },
          percentages: { apiCalls: 0, analysesRun: 0, projectsDiscovered: 0 }
        },
        recommendations: recommendations.status === 'fulfilled' ? recommendations.value : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedRepository = async (repositoryId: string) => {
    try {
      await apiService.unsaveRepository(repositoryId);
      await loadDashboardData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove repository');
    }
  };

  const handleRerunAnalysis = async (repositoryFullName: string) => {
    try {
      await apiService.runRepositoryAnalysis(repositoryFullName);
      await loadDashboardData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rerun analysis');
    }
  };

  const getRevivalScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRevivalScoreBg = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getUsageColor = (percentage: number): 'default' | 'warning' | 'danger' => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'default';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="error" message="Please sign in to view your dashboard" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="error" message={error} />
          <Button onClick={loadDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <img 
              src={user.avatar} 
              alt={user.name}
              className="h-16 w-16 rounded-full"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.name}!
              </h1>
              <p className="text-gray-600">@{user.username}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'saved', label: 'Saved Repositories', icon: BookmarkIcon },
                { id: 'history', label: 'Analysis History', icon: ClockIcon },
                { id: 'recommendations', label: 'Recommendations', icon: TrendingUpIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookmarkIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Saved Repositories</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData?.savedRepositories.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Analyses Run</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData?.usageStats.usage.analysesRun || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Projects Discovered</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData?.usageStats.usage.projectsDiscovered || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <StarIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Subscription</p>
                      <p className="text-2xl font-semibold text-gray-900 capitalize">
                        {dashboardData?.usageStats.subscription.plan || 'Free'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Statistics */}
            {dashboardData?.usageStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">API Calls</span>
                        <span className="text-sm text-gray-500">
                          {dashboardData.usageStats.usage.apiCalls} / {dashboardData.usageStats.limits.apiCalls}
                        </span>
                      </div>
                      <Progress 
                        value={dashboardData.usageStats.percentages.apiCalls} 
                        color={getUsageColor(dashboardData.usageStats.percentages.apiCalls)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Analyses Run</span>
                        <span className="text-sm text-gray-500">
                          {dashboardData.usageStats.usage.analysesRun} / {dashboardData.usageStats.limits.analysesRun}
                        </span>
                      </div>
                      <Progress 
                        value={dashboardData.usageStats.percentages.analysesRun} 
                        color={getUsageColor(dashboardData.usageStats.percentages.analysesRun)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Projects Discovered</span>
                        <span className="text-sm text-gray-500">
                          {dashboardData.usageStats.usage.projectsDiscovered} / {dashboardData.usageStats.limits.projectsDiscovered}
                        </span>
                      </div>
                      <Progress 
                        value={dashboardData.usageStats.percentages.projectsDiscovered} 
                        color={getUsageColor(dashboardData.usageStats.percentages.projectsDiscovered)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Saved Repositories Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            {dashboardData?.savedRepositories.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved repositories</h3>
                  <p className="text-gray-500 mb-4">Start exploring repositories and save the ones with high revival potential.</p>
                  <Button onClick={() => window.location.href = '/discover'}>
                    Discover Repositories
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {dashboardData?.savedRepositories.map((repo) => (
                  <Card key={repo._id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {repo.fullName}
                            </h3>
                            <Badge variant={repo.revival.recommendation === 'high' ? 'success' :
                                          repo.revival.recommendation === 'medium' ? 'warning' : 'secondary'}>
                              {repo.revival.recommendation} potential
                            </Badge>
                            <div className={`text-lg font-bold ${getRevivalScoreColor(repo.revival.potentialScore)}`}>
                              {repo.revival.potentialScore}/100
                            </div>
                          </div>

                          {repo.description && (
                            <p className="text-gray-600 mb-3">{repo.description}</p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <span className="flex items-center">
                              <StarIcon className="h-4 w-4 mr-1" />
                              {repo.metrics.stars.toLocaleString()}
                            </span>
                            <span>
                              Last updated: {new Date(repo.metrics.lastCommitDate).toLocaleDateString()}
                            </span>
                            {repo.metrics.license && (
                              <span>{repo.metrics.license}</span>
                            )}
                          </div>

                          {repo.revival.reasons.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-green-800 mb-1">Strengths:</h4>
                              <ul className="text-sm text-green-700">
                                {repo.revival.reasons.slice(0, 2).map((reason, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-500 mr-2">•</span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => window.location.href = `/repository/${repo.owner.login}/${repo.name}`}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRerunAnalysis(repo.fullName)}
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Re-analyze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveSavedRepository(repo._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {dashboardData?.analysisHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis history</h3>
                  <p className="text-gray-500 mb-4">Your repository analysis history will appear here.</p>
                  <Button onClick={() => window.location.href = '/discover'}>
                    Start Analyzing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.analysisHistory.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h4 className="font-medium text-gray-900">{entry.repositoryName}</h4>
                            <Badge variant={entry.recommendation === 'high' ? 'success' :
                                          entry.recommendation === 'medium' ? 'warning' : 'secondary'}>
                              {entry.recommendation}
                            </Badge>
                            <div className={`font-bold ${getRevivalScoreColor(entry.revivalScore)}`}>
                              {entry.revivalScore}/100
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Analyzed on {new Date(entry.analysisDate).toLocaleDateString()} at{' '}
                            {new Date(entry.analysisDate).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/repository/${entry.repositoryName.replace('/', '/')}`}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRerunAnalysis(entry.repositoryName)}
                          >
                            Re-analyze
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <p className="text-sm text-gray-600">
                  Based on your analysis history and preferences, here are repositories with high revival potential.
                </p>
              </CardHeader>
              <CardContent>
                {dashboardData?.recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
                    <p className="text-gray-500 mb-4">
                      Analyze more repositories to get personalized recommendations.
                    </p>
                    <Button onClick={() => window.location.href = '/discover'}>
                      Discover Repositories
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dashboardData?.recommendations.map((repo) => (
                      <div key={repo._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{repo.fullName}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={repo.revival.recommendation === 'high' ? 'success' : 'warning'}>
                                {repo.revival.recommendation} potential
                              </Badge>
                              <div className={`text-sm font-bold ${getRevivalScoreColor(repo.revival.potentialScore)}`}>
                                {repo.revival.potentialScore}/100
                              </div>
                            </div>
                          </div>
                        </div>

                        {repo.description && (
                          <p className="text-sm text-gray-600 mb-3">{repo.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <StarIcon className="h-3 w-3 mr-1" />
                              {repo.metrics.stars.toLocaleString()}
                            </span>
                            <span>{Object.keys(repo.metrics.languages)[0]}</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.location.href = `/repository/${repo.owner.login}/${repo.name}`}
                          >
                            Analyze
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
