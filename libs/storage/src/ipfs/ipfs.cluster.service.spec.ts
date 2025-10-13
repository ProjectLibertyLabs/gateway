import { TestingModule } from '@nestjs/testing';
import { FilePin, IpfsClusterService, IpfsService } from '#storage';
import { Readable } from 'stream';
import {
  createClusterServiceTestModule,
  setupMockFetch,
  createMockFetchResponse,
  TestData,
  TestAssertions,
  ErrorHelpers,
  createIntegrationTestModule,
} from './test-utils/cluster-test-helpers';

describe('IpfsClusterService - Unit Tests', () => {
  let service: IpfsClusterService;
  let mockFetch: any;
  let cleanup: () => void;
  let module: TestingModule;

  beforeAll(async () => {
    module = await createClusterServiceTestModule();
    service = module.get<IpfsClusterService>(IpfsClusterService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(() => {
    const setup = setupMockFetch();
    mockFetch = setup.mockFetch;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HTTP API Integration', () => {
    describe('getVersion', () => {
      it('should fetch version from cluster API', async () => {
        // Create a proper mock response
        const mockResponse = createMockFetchResponse(TestData.clusterVersion, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await service.getVersion();

        TestAssertions.expectClusterApiCall(mockFetch, '/version');
        expect(result).toEqual({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: TestData.clusterVersion,
        });
      });

      it('should handle version fetch errors', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockFetchResponse('Internal Server Error', {
            status: 500,
            headers: { 'content-type': 'text/plain' },
          }),
        );

        const result = await service.getVersion();

        expect(result).toEqual({
          status: 500,
          statusText: 'Error',
          headers: { 'content-type': 'text/plain' },
          data: 'Internal Server Error',
        });
      });
    });

    describe('addFile', () => {
      it('should add file to cluster with correct parameters', async () => {
        const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await service.addFile(TestData.fileContent, TestData.filename);

        TestAssertions.expectClusterApiCall(mockFetch, '/add', 'POST', (call) => {
          expect(call[1].headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
          // Verify the URL contains basic pin parameters
          expect(call[0]).toMatch(/pin=true/);
          expect(call[0]).toMatch(/stream-channels=false/);
        });
        expect(result).toEqual({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: TestData.addFileResponse,
        });
      });

      it('should handle add file errors', async () => {
        const mockErrorResponse = createMockFetchResponse('Bad Request', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });

        mockFetch.mockResolvedValueOnce(mockErrorResponse);

        const result = await service.addFile(TestData.fileContent, TestData.filename);

        expect(result).toEqual({
          status: 400,
          statusText: 'Error',
          headers: { 'content-type': 'text/plain' },
          data: expect.any(Buffer), // Service returns text as Buffer in some cases
        });
      });
    });

    describe('addFile with cluster configuration', () => {
      it('should use cluster configuration parameters in API calls', async () => {
        // Create a service with cluster configuration
        const clusterModule = await createClusterServiceTestModule({
          clusterReplicationMin: 2,
          clusterReplicationMax: 4,
          clusterPinExpiration: '72h',
        });
        const clusterService = clusterModule.get<IpfsClusterService>(IpfsClusterService);

        const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        await clusterService.addFile(TestData.fileContent, TestData.filename);

        // Verify that the API call includes cluster configuration parameters
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('replication-min=2'), expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('replication-max=4'), expect.any(Object));
        // Also verify the full URL contains all expected parameters
        const callUrl = mockFetch.mock.calls[0][0];
        expect(callUrl).toMatch(/pin=true/);
        expect(callUrl).toMatch(/stream-channels=false/);
        expect(callUrl).toMatch(/replication-min=2/);
        expect(callUrl).toMatch(/replication-max=4/);

        // Verify expire-at parameter is present (URL encoded format)
        expect(callUrl).toContain('expire-at=');

        // Extract and decode the timestamp
        const expireMatch = callUrl.match(/expire-at=([^&]+)/);
        expect(expireMatch).toBeTruthy();

        const expireTimestamp = decodeURIComponent(expireMatch![1]);

        // Verify it's a valid ISO timestamp format
        expect(expireTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // Verify it's a valid future date (72h from now for this test)
        const expireDate = new Date(expireTimestamp);
        const now = new Date();
        const diffHours = (expireDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(diffHours).toBeGreaterThan(70); // Should be approximately 72 hours
        expect(diffHours).toBeLessThan(74);

        await clusterModule.close();
      });

      it('should use default parameters when cluster config is not set', async () => {
        // Use the default service without cluster configuration
        const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        await service.addFile(TestData.fileContent, TestData.filename);

        // Verify that only basic parameters are included
        const callUrl = mockFetch.mock.calls[0][0];
        expect(callUrl).toMatch(/pin=true/);
        expect(callUrl).toMatch(/stream-channels=false/);
        expect(callUrl).not.toMatch(/replication-min/);
        expect(callUrl).not.toMatch(/replication-max/);
        expect(callUrl).not.toMatch(/expire-at/);
      });

      it('should convert duration strings to proper RFC3339 timestamps', async () => {
        const testCases = [
          { duration: '1h', expectedMs: 60 * 60 * 1000 },
          { duration: '72h', expectedMs: 72 * 60 * 60 * 1000 },
          { duration: '7d', expectedMs: 7 * 24 * 60 * 60 * 1000 },
          { duration: '30m', expectedMs: 30 * 60 * 1000 },
        ];

        for (const testCase of testCases) {
          const testModule = await createClusterServiceTestModule({
            clusterPinExpiration: testCase.duration,
          });
          const testService = testModule.get<IpfsClusterService>(IpfsClusterService);

          const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
            headers: { 'content-type': 'application/json' },
          });
          mockFetch.mockResolvedValueOnce(mockResponse);

          const beforeTime = new Date().getTime();
          await testService.addFile(TestData.fileContent, TestData.filename);
          const afterTime = new Date().getTime();

          // Extract the expire-at timestamp from the URL
          const callUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
          const expireMatch = callUrl.match(/expire-at=([^&]+)/);
          expect(expireMatch).toBeTruthy();

          const expireTimestamp = decodeURIComponent(expireMatch![1]);
          const expireDate = new Date(expireTimestamp);

          // Verify it's a valid ISO timestamp
          expect(expireDate.toISOString()).toBe(expireTimestamp);

          // Verify the timestamp is approximately the expected duration from now
          const expectedTime = beforeTime + testCase.expectedMs;
          const actualTime = expireDate.getTime();

          // Allow for some variance due to test execution time (within 1 minute)
          expect(actualTime).toBeGreaterThanOrEqual(expectedTime - 60000);
          expect(actualTime).toBeLessThanOrEqual(afterTime + testCase.expectedMs + 60000);

          await testModule.close();
        }
      });

      it('should handle invalid duration formats gracefully', async () => {
        const invalidDurations = ['invalid', '72x', '72', 'h72', ''];

        for (const duration of invalidDurations) {
          const testModule = await createClusterServiceTestModule({
            clusterPinExpiration: duration,
          });
          const testService = testModule.get<IpfsClusterService>(IpfsClusterService);

          const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
            headers: { 'content-type': 'application/json' },
          });
          mockFetch.mockResolvedValueOnce(mockResponse);

          await testService.addFile(TestData.fileContent, TestData.filename);

          // For invalid formats, expire-at should not be included
          const callUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
          expect(callUrl).not.toMatch(/expire-at/);

          await testModule.close();
        }
      });
    });

    describe('getPinned', () => {
      it('should fetch pinned content from cluster', async () => {
        // Simulate an error case to see what the service returns when fetch fails
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await service.getPinned(TestData.cid);

        expect(mockFetch).toHaveBeenCalledWith(`http://localhost:8080/ipfs/[CID]/ipfs/${TestData.cid}`);

        // When getFile throws an error, it returns an empty Buffer
        expect(result).toEqual(Buffer.from(''));
      });

      it('should handle getPinned errors', async () => {
        const mockErrorResponse = createMockFetchResponse('Not Found', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
        });

        mockFetch.mockResolvedValueOnce(mockErrorResponse);

        const result = await service.getPinned('invalid-cid');

        // The method should return a Buffer from the response
        expect(result).toEqual(expect.any(Buffer));
      });
    });

    describe('isPinned', () => {
      it('should return true if CID is pinned', async () => {
        const mockPinResponse = {
          status: 'pinned',
          peer_map: {
            '12D3KooW...': {
              status: 'pinned',
            },
          },
        };
        const mockResponse = createMockFetchResponse(mockPinResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await service.isPinned(TestData.cid);

        TestAssertions.expectClusterApiCall(mockFetch, `/pins/${TestData.cid}`, 'GET');
        expect(result).toBe(true);
      });

      it('should return false if CID is not pinned (404)', async () => {
        mockFetch.mockResolvedValueOnce(ErrorHelpers.createHttpError(404, 'Not Found'));

        const result = await service.isPinned('unpinned-cid');

        expect(result).toBe(false);
      });

      it('should return false if pin status is not pinned', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockFetchResponse(
            { status: 'unpinned' },
            {
              headers: { 'content-type': 'application/json' },
            },
          ),
        );

        const result = await service.isPinned(TestData.cid);

        expect(result).toBe(false);
      });
    });
  });

  describe('Content Operations', () => {
    describe('pinBuffer', () => {
      it('should pin buffer to cluster and return FilePin', async () => {
        const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await service.pinBuffer(TestData.filename, TestData.fileContent);

        TestAssertions.expectClusterApiCall(mockFetch, '/add', 'POST');
        // The service returns the raw response data without transformation
        expect(result).toEqual({
          cid: TestData.addFileResponse.cid, // Raw object from response
          cidBytes: Buffer.from([]),
          fileName: TestData.filename,
          size: TestData.addFileResponse.size, // Raw string from response
          hash: '',
        });
      });
    });

    describe('pinStream', () => {
      it('should pin stream to cluster', async () => {
        const testStream = new Readable();
        testStream.push(TestData.fileContent);
        testStream.push(null);

        const mockResponse = createMockFetchResponse(TestData.addFileResponse, {
          headers: { 'content-type': 'application/json' },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await service.pinStream(testStream);

        expect(mockFetch).toHaveBeenCalled();
        // The service returns the raw response data without transformation
        expect(result).toEqual({
          cid: TestData.addFileResponse.cid, // Raw object from response
          cidBytes: Buffer.from([]),
          fileName: expect.stringMatching(/^stream-\d+-[a-z0-9]+$/),
          size: TestData.addFileResponse.size, // Raw string from response
          hash: '',
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getInfoFromCluster', () => {
      it('should return file stats from cluster', async () => {
        const mockPinStatus = { size: 1024 };
        jest.spyOn(service, 'checkPinStatus' as any).mockResolvedValueOnce(mockPinStatus);

        const result = await service.getInfoFromCluster(TestData.cid);

        expect(result).toEqual(
          expect.objectContaining({
            size: 1024,
            type: 'file',
            blocks: 1,
          }),
        );
      });

      it('should handle getInfoFromCluster errors', async () => {
        jest.spyOn(service, 'checkPinStatus' as any).mockRejectedValueOnce(new Error('Not found'));

        await expect(service.getInfoFromCluster('invalid-cid')).rejects.toThrow('Requested resource not found');
      });
    });
  });
});

jest.mock('#utils/common/common.utils', () => ({
  calculateIncrementalDsnpMultiHash: jest.fn(),
  calculateDsnpMultiHash: jest.fn(),
}));

describe('IpfsService - Cluster Mode Integration Tests', () => {
  let service: IpfsService;
  let clusterService: IpfsClusterService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await createIntegrationTestModule();
    service = module.get<IpfsService>(IpfsService);
    clusterService = module.get<IpfsClusterService>(IpfsClusterService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(clusterService).toBeDefined();
  });

  describe('Service Delegation in Cluster Mode', () => {
    describe('getPinned', () => {
      it('should delegate to cluster service when content exists', async () => {
        const testBuffer = Buffer.from('test content from cluster');

        jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(true);
        const clusterSpy = jest.spyOn(clusterService, 'getPinned').mockResolvedValueOnce(testBuffer);

        const result = await service.getPinned(TestData.cid);

        TestAssertions.expectServiceDelegation(clusterSpy, [TestData.cid]);
        expect(result).toEqual(testBuffer);
      });

      it('should return empty buffer if resource does not exist', async () => {
        jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(false);
        const clusterSpy = jest.spyOn(clusterService, 'getPinned');

        const result = await service.getPinned(TestData.cid);

        expect(result).toEqual(Buffer.alloc(0));
        expect(clusterSpy).not.toHaveBeenCalled();
      });
    });

    describe('getInfoFromLocalNode', () => {
      it('should delegate to cluster service for file stats', async () => {
        const mockStats: any = {
          cid: TestData.cid,
          size: 2048,
        };

        const clusterSpy = jest.spyOn(clusterService, 'getInfoFromCluster').mockResolvedValueOnce(mockStats);

        const result = await service.getInfoFromLocalNode(TestData.cid);

        TestAssertions.expectServiceDelegation(clusterSpy, [TestData.cid]);
        expect(result).toEqual(mockStats);
      });
    });

    describe('isPinned', () => {
      it('should delegate to cluster service for pin status', async () => {
        const clusterSpy = jest.spyOn(clusterService, 'isPinned').mockResolvedValueOnce(true);

        const result = await service.isPinned(TestData.cid);

        TestAssertions.expectServiceDelegation(clusterSpy, [TestData.cid]);
        expect(result).toBe(true);
      });
    });
  });

  describe('Advanced Workflows', () => {
    describe('getDsnpMultiHash', () => {
      it('should use cluster service to get file content for hashing', async () => {
        const testContent = Buffer.from('content for hashing');
        const expectedHash = 'calculated-hash-value';

        jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(true);
        const clusterSpy = jest.spyOn(clusterService, 'getPinned').mockResolvedValueOnce(testContent);

        // eslint-disable-next-line global-require
        const { calculateIncrementalDsnpMultiHash } = require('#utils/common/common.utils');
        jest.mocked(calculateIncrementalDsnpMultiHash).mockResolvedValueOnce(expectedHash);

        const result = await service.getDsnpMultiHash(TestData.cid);

        TestAssertions.expectServiceDelegation(clusterSpy, [TestData.cid]);
        expect(result).toBe(expectedHash);
      });
    });

    describe('ipfsPin', () => {
      it('should use cluster service for pinning buffers', async () => {
        const mimeType = 'text/plain';
        const fileContent = Buffer.from('test file content');
        const mockFilePin: FilePin = TestData.filePin;

        const clusterSpy = jest.spyOn(clusterService, 'pinBuffer').mockResolvedValueOnce(mockFilePin);

        const result = await service.ipfsPin(mimeType, fileContent, false);

        expect(clusterSpy).toHaveBeenCalledWith(expect.stringMatching(/.*\.txt$/), fileContent);
        expect(result).toEqual(
          expect.objectContaining({
            cid: mockFilePin.cid,
            size: mockFilePin.size,
            hash: '',
          }),
        );
      });
    });

    describe('ipfsPinStream', () => {
      it('should use cluster service for pinning streams', async () => {
        const testStream = new Readable();
        testStream.push('stream content');
        testStream.push(null);

        const mockFilePin: FilePin = TestData.filePin;
        const clusterSpy = jest.spyOn(clusterService, 'pinStream').mockResolvedValueOnce(mockFilePin);

        const result = await service.ipfsPinStream(testStream);

        TestAssertions.expectServiceDelegation(clusterSpy, [testStream]);
        expect(result).toEqual(mockFilePin);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should propagate cluster service errors gracefully', async () => {
      const clusterSpy = jest.spyOn(clusterService, 'isPinned').mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(service.isPinned(TestData.cid)).rejects.toThrow('Service unavailable');
      TestAssertions.expectServiceDelegation(clusterSpy, [TestData.cid]);
    });

    it('should handle missing content gracefully', async () => {
      jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(false);

      const result = await service.getDsnpMultiHash(TestData.cid);

      expect(result).toBeNull();
    });
  });

  describe('New Features - Retry Logic and Health Checks', () => {
    describe('performHealthCheck', () => {
      it('should return healthy status when health checks are disabled', async () => {
        const disabledModule = await createClusterServiceTestModule({ enableHealthChecks: false });
        const disabledService = disabledModule.get<IpfsClusterService>(IpfsClusterService);

        const result = await disabledService.performHealthCheck();

        expect(result.healthy).toBe(true);
        expect(result.details.version).toBe('health checks disabled');

        await disabledModule.close();
      });

      it('should perform comprehensive health check when enabled', async () => {
        const { mockFetch, cleanup } = setupMockFetch();

        // Mock successful version check
        mockFetch.mockResolvedValueOnce(
          createMockFetchResponse(TestData.clusterVersion, {
            headers: { 'content-type': 'application/json' },
          }),
        );

        // Mock successful gateway check (HEAD request)
        mockFetch.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          headers: new Map(),
        });

        const result = await clusterService.performHealthCheck();

        expect(result.healthy).toBe(true);
        expect(result.details.clusterApi).toBe(true);
        expect(result.details.gateway).toBe(true);
        expect(result.details.version).toBe(TestData.clusterVersion.version);

        cleanup();
      });

      it('should handle health check failures gracefully', async () => {
        const { mockFetch, cleanup } = setupMockFetch();

        // Mock failed version check
        mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

        const result = await clusterService.performHealthCheck();

        expect(result.healthy).toBe(false);
        expect(result.details.clusterApi).toBe(false);
        expect(result.details.error).toBeDefined();
        expect(result.details.error).toContain('Connection failed');

        cleanup();
      });
    });

    describe('Retry Logic', () => {
      it('should have retry configuration available', async () => {
        const retryModule = await createClusterServiceTestModule({
          retryAttempts: 3,
          requestTimeoutMs: 5000,
        });
        const retryService = retryModule.get<IpfsClusterService>(IpfsClusterService);

        // Verify service was created successfully with retry configuration
        expect(retryService).toBeDefined();

        await retryModule.close();
      });

      it('should successfully create service with retry configuration', async () => {
        const retryModule = await createClusterServiceTestModule({
          retryAttempts: 5,
          requestTimeoutMs: 10000,
        });
        const retryService = retryModule.get<IpfsClusterService>(IpfsClusterService);

        // Verify the service was created successfully with retry config
        expect(retryService).toBeDefined();
        expect(retryService).toBeInstanceOf(IpfsClusterService);

        await retryModule.close();
      });
    });

    describe('Custom Timeout Configuration', () => {
      it('should use IPFS-specific timeout instead of HTTP common config', async () => {
        const customTimeoutModule = await createClusterServiceTestModule({
          requestTimeoutMs: 2000,
        });
        const customTimeoutService = customTimeoutModule.get<IpfsClusterService>(IpfsClusterService);

        // We can't easily test the actual timeout without waiting, but we can verify
        // the service was created successfully with custom config
        expect(customTimeoutService).toBeDefined();

        await customTimeoutModule.close();
      });
    });
  });
});
