import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { validateSignin, validateSignup } from '@amplica-labs/siwf';
import { QueueConstants, TransactionType } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import type { AccountResponse } from '../../../../libs/common/src/types/dtos/accounts.dto';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import {
  PublishSIWFSignupRequest,
  WalletLoginRequest,
} from '../../../../libs/common/src/types/dtos/wallet.login.request.dto';
import { WalletLoginResponse } from '../../../../libs/common/src/types/dtos/wallet.login.response.dto';
import { EnqueueService } from '../../../../libs/common/src/services/enqueue-request.service';

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

  /**
   * Calculates the job ID based on the provided job object.
   * @param jobWithoutId - The job object without the ID.
   * @returns The calculated job ID.
   */
  // eslint-disable-next-line class-methods-use-this
  public calculateJobId(jobWithoutId): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async getAccount(msaId: number): Promise<AccountResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      return { msaId, handle };
    }
    throw new Error('Invalid msaId.');
  }

  // eslint-disable-next-line class-methods-use-this
  async signInWithFrequency(request: WalletLoginRequest): Promise<WalletLoginResponse> {
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
