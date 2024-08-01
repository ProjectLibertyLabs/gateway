import { expect, describe, jest, it, beforeEach } from '@jest/globals';
import assert from 'assert';
import { FrequencyParquetSchema } from '@dsnp/frequency-schemas/types/frequency';
import Redis from 'ioredis-mock';
import { stringToHex } from '@polkadot/util';
import { BatchAnnouncer } from './batch.announcer';

// Create a mock for the dependencies
const mockConfigService = {
  getIpfsCidPlaceholder: jest.fn(),
};

const mockBlockchainService = {
  getSchemaPayload: jest.fn(),
};

const mockIpfsService = {
  getPinned: jest.fn(),
  ipfsPin: jest.fn(),
};

describe('BatchAnnouncer', () => {
  let ipfsAnnouncer: BatchAnnouncer;

  const broadcast: FrequencyParquetSchema = [
    {
      name: 'announcementType',
      column_type: {
        INTEGER: {
          bit_width: 32,
          sign: true,
        },
      },
      compression: 'GZIP',
      bloom_filter: false,
    },
    {
      name: 'contentHash',
      column_type: 'BYTE_ARRAY',
      compression: 'GZIP',
      bloom_filter: true,
    },
    {
      name: 'fromId',
      column_type: {
        INTEGER: {
          bit_width: 64,
          sign: false,
        },
      },
      compression: 'GZIP',
      bloom_filter: true,
    },
    {
      name: 'url',
      column_type: 'STRING',
      compression: 'GZIP',
      bloom_filter: false,
    },
  ];
  const mockClient = new Redis();

  beforeEach(async () => {
    ipfsAnnouncer = new BatchAnnouncer(
      mockClient,
      mockConfigService as any,
      mockBlockchainService as any,
      mockIpfsService as any,
    );
  });
  it('should be defined', () => {
    expect(ipfsAnnouncer).toBeDefined();
  });

  // Write your test cases here
  it('should announce a batch to IPFS', async () => {
    // Mock the necessary dependencies' behavior
    mockConfigService.getIpfsCidPlaceholder.mockReturnValue('mockIpfsUrl');
    mockBlockchainService.getSchemaPayload.mockReturnValue(Buffer.from(stringToHex(JSON.stringify(broadcast))));
    mockIpfsService.getPinned.mockReturnValue(Buffer.from('mockContentBuffer'));
    mockIpfsService.ipfsPin.mockReturnValue({ cid: 'mockCid', size: 10, hash: 'mockHash' });

    const batchJob = {
      batchId: 'mockBatchId',
      schemaId: 123,
      announcements: [],
    };

    const result = await ipfsAnnouncer.announce(batchJob);
    assert(result);
    expect(mockConfigService.getIpfsCidPlaceholder).toHaveBeenCalledWith('mockCid');
    expect(mockBlockchainService.getSchemaPayload).toHaveBeenCalledWith(123);
  });
});
