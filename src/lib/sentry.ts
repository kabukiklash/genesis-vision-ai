import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE;

// Apenas inicializar em produção ou em desenvolvimento se explícito
const shouldInit =
  ENV === 'production' || import.meta.env.VITE_SENTRY_ENABLED === 'true';

if (shouldInit && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Enviar PII default (ex: IP) para contexto - útil para debug
    sendDefaultPii: true,

    // Integrações: tracing (performance) + replay (sessão)
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Capturar 100% dos erros, 10% das transações (perf), 10% das sessões
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Ambiente
    environment: ENV,

    // Release - vincular a versão do app
    release: import.meta.env.VITE_APP_VERSION || '0.1.0',

    // Ignorar erros de extensões do browser
    denyUrls: [/extensions\//i, /^chrome:\/\//i],
  });
  console.info('✅ Sentry inicializado');
} else {
  console.info(
    'ℹ️ Sentry não inicializado (dev mode ou DSN não configurado)'
  );
}

export default Sentry;
