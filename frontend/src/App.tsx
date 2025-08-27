import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Search, BarChart3, Users, Settings } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { RepositorySearch } from './pages/RepositorySearch';
import RepositoryAnalysisPage from './pages/RepositoryAnalysis';
import RepositoryDetail from './pages/RepositoryDetail';
import UserDashboard from './pages/UserDashboard';
import { Navigation } from './components/layout/Navigation';
import { PageLayout } from './components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, ToastProvider, ErrorBoundary } from './components/ui';
import { SecurityMiddleware } from './utils/security';

function App() {
  // Initialize security middleware on app start
  useEffect(() => {
    SecurityMiddleware.initialize();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navigation />

          {/* Main Content */}
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/discover" element={<RepositorySearch />} />
              <Route path="/search" element={<RepositorySearch />} />
              <Route path="/evaluate" element={<Evaluate />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/repository/:owner/:repo" element={<RepositoryDetail />} />
              <Route path="/analysis/:owner/:repo" element={<RepositoryAnalysisPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </main>
            </div>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}



// Dashboard Component
function Dashboard() {
  const [stats, setStats] = React.useState<{
    totalRepositories: number;
    revivalPotential: {
      high: number;
      medium: number;
      low: number;
      notRecommended: number;
    };
    topLanguages: Array<{ _id: string; count: number }>;
    recentlyAnalyzed: number;
  } | null>(null);

  const [analysisStats, setAnalysisStats] = React.useState<{
    totalAnalyzed: number;
    averageRevivalScore: number;
    highPotential: number;
    mediumPotential: number;
    lowPotential: number;
  } | null>(null);

  const [highPotentialRepos, setHighPotentialRepos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token from localStorage
        const token = localStorage.getItem('token') || localStorage.getItem('auth_tokens');

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          // Try to parse token if it's a JSON object
          try {
            const parsedToken = JSON.parse(token);
            headers['Authorization'] = `Bearer ${parsedToken.accessToken || parsedToken}`;
          } catch {
            // If parsing fails, use token as-is
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        // Fetch statistics and high potential repositories in parallel
        const [statsResponse, analysisResponse, reposResponse] = await Promise.allSettled([
          fetch('/api/repositories/statistics', { headers }),
          fetch('/api/analysis/stats', { headers }),
          fetch('/api/repositories/high-potential?limit=3', { headers }),
        ]);

        // Process statistics response
        if (statsResponse.status === 'fulfilled') {
          if (statsResponse.value.ok) {
            const statsData = await statsResponse.value.json();
            if (statsData.success) {
              setStats(statsData.data);
            }
          } else if (statsResponse.value.status === 401) {
            setError('Authentication required. Please log in to view dashboard data.');
          }
        }

        // Process analysis statistics response
        if (analysisResponse.status === 'fulfilled') {
          if (analysisResponse.value.ok) {
            const analysisData = await analysisResponse.value.json();
            if (analysisData.success) {
              setAnalysisStats(analysisData.data);
            }
          }
        }

        // Process high potential repositories response
        if (reposResponse.status === 'fulfilled') {
          if (reposResponse.value.ok) {
            const reposData = await reposResponse.value.json();
            if (reposData.success) {
              setHighPotentialRepos(reposData.data.repositories || []);
            }
          }
        }

        // If no data was loaded and no specific error was set, show a general message
        if (!stats && !analysisStats && !error) {
          setError('No data available. The database may be empty or the backend may not be running. Try running the database seeding script: npm run seed');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <PageLayout
        title="Dashboard"
        description="Discover and evaluate abandoned GitHub projects with high revival potential"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading dashboard data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Dashboard"
      description="Discover and evaluate abandoned GitHub projects with high revival potential"
    >
      {error && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-start">
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Projects Discovered</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalRepositories?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Potential</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.revivalPotential?.high?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recently Analyzed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.recentlyAnalyzed?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Analyzed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analysisStats?.totalAnalyzed?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent High-Potential Projects</CardTitle>
          <CardDescription>
            Latest discoveries with strong revival potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          {highPotentialRepos.length > 0 ? (
            <div className="space-y-4">
              {highPotentialRepos.map((repo, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{repo.name}</h4>
                      <p className="text-sm text-gray-500">
                        {repo.metrics?.stars?.toLocaleString() || 0} stars • {repo.metrics?.language || 'Unknown'}
                      </p>
                      {repo.description && (
                        <p className="text-sm text-gray-600 mt-1 max-w-md truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">
                      Score: {repo.revival?.potentialScore || repo.analysis?.revivalPotential?.score || 'N/A'}
                    </Badge>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No high-potential repositories found yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Start by running some repository discovery and analysis jobs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}

// Placeholder components
function Discover() {
  return (
    <PageLayout
      title="Discover Projects"
      description="Search and filter abandoned GitHub projects"
    >
      <div className="text-center py-12">
        <p className="text-gray-500">Discovery interface coming soon...</p>
      </div>
    </PageLayout>
  );
}

function Evaluate() {
  return (
    <PageLayout
      title="Evaluate Opportunities"
      description="Analyze business potential of discovered projects"
    >
      <div className="text-center py-12">
        <p className="text-gray-500">Evaluation interface coming soon...</p>
      </div>
    </PageLayout>
  );
}

function Profile() {
  return (
    <PageLayout
      title="Profile"
      description="Manage your account and preferences"
    >
      <div className="text-center py-12">
        <p className="text-gray-500">Profile interface coming soon...</p>
      </div>
    </PageLayout>
  );
}

export default App;
