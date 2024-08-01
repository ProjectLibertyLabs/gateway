import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import { ConfigService } from '#libs/config';
import { AnnouncementTypeDto, ModifiableAnnouncementTypeDto, TagTypeDto } from '#libs/dtos';
import { IRequestJob } from '#libs/interfaces';
import { IpfsService } from '#libs/utils/ipfs.client';

const mockQueue = {
  add: jest.fn(),
};

// Mock the ConfigService class
const mockConfigService = {
  getIpfsCidPlaceholder: jest.fn(),
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
        DsnpAnnouncementProcessor,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: IpfsService, useValue: mockIpfsService },
        { provide: Queue, useValue: mockQueue },
        { provide: 'BullQueue_assetQueue', useValue: mockQueue },
        { provide: 'BullQueue_broadcastQueue', useValue: mockQueue },
        { provide: 'BullQueue_replyQueue', useValue: mockQueue },
        { provide: 'BullQueue_reactionQueue', useValue: mockQueue },
        { provide: 'BullQueue_updateQueue', useValue: mockQueue },
        { provide: 'BullQueue_profileQueue', useValue: mockQueue },
        { provide: 'BullQueue_tombstoneQueue', useValue: mockQueue },
      ],
    }).compile();

    dsnpAnnouncementProcessor = module.get<DsnpAnnouncementProcessor>(DsnpAnnouncementProcessor);
  });

  it('should be defined', () => {
    expect(dsnpAnnouncementProcessor).toBeDefined();
  });

  it('should collect and queue a broadcast announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '1',
      announcementType: AnnouncementTypeDto.BROADCAST,
      dsnpUserId: 'dsnp://123',
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

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
  it('should collect and queue a reply announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '2',
      announcementType: AnnouncementTypeDto.REPLY,
      dsnpUserId: 'dsnp://456',
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

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a reaction announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '3',
      announcementType: AnnouncementTypeDto.REACTION,
      dsnpUserId: 'dsnp://789',
      dependencyAttempt: 0,
      content: {
        emoji: '👍',
        inReplyTo: 'dsnp://123/reply/1',
        apply: 10,
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
  it('should collect and queue an update announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '4',
      announcementType: AnnouncementTypeDto.UPDATE,
      dsnpUserId: 'dsnp://101',
      dependencyAttempt: 0,
      content: {
        content: {
          content: 'mockUpdateContent',
          published: '2021-01-01T00:00:00.000Z',
        },
        targetAnnouncementType: ModifiableAnnouncementTypeDto.REPLY,
        targetContentHash: 'dsnp://123/reply/1',
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a profile announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '5',
      announcementType: AnnouncementTypeDto.PROFILE,
      dsnpUserId: 'dsnp://789',
      dependencyAttempt: 0,
      content: {
        profile: {
          name: 'John Doe',
          published: '2021-01-01T00:00:00.000Z',
          summary: 'A brief summary',
          tag: [
            { type: TagTypeDto.Hashtag, name: 'tag1' },
            { type: TagTypeDto.Mention, name: 'user1', mentionedId: 'dsnp://123' },
          ],
        },
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });

  it('should collect and queue a tombstone announcement', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', hash: 'mockHash', size: 123 });

    const data: IRequestJob = {
      id: '6',
      announcementType: AnnouncementTypeDto.TOMBSTONE,
      dsnpUserId: 'dsnp://999',
      dependencyAttempt: 0,
      content: {
        targetAnnouncementType: ModifiableAnnouncementTypeDto.BROADCAST,
        targetContentHash: 'dsnp://123/broadcast/1',
      },
      assetToMimeType: new Map(),
    };

    await dsnpAnnouncementProcessor.collectAnnouncementAndQueue(data);

    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockIpfsService.ipfsPin).toHaveBeenCalledWith('application/octet-stream', expect.any(Buffer));
  });
});
