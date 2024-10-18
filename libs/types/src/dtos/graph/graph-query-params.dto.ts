import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { PrivacyType } from './privacy-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { ConnectionType } from '#types/dtos/graph/connection-type.enum';

export class GraphsQueryParamsDto {
  /**
   * Array of MSA Ids for which to query graphs
   * @example ['2', '3', '4', '5']
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMsaId({ each: true })
  dsnpIds: string[];

  @ApiProperty({
    description: 'Graph type to query (public or private)',
    enum: PrivacyType,
    enumName: 'PrivacyType',
    example: 'public',
  })
  @IsEnum(PrivacyType)
  privacyType: PrivacyType;

  @ApiProperty({
    description: 'Graph connection type to query (follow or friendship)',
    enum: ConnectionType,
    enumName: 'ConnectionType',
    example: 'follow',
  })
  @IsEnum(ConnectionType)
  connectionType: ConnectionType;

  /**
   * Graph encryption keypairs for the users requested in `dsnpIds`. (Only for `privacyType` === "private"
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphKeyPairDto)
  graphKeyPairs?: GraphKeyPairDto[];
}
