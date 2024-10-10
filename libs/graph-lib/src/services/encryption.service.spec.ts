import { EncryptionService } from '#graph-lib/services/encryption.service';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { IGraphCommonConfig } from '#config/graph-common.config';
import { EnvironmentType } from '@dsnp/graph-sdk';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphKeyPairDto, KeyType } from '#types/dtos/graph';

const mockGraphCommonConfigProvider = GenerateMockConfigProvider<IGraphCommonConfig>('graph-common', {
  atRestEncryptionKeySeed: 'His name is Robert Paulson',
  graphEnvironmentType: EnvironmentType.Mainnet,
  debounceSeconds: 10,
});

const exampleGraphKeyPair: GraphKeyPairDto[] = [
  {
    privateKey: '0x112233445566778899',
    publicKey: '0x998877665544332211',
    keyType: KeyType.X25519,
  },
  {
    privateKey: '0x111111111111',
    publicKey: '0x222222222222',
    keyType: KeyType.X25519,
  },
];

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [EncryptionService, mockGraphCommonConfigProvider],
    }).compile();
    await module.init();

    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(encryptionService).toBeDefined();
  });

  it('should encrypt and decrypt', async () => {
    const encryptionResult = await encryptionService.encryptPrivateKeys(exampleGraphKeyPair);

    expect(encryptionResult).toBeDefined();
    expect(encryptionResult.encryptionPublicKey).toBeDefined();
    expect(encryptionResult.senderContext).toBeDefined();
    expect(encryptionResult.result).toBeDefined();

    expect(encryptionResult.result[0].privateKey).not.toEqual(exampleGraphKeyPair[0].privateKey);
    expect(encryptionResult.result[1].privateKey).not.toEqual(exampleGraphKeyPair[1].privateKey);

    expect(encryptionResult.result[0].publicKey).toEqual(exampleGraphKeyPair[0].publicKey);
    expect(encryptionResult.result[1].publicKey).toEqual(exampleGraphKeyPair[1].publicKey);

    const decrypted = await encryptionService.decryptPrivateKeys(
      encryptionResult.encryptionPublicKey,
      encryptionResult.senderContext,
      encryptionResult.result,
    );
    expect(decrypted).toBeDefined();

    expect(decrypted[0].privateKey).toEqual(exampleGraphKeyPair[0].privateKey);
    expect(decrypted[1].privateKey).toEqual(exampleGraphKeyPair[1].privateKey);
    expect(decrypted[0].publicKey).toEqual(exampleGraphKeyPair[0].publicKey);
    expect(decrypted[1].publicKey).toEqual(exampleGraphKeyPair[1].publicKey);
  });
});
