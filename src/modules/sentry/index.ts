import { AWSLambda, captureException as _captureException } from '@sentry/serverless';
import { CaptureContext } from '@sentry/types';

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

export function captureException(exception: any, captureContext?: CaptureContext) {
  if (!SENTRY_DSN) {
    console.error(exception);
    console.log(captureContext);
    return;
  }

  return _captureException(exception, captureContext);
}
