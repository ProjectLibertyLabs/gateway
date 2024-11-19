/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChainUser, ExtrinsicHelper, createKeys } from '@projectlibertylabs/frequency-scenario-template';
import { ApiModule } from '../src/api.module';
import { generateAddPublicKeyExtrinsic, setupProviderAndUsers } from './e2e-setup.mock.spec';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

let HTTP_SERVER: any;

describe('Keys Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let users: ChainUser[];
  let provider: ChainUser;
  let currentBlockNumber: number;

  beforeAll(async () => {
    ({ users, provider, currentBlockNumber } = await setupProviderAndUsers('//Bob', 2));

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication({ logger: ['error', 'warn', 'log', 'verbose', 'debug'], rawBody: true });

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, enableDebugMessages: true }));
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });

    await app.init();

    // Make sure we're connected to the chain before running tests
    const blockchainService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    await blockchainService.isReady();

    HTTP_SERVER = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    await ExtrinsicHelper.disconnect();
    await app.close();
    await HTTP_SERVER.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('Edge Case', () => {
    it('Expects failure if available capacity is less than required by a tx', async () => {
      const blockChainRpcQueryService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
      const newKey0 = createKeys('new key', `${users[0].uri}//newkey`);
      const newKey1 = createKeys('new key', `${users[1].uri}//newkey`);
      const tx = await ExtrinsicHelper.api.tx.frequencyTxPayment.payWithCapacityBatchAll([
        (await generateAddPublicKeyExtrinsic(users[0], newKey0, currentBlockNumber))(),
        (await generateAddPublicKeyExtrinsic(users[1], newKey1, currentBlockNumber))(),
      ]);
      const outOfCapacity = await blockChainRpcQueryService.checkTxCapacityLimit(provider.msaId, tx.toHex());
      expect(outOfCapacity).toBe(true);
    });
  });
});
