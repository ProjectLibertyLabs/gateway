// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { RetireMsaPayloadResponseDto } from './accounts.response.dto';
import { TransactionType } from '#types/enums/account-enums';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsHexValue } from '#utils/decorators';

export class RetireMsaRequestDto extends RetireMsaPayloadResponseDto {
  @ApiProperty({
    description: 'signature of the owner',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsHexValue({
    minLength: 128,
    maxLength: 128,
    message: 'signature should be a 64 bytes value in hex format!',
  })
  signature: HexString;

  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress({ message: 'Account id should be a 32 bytes value in hex or SS58 format!' })
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
