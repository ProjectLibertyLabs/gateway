// Use 'require' instead of 'import' here to get around a bug in the 'pino-pretty' package
const { isColorSupported } = require('pino-pretty');

export function getCurrentLogLevel(): string {
  let level: string = 'info';
  if (process.env?.LOG_LEVEL && process.env.LOG_LEVEL !== '') {
    level = process.env.LOG_LEVEL;
  } else if (process.env.NODE_ENV === 'test') {
    level = 'error';
  }
  return level;
}

function getPrettyOptions() {
  return {
    colorize: isColorSupported,
    colorizeObjects: isColorSupported,
    translateTime: 'SYS:standard',
    ignore: 'hostname,context,levelStr',
    messageFormat: `[{context}] {msg}`,
    singleLine: process.env?.PRETTY === 'compact',
  }
}

export function getPinoTransport() {
  if (/^true|compact/.test(process.env?.PRETTY) && process.env.NODE_ENV !== 'test') {
    return {
      target: 'pino-pretty',
      options: getPrettyOptions(),
    };
  }
  return undefined;
}

const customLogLevel = (req, res, err) => {
  if (req.url === '/metrics' && res.statusCode < 300) {
    return 'silent';
  }
  if (res.statusCode >= 400 && res.statusCode < 500) {
    return 'warn';
  } else if (res.statusCode >= 500 || err) {
    return 'error';
  } else if (res.statusCode >= 300 && res.statusCode < 400) {
    return 'silent';
  }
  return 'info';
};

function getLogsEnabled(): boolean {
  return process.env.NODE_ENV !== 'test' || process.env.ENABLE_LOGS_IN_TESTS === 'true';
}

export function getPinoHttpOptions() {
  return {
    pinoHttp: {
      enabled: getLogsEnabled(),
      customLogLevel,
      level: getCurrentLogLevel(),
      customProps: () => ({
        context: 'HTTP',
      }),
      formatters: {
        level: (label, number) => ({ level: number, levelStr: label }),
      },
      quietReqLogger: process.env.VERBOSE_HTTP_LOGS !== 'true', // set env var to enable full HTTP req/resp logging
      redact: {
        paths: ['ip', '*.ip', 'ipAddress'],
      },
      transport: getPinoTransport(),
      stream: process.env.NODE_ENV === 'test' ? require('pino-pretty')({ ...getPrettyOptions(), sync: true }) : undefined,
    },
  };
}
