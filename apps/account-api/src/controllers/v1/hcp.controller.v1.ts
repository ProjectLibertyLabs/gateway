import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { AddNewPublicKeyAgreementRequestDto, HcpPublishAllRequestDto, UpsertPagePayloadDto } from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { Body, Controller, HttpCode, HttpStatus, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'hcp' })
@ApiTags('v1/hcp')
export class HcpControllerV1 {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly enqueueService: EnqueueService,
    @InjectPinoLogger(HcpControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Post(':accountId/publishAll')
  @HttpCode(HttpStatus.ACCEPTED)
  async publishAll(
    @Param() { accountId }: AccountIdDto,
    @Body() payloads: HcpPublishAllRequestDto,
  ): Promise<{ referenceId: string }> {
    // check that the accountId has an MSA on chain as a fast, early failure.
    // it's not necessary to deserialize the payload to verify the id matches.
    await this.verifyAccountHasMsa(accountId);
    const referenceId = await this.buildAndEnqueueHcpBatchTxns(accountId, payloads);
    return { referenceId };
  }

  async verifyAccountHasMsa(accountId: string): Promise<void> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const res = await api.query.msa.publicKeyToMsaId(accountId);
    if (res.isNone) {
      throw new NotFoundException(`MSA ID for account ${accountId} not found`);
    }
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

  async buildAndEnqueueHcpBatchTxns(accountId: string, payloads: HcpPublishAllRequestDto): Promise<string> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const txns: Array<SubmittableExtrinsic<'promise', ISubmittableResult>> = [];

    // Build the three extrinsics
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addHcpPublicKeyPayload, api));
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addContextGroupPRIDEntryPayload, api));
    txns.push(this.buildUpsertPageExtrinsic(accountId, payloads.addContentGroupMetadataPayload, api));

    // Encode the extrinsics as hex strings
    const encodedExtrinsics: HexString[] = txns.map((tx) => tx.toHex());

    this.logger.debug(`Enqueueing HCP batch with ${encodedExtrinsics.length} extrinsics`);
    // use a proof to generate jobId
    const seed = payloads.addHcpPublicKeyPayload.proof;
    const { referenceId } = await this.enqueueService.enqueueHcpBatch(accountId, seed, encodedExtrinsics);

    return referenceId;
  }
}
