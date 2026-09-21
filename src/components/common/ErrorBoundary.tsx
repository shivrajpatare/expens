import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('ErrorBoundary caught an unhandled UI error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md, 16px)',
            backgroundColor: 'var(--color-canvas, #F7F6F2)',
            color: 'var(--color-text-primary, #1E2229)',
            fontFamily: 'var(--font-primary, sans-serif)'
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border-subtle, #E3DFD7)',
              borderRadius: 'var(--radius-lg, 16px)',
              padding: 'var(--space-xl, 32px)',
              boxShadow: 'var(--shadow-level-2, 0 12px 32px rgba(30, 34, 41, 0.08))',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--status-warning-surface, #FAF2EB)',
                color: 'var(--status-warning, #C4773B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-md, 16px) auto',
                fontSize: 20,
                fontWeight: 700
              }}
            >
              !
            </div>

            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 'var(--space-sm, 12px)',
                letterSpacing: '-0.01em'
              }}
            >
              Something went wrong.
            </h1>

            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary, #6B7280)',
                marginBottom: 'var(--space-md, 16px)'
              }}
            >
              Your data is stored locally in this browser.
              <br />
              No financial changes were made by this error.
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              autoFocus
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'var(--target-min, 48px)',
                padding: '0 var(--space-lg, 24px)',
                backgroundColor: 'var(--color-accent, #1E2229)',
                color: 'var(--color-accent-text, #FFFFFF)',
                border: 'none',
                borderRadius: 'var(--radius-md, 10px)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
