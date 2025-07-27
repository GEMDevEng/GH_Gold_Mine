import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Search, BarChart3, Users, Settings, User as UserIcon } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { LoginButton } from './components/auth/LoginButton';
import { UserProfile } from './components/auth/UserProfile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/discover" element={<Discover />} />
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

// Header Component
function Header() {
  const { user, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary-600">
                GitHub Project Miner
              </h1>
            </div>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              <a href="#" className="text-gray-900 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Discover
              </a>
              <a href="#" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Evaluate
              </a>
              <a href="#" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Profile
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">Welcome, {user.name}</span>
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <UserIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <>
                <LoginButton size="sm" variant="outline" />
                <LoginButton size="sm" variant="primary" className="hidden sm:inline-flex" />
              </>
            )}
          </div>
        </div>
      </div>

      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </header>
  );
}

// Dashboard Component
function Dashboard() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Discover and evaluate abandoned GitHub projects with high revival potential
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Projects Discovered</p>
                <p className="text-2xl font-semibold text-gray-900">1,247</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Potential</p>
                <p className="text-2xl font-semibold text-gray-900">342</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">89</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Analyses Run</p>
                <p className="text-2xl font-semibold text-gray-900">2,156</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent High-Potential Projects</h3>
          <p className="card-description">
            Latest discoveries with strong revival potential
          </p>
        </div>
        <div className="card-content">
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
                  <span className="badge badge-success">Score: {project.score}</span>
                  <button type="button" className="btn btn-outline btn-sm">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components
function Discover() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900">Discover Projects</h1>
      <p className="mt-2 text-gray-600">Search and filter abandoned GitHub projects</p>
    </div>
  );
}

function Evaluate() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900">Evaluate Opportunities</h1>
      <p className="mt-2 text-gray-600">Analyze business potential of discovered projects</p>
    </div>
  );
}

function Profile() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      <p className="mt-2 text-gray-600">Manage your account and preferences</p>
    </div>
  );
}

export default App;
