import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleCaughtError } from '../services/clientErrorService';

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
    // Stale-chunk recovery (Nov 21, 2026 — Option A): report the error
    // to the server (readable in the Firebase console) and, when it is
    // a stale chunk from a deploy, reload once automatically instead of
    // leaving the player on the error screen. Never throws.
    void handleCaughtError(error);
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
