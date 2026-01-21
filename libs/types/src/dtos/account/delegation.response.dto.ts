/* eslint-disable max-classes-per-file */
import { IDelegationResponse, IDelegation, IIntentDelegation } from '#types/interfaces/account/delegations.interface';

/**
 * NOTE: DTO classes are not technically necessary for response types, as there is no
 *       automatic input validation; however, having a concrete class (rather than simply
 *       a Typescript interface), allows us to use decorators from @nestjs/swagger to generate
 *       the correct endpoint return types in our OpenAPI spec). We could, instead, use the @ApiOkResponse()
 *       decorator on the endpoint to completely specify the return type, but doing it the way we have here
 *       gives us some additional compile-time type-checking to ensure that the documented return type matches
 *       the interface actually being returned.
 */
export class IntentDelegation implements IIntentDelegation {
  intentId: number;

  revokedAtBlock?: number;
}

export class Delegation implements IDelegation {
  providerId: string;

  delegatedIntents: IntentDelegation[];

  revokedAtBlock?: number;
}

export class DelegationResponse implements IDelegationResponse {
  msaId: string;

  delegations: Delegation[];
}
