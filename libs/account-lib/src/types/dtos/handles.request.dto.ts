// eslint-disable-next-line max-classes-per-file
import { IsInt, IsNotEmpty, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';
import { IsHexValue } from '#account-lib/utils/custom.decorator';
import { Type } from 'class-transformer';

class HandlePayloadDto {
  @ApiProperty()
  @MinLength(3)
  @IsString()
  baseHandle: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  expiration: number;
}

export class HandleRequestDto {
  @ApiProperty({ type: String, description: 'AccountId in hex format' })
  @IsHexValue({ minLength: 64, maxLength: 64, message: 'Account id should be a 32 bytes value in hex format!' })
  accountId: string;

  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => HandlePayloadDto)
  payload: HandlePayloadDto;

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'Proof should be a 64 bytes value in hex format!' })
  proof: HexString;
}

export class ChangeHandlePayloadRequest {
  @ApiProperty()
  @IsNotEmpty()
  payload: HandleRequestDto['payload'];

  @ApiProperty()
  @IsNotEmpty()
  encodedPayload: HexString;
}

export type CreateHandleRequest = HandleRequestDto & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequestDto & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequestDto = CreateHandleRequest | ChangeHandleRequest;

export class HandleParam {
  @MinLength(3)
  @IsString()
  newHandle: string;
}
