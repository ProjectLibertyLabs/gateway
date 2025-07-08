// eslint-disable-next-line max-classes-per-file
import { HexString } from '@polkadot/util/types';
import { RetireMsaPayloadResponseDto } from './accounts.response.dto';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { TransactionType } from '#types/account-webhook';

export class RetireMsaRequestDto extends RetireMsaPayloadResponseDto {
  /**
   * signature of the owner
   * @example '0x01065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature({ requiresSignatureType: true })
  signature: HexString;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
