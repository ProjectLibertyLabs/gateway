import { RpcCall } from './decorators/rpc-call.decorator';

// Helper classes to test the RpcCall decorator

export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

export class TestService {
  logger = { error: jest.fn() };

  @RpcCall('rpc.test.method')
  async testMethod() {
    return { data: 'test-data' };
  }
}

export class TestServiceWithError {
  logger = { error: jest.fn() };

  @RpcCall('rpc.test.method')
  async testMethod() {
    throw new Error('Original error message');
  }
}

export class TestServiceWithArgs {
  logger = { error: jest.fn() };

  @RpcCall('rpc.chain.getBlockHash')
  async getBlockHash(blockNumber: number, includeTransactions = false) {
    throw new Error('Block not found');
  }
}

export class TestServiceWithComplexArgs {
  logger = { error: jest.fn() };

  @RpcCall('rpc.msa.getKeysByMsaId')
  async getKeysByMsa(msaId: string, includeDelegations = true, limit = 100) {
    throw new Error('MSA not found');
  }
}

export class TestServiceWithCustomError {
  logger = { error: jest.fn() };

  @RpcCall('rpc.test.method')
  async testMethod() {
    throw new CustomError('Custom error');
  }
}

export class TestServiceWithNonError {
  logger = { error: jest.fn() };

  @RpcCall('rpc.test.method')
  async testMethod() {
    // Fix no-throw-literal by creating a proper Error object
    const error = new Error('Server error');
    (error as any).code = 500;
    throw error;
  }
}

export class TestServiceWithoutLogger {
  @RpcCall('rpc.test.method')
  async testMethod() {
    throw new Error('Test error');
  }
}
