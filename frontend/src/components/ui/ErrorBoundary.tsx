import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: { errorBoundary: true }
      // });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Create a GitHub issue URL with pre-filled error details
    const issueTitle = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown Error'}`);
    const issueBody = encodeURIComponent(`
## Error Details
- **Error ID**: ${errorId}
- **Message**: ${error?.message || 'Unknown error'}
- **URL**: ${window.location.href}
- **Timestamp**: ${new Date().toISOString()}
- **User Agent**: ${navigator.userAgent}

## Stack Trace
\`\`\`
${error?.stack || 'No stack trace available'}
\`\`\`

## Component Stack
\`\`\`
${errorInfo?.componentStack || 'No component stack available'}
\`\`\`

## Steps to Reproduce
1. [Please describe the steps that led to this error]

## Expected Behavior
[Please describe what you expected to happen]

## Additional Context
[Please add any other context about the problem here]
    `);

    const githubUrl = `https://github.com/GEMDevEng/GH_Gold_Mine/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug`;
    window.open(githubUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-error-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                Oops! Something went wrong
              </CardTitle>
              <p className="text-gray-600 mt-2">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID for support */}
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Error ID:</strong> {this.state.errorId}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Please include this ID when reporting the issue.
                </p>
              </div>

              {/* Error details (only in development or if showDetails is true) */}
              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
                <details className="bg-gray-100 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Technical Details
                  </summary>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={this.handleReportBug}
                  variant="ghost"
                  className="flex-1"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {/* Help text */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  If this problem persists, please{' '}
                  <button
                    type="button"
                    onClick={this.handleReportBug}
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    report it as a bug
                  </button>{' '}
                  or contact our support team.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: any) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // In a real app, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: { errorHandler: true }
      // });
    }
  };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
