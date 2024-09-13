/* eslint-disable max-classes-per-file */
import { IsNotEmpty, IsEnum, ValidateNested, IsArray, ArrayNotEmpty } from 'class-validator';
import { ConnectionType } from './connection-type.enum';
import { Direction } from './direction.enum';
import { PrivacyType } from './privacy-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class ConnectionDto {
  @IsMsaId({ each: true, message: 'dsnpId should be a valid positive number' })
  @ApiProperty({ description: 'MSA Id representing the target of this connection', type: String, example: '3' })
  dsnpId: string;

  @IsNotEmpty()
  @IsEnum(PrivacyType)
  @ApiProperty({ description: 'Indicator connection type (public or private)', enum: PrivacyType, example: 'public' })
  privacyType: PrivacyType;

  @IsNotEmpty()
  @IsEnum(Direction)
  @ApiProperty({
    description: 'Indicator of the direction of this connection',
    enum: Direction,
    example: 'connectionTo',
  })
  direction: Direction;

  @IsNotEmpty()
  @IsEnum(ConnectionType)
  @ApiProperty({
    description: 'Indicator of the type of connection (follow or friendship)',
    enum: ConnectionType,
    example: 'follow',
  })
  connectionType: ConnectionType;
}

export class ConnectionDtoWrapper {
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => ConnectionDto)
  @ApiProperty({ description: 'Wrapper object for array of connections', type: [ConnectionDto] })
  data: ConnectionDto[];
}
