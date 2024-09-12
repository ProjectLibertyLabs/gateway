/* eslint-disable max-classes-per-file */
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';
import { Signer, SignerPayloadRaw } from '@polkadot/types/types';

class RevokeDelegationPayloadDto {
  @ApiProperty()
  @IsNotEmpty()
  providerId: string;
}

// class RevokeDelegationPayloadBase {
//   @ApiProperty()
//   @IsNotEmpty()
//   providerId: string;
// }

// export class RevokeDelegationPayloadRequest {
//   @ApiProperty()
//   @IsNotEmpty()
//   payload: RevokeDelegationRequestDto['payload'];

//   @ApiProperty()
//   @IsNotEmpty()
//   encodedPayload: HexString;
// }

// REMOVE: Abstraction to remove dependency on polkadot types
export class ExtrinsicSignerPayloadRaw {
  address: string;

  data: string;

  type: 'bytes' | 'payload';
}

// REMOVE: Abstraction to remove dependency on polkadot types
// export class ExtrinsicSigner {
//   /**
//    * @description signs an extrinsic payload from a serialized form
//    */
//   signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;

//   /**
//    * @description signs a raw payload, only the bytes data as supplied
//    */
//   signRaw?: (raw: SignerPayloadRaw) => Promise<SignerResult>;

//   /**
//    * @description Receives an update for the extrinsic signed by a `signer.sign`
//    */
//   update?: (id: number, status: H256 | ISubmittableResult) => void;
// }

export class RevokeDelegationPayloadResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  extSignerPayloadRaw: ExtrinsicSignerPayloadRaw;

  @ApiProperty()
  @IsNotEmpty()
  encodedPayload: HexString;

  // @ApiProperty()
  // @IsNotEmpty()
  // signer: Signer;
}
export type RevokeDelegationRequest = RevokeDelegationPayloadResponseDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
