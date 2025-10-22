import { Test, TestingModule } from '@nestjs/testing';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { IIpfsConfig, IpfsClusterService, IpfsService } from '#storage';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import ipfsConfig from '#storage/ipfs/ipfs.config';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

/**
 * Shared test utilities for IPFS Cluster tests
 */

export const createMockClusterConfig = (overrides: Partial<IIpfsConfig> = {}) =>
  GenerateMockConfigProvider<IIpfsConfig>(ipfsConfig.KEY, {
    mode: 'cluster',
    ipfsEndpoint: 'http://localhost:9094',
    ipfsBasicAuthUser: 'user',
    ipfsBasicAuthSecret: 'secret',
    ipfsGatewayUrl: 'http://localhost:8080/ipfs/[CID]',
    clusterReplicationMin: 0, // 0 means don't use (cluster default)
    clusterReplicationMax: 0, // 0 means don't use (cluster default)
    clusterPinExpiration: '', // empty means no expiration
    requestTimeoutMs: 5000,
    retryAttempts: 1, // Fewer retries for faster tests
    enableHealthChecks: true,
    ...overrides,
  });

export const createMockHttpConfig = (overrides: Partial<IHttpCommonConfig> = {}) =>
  GenerateMockConfigProvider<IHttpCommonConfig>(httpCommonConfig.KEY, {
    httpResponseTimeoutMS: 5000,
    ...overrides,
  });

/**
 * Create test module for IpfsClusterService unit tests
 */
export const createClusterServiceTestModule = async (configOverrides: Partial<IIpfsConfig> = {}) => {
  return Test.createTestingModule({
    imports: [LoggerModule.forRoot(getPinoHttpOptions())],
    providers: [IpfsClusterService, createMockClusterConfig(configOverrides), createMockHttpConfig()],
  }).compile();
};

/**
 * Create test module for integration testing between IpfsService and IpfsClusterService
 */
export const createIntegrationTestModule = async (configOverrides: Partial<IIpfsConfig> = {}) => {
  return Test.createTestingModule({
    imports: [LoggerModule.forRoot(getPinoHttpOptions())],
    providers: [IpfsService, IpfsClusterService, createMockClusterConfig(configOverrides), createMockHttpConfig()],
  }).compile();
};

/**
 * Mock fetch response factory
 */
export const createMockFetchResponse = (
  data: any,
  options: { status?: number; headers?: Record<string, string> } = {},
) => {
  const { status = 200, headers = {} } = options;
  const ok = status >= 200 && status < 300;

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: {
      get: (key: string) => headers[key] || null,
      entries: () => Object.entries(headers),
    },
    json: () => Promise.resolve(data),
    arrayBuffer: () => {
      const content = typeof data === 'string' ? data : JSON.stringify(data);
      // Return a simple mock that behaves like ArrayBuffer for the service
      return Promise.resolve(Buffer.from(content));
    },
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  };
};

/**
 * Setup mock fetch with automatic cleanup
 */
export const setupMockFetch = () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  global.fetch = mockFetch;

  // Return cleanup function
  const cleanup = () => {
    global.fetch = originalFetch;
  };

  return { mockFetch, cleanup };
};

/**
 * Common test data factories
 */
export const TestData = {
  cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  smallCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',

  fileContent: Buffer.from('Hello IPFS Cluster!'),
  filename: 'test-file.txt',

  clusterVersion: { version: '1.1.4', commit: 'abc123' },

  addFileResponse: {
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    name: 'test-file.txt',
    size: 19,
    allocations: [],
  },

  filePin: {
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    cidBytes: new Uint8Array([1, 2, 3, 4]),
    fileName: 'test-file.txt',
    size: 19,
    hash: 'test-hash',
  },

  authHeaders: {
    Authorization: 'Basic dXNlcjpzZWNyZXQ=', // base64 of 'user:secret'
  },
};

/**
 * Common test assertions
 */
export const TestAssertions = {
  expectClusterApiCall: (
    mockFetch: jest.Mock,
    endpoint: string,
    method = 'GET',
    additionalChecks?: (call: any) => void,
  ) => {
    // More flexible URL matching - just check that the endpoint is contained
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`http://localhost:9094${endpoint}`),
      expect.objectContaining({
        method,
        headers: expect.objectContaining(TestData.authHeaders),
      }),
    );

    if (additionalChecks && mockFetch.mock.calls.length > 0) {
      additionalChecks(mockFetch.mock.calls[0]);
    }
  },

  expectServiceDelegation: (spy: jest.SpyInstance, methodArgs: any[]) => {
    expect(spy).toHaveBeenCalledWith(...methodArgs);
  },
};

/**
 * Error test helpers
 */
export const ErrorHelpers = {
  createHttpError: (status: number, message = 'Error') =>
    createMockFetchResponse(message, { status, headers: { 'content-type': 'text/plain' } }),

  expectHttpError: async (promise: Promise<any>, expectedStatus: number) => {
    await expect(promise).rejects.toThrow(`HTTP error! status: ${expectedStatus}`);
  },
};
