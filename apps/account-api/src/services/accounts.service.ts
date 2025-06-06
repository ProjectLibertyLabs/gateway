import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { validateSignin, validateSignup } from '@projectlibertylabs/siwfv1';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { WalletLoginRequestDto } from '#types/dtos/account/wallet.login.request.dto';
import { WalletLoginResponseDto } from '#types/dtos/account/wallet.login.response.dto';
import {
  AccountResponseDto,
  MsaIdResponseDto,
  RetireMsaPayloadResponseDto,
} from '#types/dtos/account/accounts.response.dto';
import { WalletLoginConfigResponseDto } from '#types/dtos/account/wallet.login.config.response.dto';
import {
  PublishRetireMsaRequestDto,
  PublishSIWFSignupRequestDto,
  RetireMsaRequestDto,
  TransactionResponse,
} from '#types/dtos/account';
import { TransactionType } from '#types/account-webhook';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { ApiPromise } from '@polkadot/api';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(apiConfig.KEY) private readonly apiCOnf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    @InjectPinoLogger('AccountsService')
    private blockchainService: BlockchainRpcQueryService,
    private enqueueService: EnqueueService,
    private readonly logger: PinoLogger,
  ) {}

  async getAccount(msaId: string): Promise<AccountResponseDto | null> {
    this.logger.debug('blockchain service is null', this.blockchainService);
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

  async getSIWFConfig(): Promise<WalletLoginConfigResponseDto> {
    const { siwfNodeRpcUrl, siwfUrl }: IAccountApiConfig = this.apiCOnf;
    const { providerId } = this.blockchainConf;
    return {
      providerId: providerId.toString(),
      siwfUrl: siwfUrl.toString(),
      frequencyRpcUrl: siwfNodeRpcUrl.toString(),
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async signInWithFrequency(request: WalletLoginRequestDto): Promise<WalletLoginResponseDto> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const { providerId } = this.blockchainConf;
    if (request.signUp) {
      try {
        const siwfPayload = await validateSignup(api, request.signUp, providerId.toString());
        // Pass all this data to the transaction publisher queue
        const referenceId: WalletLoginResponseDto =
          await this.enqueueService.enqueueRequest<PublishSIWFSignupRequestDto>({
            ...siwfPayload,
            type: TransactionType.SIWF_SIGNUP,
          });
        return referenceId;
      } catch (e: any) {
        this.logger.error(`Failed Signup validation ${e.toString()}`);
        throw new UnprocessableEntityException('Failed to sign up');
      }
    } else if (request.signIn) {
      try {
        const parsedSignin = await validateSignin(api, request.signIn, 'localhost');
        const response: WalletLoginResponseDto = {
          referenceId: '0',
          msaId: parsedSignin.msaId,
          publicKey: parsedSignin.publicKey,
        };
        return response;
      } catch (e) {
        this.logger.error(`Error during SIWF signin request: ${e}`);
        const { cause } = e as any;
        this.logger.error(`cause: ${cause}`);
        throw new UnprocessableEntityException('Failed to Sign In With Frequency');
      }
    }
    throw new BadRequestException('Invalid Sign In With Frequency Request');
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
