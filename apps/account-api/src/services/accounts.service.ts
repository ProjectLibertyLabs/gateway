import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import {
  AccountResponseDto,
  MsaIdResponseDto,
  RetireMsaPayloadResponseDto,
} from '#types/dtos/account/accounts.response.dto';
import { PublishRetireMsaRequestDto, RetireMsaRequestDto, TransactionResponse } from '#types/dtos/account';
import { TransactionType } from '#types/account-webhook';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { ApiPromise } from '@polkadot/api';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(apiConfig.KEY) private readonly apiCOnf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainRpcQueryService,
    private enqueueService: EnqueueService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async getAccount(msaId: string): Promise<AccountResponseDto | null> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handleResponse = await this.blockchainService.getHandleForMsa(msaId);
      if (handleResponse) {
        this.logger.debug(`Found handle: ${handleResponse.base_handle.toString()} for msaId: ${msaId}`);
        return { msaId, handle: handleResponse };
      }
      this.logger.info(`Failed to get handle for msaId: ${msaId}`);
      return { msaId };
    }
    this.logger.info(`Invalid msaId: ${msaId}`);
    return null;
  }

  async getMsaIdForAccountId(accountId: string): Promise<MsaIdResponseDto | null> {
    const msaId = await this.blockchainService.publicKeyToMsaId(accountId);
    if (msaId) {
      this.logger.debug(`Found msaId: ${msaId} for account id: ${accountId}`);
      return { msaId };
    }
    this.logger.debug(`Did not find msaId for account id: ${accountId}`);
    return null;
  }

  async getRetireMsaPayload(accountId: string): Promise<RetireMsaPayloadResponseDto | null> {
    try {
      const msaId = await this.getMsaIdForAccountId(accountId);
      if (msaId) return this.blockchainService.createRetireMsaPayload(accountId);
      return null;
    } catch (e) {
      this.logger.error(`Failed to create retire msa payload: ${e}`);
      throw new UnprocessableEntityException('Failed to create retire msa payload.');
    }
  }

  async retireMsa(retireMsaRequest: RetireMsaRequestDto): Promise<TransactionResponse> {
    try {
      const referenceId = await this.enqueueService.enqueueRequest<PublishRetireMsaRequestDto>({
        ...retireMsaRequest,
        type: TransactionType.RETIRE_MSA,
      });
      return referenceId;
    } catch (e: any) {
      this.logger.error(`Failed to enqueue retire msa request: ${e.toString()}`);
      throw new Error('Failed to enqueue retire msa request');
    }
  }
}
