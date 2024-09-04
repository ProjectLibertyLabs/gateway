import { TransactionType } from '#lib/types/enums';
import { GenericExtrinsicPayload } from '@polkadot/types';
import { Signature } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';

export type RetireMsaRequestDto = {
  tx: GenericExtrinsicPayload;
  signature: Signature;
  publicKey: HexString;
  type: TransactionType.RETIRE_MSA;
};
