import { IsNotEmpty } from 'class-validator';
import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeDelegationRequest {
  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  schemaPermissions: CommonPrimitivesMsaDelegation['schemaPermissions'];

  @ApiProperty()
  @IsNotEmpty()
  revokedAt: CommonPrimitivesMsaDelegation['revokedAt'];
}
