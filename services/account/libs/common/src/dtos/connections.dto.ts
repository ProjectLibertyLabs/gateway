import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ConnectionType } from './connection.type.dto';
import { Direction } from './direction.dto';
import { PrivacyType } from './privacy.type.dto';

export class ConnectionDto {
  @IsNotEmpty()
  @IsString()
  dsnpId: string;

  @IsNotEmpty()
  @IsEnum(PrivacyType)
  privacyType: PrivacyType;

  @IsNotEmpty()
  @IsEnum(Direction)
  direction: Direction;

  @IsNotEmpty()
  @IsEnum(ConnectionType)
  connectionType: ConnectionType;
}
