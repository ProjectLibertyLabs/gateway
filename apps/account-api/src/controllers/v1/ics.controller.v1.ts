import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { AddNewPublicKeyAgreementRequestDto, IcsPublishAllRequestDto, UpsertPagePayloadDto } from '#types/dtos/account';
import { AccountIdDto } from '#types/dtos/common';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import {
  chainSignature,
} from '#utils/common/signature.util';

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
  async publishAll(
    @Param() { accountId }: AccountIdDto,
    @Body() payloads: IcsPublishAllRequestDto,
  ): Promise<{ referenceId: string }> {
    // check that the accountId has an MSA on chain as a fast, early failure.
    // it's not necessary to deserialize the payload to verify the id matches.
    const hasMsa = (await this.blockchainService.publicKeyToMsaId(accountId)) !== null;
    if (!hasMsa) {
      throw new HttpException(`Account has NO MSA on chain: ${accountId}`, HttpStatus.BAD_REQUEST);
    }
    const referenceId = await this.buildAndEnqueueIcsBatchTxns(accountId, payloads);
    return { referenceId };
  }

  buildApplyItemActionExtrinsic(
    accountId: string,
    payload: AddNewPublicKeyAgreementRequestDto,
    api: ApiPromise,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
      const encodedPayload = this.blockchainService.createItemizedSignaturePayloadV2Type(payload.payload);
      return api.tx.statefulStorage.applyItemActionsWithSignatureV2(
        accountId,
        chainSignature({ algo: 'Sr25519', encodedValue: payload.proof}), // TODO: determine signature algo
        encodedPayload,
      );
  }

  buildUpsertPageExtrinsic(
    accountId: string,
    payload: UpsertPagePayloadDto,
    api: ApiPromise,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return api.tx.statefulStorage.upsertPageWithSignatureV2(accountId, { Sr25519: payload.proof }, payload.payload);
  }

  async buildAndEnqueueIcsBatchTxns(accountId: string, payloads: IcsPublishAllRequestDto): Promise<string> {
    const api = (await this.blockchainService.getApi()) as ApiPromise;
    const txns: Array<SubmittableExtrinsic<'promise', ISubmittableResult>> = [];

    // Build the three extrinsics
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addIcsPublicKeyPayload, api));
    txns.push(this.buildApplyItemActionExtrinsic(accountId, payloads.addContextGroupPRIDEntryPayload, api));
    txns.push(this.buildUpsertPageExtrinsic(accountId, payloads.addContentGroupMetadataPayload, api));

    // Encode the extrinsics as hex strings
    const encodedExtrinsics: HexString[] = txns.map((tx) => {
      return tx.toHex();
    });

    this.logger.debug(`Enqueueing ICS batch with ${encodedExtrinsics.length} extrinsics`);
    // use a proof to generate jobId
    const seed = payloads.addIcsPublicKeyPayload.proof;
    const { referenceId } = await this.enqueueService.enqueueIcsBatch(accountId, seed, encodedExtrinsics);

    return referenceId;
  }
}
