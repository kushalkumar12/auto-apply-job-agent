import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong', fallbackMessage } = this.props;
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">
            <AlertTriangle size={32} />
          </div>
          <h3 className="error-boundary-title">{fallbackTitle}</h3>
          <p className="error-boundary-message">
            {fallbackMessage || 'An unexpected error occurred in this section. Please try refreshing.'}
          </p>
          {this.state.error && (
            <details className="error-boundary-details">
              <summary>Technical details</summary>
              <pre>{this.state.error.toString()}</pre>
            </details>
          )}
          <button className="error-boundary-retry-btn" onClick={this.handleReset}>
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
