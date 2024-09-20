/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsHexValue } from '#utils/decorators';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

export class RevokeDelegationPayloadResponseDto {
  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress()
  accountId: string;

  @ApiProperty({
    description: 'MSA Id of the provider to whom the requesting user wishes to delegate',
    type: String,
    example: '3',
  })
  @IsMsaId()
  providerId: string;

  @ApiProperty({
    type: String,
    description: 'Hex-encoded representation of the "revokeDelegation" extrinsic',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: HexString;

  @ApiProperty({
    type: String,
    description: 'payload to be signed',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2 })
  payloadToSign: HexString;
}

export class RevokeDelegationPayloadRequestDto extends RevokeDelegationPayloadResponseDto {
  @ApiProperty({
    description: 'signature of the owner',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsSignature()
  signature: HexString;
}

export type PublishRevokeDelegationRequestDto = RevokeDelegationPayloadRequestDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
