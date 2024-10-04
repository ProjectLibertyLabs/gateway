/* eslint-disable max-classes-per-file */
import { IsNotEmpty } from 'class-validator';
import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';
import { IDelegation, IDelegationResponseV2, ISchemaDelegation } from '#types/interfaces/account/delegations.interface';

// V1 to be deprecated
export class DelegationResponse {
  @IsNotEmpty()
  providerId: string;

  @IsNotEmpty()
  schemaPermissions: CommonPrimitivesMsaDelegation['schemaPermissions'];

  @IsNotEmpty()
  revokedAt: CommonPrimitivesMsaDelegation['revokedAt'];
}

/**
 * NOTE: DTO classes are not technically necessary for response types, as there is no
 *       automatic input validation; however, having a concrete class (rather than simply
 *       a Typescript interface), allows us to use decorators from @nestjs/swagger to generate
 *       the correct endpoint return types in our OpenAPI spec). We could, instead, use the @ApiOkResponse()
 *       decorator on the endpoint to completely specify the return type, but doing it the way we have here
 *       gives us some additional compile-time type-checking to ensure that the documented return type matches
 *       the interface actually being returned.
 */
export class SchemaDelegation implements ISchemaDelegation {
  schemaId: number;

  revokedAtBlock?: number;
}

export class Delegation implements IDelegation {
  providerId: string;

  schemaDelegations: SchemaDelegation[];

  revokedAtBlock?: number;
}

export class DelegationResponseV2 implements IDelegationResponseV2 {
  msaId: string;

  delegations: Delegation[];
}
