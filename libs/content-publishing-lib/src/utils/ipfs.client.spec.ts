import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.client';
import { IIpfsConfig } from '#content-publishing-lib/config/ipfs.config';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';

jest.mock('axios');

const mockIpfsConfigProvider = GenerateMockConfigProvider<IIpfsConfig>('ipfs', {
  ipfsEndpoint: 'http://localhost:5001',
  ipfsBasicAuthUser: '',
  ipfsBasicAuthSecret: '',
  ipfsGatewayUrl: 'http://localhost:8080/ipfs/[CID]',
});

describe('IpfsService Tests', () => {
  let service: IpfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService, mockIpfsConfigProvider],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes sha256 correctly ABC and returns a multihash value', async () => {
    const mb = await service.ipfsHashBuffer(Buffer.from('abc'));
    expect(mb).toMatch('bcirbeif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu');
  });
});
