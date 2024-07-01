import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { ConnectionDto, ConnectionDtoWrapper } from './connection.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ConnectionsDtoWrapper = {
  data: ConnectionDto[];
};

export class ProviderGraphDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'MSA ID that owns the connections represented in this object', example: '2', type: String })
  dsnpId: string;

  @IsNotEmpty()
  @Type(() => ConnectionDto)
  @ApiProperty({ description: 'Array of connections known to the Provider for ths MSA referenced in this object', type: ConnectionDtoWrapper })
  connections: { data: ConnectionDto[] };

  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Optional array of graph encryption keypairs decrypting/encrypting the above-referenced users private graph', type: [GraphKeyPairDto] })
  graphKeyPairs?: GraphKeyPairDto[];
}
