import { jest } from '@jest/globals';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { CurveType } from '@projectlibertylabs/siwf';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { IBlockchainConfig } from '#blockchain/blockchain.config';
import { IAccountApiConfig } from '#account-api/api.config';

jest.mock('@polkadot/api', () => {
  const originalModule = jest.requireActual<typeof import('@polkadot/api')>('@polkadot/api');
  return {
    __esModules: true,
    WsProvider: jest.fn().mockImplementation(() => originalModule.WsProvider),
    ApiPromise: jest.fn().mockImplementation(() => ({
      ...originalModule.ApiPromise,
      ...mockApiPromise,
    })),
  };
});

export const buildBlockchainConfigProvider = (signerType: CurveType): any => {
  const providerKeyUriOrPrivateKey =
    signerType === 'Sr25519' ? '//Alice' : '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133';
  return GenerateMockConfigProvider<IBlockchainConfig>('blockchain', {
    capacityLimit: { serviceLimit: { type: 'percentage', value: 80n } },
    providerId: 1n,
    providerKeyUriOrPrivateKey,
    frequencyApiWsUrl: new URL('ws://localhost:9944'),
    frequencyTimeoutSecs: 10,
    isDeployedReadOnly: false,
  });
};

export const mockAccountApiConfigProvider = GenerateMockConfigProvider<IAccountApiConfig>('account-api', {
  apiBodyJsonLimit: '',
  apiPort: 0,
  apiTimeoutMs: 0,
  siwfNodeRpcUrl: new URL('http://127.0.0.1:9944'),
  siwfUrl: '',
  siwfV2Url: 'https://www.example.com/siwf',
  siwfV2URIValidation: ['localhost'],
});
