// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsHexValue } from '#utils/decorators';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { Type } from 'class-transformer';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { TransactionType } from '#types/account-webhook';

// TODO: adjust newPublicKey for Ethereum keys
export class KeysRequestPayloadDto {
  /**
   * MSA Id of the user requesting the new key
   * @example '3'
   */
  @IsMsaId()
  msaId: string;

  /**
   * expiration block number for this payload
   * @example 1
   */
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  expiration: number;

  /**
   * newPublicKey in hex format
   * @example '0x0ed2f8c714efcac51ca2325cfe95637e5e0b898ae397aa365978b7348a717d0b'
   */
  @IsHexValue({ minLength: 32, maxLength: 64 })
  newPublicKey: string;
}

export class EthereumRequestPayloadDto {}

// TODO: ideally the signatures should have the type, should be an object w/ the type
export class KeysRequestDto {
  /**
   * msaOwnerAddress representing the target of this request
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  msaOwnerAddress: string;

  /**
   * msaOwnerSignature is the signature by msa owner
   * @example '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature()
  msaOwnerSignature: HexString;

  /**
   * newKeyOwnerSignature is the signature with new key
   * @example '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature()
  newKeyOwnerSignature: HexString;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => KeysRequestPayloadDto)
  payload: KeysRequestPayloadDto;
}

export type AddKeyRequestDto = KeysRequestDto & {
  type: TransactionType.ADD_KEY;
};

export type PublishKeysRequestDto = AddKeyRequestDto;
