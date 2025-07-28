import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Search, BarChart3, Users, Settings } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { RepositorySearch } from './pages/RepositorySearch';
import { Navigation } from './components/layout/Navigation';
import { PageLayout } from './components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from './components/ui';

function App() {
  return (
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}



// Dashboard Component
function Dashboard() {
  return (
    <PageLayout
      title="Dashboard"
      description="Discover and evaluate abandoned GitHub projects with high revival potential"
    >
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
                <p className="text-2xl font-semibold text-gray-900">1,247</p>
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
                <p className="text-2xl font-semibold text-gray-900">342</p>
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
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">89</p>
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
                <p className="text-sm font-medium text-gray-500">Analyses Run</p>
                <p className="text-2xl font-semibold text-gray-900">2,156</p>
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
          <div className="space-y-4">
            {[
              { name: 'awesome-ml-toolkit', stars: 1247, language: 'Python', score: 92 },
              { name: 'react-dashboard-pro', stars: 856, language: 'JavaScript', score: 88 },
              { name: 'blockchain-analyzer', stars: 634, language: 'Go', score: 85 },
            ].map((project, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-500">
                      {project.stars} stars • {project.language}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="success">Score: {project.score}</Badge>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            ))}
          </div>
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
