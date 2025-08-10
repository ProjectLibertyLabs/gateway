import { isColorSupported } from 'pino-pretty';

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
  if (/^true|compact/.test(process.env?.PRETTY)) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: isColorSupported,
        colorizeObjects: isColorSupported,
        translateTime: 'SYS:standard',
        ignore: 'hostname,context,levelStr',
        messageFormat: `[{context}] {msg}`,
        singleLine: process.env?.PRETTY === 'compact',
      },
    };
  }
  return undefined;
}

export function getPinoHttpOptions() {
  return {
    pinoHttp: {
      enabled: process.env.NODE_ENV !== 'test',
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
