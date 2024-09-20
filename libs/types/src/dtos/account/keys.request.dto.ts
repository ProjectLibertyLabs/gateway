// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsHexValue } from '#utils/decorators';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { Type } from 'class-transformer';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

class KeysRequestPayloadDto {
  @ApiProperty({ description: 'MSA Id of the user requesting the new key', type: String, example: '3' })
  @IsMsaId()
  msaId: string;

  @ApiProperty({ type: 'number', description: 'expiration block number for this payload', example: '1' })
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  expiration: number;

  @ApiProperty({
    type: String,
    description: 'newPublicKey in hex format',
    example: '0x0ed2f8c714efcac51ca2325cfe95637e5e0b898ae397aa365978b7348a717d0b',
  })
  @IsHexValue({ minLength: 64, maxLength: 64 })
  newPublicKey: string;
}

export class KeysRequestDto {
  @ApiProperty({
    description: 'msaOwnerAddress representing the target of this request',
    type: String,
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress()
  msaOwnerAddress: string;

  @ApiProperty({
    description: 'msaOwnerSignature is the signature by msa owner',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsSignature()
  msaOwnerSignature: HexString;

  @ApiProperty({
    description: 'newKeyOwnerSignature is the signature with new key',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsSignature()
  newKeyOwnerSignature: HexString;

  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => KeysRequestPayloadDto)
  payload: KeysRequestPayloadDto;
}

export type AddKeyRequestDto = KeysRequestDto & {
  type: TransactionType.ADD_KEY;
};

export type PublishKeysRequestDto = AddKeyRequestDto;
