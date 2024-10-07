/* eslint-disable max-classes-per-file */
import { IsNotEmpty, IsEnum, ValidateNested, IsArray, ArrayNotEmpty } from 'class-validator';
import { ConnectionType } from './connection-type.enum';
import { Direction } from './direction.enum';
import { PrivacyType } from './privacy-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ConnectionDto {
  /**
   * MSA Id representing the target of this connection
   * @example '3'
   */
  @IsMsaId()
  dsnpId: string;

  @ApiProperty({
    description: 'Indicator connection type (public or private)',
    enum: PrivacyType,
    enumName: 'PrivacyType',
    example: 'public',
  })
  @IsNotEmpty()
  @IsEnum(PrivacyType)
  privacyType: PrivacyType;

  @ApiProperty({
    description: 'Indicator of the direction of this connection',
    enum: Direction,
    enumName: 'Direction',
    example: 'connectionTo',
  })
  @IsNotEmpty()
  @IsEnum(Direction)
  direction: Direction;

  @ApiProperty({
    description: 'Indicator of the type of connection (follow or friendship)',
    enum: ConnectionType,
    enumName: 'ConnectionType',
    example: 'follow',
  })
  @IsNotEmpty()
  @IsEnum(ConnectionType)
  connectionType: ConnectionType;
}

export class ConnectionDtoWrapper {
  /**
   * Wrapper object for array of connections
   */
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => ConnectionDto)
  data: ConnectionDto[];
}
