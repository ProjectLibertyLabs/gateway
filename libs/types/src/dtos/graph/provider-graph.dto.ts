import { IsArray, IsNotEmpty, IsOptional, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { ConnectionDtoWrapper } from './connection.dto';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ProviderGraphDto {
  /**
   * MSA Id that owns the connections represented in this object
   * @example '2'
   */
  @IsMsaId()
  dsnpId: string;

  /**
   * Array of connections known to the Provider for ths MSA referenced in this object
   */
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ConnectionDtoWrapper)
  connections: ConnectionDtoWrapper;

  /**
   * Optional array of graph encryption keypairs decrypting/encrypting the above-referenced users private graph
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphKeyPairDto)
  graphKeyPairs?: GraphKeyPairDto[];

  /**
   * Optional URL of a webhook to invoke when the request is complete
   * @example 'http://localhost/webhook'
   */
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  webhookUrl?: string;
}
