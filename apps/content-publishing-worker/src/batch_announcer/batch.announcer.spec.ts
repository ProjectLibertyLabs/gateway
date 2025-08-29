import { expect, describe, jest, it } from '@jest/globals';
import assert from 'assert';
import { DSNPParquetSchema } from '@dsnp/schemas';
import { stringToHex } from '@polkadot/util';
import { BatchAnnouncer } from './batch.announcer';
import { getPinoHttpOptions } from '#logger-lib';
import { LoggerModule } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import ipfsConfig, { IIpfsConfig } from '#storage/ipfs/ipfs.config';
import { GenerateMockConfigProvider, GenerateMockProvider, mockRedisProvider } from '#testlib';
import { BlockchainService } from '#blockchain/blockchain.service';
import { FilePin, IpfsService } from '#storage';
import { Bytes } from '@polkadot/types';

// Create a mock for the dependencies
const mockIpfsConfigProvider = GenerateMockConfigProvider<IIpfsConfig>(ipfsConfig.KEY, {
  mode: 'ipfs',
  ipfsBasicAuthSecret: undefined,
  ipfsBasicAuthUser: undefined,
  ipfsEndpoint: 'http://ipfs.io',
  ipfsGatewayUrl: 'http://ipfs.io/ipfs/[CID]',
  clusterPinExpiration: '24h',
  clusterReplicationMax: 0,
  clusterReplicationMin: 0,
});

const mockBlockchainServiceProvider = GenerateMockProvider<BlockchainService>(BlockchainService, {
  getSchemaPayload: jest.fn(),
});

const mockIpfsServiceProvider = GenerateMockProvider<IpfsService>(IpfsService, {
  getPinned: jest.fn(),
  ipfsPin: jest.fn(),
});

describe('BatchAnnouncer', () => {
  let ipfsAnnouncer: BatchAnnouncer;
  let blockchainService: BlockchainService;
  let ipfsService: IpfsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(getPinoHttpOptions())],
      providers: [
        mockIpfsConfigProvider,
        mockIpfsServiceProvider,
        mockBlockchainServiceProvider,
        mockRedisProvider(),
        BatchAnnouncer,
      ],
    }).compile();

    ipfsAnnouncer = module.get<BatchAnnouncer>(BatchAnnouncer);
    blockchainService = module.get<BlockchainService>(BlockchainService);
    ipfsService = module.get<IpfsService>(IpfsService);
  });

  const broadcast: DSNPParquetSchema = [
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

  it('should be defined', () => {
    expect(ipfsAnnouncer).toBeDefined();
  });

  // Write your test cases here
  it('should announce a batch to IPFS', async () => {
    // Mock the necessary dependencies' behavior
    const schemaSpy = jest
      .spyOn(blockchainService, 'getSchemaPayload')
      .mockResolvedValue(Buffer.from(stringToHex(JSON.stringify(broadcast))) as unknown as Bytes);
    jest.spyOn(ipfsService, 'getPinned').mockResolvedValueOnce(Buffer.from('mockContentBuffer'));
    jest
      .spyOn(ipfsService, 'ipfsPin')
      .mockResolvedValueOnce({ cid: 'mockCid', size: 10, hash: 'mockHash' } as unknown as FilePin);

    const batchJob = {
      batchId: 'mockBatchId',
      schemaId: 123,
      announcements: [],
    };

    const result = await ipfsAnnouncer.announce(batchJob);
    assert(result);
    expect(schemaSpy).toHaveBeenCalledWith(123);
  });
});
