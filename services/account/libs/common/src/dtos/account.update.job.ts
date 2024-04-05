export interface CreateHandle {
  type: 'CreateHandle';
  ownerMsaId: string;
  payload: Uint8Array;
}

export type Update = CreateHandle;

export class AccountUpdateJob {
  referenceId: string;
  update: Update;
}
