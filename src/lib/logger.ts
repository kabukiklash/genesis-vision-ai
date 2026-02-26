/**
 * Logger estruturado para toda a aplicação
 * Formato: [TIMESTAMP] [LEVEL] [MODULE] Message { metadata }
 */

import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  metadata?: Record<string, unknown>;
}

class StructuredLogger {
  private isDev = import.meta.env.DEV;

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, module, message, metadata } = entry;
    const levelUpper = level.toUpperCase().padEnd(5);
    const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${levelUpper}] [${module}]${meta} ${message}`;
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    if (!this.isDev && level === 'debug') return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      metadata,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        Sentry.captureException(new Error(message), {
          tags: { module },
          extra: metadata,
        });
        break;
    }
  }

  debug(module: string, message: string, metadata?: Record<string, unknown>) {
    this.log('debug', module, message, metadata);
  }

  info(module: string, message: string, metadata?: Record<string, unknown>) {
    this.log('info', module, message, metadata);
  }

  warn(module: string, message: string, metadata?: Record<string, unknown>) {
    this.log('warn', module, message, metadata);
  }

  error(module: string, message: string, metadata?: Record<string, unknown>) {
    this.log('error', module, message, metadata);
  }
}

export const logger = new StructuredLogger();
