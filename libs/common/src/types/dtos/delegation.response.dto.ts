import { IsNotEmpty } from 'class-validator';
import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';
import { ApiProperty } from '@nestjs/swagger';

export class DelegationResponse {
  @ApiProperty()
  @IsNotEmpty()
  providerId: number;

  @ApiProperty()
  @IsNotEmpty()
  schemaPermissions: CommonPrimitivesMsaDelegation['schemaPermissions'];

  @ApiProperty()
  @IsNotEmpty()
  revokedAt: CommonPrimitivesMsaDelegation['revokedAt'];
}
