// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty, IsString, MinLength, ValidateNested } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { Type } from 'class-transformer';
import { IsHexValue } from '#utils/decorators';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { TransactionType } from '#types/account-webhook';

export class HandlePayloadDto {
  /**
   * base handle in the request
   * @example 'handle'
   */
  @MinLength(3)
  @IsString()
  baseHandle: string;

  /**
   * expiration block number for this payload
   * @example 1
   */
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  expiration: number;
}

export class HandleRequestDto {
  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  accountId: string;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => HandlePayloadDto)
  payload: HandlePayloadDto;

  /**
   * proof is the signature for the payload
   * @example '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature()
  proof: HexString;
}

export class ChangeHandlePayloadRequest {
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => HandlePayloadDto)
  payload: HandlePayloadDto;

  /**
   * Raw encodedPayload is scale encoded of payload in hex format
   * @example '0x012345'
   */
  @IsHexValue({ minLength: 2 })
  encodedPayload: HexString;
}

export type CreateHandleRequest = HandleRequestDto & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequestDto & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequestDto = CreateHandleRequest | ChangeHandleRequest;
