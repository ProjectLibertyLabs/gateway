// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty, IsString, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { Type } from 'class-transformer';
import { IsHexValue } from '#utils/decorators';

class HandlePayloadDto {
  @ApiProperty({
    type: 'string',
    description: 'base handle in the request!',
    example: 'handle',
  })
  @MinLength(3)
  @IsString()
  baseHandle: string;

  @ApiProperty({ type: 'number', description: 'expiration block number for this payload', example: '1' })
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296, message: 'expiration should be a positive number!' })
  expiration: number;
}

export class HandleRequestDto {
  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format!',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress({ message: 'Account id should be a 32 bytes value in hex or SS58 format!' })
  accountId: string;

  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => HandlePayloadDto)
  payload: HandlePayloadDto;

  @ApiProperty({
    description: 'proof is the signature for the payload',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'Proof should be a 64 bytes value in hex format!' })
  proof: HexString;
}

export class ChangeHandlePayloadRequest {
  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => HandlePayloadDto)
  payload: HandlePayloadDto;

  @ApiProperty({
    description: 'encodedPayload is scale encoded of payload in hex format',
    type: String,
    example: '0x012345',
  })
  @IsHexValue({ minLength: 2, message: 'encodedPayload should be in hex format!' })
  encodedPayload: HexString;
}

export type CreateHandleRequest = HandleRequestDto & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequestDto & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequestDto = CreateHandleRequest | ChangeHandleRequest;
