import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { PublicKeyAgreementRequestDto } from './graphs.request.dto';
import { PublishHandleRequestDto } from './handles.request.dto';
import { PublishKeysRequestDto } from './keys.request.dto';
import { PublishRetireMsaRequestDto } from './accounts.request.dto';
import { PublishRevokeDelegationRequestDto } from './revokeDelegation.request.dto';
import { TransactionType } from '#types/account-webhook';

export interface SIWFEncodedExtrinsic {
  pallet: string;
  extrinsicName: string;
  encodedExtrinsic: string;
}

export type PublishSIWFSignupRequestDto = {
  calls: SIWFEncodedExtrinsic[];
  type: TransactionType.SIWF_SIGNUP;
  authorizationCode?: string;
};

export type TransactionData<
  RequestType =
    | PublishHandleRequestDto
    | PublishSIWFSignupRequestDto
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
