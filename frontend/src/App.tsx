import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { RepositorySearch } from './pages/RepositorySearch';
import RepositoryAnalysisPage from './pages/RepositoryAnalysis';
import RepositoryDetail from './pages/RepositoryDetail';
import UserDashboard from './pages/UserDashboard';
import { Dashboard } from './pages/Dashboard';
import { Discover } from './pages/Discover';
import { Evaluate } from './pages/Evaluate';
import { Profile } from './pages/Profile';
import { Navigation } from './components/layout/Navigation';
import { ToastProvider, ErrorBoundary } from './components/ui';
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
              <Route path="/discover" element={<Discover />} />
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

export default App;
