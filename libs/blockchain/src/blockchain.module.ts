import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CapacityCheckerService } from './capacity-checker.service';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';

export interface IBlockchainModuleOptions {
  readOnly: boolean;
}

@Module({})
export class BlockchainModule {
  static isConfigured = false;

  static services: Provider[];

  static async forRootAsync({ readOnly }: IBlockchainModuleOptions = { readOnly: false }): Promise<DynamicModule> {
    const { BlockchainService } = readOnly ? { BlockchainService: undefined } : await import('./blockchain.service');
    const BlockchainRpcQueryProvider: Provider = readOnly
      ? {
          provide: BlockchainRpcQueryService,
          useClass: BlockchainRpcQueryService,
        }
      : { provide: BlockchainRpcQueryService, useExisting: BlockchainService };

    BlockchainModule.services = [
      CapacityCheckerService,
      BlockchainRpcQueryProvider,
      ...(readOnly ? [] : [BlockchainService]),
    ];
    BlockchainModule.isConfigured = true;

    return {
      global: true,
      module: BlockchainModule,
      providers: BlockchainModule.services,
      exports: BlockchainModule.services,
    };
  }
}
