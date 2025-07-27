import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setError(errorDescription || error || 'Authentication was cancelled');
        return;
      }

      // Check for authorization code
      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        await login(code);
        setStatus('success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mb-6">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Completing Sign In
            </h2>
            <p className="text-gray-600">
              Please wait while we authenticate you with GitHub...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to GitHub Gold Mine!
            </h2>
            <p className="text-gray-600 mb-4">
              You've been successfully authenticated. Redirecting to your dashboard...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full btn-primary py-2 px-4 rounded-lg font-medium"
              >
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="w-full btn-outline py-2 px-4 rounded-lg font-medium"
              >
                Go Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
