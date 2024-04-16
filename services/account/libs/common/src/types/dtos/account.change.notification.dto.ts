/* eslint-disable max-classes-per-file */
export enum AccountChangeType {
  CHANGE_HANDLE = 'CHANGE_HANDLE',
  CREATE_HANDLE = 'CREATE_HANDLE',
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  SIWF_SIGNUP = 'SIWF_SIGNUP',
  SIWF_SIGNIN = 'SIWF_SIGNIN',
}

type Update = {
  type: AccountChangeType;
  providerId: number;
  payload: Uint8Array;
};

export class AccountChangeNotificationDto {
  msaId: string;

  update: Update;
}

export class TransactionJob {
  referenceId: string;

  update: Update;
}
