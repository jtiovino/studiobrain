/**
 * Production-safe logging utility
 * In production, logs are reduced to avoid console spam
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface Logger {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

function shouldLog(level: LogLevel): boolean {
  if (isProduction) {
    // In production, only log errors and warnings
    return level === 'error' || level === 'warn';
  }
  // In development, log everything
  return true;
}

function formatMessage(level: LogLevel, message: string): string {
  const prefix = isDevelopment ? `[${level.toUpperCase()}]` : '';
  return `${prefix} ${message}`;
}

export const logger: Logger = {
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args);
    }
  },
};

// Export for backward compatibility with existing console.log usage
export const log = {
  ...logger,
  // Legacy methods for easier migration
  log: logger.info,
};

export default logger;
