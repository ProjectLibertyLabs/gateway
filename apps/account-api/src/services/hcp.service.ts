import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { AccountIdDto } from '#types/dtos/common';
import { Inject, NotFoundException } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { PinoLogger } from 'nestjs-pino';

export class HcpService {
  constructor(
    // needed to get providerId, keys, for signing etc
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private readonly blockchainService: BlockchainRpcQueryService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  // async verifyAccountHasMsa(accountId: AccountIdDto): Promise<void> {
  //   const api = (await this.blockchainService.getApi()) as ApiPromise;
  //   const res = await api.query.msa.publicKeyToMsaId(accountId);
  //   if (res.isNone) {
  //     throw new NotFoundException(`MSA ID for account ${accountId} not found`);
  //   }
  // }
}
