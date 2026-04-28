import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import {
  AddNewPublicKeyAgreementRequestDto,
  EncodedExtrinsic,
  IcsPublishAllRequestDto,
  PublishCapacityBatchRequestDto,
  UpsertPagePayloadDto,
} from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import { Body, Controller, HttpCode, HttpException, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiAcceptedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Response } from 'express';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { chainSignature } from '#utils/common/signature.util';
import { TransactionType } from '#types/tx-notification-webhook';

@Controller({ version: '1', path: 'ics' })
@ApiTags('v1/ics')
export class IcsControllerV1 {
  constructor(
    private blockchainService: BlockchainRpcQueryService,
    private readonly enqueueService: EnqueueService,
    @InjectPinoLogger(IcsControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Post(':accountId/publishAll')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({
    description: 'Publish-all request accepted and enqueued',
    schema: {
      type: 'object',
      properties: { referenceId: { type: 'string' } },
      required: ['referenceId'],
    },
  })
  @ApiNoContentResponse({ description: 'No payloads were provided, so no work was enqueued' })
  async publishAll(
    @Param() { accountId }: AccountIdDto,
    @Body() payloads: IcsPublishAllRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ referenceId: string } | void> {
    // check that the accountId has an MSA on chain as a fast, early failure.
    // it's not necessary to deserialize the payload to verify the id matches.
    const hasMsa = (await this.blockchainService.publicKeyToMsaId(accountId)) !== null;
    if (!hasMsa) {
      throw new HttpException(`Account has NO MSA on chain: ${accountId}`, HttpStatus.BAD_REQUEST);
    }
    const referenceId = await this.buildAndEnqueueIcsBatchTxns(accountId, payloads);
    if (referenceId === null) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return { referenceId };
  }

  buildApplyItemActionExtrinsic(
    accountId: string,
    payload: AddNewPublicKeyAgreementRequestDto,
    api: ApiPromise,
  ): EncodedExtrinsic {
    const encodedPayload = this.blockchainService.createItemizedSignaturePayloadV2Type(payload.payload);
    const tx = api.tx.statefulStorage.applyItemActionsWithSignatureV2(
      accountId,
      chainSignature({ algo: 'Sr25519', encodedValue: payload.proof }), // TODO: determine signature algo
      encodedPayload,
    );

    return {
      pallet: 'statefulStorage',
      extrinsicName: 'applyItemActionsWithSignatureV2',
      encodedExtrinsic: tx.toHex(),
    };
  }

  buildUpsertPageExtrinsic(accountId: string, payload: UpsertPagePayloadDto, api: ApiPromise): EncodedExtrinsic {
    const encodedPayload = this.blockchainService.createPaginatedUpsertSignaturePayloadV2Type(payload.payload);
    const tx = api.tx.statefulStorage.upsertPageWithSignatureV2(
      accountId,
      chainSignature({ algo: 'Sr25519', encodedValue: payload.signature }),
      encodedPayload,
    );

    return { pallet: 'statefulStorage', extrinsicName: 'upsertPageWithSignatureV2', encodedExtrinsic: tx.toHex() };
  }

  async buildAndEnqueueIcsBatchTxns(accountId: string, payloads: IcsPublishAllRequestDto): Promise<string | null> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const txns: Array<EncodedExtrinsic> = [];

    // Build the three extrinsics
    if (payloads.addIcsPublicKeyPayload) {
      txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addIcsPublicKeyPayload, api));
    }

    if (payloads.addContextGroupPRIDEntryPayload) {
      txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addContextGroupPRIDEntryPayload, api));
    }

    if (payloads.addContentGroupMetadataPayload) {
      txns.push(this.buildUpsertPageExtrinsic(accountId, payloads.addContentGroupMetadataPayload, api));
    }

    if (txns.length === 0) {
      this.logger.warn('Received `publishAll` request with no payloads for account %s', accountId);
      return null;
    }

    this.logger.debug(`Enqueueing ICS batch with ${txns.length} extrinsics`);
    const { referenceId } = await this.enqueueService.enqueueRequest<PublishCapacityBatchRequestDto>({
      type: TransactionType.CAPACITY_BATCH,
      calls: txns,
    });

    return referenceId;
  }
}
