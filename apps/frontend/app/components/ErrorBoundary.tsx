/**
 * ErrorBoundary Component
 * React error boundary for graceful error handling
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to display when error occurs */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Enable error recovery */
  enableRecovery?: boolean;
  /** Custom recovery message */
  recoveryMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Features:
 * - Graceful error handling
 * - Error context preservation for debugging
 * - Optional error recovery mechanism
 * - Customizable fallback UI
 *
 * Example:
 * ```tsx
 * <ErrorBoundary
 *   onError={(error, errorInfo) => console.error(error)}
 *   enableRecovery
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReportingService(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback, enableRecovery, recoveryMessage } = this.props;
      const { error, errorInfo } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function' && error && errorInfo) {
          return fallback(error, errorInfo) as ReactNode;
        }
        return fallback as ReactNode;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Something went wrong</h1>

            {/* Error Message */}
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              {recoveryMessage || "We're sorry, but something unexpected happened. Please try again."}
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Error Details:</h2>
                <pre className="text-xs text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap">
                  {error.toString()}
                </pre>
                {errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {enableRecovery && (
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200"
              >
                Reload Page
              </button>
            </div>

            {/* Support Link */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              If the problem persists, please{' '}
              <a href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">
                contact support
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
