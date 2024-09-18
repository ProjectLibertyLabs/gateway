import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';
import { AnyNumber } from '@polkadot/types/types';

export interface ISchemaDelegation {
  schemaId: number;

  revokedAtBlock?: number;
}

export interface IDelegation {
  providerId: string;

  schemaDelegations: ISchemaDelegation[];

  revokedAtBlock?: number;
}

export interface IDelegationResponseV2 {
  msaId: string;

  delegations: IDelegation[];
}

export function chainDelegationToNative(
  providerId: AnyNumber,
  chainDelegation: CommonPrimitivesMsaDelegation,
): IDelegation {
  return {
    providerId: providerId.toString(),
    revokedAtBlock: chainDelegation.revokedAt.toNumber(),
    schemaDelegations: Array.from(chainDelegation.schemaPermissions.entries()).map(([schemaId, revokedAt]) => ({
      schemaId: schemaId.toNumber(),
      revokedAtBlock: revokedAt.toNumber(),
    })),
  };
}
