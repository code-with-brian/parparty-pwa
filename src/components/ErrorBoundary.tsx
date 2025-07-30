import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold mb-4 text-red-600">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-green-600 hover:bg-green-700"
              >
                Reload Page
              </Button>
              <details className="mt-4 text-left text-xs text-gray-500">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error?.stack}
                </pre>
              </details>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}