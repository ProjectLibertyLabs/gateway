import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.client';
import { Logger } from '@nestjs/common';
import ipfsConfig, { IIpfsConfig } from '#content-publishing-lib/config/ipfs.config';

jest.mock('axios');

describe('IpfsService Tests', () => {
  let service: IpfsService;
  let logger: Logger;
  let config: IIpfsConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        {
          provide: ipfsConfig.KEY,
          useValue: {
            ipfsEndpoint: 'http://localhost:5001',
            ipfsBasicAuthUser: '',
            ipfsBasicAuthSecret: '',
            ipfsGatewayUrl: 'http://localhost:8080/ipfs/[CID]',
          },
        },
      ],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
    config = module.get<IIpfsConfig>(ipfsConfig.KEY);
    logger = new Logger(IpfsService.name);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes blake2b correctly ABC', async () => {
    const mb = await service.ipfsHashBuffer(Buffer.from('abc'));
    expect(mb).toMatch('bciqlu6awx6hqdt7kifaubxs5vyrchmadmgrzmf32ts2bb73b6iablli');
  });
});
