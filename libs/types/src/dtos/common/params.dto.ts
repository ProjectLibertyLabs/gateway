// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty, IsString, IsUrl, MinLength } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';

export class MsaIdDto {
  /**
   * Msa Id of requested account
   * @example '2'
   */
  @IsMsaId()
  msaId: string;
}

export class ProviderMsaIdDto {
  /**
   * Msa Id of provider
   * @example '1'
   */
  @IsMsaId()
  providerId: string;
}

export class UrlDto {
  /**
   * URL related to the request
   * @example 'http://localhost/webhook'
   */
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  url: string;
}

export class HandleDto {
  /**
   * newHandle in the request
   * @example 'handle'
   */
  @MinLength(3)
  @IsString()
  newHandle: string;
}

export class AccountIdDto {
  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  accountId: string;
}
