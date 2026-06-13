import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode | ((error: Error | null) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error bound by ErrorBoundary:', error, errorInfo);
    // Optionally log to an external service here
  }

  public render() {
    const { hasError, error } = this.state;
    // @ts-ignore - stubborn linter
    const { fallback, children } = this.props;

    if (hasError) {
      if (typeof fallback === 'function') {
        return fallback(error);
      }
      return fallback;
    }

    return children;
  }
}
