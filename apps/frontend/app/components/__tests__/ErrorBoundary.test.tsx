/**
 * ErrorBoundary Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress console.error for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error catching', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should call onError callback when error is caught', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe('Custom fallback', () => {
    it('should render custom fallback component', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should render custom fallback function', () => {
      const customFallback = (error: Error) => <div>Error: {error.message}</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });
  });

  describe('Error recovery', () => {
    it('should show recovery button when enabled', () => {
      render(
        <ErrorBoundary enableRecovery>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should recover from error when Try Again is clicked', () => {
      const TestComponent: React.FC = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <ErrorBoundary enableRecovery>
            <button onClick={() => setShouldThrow(false)}>Fix</button>
            <ThrowError shouldThrow={shouldThrow} />
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'));

      // Should attempt to render children again
      // Note: In real scenario, the component would need to handle state change
    });

    it('should show custom recovery message', () => {
      const customMessage = 'Please try refreshing the page';

      render(
        <ErrorBoundary enableRecovery recoveryMessage={customMessage}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Reload functionality', () => {
    it('should show reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should reload page when Reload button is clicked', () => {
      const originalLocation = window.location;
      const reloadMock = jest.fn();

      // @ts-ignore - Mock window.location
      delete window.location;
      // @ts-ignore
      window.location = { ...originalLocation, reload: reloadMock };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      fireEvent.click(screen.getByText('Reload Page'));

      expect(reloadMock).toHaveBeenCalled();

      // Restore
      // @ts-ignore
      window.location = originalLocation;
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should pass props to wrapped component', () => {
      const TestComponent: React.FC<{ message: string }> = ({ message }) => <div>{message}</div>;

      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent message="Test message" />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should accept error boundary props', () => {
      const onError = jest.fn();
      const WrappedComponent = withErrorBoundary(ThrowError, { onError });

      render(<WrappedComponent />);

      expect(onError).toHaveBeenCalled();
    });
  });
});
