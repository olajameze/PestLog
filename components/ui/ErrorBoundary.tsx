"use client";

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error!, () => this.setState({ hasError: false }))
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-200">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto">
              We&apos;re sorry, an unexpected error occurred. Please try refreshing or 
              contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                size="lg"
                className="w-full"
              >
                Refresh Page
              </Button>
              <Button 
                variant="secondary"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
