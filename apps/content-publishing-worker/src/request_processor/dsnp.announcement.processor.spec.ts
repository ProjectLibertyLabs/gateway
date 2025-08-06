import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import { ModifiableAnnouncementType } from '#types/dtos/content-publishing';
import { IRequestJob } from '#types/interfaces/content-publishing';
import { AnnouncementTypeName, TagTypeEnum } from '#types/enums';
import { IIpfsConfig, IpfsService } from '#storage';
import ipfsConfig from '#storage/ipfs/ipfs.config';
import { GenerateMockConfigProvider, GenerateMockProvider, mockRedisProvider } from '#testlib';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

const mockQueue = {
  add: jest.fn(),
};

// Mock config values
const mockIpfsConfigProvider = GenerateMockConfigProvider<IIpfsConfig>(ipfsConfig.KEY, {
  ipfsBasicAuthSecret: undefined,
  ipfsBasicAuthUser: undefined,
  ipfsEndpoint: 'http://ipfs.io',
  ipfsGatewayUrl: 'http://ipfs.io/ipfs/[CID]',
});

// Mock the IpfsService class
const mockIpfsServiceProvider = GenerateMockProvider<IpfsService>(IpfsService, {
  getPinned: jest.fn(),
  ipfsPin: jest.fn(),
});

describe('DsnpAnnouncementProcessor', () => {
  let dsnpAnnouncementProcessor: DsnpAnnouncementProcessor;
  let module: TestingModule;
  let ipfsService: IpfsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(getPinoHttpOptions())],
      providers: [
        mockIpfsConfigProvider,
        mockRedisProvider(),
        mockIpfsServiceProvider,
        GenerateMockProvider<Queue>(Queue, mockQueue),
        GenerateMockProvider<Queue>('BullQueue_assetQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_broadcastQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_replyQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_reactionQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_updateQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_profileQueue', mockQueue),
        GenerateMockProvider<Queue>('BullQueue_tombstoneQueue', mockQueue),
        DsnpAnnouncementProcessor,
      ],
    }).compile();

    dsnpAnnouncementProcessor = module.get<DsnpAnnouncementProcessor>(DsnpAnnouncementProcessor);
    ipfsService = module.get(IpfsService);
  });

  it('should be defined', () => {
    expect(dsnpAnnouncementProcessor).toBeDefined();
  });

  it('should collect and queue a broadcast announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', hash: 'mockHash', size: 123 } as unknown as any);

    const data: IRequestJob = {
      id: '1',
      announcementType: AnnouncementTypeName.BROADCAST,
      msaId: 'dsnp://123',
      dependencyAttempt: 0,
      content: {
        content: {
          content: 'mockContent',
          published: '2021-01-01T00:00:00.000Z',
        },
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a reply announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest.spyOn(ipfsService, 'ipfsPin').mockResolvedValueOnce({
      cid: 'mockCid',
      hash: 'mockHash',
      size: 123,
    } as unknown as any);

    const data: IRequestJob = {
      id: '2',
      announcementType: AnnouncementTypeName.REPLY,
      msaId: 'dsnp://456',
      dependencyAttempt: 0,
      content: {
        content: {
          content: 'mockReplyContent',
          published: '2021-01-01T00:00:00.000Z',
        },
        inReplyTo: 'dsnp://123/reply/1',
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a reaction announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', hash: 'mockHash', size: 123 } as any);

    const data: IRequestJob = {
      id: '3',
      announcementType: AnnouncementTypeName.REACTION,
      msaId: 'dsnp://789',
      dependencyAttempt: 0,
      content: {
        emoji: '👍',
        inReplyTo: 'dsnp://123/reply/1',
        apply: 10,
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue an update announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', hash: 'mockHash', size: 123 } as any);

    const data: IRequestJob = {
      id: '4',
      announcementType: AnnouncementTypeName.UPDATE,
      msaId: 'dsnp://101',
      dependencyAttempt: 0,
      content: {
        content: {
          content: 'mockUpdateContent',
          published: '2021-01-01T00:00:00.000Z',
        },
        targetAnnouncementType: ModifiableAnnouncementType.REPLY,
        targetContentHash: 'dsnp://123/reply/1',
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a profile announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', hash: 'mockHash', size: 123 } as any);

    const data: IRequestJob = {
      id: '5',
      announcementType: AnnouncementTypeName.PROFILE,
      msaId: 'dsnp://789',
      dependencyAttempt: 0,
      content: {
        profile: {
          name: 'John Doe',
          published: '2021-01-01T00:00:00.000Z',
          summary: 'A brief summary',
          tag: [
            { type: TagTypeEnum.Hashtag, name: 'tag1' },
            { type: TagTypeEnum.Mention, name: 'user1', mentionedId: 'dsnp://123' },
          ],
        },
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a tombstone announcement', async () => {
    // Mock the necessary dependencies' behavior
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    const pinSpy = jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', hash: 'mockHash', size: 123 } as any);

    const data: IRequestJob = {
      id: '6',
      announcementType: AnnouncementTypeName.TOMBSTONE,
      msaId: 'dsnp://999',
      dependencyAttempt: 0,
      content: {
        targetAnnouncementType: ModifiableAnnouncementType.BROADCAST,
        targetContentHash: 'dsnp://123/broadcast/1',
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(pinSpy).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
});
