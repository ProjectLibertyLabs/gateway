import { CommonPrimitivesMsaDelegationResponse } from '@polkadot/types/lookup';

export interface IIntentDelegation {
  /// The IntentID that is granted in this delegation
  intentId: number;

  /// The effective block at which permission for this Intent was revoked (0 = currently in force).
  /// This is adjusted in consideration of the enclosing delegations overall revocation block.
  revokedAtBlock?: number;

  /// The explicit block at which permission for this Intent was revoked, irrespective of the enclosing delegation.
  explicitRevokedAtBlock?: number;
}

export interface IDelegation {
  providerId: string;

  delegatedIntents: IIntentDelegation[];

  revokedAtBlock?: number;
}

export interface IDelegationResponse {
  msaId: string;

  delegations: IDelegation[];
}

export function chainDelegationToNative(chainDelegation: CommonPrimitivesMsaDelegationResponse): IDelegation {
  return {
    providerId: chainDelegation.providerId.toString(),
    revokedAtBlock: chainDelegation.revokedAt.toNumber(),
    delegatedIntents: Array.from(chainDelegation.permissions).map(({ grantedId, revokedAt, explicitRevokedAt }) => ({
      intentId: grantedId.toNumber(),
      revokedAtBlock: revokedAt.toNumber(),
      explicitRevokedAtBlock: explicitRevokedAt.toNumber(),
    })),
  };
}
