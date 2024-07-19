import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { validateSignin, validateSignup } from '@amplica-labs/siwf';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { TransactionType } from '#lib/types/enums';
import { QueueConstants } from '#lib/utils/queues';
import { ConfigService } from '#lib/config/config.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { WalletLoginRequestDto, PublishSIWFSignupRequest } from '#lib/types/dtos/wallet.login.request.dto';
import { WalletLoginResponse } from '#lib/types/dtos/wallet.login.response.dto';
import { AccountResponse } from '#lib/types/dtos/accounts.response.dto';
import { WalletLoginConfigResponse } from '#lib/types/dtos/wallet.login.config.response.dto';

@Injectable()
export class AccountsService {
  private readonly logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async getAccount(msaId: string): Promise<AccountResponse> {
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
      throw new Error(`Invalid msaId: ${msaId}`);
    } catch (e) {
      this.logger.error(`Error during get account request: ${e}`);
      throw new Error('Failed to get account');
    }
  }

  async getSIWFConfig(): Promise<WalletLoginConfigResponse> {
    let response: WalletLoginConfigResponse;
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
  async signInWithFrequency(request: WalletLoginRequestDto): Promise<WalletLoginResponse> {
    const api = await this.blockchainService.getApi();
    const { providerId } = this.configService;
    if (request.signUp) {
      try {
        const siwfPayload = await validateSignup(api, request.signUp, providerId.toString());
        // Pass all this data to the transaction publisher queue
        const referenceId: WalletLoginResponse = await this.enqueueService.enqueueRequest<PublishSIWFSignupRequest>({
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
        const response: WalletLoginResponse = {
          referenceId: '0',
          msaId: parsedSignin.msaId,
          publicKey: parsedSignin.publicKey,
        };
        return response;
      } catch (e) {
        this.logger.error(`Error during SIWF signin request: ${e}`);
        const { cause } = e as any;
        this.logger.error(`cause: ${cause}`);
        throw new Error('Failed to Sign-In With Frequency');
      }
    }
    throw new Error('Invalid Sign-In With Frequency Request');
  }
}
