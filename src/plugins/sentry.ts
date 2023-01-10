
import { AWSLambda } from '@sentry/serverless';

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  AWSLambda.init({
    dsn: SENTRY_DSN,
  
    tracesSampleRate: 1.0,
  });
}

export function wrapHandler(handler) {
  if (!SENTRY_DSN) return handler;

  initSentry();
  return AWSLambda.wrapHandler(handler);
}