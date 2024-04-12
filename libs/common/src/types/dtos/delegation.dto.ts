import { IsNotEmpty } from 'class-validator';
import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';

export class DelegationResponse {
  @IsNotEmpty()
  providerId: number;

  @IsNotEmpty()
  schemaPermissions: CommonPrimitivesMsaDelegation['schemaPermissions'];

  @IsNotEmpty()
  revokedAt: CommonPrimitivesMsaDelegation['revokedAt'];
}
