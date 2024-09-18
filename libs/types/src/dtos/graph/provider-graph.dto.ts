import { IsArray, IsNotEmpty, IsOptional, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { ConnectionDto, ConnectionDtoWrapper } from './connection.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export type ConnectionsDtoWrapper = {
  data: ConnectionDto[];
};

export class ProviderGraphDto {
  @IsMsaId({ message: 'dsnpId should be a valid positive number' })
  @ApiProperty({
    description: 'MSA Id that owns the connections represented in this object',
    example: '2',
    type: String,
  })
  dsnpId: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ConnectionDtoWrapper)
  @ApiProperty({
    description: 'Array of connections known to the Provider for ths MSA referenced in this object',
    type: ConnectionDtoWrapper,
  })
  connections: ConnectionDtoWrapper;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphKeyPairDto)
  @ApiPropertyOptional({
    description:
      'Optional array of graph encryption keypairs decrypting/encrypting the above-referenced users private graph',
    type: [GraphKeyPairDto],
  })
  graphKeyPairs?: GraphKeyPairDto[];

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  @ApiPropertyOptional({
    description: 'Optional URL of a webhook to invoke when the request is complete',
    type: String,
    example: 'http://localhost/webhook',
  })
  webhookUrl?: string;
}
