import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: "https://573647583b04e99f9042f198ab53432f@o4511298353496064.ingest.de.sentry.io/4511298384756816",
  enabled: !!process.env.FLY_APP_NAME,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
