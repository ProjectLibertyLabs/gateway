import { IsHexValue } from '#utils/decorators';
import { HexString } from '@polkadot/util/types';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Not used yet.
export class AddRecoveryCommitmentPayloadRequestDto {
  @IsHexValue({ minLength: 64, maxLength: 2048 })
  recoveryCommitment: HexString;

  expiration: number;
}

export class AddRecoveryCommitmentRequestDto {
  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  msaOwnerKey: string;

  /**
   * proof is the signature for the payload
   * @example '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature()
  proof: HexString;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => AddRecoveryCommitmentPayloadRequestDto)
  payload: AddRecoveryCommitmentPayloadRequestDto;
}
