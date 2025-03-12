import { Test, TestingModule } from '@nestjs/testing';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { IIpfsConfig, IpfsService } from '#storage';
import { IHttpCommonConfig } from '#config/http-common.config';

jest.mock('axios');

const mockIpfsConfigProvider = GenerateMockConfigProvider<IIpfsConfig>('ipfs', {
  ipfsEndpoint: 'http://localhost:5001/api/v0',
  ipfsBasicAuthUser: '',
  ipfsBasicAuthSecret: '',
  ipfsGatewayUrl: 'http://localhost:8080/ipfs/[CID]',
});

const mockHttpCommonConfigProvider = GenerateMockConfigProvider<IHttpCommonConfig>('http-common', {
  httpResponseTimeoutMS: 3000,
});

describe('IpfsService Tests', () => {
  let service: IpfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService, mockIpfsConfigProvider, mockHttpCommonConfigProvider],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
