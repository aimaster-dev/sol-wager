// Error reporting utility for production monitoring
// Can integrate with services like Sentry, LogRocket, or custom logging

interface ErrorContext {
  userId?: string;
  walletAddress?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private isProduction: boolean;
  
  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }
  
  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }
  
  // Initialize error reporting service (e.g., Sentry)
  init() {
    if (this.isProduction && process.env.REACT_APP_SENTRY_DSN) {
      // Example Sentry initialization
      // Sentry.init({
      //   dsn: process.env.REACT_APP_SENTRY_DSN,
      //   environment: process.env.REACT_APP_ENVIRONMENT,
      //   tracesSampleRate: 0.1,
      // });
    }
  }
  
  // Log error with context
  logError(error: Error, context?: ErrorContext) {
    console.error('Error occurred:', error);
    
    if (context) {
      console.error('Error context:', context);
    }
    
    if (this.isProduction) {
      // Send to error reporting service
      // Sentry.captureException(error, {
      //   contexts: { custom: context }
      // });
    }
  }
  
  // Log warning
  logWarning(message: string, metadata?: Record<string, any>) {
    console.warn('Warning:', message, metadata);
    
    if (this.isProduction) {
      // Send to monitoring service
    }
  }
  
  // Log transaction error with specific handling
  logTransactionError(error: Error, txSignature?: string, instruction?: string) {
    this.logError(error, {
      action: 'transaction',
      metadata: {
        signature: txSignature,
        instruction,
        network: process.env.REACT_APP_SOLANA_NETWORK,
      }
    });
  }
  
  // Log connection errors
  logConnectionError(error: Error, endpoint?: string) {
    this.logError(error, {
      action: 'connection',
      metadata: {
        endpoint,
        network: process.env.REACT_APP_SOLANA_NETWORK,
      }
    });
  }
}

export const errorReporter = ErrorReporter.getInstance();

// React Error Boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorReporter.logError(error, {
      action: 'react-error-boundary',
      metadata: errorInfo,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page and try again.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}