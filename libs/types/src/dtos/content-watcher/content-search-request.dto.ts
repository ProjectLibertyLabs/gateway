import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';
import { ChainWatchOptionsDto } from './chain.watch.dto';
import { Type } from 'class-transformer';

export class ContentSearchRequestDto {
  /**
   * An optional client-supplied reference ID by which it can identify the result of this search
   */
  @IsOptional()
  @IsString()
  clientReferenceId?: string;

  /**
   * The highest block number to start the backward search from
   * @example 100
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  upperBoundBlock?: number;

  /**
   * The number of blocks to scan (backwards)
   * @example 101
   */
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  blockCount: number;

  /**
   * The schemaIds/dsnpIds to filter by
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ChainWatchOptionsDto)
  filters?: ChainWatchOptionsDto;

  /**
   * A webhook URL to be notified of the results of this search
   * @example 'https://example.com'
   */
  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  webhookUrl: string;
}
