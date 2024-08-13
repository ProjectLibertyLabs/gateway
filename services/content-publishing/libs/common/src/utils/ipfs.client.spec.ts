import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.client';
import { ConfigService } from '#libs/config';
import { Logger } from '@nestjs/common';

jest.mock('axios');

describe('IpfsService Tests', () => {
  let service: IpfsService;
  let configService: ConfigService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        {
          provide: ConfigService,
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
    configService = module.get<ConfigService>(ConfigService);
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
