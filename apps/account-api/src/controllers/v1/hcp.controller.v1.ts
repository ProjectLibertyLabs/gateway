import { HcpService } from '#account-api/services/hcp.service';
import { ITxStatus } from '#account-lib/interfaces/tx-status.interface';
import { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { NonceConflictError } from '#blockchain/types';
import { AddNewPublicKeyAgreementRequestDto, HcpPublishAllRequestDto, UpsertPagePayloadDto } from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Vec } from '@polkadot/types';
import { AccountId, Call } from '@polkadot/types/interfaces';
import { IMethod, ISubmittableResult } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { DelayedError } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'hcp' })
@ApiTags('v1/hcp')
export class HcpControllerV1 {
  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectPinoLogger(HcpControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  /// WIP This will get moved to a service and a separate queue like graph publisher,
  // to handle capacity running out events
  @Post(':accountId/publishAll')
  @HttpCode(HttpStatus.ACCEPTED)
  async publishAll(
    @Param() { accountId }: AccountIdDto,
    @Body() payloads: HcpPublishAllRequestDto,
  ): Promise<HexString> {
    // check that the accountId has an MSA on chain as a fast, early failure.
    // it's not necessary to deserialize the payload to verify the id matches.
    this.verifyAccountHasMsa(accountId);
    // FA will check access control as soon as symmetric key is requested,
    // so ensure that there is no delay in a payWithCapacityBatchAll call.
    return this.publishHcpMessages(accountId, payloads);
  }

  async verifyAccountHasMsa(accountId: string): Promise<void> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const res = await api.query.msa.publicKeyToMsaId(accountId);
    if (res.isNone) {
      throw new NotFoundException(`MSA ID for account ${accountId} not found`);
    }
  }

  async publishHcpMessages(accountId: string, payloads: HcpPublishAllRequestDto): Promise<HexString> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    let txns: Array<SubmittableExtrinsic<'promise', ISubmittableResult>> = [];
    const callVec = this.blockchainService.createType('Vec<Call>', txns);
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addHcpPublicKeyPayload, api));
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addContextGroupPRIDEntryPayload, api));
    txns.push(this.buildUpsertPageExtrinsic(accountId, payloads.addContentGroupMetadataPayload, api));
    let [_tx, txHash, _blockNumber] = await this.processBatchTxn(callVec);
    this.logger.debug(`txns: ${txns}`);
    return txHash;
  }

  buildApplyItemActionExtrinsic(
    accountId: string,
    payload: AddNewPublicKeyAgreementRequestDto,
    api: ApiPromise,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return api.tx.statefulStorage.applyItemActionsWithSignatureV2(
      accountId,
      { Sr25519: payload.proof },
      payload.payload,
    );
  }

  buildUpsertPageExtrinsic(
    accountId: string,
    payload: UpsertPagePayloadDto,
    api: ApiPromise,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return api.tx.statefulStorage.upsertPageWithSignatureV2(accountId, { Sr25519: payload.proof }, payload.payload);
  }

  processBatchTxn(
    callVec: Vec<Call> | (Call | IMethod | string | Uint8Array)[],
  ): ReturnType<BlockchainService['payWithCapacityBatchAll']> {
    this.logger.trace(
      'processBatchTxn: callVec: ',
      callVec.map((c) => c.toHuman()),
    );
    try {
      return this.blockchainService.payWithCapacityBatchAll(callVec);
    } catch (error: any) {
      this.logger.error(`Error processing batch transaction: ${error}`);
      if (error instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw error;
    }
  }
}
