import { IsOptional, ValidateNested } from 'class-validator';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class GraphsQueryAllParamsDto {
  /**
   * MSA Id for which to query all graph types
   * @example '123'
   */
  @IsMsaId()
  dsnpId: string;

  /**
   * Graph encryption keypairs for private graph access
   * Required only if querying private graphs
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => GraphKeyPairDto)
  graphKeyPair?: GraphKeyPairDto; // Now a single object (not array)

  /**
   * Whether to include public follow graph in results
   * @default true
   */
  @ApiProperty({ default: true })
  @IsOptional()
  includePublicFollow?: boolean = true;

  /**
   * Whether to include private follow graph in results
   * @default true
   */
  @ApiProperty({ default: true })
  @IsOptional()
  includePrivateFollow?: boolean = true;

  /**
   * Whether to include private friendship graph in results
   * @default true
   */
  @ApiProperty({ default: true })
  @IsOptional()
  includePrivateFriendship?: boolean = true;
}
