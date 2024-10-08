/* eslint-disable max-classes-per-file */
import { HexString } from '@polkadot/util/types';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsHexValue } from '#utils/decorators';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { TransactionType } from '#types/account-webhook';

export class RevokeDelegationPayloadResponseDto {
  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  accountId: string;

  /**
   * MSA Id of the provider to whom the requesting user wishes to delegate
   * @example '3'
   */
  @IsMsaId()
  providerId: string;

  /**
   * Hex-encoded representation of the "revokeDelegation" extrinsic
   * @example '0x1234'
   */
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: HexString;

  /**
   * payload to be signed
   * @example '0x1234'
   */
  @IsHexValue({ minLength: 2 })
  payloadToSign: HexString;
}

export class RevokeDelegationPayloadRequestDto extends RevokeDelegationPayloadResponseDto {
  /**
   * signature of the owner
   * @example '0x01065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature({ requiresSignatureType: true })
  signature: HexString;
}

export type PublishRevokeDelegationRequestDto = RevokeDelegationPayloadRequestDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
