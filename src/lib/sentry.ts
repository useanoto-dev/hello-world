import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.info('Sentry DSN not configured - monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content
        maskAllText: false,
        // Block all media
        blockAllMedia: false,
      }),
    ],
    
    // Performance - sample 100% of transactions in development, 10% in production
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session Replay - capture 10% of all sessions, and 100% of sessions with errors
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out noisy errors
    ignoreErrors: [
      // Network errors
      'Network Error',
      'Failed to fetch',
      'Load failed',
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Common third-party
      'ResizeObserver loop',
      'Script error.',
    ],
    
    // Before sending - filter sensitive data
    beforeSend(event) {
      // Remove sensitive query parameters
      if (event.request?.url) {
        const url = new URL(event.request.url);
        url.searchParams.delete('token');
        url.searchParams.delete('session_id');
        url.searchParams.delete('key');
        event.request.url = url.toString();
      }
      return event;
    },
    
    // Tag all events with app version
    release: `anoto@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
  });
}

// Error boundary helper
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Manual error capture
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

// Manual message capture
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Set user context
export function setUser(user: { id: string; email?: string; store_id?: string }) {
  Sentry.setUser(user);
}

// Clear user context (on logout)
export function clearUser() {
  Sentry.setUser(null);
}

// Add breadcrumb for tracking user actions
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

export { Sentry };
