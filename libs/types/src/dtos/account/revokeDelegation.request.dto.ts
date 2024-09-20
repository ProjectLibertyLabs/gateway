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
  @IsAccountIdOrAddress({ message: 'Account id should be a 32 bytes value in hex or SS58 format!' })
  accountId: string;

  @ApiProperty({ description: 'provider MsaId representing the target of this request', type: String, example: '3' })
  @IsMsaId({ message: 'providerId should be a valid positive number' })
  providerId: string;

  @ApiProperty({
    type: String,
    description: 'encodedExtrinsic to be added!',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2, message: 'encodedExtrinsic should be in hex format!' })
  encodedExtrinsic: HexString;

  @ApiProperty({
    type: String,
    description: 'payload to be signed!',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2, message: 'payloadToSign should be in hex format!' })
  payloadToSign: HexString;
}

export class RevokeDelegationPayloadRequestDto extends RevokeDelegationPayloadResponseDto {
  @ApiProperty({
    description: 'signature of the owner',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsSignature({
    message: 'signature should be a 64 (or 65 if it is MultiSignature type) bytes value in hex format!',
  })
  signature: HexString;
}

export type PublishRevokeDelegationRequestDto = RevokeDelegationPayloadRequestDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
