/**
 * Determines appropriate log levels based on environment variables
 * - Always includes 'error', 'warn', and 'log'
 * - Adds 'debug' when DEBUG env var is present
 * - Adds 'verbose' when VERBOSE_LOGGING is true or DEBUG=verbose
 */
export function getLogLevels(): string[] {
  return ['error', 'warn', 'info', 'debug', 'trace'];
}

export function getCurrentLogLevel(): string {
  let level: string = 'info';
  if (process.env?.LOG_LEVEL && process.env.LOG_LEVEL !== '') {
    level = process.env.LOG_LEVEL;
  } else if (process.env.NODE_ENV === 'test') {
    level = 'error';
  }
  return level;
}

export function getPinoTransport() {
  if (process.env.PRETTY === 'true') {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname,context,levelStr',
        messageFormat: `[{context}] {msg}`,
      },
    };
  }
  return undefined;
}

export function getPinoHttpOptions() {
  return {
    pinoHttp: {
      level: getCurrentLogLevel(),
      customProps: () => ({
        context: 'HTTP',
      }),
      formatters: {
        level: (label, number) => ({ level: number, levelStr: label }),
      },
      quietReqLogger: true, // set to 'false' to enable full HTTP req/resp logging
      redact: {
        paths: ['ip', '*.ip', 'ipAddress'],
      },
      transport: getPinoTransport(),
    },
  };
}

// get Pino options when running in a bootstrap or otherwise outside of NestJS app.
export function getBasicPinoOptions(name: string) {
  // use plain pino directly outside of the app.
  return {
    name,
    level: getCurrentLogLevel(),
    redact: {
      paths: ['ip', '*.ip', 'ipAddress'],
    },
    transport: getPinoTransport(),
  };
}
