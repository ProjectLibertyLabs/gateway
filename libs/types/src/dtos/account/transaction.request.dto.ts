import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { PublishIcsPublishAllRequestDto } from './ics.request.dto';
import { PublicKeyAgreementRequestDto } from './graphs.request.dto';
import { PublishHandleRequestDto } from './handles.request.dto';
import { PublishKeysRequestDto } from './keys.request.dto';
import { PublishRetireMsaRequestDto } from './accounts.request.dto';
import { PublishRevokeDelegationRequestDto } from './revokeDelegation.request.dto';
import { TransactionType } from '#types/tx-notification-webhook';

export interface EncodedExtrinsic {
  pallet: string;
  extrinsicName: string;
  encodedExtrinsic: string;
}

export type PublishSIWFSignupRequestDto = {
  calls: EncodedExtrinsic[];
  type: TransactionType.SIWF_SIGNUP;
  authorizationCode?: string;
};

export type PublishCapacityBatchRequestDto = {
  calls: EncodedExtrinsic[];
  type: TransactionType.CAPACITY_BATCH;
};

export type TransactionData<
  RequestType =
    | PublishIcsPublishAllRequestDto
    | PublishHandleRequestDto
    | PublishSIWFSignupRequestDto
    | PublishCapacityBatchRequestDto
    | PublishKeysRequestDto
    | PublishRetireMsaRequestDto
    | PublicKeyAgreementRequestDto
    | PublishRevokeDelegationRequestDto,
> = RequestType & {
  providerId: string;
  referenceId: string;
};

export type TxMonitorJob = TransactionData & {
  id: string;
  txHash: HexString;
  epoch: number;
  lastFinalizedBlockHash: BlockHash;
};
