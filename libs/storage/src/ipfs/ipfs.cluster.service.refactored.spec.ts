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
  let mockFetch: jest.Mock;
  let cleanup: () => void;

  beforeAll(async () => {
    const module: TestingModule = await createClusterServiceTestModule();
    service = module.get<IpfsClusterService>(IpfsClusterService);
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
        mockFetch.mockResolvedValueOnce(createMockFetchResponse(TestData.clusterVersion));

        const result = await service.getVersion();

        TestAssertions.expectClusterApiCall(mockFetch, '/version');
        expect(result).toEqual(TestData.clusterVersion);
      });

      it('should handle version fetch errors', async () => {
        mockFetch.mockResolvedValueOnce(ErrorHelpers.createHttpError(500, 'Internal Server Error'));

        await ErrorHelpers.expectHttpError(service.getVersion(), 500);
      });
    });

    describe('addFile', () => {
      it('should add file to cluster with correct parameters', async () => {
        mockFetch.mockResolvedValueOnce(createMockFetchResponse(TestData.addFileResponse));

        const result = await service.addFile(TestData.fileContent, TestData.filename);

        TestAssertions.expectClusterApiCall(mockFetch, '/add?pin=true&stream-channels=false', 'POST', (call) => {
          expect(call[1].headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
        });
        expect(result).toEqual(TestData.addFileResponse);
      });

      it('should handle add file errors', async () => {
        mockFetch.mockResolvedValueOnce(ErrorHelpers.createHttpError(400, 'Bad Request'));

        await ErrorHelpers.expectHttpError(service.addFile(TestData.fileContent, TestData.filename), 400);
      });
    });

    describe('getPinned', () => {
      it('should fetch pinned content from cluster', async () => {
        mockFetch.mockResolvedValueOnce(createMockFetchResponse(TestData.fileContent.toString()));

        const result = await service.getPinned(TestData.cid);

        TestAssertions.expectClusterApiCall(mockFetch, `/api/v0/cat?arg=${TestData.cid}`, 'POST');
        expect(result).toEqual(TestData.fileContent);
      });

      it('should handle getPinned errors', async () => {
        mockFetch.mockResolvedValueOnce(ErrorHelpers.createHttpError(404, 'Not Found'));

        await ErrorHelpers.expectHttpError(service.getPinned('invalid-cid'), 404);
      });
    });

    describe('isPinned', () => {
      it('should return true if CID is pinned', async () => {
        mockFetch.mockResolvedValueOnce(createMockFetchResponse({ status: 'pinned' }));

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
        mockFetch.mockResolvedValueOnce(createMockFetchResponse({ status: 'unpinned' }));

        const result = await service.isPinned(TestData.cid);

        expect(result).toBe(false);
      });
    });
  });

  describe('Content Operations', () => {
    describe('pinBuffer', () => {
      it('should pin buffer to cluster and return FilePin', async () => {
        mockFetch.mockResolvedValueOnce(createMockFetchResponse(TestData.addFileResponse));

        const result = await service.pinBuffer(TestData.filename, TestData.fileContent);

        TestAssertions.expectClusterApiCall(mockFetch, '/add?pin=true&stream-channels=false', 'POST');
        expect(result).toEqual(
          expect.objectContaining({
            cid: TestData.addFileResponse.cid['/'],
            fileName: TestData.filename,
            size: parseInt(TestData.addFileResponse.size, 10),
          }),
        );
      });
    });

    describe('pinStream', () => {
      it('should pin stream to cluster', async () => {
        const testStream = new Readable();
        testStream.push(TestData.fileContent);
        testStream.push(null);

        mockFetch.mockResolvedValueOnce(createMockFetchResponse(TestData.addFileResponse));

        const result = await service.pinStream(testStream);

        expect(mockFetch).toHaveBeenCalled();
        expect(result).toEqual(
          expect.objectContaining({
            cid: TestData.addFileResponse.cid['/'],
          }),
        );
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

  beforeAll(async () => {
    const module: TestingModule = await createIntegrationTestModule();
    service = module.get<IpfsService>(IpfsService);
    clusterService = module.get<IpfsClusterService>(IpfsClusterService);
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
});
