import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import { ModifiableAnnouncementType } from '#types/dtos/content-publishing';
import { IRequestJob } from '#types/interfaces/content-publishing';
import { AnnouncementTypeName, TagTypeEnum } from '#types/enums';
import { IIpfsConfig, IpfsService } from '#storage';
import ipfsConfig from '#storage/ipfs/ipfs.config';

const mockQueue = {
  add: jest.fn(),
};

// Mock config values
const mockIpfsConfig: IIpfsConfig = {
  ipfsBasicAuthSecret: undefined,
  ipfsBasicAuthUser: undefined,
  ipfsEndpoint: 'http://ipfs.io',
  ipfsGatewayUrl: 'http://ipfs.io/ipfs/[CID]',
};

// Mock the IpfsService class
const mockIpfsService = {
  getPinned: jest.fn(),
  ipfsPin: jest.fn(),
};

describe('DsnpAnnouncementProcessor', () => {
  let dsnpAnnouncementProcessor: DsnpAnnouncementProcessor;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        { provide: ipfsConfig.KEY, useValue: mockIpfsConfig },
        { provide: IpfsService, useValue: mockIpfsService },
        { provide: Queue, useValue: mockQueue },
        { provide: 'BullQueue_assetQueue', useValue: mockQueue },
        { provide: 'BullQueue_broadcastQueue', useValue: mockQueue },
        { provide: 'BullQueue_replyQueue', useValue: mockQueue },
        { provide: 'BullQueue_reactionQueue', useValue: mockQueue },
        { provide: 'BullQueue_updateQueue', useValue: mockQueue },
        { provide: 'BullQueue_profileQueue', useValue: mockQueue },
        { provide: 'BullQueue_tombstoneQueue', useValue: mockQueue },
        DsnpAnnouncementProcessor,
      ],
    }).compile();

    dsnpAnnouncementProcessor = module.get<DsnpAnnouncementProcessor>(DsnpAnnouncementProcessor);
  });

  it('should be defined', () => {
    expect(dsnpAnnouncementProcessor).toBeDefined();
  });

  it('should collect and queue a broadcast announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
  it('should collect and queue a reply announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a reaction announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
  it('should collect and queue an update announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a profile announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a tombstone announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

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

    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
});
