import { Inject, Injectable, Logger } from '@nestjs/common';
import { validateSignin, validateSignup } from '@projectlibertylabs/siwf';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { WalletLoginRequestDto, PublishSIWFSignupRequestDto } from '#types/dtos/account/wallet.login.request.dto';
import { WalletLoginResponseDto } from '#types/dtos/account/wallet.login.response.dto';
import {
  AccountResponseDto,
  MsaIdResponseDto,
  RetireMsaPayloadResponseDto,
} from '#types/dtos/account/accounts.response.dto';
import { WalletLoginConfigResponseDto } from '#types/dtos/account/wallet.login.config.response.dto';
import { RetireMsaRequestDto, TransactionResponse, PublishRetireMsaRequestDto } from '#types/dtos/account';
import { TransactionType } from '#types/account-webhook';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';

@Injectable()
export class AccountsService {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiCOnf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async getAccount(msaId: string): Promise<AccountResponseDto | null> {
    try {
      const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
      if (isValidMsaId) {
        const handleResponse = await this.blockchainService.getHandleForMsa(msaId);
        if (handleResponse) {
          this.logger.debug(`Found handle: ${handleResponse.base_handle.toString()} for msaId: ${msaId}`);
          return { msaId, handle: handleResponse };
        }
        this.logger.log(`Failed to get handle for msaId: ${msaId}`);
        return { msaId };
      }
      this.logger.log(`Invalid msaId: ${msaId}`);
      return null;
    } catch (e) {
      this.logger.error(`Error during get account request: ${e}`);
      throw new Error('Failed to get account');
    }
  }

  async getMsaIdForAccountId(accountId: string): Promise<MsaIdResponseDto | null> {
    try {
      const msaId = await this.blockchainService.publicKeyToMsaId(accountId);
      if (msaId) {
        this.logger.debug(`Found msaId: ${msaId} for account id: ${accountId}`);
        return { msaId };
      }
      this.logger.debug(`Did not find msaId for account id: ${accountId}`);
      return null;
    } catch (e) {
      this.logger.error(`Error during get msaId request: ${e}`);
      throw new Error('Failed to get msaId');
    }
  }

  async getSIWFConfig(): Promise<WalletLoginConfigResponseDto> {
    let response: WalletLoginConfigResponseDto;
    try {
      const { frequencyHttpUrl, siwfUrl }: IAccountApiConfig = this.apiCOnf;
      const { providerId } = this.blockchainConf;
      response = {
        providerId: providerId.toString(),
        siwfUrl: siwfUrl.toString(),
        frequencyRpcUrl: frequencyHttpUrl.toString(),
      };
    } catch (e) {
      this.logger.error(`Error during SIWF config request: ${e}`);
      throw new Error('Failed to get SIWF config');
    }
    return response;
  }

  // eslint-disable-next-line class-methods-use-this
  async signInWithFrequency(request: WalletLoginRequestDto): Promise<WalletLoginResponseDto> {
    const api = await this.blockchainService.getApi();
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
        throw new Error('Failed to sign up');
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
        throw new Error('Failed to Sign In With Frequency');
      }
    }
    throw new Error('Invalid Sign In With Frequency Request');
  }

  async getRetireMsaPayload(accountId: string): Promise<RetireMsaPayloadResponseDto | null> {
    try {
      const msaId = await this.getMsaIdForAccountId(accountId);
      if (msaId) return this.blockchainService.createRetireMsaPayload(accountId);
      return null;
    } catch (e) {
      this.logger.error(`Failed to create retire msa payload: ${e}`);
      throw new Error('Failed to create retire msa payload.');
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
