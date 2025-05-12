import { Test, TestingModule } from '@nestjs/testing';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { FilePin, IIpfsConfig, IpfsService } from '#storage';
import { IHttpCommonConfig } from '#config/http-common.config';
import { dummyCidV0, dummyCidV1, CID, KuboRPCClient, PinLsResult } from '__mocks__/kubo-rpc-client';
import { Readable } from 'stream';

const mockIpfsConfigProvider = GenerateMockConfigProvider<IIpfsConfig>('ipfs', {
  ipfsEndpoint: 'http://localhost:5001/api/v0',
  ipfsBasicAuthUser: '',
  ipfsBasicAuthSecret: '',
  ipfsGatewayUrl: 'http://localhost:8080/ipfs/[CID]',
});

const mockHttpCommonConfigProvider = GenerateMockConfigProvider<IHttpCommonConfig>('http-common', {
  httpResponseTimeoutMS: 3000,
});

async function* bufferGenerator(values: number[]): AsyncIterable<Uint8Array> {
  yield new Uint8Array(values);
}

async function* pinLsGenerator(pins: PinLsResult[]): AsyncIterable<PinLsResult> {
  // eslint-disable-next-line no-restricted-syntax
  for (const pin of pins) {
    yield pin;
  }
}

describe('IpfsService Tests', () => {
  let service: IpfsService;
  let ipfs: KuboRPCClient;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService, mockIpfsConfigProvider, mockHttpCommonConfigProvider],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
    ipfs = (service as unknown as any).ipfs;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPinned', () => {
    it('should return empty buffer if resource is not pinned', async () => {
      jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(false);
      await expect(service.getPinned(dummyCidV1)).resolves.toStrictEqual(Buffer.alloc(0));
    });

    it('should return file contents if pinned', async () => {
      const buf = Buffer.from([1, 2, 3]);
      const bufIter = bufferGenerator(Array.from(buf));

      jest.spyOn(service, 'existsInLocalGateway').mockResolvedValueOnce(true);
      jest.spyOn(ipfs, 'cat').mockReturnValueOnce(bufIter);

      await expect(service.getPinned(dummyCidV1)).resolves.toStrictEqual(buf);
    });
  });

  describe('contentLengthInLocalGateway', () => {
    it('should throw if CID does not exist', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 412,
      });

      await expect(service.contentLengthInLocalGateway(dummyCidV1)).rejects.toThrow(
        `Unable to access HEAD for ${dummyCidV1}`,
      );
    });

    it('should return content length if CID exists', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 200,
        headers: new Headers({ 'content-length': 1 }),
      });

      await expect(service.contentLengthInLocalGateway(dummyCidV0)).resolves.toStrictEqual(1);
    });
  });

  describe('existsInLocalGateway', () => {
    it('should return false if CID does not exist', async () => {
      jest.spyOn(service, 'contentLengthInLocalGateway').mockRejectedValueOnce(new Error());

      await expect(service.existsInLocalGateway(dummyCidV1)).resolves.toBe(false);
    });

    it('should return true if CID exists', async () => {
      jest.spyOn(service, 'contentLengthInLocalGateway').mockResolvedValueOnce(1);

      await expect(service.existsInLocalGateway(dummyCidV0)).resolves.toBe(true);
    });
  });

  describe('isPinned', () => {
    it('should throw for bad CID', async () => {
      await expect(service.isPinned('bad cid')).rejects.toThrow('Non-base32 character');
    });

    it('should return false if IPFS throws "not pinned"', async () => {
      jest.spyOn(ipfs.pin, 'ls').mockImplementationOnce(() => {
        throw new Error('not pinned');
      });

      await expect(service.isPinned(dummyCidV1)).resolves.toBe(false);
    });

    it('should throw if IPFS throws other error', async () => {
      jest.spyOn(ipfs.pin, 'ls').mockImplementationOnce(() => {
        throw new Error('some other error');
      });

      await expect(service.isPinned(dummyCidV1)).rejects.toThrow('some other error');
    });

    it('should return false if CID not in list of pins', async () => {
      const pins = [
        {
          cid: CID.parse('some-other-cid'),
        },
      ] as PinLsResult[];
      jest.spyOn(ipfs.pin, 'ls').mockReturnValueOnce(pinLsGenerator(pins));

      await expect(service.isPinned(dummyCidV1)).resolves.toBe(false);
    });

    it('should return true if CID is in list of pins', async () => {
      const pins = [
        {
          cid: CID.parse(dummyCidV0),
        },
      ] as PinLsResult[];
      jest.spyOn(ipfs.pin, 'ls').mockReturnValueOnce(pinLsGenerator(pins));

      await expect(service.isPinned(dummyCidV0)).resolves.toBe(true);
    });
  });

  describe('ipfsPin', () => {
    it('should throw for unknown MIME type', async () => {
      await expect(service.ipfsPin('application/unknown', Buffer.from([0]), false)).rejects.toThrow(
        /^unknown mimetype:/,
      );
    });

    it('should recognize Parquet file even though not in mimetype DB', async () => {
      const pinSpy = jest.spyOn(service as unknown as any, 'ipfsPinBuffer').mockResolvedValueOnce({} as FilePin);
      await expect(service.ipfsPin('application/vnd.apache.parquet', Buffer.from([0]), false)).resolves.toStrictEqual({
        hash: '',
      });
      expect(pinSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ipfsPinStream', () => {
    it('should pin a stream and return file details', async () => {
      const mockStream = new Readable();
      mockStream.push('test data');
      mockStream.push(null);

      jest.spyOn(ipfs, 'version').mockResolvedValueOnce('v0.0.1');

      jest.spyOn(ipfs, 'add').mockResolvedValueOnce({
        cid: CID.parse(dummyCidV0),
        path: 'random-file',
        size: 456,
      });

      const result = await service.ipfsPinStream(mockStream);
      expect(result).toEqual({
        cid: dummyCidV1,
        cidBytes: undefined,
        fileName: 'random-file',
        size: 456,
        hash: '',
      });
    });

    it('should throw if unable to connect to IPFS within timeout', async () => {
      jest.useFakeTimers();

      jest.spyOn(ipfs, 'version').mockImplementationOnce(
        ({ signal }) =>
          new Promise<string>((_resolve, reject) => {
            signal.on('abort', () => reject(new Error('Operation aborted due to timeout')));
          }),
      );

      const mockStream = new Readable();
      mockStream.push('test data');
      mockStream.push(null);

      const promise = service.ipfsPinStream(mockStream);

      jest.advanceTimersByTime(5000); // Simulate timeout expiration

      await expect(promise).rejects.toThrow(/Failed to connect to IPFS node within/);

      jest.useRealTimers();
    });
  });
});
