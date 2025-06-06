export const mockPinoLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

export function createPinoLoggerProvider(context: string) {
  return {
    provide: context,
    useValue: mockPinoLogger,
  };
}
