import { Injectable, Logger } from '@nestjs/common';
import { validateSignin, validateSignup } from '@projectlibertylabs/siwf';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { TransactionType } from '#lib/types/enums';
import { ConfigService } from '#lib/config/config.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { WalletLoginRequestDto, PublishSIWFSignupRequestDto } from '#lib/types/dtos/wallet.login.request.dto';
import { WalletLoginResponseDto } from '#lib/types/dtos/wallet.login.response.dto';
import { AccountResponseDto, MsaIdResponse } from '#lib/types/dtos/accounts.response.dto';
import { WalletLoginConfigResponseDto } from '#lib/types/dtos/wallet.login.config.response.dto';

@Injectable()
export class AccountsService {
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
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

  async getMsaIdForPublicKey(publicKey: string): Promise<MsaIdResponse | null> {
    try {
      const msaId = await this.blockchainService.publicKeyToMsaId(publicKey);
      if (msaId) {
        this.logger.debug(`Found msaId: ${msaId} for public key: ${publicKey}`);
        return { msaId };
      }
      this.logger.debug(`Did not find msaId for public key: ${publicKey}`);
      return null;
    } catch (e) {
      this.logger.error(`Error during get msaId request: ${e}`);
      throw new Error('Failed to get msaId');
    }
  }

  async getSIWFConfig(): Promise<WalletLoginConfigResponseDto> {
    let response: WalletLoginConfigResponseDto;
    try {
      const { providerId, frequencyHttpUrl, siwfUrl } = this.configService;
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
    const { providerId } = this.configService;
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

  getRetireMsaTx() {
    return this.blockchainService.createRetireMsaTx();
  }

  async retireMsa(accountId: string) {
    try {
      const referenceId: WalletLoginResponse = await this.enqueueService.enqueueRequest<RetireMsaRequest>({
        accountId,
        type: TransactionType.RETIRE_MSA,
      });
      return referenceId;
    } catch (e: any) {
      this.logger.error(`Failed to enqueue retire msa request: ${e.toString()}`);
      throw new Error('Failed to enqueue retire msa request');
    }
  }
}
