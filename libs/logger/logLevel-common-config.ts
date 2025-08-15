import { LogLevel } from '@nestjs/common';

/**
 * Determines appropriate log levels based on environment variables
 * - Always includes 'error', 'warn', and 'log'
 * - Adds 'debug' when DEBUG env var is present
 * - Adds 'verbose' when VERBOSE_LOGGING is true or DEBUG=verbose
 */
export function getLogLevels(): LogLevel[] {
  const logLevels: LogLevel[] = ['error', 'warn', 'log'];

  // Enable debug logging if DEBUG is set
  if (process.env.DEBUG) {
    logLevels.push('debug');
  }

  // Add verbose logging if specifically requested
  if (process.env.VERBOSE_LOGGING || process.env.DEBUG === 'verbose') {
    logLevels.push('verbose');
  }

  return logLevels;
}
